"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { Word } from "@/lib/types";

const PAGE_SIZE = 30;
const USERS = [
  { id: "dong", name: "동현", emoji: "👨" },
  { id: "suyeon", name: "수연", emoji: "👩" },
];

export default function HomePage() {
  const router = useRouter();
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [words, setWords] = useState<Word[]>([]);
  const [allWords, setAllWords] = useState<Word[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [learnCount, setLearnCount] = useState(20);
  const [learnMode, setLearnMode] = useState<"review" | "shuffle" | "deep">("review");
  const [shuffleSubMode, setShuffleSubMode] = useState<"normal" | "reverse" | "mixed">("mixed");
  const [showShuffleModal, setShowShuffleModal] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const observerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("selectedUser");
    if (storedUser) {
      setSelectedUser(storedUser);
    }
    setLoading(false);
  }, []);

useEffect(() => {
    if (selectedUser) {
      fetchWordsWithProgress();
    }
  }, [selectedUser]);

  const selectUser = (userId: string) => {
    setSelectedUser(userId);
    localStorage.setItem("selectedUser", userId);
  };

  const fetchWordsWithProgress = async () => {
    setLoading(true);
    const userId = localStorage.getItem("selectedUser") || "dong";

    const { data, count } = await supabase
      .from("words")
      .select("*", { count: "exact" })
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    const { data: progress } = await supabase
      .from("user_word_progress")
      .select("*")
      .eq("user_id", userId);

    if (data) {
      const progressMap = new Map(progress?.map(p => [p.word_id, p]) || []);
      const wordsWithProgress = data.map(w => ({
        ...w,
        level: progressMap.get(w.id)?.level || 0,
        next_review: progressMap.get(w.id)?.next_review || w.next_review,
      }));
      setAllWords(wordsWithProgress);
      setWords(wordsWithProgress.slice(0, PAGE_SIZE));
      setTotalCount(count || 0);
      setHasMore(data.length > PAGE_SIZE);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!observerRef.current || !hasMore || isSearching) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isSearching) {
          const nextWords = allWords.slice(0, words.length + PAGE_SIZE);
          setWords(nextWords);
          setHasMore(nextWords.length < allWords.length);
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(observerRef.current);
    return () => observer.disconnect();
  }, [hasMore, isSearching, words.length, allWords.length]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);

    if (query.length === 0) {
      setIsSearching(false);
      setWords(allWords.slice(0, PAGE_SIZE));
      setHasMore(allWords.length > PAGE_SIZE);
    } else if (query.length < 2) {
      setIsSearching(false);
      setWords([]);
    } else {
      setIsSearching(true);
      const filtered = allWords.filter(
        w => w.word.toLowerCase().includes(query.toLowerCase()) ||
             w.meaning.toLowerCase().includes(query.toLowerCase())
      );
      setWords(filtered);
      setHasMore(false);
    }
  };

  async function deleteWord(id: string) {
    await supabase.from("words").delete().eq("id", id);
    const newAllWords = allWords.filter(w => w.id !== id);
    setAllWords(newAllWords);
    setTotalCount(prev => prev - 1);

    if (isSearching) {
      setWords(newAllWords.filter(
        w => w.word.toLowerCase().includes(searchQuery.toLowerCase()) ||
             w.meaning.toLowerCase().includes(searchQuery.toLowerCase())
      ));
    } else {
      setWords(newAllWords.slice(0, PAGE_SIZE));
      setHasMore(newAllWords.length > PAGE_SIZE);
    }
  }

  const dueCount = allWords.filter(
    (w) => new Date(w.next_review) <= new Date()
  ).length;

  const currentUser = USERS.find(u => u.id === selectedUser);

  if (!selectedUser) {
    return (
      <main className="min-h-screen p-4 flex flex-col items-center justify-center">
        <h1 className="text-3xl font-bold text-primary mb-8">Word Study</h1>
        <p className="text-slate-500 mb-6">사용자를 선택하세요</p>
        <div className="flex gap-4">
          {USERS.map(user => (
            <button
              key={user.id}
              onClick={() => selectUser(user.id)}
              className="w-32 h-32 text-4xl bg-white dark:bg-slate-800 rounded-2xl shadow-lg hover:scale-105 transition-transform flex flex-col items-center justify-center"
            >
              <span className="text-5xl mb-2">{user.emoji}</span>
              <span className="text-lg font-bold">{user.name}</span>
            </button>
          ))}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-4 pb-24">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">{currentUser?.emoji}</span>
            <h1 className="text-2xl font-bold text-primary">{currentUser?.name}</h1>
          </div>
          <p className="text-sm text-slate-500">
            {isSearching ? `"${searchQuery}" 검색 결과: ${words.length}개` : `${totalCount}개 단어 · ${dueCount}개 복습 필요`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              localStorage.removeItem("selectedUser");
              setSelectedUser(null);
            }}
            className="text-2xl"
          >
            🔄
          </button>
          <Link href="/dashboard" className="text-2xl">
            📊
          </Link>
        </div>
      </header>

      {loading ? (
        <div className="text-center py-12 text-slate-500">로딩 중...</div>
      ) : allWords.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-slate-500 mb-4">아직 단어가 없어요</p>
          <Link
            href="/add"
            className="inline-block bg-primary text-white px-6 py-3 rounded-xl font-medium"
          >
            첫 단어 추가하기
          </Link>
        </div>
      ) : (
        <>
          <div className="mb-3">
            <input
              type="text"
              placeholder="단어 검색..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full p-3 border rounded-xl bg-white dark:bg-slate-800"
            />
          </div>

          <div className="mb-4 flex gap-2">
            <select
              value={learnCount}
              onChange={(e) => setLearnCount(Number(e.target.value))}
              className="p-3 border rounded-xl bg-white dark:bg-slate-800"
            >
              <option value={10}>10개</option>
              <option value={20}>20개</option>
              <option value={30}>30개</option>
              <option value={50}>50개</option>
            </select>
            <div className="flex gap-2 flex-1">
              <button
                onClick={() => setLearnMode("review")}
                className={`flex-1 py-3 rounded-xl font-medium ${
                  learnMode === "review"
                    ? "bg-primary text-white"
                    : "bg-slate-200 text-slate-700"
                }`}
              >
                복습
              </button>
              <button
                onClick={() => {
                  if (learnMode === "shuffle") {
                    setShowShuffleModal(true);
                  } else {
                    setLearnMode("shuffle");
                  }
                }}
                className={`flex-1 py-3 rounded-xl font-medium ${
                  learnMode === "shuffle"
                    ? "bg-primary text-white"
                    : "bg-slate-200 text-slate-700"
                }`}
              >
                셔플
              </button>
              <button
                onClick={() => setLearnMode("deep")}
                className={`flex-1 py-3 rounded-xl font-medium ${
                  learnMode === "deep"
                    ? "bg-purple-500 text-white"
                    : "bg-slate-200 text-slate-700"
                }`}
              >
                심화
              </button>
            </div>
            <Link
              href={learnMode === "shuffle" ? "#" : `/learn?count=${learnCount}&mode=${learnMode}`}
              onClick={(e) => {
                if (learnMode === "shuffle") {
                  e.preventDefault();
                  setShowShuffleModal(true);
                }
              }}
              className={`flex-1 py-4 rounded-xl font-bold text-lg text-center ${
                learnMode === "deep" ? "bg-purple-500 text-white" : "bg-primary text-white"
              }`}
            >
              시작 {learnMode === "review" && dueCount > 0 && `(${dueCount})`}
            </Link>
          </div>

          {showShuffleModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-sm">
                <h3 className="text-xl font-bold mb-4 text-center">셔플 모드 선택</h3>
                <div className="space-y-3">
                  <button
                    onClick={() => {
                      setShuffleSubMode("normal");
                      router.push(`/learn?count=${learnCount}&mode=shuffle&subMode=normal`);
                    }}
                    className="w-full p-4 border-4 border-blue-500 rounded-xl text-left"
                  >
                    <div className="font-bold text-blue-600">🇰🇷 영어 → 한글</div>
                    <div className="text-sm text-slate-500">영어 단어를 보고 한글 뜻 맞추기</div>
                  </button>
                  <button
                    onClick={() => {
                      setShuffleSubMode("reverse");
                      router.push(`/learn?count=${learnCount}&mode=shuffle&subMode=reverse`);
                    }}
                    className="w-full p-4 border-4 border-purple-500 rounded-xl text-left"
                  >
                    <div className="font-bold text-purple-600">🇰🇷 한글 → 영어</div>
                    <div className="text-sm text-slate-500">한글 뜻을 보고 영어 단어 맞추기</div>
                  </button>
                  <button
                    onClick={() => {
                      setShuffleSubMode("mixed");
                      router.push(`/learn?count=${learnCount}&mode=shuffle&subMode=mixed`);
                    }}
                    className="w-full p-4 border-4 border-slate-300 rounded-xl text-left"
                  >
                    <div className="font-bold text-slate-600">🔀 랜덤 섞기</div>
                    <div className="text-sm text-slate-500">영→한, 한→영 랜덤으로 섞여서 나옴</div>
                  </button>
                </div>
                <button
                  onClick={() => setShowShuffleModal(false)}
                  className="w-full mt-4 py-3 text-slate-500"
                >
                  취소
                </button>
              </div>
            </div>
          )}

          <div className="mb-4">
            <Link
              href="/add"
              className="block w-full border-2 border-dashed border-slate-300 text-slate-500 py-3 rounded-xl text-center hover:border-primary hover:text-primary transition-colors"
            >
              + 새 단어 추가
            </Link>
          </div>

          <div className="h-[calc(100vh-340px)] overflow-y-auto space-y-3">
            {words.map((word) => (
              <div
                key={word.id}
                className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-semibold text-lg">{word.word}</span>
                    {word.phonetic && (
                      <span className="text-slate-400 ml-1 text-sm">{word.phonetic}</span>
                    )}
                    <span className="text-slate-500 ml-2">{word.meaning}</span>
                    <div className="flex gap-1 mt-1">
                      {Array.from({ length: 6 }).map((_, i) => (
                        <span
                          key={i}
                          className={`text-xs ${i < word.level ? "text-primary" : "text-slate-300"}`}
                        >
                          {i < word.level ? "🟦" : "⬜"}
                        </span>
                      ))}
                    </div>
                    {word.ai_example && (
                      <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 italic">
                        {word.ai_example}
                      </p>
                    )}
                    {word.example_note && (
                      <p className="text-xs text-slate-400 mt-1">
                        📝 {word.example_note}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2 ml-4">
                    <Link
                      href={`/edit/${word.id}`}
                      className="text-primary text-sm px-3 py-1 border border-primary rounded"
                    >
                      수정
                    </Link>
                    <button
                      onClick={() => {
                        if (confirm("정말 삭제하시겠어요?")) {
                          deleteWord(word.id);
                        }
                      }}
                      className="text-danger text-sm px-3 py-1 border border-danger rounded"
                    >
                      삭제
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {hasMore && (
              <div ref={observerRef} className="py-4 text-center text-slate-500">
                더보기
              </div>
            )}
          </div>
        </>
      )}
    </main>
  );
}