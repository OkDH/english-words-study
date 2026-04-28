-- Create user_word_progress table for storing per-user learning progress
CREATE TABLE IF NOT EXISTS user_word_progress (
  id TEXT DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  word_id TEXT NOT NULL,
  level INTEGER DEFAULT 0,
  next_review TIMESTAMPTZ DEFAULT NOW(),
  times_reviewed INTEGER DEFAULT 0,
  times_forgot INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, word_id)
);

-- Copy existing word levels to dong's progress
INSERT INTO user_word_progress (user_id, word_id, level, next_review, created_at, updated_at)
SELECT 'dong', id::TEXT, level, next_review, NOW(), NOW()
FROM words
WHERE level > 0 OR next_review IS NOT NULL;

-- Copy for suyeon with level 0
INSERT INTO user_word_progress (user_id, word_id, level, next_review, created_at, updated_at)
SELECT 'suyeon', id::TEXT, 0, NOW(), NOW(), NOW()
FROM words
WHERE id::TEXT NOT IN (SELECT word_id FROM user_word_progress WHERE user_id = 'dong')
AND id::TEXT NOT IN (SELECT word_id FROM user_word_progress WHERE user_id = 'suyeon');

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_user_word_progress_user_id ON user_word_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_word_progress_word_id ON user_word_progress(word_id);
CREATE INDEX IF NOT EXISTS idx_user_word_progress_next_review ON user_word_progress(user_id, next_review);