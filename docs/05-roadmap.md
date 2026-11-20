# 05 — Roadmap

## Sudah ada di v0.2
- [x] Export MP4 asli (H.264 + audio) dan WebM langsung dari browser via WebCodecs/mediabunny.
- [x] TTS sungguhan lewat proxy `server/index.mjs` (OpenAI / ElevenLabs), audio ikut ke video.
- [x] Simpan/buka project ke Supabase dari UI, audio per scene masuk bucket `project-audio`.
- [x] Fallback lengkap: Web Speech API bila server TTS mati, MediaRecorder bila tanpa WebCodecs.
- [x] Gambar latar per scene (pilih/hapus, ikut preview + export + JSON, upload ke bucket `project-images`).

## v0.3
- [ ] Word-timestamp asli dari penyedia TTS (bukan estimasi merata) untuk karaoke presisi.
- [ ] Musik latar + normalisasi volume (WebAudio, sebelum mix).
- [ ] 3 gaya subtitle tambahan (sorot, selotip, glitch) — implementasi baru.
- [ ] Rasio 9:16 / 1:1 / 16:9.
- [ ] Encoder AAC opsional (MP3/AAC via WASM) supaya MP4 kompatibel Apple di semua platform.

## Bukan target (agar tetap clean-room)
- Menyalin gaya/aset/teks/prompt milik aplikasi lain.
- Mengambil atau memutar ulang kunci API, data user, atau dump database pihak lain.
