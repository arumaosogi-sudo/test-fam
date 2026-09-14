-- schema.sql — โครงสร้างตารางสำหรับ MySQL 8
-- สร้างโดย convert.py จากเอกสาร MongoDB (sample_mflix.movies)
-- รัน:  mysql -u root -p < schema.sql

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
