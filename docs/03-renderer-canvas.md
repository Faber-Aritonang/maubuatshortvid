# 03 — Renderer Canvas (cara kerja)

Implementasi: `web/src/renderer.js` (~300 baris) + `web/src/styles.js`.
Semua original, hanya memakai API standar Canvas 2D.

## Loop

```
drawProject(ctx, project, timeSec, opts)
  1. Cari scene aktif: akumulasi durasi scene sampai timeSec masuk.
  2. Hitung progress lokal p = (t - start) / dur (0..1).
  3. Terapkan kamera -> setTransform (scale + translate, di-lerp agar halus).
  4. Gambar latar (gradien vertikal per scene, 6 varian hue).
  5. Gambar dekorasi prosedural (garis, lingkaran, grid — digambar kode, bukan PNG).
  6. Gambar teks subtitle sesuai gaya + kata aktif dari word-timing.
  7. Terapkan transisi di 0.35 detik awal/akhir (fade/slide/zoom/wipe).
```

Preview memakai `requestAnimationFrame` 30fps; export merekam stream yang sama
sehingga WYSIWYG.

## Kamera (5, semua lerp linear)

| id | Efek |
|---|---|
| `static` | Diam |
| `push` | Zoom 1.0 -> 1.12 |
| `pull` | Zoom 1.12 -> 1.0 |
| `pan-l` / `pan-r` | Geser horizontal ±40px |

Rumus: `scale = lerp(a, b, ease(p))`, `ease = p*p*(3-2p)` (smoothstep).

## Subtitle (7 gaya)

| id | Cara gambar |
|---|---|
| `kotak` | Pilihan default: teks putih di atas pil hitam 70% |
| `karaoke` | Teks dasar putih, kata yang sudah terucap digambar ulang kuning (2 pass) |
| `ketik` | Potong string sesuai `p * len`, tambah kursor `▌` berkedip |
| `pop` | Tiap kata scale 0.6->1.15->1.0 dengan delay per kata |
| `neon` | `shadowColor cyan, shadowBlur 18`, teks putih |
| `stiker` | Teks miring -4°, latar kuning, bayangan offset |
| `off` | Tidak gambar teks (untuk scene visual saja) |

Word-timing: array `{w, t}` per scene (detik relatif). Kata aktif =
kata terakhir dengan `t <= waktuLokal`. Bila TTS browser tidak memberi timestamp
(yang umum), `tts.js` mengestimasi merata `durasi/kata`.

## Transisi (5)

`cut, fade (alpha), slide (geser x), zoom (scale 0.9->1), wipe (persegi meluas)`.
Hanya di 0.35 dtk pertama scene (kecuali `cut`).

## Exporter (`exporter.js`)

```
canvas.captureStream(30) + audioElement.captureStream()
 -> new MediaRecorder(combined, {mimeType: 'video/webm;codecs=vp9,opus'})
 -> ondataavailable kumpulkan Blob -> Blob('video/webm') -> unduh
```

Dipilih MediaRecorder (dukungan luas, tanpa dependensi, tanpa server) dibanding
muxer MP4 manual. Hasil `.webm` diputar di semua browser/HP modern; konversi ke
MP4 bisa via `ffmpeg` satu baris (lihat `docs/04-api.md`).
