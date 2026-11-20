# MauBuatShortVid — Clean-Room Clone

Prototype open-source pembuat video pendek vertikal (terinspirasi alur kerja umum
aplikasi sejenis, **bukan salinan** SatsetMotion atau aset/kode milik pihak lain).

Alur: **Naskah → Suara (TTS / upload) → Subtitle kata-per-kata → Animasi Canvas → Export MP4** — semua render di browser, tanpa antre server.

> Status: prototype v0.1. Bisa dibuka, diedit, di-preview, dan di-export MP4 vertikal.
> Lihat `docs/` untuk desain, `web/` untuk aplikasi, `supabase/` untuk skema database.

## Mulai cepat (tanpa backend)

```bash
cd web
npm install
npm run dev
# buka http://localhost:5173
```

Untuk export MP4 butuh browser modern (Chrome/Edge). Tidak perlu API key untuk mode demo
(suara memakai Web Speech API bawaan browser + estimasi pewaktuan kata).

Dengan backend Supabase (opsional):

```bash
# 1. Buat project di supabase.com, lalu jalankan supabase/schema.sql di SQL Editor
# 2. Copy web/.env.example -> web/.env, isi VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY
npm run dev
```

## Struktur repo

```
docs/
  01-arsitektur.md      Gambaran sistem + batas clean-room
  02-database-supabase.md  Tabel, RLS, RPC, storage
  03-renderer-canvas.md    Cara kerja renderer + exporter
  04-api.md             Kontrak API backend (opsional)
  05-roadmap.md         Rencana v0.2+
supabase/
  schema.sql            Skema original (4 tabel + RPC + storage)
web/
  package.json          Vite + React, tanpa UI framework berat
  index.html
  src/
    main.jsx            Entry React
    App.jsx             Editor 5 langkah
    renderer.js         Engine Canvas 2D (original, ~300 baris)
    exporter.js         Rekam canvas+audio -> WebM/MP4 via MediaRecorder
    tts.js              TTS browser + estimasi word-timing
    styles.js           7 gaya subtitle + 5 kamera + 5 transisi (original)
    app.css             Styling gelap minimal
```

## Batas clean-room (penting)

1. Semua kode di repo ini ditulis ulang dari nol berdasarkan observasi perilaku umum.
2. Tidak ada kode, teks, gambar, suara, font, atau prompt milik SatsetMotion / pihak lain.
3. Nama, merek, dan aset pihak ketiga tidak dipakai.
4. Gaya subtitle / transisi di sini adalah implementasi original dengan nama generik.
5. Lihat `docs/01-arsitektur.md` untuk catatan provenance tiap modul.
