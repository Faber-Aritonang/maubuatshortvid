-- MauBuatShortVid — skema Supabase extended (v0.4+)
-- Berdasarkan pola struktur backend Satset Motion (tanpa menyalin data/nama kolom khusus).
-- Semua tabel RLS ketat, service_role hanya untuk RPC admin.
-- Jalankan SETELAH schema.sql v0.1.

create extension if not exists "pgcrypto";

-- ============ plans (paket langganan) ============
create table if not exists public.plans (
  id text primary key,                 -- e.g., 'free', 'pro', 'creator', 'agency'
  name text not null,
  price_monthly int not null default 0, -- dalam satuan terkecil (IDR * 100), 0 = gratis
  price_yearly int not null default 0,
  features jsonb not null default '[]', -- daftar fitur string
  limits jsonb not null default '{}',   -- {"exports_per_month": 10, "tts_chars": 50000, "projects": 50, "scenes_per_project": 6}
  sort int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.plans enable row level security;

-- Public read untuk halaman pricing
drop policy if exists "public read active plans" on public.plans;
create policy "public read active plans" on public.plans
  for select using (active = true);

-- Admin full access via service_role (RLS bypass) — tidak perlu policy eksplisit

-- Seed data (hapus/ubah saat migrasi produksi)
insert into public.plans (id, name, price_monthly, price_yearly, features, limits, sort) values
('free',   'Gratis',     0,       0,        '["3 project", "6 scene/project", "Export WebM", "TTS browser"]'::jsonb, '{"exports_per_month": 3, "tts_chars": 0, "projects": 3, "scenes_per_project": 6}'::jsonb, 1),
('pro',    'Pro',        7900000, 79000000, '["Project tak terbatas", "Scene tak terbatas", "Export MP4", "TTS server (Gemini)", "Template premium", "Tanpa watermark"]'::jsonb, '{"exports_per_month": 100, "tts_chars": 200000, "projects": -1, "scenes_per_project": -1}'::jsonb, 2),
('creator','Creator',   19900000,199000000,'["Semua Pro", "Affiliate dashboard", "Prioritas render", "Custom font", "Analytics"]'::jsonb, '{"exports_per_month": 500, "tts_chars": 1000000, "projects": -1, "scenes_per_project": -1}'::jsonb, 3),
('agency', 'Agency',    49900000,499000000,'["Semua Creator", "Multi-user", "White-label", "API access", "SLA"]'::jsonb, '{"exports_per_month": 2000, "tts_chars": 5000000, "projects": -1, "scenes_per_project": -1}'::jsonb, 4)
on conflict (id) do update set
  name = excluded.name,
  price_monthly = excluded.price_monthly,
  price_yearly = excluded.price_yearly,
  features = excluded.features,
  limits = excluded.limits,
  sort = excluded.sort,
  updated_at = now();

-- ============ profiles extended (tambah kolom ke profiles existing) ============
-- Migrasi: tambahkan kolom ke tabel profiles yang sudah ada
alter table public.profiles
  add column if not exists plan_id text not null default 'free' references public.plans(id),
  add column if not exists expires_at timestamptz,
  add column if not exists features jsonb not null default '{}',
  add column if not exists styles jsonb not null default '[]',
  add column if not exists limits jsonb not null default '{}',
  add column if not exists notes text,
  add column if not exists referral_code text unique,
  add column if not exists referred_by text references public.profiles(referral_code),
  add column if not exists avatar_url text,
  add column if not exists last_seen_at timestamptz;

-- Index untuk lookup referral
create index if not exists idx_profiles_referral_code on public.profiles(referral_code);
create index if not exists idx_profiles_referred_by on public.profiles(referred_by);

-- ============ gemini_keys (kunci API user) ============
create table if not exists public.gemini_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  key_name text not null,              -- label user, e.g. "kunci utama"
  key_hash text not null,              -- hash SHA-256 dari kunci (tidak simpan plaintext)
  key_preview text not null,           -- 8 char terakhir untuk identifikasi
  is_active boolean not null default true,
  usage_count int not null default 0,
  last_used_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.gemini_keys enable row level security;

drop policy if exists "own gemini keys" on public.gemini_keys;
create policy "own gemini keys" on public.gemini_keys
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============ user_preferences (preferensi per user) ============
create table if not exists public.user_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  data jsonb not null default '{}',
  updated_at timestamptz not null default now()
);
alter table public.user_preferences enable row level security;

drop policy if exists "own preferences" on public.user_preferences;
create policy "own preferences" on public.user_preferences
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============ promos (kode promo/diskon) ============
create table if not exists public.promos (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  title text not null,
  description text,
  discount_percent int not null check (discount_percent between 1 and 100),
  max_uses int,                        -- null = unlimited
  used_count int not null default 0,
  valid_from timestamptz not null default now(),
  valid_until timestamptz,
  plan_ids text[] not null default '{}', -- berlaku untuk plan mana
  active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.promos enable row level security;

-- Public read untuk validasi kode (hanya active & valid)
drop policy if exists "public read valid promos" on public.promos;
create policy "public read valid promos" on public.promos
  for select using (
    active = true
    and (valid_from is null or valid_from <= now())
    and (valid_until is null or valid_until >= now())
    and (max_uses is null or used_count < max_uses)
  );

-- ============ promo_usages (pencatatan pemakaian promo) ============
create table if not exists public.promo_usages (
  id uuid primary key default gen_random_uuid(),
  promo_id uuid not null references public.promos(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  plan_id text not null references public.plans(id),
  created_at timestamptz not null default now()
);
alter table public.promo_usages enable row level security;

drop policy if exists "own promo usages" on public.promo_usages;
create policy "own promo usages" on public.promo_usages
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============ affiliates (program afiliasi) ============
create table if not exists public.affiliates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  code text not null unique,           -- kode referral unik
  name text not null,                  -- nama tampilan affiliate
  email text not null,
  commission_percent int not null default 20 check (commission_percent between 1 and 50),
  status text not null default 'pending' check (status in ('pending','active','suspended','rejected')),
  payout_method jsonb,                 -- {"type": "bank", "account": "...", "name": "..."}
  total_sales int not null default 0,
  total_commission int not null default 0,
  paid_commission int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.affiliates enable row level security;

drop policy if exists "own affiliate" on public.affiliates;
create policy "own affiliate" on public.affiliates
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Public read untuk validasi kode affiliate (hanya active)
drop policy if exists "public read active affiliates" on public.affiliates;
create policy "public read active affiliates" on public.affiliates
  for select using (status = 'active');

-- ============ affiliate_sales (penjualan via affiliate) ============
create table if not exists public.affiliate_sales (
  id uuid primary key default gen_random_uuid(),
  affiliate_code text not null references public.affiliates(code),
  buyer_id uuid references public.profiles(id) on delete set null,
  buyer_email text not null,
  product text not null,               -- plan_id yang dibeli
  amount int not null,                 -- jumlah bayar (IDR * 100)
  commission int not null,             -- komisi (IDR * 100)
  status text not null default 'pending' check (status in ('pending','paid','cancelled','refunded')),
  paid_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.affiliate_sales enable row level security;

-- Affiliate bisa lihat penjualan miliknya
drop policy if exists "affiliate own sales" on public.affiliate_sales;
create policy "affiliate own sales" on public.affiliate_sales
  for select using (
    affiliate_code in (select code from public.affiliates where user_id = auth.uid())
  );

-- User bisa lihat pembelian sendiri
drop policy if exists "buyer own sales" on public.affiliate_sales;
create policy "buyer own sales" on public.affiliate_sales
  for select using (auth.uid() = buyer_id);

-- ============ app_settings (pengaturan global aplikasi) ============
create table if not exists public.app_settings (
  id int primary key default 1,        -- singleton
  whatsapp text,
  upgrade_note text,
  lynk_links jsonb not null default '{}',
  maintenance_mode boolean not null default false,
  maintenance_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.app_settings enable row level security;

-- Public read untuk footer/contact
drop policy if exists "public read app settings" on public.app_settings;
create policy "public read app settings" on public.app_settings
  for select using (true);

-- Admin write via service_role (RLS bypass)

-- Insert default
insert into public.app_settings (id, whatsapp, upgrade_note, lynk_links)
values (1, '6281234567890', 'Upgrade ke Pro untuk fitur lengkap!', '{"website": "https://maubuatshortvid.com", "instagram": "https://instagram.com/maubuatshortvid"}')
on conflict (id) do nothing;

-- ============ quota (kuota per user per periode) ============
create table if not exists public.quota (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('export','tts_chars','projects','api_calls')),
  period text not null check (period in ('daily','monthly','yearly','lifetime')),
  used int not null default 0,
  limit int not null default 0,        -- 0 = unlimited (tergantung plan)
  period_start timestamptz not null default now(),
  period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, kind, period, period_start)
);
alter table public.quota enable row level security;

drop policy if exists "own quota" on public.quota;
create policy "own quota" on public.quota
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============ usage_events extended (tambah kolom) ============
alter table public.usage_events
  add column if not exists project_id uuid references public.projects(id) on delete set null,
  add column if not exists meta jsonb not null default '{}';

-- ============ RPC: consume_quota (generic quota consumption) ============
create or replace function public.consume_quota(p_kind text, p_amount int default 1)
returns int language plpgsql security definer set search_path = public as $$
declare
  v_left int;
  v_limit int;
  v_plan_limits jsonb;
  v_period_start timestamptz;
  v_period_end timestamptz;
  v_period text;
begin
  if p_amount < 1 then raise exception 'amount harus > 0'; end if;

  -- Tentukan periode berdasarkan kind
  v_period := case p_kind
    when 'export' then 'monthly'
    when 'tts_chars' then 'monthly'
    when 'projects' then 'lifetime'
    when 'api_calls' then 'daily'
    else 'monthly'
  end;

  v_period_start := date_trunc(
    case v_period
      when 'daily' then 'day'
      when 'monthly' then 'month'
      when 'yearly' then 'year'
      else 'year'
    end, now()
  );

  if v_period = 'lifetime' then
    v_period_end := null;
  else
    v_period_end := v_period_start + case v_period
      when 'daily' then interval '1 day'
      when 'monthly' then interval '1 month'
      when 'yearly' then interval '1 year'
    end;
  end if;

  -- Ambil limit dari plan user
  select p.limits into v_plan_limits
  from public.profiles pr
  join public.plans p on pr.plan_id = p.id
  where pr.id = auth.uid();

  v_limit := coalesce(v_plan_limits->>('quota_' || p_kind), v_plan_limits->>p_kind, '0')::int;
  -- Jika 0 (unlimited), skip check
  if v_limit > 0 then
    -- Upsert quota record
    insert into public.quota (user_id, kind, period, used, limit, period_start, period_end)
    values (auth.uid(), p_kind, v_period, p_amount, v_limit, v_period_start, v_period_end)
    on conflict (user_id, kind, period, period_start)
    do update set used = public.quota.used + p_amount, updated_at = now()
    returning public.quota.used into v_left;

    v_left := v_limit - v_left;
    if v_left < 0 then
      raise exception 'Kuota % habis untuk periode ini', p_kind;
    end if;
    return v_left;
  end if;

  return 0; -- unlimited
end $$;

-- ============ RPC: get_user_quota (untuk UI) ============
create or replace function public.get_user_quota()
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_result jsonb := '{}';
  v_plan_limits jsonb;
begin
  select p.limits into v_plan_limits
  from public.profiles pr
  join public.plans p on pr.plan_id = p.id
  where pr.id = auth.uid();

  if v_plan_limits is null then return '{}'; end if;

  -- Ambil usage current period
  for v_row in (
    select kind, period, used, limit, period_start, period_end
    from public.quota
    where user_id = auth.uid()
  ) loop
    v_result := v_result || jsonb_build_object(
      v_row.kind || '_' || v_row.period,
      jsonb_build_object(
        'used', v_row.used,
        'limit', v_row.limit,
        'remaining', greatest(0, v_row.limit - v_row.used),
        'period_start', v_row.period_start,
        'period_end', v_row.period_end
      )
    );
  end loop;

  -- Tambahkan limit dari plan untuk yang belum ada di quota table
  return v_result || jsonb_build_object('plan_limits', v_plan_limits);
end $$;

-- ============ RPC: admin_create_user (service_role) ============
create or replace function public.admin_create_user(
  p_email text, p_password text, p_full_name text,
  p_role text default 'user', p_plan_id text default 'free', p_expires_at timestamptz default null
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_user_id uuid;
begin
  -- Supabase Auth admin create user (butuh service_role)
  -- Di sini hanya insert profile, auth user dibuat via Supabase Dashboard/API
  insert into public.profiles (id, display_name, plan_id, expires_at)
  values (gen_random_uuid(), p_full_name, p_plan_id, p_expires_at)
  returning id into v_user_id;
  return v_user_id;
end $$;

-- ============ RPC: admin_set_plan (service_role) ============
create or replace function public.admin_set_plan(p_user uuid, p_plan_id text, p_expires_at timestamptz default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.profiles
  set plan_id = p_plan_id, expires_at = p_expires_at, updated_at = now()
  where id = p_user;
end $$;

-- ============ RPC: admin_affiliate_summary (service_role) ============
create or replace function public.admin_affiliate_summary()
returns table (
  total_affiliates int,
  active_affiliates int,
  total_sales int,
  total_commission int,
  paid_commission int,
  pending_commission int
) language plpgsql security definer set search_path = public as $$
begin
  return query
  select
    count(*)::int,
    count(*) filter (where status = 'active')::int,
    coalesce(sum(total_sales),0)::int,
    coalesce(sum(total_commission),0)::int,
    coalesce(sum(paid_commission),0)::int,
    coalesce(sum(total_commission - paid_commission),0)::int
  from public.affiliates;
end $$;

-- ============ RPC: admin_affiliate_sync (service_role) ============
-- Sinkronisasi data affiliate dari payment gateway (webhook)
create or replace function public.admin_affiliate_sync(
  p_affiliate_code text, p_buyer_email text, p_product text, p_amount int
) returns int language plpgsql security definer set search_path = public as $$
declare
  v_affiliate_id uuid;
  v_commission int;
  v_buyer_id uuid;
begin
  select id, user_id, commission_percent into v_affiliate_id, v_affiliate_id, v_commission
  from public.affiliates where code = p_affiliate_code and status = 'active';
  if not found then raise exception 'Affiliate tidak ditemukan/nonaktif'; end if;

  v_commission := (p_amount * v_commission / 100)::int;

  -- Cari buyer
  select id into v_buyer_id from public.profiles where email = p_buyer_email;

  insert into public.affiliate_sales (affiliate_code, buyer_id, buyer_email, product, amount, commission)
  values (p_affiliate_code, v_buyer_id, p_buyer_email, p_product, p_amount, v_commission);

  update public.affiliates
  set total_sales = total_sales + 1,
      total_commission = total_commission + v_commission,
      updated_at = now()
  where id = v_affiliate_id;

  return v_commission;
end $$;

-- ============ RPC: claim_referral (user) ============
create or replace function public.claim_referral(p_referral_code text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_referrer_id uuid;
  v_my_id uuid := auth.uid();
begin
  if p_referral_code is null or p_referral_code = '' then
    raise exception 'Kode referral kosong';
  end if;
  if p_referral_code = (select referral_code from public.profiles where id = v_my_id) then
    raise exception 'Tidak bisa pakai kode sendiri';
  end if;

  select id into v_referrer_id from public.profiles where referral_code = p_referral_code;
  if not found then raise exception 'Kode referral tidak valid'; end if;

  update public.profiles
  set referred_by = p_referral_code
  where id = v_my_id and referred_by is null;

  if not found then raise exception 'Kamu sudah menggunakan kode referral'; end if;

  -- Bonus kredit untuk referrer & referee
  perform public.grant_credits(v_referrer_id, 5);
  perform public.grant_credits(v_my_id, 3);

  return jsonb_build_object(
    'referrer_bonus', 5,
    'referee_bonus', 3,
    'message', 'Berhasil klaim referral!'
  );
end $$;

-- ============ RPC: admin_record_sale (service_role) ============
create or replace function public.admin_record_sale(
  p_code text, p_product text, p_amount int, p_buyer uuid, p_email text, p_credits int default 0
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_sale_id uuid;
begin
  insert into public.affiliate_sales (affiliate_code, buyer_id, buyer_email, product, amount, commission, status)
  values (p_code, p_buyer, p_email, p_product, p_amount, 0, 'paid')
  returning id into v_sale_id;

  if p_credits > 0 then
    perform public.grant_credits(p_buyer, p_credits);
  end if;

  return v_sale_id;
end $$;

-- ============ Function: generate_referral_code ============
create or replace function public.generate_referral_code()
returns text language plpgsql security definer set search_path = public as $$
declare
  v_code text;
  v_chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- no I, O, 0, 1
begin
  loop
    v_code := '';
    for i in 1..8 loop
      v_code := v_code || substr(v_chars, floor(random() * length(v_chars) + 1)::int, 1);
    end loop;
    if not exists (select 1 from public.profiles where referral_code = v_code) then
      return v_code;
    end if;
  end loop;
end $$;

-- Trigger: generate referral_code on profile insert
create or replace function public.handle_new_user_extended()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- referral_code sudah di-generate via default atau manual
  if new.referral_code is null then
    new.referral_code := public.generate_referral_code();
  end if;
  return new;
end $$;

drop trigger if exists on_auth_user_created_extended on auth.users;
create trigger on_auth_user_created_extended
  after insert on auth.users
  for each row execute function public.handle_new_user_extended();

-- ============ Index tambahan ============
create index if not exists idx_projects_owner_updated on public.projects(owner, updated_at desc);
create index if not exists idx_usage_events_user_kind_created on public.usage_events(user_id, kind, created_at desc);
create index if not exists idx_affiliate_sales_code_status on public.affiliate_sales(affiliate_code, status);
create index if not exists idx_quota_user_kind_period on public.quota(user_id, kind, period, period_start);