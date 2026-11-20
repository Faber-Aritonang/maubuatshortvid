// Exporter: render tiap frame ke kanvas lalu encode + mux di browser.
//
// Jalur utama memakai mediabunny (WebCodecs di baliknya), jadi:
//   - hasil bisa MP4 (H.264 + AAC/Opus) atau WebM (VP9 + Opus),
//   - proses encode lebih cepat dari realtime (tidak perlu merekam 30 dtk penuh),
//   - audio dari TTS ikut tercampur sebagai track suara.
// Kalau browser belum punya WebCodecs, dipakai MediaRecorder lama (WebM, realtime).

import {
  Output, Mp4OutputFormat, WebMOutputFormat, BufferTarget, CanvasSource, AudioBufferSource,
  QUALITY_HIGH, getFirstEncodableVideoCodec, getFirstEncodableAudioCodec,
} from 'mediabunny';

export const FPS = 30;

const FORMATS = {
  mp4: { video: ['avc'], audio: ['aac', 'opus'], mime: 'video/mp4', ext: 'mp4', Ctor: Mp4OutputFormat },
  webm: { video: ['vp9', 'vp8'], audio: ['opus'], mime: 'video/webm', ext: 'webm', Ctor: WebMOutputFormat },
};

// Apa yang bisa dihasilkan browser ini? Dipakai UI untuk menonaktifkan tombol yang tidak mungkin.
export async function probeExportSupport(width, height) {
  const out = {};
  for (const [name, f] of Object.entries(FORMATS)) {
    const video = await getFirstEncodableVideoCodec(f.video, { width, height }).catch(() => null);
    const audio = await getFirstEncodableAudioCodec(f.audio, { numberOfChannels: 2, sampleRate: 48000 }).catch(() => null);
    out[name] = { ok: Boolean(video), video, audio };
  }
  out.realtime = typeof MediaRecorder !== 'undefined';
  return out;
}

async function exportWithCodecs({ canvas, draw, totalDur, fps, audioBuffer, format, onProgress }) {
  const f = FORMATS[format];
  const videoCodec = await getFirstEncodableVideoCodec(f.video, { width: canvas.width, height: canvas.height });
  if (!videoCodec) throw new Error(`Browser ini tidak bisa encode video ${format.toUpperCase()}.`);

  const target = new BufferTarget();
  const output = new Output({ format: new f.Ctor(), target });
  const video = new CanvasSource(canvas, { codec: videoCodec, bitrate: QUALITY_HIGH });
  output.addVideoTrack(video, { frameRate: fps });

  let audio = null;
  let audioCodec = null;
  if (audioBuffer) {
    audioCodec = await getFirstEncodableAudioCodec(f.audio, {
      numberOfChannels: audioBuffer.numberOfChannels,
      sampleRate: audioBuffer.sampleRate,
    });
    if (audioCodec) {
      audio = new AudioBufferSource({ codec: audioCodec, bitrate: 128_000 });
      output.addAudioTrack(audio);
    }
  }

  await output.start();
  try {
    const frames = Math.max(1, Math.round(totalDur * fps));
    for (let i = 0; i < frames; i++) {
      const t = i / fps;
      draw(Math.min(t, totalDur));
      await video.add(t, 1 / fps);
      if (i % 5 === 0) onProgress && onProgress((i / frames) * 0.95, 'Merender frame');
    }
    if (audio) {
      onProgress && onProgress(0.96, 'Menempelkan suara');
      await audio.add(audioBuffer);
    }
    onProgress && onProgress(0.98, 'Menutup file');
    await output.finalize();
    const blob = new Blob([target.buffer], { type: f.mime });
    const note = audioBuffer && !audio ? ' (audio tidak didukung, video tanpa suara)' : '';
    return { blob, ext: f.ext, mime: f.mime, codec: videoCodec, audioCodec: audio ? audioCodec : null, note };
  } catch (e) {
    try { await output.cancel(); } catch { /* biarkan */ }
    throw e;
  }
}

// Fallback lama: rekam kanvas realtime. Hanya video, tanpa audio.
async function exportWithRecorder({ canvas, draw, totalDur, fps, onProgress }) {
  if (typeof MediaRecorder === 'undefined') throw new Error('Browser tidak mendukung MediaRecorder.');
  const mimes = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
  const mime = mimes.find((m) => { try { return MediaRecorder.isTypeSupported(m); } catch { return false; } });
  if (!mime) throw new Error('Browser tidak mendukung perekaman WebM.');
  const stream = canvas.captureStream(fps);
  const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 5_000_000 });
  const chunks = [];
  rec.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
  const done = new Promise((res, rej) => { rec.onerror = () => rej(new Error('Gagal merekam.')); rec.onstop = res; });
  const t0 = performance.now();
  rec.start(250);
  await new Promise((resolve) => {
    function frame(now) {
      const el = (now - t0) / 1000;
      draw(Math.min(el, totalDur));
      onProgress && onProgress(el / totalDur, 'Merekam');
      if (el < totalDur + 0.15) requestAnimationFrame(frame);
      else resolve();
    }
    requestAnimationFrame(frame);
  });
  await new Promise((r) => setTimeout(r, 200));
  rec.stop();
  await done;
  stream.getTracks().forEach((t) => t.stop());
  return { blob: new Blob(chunks, { type: 'video/webm' }), ext: 'webm', mime: 'video/webm', codec: mime, audioCodec: null, note: ' (tanpa audio)' };
}

// API utama. format: 'mp4' | 'webm'. audioBuffer opsional (dari audio.js buildMix).
export async function exportVideo({ canvas, draw, totalDur, audioBuffer = null, format = 'mp4', fps = FPS, onProgress }) {
  try {
    return await exportWithCodecs({ canvas, draw, totalDur, fps, audioBuffer, format, onProgress });
  } catch (e) {
    if (format === 'webm' || !audioBuffer) {
      const r = await exportWithRecorder({ canvas, draw, totalDur, fps, onProgress }).catch(() => null);
      if (r) return { ...r, note: `${r.note || ''} (fallback MediaRecorder: ${e.message})` };
    }
    throw e;
  }
}

export function downloadBlob(blob, filename) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
}
