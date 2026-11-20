# 04 — API (server TTS + Supabase)

Ada dua backend opsional, keduanya tidak wajib untuk memakai editor:

1. **Server TTS** (`server/index.mjs`) — satu file Node tanpa dependensi, hanya
   meneruskan permintaan ke penyedia TTS. Kunci API tidak pernah masuk bundle browser.
2. **Supabase** — simpan/buka project + audio (langsung dari browser via supabase-js,
   RLS yang menjaga).

## 1. Server TTS

```bash
cd server
cp .env.example .env      # isi OPENAI_API_KEY (atau ELEVENLABS_*)
cd ../web
npm run server            # http://127.0.0.1:8787
npm run dev               # Vite mem-proxy /api -> 8787
```

Variabel lingkungan: `OPENAI_API_KEY`, `OPENAI_TTS_MODEL` (default `gpt-4o-mini-tts`),
`OPENAI_TTS_VOICE` (default `alloy`), `OPENAI_TTS_INSTRUCTIONS` (opsional),
`ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID`, `TTS_PROVIDER` (`openai|elevenlabs|none`),
`PORT` (default 8787), `OPENAI_BASE_URL` (untuk gateway/proxy kompatibel OpenAI).

### `GET /api/health`

```json
{ "ok": true, "tts": { "provider": "openai", "ready": true,
  "voices": ["alloy","ash","ballad","coral","echo","fable","nova","onyx","sage","shimmer","verse"],
  "defaultVoice": "alloy" } }
```

`provider: "none"` berarti server hidup tapi belum ada kunci — UI menampilkan cara mengisinya.

### `POST /api/tts`

Permintaan:

```json
{ "text": "Punya 30 detik? Ubah jadi video pendek", "voice": "nova", "speed": 1.1 }
```

- `text` wajib, maksimal 1200 karakter per permintaan.
- `speed` 0.7–1.3 (dijepit di server).
- Balasan sukses: biner `audio/mpeg` (mp3).
- Balasan gagal: JSON `{ "error": "...", "need": "..." }` dengan status 400/501/502.

Client memanggil endpoint ini dari `web/src/tts.js` (`ttsStatus`, `synthesize`), lalu
`web/src/audio.js` menyusun semua potongan menjadi satu timeline.

## 2. Supabase

```bash
# 1. Buat project di supabase.com, jalankan supabase/schema.sql di SQL Editor
# 2. Authentication > Providers: aktifkan "Anonymous sign-ins"
#    (RLS memakai auth.uid() sebagai owner; tanpa ini penyimpanan ditolak)
# 3. web/.env.local:
#    VITE_SUPABASE_URL=https://xxxx.supabase.co
#    VITE_SUPABASE_ANON_KEY=eyJ...
npm run dev
```

Operasi yang dipakai (semua lewat `web/src/cloud.js`):

```js
const { data: { session } } = await supabase.auth.getSession();     // atau signInAnonymously()
await supabase.from('projects').insert({ id, owner: session.user.id, title, payload });
await supabase.storage.from('project-audio')
  .upload(`${uid}/${projectId}/scene-1.mp3`, blob, { contentType: 'audio/mpeg', upsert: true });
await supabase.from('usage_events').insert({ user_id: uid, kind: 'save' });
```

Struktur path audio mengikuti policy storage di `schema.sql`
(`auth.uid()::text = (storage.foldername(name))[1]`).

### Kontrak `payload` project

```json
{
  "version": 1,
  "scenes": [
    {"text":"Halo, ini scene 1","style":"karaoke","camera":"push","transition":"fade","dur":4,"bg":210}
  ],
  "audio": { "0": "<uid>/<projectId>/scene-1.mp3" }
}
```

`audio` hanya berisi scene yang audionya ikut diunggah. Saat project dibuka lagi,
payload dipakai apa adanya; audio lama akan disintesis ulang oleh tombol "Buat suara TTS".

Validasi di klien: `scenes` 1..6 (UI), `dur` 2..15 dtk, `style/camera/transition`
harus dari daftar di `styles.js`.

## Konversi manual (kalau perlu)

Export MP4 sudah langsung dari browser. Kalau ada file lama `.webm` yang mau dijadikan MP4:

```bash
ffmpeg -i export.webm -c:v libx264 -pix_fmt yuv420p -c:a aac export.mp4
```
