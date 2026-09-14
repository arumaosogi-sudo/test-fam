-- data.sql — ข้อมูลจากโจทย์ test ทั้ง 2 ไฟล์ (สร้างโดย convert.py)
-- รันหลัง schema.sql:  mysql -u root -p mflix < data.sql

USE mflix;
SET NAMES utf8mb4;

-- ---------- dataset_test_1.txt: The Great Train Robbery (1903) ----------
INSERT INTO movies (id, title, type, year, rated, runtime, released, plot, fullplot, poster, num_mflix_comments, lastupdated, awards_wins, awards_nominations, awards_text, imdb_id, imdb_rating, imdb_votes, tomatoes_viewer_rating, tomatoes_viewer_num_reviews, tomatoes_viewer_meter, tomatoes_critic_rating, tomatoes_critic_num_reviews, tomatoes_critic_meter, tomatoes_fresh, tomatoes_rotten, tomatoes_last_updated, raw_json) VALUES
  ('573a1390f29313caabcd42e8', 'The Great Train Robbery', 'movie', 1903, 'TV-G', 11, '1903-12-01', 'A group of bandits stage a brazen train hold-up, only to find a determined posse hot on their heels.', 'Among the earliest existing films in American cinema - notable as the first film that presented a narrative story to tell - it depicts a group of cowboy outlaws who hold up a train and rob the passengers. They are then pursued by a Sheriff\'s posse. Several scenes have color included - all hand tinted.', 'https://m.media-amazon.com/images/M/MV5BMTU3NjE5NzYtYTYyNS00MDVmLWIwYjgtMmYwYWIxZDYyNzU2XkEyXkFqcGdeQXVyNzQzNzQxNzI@._V1_SY1000_SX677_AL_.jpg', 0, '2015-08-13 00:27:59.177000', 1, 0, '1 win.', 439, 7.4, 9847, 3.7, 2559, 75, 7.6, 6, 100, 6, 0, '2015-08-08 19:16:10', '{"_id": {"$oid": "573a1390f29313caabcd42e8"}, "plot": "A group of bandits stage a brazen train hold-up, only to find a determined posse hot on their heels.", "genres": ["Short", "Western"], "runtime": 11, "cast": ["A.C. Abadie", "Gilbert M. \'Broncho Billy\' Anderson", "George Barnes", "Justus D. Barnes"], "poster": "https://m.media-amazon.com/images/M/MV5BMTU3NjE5NzYtYTYyNS00MDVmLWIwYjgtMmYwYWIxZDYyNzU2XkEyXkFqcGdeQXVyNzQzNzQxNzI@._V1_SY1000_SX677_AL_.jpg", "title": "The Great Train Robbery", "fullplot": "Among the earliest existing films in American cinema - notable as the first film that presented a narrative story to tell - it depicts a group of cowboy outlaws who hold up a train and rob the passengers. They are then pursued by a Sheriff\'s posse. Several scenes have color included - all hand tinted.", "languages": ["English"], "released": {"$date": {"$numberLong": "-2085523200000"}}, "directors": ["Edwin S. Porter"], "rated": "TV-G", "awards": {"wins": 1, "nominations": 0, "text": "1 win."}, "lastupdated": "2015-08-13 00:27:59.177000000", "year": 1903, "imdb": {"rating": 7.4, "votes": 9847, "id": 439}, "countries": ["USA"], "type": "movie", "tomatoes": {"viewer": {"rating": 3.7, "numReviews": 2559, "meter": 75}, "fresh": 6, "critic": {"rating": 7.6, "numReviews": 6, "meter": 100}, "rotten": 0, "lastUpdated": {"$date": "2015-08-08T19:16:10.000Z"}}, "num_mflix_comments": 0}');
INSERT INTO movie_genres (movie_id, genre) VALUES
  ('573a1390f29313caabcd42e8', 'Short'),
  ('573a1390f29313caabcd42e8', 'Western');
INSERT INTO movie_cast (movie_id, position, actor_name) VALUES
  ('573a1390f29313caabcd42e8', 1, 'A.C. Abadie'),
  ('573a1390f29313caabcd42e8', 2, 'Gilbert M. \'Broncho Billy\' Anderson'),
  ('573a1390f29313caabcd42e8', 3, 'George Barnes'),
  ('573a1390f29313caabcd42e8', 4, 'Justus D. Barnes');
INSERT INTO movie_directors (movie_id, director_name) VALUES
  ('573a1390f29313caabcd42e8', 'Edwin S. Porter');
INSERT INTO movie_languages (movie_id, language) VALUES
  ('573a1390f29313caabcd42e8', 'English');
INSERT INTO movie_countries (movie_id, country) VALUES
  ('573a1390f29313caabcd42e8', 'USA');

-- ---------- datasets_test_2.txt: A Corner in Wheat (1909) ----------
INSERT INTO movies (id, title, type, year, rated, runtime, released, plot, fullplot, poster, num_mflix_comments, lastupdated, awards_wins, awards_nominations, awards_text, imdb_id, imdb_rating, imdb_votes, tomatoes_viewer_rating, tomatoes_viewer_num_reviews, tomatoes_viewer_meter, tomatoes_critic_rating, tomatoes_critic_num_reviews, tomatoes_critic_meter, tomatoes_fresh, tomatoes_rotten, tomatoes_last_updated, raw_json) VALUES
  ('573a1390f29313caabcd446f', 'A Corner in Wheat', 'movie', 1909, 'G', 14, '1909-12-13', 'A greedy tycoon decides, on a whim, to corner the world market in wheat. This doubles the price of bread, forcing the grain\'s producers into charity lines and further into poverty. The film...', 'A greedy tycoon decides, on a whim, to corner the world market in wheat. This doubles the price of bread, forcing the grain\'s producers into charity lines and further into poverty. The film continues to contrast the ironic differences between the lives of those who work to grow the wheat and the life of the man who dabbles in its sale for profit.', NULL, 1, '2015-08-13 00:46:30.660000', 1, 0, '1 win.', 832, 6.6, 1375, 3.6, 109, 73, NULL, NULL, NULL, NULL, NULL, '2015-05-11 18:36:53', '{"_id": {"$oid": "573a1390f29313caabcd446f"}, "plot": "A greedy tycoon decides, on a whim, to corner the world market in wheat. This doubles the price of bread, forcing the grain\'s producers into charity lines and further into poverty. The film...", "genres": ["Short", "Drama"], "runtime": 14, "cast": ["Frank Powell", "Grace Henderson", "James Kirkwood", "Linda Arvidson"], "num_mflix_comments": 1, "title": "A Corner in Wheat", "fullplot": "A greedy tycoon decides, on a whim, to corner the world market in wheat. This doubles the price of bread, forcing the grain\'s producers into charity lines and further into poverty. The film continues to contrast the ironic differences between the lives of those who work to grow the wheat and the life of the man who dabbles in its sale for profit.", "languages": ["English"], "released": {"$date": {"$numberLong": "-1895097600000"}}, "directors": ["D.W. Griffith"], "rated": "G", "awards": {"wins": 1, "nominations": 0, "text": "1 win."}, "lastupdated": "2015-08-13 00:46:30.660000000", "year": 1909, "imdb": {"rating": 6.6, "votes": 1375, "id": 832}, "countries": ["USA"], "type": "movie", "tomatoes": {"viewer": {"rating": 3.6, "numReviews": 109, "meter": 73}, "lastUpdated": {"$date": "2015-05-11T18:36:53.000Z"}}}');
INSERT INTO movie_genres (movie_id, genre) VALUES
  ('573a1390f29313caabcd446f', 'Short'),
  ('573a1390f29313caabcd446f', 'Drama');
INSERT INTO movie_cast (movie_id, position, actor_name) VALUES
  ('573a1390f29313caabcd446f', 1, 'Frank Powell'),
  ('573a1390f29313caabcd446f', 2, 'Grace Henderson'),
  ('573a1390f29313caabcd446f', 3, 'James Kirkwood'),
  ('573a1390f29313caabcd446f', 4, 'Linda Arvidson');
INSERT INTO movie_directors (movie_id, director_name) VALUES
  ('573a1390f29313caabcd446f', 'D.W. Griffith');
INSERT INTO movie_languages (movie_id, language) VALUES
  ('573a1390f29313caabcd446f', 'English');
INSERT INTO movie_countries (movie_id, country) VALUES
  ('573a1390f29313caabcd446f', 'USA');
