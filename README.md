
## โครงสร้างโฟลเดอร์

```
.
├── convert.py                         # script แปลงทั้งหมด — รัน  python convert.py  
├── load_mysql.ps1                     # (PowerShell) เปิด MySQL ใน Docker + โหลด schema/data 
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


### ขั้นที่ 1 — แปลง TXT → JSON → SQL

```powershell
python convert.py
```

### ขั้นที่ 2 — โหลด SQL เข้า MySQL (คำสั่งเดียว)

```powershell
.\load_mysql.ps1
```

ถ้าขึ้น error เรื่อง execution policy ให้ใช้:

```powershell
powershell -ExecutionPolicy Bypass -File .\load_mysql.ps1
```

### ขั้นที่ 3 — เข้าไปเล่น SQL เอง

```powershell
docker exec -it -e MYSQL_PWD=test mysql-test mysql -uroot mflix
```

### ปิดระบบ

```powershell
docker rm -f mysql-test
```

### ทดสอบด้วยมือ 

```bash
python -c "import json; print(json.load(open('json/dataset_test_1.json', encoding='utf-8'))['title'])"
```

```bash
docker run -d --name mysql-test -e MYSQL_ROOT_PASSWORD=test mysql:8.0
```
```bash
docker exec -i mysql-test mysql -uroot -ptest < mysql/schema.sql
```
```bash
docker exec -i mysql-test mysql -uroot -ptest < mysql/data.sql
```
```bash
docker exec -it mysql-test mysql -uroot -ptest mflix -e "SELECT m.title, m.year, GROUP_CONCAT(g.genre) genres FROM movies m JOIN movie_genres g ON g.movie_id=m.id GROUP BY m.id;"
```
```bash
docker rm -f mysql-test
```
