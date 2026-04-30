"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { generateExample } from "@/lib/groq";
import type { Word } from "@/lib/types";

export default function EditPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [word, setWord] = useState("");
  const [meaning, setMeaning] = useState("");
  const [note, setNote] = useState("");
  const [aiExample, setAiExample] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  useEffect(() => {
    fetchWord();
  }, [id]);

  async function fetchWord() {
    const { data } = await supabase
      .from("words")
      .select("*")
      .eq("id", id)
      .single();

    if (data) {
      setWord(data.word);
      setMeaning(data.meaning);
      setNote(data.example_note || "");
      setAiExample(data.ai_example || "");
    }
    setLoading(false);
  }

  async function handleRegenerate() {
    if (!word.trim()) return;
    setRegenerating(true);
    const example = await generateExample(word.trim(), true);
    if (example) {
      setAiExample(example);
    }
    setRegenerating(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!word.trim() || !meaning.trim()) return;

    setSaving(true);

    const { error } = await supabase
      .from("words")
      .update({
        word: word.trim(),
        meaning: meaning.trim(),
        example_note: note.trim() || null,
        ai_example: aiExample.trim() || null,
      })
      .eq("id", id);

    if (!error) {
      router.push("/");
    }
    setSaving(false);
  }

  async function handleDelete() {
    if (!confirm("정말 삭제하시겠어요?")) return;

    await supabase.from("words").delete().eq("id", id);
    router.push("/");
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        로딩 중...
      </div>
    );
  }

  return (
    <main className="min-h-screen p-4">
      <header className="mb-6 flex items-center gap-4">
        <button onClick={() => router.push("/")} className="text-primary font-medium">
          ← 홈
        </button>
        <h1 className="text-2xl font-bold">단어 수정</h1>
      </header>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">영어 단어</label>
          <input
            type="text"
            value={word}
            onChange={(e) => setWord(e.target.value)}
            className="w-full p-3 border rounded-xl text-lg"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">뜻</label>
          <input
            type="text"
            value={meaning}
            onChange={(e) => setMeaning(e.target.value)}
            className="w-full p-3 border rounded-xl text-lg"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">메모</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            className="w-full p-3 border rounded-xl text-lg resize-none"
          />
        </div>

        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="block text-sm font-medium">AI 예문</label>
            <button
              type="button"
              onClick={handleRegenerate}
              disabled={regenerating || !word.trim()}
              className="text-sm text-primary disabled:opacity-50"
            >
              {regenerating ? "생성 중..." : "🔄 다시 생성"}
            </button>
          </div>
          <textarea
            value={aiExample}
            onChange={(e) => setAiExample(e.target.value)}
            rows={2}
            placeholder="AI가 생성한 예문입니다. 직접 수정할 수 있어요."
            className="w-full p-3 border rounded-xl text-base resize-none"
          />
        </div>

        <button
          type="submit"
          disabled={saving || !word.trim() || !meaning.trim()}
          className="w-full bg-primary text-white py-4 rounded-xl font-bold text-lg disabled:opacity-50"
        >
          {saving ? "저장 중..." : "저장하기"}
        </button>

        <button
          type="button"
          onClick={handleDelete}
          className="w-full bg-danger text-white py-3 rounded-xl font-medium"
        >
          삭제하기
        </button>
      </form>
    </main>
  );
}