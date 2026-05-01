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
      console.error("GROQ_API_KEY is not set");
      return NextResponse.json({ etymology: null });
    }

    const prompt = `당신은 영어 어원 전문가입니다. "${word}" 단어의 어원을 Wiktionary의 학술적 자료를 참고하여 알려주세요.

**중요: 반드시 순수 JSON만 반환하세요. 어떤 텍스트도 앞에 붙이지 마세요.**

**출력 형식 (반드시 이 JSON 스키마만 사용):**
{"word": "단어", "breakdown": "어근1 (의미) + 어근2 (의미)", "origin": "어원 출처", "meaning": "어원이 의미로 이어지는 한줄 설명", "related_words": ["관련단어1 (한글설명)", "관련단어2 (한글설명)", "관련단어3 (한글설명)"]}

**어원 불분명시:**
{"word": "단어", "breakdown": "불분명", "origin": "유래가 불분명함", "meaning": "기억하기: 연상팁", "related_words": []}

절대 "단어의 어원을...", "Wiktionary...", 설명文章 등을 앞에 붙이지 마세요. 오직 유효한 JSON만 반환하세요.`;

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
        max_tokens: 400,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Groq API error:", response.status, errorText);
      return NextResponse.json({ etymology: null });
    }

    const data = await response.json();
    console.log("Groq response:", data);
    const content = data.choices?.[0]?.message?.content?.trim();

    if (!content) {
      return NextResponse.json({ etymology: null });
    }

    let etymology = content.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();

    const firstBrace = etymology.indexOf("{");
    const lastBrace = etymology.lastIndexOf("}");

    if (firstBrace !== -1 && lastBrace !== -1) {
      const jsonStr = etymology.substring(firstBrace, lastBrace + 1);

      try {
        const parsed = JSON.parse(jsonStr);
        if (parsed.word && parsed.breakdown) {
          let formatted = `${parsed.word}: ${parsed.breakdown}\n`;
          if (parsed.origin && parsed.origin !== "유래가 불분명함") {
            formatted += `"${parsed.origin}" → ${parsed.meaning}\n`;
          } else {
            formatted += `${parsed.meaning}\n`;
          }
          if (parsed.related_words && parsed.related_words.length > 0) {
            formatted += `같은 조상: ${parsed.related_words.join(", ")}`;
          }
          etymology = formatted;
        }
      } catch (e) {
        console.error("JSON parse error:", e);
      }
    }

    etymology = etymology.length > 300 ? etymology.substring(0, 300) + "..." : etymology;

    return NextResponse.json({ etymology });
  } catch (error) {
    console.error("Etymology API error:", error);
    return NextResponse.json({ etymology: null });
  }
}