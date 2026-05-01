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

**절대 준수 사항:**
- "From", "dum", "ofs" 등 단독으로 떨어진 불완전한 데이터 출력 금지
- 억지로 어원을 지어내지 않기
- 지정된 JSON 스키마 외에는 절대 출력하지 않기

**출력 형식 (아래를 반드시 준수):**
\`\`\`
{
  "word": "단어",
  "breakdown": "어근1 (의미) + 어근2 (의미)",
  "origin": "어원 출처 (예: 라틴어, 고대 영어 등)",
  "meaning": "어원이 의미로 이어지는 한줄 설명",
  "related_words": ["관련단어1 (关联설명)", "관련단어2 (关联설명)", "관련단어3 (关联설명)"]
}
\`\`\`

**어원 불분명시:**
\`\`\`
{
  "word": "단어",
  "breakdown": "불분명",
  "origin": "유래가 불분명함",
  "meaning": "기억하기: 연상 팁을 한 줄로",
  "related_words": []
}
\`\`\`

한국어로 응답하고, 반드시 유효한 JSON만 반환하세요.`;

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

    let etymology = content;

    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    const jsonStr = jsonMatch ? jsonMatch[1].trim() : content;

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
      etymology = content.replace(/```(?:json)?\s*/g, "").replace(/```/g, "").trim();
    }

    etymology = etymology.length > 300 ? etymology.substring(0, 300) + "..." : etymology;

    return NextResponse.json({ etymology });
  } catch (error) {
    console.error("Etymology API error:", error);
    return NextResponse.json({ etymology: null });
  }
}