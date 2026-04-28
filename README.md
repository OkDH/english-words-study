# Word Study

AI-powered English vocabulary learning app with Spaced Repetition System (SRS).

## Features

- **3 Learning Modes**
  - **Review**: SRS-based review with adaptive intervals
  - **Shuffle**: Random word practice
  - **Deep**: AI-generated passages using learned words

- **AI Integration**
  - Groq (Llama 3.3) for example sentences and passage generation
  - Pixabay for hint images

- **SRS Levels**
  - Level 0: Immediate review
  - Level 1: 10 minutes
  - Level 2: 1 day
  - Level 3: 3 days
  - Level 4: 7 days
  - Level 5: 14 days (mastered)

- **Dashboard**
  - Learning streak tracking
  - Growth chart
  - Heatmap calendar
  - Level distribution
  - Review forecast

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Database**: Supabase (PostgreSQL)
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **AI**: Groq (Llama 3.3-70b-versatile)
- **Image Search**: Pixabay

## Getting Started

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local

# Add your API keys to .env.local:
# - GROQ_API_KEY (from console.groq.com)
# - NEXT_PUBLIC_SUPABASE_URL
# - NEXT_PUBLIC_SUPABASE_ANON_KEY
# - NEXT_PUBLIC_PIXABAY_API_KEY

# Run development server
npm run dev
```

## Database Setup

Run the SQL migrations in `supabase/` to create the required tables:

```sql
-- words table (if not exists in Supabase)
-- learning_logs table
```

## Environment Variables

```
GROQ_API_KEY=your_groq_api_key
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_PIXABAY_API_KEY=your_pixabay_key
```

## License

MIT