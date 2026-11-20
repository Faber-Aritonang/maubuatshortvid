# 02 — Database Supabase (desain original v0.1)

Skema lengkap di `supabase/schema.sql`. Prinsip: sesedikit mungkin, RLS ketat,
semua tulis lewat user yang login, tidak ada `service_role` di frontend.

## Tabel (4 saja)

### `profiles` — 1 baris per user auth
```
id uuid PK FK auth.users
display_name text
plan text default 'free'        -- free | pro (string, bukan FK, agar v0.1 simpel)
credits int default 3           -- kuota export/generate
created_at timestamptz
```
RLS: user hanya bisa `SELECT/UPDATE` baris miliknya (`auth.uid() = id`).
Insert baris baru dilakukan trigger `handle_new_user` saat signup (lihat schema.sql).

### `projects` — project video milik user
```
id uuid PK default gen_random_uuid()
owner uuid FK profiles.id
title text default 'Tanpa judul'
payload jsonb                 -- { scenes: [{text, style, camera, transition, dur}], audioUrl? }
updated_at timestamptz
```
RLS: `owner = auth.uid()` untuk semua operasi. Payload validasi ringan di client
(maks 20 scene, tiap teks maks 500 char) + cek ulang di RPC bila backend dipakai.

### `usage_events` — telemetri kuota (append-only)
```
id bigint PK, user_id uuid, kind text, -- 'export' | 'tts' | 'save'
created_at timestamptz
```
RLS: user boleh `INSERT` miliknya + `SELECT` miliknya. Tidak boleh update/delete.
Fungsi `consume_credit()` mengurangi `profiles.credits` dan mencatat event atomik.

### `activity_log` — riwayat tindakan (opsional, append-only)
```
id bigint PK, user_id uuid, action text, meta jsonb, created_at
```
Dipakai halaman "Riwayat" di masa depan. Boleh dikosongkan di v0.1.

## RPC (2 fungsi)
- `consume_credit(p_kind text) returns int` — kurangi 1 kredit bila > 0, catat
  `usage_events`, kembalikan sisa. Dipakai sebelum export dengan backend.
- `grant_credits(p_user uuid, p_amount int)` — hanya `service_role` (dipanggil dari
  dashboard / webhook pembayaran nanti, bukan dari browser).

## Storage (2 bucket privat)
- `project-audio` — file TTS/upload per project (`{user_id}/{project_id}.webm`).
- `project-images` — gambar latar opsional (v0.2).
Keduanya privat; akses via signed URL 1 jam dari client yang login.

## Yang sengaja TIDAK ada di v0.1
Tabel `plans` terpisah, `affiliates`, `sales`, pool API key bersama — itu kebutuhan
bisnis aplikasi komersial yang dibedah, bukan kebutuhan prototype. Kalau nanti butuh,
tambah bertahap sesuai `docs/05-roadmap.md`, dengan desain sendiri.
