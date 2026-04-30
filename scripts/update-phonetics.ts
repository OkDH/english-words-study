import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import { fetchPhonetic } from "../src/lib/phonetic";

console.log("SUPABASE_URL:", process.env.NEXT_PUBLIC_SUPABASE_URL);
console.log("SUPABASE_KEY:", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.slice(0, 10) + "...");

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function main() {
  console.log("Starting phonetic update...");

  const { data, error } = await supabase
    .from("words")
    .select("id, word")
    .or("phonetic.is.null,phonetic.eq.''");

  if (error) {
    console.error("Error fetching words:", error);
    process.exit(1);
  }

  const wordsWithoutPhonetic = data || [];
  console.log(`Found ${wordsWithoutPhonetic.length} words without phonetic`);

  if (wordsWithoutPhonetic.length === 0) {
    console.log("All words have phonetic!");
    process.exit(0);
  }

  let updated = 0;
  let failed = 0;

  for (const word of wordsWithoutPhonetic) {
    process.stdout.write(`Processing: ${word.word}... `);
    const result = await fetchPhonetic(word.word);

    if (result.phonetic) {
      const { error } = await supabase
        .from("words")
        .update({ phonetic: result.phonetic })
        .eq("id", word.id);

      if (error) {
        console.log(`FAILED: ${error.message}`);
        failed++;
      } else {
        console.log(`OK: ${result.phonetic}`);
        updated++;
      }
    } else {
      console.log("No phonetic found");
      failed++;
    }

    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log(`\nDone! updated: ${updated}, failed: ${failed}`);
}

main();