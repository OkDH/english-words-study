# 나만의 영어 단어 학습 앱 - SPEC

## 1. Overview
- **Project Name**: WordMemo
- **Type**: Mobile-first SPA (PWA)
- **Core Function**: SRS-based English vocabulary learning with swipeable cards
- **Target Users**: Korean learners studying English vocabulary on-the-go

## 2. Tech Stack
| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14+ (App Router), Tailwind CSS, Framer Motion |
| Database | Supabase (PostgreSQL) |
| AI | Gemini API (free tier) - 예문 생성 |
| TTS | Web Speech API |
| Images | Unsplash API |
| Deploy | Vercel |

## 3. Database Schema

### Table: words
```sql
create table words (
  id uuid primary key default gen_random_uuid(),
  word text not null,
  meaning text not null,
  example_note text,
  ai_example text,
  level integer default 0 check (level between 0 and 5),
  next_review timestamp with time zone default now(),
  tags text[] default '{}',
  created_at timestamp with time zone default now()
);
```

**Note**: RLS disabled for anonymous usage (no auth required)

## 4. UI/UX Specification

### 4.1 Page Structure
| Route | Purpose |
|-------|---------|
| `/` | 단어 목록 + 학습 시작 |
| `/add` | 새 단어 추가 |
| `/learn` | 학습 세션 (카드 스와이프) |

### 4.2 Color Palette
| Role | Color |
|------|-------|
| Background | #F8FAFC (light), #0F172A (dark) |
| Primary | #6366F1 (Indigo) |
| Success | #22C55E (Green) |
| Danger | #EF4444 (Red) |
| Text Primary | #1E293B (light), #F1F5F9 (dark) |
| Text Secondary | #64748B |

### 4.3 Typography
- Font: Pretendard (Google Fonts) or system-ui fallback
- Headings: 24px/20px/18px bold
- Body: 16px
- Small: 14px

### 4.4 Spacing
- Base unit: 4px
- Card padding: 24px
- Button height: 56px (thumb zone optimized)
- Card size: full-width with 16px margin

## 5. Component Specification

### 5.1 WordCard (Learn Page)
```
┌─────────────────────────┐
│      Progress Bar        │ <- 4px height
├─────────────────────────┤
│                         │
│      [WORD]             │ <- 32px, centered
│                         │
│      🔊 TTS Button      │ <- auto-play on Step 1
│                         │
│   ─────────────────     │
│                         │
│   meaning (hidden)      │ <- Step 2: revealed
│   📝 user note          │
│   🖼️ ai_example         │
│                         │
├─────────────────────────┤
│  [👎 모름]    [👍 알아요] │ <- 56px buttons
└─────────────────────────┘
```

### 5.2 Card Step Logic
| Step | Trigger | Content | Action |
|------|---------|---------|--------|
| 1 | Card appears | word + TTS | Tap → Step 2 |
| 2 | Tap card | meaning + note | Swipe L → Step 3, Swipe R → Know |
| 3 | Swipe left | ai_example + Unsplash image | Next card |

### 5.3 Swipe Gesture
- Threshold: 100px
- Left swipe (모름): Red overlay, moves to Step 3
- Right swipe (알아요): Green overlay, level up

## 6. Feature Specification

### 6.1 Word CRUD (1단계)
- **Create**: Add word with meaning, optional note
- **Read**: List all words with level indicator
- **Delete**: Swipe-to-delete on list

### 6.2 TTS (2단계)
- Web Speech API `speechSynthesis.speak()`
- Language: en-US
- Auto-play on Step 1

### 6.3 SRS Algorithm (3단계)
| Level | Review Interval |
|-------|-----------------|
| 0 | Immediately |
| 1 | 1 day |
| 2 | 3 days |
| 3 | 7 days |
| 4 | 14 days |
| 5 | 30 days |

### 6.4 Gemini API (3단계)
- Trigger: When user taps "예문 생성" or swipes left on unknown word
- Prompt: "다음 영어 단어를 한국인 입장에서 이해하기 쉽게 예문 1개를 만들어줘: {word}"
- Store result in `ai_example`

## 7. Development Phases

| Phase | Deliverables |
|-------|-------------|
| 1 | Supabase 연동, 단어 CRUD 페이지 |
| 2 | 카드 스와이프 UI, TTS |
| 3 | SRS 알고리즘, Gemini API |
| 4 | 다크 모드, PWA |

## 8. File Structure
```
src/
├── app/
│   ├── layout.tsx
│   ├── page.tsx          # 단어 목록
│   ├── add/page.tsx      # 단어 추가
│   ├── learn/page.tsx    # 학습 세션
│   └── globals.css
├── components/
│   ├── WordCard.tsx
│   ├── WordList.tsx
│   ├── Header.tsx
│   └── providers.tsx
├── lib/
│   ├── supabase.ts
│   └── types.ts
```
