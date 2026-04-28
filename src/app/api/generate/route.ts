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
      const sentenceStyles = [
        `Create a short, memorable English sentence using the word "${word}". Use one of these styles randomly: 1) A conversation between friends 2) A social media post 3) A diary entry 4) A news headline. Keep it under 80 characters. Format: "English sentence (한글 의미)"`,
        `Make a catchy English sentence with "${word}" like you'd see on Instagram or a blog. Make it sound natural and relatable. Keep it under 80 characters. Format: "English sentence (한글 의미)"`,
        `Write a casual English sentence using "${word}" as if you're texting a friend. Include emotions or reactions. Keep it under 80 characters. Format: "English sentence (한글 의미)"`,
        `Create a vivid English sentence with "${word}" that paints a picture in your mind. Make it descriptive and memorable. Keep it under 80 characters. Format: "English sentence (한글 의미)"`,
      ];
      prompt = sentenceStyles[Math.floor(Math.random() * sentenceStyles.length)];
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