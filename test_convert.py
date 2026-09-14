"""
test_convert.py — พิสูจน์ว่า TXT -> JSON -> MySQL ถูกต้องทุกขั้น

รัน:   python test_convert.py
       (ขั้น MySQL ต้องมี Docker Desktop เปิดอยู่ ถ้าไม่มีจะข้ามให้อัตโนมัติ)

ระดับการทดสอบ:
  Stage1  TXT -> JSON        : ไฟล์ JSON valid, key ครบเท่าต้นฉบับ, ค่าที่ซ่อมถูกต้อง
  Stage2  JSON -> normalized : ไม่เหลือ $oid/$date/$numberLong, วันที่ถูกต้อง
  Stage3  JSON -> SQL text   : จำนวน INSERT ตรงกับจำนวน array ใน JSON, ไม่มี SQL injection จาก quote
  Stage4  SQL -> MySQL จริง  : โหลดเข้า MySQL 8 ใน Docker แล้ว SELECT กลับมาเทียบกับ JSON (round-trip)
"""

import json
import re
import shutil
import subprocess
import time
import unittest
from pathlib import Path

import convert

BASE = Path(__file__).parent
INPUT = BASE / "input"
JSON_DIR = BASE / "json"
MYSQL_DIR = BASE / "mysql"

# สร้างผลลัพธ์ใหม่ทุกครั้งก่อนทดสอบ เพื่อให้แน่ใจว่า test ตรวจของที่ convert.py สร้างจริง
convert.main()

NAMES = {"dataset_test_1": "dataset_test_1.txt", "datasets_test_2": "datasets_test_2.txt"}


def count_leaf_lines(text: str) -> int:
    """นับบรรทัดที่เป็น 'ค่า' ในไฟล์ txt (ไม่ใช่ { } [ ]) — ใช้เทียบว่าซ่อมแล้วไม่มีข้อมูลหาย"""
    return sum(1 for ln in text.splitlines()
               if ln.strip() and ln.strip().rstrip(",") not in ("{", "}", "[", "]")
               and not ln.strip().endswith(("{", "[")))


def count_leaves(obj) -> int:
    """นับจำนวนค่าปลายทาง (scalar) ใน JSON"""
    if isinstance(obj, dict):
        return sum(count_leaves(v) for v in obj.values())
    if isinstance(obj, list):
        return sum(count_leaves(v) for v in obj)
    return 1


def find_keys(obj, prefix="$"):
    """คืน key ทั้งหมดที่ขึ้นต้นด้วย prefix (ใช้หา $oid/$date ที่หลงเหลือ)"""
    found = []
    if isinstance(obj, dict):
        for k, v in obj.items():
            if k.startswith(prefix):
                found.append(k)
            found += find_keys(v, prefix)
    elif isinstance(obj, list):
        for v in obj:
            found += find_keys(v, prefix)
    return found


# ===========================================================================
class Stage1_TxtToJson(unittest.TestCase):

    def test_json_files_are_valid(self):
        """ไฟล์ .json ทุกไฟล์ต้อง parse ได้ (ถ้าซ่อมผิด json.loads จะ error)"""
        for name in NAMES:
            with self.subTest(name=name):
                json.loads((JSON_DIR / (name + ".json")).read_text(encoding="utf-8"))

    def test_no_data_lost_in_repair(self):
        """จำนวนค่าใน JSON ที่ซ่อมแล้ว = จำนวนบรรทัดค่าในไฟล์ txt ต้นฉบับ"""
        txt = (INPUT / "dataset_test_1.txt").read_text(encoding="utf-8")
        repaired = json.loads((JSON_DIR / "dataset_test_1.json").read_text(encoding="utf-8"))
        self.assertEqual(count_leaves(repaired), count_leaf_lines(txt))

    def test_repaired_has_same_structure_as_valid_file(self):
        """test_1 ที่ซ่อมแล้วต้องมี key ระดับบนเหมือน test_2 (ที่ถูกต้องอยู่แล้ว) ยกเว้น field ที่มีเฉพาะบางเรื่อง"""
        t1 = json.loads((JSON_DIR / "dataset_test_1.json").read_text(encoding="utf-8"))
        t2 = json.loads((JSON_DIR / "datasets_test_2.json").read_text(encoding="utf-8"))
        common = set(t1) & set(t2)
        self.assertGreaterEqual(len(common), 18)
        self.assertEqual(set(t1) - set(t2), {"poster"})           # test_1 มี poster เพิ่ม
        self.assertEqual(set(t1["imdb"]), set(t2["imdb"]))
        self.assertEqual(set(t1["awards"]), set(t2["awards"]))

    def test_types_are_restored(self):
        """ตัวเลขต้องเป็น number ไม่ใช่ string, array ต้องเป็น list"""
        t1 = json.loads((JSON_DIR / "dataset_test_1.json").read_text(encoding="utf-8"))
        self.assertIsInstance(t1["runtime"], int)
        self.assertIsInstance(t1["year"], int)
        self.assertIsInstance(t1["imdb"]["rating"], float)
        self.assertIsInstance(t1["genres"], list)
        self.assertEqual(t1["genres"], ["Short", "Western"])
        self.assertEqual(len(t1["cast"]), 4)
        self.assertIsInstance(t1["_id"]["$oid"], str)
        self.assertIsInstance(t1["released"]["$date"]["$numberLong"], str)   # Mongo spec: string

    def test_manual_fixes_applied(self):
        """ค่าที่ซ่อมด้วยมือต้องถูกใช้จริง"""
        t1 = json.loads((JSON_DIR / "dataset_test_1.json").read_text(encoding="utf-8"))
        self.assertTrue(t1["poster"].startswith("https://m.media-amazon.com/images/M/"))
        self.assertRegex(t1["lastupdated"], r"^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d+$")
        self.assertRegex(t1["tomatoes"]["lastUpdated"]["$date"], r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$")

    def test_valid_input_passes_through_unchanged(self):
        """test_2 เป็น JSON อยู่แล้ว ผลลัพธ์ต้องเท่าต้นฉบับทุกประการ"""
        src = json.loads((INPUT / "datasets_test_2.txt").read_text(encoding="utf-8"))
        out = json.loads((JSON_DIR / "datasets_test_2.json").read_text(encoding="utf-8"))
        self.assertEqual(src, out)


# ===========================================================================
class Stage2_Normalize(unittest.TestCase):

    def test_no_mongo_special_keys_remain(self):
        for name in NAMES:
            with self.subTest(name=name):
                doc = json.loads((JSON_DIR / (name + ".normalized.json")).read_text(encoding="utf-8"))
                self.assertEqual(find_keys(doc, "$"), [])

    def test_dates_converted_correctly(self):
        """เทียบกับค่าที่คำนวณด้วยมือ: -2085523200000 ms = 1903-12-01, -1895097600000 ms = 1909-12-13"""
        t1 = json.loads((JSON_DIR / "dataset_test_1.normalized.json").read_text(encoding="utf-8"))
        t2 = json.loads((JSON_DIR / "datasets_test_2.normalized.json").read_text(encoding="utf-8"))
        self.assertEqual(t1["released"], "1903-12-01 00:00:00")
        self.assertEqual(t2["released"], "1909-12-13 00:00:00")
        self.assertEqual(t1["tomatoes"]["lastUpdated"], "2015-08-08 19:16:10")
        self.assertEqual(t2["tomatoes"]["lastUpdated"], "2015-05-11 18:36:53")
        self.assertEqual(t1["_id"], "573a1390f29313caabcd42e8")

    def test_other_values_untouched(self):
        raw = json.loads((JSON_DIR / "dataset_test_1.json").read_text(encoding="utf-8"))
        doc = json.loads((JSON_DIR / "dataset_test_1.normalized.json").read_text(encoding="utf-8"))
        for k in ("title", "plot", "genres", "cast", "runtime", "year", "imdb", "awards"):
            self.assertEqual(raw[k], doc[k], k)


# ===========================================================================
class Stage3_SqlText(unittest.TestCase):

    def setUp(self):
        self.data_sql = (MYSQL_DIR / "data.sql").read_text(encoding="utf-8")
        self.docs = {n: json.loads((JSON_DIR / (n + ".normalized.json")).read_text(encoding="utf-8")) for n in NAMES}

    def test_one_movie_insert_per_document(self):
        self.assertEqual(self.data_sql.count("INSERT INTO movies "), len(NAMES))

    def test_child_row_counts_match_arrays(self):
        """จำนวนแถวลูกใน SQL = ความยาว array ใน JSON"""
        expect = {"movie_genres": 0, "movie_cast": 0, "movie_directors": 0, "movie_languages": 0, "movie_countries": 0}
        for d in self.docs.values():
            expect["movie_genres"] += len(d["genres"])
            expect["movie_cast"] += len(d["cast"])
            expect["movie_directors"] += len(d["directors"])
            expect["movie_languages"] += len(d["languages"])
            expect["movie_countries"] += len(d["countries"])
        for table, n in expect.items():
            with self.subTest(table=table):
                block = re.findall(r"INSERT INTO %s .*?;" % table, self.data_sql, re.S)
                rows = sum(len(re.findall(r"\('573a", b)) for b in block)
                self.assertEqual(rows, n)

    def test_quotes_are_escaped(self):
        """ชื่อ 'Broncho Billy' มี single quote ต้องถูก escape ไม่งั้น SQL พัง"""
        self.assertIn("Gilbert M. \\'Broncho Billy\\' Anderson", self.data_sql)

    def test_schema_creates_all_tables(self):
        schema = (MYSQL_DIR / "schema.sql").read_text(encoding="utf-8")
        for t in ("movies", "movie_genres", "movie_cast", "movie_directors", "movie_languages", "movie_countries"):
            self.assertIn("CREATE TABLE %s (" % t, schema)


# ===========================================================================
CONTAINER = "mysql-convert-test"


def docker_available() -> bool:
    if not shutil.which("docker"):
        return False
    return subprocess.run(["docker", "info"], capture_output=True).returncode == 0


def mysql(sql: str, db: str = "mflix") -> list:
    """รัน SQL ใน container แล้วคืนผลเป็น list ของ list (tab-separated, ไม่มี header)"""
    r = subprocess.run(
        ["docker", "exec", "-i", CONTAINER, "mysql", "-uroot", "-ptest", "-N", "--batch", db],
        input=sql.encode("utf-8"), capture_output=True)
    if r.returncode != 0:
        raise RuntimeError(r.stderr.decode("utf-8", "replace"))
    return [line.split("\t") for line in r.stdout.decode("utf-8").splitlines()]


@unittest.skipUnless(docker_available(), "ต้องมี Docker เพื่อทดสอบกับ MySQL จริง")
class Stage4_MySqlRoundTrip(unittest.TestCase):
    """โหลด schema+data เข้า MySQL 8 จริง แล้วอ่านกลับมาเทียบกับ JSON"""

    @classmethod
    def setUpClass(cls):
        subprocess.run(["docker", "rm", "-f", CONTAINER], capture_output=True)
        subprocess.run(["docker", "run", "-d", "--name", CONTAINER,
                        "-e", "MYSQL_ROOT_PASSWORD=test", "mysql:8.0"], check=True, capture_output=True)
        for _ in range(40):                                     # รอ MySQL พร้อม (สูงสุด ~2 นาที)
            ok = subprocess.run(["docker", "exec", CONTAINER, "mysqladmin", "ping", "-uroot", "-ptest", "--silent"],
                                capture_output=True).returncode == 0
            if ok:
                break
            time.sleep(3)
        else:
            raise RuntimeError("MySQL ไม่พร้อมภายในเวลาที่กำหนด")
        for f in ("schema.sql", "data.sql"):
            r = subprocess.run(["docker", "exec", "-i", CONTAINER, "mysql", "-uroot", "-ptest"],
                               input=(MYSQL_DIR / f).read_bytes(), capture_output=True)
            if r.returncode != 0:
                raise RuntimeError("%s failed: %s" % (f, r.stderr.decode("utf-8", "replace")))
        cls.docs = {n: json.loads((JSON_DIR / (n + ".normalized.json")).read_text(encoding="utf-8")) for n in NAMES}

    @classmethod
    def tearDownClass(cls):
        subprocess.run(["docker", "rm", "-f", CONTAINER], capture_output=True)

    def test_row_counts(self):
        self.assertEqual(mysql("SELECT COUNT(*) FROM movies")[0][0], str(len(self.docs)))

    def test_scalar_fields_round_trip(self):
        """ทุก field หลักใน MySQL ต้องเท่ากับ JSON"""
        for doc in self.docs.values():
            with self.subTest(title=doc["title"]):
                row = mysql("SELECT title, year, rated, runtime, released, imdb_id, imdb_rating, imdb_votes, "
                            "awards_wins, tomatoes_viewer_meter, num_mflix_comments, plot "
                            "FROM movies WHERE id = '%s'" % doc["_id"])[0]
                self.assertEqual(row[0], doc["title"])
                self.assertEqual(int(row[1]), doc["year"])
                self.assertEqual(row[2], doc["rated"])
                self.assertEqual(int(row[3]), doc["runtime"])
                self.assertEqual(row[4], doc["released"][:10])
                self.assertEqual(int(row[5]), doc["imdb"]["id"])
                self.assertEqual(float(row[6]), doc["imdb"]["rating"])
                self.assertEqual(int(row[7]), doc["imdb"]["votes"])
                self.assertEqual(int(row[8]), doc["awards"]["wins"])
                self.assertEqual(int(row[9]), doc["tomatoes"]["viewer"]["meter"])
                self.assertEqual(int(row[10]), doc["num_mflix_comments"])
                self.assertEqual(row[11], doc["plot"])

    def test_array_fields_round_trip(self):
        """array ที่แตกเป็นตารางลูก อ่านกลับมาต้องได้ list เดิม (cast ต้องเรียงลำดับเดิมด้วย)"""
        for doc in self.docs.values():
            with self.subTest(title=doc["title"]):
                mid = doc["_id"]
                genres = {r[0] for r in mysql("SELECT genre FROM movie_genres WHERE movie_id='%s'" % mid)}
                self.assertEqual(genres, set(doc["genres"]))
                cast = [r[0] for r in mysql("SELECT actor_name FROM movie_cast WHERE movie_id='%s' ORDER BY position" % mid)]
                self.assertEqual(cast, doc["cast"])
                directors = {r[0] for r in mysql("SELECT director_name FROM movie_directors WHERE movie_id='%s'" % mid)}
                self.assertEqual(directors, set(doc["directors"]))
                langs = {r[0] for r in mysql("SELECT language FROM movie_languages WHERE movie_id='%s'" % mid)}
                self.assertEqual(langs, set(doc["languages"]))
                countries = {r[0] for r in mysql("SELECT country FROM movie_countries WHERE movie_id='%s'" % mid)}
                self.assertEqual(countries, set(doc["countries"]))

    def test_optional_fields_null_when_absent(self):
        """test_2 ไม่มี poster และ tomatoes.critic -> ต้องเป็น NULL ไม่ใช่ค่าเพี้ยน"""
        row = mysql("SELECT poster, tomatoes_critic_rating FROM movies WHERE id='573a1390f29313caabcd446f'")[0]
        self.assertEqual(row, ["NULL", "NULL"])
        row = mysql("SELECT tomatoes_critic_meter FROM movies WHERE id='573a1390f29313caabcd42e8'")[0]
        self.assertEqual(row, ["100"])

    def test_raw_json_column_matches_original(self):
        """คอลัมน์ raw_json ต้อง query กลับได้ค่าเดียวกับ JSON ต้นฉบับ"""
        for name, doc in self.docs.items():
            with self.subTest(name=name):
                r = mysql("SELECT JSON_UNQUOTE(JSON_EXTRACT(raw_json, '$.title')), "
                          "JSON_LENGTH(raw_json, '$.cast') FROM movies WHERE id='%s'" % doc["_id"])[0]
                self.assertEqual(r[0], doc["title"])
                self.assertEqual(int(r[1]), len(doc["cast"]))

    def test_foreign_key_cascade(self):
        """ลบหนัง -> แถวลูกต้องหายตาม (พิสูจน์ว่า FK ON DELETE CASCADE ทำงาน)
        ทำใน transaction แล้ว ROLLBACK เพื่อไม่แตะข้อมูลจริง"""
        mid = "573a1390f29313caabcd42e8"
        rows = mysql(
            "START TRANSACTION;"
            "DELETE FROM movies WHERE id='%s';"
            "SELECT COUNT(*) FROM movie_cast WHERE movie_id='%s';"
            "ROLLBACK;"
            "SELECT COUNT(*) FROM movie_cast WHERE movie_id='%s';" % (mid, mid, mid))
        self.assertEqual(rows[0][0], "0", "หลัง DELETE แถวลูกต้องหาย")
        self.assertEqual(rows[1][0], "4", "หลัง ROLLBACK ข้อมูลต้องกลับมาครบ")


if __name__ == "__main__":
    unittest.main(verbosity=2)
