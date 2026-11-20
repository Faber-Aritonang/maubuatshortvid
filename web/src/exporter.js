// Exporter: rekam canvas + (opsional) audio jadi .webm via MediaRecorder standar.
// Tidak ada encoder proprietary / server render.

export function pickMime() {
  if (typeof MediaRecorder === 'undefined') return null;
  const cands = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
  ];
  return cands.find((c) => { try { return MediaRecorder.isTypeSupported(c); } catch { return false; } }) || null;
}

// Rekam canvas selama totalDur detik sambil memutar ulang draw(t) tiap frame.
// audioEl opsional: <audio> yang stream-nya ikut digabung.
export async function exportVideo({ canvas, audioEl, totalDur, draw, fps = 30, onProgress }) {
  const mime = pickMime();
  if (!mime) throw new Error('Browser tidak mendukung MediaRecorder WebM.');
  const canvasStream = canvas.captureStream(fps);
  const tracks = [...canvasStream.getVideoTracks()];
  if (audioEl && audioEl.captureStream) {
    try {
      const a = audioEl.captureStream().getAudioTracks();
      tracks.push(...a);
    } catch { /* abaikan: export bisu */ }
  }
  const rec = new MediaRecorder(new MediaStream(tracks), { mimeType: mime, videoBitsPerSecond: 5_000_000 });
  const chunks = [];
  rec.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
  const done = new Promise((res, rej) => {
    rec.onerror = () => rej(new Error('Gagal merekam.'));
    rec.onstop = res;
  });
  const t0 = performance.now();
  const durMs = totalDur * 1000;
  rec.start(250);
  await new Promise((resolve) => {
    function frame(now) {
      const el = (now - t0) / 1000;
      const t = Math.min(el, totalDur);
      draw(t);
      onProgress && onProgress(t / totalDur);
      if (el < durMs / 1000 + 0.15) requestAnimationFrame(frame);
      else resolve();
    }
    requestAnimationFrame(frame);
  });
  // beri ekor 200ms agar frame terakhir ikut
  await new Promise((r) => setTimeout(r, 200));
  rec.stop();
  await done;
  return new Blob(chunks, { type: 'video/webm' });
}

export function downloadBlob(blob, filename) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
}
