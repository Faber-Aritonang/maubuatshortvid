# 01 — Arsitektur

## Tujuan
Prototype v0.2 membuktikan satu loop penuh dengan backend seminimal mungkin:
`Naskah -> Suara TTS -> Subtitle -> Animasi -> Export MP4`, render dan encode 100% di browser.

## Diagram

```
[Editor React] --project JSON--> [Renderer Canvas 2D @30fps] --frame--> [Exporter mediabunny/WebCodecs] --> video.mp4
      |                                     ^                                     ^
      +-- [POST /api/tts] -> [server proxy -> OpenAI/ElevenLabs] -> mp3?        |
      |        |                                                               |
      |        +--> [audio.js: decode -> AudioBuffer -> mix timeline] ----------+
      +-- [word-timing estimator] ---------------------------------------------+
      +-- [Supabase opsional: anonymous auth, project + audio, kuota] (tidak menghalangi demo)
```

Tanpa server TTS, `tts.js` memakai Web Speech API agar demo tetap jalan. Tanpa
Supabase, project disimpan sebagai file JSON.

## Modul & provenance (clean-room)

| Modul | File | Sumber ide | Catatan |
|---|---|---|---|
| Editor 5 langkah | `web/src/App.jsx` | Pola umum wizard | Ditulis baru, copy Bahasa Indonesia sendiri |
| Renderer | `web/src/renderer.js` | Pengetahuan umum Canvas 2D (MDN) | Double-buffer 1 offscreen, `requestAnimationFrame`, lerp kamera |
| Gaya | `web/src/styles.js` | Observasi umum (karaoke, ketik, neon) | 7 gaya original, parameter sendiri |
| Exporter | `web/src/exporter.js` | WebCodecs + library muxer publik (mediabunny) | Tidak memakai encoder proprietary milik pihak lain |
| Audio pipeline | `web/src/audio.js` | WebAudio `OfflineAudioContext` standar | Mix sendiri: tiap scene di detik mulainya |
| TTS | `web/src/tts.js` + `server/index.mjs` | REST penyedia TTS umum (OpenAI/ElevenLabs) | Proxy milik sendiri, kunci di server; fallback Web Speech |
| Cloud | `web/src/cloud.js` | supabase-js standar | Upload audio ke bucket sendiri, RLS |
| Skema DB | `supabase/schema.sql` | Desain sendiri minimal | 4 tabel, bukan replika tabel pihak lain |

## Batas yang disengaja (v0.2)
- Timeline 1 track, 1-6 scene, tiap scene 1 teks + 1 gaya + 1 kamera + 1 transisi.
- Export mengikuti ukuran canvas (720x1280) pada 30 fps.
- Audio: satu suara TTS per scene, disusun di timeline; belum ada musik latar atau upload manual.
- Tidak ada: login wajib, pembayaran, afiliasi, AI naskah server, SFX library.
  Semua itu ada di `docs/05-roadmap.md` sebagai pekerjaan baru, bukan hasil salin.
