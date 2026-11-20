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

## Gambar latar (opsional per scene)

```
input file -> downscaleImage (maks 720px, JPEG ~0.82) -> putImageBlob(id)
  -> scene.img = id -> drawBackground: gradasi dulu, lalu drawImage cover
```

- `drawCoverImage` menggambar menutupi layar (`cover`) dengan margin 160px agar kamera
  `push/pull` (zoom 1.12x) tidak menyisakan tepi kosong.
- Tanpa gambar, latar tetap gradasi prosedural + lingkaran/grid seperti sebelumnya.
- Gambar ikut ke export karena `exportVideo` memakai `drawProject` yang sama dengan
  peta elemen yang sudah dimuat (`imageReady` ditunggu sebelum encode).
- Field `scene.img` hanya id string, jadi project JSON tetap ramping; saat export JSON,
  blob diubah ke data URL di `payload.images` (entri > 2 MB dilewati).

## Transisi (5)

`cut, fade (alpha), slide (geser x), zoom (scale 0.9->1), wipe (persegi meluas)`.
Hanya di 0.35 dtk pertama scene (kecuali `cut`).

## Audio TTS (`tts.js` + `audio.js`)

```
teks scene -> POST /api/tts (server kecil, kunci API di server) -> mp3
          -> decodeAudioData -> AudioBuffer per scene
          -> OfflineAudioContext: tempel tiap buffer di detik mulai scene
          -> satu mix sepanjang timeline
```

Mix ini dipakai dua kali: diputar untuk pratinjau (`playMix`) dan dimasukkan
sebagai track suara saat export. Jadi yang didengar = yang diunduh.
Hasil sintesis di-cache per `(teks, suara, kecepatan)` agar export tidak memanggil
API dua kali. Tanpa server TTS, tombol "Suara browser" memakai Web Speech API.

## Exporter (`exporter.js`)

```
drawProject(canvas, t) per frame 1/30 dtk
 -> CanvasSource(canvas, {codec: avc|vp9})   (mediabunny/WebCodecs)
 -> AudioBufferSource({codec: aac|opus}) <- mix dari audio.js
 -> Output(Mp4OutputFormat | WebMOutputFormat) -> BufferTarget -> Blob -> unduh
```

Mediabunny dipakai sebagai muxer + pembungkus WebCodecs. Encode berjalan lebih
cepat dari realtime (tidak merekam 30 dtk penuh) dan audio ikut termux.

| Format | Video | Audio | Catatan |
|---|---|---|---|
| MP4 | H.264 (avc1) | AAC bila browser punya encoder-nya, jika tidak Opus | Chrome Linux/headless tidak punya AAC; macOS/Windows umumnya punya |
| WebM | VP9 | Opus | Ukuran lebih kecil, dukungan pemutar lebih sempit dari MP4 |

Kalau browser tidak punya WebCodecs sama sekali, `exportVideo` jatuh ke jalur lama
MediaRecorder (`canvas.captureStream` -> WebM, realtime, tanpa audio) supaya tetap
bisa dipakai, dengan catatan di UI.

Cek cepat di DevTools, sebelum export:

```js
document.createElement('canvas').getContext('2d') && !!(window.VideoEncoder)
```
