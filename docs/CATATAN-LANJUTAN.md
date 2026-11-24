# Catatan Lanjutan

Untuk melanjutkan, cukup tulis: **"lanjutkan project berjalan"**.

## Status terakhir

### Alur produk (dikoreksi)
Alur dimulai dari **ide**, bukan naskah:
**Ide → Naskah → Suara TTS → Subtitle karaoke → Animasi Canvas → Export MP4**, render 100% di browser.
Halaman ide ada di `/app/trial/ide`; ide yang dipilih menjadi naskah per scene di studio.

### Integrasi LLM untuk pembuatan ide (sudah berjalan)
- Endpoint baru `POST /api/ideas` di `server/index.mjs`.
  - Memakai Anthropic jika `ANTHROPIC_API_KEY` diisi, atau DeepSeek jika `DEEPSEEK_API_KEY` diisi.
  - `LLM_PROVIDER` (`anthropic` | `deepseek` | `none`) memaksa penyedia tertentu.
  - Base URL Anthropic bisa diganti lewat `ANTHROPIC_BASE_URL`. Untuk token DeepSeek dengan format Anthropic: `api.deepseek.com/anthropic` dan `ANTHROPIC_MODEL=deepseek-v4-flash`.
  - Model DeepSeek default: `deepseek-v4-flash`. `deepseek-chat` akan dihentikan 24 Juli 2026.
- Frontend `web/src/components/TrialIdea.jsx` memanggil `/api/ideas`. Jika gagal, otomatis pakai engine lokal `generateIdeas()`.
- `createIdeaFromLines` di `web/src/lib/ideaEngine.js` sekarang diekspor.
- Kunci disimpan di `server/.env` (diabaikan git). Jangan tulis kunci di `.env.example` atau chat.

### Verifikasi (24 Nov 2026)
- `npx vite build` lolos.
- `node --check server/index.mjs` lolos.
- `GET /api/health` sekarang memvalidasi kunci (cache 60 detik): OpenAI lewat `GET /v1/models`, ElevenLabs lewat synth 1 huruf. `ready: false` + `error` bila kunci ditolak; 429 dianggap kunci valid.
- `POST /api/ideas` Anthropic: HTTP 200, 4 ide, `provider: anthropic`.
- `POST /api/ideas` dengan `LLM_PROVIDER=deepseek`: HTTP 200, 4 ide, `provider: deepseek`.
- `POST /api/tts` OpenAI: HTTP 502, kunci ditolak 401 ("Incorrect API key").
- `POST /api/tts` ElevenLabs: HTTP 200 `audio/mpeg` 24-33 KB. Kadang 429 `system_busy`.
- `TTS_PROVIDER=elevenlabs` sekarang jadi default di `server/.env`.
- Sajian statis `/`: HTTP 200.
- `web/.env.local` sudah dibuat sebagai scaffold, tetapi kredensial Supabase belum ada. Fitur auth, cloud, pricing, affiliate, dan admin tetap nonaktif sampai dua nilainya diisi.

### Belum diuji
- Klik tombol "Buat ide" di browser.
- Klik "Buat suara" di browser dengan ElevenLabs.
- Jalur Supabase dengan kredensial asli.

## Langkah berikutnya (usulan)
1. Isi `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY` di `web/.env.local`.
2. Uji tombol "Buat ide" dan "Buat suara" di browser.
3. Ganti `OPENAI_API_KEY` bila ingin memakai OpenAI TTS lagi.

## Masalah yang sudah ada sebelumnya
- Roadmap v0.3 belum dicentang.
- Checkout Pricing, dark mode, QR affiliate, dan dua editor belum selesai.
- Folder `supabase/functions` tidak ada, padahal `api.js` memanggil Edge Function `admin-*`.
- Kunci Gemini di tabel `gemini_keys` belum dipakai.

## Menjalankan
- Frontend: `cd web && npx vite --host 0.0.0.0 --port 5173`
- Backend: `cd web && npm run server` (PORT default 8787)
