interface PhoneticResult {
  phonetic: string | null;
  audio: string | null;
}

export async function fetchPhonetic(word: string): Promise<PhoneticResult> {
  try {
    const response = await fetch(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`
    );

    if (!response.ok) {
      return { phonetic: null, audio: null };
    }

    const data = await response.json();

    if (Array.isArray(data) && data.length > 0) {
      const entry = data[0];

      let phonetic = entry.phonetic || null;

      if (!phonetic && entry.phonetics && entry.phonetics.length > 0) {
        const phoneticWithText = entry.phonetics.find((p: any) => p.text);
        if (phoneticWithText) {
          phonetic = phoneticWithText.text;
        }
      }

      let audio = null;
      if (entry.phonetics) {
        const audioEntry = entry.phonetics.find((p: any) => p.audio);
        if (audioEntry) {
          audio = audioEntry.audio;
        }
      }

      return { phonetic, audio };
    }

    return { phonetic: null, audio: null };
  } catch (error) {
    console.error("Phonetic fetch error:", error);
    return { phonetic: null, audio: null };
  }
}

export async function fetchEtymology(word: string): Promise<string | null> {
  try {
    const response = await fetch(
      `/api/etymology?word=${encodeURIComponent(word)}`
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.etymology || null;
  } catch (error) {
    console.error("Etymology fetch error:", error);
    return null;
  }
}