import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const word = searchParams.get("word");

    if (!word) {
      return NextResponse.json({ error: "Word is required" }, { status: 400 });
    }

    const response = await fetch(
      `https://en.wiktionary.org/w/api.php?action=parse&page=${encodeURIComponent(word.toLowerCase())}&prop=wikitext&format=json&origin=*`
    );

    if (!response.ok) {
      return NextResponse.json({ etymology: null });
    }

    const data = await response.json();

    if (!data.parse || !data.parse.wikitext) {
      return NextResponse.json({ etymology: null });
    }

    const wikitext = data.parse.wikitext["*"];

    const etymologyMatch = wikitext.match(/==+\s*Etymology\s*==+\s*\n([\s\S]*?)(?=\n==|$)/i);

    if (!etymologyMatch) {
      return NextResponse.json({ etymology: null });
    }

    let etymology = etymologyMatch[1];

    etymology = etymology
      .replace(/<ref[^>]*>[\s\S]*?<\/ref>/gi, "")
      .replace(/<[^>]+>/g, "")
      .replace(/\n+/g, " ")
      .trim();

    const templates: [RegExp, (...args: string[]) => string][] = [
      [/^\{\{inh\|([^|]+)\|([^|]+)\|t=([^}]+)\}\}/, (_, lang, word, meaning) => `From ${word} (${meaning})`],
      [/^\{\{inh\|([^|]+)\|([^|]+)\|([^}]+)\}\}/, (_, lang, word, extra) => `From ${word}`],
      [/^\{\{etymon\|([^|]+)\|([^|]+)\|t=([^}]+)\}\}/, (_, lang, word, meaning) => `From ${word} (${meaning})`],
      [/^\{\{m\|([^|]+)\|([^|]+)\|t=([^}]+)\}\}/, (_, lang, word, meaning) => word],
      [/^\{\{cog\|([^|]+)\|([^|]+)\|t=([^}]+)\}\}/, (_, lang, word, meaning) => `${word} (${meaning})`],
      [/^\{\{af\|([^|]+)\|([^|]+)\|t2=([^}]+)\}\}/, (_, prefix, base, meaning) => `${prefix}-${base}`],
      [/^\{\{gl\|([^|]+)\}\}/, (_, text) => text],
      [/^\{\{semantic loan\|([^|]+)\|([^|]+)\|[^}]+\}\}/, () => ""],
      [/^\{\{[^}]+\}\}/, () => ""],
    ];

    for (const [regex, replacement] of templates) {
      etymology = etymology.replace(regex, replacement as any);
    }

    etymology = etymology.replace(/\{\{[^}]*\}\}/g, "");

    etymology = etymology
      .replace(/\[\[([^|\]]*\|)?([^\]]*)\]\]/g, "$2")
      .replace(/''+/g, "")
      .replace(/\s+/g, " ")
      .trim();

    if (etymology.length > 20) {
      return NextResponse.json({ etymology: etymology.substring(0, 500) + (etymology.length > 500 ? "..." : "") });
    }

    return NextResponse.json({ etymology: null });
  } catch (error) {
    console.error("Etymology API error:", error);
    return NextResponse.json({ etymology: null });
  }
}