export interface Word {
  id: string;
  word: string;
  meaning: string;
  phonetic: string | null;
  example_note: string | null;
  ai_example: string | null;
  etymology: string | null;
  level: number;
  next_review: string;
  tags: string[];
  created_at: string;
  learned_count?: number;
  forgot_count?: number;
}

export type CardStep = 1 | 2 | 3;

export interface LearnSession {
  words: Word[];
  currentIndex: number;
  results: { wordId: string; known: boolean }[];
}

export interface LearningLog {
  id: string;
  word_id: string;
  word_text: string;
  action: "learned" | "forgot";
  created_at: string;
}
