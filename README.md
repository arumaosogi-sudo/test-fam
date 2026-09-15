# Test: MongoDB document (non-SQL) → JSON → MySQL → phpMyAdmin

โจทย์: ไฟล์ `.txt` 2 ไฟล์ เป็นเอกสารหนังจาก MongoDB (dataset `sample_mflix.movies`)
ในรูป **Mongo Extended JSON** (`$oid`, `$date`, `$numberLong`) → แปลงเป็น JSON ที่ถูกต้อง → ออกแบบและสร้างเป็นตาราง MySQL → ดูผลลัพธ์ใน phpMyAdmin

```
input/*.txt ──(1) repair──▶ json/*.json ──(2) normalize──▶ json/*.normalized.json ──(3)──▶ mysql/schema.sql + data.sql ──(4)──▶ MySQL 8 + phpMyAdmin
 (Mongo doc)                 (Extended JSON)                  (plain JSON)                       (SQL files)                    (localhost:8081)
```

## โครงสร้างโฟลเดอร์

```
.
├── convert.py                         # script แปลงทั้งหมด — รัน  python convert.py  แล้วได้ json/ และ mysql/ ใหม่
├── docker-compose.yaml                # MySQL 8 + phpMyAdmin (localhost:8081) โหลด schema/data อัตโนมัติ
├── load_mysql.ps1                     # (ทางเลือก) PowerShell script เปิด MySQL เดี่ยวๆ + โหลด SQL แสดงผลใน terminal
├── test_convert.py                    # ทดสอบอัตโนมัติ 19 tests (python -X utf8 test_convert.py)
├── input/
│   ├── dataset_test_1.txt             # โจทย์ 1 (ถูกถอด "  :  /  ออก → ต้องซ่อม)
│   └── datasets_test_2.txt            # โจทย์ 2 (JSON ถูกต้องอยู่แล้ว)
├── json/
│   ├── dataset_test_1.json            # ซ่อมแล้ว — Mongo Extended JSON ที่ valid
│   ├── dataset_test_1.normalized.json # แปลง $oid/$date เป็นค่าธรรมดา
│   ├── datasets_test_2.json
│   └── datasets_test_2.normalized.json
└── mysql/
    ├── schema.sql                     # CREATE DATABASE mflix + 6 ตาราง
    └── data.sql                       # INSERT ข้อมูลหนัง 2 เรื่อง
```

## วิธีใช้ (PowerShell บน Windows — ต้องเปิด Docker Desktop ไว้)

### ขั้นที่ 1 — แปลง TXT → JSON → SQL

```powershell
python convert.py
```

ได้ไฟล์ `json/*.json` และ `mysql/schema.sql`, `mysql/data.sql`

### ขั้นที่ 2 — เปิด MySQL + phpMyAdmin

```powershell
docker compose up -d
```

รอประมาณ 30 วินาที (ครั้งแรกจะดาวน์โหลด image `mysql:8.0` และ `phpmyadmin:5`) แล้วเปิด

**http://localhost:8081**

phpMyAdmin จะ login ให้อัตโนมัติ → เมนูซ้ายคลิก database **`mflix`** → เห็น 6 ตาราง → คลิกตารางเพื่อดูข้อมูล (แท็บ **Browse**), โครงสร้าง (แท็บ **Structure**) หรือพิมพ์ SQL เอง (แท็บ **SQL**)

`docker-compose.yaml` ทำอะไร:

| service | image | หน้าที่ |
|---|---|---|
| `mysql` | mysql:8.0 | ฐานข้อมูล — mount `mysql/schema.sql` และ `mysql/data.sql` เข้า `/docker-entrypoint-initdb.d/` → **MySQL รันให้เองตอนเริ่มครั้งแรก** (ตั้งชื่อ `01-schema.sql`, `02-data.sql` เพื่อบังคับลำดับ) |
| `phpmyadmin` | phpmyadmin:5 | หน้าเว็บดู/แก้ข้อมูล ต่อไปที่ service `mysql` ด้วย user root อัตโนมัติ |

> MySQL รัน init script เฉพาะตอน volume ยังว่าง — ถ้าแก้ `schema.sql`/`data.sql` แล้วอยากโหลดใหม่:
> `docker compose down -v` แล้ว `docker compose up -d` อีกครั้ง

ต่อด้วยโปรแกรมอื่น (DBeaver / MySQL Workbench): host `localhost` port `3307` user `root` pass `test` database `mflix`

### ขั้นที่ 3 — เข้าไปเล่น SQL เองผ่าน terminal (ถ้าต้องการ)

```powershell
docker exec -it -e MYSQL_PWD=test fam-mysql mysql -uroot mflix
```

จะได้ prompt `mysql>` พิมพ์ SQL ได้เลย เช่น `SELECT title, year FROM movies;` ออกด้วย `exit`

### ปิดระบบ

```powershell
docker compose down
```

(เพิ่ม `-v` ถ้าต้องการลบข้อมูลใน MySQL ด้วย)

### ทางเลือก: โหลดด้วย script โดยไม่ใช้ phpMyAdmin

```powershell
powershell -ExecutionPolicy Bypass -File .\load_mysql.ps1
```

script จะเปิด container `mysql-test` เดี่ยวๆ → copy SQL เข้าไป → รัน → แสดงตารางผลลัพธ์ใน terminal
(อย่าเปิดพร้อมกับ `docker compose up` เพราะใช้พอร์ต 3307 เหมือนกัน · ปิดด้วย `docker rm -f mysql-test`)

> **ทำไมไม่ใช้ `mysql < file.sql`?** PowerShell ไม่รองรับ `<` (redirect input) — ใช้ได้เฉพาะใน Bash/cmd
> โปรเจกต์นี้จึงให้ MySQL อ่านไฟล์เองผ่าน `docker-entrypoint-initdb.d` หรือ `docker cp` + `source`

---

## อธิบายการแปลงทีละขั้น

### ขั้นที่ 1 — ซ่อม `dataset_test_1.txt` (TXT → JSON)

ไฟล์นี้หายไป 3 อักขระ: `"` `:` `/` — บรรทัดจึงเหลือรูป `key value,`

```
  runtime 11,                    ← key=runtime  value=11        → ตัวเลข
  title The Great Train Robbery, ← key=title    value=ที่เหลือ  → ข้อความ
  genres [                       ← key=genres   เปิด array
    Short,                       ← ไม่มี key = สมาชิก array
```

`convert.py` มี parser เล็กๆ (`repair_stripped`) อ่านทีละบรรทัด: คำแรก = key, ที่เหลือ = value, ถ้าลงท้าย `{`/`[` = เปิด object/array ซ้อน แล้วเดาชนิด (ตรง regex ตัวเลข → int/float, ไม่งั้น string)

ค่าที่ซ่อมอัตโนมัติไม่ได้ (เพราะไม่รู้ว่า `/` `:` เคยอยู่ตรงไหน) ระบุไว้ชัดใน `MANUAL_FIXES`:

| field | ในไฟล์เสีย | ซ่อมเป็น |
|---|---|---|
| `poster` | `httpsm.media-amazon.comimagesMMV5B…` | `https://m.media-amazon.com/images/M/MV5B…` |
| `lastupdated` | `2015-08-13 002759.177000000` | `2015-08-13 00:27:59.177000000` |
| `tomatoes.lastUpdated.$date` | `2015-08-08T191610.000Z` | `2015-08-08T19:16:10.000Z` |

`datasets_test_2.txt` เป็น JSON ถูกต้องอยู่แล้ว → `json.loads()` อ่านตรงๆ

### ขั้นที่ 2 — Normalize (Mongo Extended JSON → plain JSON)

MongoDB มีชนิดข้อมูลที่ JSON ธรรมดาไม่มี เลยห่อไว้ในรูป Extended JSON ต้องแกะออก:

| Mongo | ตัวอย่าง | แปลงเป็น |
|---|---|---|
| `{"$oid": "573a…"}` | `_id` | string `"573a…"` |
| `{"$date": {"$numberLong": "-2085523200000"}}` | `released` | `"1903-12-01 00:00:00"` (มิลลิวินาทีนับจาก 1 ม.ค. 1970 — **ติดลบ = ก่อน 1970**) |
| `{"$date": "2015-08-08T19:16:10.000Z"}` | `tomatoes.lastUpdated` | `"2015-08-08 19:16:10"` |

### ขั้นที่ 3 — ออกแบบตาราง MySQL

ปัญหาหลัก: **JSON ซ้อนได้ แต่ตาราง SQL แบน** จึงแตกเป็น:

```
movies ──1:N──< movie_genres     (genres[])
       ──1:N──< movie_cast       (cast[]  เก็บ position = ลำดับใน array)
       ──1:N──< movie_directors  (directors[])
       ──1:N──< movie_languages  (languages[])
       ──1:N──< movie_countries  (countries[])
```

| ชนิดใน Mongo | วิธีแปลง | เหตุผล |
|---|---|---|
| field ธรรมดา (`title`, `year`, …) | คอลัมน์ใน `movies` | — |
| nested object (`awards`, `imdb`, `tomatoes`) | flatten เป็นคอลัมน์ `awards_wins`, `imdb_rating`, `tomatoes_critic_meter` … | 1:1 กับหนัง ไม่จำเป็นต้องแยกตาราง |
| array (`genres`, `cast`, …) | ตารางลูก + FOREIGN KEY `ON DELETE CASCADE` | 1NF — ไม่เก็บหลายค่าในช่องเดียว, JOIN/ค้นหาด้วย index ได้ |
| ทั้งเอกสาร | คอลัมน์ `raw_json` ชนิด `JSON` | เผื่อ field ที่ไม่ได้ flatten → `JSON_EXTRACT(raw_json, '$.tomatoes.viewer.meter')` |
| `_id` | `CHAR(24)` PRIMARY KEY | ObjectId เป็น hex 24 ตัวเสมอ |
| `imdb.id` | `UNIQUE KEY` | กันหนังซ้ำ |

field ที่มีเฉพาะบางเอกสาร (เช่น `poster`, `tomatoes.critic` มีแค่โจทย์ 1) → คอลัมน์เป็น `NULL` ได้
ค่าที่มี `'` เช่น `Gilbert M. 'Broncho Billy' Anderson` ถูก escape เป็น `\'` ในไฟล์ SQL

### ขั้นที่ 4 — โหลดเข้า MySQL

`schema.sql` สร้าง database + 6 ตาราง (ต้องรันก่อน) → `data.sql` INSERT ข้อมูล (ต้องรันหลัง เพราะอ้างตารางที่สร้างแล้ว และ `movies` ต้องมาก่อนตารางลูกเพราะ FOREIGN KEY)

## ผลลัพธ์ (MySQL 8.0)

```
id                        title                    year  rated  runtime  released    imdb_rating  genres
573a1390f29313caabcd42e8  The Great Train Robbery  1903  TV-G   11       1903-12-01  7.4          Short,Western
573a1390f29313caabcd446f  A Corner in Wheat        1909  G      14       1909-12-13  6.6          Drama,Short

movies 2 · movie_genres 4 · movie_cast 8 · movie_directors 2 · movie_languages 2 · movie_countries 2
```

ตัวอย่าง query ที่ทำได้หลังแปลงเป็น SQL (พิมพ์ในแท็บ SQL ของ phpMyAdmin):

```sql
-- หนังแนว Western ที่ imdb rating > 7
SELECT m.title, m.year, m.imdb_rating
FROM movies m JOIN movie_genres g ON g.movie_id = m.id
WHERE g.genre = 'Western' AND m.imdb_rating > 7;

-- หาหนังจากชื่อนักแสดง (ทำได้เพราะแยก array เป็นตาราง)
SELECT m.title FROM movies m JOIN movie_cast c ON c.movie_id = m.id
WHERE c.actor_name = 'George Barnes';

-- ดึงจาก JSON ต้นฉบับที่เก็บไว้
SELECT title, JSON_EXTRACT(raw_json, '$.tomatoes.viewer.meter') AS viewer_meter FROM movies;
```

## การทดสอบ (พิสูจน์ว่า TXT → JSON → MySQL ถูกต้อง)

```powershell
python -X utf8 test_convert.py
```

(`-X utf8` เพื่อให้ console Windows แสดงภาษาไทยได้ · ขั้น MySQL ต้องเปิด Docker Desktop ไว้ ถ้าไม่มีจะข้ามให้อัตโนมัติ)

`test_convert.py` รัน `convert.py` ใหม่แล้วตรวจ 4 ระดับ รวม 19 tests:

| Stage | ตรวจอะไร | tests |
|---|---|---|
| **1 · TXT → JSON** | ไฟล์ parse เป็น JSON ได้ · จำนวนค่าใน JSON = จำนวนบรรทัดค่าใน txt (ไม่มีข้อมูลหาย) · โครงสร้าง test_1 ที่ซ่อมตรงกับ test_2 ที่ถูกต้อง · ชนิดข้อมูลคืนมาถูก · ค่าที่ซ่อมด้วยมือถูกใช้จริง · test_2 ผ่านออกมาเท่าต้นฉบับทุกประการ | 6 |
| **2 · JSON → normalized** | ไม่เหลือ `$oid`/`$date`/`$numberLong` · วันที่ตรงกับที่คำนวณด้วยมือ · field อื่นไม่ถูกแตะ | 3 |
| **3 · JSON → SQL text** | INSERT `movies` 1 แถวต่อเอกสาร · จำนวนแถวลูก = ความยาว array · quote ถูก escape · schema ครบ 6 ตาราง | 4 |
| **4 · SQL → MySQL จริง (round-trip)** | เปิด MySQL 8 ใน Docker → โหลด → **SELECT กลับมาเทียบกับ JSON ทุก field** · array อ่านกลับได้ list เดิม (cast เรียงลำดับเดิม) · field ที่ไม่มีเป็น NULL · `raw_json` query ได้ · FOREIGN KEY cascade ทำงาน (ใน transaction แล้ว rollback) → ปิด container ทิ้งเอง | 6 |

ผลล่าสุด:
```
Ran 19 tests in 11.9s
OK
```
