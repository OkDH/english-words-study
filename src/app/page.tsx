"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import type { Word } from "@/lib/types";

export default function HomePage() {
  const [words, setWords] = useState<Word[]>([]);
  const [loading, setLoading] = useState(true);
  const [learnCount, setLearnCount] = useState(20);
  const [learnMode, setLearnMode] = useState<"review" | "shuffle" | "deep">("review");

  useEffect(() => {
    fetchWords();
  }, []);

  async function fetchWords() {
    const { data, error } = await supabase
      .from("words")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setWords(data);
    }
    setLoading(false);
  }

  async function deleteWord(id: string) {
    await supabase.from("words").delete().eq("id", id);
    setWords(words.filter((w) => w.id !== id));
  }

  const dueCount = words.filter(
    (w) => new Date(w.next_review) <= new Date()
  ).length;

  return (
    <main className="min-h-screen p-4 pb-24">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary">Word Study</h1>
          <p className="text-sm text-slate-500">
            {words.length}개 단어 · {dueCount}개 복습 필요
          </p>
        </div>
        <Link href="/dashboard" className="text-primary font-medium">
          📊 대시보드
        </Link>
      </header>

      {loading ? (
        <div className="text-center py-12 text-slate-500">로딩 중...</div>
      ) : words.length === 0 ? (
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

          <div className="space-y-3">
            {words.map((word) => (
              <div
                key={word.id}
                className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm flex justify-between items-center"
              >
                <div>
                  <span className="font-semibold text-lg">{word.word}</span>
                  <span className="text-slate-500 ml-2">{word.meaning}</span>
                  <div className="flex gap-1 mt-1">
                    {Array.from({ length: word.level + 1 }).map((_, i) => (
                      <span key={i} className="text-xs">⬜</span>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
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
            ))}
          </div>
        </>
      )}
    </main>
  );
}
