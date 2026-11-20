# MauBuatShortVid — Clean-Room Clone

Prototype open-source pembuat video pendek vertikal (terinspirasi alur kerja umum
aplikasi sejenis, **bukan salinan** SatsetMotion atau aset/kode milik pihak lain).

Alur: **Naskah → Suara TTS sungguhan → Subtitle kata-per-kata → Animasi Canvas → Export MP4** —
render dan encode 100% di browser, tanpa antre render di server.

> Status: prototype v0.2. TTS nyata, export MP4 (H.264 + audio) dan WebM, plus simpan ke Supabase (opsional).
> Lihat `docs/` untuk desain, `web/` untuk aplikasi, `server/` untuk proxy TTS, `supabase/` untuk skema database.

## Mulai cepat

```bash
cd web
npm install
npm run dev        # http://localhost:5173 — langsung bisa edit, preview, export
```

Tanpa kunci API pun editor jalan penuh: tombol **Suara browser** memakai Web Speech
API. Untuk narasi natural + audio yang ikut ke video, nyalakan server TTS:

```bash
cd server
cp .env.example .env    # isi OPENAI_API_KEY=sk-...  (atau ELEVENLABS_API_KEY + ELEVENLABS_VOICE_ID)
cd ../web
npm run server          # terminal 1: http://127.0.0.1:8787
npm run dev             # terminal 2: Vite mem-proxy /api ke server
```

Kunci API hanya dibaca server; tidak pernah ikut ke bundle browser.

## Cara pakai

1. Tulis naskah per scene, atur gaya subtitle / kamera / transisi / durasi.
2. **Buat suara TTS** → audio per scene disusun jadi satu timeline (pratinjau memakai audio yang sama).
3. **Putar** untuk cek sinkronisasi; geser seekbar untuk melompat.
4. (Opsional) **Pilih gambar** di tiap scene untuk gambar latar foto (diperkecil otomatis, menutupi layar).
5. **Export MP4** (atau WebM) — hasilnya langsung terunduh, sudah ada suaranya.

Export memakai WebCodecs lewat [mediabunny](https://mediabunny.dev): frame digambar
dan di-encode lebih cepat dari realtime, lalu audio TTS dimux ke dalam file.

| Browser | MP4 (H.264) | Audio MP4 |
|---|---|---|
| Chrome/Edge (Windows, macOS) | ya | AAC |
| Chrome/Edge (Linux, termasuk headless) | ya | Opus (tidak ada encoder AAC di platform) |
| Safari 16.4+ | ya | AAC |
| Tanpa WebCodecs | fallback MediaRecorder → WebM tanpa audio | — |

MP4 berisi Opus tetap diputar Chrome/VLC; untuk kompatibilitas Apple, export dari
mesin yang punya AAC atau konversi dengan `ffmpeg` (lihat `docs/04-api.md`).

## Supabase (opsional)

```bash
# 1. Buat project di supabase.com, jalankan supabase/schema.sql di SQL Editor
# 2. Authentication > Providers > aktifkan Anonymous sign-ins
# 3. web/.env.local: VITE_SUPABASE_URL=... dan VITE_SUPABASE_ANON_KEY=...
npm run dev
```

Panel kanan lalu menampilkan **Simpan ke cloud** dan **Daftar project**; audio tiap
scene ikut diunggah ke bucket `project-audio`, gambar latar ke bucket
`project-images`. Tanpa dua variabel itu, semuanya tetap lokal: Simpan JSON menyertakan
gambar sebagai data URL, Buka JSON memuatnya kembali.

## Struktur repo

```
server/
  index.mjs             Proxy TTS (Node, tanpa dependensi) + penyaji dist/
  .env.example
docs/
  01-arsitektur.md      Gambaran sistem + batas clean-room
  02-database-supabase.md  Tabel, RLS, RPC, storage
  03-renderer-canvas.md    Renderer, pipeline audio, exporter
  04-api.md             Kontrak server TTS + Supabase
  05-roadmap.md         Rencana berikutnya
supabase/
  schema.sql            Skema original (4 tabel + RPC + storage)
web/
  src/
    App.jsx             Editor + transport + TTS + export + cloud      renderer.js         Engine Canvas 2D (original)
      exporter.js         MP4/WebM via mediabunny (WebCodecs)
      audio.js            TTS -> AudioBuffer -> mix timeline
      images.js           Gambar latar: downscale, cache elemen, data URL
    tts.js              Klien TTS server + fallback Web Speech
    cloud.js            Simpan/buka project Supabase
    styles.js           7 gaya subtitle + 5 kamera + 5 transisi (original)
    app.css
```

## Batas clean-room (penting)

1. Semua kode di repo ini ditulis ulang dari nol berdasarkan observasi perilaku umum.
2. Tidak ada kode, teks, gambar, suara, font, atau prompt milik SatsetMotion / pihak lain.
3. Nama, merek, dan aset pihak ketiga tidak dipakai.
4. Gaya subtitle / transisi di sini adalah implementasi original dengan nama generik.
5. Lihat `docs/01-arsitektur.md` untuk catatan provenance tiap modul.
