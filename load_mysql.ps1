param(
    [string]$Container = "mysql-test",
    [string]$Password  = "test",
    [int]$Port         = 3307      # พอร์ตบนเครื่องคุณสำหรับต่อด้วย DBeaver (ไม่ใช้ 3306 เพราะมักถูกจองอยู่แล้ว)
)

Set-Location $PSScriptRoot

function Step($msg) { Write-Host "`n==> $msg" -ForegroundColor Cyan }


Step "ตรวจ Docker Desktop"
docker info *> $null
if ($LASTEXITCODE -ne 0) {
    Write-Host "Docker Desktop ยังไม่เปิด — เปิดโปรแกรม Docker Desktop แล้วรันใหม่" -ForegroundColor Red
    exit 1
}


Step "เปิด container '$Container' (mysql:8.0)"
$exists = docker ps -a --format "{{.Names}}" | Where-Object { $_ -eq $Container }
if ($exists) {
    docker start $Container | Out-Null
} else {
    docker run -d --name $Container -e "MYSQL_ROOT_PASSWORD=$Password" -p "${Port}:3306" mysql:8.0 | Out-Null
}


Step "รอ MySQL พร้อม (ครั้งแรกประมาณ 20-40 วินาที)"
$ready = $false
for ($i = 0; $i -lt 40; $i++) {
    docker exec -e "MYSQL_PWD=$Password" $Container mysqladmin ping -uroot --silent *> $null
    if ($LASTEXITCODE -eq 0) { $ready = $true; break }
    Start-Sleep -Seconds 3
    Write-Host "." -NoNewline
}
Write-Host ""
if (-not $ready) { Write-Host "MySQL ไม่พร้อมภายในเวลา ลองดู: docker logs $Container" -ForegroundColor Red; exit 1 }


Step "copy schema.sql / data.sql เข้า container"
docker cp mysql/schema.sql "${Container}:/tmp/schema.sql"
docker cp mysql/data.sql   "${Container}:/tmp/data.sql"


Step "รัน schema.sql (สร้าง database mflix + 6 ตาราง)"
docker exec -e "MYSQL_PWD=$Password" $Container mysql -uroot -e "source /tmp/schema.sql"
if ($LASTEXITCODE -ne 0) { Write-Host "schema.sql ล้มเหลว" -ForegroundColor Red; exit 1 }

Step "รัน data.sql (INSERT ข้อมูลหนัง 2 เรื่อง)"
docker exec -e "MYSQL_PWD=$Password" $Container mysql -uroot mflix -e "source /tmp/data.sql"
if ($LASTEXITCODE -ne 0) { Write-Host "data.sql ล้มเหลว" -ForegroundColor Red; exit 1 }


Step "ผลลัพธ์ในตาราง"
docker exec -e "MYSQL_PWD=$Password" $Container mysql -uroot mflix --table -e @"
SELECT 'movies' AS tbl, COUNT(*) AS rows_ FROM movies
UNION ALL SELECT 'movie_genres',    COUNT(*) FROM movie_genres
UNION ALL SELECT 'movie_cast',      COUNT(*) FROM movie_cast
UNION ALL SELECT 'movie_directors', COUNT(*) FROM movie_directors
UNION ALL SELECT 'movie_languages', COUNT(*) FROM movie_languages
UNION ALL SELECT 'movie_countries', COUNT(*) FROM movie_countries;
SELECT m.id, m.title, m.year, m.rated, m.runtime, m.released, m.imdb_rating,
       GROUP_CONCAT(g.genre ORDER BY g.genre) AS genres
FROM movies m JOIN movie_genres g ON g.movie_id = m.id
GROUP BY m.id ORDER BY m.year;
SELECT m.title, c.position, c.actor_name
FROM movies m JOIN movie_cast c ON c.movie_id = m.id
ORDER BY m.year, c.position;
"@

Write-Host ""
Write-Host "เสร็จแล้ว — เข้าไปพิมพ์ SQL เองได้ด้วย:" -ForegroundColor Green
Write-Host "    docker exec -it -e MYSQL_PWD=$Password $Container mysql -uroot mflix"
Write-Host "ต่อจาก DBeaver/MySQL Workbench: host localhost  port $Port  user root  pass $Password  db mflix"
Write-Host "ปิดและลบ container:  docker rm -f $Container"
