-- Learning_logs 테이블 생성
create table learning_logs (
  id uuid primary key default gen_random_uuid(),
  word_id uuid not null,
  word_text text not null,
  action text not null check (action in ('learned', 'forgot')),
  created_at timestamp with time zone default now()
);

-- 익명 접근 허용 (RLS 비활성화)
alter table learning_logs enable row level security;
drop policy if exists "Allow anonymous access" on learning_logs;
create policy "Allow anonymous access" on learning_logs for all using (true) with check (true);