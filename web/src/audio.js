// Audio pipeline untuk TTS sungguhan:
//   teks scene -> mp3 (server) -> AudioBuffer -> satu mix sepanjang timeline.
// Mix inilah yang diputar untuk pratinjau dan dimasukkan ke file export,
// jadi suara di preview dan suara di video selalu identik.

import { synthesize } from './tts.js';
import { projectDuration, sceneStarts } from './renderer.js';

const SAMPLE_RATE = 48000;
const CHANNELS = 2;

let ctx = null;
let playing = null;
const cache = new Map(); // key -> { blob, buffer, url }

export function getAudioContext() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    ctx = new AC({ sampleRate: SAMPLE_RATE });
  }
  return ctx;
}

function keyOf(text, voice, speed) {
  return `${voice || 'default'}|${speed}|${String(text).trim()}`;
}

// Satu scene -> AudioBuffer. Hasil disimpan di cache supaya export tidak memanggil API dua kali.
export async function sceneAudio(text, { voice, speed = 1 } = {}) {
  const key = keyOf(text, voice, speed);
  if (cache.has(key)) return cache.get(key);
  const blob = await synthesize(text, { voice, speed });
  const buffer = await getAudioContext().decodeAudioData(await blob.arrayBuffer());
  const entry = { blob, buffer, url: URL.createObjectURL(blob) };
  cache.set(key, entry);
  return entry;
}

export function cachedAudio(text, opts = {}) {
  return cache.get(keyOf(text, opts.voice, opts.speed)) || null;
}

export function clearAudioCache() {
  for (const v of cache.values()) URL.revokeObjectURL(v.url);
  cache.clear();
}

// Bangun satu AudioBuffer gabungan: tiap scene ditempel di detik mulainya sendiri.
export async function buildMix(project, { voice, speed = 1, onProgress } = {}) {
  const scenes = project.scenes;
  const starts = sceneStarts(project);
  const parts = [];
  const missing = [];
  for (let i = 0; i < scenes.length; i++) {
    onProgress && onProgress(i / scenes.length, `Membuat suara scene ${i + 1}/${scenes.length}`);
    try {
      const { buffer } = await sceneAudio(scenes[i].text, { voice, speed });
      parts.push({ start: starts[i], buffer });
    } catch (e) {
      missing.push({ index: i, message: e.message });
    }
  }
  if (!parts.length) {
    const err = new Error(missing[0] ? missing[0].message : 'Tidak ada audio yang berhasil dibuat.');
    err.missing = missing;
    throw err;
  }
  onProgress && onProgress(0.9, 'Menyusun audio');
  const tail = Math.max(...parts.map((p) => p.start + p.buffer.duration));
  const total = Math.max(projectDuration(project), tail);
  const frames = Math.ceil(total * SAMPLE_RATE);
  const off = new OfflineAudioContext(CHANNELS, frames, SAMPLE_RATE);
  for (const p of parts) {
    const src = off.createBufferSource();
    src.buffer = p.buffer;
    src.connect(off.destination);
    src.start(p.start);
  }
  const buffer = await off.startRendering();
  onProgress && onProgress(1, 'Audio siap');
  return { buffer, missing, duration: buffer.duration };
}

// Putar mix dari detik offset tertentu. Kembalikan handle { stop() }.
export function playMix(buffer, { offset = 0, onEnd } = {}) {
  stopMix();
  const c = getAudioContext();
  if (c.state === 'suspended') c.resume();
  const src = c.createBufferSource();
  src.buffer = buffer;
  src.connect(c.destination);
  const at = Math.max(0, Math.min(offset, buffer.duration - 0.01));
  src.start(0, at);
  const handle = {
    stop() {
      try { src.stop(); } catch { /* sudah berhenti */ }
      src.disconnect();
      if (playing === handle) playing = null;
    },
  };
  src.onended = () => {
    if (playing === handle) playing = null;
    onEnd && onEnd();
  };
  playing = handle;
  return handle;
}

export function stopMix() {
  if (playing) playing.stop();
}

export function isPlayingMix() {
  return Boolean(playing);
}
