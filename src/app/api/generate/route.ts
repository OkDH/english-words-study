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
      prompt = `Write a short English paragraph (2-3 sentences) using these words: ${words}. Make it natural, easy to understand, and make sure to use ALL the words provided. Just write the paragraph, nothing else.`;
      maxTokens = 150;
    } else {
      prompt = `Create a short, natural English sentence using the word "${word}". The sentence should be memorable and personal. Keep it under 80 characters. Format: "English sentence (한글 의미)" - so the Korean meaning goes in parentheses at the end. Only respond with the sentence, nothing else.`;
      maxTokens = 80;
    }

    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.3-70b-versatile",
      temperature: 0.8,
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