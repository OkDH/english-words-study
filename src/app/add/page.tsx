"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { generateExample } from "@/lib/groq";

export default function AddPage() {
  const router = useRouter();
  const [word, setWord] = useState("");
  const [meaning, setMeaning] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [duplicateError, setDuplicateError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!word.trim() || !meaning.trim()) return;

    setLoading(true);
    setDuplicateError("");

    const { data: existing } = await supabase
      .from("words")
      .select("id")
      .ilike("word", word.trim())
      .single();

    if (existing) {
      setDuplicateError("이미 존재하는 단어입니다");
      setLoading(false);
      return;
    }

    const [aiExample] = await Promise.all([
      generateExample(word.trim()),
    ]);

    const { error } = await supabase.from("words").insert({
      word: word.trim(),
      meaning: meaning.trim(),
      example_note: note.trim() || null,
      ai_example: aiExample,
      next_review: new Date().toISOString(),
      level: 0,
    });

    if (!error) {
      router.push("/");
    }
    setLoading(false);
  }

  return (
    <main className="min-h-screen p-4">
      <header className="mb-6 flex items-center gap-4">
        <button onClick={() => router.push("/")} className="text-2xl">←</button>
        <h1 className="text-2xl font-bold">새 단어 추가</h1>
      </header>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">영어 단어</label>
          <input
            type="text"
            value={word}
            onChange={(e) => setWord(e.target.value)}
            placeholder="e.g. ubiquitous"
            className="w-full p-3 border rounded-xl text-lg"
            autoFocus
          />
          {duplicateError && (
            <p className="text-danger text-sm mt-1">{duplicateError}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">뜻</label>
          <input
            type="text"
            value={meaning}
            onChange={(e) => setMeaning(e.target.value)}
            placeholder="e.g. 어디에나 있는, 흔한"
            className="w-full p-3 border rounded-xl text-lg"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            메모 (선택)
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="어떤 상황에서 외웠는지, 연상 방법 등..."
            rows={3}
            className="w-full p-3 border rounded-xl text-lg resize-none"
          />
        </div>

        <button
          type="submit"
          disabled={loading || !word.trim() || !meaning.trim()}
          className="w-full bg-primary text-white py-4 rounded-xl font-bold text-lg disabled:opacity-50"
        >
          {loading ? "저장 중..." : "저장하기"}
        </button>
      </form>
    </main>
  );
}
