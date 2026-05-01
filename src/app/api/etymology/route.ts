import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const word = searchParams.get("word");

    if (!word) {
      return NextResponse.json({ error: "Word is required" }, { status: 400 });
    }

    const response = await fetch(
      `https://en.wiktionary.org/api/rest_v1/page/summary/${encodeURIComponent(word.toLowerCase())}`
    );

    if (!response.ok) {
      return NextResponse.json({ etymology: null });
    }

    const data = await response.json();

    let etymology = null;

    if (data.extract) {
      const extract = data.extract;
      const lowerExtract = extract.toLowerCase();

      const etymologyIndex = lowerExtract.indexOf("etymology");

      if (etymologyIndex !== -1) {
        let etymologyText = extract.substring(etymologyIndex);
        const nextSectionIndex = etymologyText.indexOf("\n\n");
        if (nextSectionIndex !== -1 && nextSectionIndex < 1000) {
          etymologyText = etymologyText.substring(0, nextSectionIndex);
        }
        etymology = etymologyText.trim();
      } else if (extract.length > 20 && extract.length < 800) {
        etymology = extract;
      }
    }

    return NextResponse.json({ etymology });
  } catch (error) {
    console.error("Etymology API error:", error);
    return NextResponse.json({ etymology: null });
  }
}