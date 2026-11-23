// MauBuatShortVid — server kecil (Node, tanpa dependensi)
//
// Dua tugas:
//   1) Proxy TTS: API key tetap di server, tidak pernah masuk bundle browser.
//   2) Sajikan hasil `npm run build` (folder ../dist) untuk mode produksi.
//
// Jalankan:  TTS_PROVIDER=openai OPENAI_API_KEY=sk-... node server/index.mjs
// Dev:       npm run dev (Vite) + npm run server (file ini) — Vite mem-proxy /api ke sini.

import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Pembaca .env mini (tanpa dependensi). Nilai yang sudah ada di environment menang.
function loadEnvFile(file) {
  try {
    for (const line of readFileSync(file, 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*?)\s*$/);
      if (!m) continue;
      let v = m[2];
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
      if (process.env[m[1]] === undefined) process.env[m[1]] = v;
    }
  } catch { /* file tidak ada: abaikan */ }
}
loadEnvFile(path.join(__dirname, '.env'));

const DIST = path.resolve(__dirname, '../web/dist');
const PORT = Number(process.env.PORT || 8787);

const MAX_CHARS = 1200;

// ---------- konfigurasi penyedia TTS ----------

const OPENAI_VOICES = ['alloy', 'ash', 'ballad', 'coral', 'echo', 'fable', 'nova', 'onyx', 'sage', 'shimmer', 'verse'];

function pickProvider() {
  const forced = (process.env.TTS_PROVIDER || '').toLowerCase();
  if (forced === 'openai' || forced === 'elevenlabs' || forced === 'none') return forced;
  if (process.env.OPENAI_API_KEY) return 'openai';
  if (process.env.ELEVENLABS_API_KEY) return 'elevenlabs';
  return 'none';
}

function providerInfo() {
  const provider = pickProvider();
  if (provider === 'openai') {
    return { provider, ready: true, voices: OPENAI_VOICES, defaultVoice: process.env.OPENAI_TTS_VOICE || 'alloy' };
  }
  if (provider === 'elevenlabs') {
    return {
      provider,
      ready: Boolean(process.env.ELEVENLABS_VOICE_ID),
      voices: process.env.ELEVENLABS_VOICE_ID ? [process.env.ELEVENLABS_VOICE_ID] : [],
      defaultVoice: process.env.ELEVENLABS_VOICE_ID || '',
    };
  }
  return { provider: 'none', ready: false, voices: [], defaultVoice: '' };
}

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, Number.isFinite(n) ? n : lo));

async function openaiSpeech({ text, voice, speed }) {
  const body = {
    model: process.env.OPENAI_TTS_MODEL || 'gpt-4o-mini-tts',
    voice: OPENAI_VOICES.includes(voice) ? voice : (process.env.OPENAI_TTS_VOICE || 'alloy'),
    input: text,
    response_format: 'mp3',
    speed: clamp(speed, 0.7, 1.3),
  };
  if (process.env.OPENAI_TTS_INSTRUCTIONS) body.instructions = process.env.OPENAI_TTS_INSTRUCTIONS;
  const base = (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');
  const res = await fetch(`${base}/audio/speech`, {
    method: 'POST',
    headers: { authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new HttpError(res.status === 401 ? 502 : 502, `OpenAI TTS gagal (${res.status}): ${detail.slice(0, 300)}`);
  }
  return { bytes: Buffer.from(await res.arrayBuffer()), contentType: 'audio/mpeg' };
}

async function elevenSpeech({ text, voice, speed }) {
  const voiceId = voice || process.env.ELEVENLABS_VOICE_ID;
  if (!voiceId) throw new HttpError(501, 'ELEVENLABS_VOICE_ID belum diisi.');
  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}?output_format=mp3_44100_128`,
    {
      method: 'POST',
      headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY, 'content-type': 'application/json' },
      body: JSON.stringify({ text, model_id: process.env.ELEVENLABS_MODEL || 'eleven_multilingual_v2' }),
    },
  );
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new HttpError(502, `ElevenLabs TTS gagal (${res.status}): ${detail.slice(0, 300)}`);
  }
  return { bytes: Buffer.from(await res.arrayBuffer()), contentType: 'audio/mpeg' };
}

class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

const synth = { openai: openaiSpeech, elevenlabs: elevenSpeech };

// ---------- LLM (ide dari topik) ----------

function pickLlmProvider() {
  const forced = (process.env.LLM_PROVIDER || '').toLowerCase();
  if (forced === 'anthropic' || forced === 'deepseek' || forced === 'none') return forced;
  if (process.env.ANTHROPIC_API_KEY) return 'anthropic';
  if (process.env.DEEPSEEK_API_KEY) return 'deepseek';
  return 'none';
}

function buildIdeaPrompt({ topic, duration, count, note }) {
  return [
    'Buat 4 ide video pendek dalam Bahasa Indonesia.',
    `Topik: ${topic || '(bebas, pilih topik menarik)'}`,
    `Durasi total: sekitar ${duration} detik. Setiap ide punya tepat ${count} kalimat narasi (scene).`,
    note ? `Kalimat penutup yang wajib dipakai sebagai scene terakhir: "${note}"` : '',
    'Balas HANYA dengan JSON valid, bentuk: {"ideas":[{"title":"...","desc":"...","tag":"...","lines":["...", "..."]}]}',
    'title: judul singkat (maks 60 karakter). desc: satu kalimat ringkas. tag: satu kata kategori. lines: narasi per scene, tiap kalimat maks 140 karakter, tanpa emoji.',
  ].filter(Boolean).join('\n');
}

async function callLlm(prompt) {
  const provider = pickLlmProvider();
  if (provider === 'anthropic') {
    const model = process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5';
    const base = (process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com').replace(/\/+$/, '');
    const url = /^https?:\/\//.test(base) ? base : `https://${base}`;
    const res = await fetch(`${url}/v1/messages`, {
      method: 'POST',
      headers: {
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ model, max_tokens: 2000, messages: [{ role: 'user', content: prompt }] }),
    });
    if (!res.ok) throw new HttpError(502, `Anthropic gagal (${res.status}): ${(await res.text().catch(() => '')).slice(0, 300)}`);
    const data = await res.json();
    return data.content?.find((part) => part.type === 'text')?.text || '';
  }
  if (provider === 'deepseek') {
    const model = process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash';
    const base = (process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com').replace(/\/$/, '');
    const res = await fetch(`${base}/chat/completions`, {
      method: 'POST',
      headers: { authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        max_tokens: 2000,
      }),
    });
    if (!res.ok) throw new HttpError(502, `DeepSeek gagal (${res.status}): ${(await res.text().catch(() => '')).slice(0, 300)}`);
    const data = await res.json();
    return data.choices?.[0]?.message?.content || '';
  }
  throw new HttpError(501, 'LLM belum dikonfigurasi di server. Set ANTHROPIC_API_KEY atau DEEPSEEK_API_KEY.');
}

function parseIdeaJson(text) {
  const match = String(text).match(/\{[\s\S]*\}/);
  if (!match) throw new HttpError(502, 'Jawaban LLM tidak berisi JSON.');
  let data;
  try { data = JSON.parse(match[0]); } catch { throw new HttpError(502, 'JSON dari LLM tidak valid.'); }
  const list = Array.isArray(data.ideas) ? data.ideas : [];
  const ideas = list
    .map((item) => ({
      title: String(item?.title || '').slice(0, 90),
      desc: String(item?.desc || '').slice(0, 180),
      tag: String(item?.tag || '').slice(0, 24),
      lines: (Array.isArray(item?.lines) ? item.lines : [])
        .map((line) => String(line || '').replace(/\s+/g, ' ').trim().slice(0, 140))
        .filter(Boolean)
        .slice(0, 6),
    }))
    .filter((item) => item.title && item.lines.length > 0)
    .slice(0, 4);
  if (!ideas.length) throw new HttpError(502, 'LLM tidak menghasilkan ide yang bisa dipakai.');
  return ideas;
}

// ---------- util HTTP ----------

function json(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'content-length': Buffer.byteLength(body) });
  res.end(body);
}

async function readJson(req, limit = 20_000) {
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit) throw new HttpError(413, 'Body terlalu besar.');
    chunks.push(chunk);
  }
  if (!size) return {};
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { throw new HttpError(400, 'JSON tidak valid.'); }
}

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon',
  '.woff2': 'font/woff2', '.mp4': 'video/mp4', '.webm': 'video/webm', '.mp3': 'audio/mpeg',
};

async function serveStatic(req, res, pathname) {
  const rel = decodeURIComponent(pathname === '/' ? '/index.html' : pathname);
  const target = path.resolve(DIST, '.' + rel);
  if (!target.startsWith(DIST)) return json(res, 403, { error: 'Terlarang.' });
  let file = target;
  try {
    const info = await stat(file);
    if (info.isDirectory()) file = path.join(file, 'index.html');
  } catch {
    file = path.join(DIST, 'index.html'); // fallback SPA
  }
  try {
    const data = await readFile(file);
    res.writeHead(200, {
      'content-type': MIME[path.extname(file)] || 'application/octet-stream',
      'cache-control': file.endsWith('index.html') ? 'no-cache' : 'public, max-age=31536000, immutable',
    });
    res.end(data);
  } catch {
    json(res, 404, { error: 'Tidak ditemukan. Jalankan `npm run build` dulu untuk mode produksi.' });
  }
}

// ---------- router ----------

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

  if (url.pathname === '/api/health') {
    const info = providerInfo();
    return json(res, 200, { ok: true, tts: info });
  }

  if (url.pathname === '/api/ideas') {
    if (req.method !== 'POST') return json(res, 405, { error: 'Gunakan POST.' });
    try {
      const { topic = '', duration = 30, note = '' } = await readJson(req);
      const target = clamp(Number(duration) || 30, 5, 90);
      const count = clamp(Math.round(target / 7), 3, 6);
      const text = await callLlm(buildIdeaPrompt({ topic: String(topic).slice(0, 200), duration: target, count, note: String(note).slice(0, 160) }));
      return json(res, 200, { ideas: parseIdeaJson(text), provider: pickLlmProvider() });
    } catch (e) {
      return json(res, e.status || 500, { error: e.message || 'Gagal membuat ide.' });
    }
  }

  if (url.pathname === '/api/tts') {
    if (req.method !== 'POST') return json(res, 405, { error: 'Gunakan POST.' });
    const info = providerInfo();
    if (info.provider === 'none') {
      return json(res, 501, {
        error: 'TTS belum dikonfigurasi di server.',
        need: 'Set OPENAI_API_KEY (atau ELEVENLABS_API_KEY + ELEVENLABS_VOICE_ID) lalu restart server.',
      });
    }
    try {
      const { text, voice = info.defaultVoice, speed = 1 } = await readJson(req);
      const clean = String(text || '').trim();
      if (!clean) throw new HttpError(400, 'Teks kosong.');
      if (clean.length > MAX_CHARS) throw new HttpError(400, `Maksimal ${MAX_CHARS} karakter per permintaan.`);
      const out = await synth[info.provider]({ text: clean, voice, speed });
      res.writeHead(200, { 'content-type': out.contentType, 'content-length': out.bytes.length, 'cache-control': 'no-store' });
      return res.end(out.bytes);
    } catch (e) {
      return json(res, e.status || 500, { error: e.message || 'Gagal membuat suara.' });
    }
  }

  if (url.pathname.startsWith('/api/')) return json(res, 404, { error: 'Endpoint tidak ada.' });
  if (req.method !== 'GET' && req.method !== 'HEAD') return json(res, 405, { error: 'Metode tidak didukung.' });
  return serveStatic(req, res, url.pathname);
});

server.listen(PORT, '127.0.0.1', () => {
  const info = providerInfo();
  console.log(`[server] http://127.0.0.1:${PORT} — TTS: ${info.provider}${info.ready ? '' : ' (belum siap)'}`);
  if (info.provider === 'none') {
    console.log('[server] Set OPENAI_API_KEY atau ELEVENLABS_API_KEY untuk mengaktifkan TTS.');
  }
});
