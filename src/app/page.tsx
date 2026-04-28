"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import type { Word } from "@/lib/types";

const PAGE_SIZE = 30;

export default function HomePage() {
  const [words, setWords] = useState<Word[]>([]);
  const [allWords, setAllWords] = useState<Word[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [learnCount, setLearnCount] = useState(20);
  const [learnMode, setLearnMode] = useState<"review" | "shuffle" | "deep">("review");
  const [totalCount, setTotalCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const observerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchAllWords();
  }, []);

  const fetchAllWords = async () => {
    setLoading(true);
    const { data, count } = await supabase
      .from("words")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false });

    if (data) {
      setAllWords(data);
      setWords(data.slice(0, PAGE_SIZE));
      setTotalCount(count || 0);
      setHasMore(data.length > PAGE_SIZE);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!observerRef.current || !hasMore || loadingMore || isSearching) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !isSearching) {
          const nextPage = Math.floor(words.length / PAGE_SIZE);
          const nextWords = allWords.slice(0, (nextPage + 1) * PAGE_SIZE);
          setWords(nextWords);
          setHasMore(nextWords.length < allWords.length);
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(observerRef.current);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, words.length, allWords.length, isSearching]);

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

  return (
    <main className="min-h-screen p-4 pb-24">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary">Word Study</h1>
          <p className="text-sm text-slate-500">
            {isSearching ? `"${searchQuery}" 검색 결과: ${words.length}개` : `${totalCount}개 단어 · ${dueCount}개 복습 필요`}
          </p>
        </div>
        <Link href="/dashboard" className="text-primary font-medium">
          📊 대시보드
        </Link>
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
                onClick={() => setLearnMode("shuffle")}
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
              href={`/learn?count=${learnCount}&mode=${learnMode}`}
              className={`flex-1 py-4 rounded-xl font-bold text-lg text-center ${
                learnMode === "deep" ? "bg-purple-500 text-white" : "bg-primary text-white"
              }`}
            >
              학습 시작하기 {learnMode === "review" && dueCount > 0 && `(${dueCount})`}
            </Link>
          </div>

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
                {loadingMore ? "더 불러오는 중..." : "스크롤하여 더보기"}
              </div>
            )}
          </div>
        </>
      )}
    </main>
  );
}