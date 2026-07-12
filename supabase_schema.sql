-- Run this in Supabase SQL Editor to enable cloud session storage.
-- https://supabase.com/dashboard

create table if not exists public.sessions (
  id bigint generated always as identity primary key,
  timestamp text not null,
  sport text,
  level text,
  position text,
  composure_score float,
  decision_velocity float,
  tactical_integrity float,
  rounds int,
  created_at timestamptz default now()
);

alter table public.sessions enable row level security;

create policy "Allow anonymous insert"
  on public.sessions for insert
  to anon with check (true);

create policy "Allow anonymous select"
  on public.sessions for select
  to anon using (true);
