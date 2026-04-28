"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { Word } from "@/lib/types";

export default function EditPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [word, setWord] = useState("");
  const [meaning, setMeaning] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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
    }
    setLoading(false);
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