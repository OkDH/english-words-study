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
      const passageStyles = [
        `Write a natural English paragraph (2-3 sentences) naturally incorporating these words: ${words}. Use ALL the words. Vary sentence structure - mix short and long sentences, use transitions like However, Therefore, Meanwhile, Suddenly. Make it feel like a real story or article, not a vocabulary exercise. Just write the paragraph, nothing else.`,
        `Create an engaging mini-story or scene using these words: ${words}. Write 2-3 sentences that feel cinematic or vivid. Use dialogue or descriptive details. Include all the words naturally. Just write the paragraph, nothing else.`,
        `Write an interesting English paragraph with these words: ${words}. Make it feel like a blog post or personal story. Use first person perspective. Include all words. Just write the paragraph, nothing else.`,
      ];
      prompt = passageStyles[Math.floor(Math.random() * passageStyles.length)];
      maxTokens = 200;
    } else {
      const sentenceStyles = [
        // Different sentence structures and contexts
        `Create a natural English sentence using "${word}".
        Requirements:
        - Use a DIFFERENT sentence structure each time (vary subject, verb order, length)
        - Mix these patterns: question, exclamation, statement, negative, conditional
        - If word is 6+ letters, make sentence at least 10 words
        - Avoid starting with "I" or "You" - try: The [noun]..., When..., [Adv]..., Even though...
        Format: "English sentence (한글 의미)"`,

        `Write a vivid, memorable English sentence with "${word}".
        Requirements:
        - Create imagery or a story-like quality
        - Use sensory details (see, hear, feel, smell, taste) or emotions
        - Vary your sentence opener - not just "I..." or "The..."
        - If word has 6+ syllables/letters, use 12+ words total
        - Try: Suddenly..., I realized..., Without..., Despite..., Every time...
        Format: "English sentence (한글 의미)"`,

        `Make a catchy, scroll-stopping English sentence with "${word}".
        Requirements:
        - Sound like something you'd read in a magazine headline, blog, or social media
        - Use power words: amazing, absolutely, surprisingly, completely, totally
        - Vary structure - try starting with an adverb or emotion: Surprisingly..., Honestly..., Totally...
        - At least 8 words if word is long (6+ letters)
        Format: "English sentence (한글 의미)"`,

        `Write a conversational English sentence using "${word}" as if talking to a close friend.
        Requirements:
        - Casual, natural tone with contractions (don't, I'm, it's)
        - Include reactions or emotions: wow, honestly, literally, omg, seriously
        - Mix up the structure - start with feelings, observations, or questions
        - Try: Honestly, I..., Wait, did you..., You know what..., Have you ever...
        Format: "English sentence (한글 의미)"`,
      ];
      prompt = sentenceStyles[Math.floor(Math.random() * sentenceStyles.length)];
      maxTokens = 150; // Allow for longer, more varied sentences
    }

    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.3-70b-versatile",
      temperature: 1.0, // Higher temperature for more creative variety
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