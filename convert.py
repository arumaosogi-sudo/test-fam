"""
convert.py — แปลงโจทย์ test (MongoDB Extended JSON) -> JSON -> MySQL

ขั้นตอน:
  1. repair    : ซ่อม dataset_test_1.txt ที่ถูกถอด "  :  /  ออก ให้กลับเป็น JSON ที่ถูกต้อง
  2. parse     : อ่านทั้ง 2 ไฟล์เป็น Python dict
  3. normalize : แปลงชนิดพิเศษของ Mongo ($oid / $date / $numberLong) เป็นค่าปกติ
  4. to_mysql  : สร้าง schema.sql (โครงสร้างตาราง) + data.sql (INSERT) แบบ relational

วิธีรัน:   python convert.py
ผลลัพธ์:   json/*.json , mysql/schema.sql , mysql/data.sql
"""

import json
import re
from datetime import datetime, timedelta, timezone
from pathlib import Path

BASE = Path(__file__).parent
INPUT = BASE / "input"
JSON_DIR = BASE / "json"
MYSQL_DIR = BASE / "mysql"

EPOCH = datetime(1970, 1, 1, tzinfo=timezone.utc)


# ===========================================================================
# 1. REPAIR — ซ่อมไฟล์ที่ถูกถอดเครื่องหมายออก (dataset_test_1.txt)
# ===========================================================================
# ไฟล์ต้นฉบับหาย 3 อักขระ: "  :  /   → บรรทัดจึงเหลือรูป   key value,
# วิธีซ่อม: อ่านทีละบรรทัด แยก key (คำแรก) กับ value (ที่เหลือ) แล้วเดาชนิดข้อมูล
# ข้อมูลบางค่าซ่อมอัตโนมัติไม่ได้ (URL, เวลา) เพราะไม่รู้ว่า / กับ : เคยอยู่ตรงไหน
# จึงมีตาราง MANUAL_FIXES ระบุค่าที่ถูกต้องไว้ชัดเจน (ตรวจสอบได้)

MANUAL_FIXES = {
    # key : (ค่าที่อ่านได้จากไฟล์เสีย, ค่าที่ถูกต้อง)
    "poster": (
        "httpsm.media-amazon.comimagesMMV5BMTU3NjE5NzYtYTYyNS00MDVmLWIwYjgtMmYwYWIxZDYyNzU2XkEyXkFqcGdeQXVyNzQzNzQxNzI@._V1_SY1000_SX677_AL_.jpg",
        "https://m.media-amazon.com/images/M/MV5BMTU3NjE5NzYtYTYyNS00MDVmLWIwYjgtMmYwYWIxZDYyNzU2XkEyXkFqcGdeQXVyNzQzNzQxNzI@._V1_SY1000_SX677_AL_.jpg",
    ),
    "lastupdated": ("2015-08-13 002759.177000000", "2015-08-13 00:27:59.177000000"),
    "$date": ("2015-08-08T191610.000Z", "2015-08-08T19:16:10.000Z"),
}

NUMBER_RE = re.compile(r"^-?\d+(\.\d+)?$")


def _scalar(raw: str, key):
    """แปลง value ที่เป็นข้อความดิบ -> ชนิดที่เหมาะสม"""
    raw = raw.strip().rstrip(",").strip()
    if key in MANUAL_FIXES and raw == MANUAL_FIXES[key][0]:
        raw = MANUAL_FIXES[key][1]
    if key == "$numberLong":            # Mongo เก็บเป็น string เสมอ
        return raw
    if NUMBER_RE.match(raw):
        return float(raw) if "." in raw else int(raw)
    return raw


def repair_stripped(text: str) -> dict:
    """parser เล็กๆ สำหรับรูปแบบ  key value  ที่ไม่มี quote/colon"""
    lines = [ln for ln in text.splitlines() if ln.strip()]
    pos = 0

    def parse_container(opener: str):
        nonlocal pos
        result = {} if opener == "{" else []
        closer = "}" if opener == "{" else "]"
        while pos < len(lines):
            line = lines[pos].strip()
            pos += 1
            if line.rstrip(",") == closer:
                return result
            if isinstance(result, dict):
                key, _, rest = line.partition(" ")
                if rest.strip() in ("{", "["):
                    result[key] = parse_container(rest.strip())
                else:
                    result[key] = _scalar(rest, key)
            else:                                        # array item
                result.append(_scalar(line, None))
        raise ValueError("unterminated container")

    first = lines[pos].strip()
    pos += 1
    return parse_container(first)


# ===========================================================================
# 3. NORMALIZE — Mongo Extended JSON -> plain JSON
# ===========================================================================
def normalize(value):
    """{"$oid": x} -> x ,  {"$date": ...} -> 'YYYY-MM-DD HH:MM:SS' , {"$numberLong": "n"} -> int"""
    if isinstance(value, dict):
        if set(value) == {"$oid"}:
            return value["$oid"]
        if set(value) == {"$numberLong"}:
            return int(value["$numberLong"])
        if set(value) == {"$date"}:
            d = value["$date"]
            if isinstance(d, dict) and "$numberLong" in d:      # epoch ms (รองรับค่าติดลบ = ก่อน 1970)
                dt = EPOCH + timedelta(milliseconds=int(d["$numberLong"]))
            else:                                               # ISO string
                dt = datetime.fromisoformat(d.replace("Z", "+00:00"))
            return dt.strftime("%Y-%m-%d %H:%M:%S")
        return {k: normalize(v) for k, v in value.items()}
    if isinstance(value, list):
        return [normalize(v) for v in value]
    return value


# ===========================================================================
# 4. TO MYSQL — ออกแบบ relational schema
# ===========================================================================
# movies (1)  ──<  movie_genres / movie_cast / movie_directors / movie_languages / movie_countries (N)
# object ซ้อน (awards, imdb, tomatoes) -> flatten เป็นคอลัมน์ในตาราง movies
# เก็บเอกสารเต็มไว้ในคอลัมน์ raw_json (ชนิด JSON ของ MySQL) เผื่อ query field ที่ไม่ได้ flatten

SCHEMA_SQL = """\
-- schema.sql — โครงสร้างตารางสำหรับ MySQL 8
-- สร้างโดย convert.py จากเอกสาร MongoDB (sample_mflix.movies)
-- โหลดด้วย load_mysql.ps1 หรือ docker compose up (ดู README)

SET NAMES utf8mb4;   -- ให้ MySQL อ่านไฟล์นี้เป็น UTF-8 (มี comment ภาษาไทย)

CREATE DATABASE IF NOT EXISTS mflix CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE mflix;

DROP TABLE IF EXISTS movie_countries, movie_languages, movie_directors, movie_cast, movie_genres, movies;

-- ตารางหลัก: 1 แถว = 1 เอกสาร (nested object ถูก flatten เป็นคอลัมน์)
CREATE TABLE movies (
    id                     CHAR(24)      NOT NULL COMMENT 'Mongo _id ($oid)',
    title                  VARCHAR(255)  NOT NULL,
    type                   VARCHAR(20),
    year                   SMALLINT,
    rated                  VARCHAR(10),
    runtime                SMALLINT      COMMENT 'นาที',
    released               DATE,
    plot                   TEXT,
    fullplot               TEXT,
    poster                 VARCHAR(500),
    num_mflix_comments     INT           DEFAULT 0,
    lastupdated            DATETIME(6),
    -- awards {}
    awards_wins            INT,
    awards_nominations     INT,
    awards_text            VARCHAR(255),
    -- imdb {}
    imdb_id                INT,
    imdb_rating            DECIMAL(3,1),
    imdb_votes             INT,
    -- tomatoes {}
    tomatoes_viewer_rating      DECIMAL(3,1),
    tomatoes_viewer_num_reviews INT,
    tomatoes_viewer_meter       SMALLINT,
    tomatoes_critic_rating      DECIMAL(3,1),
    tomatoes_critic_num_reviews INT,
    tomatoes_critic_meter       SMALLINT,
    tomatoes_fresh              INT,
    tomatoes_rotten             INT,
    tomatoes_last_updated       DATETIME,
    -- เอกสารต้นฉบับทั้งก้อน (MySQL JSON type) เผื่อ query ด้วย JSON_EXTRACT
    raw_json               JSON,
    PRIMARY KEY (id),
    UNIQUE KEY uq_imdb_id (imdb_id),
    KEY idx_year (year)
) ENGINE=InnoDB;

-- array fields -> ตารางลูก 1:N (ไม่เก็บ list ในคอลัมน์เดียว = 1NF)
CREATE TABLE movie_genres (
    movie_id CHAR(24)     NOT NULL,
    genre    VARCHAR(50)  NOT NULL,
    PRIMARY KEY (movie_id, genre),
    CONSTRAINT fk_genres_movie FOREIGN KEY (movie_id) REFERENCES movies(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE movie_cast (
    movie_id   CHAR(24)     NOT NULL,
    position   TINYINT      NOT NULL COMMENT 'ลำดับใน array (billing order)',
    actor_name VARCHAR(255) NOT NULL,
    PRIMARY KEY (movie_id, position),
    CONSTRAINT fk_cast_movie FOREIGN KEY (movie_id) REFERENCES movies(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE movie_directors (
    movie_id      CHAR(24)     NOT NULL,
    director_name VARCHAR(255) NOT NULL,
    PRIMARY KEY (movie_id, director_name),
    CONSTRAINT fk_directors_movie FOREIGN KEY (movie_id) REFERENCES movies(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE movie_languages (
    movie_id CHAR(24)    NOT NULL,
    language VARCHAR(50) NOT NULL,
    PRIMARY KEY (movie_id, language),
    CONSTRAINT fk_languages_movie FOREIGN KEY (movie_id) REFERENCES movies(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE movie_countries (
    movie_id CHAR(24)    NOT NULL,
    country  VARCHAR(50) NOT NULL,
    PRIMARY KEY (movie_id, country),
    CONSTRAINT fk_countries_movie FOREIGN KEY (movie_id) REFERENCES movies(id) ON DELETE CASCADE
) ENGINE=InnoDB;
"""


def sql_str(v) -> str:
    """แปลงค่า Python -> literal ของ SQL (escape เครื่องหมาย quote และ backslash)"""
    if v is None:
        return "NULL"
    if isinstance(v, bool):
        return "1" if v else "0"
    if isinstance(v, (int, float)):
        return str(v)
    s = str(v).replace("\\", "\\\\").replace("'", "\\'")
    return "'" + s + "'"


def get(d, *path):
    """ดึงค่าซ้อนแบบปลอดภัย get(doc, 'tomatoes', 'critic', 'rating') -> None ถ้าไม่มี"""
    for p in path:
        if not isinstance(d, dict) or p not in d:
            return None
        d = d[p]
    return d


def movie_inserts(doc: dict, raw: dict) -> list:
    mid = doc["_id"]
    released = doc.get("released")
    row = {
        "id": mid,
        "title": doc.get("title"),
        "type": doc.get("type"),
        "year": doc.get("year"),
        "rated": doc.get("rated"),
        "runtime": doc.get("runtime"),
        "released": released[:10] if released else None,
        "plot": doc.get("plot"),
        "fullplot": doc.get("fullplot"),
        "poster": doc.get("poster"),
        "num_mflix_comments": doc.get("num_mflix_comments", 0),
        "lastupdated": (doc.get("lastupdated") or "")[:26] or None,   # ตัดเป็น microsecond (MySQL รองรับ 6 หลัก)
        "awards_wins": get(doc, "awards", "wins"),
        "awards_nominations": get(doc, "awards", "nominations"),
        "awards_text": get(doc, "awards", "text"),
        "imdb_id": get(doc, "imdb", "id"),
        "imdb_rating": get(doc, "imdb", "rating"),
        "imdb_votes": get(doc, "imdb", "votes"),
        "tomatoes_viewer_rating": get(doc, "tomatoes", "viewer", "rating"),
        "tomatoes_viewer_num_reviews": get(doc, "tomatoes", "viewer", "numReviews"),
        "tomatoes_viewer_meter": get(doc, "tomatoes", "viewer", "meter"),
        "tomatoes_critic_rating": get(doc, "tomatoes", "critic", "rating"),
        "tomatoes_critic_num_reviews": get(doc, "tomatoes", "critic", "numReviews"),
        "tomatoes_critic_meter": get(doc, "tomatoes", "critic", "meter"),
        "tomatoes_fresh": get(doc, "tomatoes", "fresh"),
        "tomatoes_rotten": get(doc, "tomatoes", "rotten"),
        "tomatoes_last_updated": get(doc, "tomatoes", "lastUpdated"),
        "raw_json": json.dumps(raw, ensure_ascii=False),
    }
    cols = ", ".join(row)
    vals = ", ".join(sql_str(v) for v in row.values())
    out = ["INSERT INTO movies (" + cols + ") VALUES\n  (" + vals + ");"]

    def child(table, col, items, with_pos=False):
        if not items:
            return
        if with_pos:
            body = ",\n  ".join("(%s, %d, %s)" % (sql_str(mid), i + 1, sql_str(v)) for i, v in enumerate(items))
            out.append("INSERT INTO %s (movie_id, position, %s) VALUES\n  %s;" % (table, col, body))
        else:
            body = ",\n  ".join("(%s, %s)" % (sql_str(mid), sql_str(v)) for v in items)
            out.append("INSERT INTO %s (movie_id, %s) VALUES\n  %s;" % (table, col, body))

    child("movie_genres", "genre", doc.get("genres"))
    child("movie_cast", "actor_name", doc.get("cast"), with_pos=True)
    child("movie_directors", "director_name", doc.get("directors"))
    child("movie_languages", "language", doc.get("languages"))
    child("movie_countries", "country", doc.get("countries"))
    return out


# ===========================================================================
# MAIN
# ===========================================================================
def main():
    JSON_DIR.mkdir(exist_ok=True)
    MYSQL_DIR.mkdir(exist_ok=True)

    sources = {
        "dataset_test_1": ("dataset_test_1.txt", True),    # True = ต้องซ่อม
        "datasets_test_2": ("datasets_test_2.txt", False),
    }

    data_sql = ["-- data.sql — ข้อมูลจากโจทย์ test ทั้ง 2 ไฟล์ (สร้างโดย convert.py)",
                "-- รันหลัง schema.sql:  mysql -u root -p mflix < data.sql", "",
                "USE mflix;", "SET NAMES utf8mb4;", ""]

    for name, (fname, needs_repair) in sources.items():
        text = (INPUT / fname).read_text(encoding="utf-8")
        raw = repair_stripped(text) if needs_repair else json.loads(text)

        # ขั้น 2: JSON ที่ถูกต้อง (ยังเป็น Mongo Extended JSON)
        (JSON_DIR / (name + ".json")).write_text(
            json.dumps(raw, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

        # ขั้น 3: JSON ธรรมดา (ไม่มี $oid/$date)
        doc = normalize(raw)
        (JSON_DIR / (name + ".normalized.json")).write_text(
            json.dumps(doc, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

        # ขั้น 4: SQL
        data_sql.append("-- ---------- %s: %s (%s) ----------" % (fname, doc["title"], doc["year"]))
        data_sql.extend(movie_inserts(doc, raw))
        data_sql.append("")
        print("[ok] %-22s -> %s.json, %s.normalized.json, SQL (%s)" % (fname, name, name, doc["title"]))

    (MYSQL_DIR / "schema.sql").write_text(SCHEMA_SQL, encoding="utf-8")
    (MYSQL_DIR / "data.sql").write_text("\n".join(data_sql), encoding="utf-8")
    print("[ok] mysql/schema.sql , mysql/data.sql")


if __name__ == "__main__":
    main()
