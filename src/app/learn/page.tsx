"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence, useMotionValue } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { generateExample, generateExamples, generatePassage } from "@/lib/groq";
import { useTTS } from "@/lib/useTTS";
import { fetchEtymology } from "@/lib/phonetic";
import type { Word } from "@/lib/types";

const REVIEW_INTERVALS = [
  0,    // Level 0: 즉시
  60,   // Level 1: 1시간 후 (60분)
  1440, // Level 2: 1일 후 (1440분)
  4320, // Level 3: 3일 후 (4320분)
  10080,// Level 4: 7일 후 (10080분)
  20160,// Level 5: 14일 후 (20160분)
];

type Step = 1 | 2;
type Mode = "review" | "shuffle" | "deep";

interface Passage {
  text: string;
  words: Word[];
}

function LearnContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const learnCount = Number(searchParams.get("count") || "20");
  const learnMode = (searchParams.get("mode") as Mode) || "review";
  const shuffleSubMode = searchParams.get("subMode") as 'normal' | 'reverse' | 'mixed' | null;

  const [words, setWords] = useState<Word[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(true);
  const [generatingHint, setGeneratingHint] = useState(false);
  const [passage, setPassage] = useState<Passage | null>(null);
  const [generatingPassage, setGeneratingPassage] = useState(false);
  const [hintEtymology, setHintEtymology] = useState<string | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [generatingHintContent, setGeneratingHintContent] = useState(false);
  const [cardDirection, setCardDirection] = useState<'normal' | 'reverse'>('normal');
  const [results, setResults] = useState<{ wordId: string; word: string; meaning: string; known: boolean }[]>([]);
  const [showResults, setShowResults] = useState(false);
  const x = useMotionValue(0);
  const { speak, stop } = useTTS();

  const REVERSE_PROBABILITIES: Record<number, number> = {
    0: 0,
    1: 0,
    2: 0,
    3: 0.3,
    4: 0.5,
    5: 0.8,
  };

  function getCardDirection(level: number): 'normal' | 'reverse' {
    if (shuffleSubMode === 'normal') return 'normal';
    if (shuffleSubMode === 'reverse') return 'reverse';
    if (shuffleSubMode === 'mixed') {
      return Math.random() < 0.5 ? 'normal' : 'reverse';
    }
    if (level < 3) return 'normal';
    const prob = REVERSE_PROBABILITIES[level] || 0;
    return Math.random() < prob ? 'reverse' : 'normal';
  }

  useEffect(() => {
    fetchWords();
  }, [learnMode]);

  useEffect(() => {
    const word = words[currentIndex];
    if (word) {
      if (shuffleSubMode === 'normal') {
        setCardDirection('normal');
      } else if (shuffleSubMode === 'reverse') {
        setCardDirection('reverse');
      } else {
        setCardDirection(getCardDirection(word.level));
      }
      setStep(1);
    }
  }, [currentIndex, words, shuffleSubMode]);

  async function fetchWords() {
    const userId = localStorage.getItem("selectedUser") || "dong";

    if (learnMode === "shuffle") {
      const { data } = await supabase
        .from("words")
        .select("*")
        .order("id", { ascending: false });

      if (data && data.length > 0) {
        const shuffled = [...data].sort(() => Math.random() - 0.5);
        const selected = shuffled.slice(0, learnCount);
        setWords(selected);
      } else {
        setWords([]);
      }
      setLoading(false);
      return;
    }

    if (learnMode === "deep") {
      const { data } = await supabase
        .from("words")
        .select("*")
        .limit(30);

      if (data && data.length > 0) {
        const shuffled = [...data].sort(() => Math.random() - 0.5);
        setWords(shuffled);
        generatePassageFromWords(shuffled.slice(0, 5));
      } else {
        setWords([]);
      }
      setLoading(false);
      return;
    }

    const now = new Date();
    const nowISO = now.toISOString();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();

    const { data: dueProgress } = await supabase
      .from("user_word_progress")
      .select("word_id, level, next_review")
      .eq("user_id", userId)
      .or(`next_review.lte.${nowISO},next_review.is.null`);

    const dueForReview = dueProgress?.filter(p => {
      if (!p.next_review) return true;
      return new Date(p.next_review) <= now;
    }) || [];

    if (dueProgress && dueForReview.length > 0) {
      const shuffled = dueForReview.sort(() => Math.random() - 0.5);
      const wordIds = shuffled.slice(0, learnCount).map(p => p.word_id);
      const { data: dueWords } = await supabase
        .from("words")
        .select("*")
        .in("id", wordIds);
      const progressMap = new Map(dueProgress.map(p => [p.word_id, p]));
      const wordsWithProgress = dueWords?.map(w => ({
        ...w,
        level: progressMap.get(w.id)?.level || 0,
        next_review: progressMap.get(w.id)?.next_review,
      })) || [];
      const finalShuffled = wordsWithProgress.sort(() => Math.random() - 0.5);
      setWords(finalShuffled);
      setLoading(false);
      return;
    }

    setWords([]);
    setLoading(false);
  }

  async function generatePassageFromWords(selectedWords: Word[]) {
    if (selectedWords.length < 3) {
      setPassage({ text: "심화 학습에는 최소 3개 이상의 레벨 4 이상 단어가 필요합니다.", words: [] });
      return;
    }

    setGeneratingPassage(true);
    try {
      const text = await generatePassage(selectedWords.map(w => w.word));
      if (text) {
        setPassage({ text, words: selectedWords });
      } else {
        setPassage({ text: "지문 생성에 실패했습니다.", words: selectedWords });
      }
    } catch (e) {
      console.error("Failed to generate passage:", e);
      setPassage({ text: "지문 생성에 실패했습니다.", words: selectedWords });
    }
    setGeneratingPassage(false);
  }

  const currentWord = words[currentIndex];

  async function logLearning(wordId: string, wordText: string, action: "learned" | "forgot") {
    const userId = localStorage.getItem("selectedUser") || "dong";
    await supabase.from("learning_logs").insert({
      word_id: wordId,
      word_text: wordText,
      action,
      user_id: userId,
    });
  }

const handleSwipe = useCallback(
    async (known: boolean) => {
      if (!currentWord) return;
      const userId = localStorage.getItem("selectedUser") || "dong";
      const oldLevel = currentWord.level;
      let newLevel = oldLevel;

      if (learnMode === "review") {
        newLevel = known ? Math.min(oldLevel + 1, 5) : 0;
        let minutes = REVIEW_INTERVALS[newLevel];

        if (!known) {
          minutes = 60;
        }

        const nextReview = new Date();
        nextReview.setMinutes(nextReview.getMinutes() + minutes);

        const { error } = await supabase
          .from("user_word_progress")
          .update({
            level: newLevel,
            next_review: nextReview.toISOString(),
          })
          .eq("user_id", userId)
          .eq("word_id", currentWord.id);

        console.log("Update result:", error);

        setWords(words.map(w =>
          w.id === currentWord.id
            ? { ...w, level: newLevel, next_review: nextReview.toISOString() }
            : w
        ));
      } else {
        newLevel = known ? oldLevel + 1 : oldLevel - 1;
        newLevel = Math.max(0, Math.min(5, newLevel));
      }

      setResults(prev => [...prev, {
        wordId: currentWord.id,
        word: currentWord.word,
        meaning: currentWord.meaning,
        known,
      }]);

      logLearning(currentWord.id, currentWord.word, known ? "learned" : "forgot");
      moveToNext();
    },
    [currentWord, learnMode, words]
  );

  const handleGenerateHint = useCallback(async () => {
    if (!currentWord || generatingHint) return;

    setGeneratingHint(true);

    if (!currentWord.ai_example) {
      try {
        const example = await generateExample(currentWord.word, currentWord.meaning);
        if (example) {
          await supabase
            .from("words")
            .update({ ai_example: example })
            .eq("id", currentWord.id);
          setWords(words.map(w =>
            w.id === currentWord.id ? { ...w, ai_example: example } : w
          ));
        }
      } catch (e) {
        console.error("Failed to generate hint:", e);
      }
    }

    setGeneratingHint(false);
  }, [currentWord, generatingHint, words]);

  function moveToNext() {
    if (learnMode === "deep") {
      const nextWords = words.slice(currentIndex + 1, currentIndex + 6);
      if (nextWords.length >= 3) {
        generatePassage(nextWords.map(w => w.word));
        setCurrentIndex(prev => prev + 1);
      } else {
        router.push("/");
      }
      return;
    }

    if (currentIndex < words.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setStep(1);
    }
  }

  useEffect(() => {
    if (showResults) return;
    if (results.length > 0 && currentIndex >= words.length - 1) {
      setShowResults(true);
    }
  }, [results.length, currentIndex, words.length, showResults]);

  function handleShowAnswer() {
    setStep(2);
    setTimeout(() => {
      speak(currentWord?.word || "");
    }, 100);
  }

  async function handleDontKnow() {
    if (!showHint) {
      setGeneratingHintContent(true);

      let etymology = currentWord?.etymology || null;

      if (!etymology && currentWord?.word) {
        etymology = await fetchEtymology(currentWord.word);
        if (etymology) {
          await supabase
            .from("words")
            .update({ etymology })
            .eq("id", currentWord.id);
        }
      }

      setHintEtymology(etymology);
      setShowHint(true);
      setGeneratingHintContent(false);
    } else {
      setShowHint(false);
      setHintEtymology(null);
      setResults(prev => [...prev, {
        wordId: currentWord.id,
        word: currentWord.word,
        meaning: currentWord.meaning,
        known: false,
      }]);
      moveToNext();
    }
  }

  function highlightWords(text: string, wordList: Word[]) {
    let result = text;
    wordList.forEach(word => {
      const regex = new RegExp(`\\b(${word.word})\\b`, "gi");
      result = result.replace(regex, "**$1**");
    });
    return result;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        로딩 중...
      </div>
    );
  }

  if (learnMode === "deep") {
    return (
      <main className="min-h-screen flex flex-col">
        <div className="h-12 px-4 flex items-center justify-between">
          <button
            onClick={() => router.push("/")}
            className="text-purple-500 font-medium"
          >
            ← 홈
          </button>
          <span className="text-sm text-slate-500">
            심화 학습
          </span>
        </div>

        <div className="flex-1 flex items-center justify-center p-4">
          {generatingPassage ? (
            <div className="text-center">
              <div className="text-4xl mb-4">✨</div>
              <p className="text-slate-500">AI가 지문을 작성중입니다...</p>
            </div>
          ) : passage ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full max-w-lg bg-white dark:bg-slate-800 rounded-3xl shadow-xl p-8"
            >
              <div className="mb-4 flex flex-wrap gap-2">
                {passage.words.map(w => (
                  <span key={w.id} className="bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-200 px-3 py-1 rounded-full text-sm">
                    {w.word}
                  </span>
                ))}
              </div>

              <div className="text-xl leading-relaxed text-slate-800 dark:text-slate-200 whitespace-pre-wrap">
                {highlightWords(passage.text, passage.words).split("**").map((part, i) =>
                  i % 2 === 1 ? (
                    <span key={i} className="bg-yellow-200 dark:bg-yellow-600 font-medium rounded px-1">
                      {part}
                    </span>
                  ) : (
                    <span key={i}>{part}</span>
                  )
                )}
              </div>

              <button
                onClick={() => {
                  const nextWords = words.slice(currentIndex + 1, currentIndex + 6);
                  if (nextWords.length >= 3) {
                    generatePassageFromWords(nextWords);
                    setCurrentIndex(prev => prev + 1);
                  } else {
                    router.push("/");
                  }
                }}
                className="w-full mt-6 bg-purple-500 text-white py-4 rounded-xl font-bold text-lg"
              >
                다음 지문 →
              </button>
            </motion.div>
          ) : (
            <div className="text-center">
              <p className="text-slate-500">심화 학습을 시작할 수 없습니다.</p>
              <p className="text-sm text-slate-400 mt-2">레벨 4 이상의 단어가 3개 이상 필요합니다.</p>
              <button
                onClick={() => router.push("/")}
                className="mt-4 bg-purple-500 text-white px-6 py-3 rounded-xl"
              >
                홈으로
              </button>
            </div>
          )}
        </div>
      </main>
    );
  }

  if (words.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <p className="text-slate-500 mb-4">학습할 단어가 없어요</p>
        <button
          onClick={() => router.push("/")}
          className="bg-primary text-white px-6 py-3 rounded-xl"
        >
          단어 추가하기
        </button>
      </div>
    );
  }

if (showResults) {
    const knownCount = results.filter(r => r.known).length;
    const unknownCount = results.filter(r => !r.known).length;
    const accuracy = results.length > 0 ? Math.round((knownCount / results.length) * 100) : 0;
    const unknownWords = results.filter(r => !r.known);

    return (
      <main className="min-h-screen flex flex-col p-4">
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-3xl shadow-xl p-8">
            <h2 className="text-2xl font-bold text-center mb-6">학습 완료!</h2>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="text-center p-4 bg-green-100 dark:bg-green-900 rounded-xl">
                <div className="text-3xl font-bold text-green-600 dark:text-green-400">{knownCount}</div>
                <div className="text-sm text-slate-500">알아요</div>
              </div>
              <div className="text-center p-4 bg-red-100 dark:bg-red-900 rounded-xl">
                <div className="text-3xl font-bold text-red-600 dark:text-red-400">{unknownCount}</div>
                <div className="text-sm text-slate-500">모르겠어요</div>
              </div>
            </div>

            <div className="text-center mb-6">
              <div className="text-4xl font-bold text-primary">{accuracy}%</div>
              <div className="text-sm text-slate-500">정답률</div>
            </div>

            {unknownWords.length > 0 && (
              <div className="mb-4">
                <h3 className="font-bold mb-2">복습이 필요한 단어</h3>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {unknownWords.map((w) => (
                    <div key={w.wordId} className="flex justify-between items-center p-2 bg-slate-100 dark:bg-slate-700 rounded-lg text-sm">
                      <div>
                        <span className="font-semibold">{w.word}</span>
                        <span className="ml-2 text-slate-500">{w.meaning}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={() => router.push("/")}
              className="w-full bg-primary text-white py-4 rounded-xl font-bold text-lg"
            >
              홈으로
            </button>
          </div>
        </div>
      </main>
    );
  }

  const progress = (currentIndex / words.length) * 100;

  return (
    <main className="min-h-screen flex flex-col">
      <div className="h-12 px-4 flex items-center justify-between">
        <button
          onClick={() => router.push("/")}
          className="text-primary font-medium"
        >
          ← 홈
        </button>
        <span className="text-sm text-slate-500">
          {currentIndex + 1} / {words.length}
        </span>
      </div>
      <div className="h-1 bg-slate-200">
        <div
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="flex-1 flex items-center justify-center p-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentWord?.id}
            className={`w-full max-w-md aspect-[3/4] bg-white dark:bg-slate-800 rounded-3xl shadow-xl p-6 flex flex-col ${cardDirection === 'reverse' ? 'border-4 border-purple-500' : 'border-4 border-primary'}`}
            drag={step === 2 ? "x" : false}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragEnd={(_, info) => {
              if (info.offset.x < -100) handleDontKnow();
              if (info.offset.x > 100) handleSwipe(true);
            }}
            style={{ x }}
            onTap={() => {}}
            onClick={(e) => {
              e.stopPropagation();
              if (step === 1) handleShowAnswer();
            }}
          >
            <div className="flex-1 flex flex-col items-center justify-center">
              {cardDirection === 'reverse' ? (
                <>
                  {step === 1 ? (
                    <div className="text-center">
                      <p className="text-2xl text-slate-700 dark:text-slate-200">
                        {currentWord?.meaning}
                      </p>
                      {currentWord?.example_note && (
                        <p className="mt-2 text-slate-500">
                          📝 {currentWord.example_note}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="text-center">
                      <h2 className="text-4xl font-bold text-center">
                        {currentWord?.word}
                      </h2>
                      {currentWord?.phonetic && (
                        <p className="text-slate-500 text-lg mt-1">{currentWord.phonetic}</p>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          speak(currentWord?.word || "");
                        }}
                        className="text-3xl mt-3"
                      >
                        🔊
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <h2 className="text-4xl font-bold text-center">
                    {currentWord?.word}
                  </h2>
                  {currentWord?.phonetic && (
                    <p className="text-slate-500 text-lg mt-1">{currentWord.phonetic}</p>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      speak(currentWord?.word || "");
                    }}
                    className="text-3xl mt-3"
                  >
                    🔊
                  </button>

                  {step >= 2 && (
                    <div className="text-center mt-6">
                      <p className="text-2xl text-slate-700 dark:text-slate-200">
                        {currentWord?.meaning}
                      </p>
                      {currentWord?.example_note && (
                        <p className="mt-2 text-slate-500">
                          📝 {currentWord.example_note}
                        </p>
                      )}
                    </div>
                  )}
                </>
              )}

              {step === 2 && currentWord?.ai_example && cardDirection === 'normal' && (
                <div className="text-center mt-4">
                  <p className="text-lg text-slate-600 dark:text-slate-300">
                    💡 {currentWord.ai_example}
                  </p>
                </div>
              )}

              <AnimatePresence>
                {showHint && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="absolute inset-0 z-50 bg-white dark:bg-slate-800 rounded-3xl flex flex-col items-center justify-center p-6 overflow-y-auto"
                  >
                    {generatingHintContent ? (
                      <div className="text-center">
                        <div className="text-4xl mb-4">📖</div>
                        <p className="text-slate-500">어원 찾는 중...</p>
                      </div>
                    ) : (
                      <>
                        {hintEtymology ? (
                          <div className="text-center max-w-md">
                            <div className="text-2xl mb-2">📖 어원</div>
                            <div className="bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-700 rounded-2xl p-3 mb-2">
                              <p className="text-xl font-bold text-slate-800 dark:text-slate-100">{currentWord?.word}</p>
                              <p className="text-base text-slate-500 dark:text-slate-400">{currentWord?.meaning}</p>
                            </div>
                            <div className="bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-200 dark:border-amber-700 rounded-2xl p-4 mb-6">
                              <p className="text-base leading-relaxed text-slate-700 dark:text-slate-200 whitespace-pre-wrap">
                                {hintEtymology}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center">
                            <div className="text-4xl mb-4">😔</div>
                            <p className="text-slate-500 mb-2">어원을 찾을 수 없어요</p>
                            <p className="text-sm text-slate-400">다른 출처에서 검색해보세요</p>
                          </div>
                        )}
                        <button
                          onClick={() => {
                            setShowHint(false);
                            setHintEtymology(null);
                            logLearning(currentWord.id, currentWord.word, "forgot");
                            moveToNext();
                          }}
                          className="bg-primary text-white px-8 py-3 rounded-xl font-bold"
                        >
                          확인
                        </button>
                      </>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="h-14">
              {cardDirection === 'reverse' ? (
                step === 1 ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setStep(2);
                      setTimeout(() => {
                        speak(currentWord?.word || "");
                      }, 100);
                    }}
                    className="w-full h-full bg-purple-500 text-white rounded-xl font-bold text-lg"
                  >
                    정답 보기
                  </button>
                ) : (
                  <div className="flex gap-4 h-full">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDontKnow();
                      }}
                      className="flex-1 bg-danger text-white rounded-xl font-bold text-lg"
                    >
                      👎 모름
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSwipe(true);
                      }}
                      className="flex-1 bg-success text-white rounded-xl font-bold text-lg"
                    >
                      👍 알아요
                    </button>
                  </div>
                )
              ) : (
                step === 1 ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleShowAnswer();
                    }}
                    className="w-full h-full bg-success text-white rounded-xl font-bold text-lg"
                  >
                    뜻 보기
                  </button>
                ) : (
                  <div className="flex gap-4 h-full">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDontKnow();
                      }}
                      className="flex-1 bg-danger text-white rounded-xl font-bold text-lg"
                    >
                      👎 모름
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSwipe(true);
                      }}
                      className="flex-1 bg-primary text-white rounded-xl font-bold text-lg"
                    >
                      👍 알아요
                    </button>
                  </div>
                )
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </main>
  );
}

export default function LearnPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">로딩 중...</div>}>
      <LearnContent />
    </Suspense>
  );
}