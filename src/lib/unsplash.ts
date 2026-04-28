export async function searchImage(query: string): Promise<string | null> {
  try {
    const response = await fetch(
      `https://pixabay.com/api/?key=${process.env.NEXT_PUBLIC_PIXABAY_API_KEY}&q=${encodeURIComponent(query)}&image_type=photo&per_page=3&orientation=square`
    );

    if (!response.ok) {
      console.error("Pixabay API error:", response.status);
      return null;
    }

    const data = await response.json();
    if (data.hits && data.hits.length > 0) {
      const randomIndex = Math.floor(Math.random() * data.hits.length);
      return data.hits[randomIndex].webformatURL;
    }
    return null;
  } catch (error) {
    console.error("Pixabay fetch error:", error);
    return null;
  }
}