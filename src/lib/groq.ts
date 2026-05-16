const exampleCache = new Map<string, string>();
const passageCache = new Map<string, string>();

async function callGenerateAPI(word: string, type: "example" | "passage", meaning?: string): Promise<string | null> {
  try {
    const response = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ word, type, meaning }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    return data.text || null;
  } catch (error) {
    console.error("Generate API error:", error);
    return null;
  }
}

export async function generateExample(word: string, meaning?: string, forceRefresh = false): Promise<string | null> {
  const cacheKey = meaning ? `${word}|${meaning}` : word;
  if (!forceRefresh && exampleCache.has(cacheKey)) {
    return exampleCache.get(cacheKey) || null;
  }

  const text = await callGenerateAPI(word, "example", meaning);

  if (text && text.length > 0) {
    exampleCache.set(cacheKey, text);
    return text;
  }
  return null;
}

export async function generateExamples(word: string, meaning?: string, count: number = 3): Promise<string[]> {
  const promises = Array.from({ length: count }, () =>
    generateExample(word, meaning, true)
  );
  const results = await Promise.all(promises);
  return results.filter((r): r is string => r !== null);
}

export async function generatePassage(words: string[]): Promise<string | null> {
  if (words.length < 3) return null;

  const cacheKey = words.slice(0, 5).join("|");
  if (passageCache.has(cacheKey)) {
    return passageCache.get(cacheKey) || null;
  }

  const text = await callGenerateAPI(words.join(","), "passage");

  if (text && text.length > 0) {
    passageCache.set(cacheKey, text);
    return text;
  }
  return null;
}