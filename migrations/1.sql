
CREATE TABLE game_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  total_score INTEGER NOT NULL DEFAULT 0,
  puzzles_solved INTEGER NOT NULL DEFAULT 0,
  puzzles_attempted INTEGER NOT NULL DEFAULT 0,
  session_duration_seconds INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE puzzle_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  game_session_id INTEGER NOT NULL,
  user_id TEXT NOT NULL,
  puzzle_type TEXT NOT NULL,
  puzzle_data TEXT NOT NULL,
  user_answer TEXT,
  correct_answer TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL DEFAULT 0,
  time_taken_seconds INTEGER NOT NULL,
  points_earned INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_stats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL UNIQUE,
  total_score INTEGER NOT NULL DEFAULT 0,
  total_puzzles_solved INTEGER NOT NULL DEFAULT 0,
  total_puzzles_attempted INTEGER NOT NULL DEFAULT 0,
  best_session_score INTEGER NOT NULL DEFAULT 0,
  average_time_per_puzzle REAL NOT NULL DEFAULT 0,
  math_puzzles_solved INTEGER NOT NULL DEFAULT 0,
  logic_puzzles_solved INTEGER NOT NULL DEFAULT 0,
  word_puzzles_solved INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_game_sessions_user_id ON game_sessions(user_id);
CREATE INDEX idx_puzzle_results_game_session_id ON puzzle_results(game_session_id);
CREATE INDEX idx_puzzle_results_user_id ON puzzle_results(user_id);
CREATE INDEX idx_user_stats_user_id ON user_stats(user_id);
