import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const word = searchParams.get("word");

    if (!word) {
      return NextResponse.json({ error: "Word is required" }, { status: 400 });
    }

    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ etymology: null });
    }

    const prompt = `"${word}" 단어의 어원을 알려줘. 다음 형식으로 정확히 응답해:
[단어]: 접두사 (의미) + 어근 (의미)
"어원 의미" → 한글 의미
같은 조상을 둔 단어: 단어1 (한글 설명), 단어2 (한글 설명), 단어3 (한글 설명)

답변은 한국어로 하고, 반드시 위 형식을 지켜서 응답해.`;

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 200,
      }),
    });

    if (!response.ok) {
      console.error("Groq API error:", response.status);
      return NextResponse.json({ etymology: null });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim();

    if (!content) {
      return NextResponse.json({ etymology: null });
    }

    const etymology = content.length > 300 ? content.substring(0, 300) + "..." : content;

    return NextResponse.json({ etymology });
  } catch (error) {
    console.error("Etymology API error:", error);
    return NextResponse.json({ etymology: null });
  }
}