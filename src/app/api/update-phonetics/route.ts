import { createClient } from "@supabase/supabase-js";
import { fetchPhonetic } from "@/lib/phonetic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: Request) {
  try {
    const { data: words, error: fetchError } = await supabase
      .from("words")
      .select("id, word")
      .not("phonetic", "neq", "null");

    if (fetchError) {
      return Response.json({ error: fetchError.message }, { status: 500 });
    }

    const wordsWithoutPhonetic = await supabase
      .from("words")
      .select("id, word")
      .or("phonetic.is.null,phonetic.eq.''");

    if (wordsWithoutPhonetic.error) {
      return Response.json({ error: wordsWithoutPhonetic.error.message }, { status: 500 });
    }

    const toUpdate = wordsWithoutPhonetic.data || [];
    
    if (toUpdate.length === 0) {
      return Response.json({ message: "All words have phonetic", updated: 0 });
    }

    let updated = 0;
    let failed = 0;

    for (const word of toUpdate) {
      console.log(`Processing: ${word.word}`);
      const result = await fetchPhonetic(word.word);
      
      if (result.phonetic) {
        const { error } = await supabase
          .from("words")
          .update({ phonetic: result.phonetic })
          .eq("id", word.id);
        
        if (error) {
          console.error(`Failed to update ${word.word}:`, error);
          failed++;
        } else {
          updated++;
          console.log(`Updated ${word.word}: ${result.phonetic}`);
        }
      } else {
        failed++;
        console.log(`No phonetic found for ${word.word}`);
      }

      await new Promise(resolve => setTimeout(resolve, 500));
    }

    return Response.json({ 
      message: "Done",
      total: toUpdate.length,
      updated,
      failed 
    });
  } catch (error: any) {
    console.error("Error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}