# Catatan Lanjutan

Untuk melanjutkan, cukup tulis: **"lanjutkan project berjalan"**.

## Status terakhir

### Integrasi LLM untuk pembuatan ide (sudah berjalan)
- Endpoint baru `POST /api/ideas` di `server/index.mjs`.
  - Memakai Anthropic jika `ANTHROPIC_API_KEY` diisi, atau DeepSeek jika `DEEPSEEK_API_KEY` diisi.
  - `LLM_PROVIDER` (`anthropic` | `deepseek` | `none`) memaksa penyedia tertentu.
  - Base URL Anthropic bisa diganti lewat `ANTHROPIC_BASE_URL`. Untuk token DeepSeek dengan format Anthropic: `api.deepseek.com/anthropic` dan `ANTHROPIC_MODEL=deepseek-v4-flash`.
  - Model DeepSeek default: `deepseek-v4-flash`. `deepseek-chat` akan dihentikan 24 Juli 2026.
- Frontend `web/src/components/TrialIdea.jsx` memanggil `/api/ideas`. Jika gagal, otomatis pakai engine lokal `generateIdeas()`.
- `createIdeaFromLines` di `web/src/lib/ideaEngine.js` sekarang diekspor.
- Kunci disimpan di `server/.env` (diabaikan git). Jangan tulis kunci di `.env.example` atau chat.

### Verifikasi
- `npx vite build` lolos.
- `node --check server/index.mjs` lolos.
- `POST /api/ideas` dengan kunci Anthropic: HTTP 200, 4 ide, `provider: anthropic`.

### Belum diuji
- Jalur DeepSeek (`LLM_PROVIDER=deepseek`).
- Klik tombol "Buat ide" di browser.

## Langkah berikutnya (usulan)
1. Uji jalur DeepSeek dengan `LLM_PROVIDER=deepseek`.
2. Uji tombol "Buat ide" di browser.
3. Opsional: pilihan provider di halaman ide.

## Masalah yang sudah ada sebelumnya
- Roadmap v0.3 belum dicentang.
- Checkout Pricing, dark mode, QR affiliate, dan dua editor belum selesai.
- Folder `supabase/functions` tidak ada, padahal `api.js` memanggil Edge Function `admin-*`.
- Kunci Gemini di tabel `gemini_keys` belum dipakai.

## Menjalankan
- Frontend: `cd web && npx vite --host 0.0.0.0 --port 5173`
- Backend: `cd web && npm run server` (PORT default 8787)
