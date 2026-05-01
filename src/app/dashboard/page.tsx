"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import type { Word } from "@/lib/types";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { format, subDays, startOfDay, endOfDay } from "date-fns";

interface DashboardData {
  totalWords: number;
  masteredWords: number;
  currentStreak: number;
  wordsByLevel: { level: number; count: number }[];
  growthData: { date: string; count: number }[];
  heatmapData: { date: string; count: number }[];
  hardestWords: { word: Word; failCount: number }[];
  forecast: { date: string; count: number }[];
}

export default function DashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  async function fetchDashboardData() {
    const userId = localStorage.getItem("selectedUser") || "dong";

    const { data: words } = await supabase
      .from("words")
      .select("*")
      .order("created_at", { ascending: true });

    const { data: progress } = await supabase
      .from("user_word_progress")
      .select("*")
      .eq("user_id", userId);

    const { data: logs } = await supabase
      .from("learning_logs")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: true });

    if (!words) {
      setLoading(false);
      return;
    }

    const now = new Date();
    const progressMap = new Map(progress?.map(p => [p.word_id, p]) || []);

    const userWords = words.filter(w => w.user_id === userId);
    const totalWords = userWords.length;
    const masteredWords = progress?.filter(p => p.level >= 5).length || 0;

    const wordsByLevel = [0, 1, 2, 3, 4, 5].map(level => ({
      level,
      count: userWords.filter(w => (progressMap.get(w.id)?.level || 0) === level).length,
    }));

    const growthData: { date: string; count: number }[] = [];
    for (let i = 30; i >= 0; i--) {
      const date = subDays(now, i);
      const dateStr = format(date, "MM/dd");
      const countByDate = userWords.filter(w => {
        const created = new Date(w.created_at);
        return format(created, "yyyy-MM-dd") === format(date, "yyyy-MM-dd");
      }).length;
      growthData.push({ date: dateStr, count: countByDate });
    }

    const heatmapData: { date: string; count: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const date = subDays(now, i);
      const start = startOfDay(date);
      const end = endOfDay(date);
      const count = logs?.filter(log => {
        const logDate = new Date(log.created_at);
        return logDate >= start && logDate <= end;
      }).length || 0;
      heatmapData.push({
        date: format(date, "MM/dd"),
        count,
      });
    }

    const forgotCounts: Record<string, number> = {};
    logs?.filter(log => log.action === "forgot").forEach(log => {
      forgotCounts[log.word_id] = (forgotCounts[log.word_id] || 0) + 1;
    });

    const hardestWords = userWords
      .filter(w => forgotCounts[w.id] > 0)
      .sort((a, b) => (forgotCounts[b.id] || 0) - (forgotCounts[a.id] || 0))
      .slice(0, 10)
      .map(w => ({ word: w, failCount: forgotCounts[w.id] || 0 }));

    const forecast: { date: string; count: number }[] = [];
    for (let i = 0; i < 7; i++) {
      const date = subDays(now, -i);
      const start = startOfDay(date);
      const end = endOfDay(date);
      const count = progress?.filter(p => {
        const nextReview = new Date(p.next_review);
        return nextReview >= start && nextReview <= end;
      }).length || 0;
      const dateLabel = i === 0 ? "Today" : i === 1 ? "Tomorrow" : format(date, "EEE");
      forecast.push({
        date: dateLabel,
        count,
      });
    }

    const streak = calculateStreak(logs || []);

    setData({
      totalWords,
      masteredWords,
      currentStreak: streak,
      wordsByLevel,
      growthData,
      heatmapData,
      hardestWords,
      forecast,
    });
    setLoading(false);
  }

  function calculateStreak(logs: any[]): number {
    let streak = 0;
    const today = startOfDay(new Date());

    for (let i = 0; i < 365; i++) {
      const checkDate = subDays(today, i);
      const start = startOfDay(checkDate);
      const end = endOfDay(checkDate);

      const hasActivity = logs.some(log => {
        const logDate = new Date(log.created_at);
        return logDate >= start && logDate <= end;
      });

      if (hasActivity) {
        streak++;
      } else if (i > 0) {
        break;
      }
    }
    return streak;
  }

  const COLORS = ["#EF4444", "#F97316", "#EAB308", "#22C55E", "#3B82F6", "#8B5CF6"];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        로딩 중...
      </div>
    );
  }

  return (
    <main className="min-h-screen p-4 pb-24">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">{localStorage.getItem("selectedUser") === "suyeon" ? "👩" : "👨"}</span>
            <h1 className="text-2xl font-bold text-primary">
              {localStorage.getItem("selectedUser") === "suyeon" ? "수연" : "동현"} Dashboard
            </h1>
          </div>
        </div>
        <button
          onClick={() => router.push("/")}
          className="text-primary font-medium"
        >
          ← 홈
        </button>
      </header>

      {data && (
        <>
          <div className="grid grid-cols-4 gap-3 mb-6">
            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl text-center shadow-sm">
              <div className="text-2xl font-bold text-primary">{data.totalWords}</div>
              <div className="text-xs text-slate-500">전체 단어</div>
            </div>
            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl text-center shadow-sm">
              <div className="text-2xl font-bold text-blue-500">
                {data.totalWords > 0 ? data.totalWords - data.wordsByLevel[0].count : 0}
              </div>
              <div className="text-xs text-slate-500">학습한 단어</div>
            </div>
            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl text-center shadow-sm">
              <div className="text-2xl font-bold text-green-500">{data.masteredWords}</div>
              <div className="text-xs text-slate-500">마스터 (L5)</div>
            </div>
            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl text-center shadow-sm">
              <div className="text-2xl font-bold text-orange-500">🔥 {data.currentStreak}</div>
              <div className="text-xs text-slate-500">연속 일자</div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm mb-6">
            <h2 className="text-lg font-bold">📈 일별 추가 단어</h2>
            <p className="text-xs text-slate-500 mb-3">매일 새로 추가한 단어 수</p>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.growthData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="date" fontSize={10} />
                  <YAxis fontSize={10} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="#6366F1"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm mb-6">
            <h2 className="text-lg font-bold">📅 향후 7일 복습 예측</h2>
            <p className="text-xs text-slate-500 mb-3">곧 복습할 단어 수</p>
            <div className="grid grid-cols-7 gap-2">
              {data.forecast.map((item, i) => (
                <div
                  key={i}
                  className="text-center p-2 rounded-lg bg-slate-100 dark:bg-slate-700"
                >
                  <div className="text-xs text-slate-500 mb-1">{item.date}</div>
                  <div className="font-bold">{item.count}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm mb-6">
            <h2 className="text-lg font-bold">🔥 학습 히트맵 (최근 14일)</h2>
            <p className="text-xs text-slate-500 mb-3">하루 동안 학습한 단어 수</p>
            <div className="grid grid-cols-7 gap-2">
              {data.heatmapData.map((item, i) => (
                <div
                  key={i}
                  className="aspect-square rounded-lg flex items-center justify-center text-xs"
                  style={{
                    backgroundColor: item.count > 0
                      ? `rgba(99, 102, 241, ${Math.min(item.count / 10, 1)})`
                      : "#f1f5f9",
                  }}
                >
                  {item.count}
                </div>
              ))}
            </div>
          </div>

          {data.hardestWords.length > 0 && (
            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm">
              <h2 className="text-lg font-bold">😥 실패한 단어 Top 10</h2>
              <p className="text-xs text-slate-500 mb-3">실패 횟수가 많은 단어</p>
              <div className="space-y-2">
                {data.hardestWords.map((item, i) => (
                  <div
                    key={item.word.id}
                    className="flex justify-between items-center p-2 bg-slate-100 dark:bg-slate-700 rounded-lg"
                  >
                    <div>
                      <span className="font-bold">{i + 1}.</span>
                      <span className="ml-2 font-semibold">{item.word.word}</span>
                      <span className="ml-2 text-slate-500">{item.word.meaning}</span>
                    </div>
                    <div className="text-danger text-sm">
                      {item.failCount}회 실패
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6">
            <Link
              href="/"
              className="block w-full bg-primary text-white py-4 rounded-xl font-bold text-lg text-center"
            >
              학습 시작하기
            </Link>
          </div>
        </>
      )}
    </main>
  );
}