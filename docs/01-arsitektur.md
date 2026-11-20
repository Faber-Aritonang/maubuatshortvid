# 01 — Arsitektur

## Tujuan
Prototype v0.1 membuktikan satu loop penuh tanpa backend wajib:
`Naskah -> Suara -> Subtitle -> Animasi -> Export`, render 100% di browser.

## Diagram

```
[Editor React] --project JSON--> [Renderer Canvas 2D @30fps] --stream--> [Exporter MediaRecorder] --> video.webm
      |                                     ^
      +-- [TTS browser / upload audio] ------+
      +-- [word-timing estimator] -----------+
      +-- [Supabase opsional: auth, simpan project, kuota] (tidak menghalangi demo)
```

## Modul & provenance (clean-room)

| Modul | File | Sumber ide | Catatan |
|---|---|---|---|
| Editor 5 langkah | `web/src/App.jsx` | Pola umum wizard | Ditulis baru, copy Bahasa Indonesia sendiri |
| Renderer | `web/src/renderer.js` | Pengetahuan umum Canvas 2D (MDN) | Double-buffer 1 offscreen, `requestAnimationFrame`, lerp kamera |
| Gaya | `web/src/styles.js` | Observasi umum (karaoke, ketik, neon) | 7 gaya original, parameter sendiri |
| Exporter | `web/src/exporter.js` | API standar `canvas.captureStream` + `MediaRecorder` | Tidak memakai encoder proprietary |
| TTS | `web/src/tts.js` | Web Speech API standar | Estimasi timing `durasi/kata` bila tanpa word-timestamp |
| Skema DB | `supabase/schema.sql` | Desain sendiri minimal | 4 tabel, bukan replika tabel pihak lain |

## Batas yang disengaja (v0.1)
- Timeline 1 track, 1-6 scene, tiap scene 1 teks + 1 gaya + 1 kamera + 1 transisi.
- Resolusi preview 540x960, export mengikuti ukuran canvas (default 720x1280).
- Audio: 1 file narasi global (hasil TTS digabung) atau upload manual.
- Tidak ada: login wajib, pembayaran, afiliasi, AI naskah server, SFX library.
  Semua itu ada di `docs/05-roadmap.md` sebagai pekerjaan baru, bukan hasil salin.
