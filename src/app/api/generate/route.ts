import Groq from "groq-sdk";
import { NextResponse } from "next/server";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function POST(request: Request) {
  try {
    const { word, type } = await request.json();

    if (!word) {
      return NextResponse.json({ error: "Word is required" }, { status: 400 });
    }

    let prompt: string;
    let maxTokens: number;

    if (type === "passage") {
      const words = word;
      prompt = `Write a SHORT English sentence (one sentence only) using: ${words}. Use ALL the words naturally. Keep it concise. Just write the sentence, nothing else.`;
      maxTokens = 80;
    } else {
      const sentenceStyles = [
        `Write a SHORT English sentence with "${word}". One sentence only, keep it brief and natural (5-8 words). IMPORTANT: Write Korean translation only, NO Chinese characters. Format: "English sentence (한국어 의미)"`,

        `Make a short English sentence with "${word}". Keep it concise, about 5-8 words. Sound natural. IMPORTANT: Write Korean translation only, NO Chinese characters. Format: "English sentence (한국어 의미)"`,

        `Write a brief English sentence using "${word}". Just one sentence, 5-8 words. Casual tone. IMPORTANT: Write Korean translation only, NO Chinese characters. Format: "English sentence (한국어 의미)"`,

        `Create a short, memorable sentence with "${word}". One sentence, 5-8 words. IMPORTANT: Write Korean translation only, NO Chinese characters. Format: "English sentence (한국어 의미)"`,
      ];
      prompt = sentenceStyles[Math.floor(Math.random() * sentenceStyles.length)];
      maxTokens = 60;
    }

    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.3-70b-versatile",
      temperature: 0.9,
      max_tokens: maxTokens,
    });

    const text = chatCompletion.choices[0]?.message?.content?.trim() || "";

    return NextResponse.json({ text: text || null });
  } catch (error: any) {
    console.error("Groq API error:", error);
    return NextResponse.json(
      { error: "Failed to generate content" },
      { status: 500 }
    );
  }
}