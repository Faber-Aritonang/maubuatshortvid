-- MauBuatShortVid — skema Supabase original v0.1
-- Jalankan di SQL Editor. Butuh ekstensi pgcrypto (biasanya sudah aktif).
-- Desain sendiri: 4 tabel + 2 RPC + 2 bucket. Bukan replika skema pihak lain.

create extension if not exists "pgcrypto";

-- ============ profiles ============
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  plan text not null default 'free' check (plan in ('free','pro')),
  credits int not null default 3 check (credits >= 0),
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

drop policy if exists "own profile read" on public.profiles;
create policy "own profile read" on public.profiles
  for select using (auth.uid() = id);
drop policy if exists "own profile update" on public.profiles;
create policy "own profile update" on public.profiles
  for update using (auth.uid() = id);

-- Trigger: buat baris profile otomatis saat signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email,'@',1)))
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============ projects ============
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null references public.profiles(id) on delete cascade,
  title text not null default 'Tanpa judul',
  payload jsonb not null default '{"version":1,"scenes":[]}',
  updated_at timestamptz not null default now()
);
alter table public.projects enable row level security;

drop policy if exists "owner all projects" on public.projects;
create policy "owner all projects" on public.projects
  for all using (auth.uid() = owner) with check (auth.uid() = owner);

-- ============ usage_events ============
create table if not exists public.usage_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('export','tts','save')),
  created_at timestamptz not null default now()
);
alter table public.usage_events enable row level security;

drop policy if exists "own usage insert" on public.usage_events;
create policy "own usage insert" on public.usage_events
  for insert with check (auth.uid() = user_id);
drop policy if exists "own usage read" on public.usage_events;
create policy "own usage read" on public.usage_events
  for select using (auth.uid() = user_id);

-- ============ activity_log ============
create table if not exists public.activity_log (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  action text not null,
  meta jsonb not null default '{}',
  created_at timestamptz not null default now()
);
alter table public.activity_log enable row level security;

drop policy if exists "own activity insert" on public.activity_log;
create policy "own activity insert" on public.activity_log
  for insert with check (auth.uid() = user_id);
drop policy if exists "own activity read" on public.activity_log;
create policy "own activity read" on public.activity_log
  for select using (auth.uid() = user_id);

-- ============ RPC: consume_credit ============
create or replace function public.consume_credit(p_kind text)
returns int language plpgsql security definer set search_path = public as $$
declare v_left int;
begin
  if p_kind not in ('export','tts','save') then
    raise exception 'kind tidak dikenal';
  end if;
  update public.profiles
     set credits = credits - 1
   where id = auth.uid() and credits > 0
  returning credits into v_left;
  if not found then
    raise exception 'Kredit habis';
  end if;
  insert into public.usage_events (user_id, kind) values (auth.uid(), p_kind);
  return v_left;
end $$;

-- ============ RPC: grant_credits (service_role only) ============
-- Panggil dari server/webhook pembayaran dengan service_role key. Jangan panggil dari browser.
create or replace function public.grant_credits(p_user uuid, p_amount int)
returns int language plpgsql security definer set search_path = public as $$
declare v_left int;
begin
  if p_amount < 1 or p_amount > 10000 then raise exception 'amount di luar batas'; end if;
  update public.profiles set credits = credits + p_amount
   where id = p_user returning credits into v_left;
  return v_left;
end $$;

-- ============ Storage buckets (jalankan manual bila via SQL tidak diizinkan) ============
insert into storage.buckets (id, name, public)
values ('project-audio','project-audio', false),
       ('project-images','project-images', false)
on conflict (id) do nothing;

drop policy if exists "own audio" on storage.objects;
create policy "own audio" on storage.objects
  for all using (bucket_id = 'project-audio' and auth.uid()::text = (storage.foldername(name))[1])
  with check (bucket_id = 'project-audio' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "own images" on storage.objects;
create policy "own images" on storage.objects
  for all using (bucket_id = 'project-images' and auth.uid()::text = (storage.foldername(name))[1])
  with check (bucket_id = 'project-images' and auth.uid()::text = (storage.foldername(name))[1]);
