-- Words 테이블 생성
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

-- 익명 접근 허용 (RLS 비활성화)
alter table words enable row level security;
drop policy if exists "Users can CRUD own words" on words;
create policy "Allow anonymous access" on words for all using (true) with check (true);
