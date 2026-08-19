CREATE TABLE IF NOT EXISTS games (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  genre TEXT NOT NULL,
  players TEXT NOT NULL,
  rating NUMERIC(2,1) NOT NULL,
  image TEXT NOT NULL
);

INSERT INTO games (id,title,genre,players,rating,image) VALUES
(1,'Neon Drift','Course','1-4',4.8,'/assets/game-1.jpg'),
(2,'Orbital Run','Action','1-2',4.6,'/assets/game-2.jpg'),
(3,'Dungeon Byte','RPG','1-4',4.9,'/assets/game-3.jpg'),
(4,'Pixel Rally','Arcade','1-6',4.5,'/assets/game-4.jpg'),
(5,'Echoes IX','Aventure','1',4.7,'/assets/game-5.jpg'),
(6,'Skyforge','Co-op','2-4',4.4,'/assets/game-6.jpg'),
(7,'Cyber Arena','PvP','2-8',4.8,'/assets/game-7.jpg'),
(8,'Forest Loop','Puzzle','1-2',4.3,'/assets/game-8.jpg')
ON CONFLICT (id) DO NOTHING;
