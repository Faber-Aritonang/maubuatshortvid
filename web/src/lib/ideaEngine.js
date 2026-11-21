/**
 * Local idea engine for the trial flow.
 *
 * This deliberately does not call an AI service. It turns a topic, target
 * duration, and optional closing note into short scene outlines. The same
 * prompt can be copied to an external AI, and its answer can be pasted back.
 */

const STORE_KEY = 'satset:idea-projects-v1';
const CURRENT_KEY = 'satset:idea-current-v1';

export const MAX_PROJECTS = 10;

export const DURATION_OPTIONS = [
  { value: 15, label: '15 dtk' },
  { value: 30, label: '30 dtk' },
  { value: 45, label: '45 dtk' },
  { value: 60, label: '60 dtk' },
  { value: 90, label: '90 dtk' },
];

export const STYLE_OPTIONS = [
  {
    id: 'auto',
    label: 'Otomatis',
    desc: 'Gaya dipilihkan dari ide yang paling cocok. Bisa diganti di studio.',
  },
  {
    id: 'bersih',
    label: 'Bersih',
    desc: 'Kotak dan karaoke dengan warna tenang. Aman untuk topik edukasi.',
  },
  {
    id: 'hangat',
    label: 'Hangat',
    desc: 'Stiker dan warna bumi yang ramah. Cocok untuk cerita dan jualan.',
  },
  {
    id: 'tegas',
    label: 'Tegas',
    desc: 'Neon dan kontras tinggi untuk hook yang ingin langsung terlihat.',
  },
];

export const SIZE_OPTIONS = [
  { id: '9:16', label: '9:16', ready: true },
  { id: '16:9', label: '16:9', ready: false },
  { id: '1:1', label: '1:1', ready: false },
  { id: '3:4', label: '3:4', ready: false },
];

export const SAMPLE_TOPICS = [
  'disiplin pagi',
  'jualan kue rumahan',
  'belajar bahasa Inggris',
  'skincare untuk pemula',
  'menabung untuk mahasiswa',
  'olahraga 10 menit',
];

const ACCENTS = ['orange', 'purple', 'teal', 'pink'];

const STYLE_SETS = {
  auto: ['karaoke', 'kotak', 'neon', 'stiker', 'kotak', 'karaoke'],
  bersih: ['kotak', 'karaoke', 'kotak', 'ketik', 'kotak', 'karaoke'],
  hangat: ['stiker', 'kotak', 'stiker', 'karaoke', 'stiker', 'kotak'],
  tegas: ['neon', 'pop', 'karaoke', 'neon', 'kotak', 'pop'],
};

const CAMERAS = ['push', 'pan-r', 'pull', 'static', 'pan-l', 'push'];
const TRANSITIONS = ['fade', 'slide', 'zoom', 'wipe', 'cut', 'fade'];
const HUES = [210, 160, 265, 15, 330, 190];

const FILLERS = [
  'Coba satu langkah kecil tadi, lalu lihat bedanya.',
  'Simpan video ini supaya nggak lupa.',
  'Kalau cocok, ulangi besok dengan versi yang lebih mudah.',
  'Mulai dari yang paling mungkin kamu lakukan hari ini.',
];

const ANGLES = [
  {
    key: 'masalah',
    tag: 'Paling gampang',
    title: (topic) => (topic ? `Mulai dari masalah: ${topic}` : 'Mulai dari satu masalah'),
    desc: 'Hook yang relate, satu masalah kecil, lalu solusi paling sederhana.',
    lines: (topic) =>
      topic
        ? [
            `Pernah merasa ${topic} bikin repot?`,
            'Ternyata masalahnya sering ada di satu kebiasaan kecil.',
            'Coba mulai dari langkah paling sederhana hari ini.',
            `Kalau diulang, ${topic} pelan-pelan jadi lebih ringan.`,
          ]
        : [
            'Pernah merasa stuck mulai sesuatu?',
            'Ternyata masalahnya sering ada di satu kebiasaan kecil.',
            'Coba mulai dari langkah paling sederhana hari ini.',
            'Kalau diulang, hasilnya pelan-pelan kelihatan.',
          ],
  },
  {
    key: 'langkah',
    tag: 'Banyak dipakai',
    title: (topic) => (topic ? `3 langkah ${topic} yang lebih gampang` : '3 langkah yang bisa dicoba hari ini'),
    desc: 'Format daftar yang cepat dipahami. Satu scene untuk setiap langkah.',
    lines: (topic) =>
      topic
        ? [
            `Tiga langkah kecil untuk ${topic}.`,
            'Pertama: tentukan satu target yang realistis.',
            'Kedua: kerjakan 10 menit saja, jangan menunggu semangat.',
            'Ketiga: catat hasilnya dan ulangi besok.',
          ]
        : [
            'Tiga langkah kecil yang bisa langsung kamu coba.',
            'Pertama: tentukan satu target yang realistis.',
            'Kedua: kerjakan 10 menit saja, jangan menunggu semangat.',
            'Ketiga: catat hasilnya dan ulangi besok.',
          ],
  },
  {
    key: 'cerita',
    tag: 'Cerita',
    title: (topic) => (topic ? `Sebelum vs sesudah: ${topic}` : 'Sebelum vs sesudah'),
    desc: 'Perubahan kecil yang terasa. Cocok untuk video yang lebih personal.',
    lines: (topic) =>
      topic
        ? [
            `Dulu, ${topic} terasa berat.`,
            'Lalu satu perubahan kecil dibuat.',
            'Sekarang prosesnya lebih ringan dan konsisten.',
            'Bedanya bukan bakat, tapi kebiasaan yang diulang.',
          ]
        : [
            'Dulu, ini terasa berat.',
            'Lalu satu perubahan kecil dibuat.',
            'Sekarang prosesnya lebih ringan dan konsisten.',
            'Bedanya bukan bakat, tapi kebiasaan yang diulang.',
          ],
  },
  {
    key: 'mitos',
    tag: 'Edukasi',
    title: (topic) => (topic ? `Mitos vs fakta soal ${topic}` : 'Mitos vs fakta'),
    desc: 'Bongkar satu anggapan yang bikin orang ragu untuk mulai.',
    lines: (topic) =>
      topic
        ? [
            `Mitos: ${topic} harus langsung sempurna.`,
            'Faktanya: mulai jelek dulu justru lebih cepat.',
            'Yang penting konsisten, bukan sempurna.',
            'Satu langkah kecil hari ini lebih berguna dari rencana besar.',
          ]
        : [
            'Mitos: semuanya harus langsung sempurna.',
            'Faktanya: mulai jelek dulu justru lebih cepat.',
            'Yang penting konsisten, bukan sempurna.',
            'Satu langkah kecil hari ini lebih berguna dari rencana besar.',
          ],
  },
];

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function cleanTopic(topic) {
  return String(topic || '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[.?!]+$/, '')
    .slice(0, 80);
}

function sceneCountFor(duration) {
  return clamp(Math.round((Number(duration) || 30) / 7), 3, 6);
}

function durationsFor(total, count) {
  const target = clamp(Number(total) || 30, 5, 90);
  const base = clamp(Math.floor(target / count), 2, 15);
  const durations = Array.from({ length: count }, () => base);
  let remaining = target - base * count;
  let index = 0;
  let guard = 0;

  while (remaining > 0 && guard < count * 20) {
    if (durations[index % count] < 15) {
      durations[index % count] += 1;
      remaining -= 1;
    }
    index += 1;
    guard += 1;
  }

  return durations;
}

function makeLines(angle, topic, note, count) {
  const lines = angle.lines(topic);
  const safeNote = String(note || '').replace(/\s+/g, ' ').trim().slice(0, 160);

  if (safeNote) {
    const next = lines.slice(0, Math.max(1, count - 1));
    while (next.length < count - 1) next.push(FILLERS[next.length % FILLERS.length]);
    next.push(safeNote);
    return next;
  }

  const next = [...lines];
  while (next.length < count) next.push(FILLERS[next.length % FILLERS.length]);
  return next.slice(0, count);
}

function makeScenes(lines, { duration, style, seed }) {
  const clean = lines
    .map((line) => String(line || '').replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .slice(0, 6);
  const durations = durationsFor(duration, clean.length);
  const styles = STYLE_SETS[style] || STYLE_SETS.auto;
  const offset = Number(seed) || 0;

  return clean.map((text, index) => ({
    id: newId('sc'),
    text,
    style: styles[index % styles.length],
    camera: CAMERAS[(index + offset) % CAMERAS.length],
    transition: TRANSITIONS[(index + offset) % TRANSITIONS.length],
    dur: durations[index],
    bg: HUES[(index + offset) % HUES.length],
    words: [],
  }));
}

function createIdeaFromLines(title, desc, lines, { duration, style, seed, tag }) {
  const scenes = makeScenes(lines, { duration, style, seed });
  if (!scenes.length) return null;

  return {
    id: newId('idea'),
    title: String(title || 'Ide baru').slice(0, 90),
    desc: String(desc || 'Ide dari jawaban yang kamu tempel.').slice(0, 180),
    tag: String(tag || 'Ide').slice(0, 24),
    accent: ACCENTS[(Number(seed) || 0) % ACCENTS.length],
    duration: scenes.reduce((sum, scene) => sum + (Number(scene.dur) || 0), 0),
    scenes,
    hook: scenes[0]?.text || '',
  };
}

export function newId(prefix = 'p') {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function generateIdeas({ topic, duration = 30, note = '', style = 'auto', seed = 0 }) {
  const safeTopic = cleanTopic(topic);
  const target = clamp(Number(duration) || 30, 5, 90);
  const count = sceneCountFor(target);
  const rotation = ((Number(seed) || 0) % ANGLES.length + ANGLES.length) % ANGLES.length;
  const ordered = ANGLES.slice(rotation).concat(ANGLES.slice(0, rotation));

  return ordered
    .slice(0, 4)
    .map((angle, index) => {
      const lines = makeLines(angle, safeTopic, note, count);
      return createIdeaFromLines(angle.title(safeTopic), angle.desc, lines, {
        duration: target,
        style,
        seed: rotation + index,
        tag: angle.tag,
      });
    })
    .filter(Boolean);
}

export function buildPrompt({ topic, duration = 30, note = '', style = 'auto' }) {
  const safeTopic = cleanTopic(topic);
  const selectedStyle = STYLE_OPTIONS.find((item) => item.id === style) || STYLE_OPTIONS[0];

  return [
    'Bantu saya menyusun ide video pendek berbahasa Indonesia.',
    `Topik: ${safeTopic || 'bebas'}.`,
    `Target durasi: ${duration} detik.`,
    `Gaya visual: ${selectedStyle.label}.`,
    note ? `Catatan atau ajakan penutup: ${String(note).trim()}.` : 'Tidak ada catatan penutup khusus.',
    '',
    'Balas hanya dengan JSON array, tanpa markdown dan tanpa penjelasan tambahan.',
    'Format setiap item:',
    '{"title":"judul ide","desc":"penjelasan singkat","scenes":["kalimat scene 1","kalimat scene 2"]}',
    'Buat 4 ide. Setiap ide berisi 3 sampai 6 scene. Setiap scene maksimal 18 kata.',
  ].join('\n');
}

export function parseIdeaAnswer(text, { duration = 30, style = 'auto' } = {}) {
  const raw = String(text || '').trim();
  if (!raw) return [];

  let parsed = null;
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = null;
  }

  if (parsed) {
    const items = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed.ideas)
        ? parsed.ideas
        : Array.isArray(parsed.scenes)
          ? [parsed]
          : [];

    const fromJson = items
      .map((item, index) => {
        if (!item || typeof item !== 'object') return null;
        const title = String(item.title || item.judul || `Ide ${index + 1}`).trim();
        const desc = String(item.desc || item.description || item.penjelasan || 'Ide dari jawaban yang kamu tempel.').trim();
        const rawScenes = Array.isArray(item.scenes)
          ? item.scenes
          : Array.isArray(item.lines)
            ? item.lines
            : [];
        const lines = rawScenes
          .map((scene) => (typeof scene === 'string' ? scene : scene && scene.text))
          .filter(Boolean);
        return createIdeaFromLines(title, desc, lines, {
          duration,
          style,
          seed: index + 1,
          tag: 'Tempelan',
        });
      })
      .filter(Boolean);

    if (fromJson.length) return fromJson.slice(0, 6);
  }

  const blocks = raw
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean);

  return blocks
    .slice(0, 6)
    .map((block, index) => {
      const lines = block
        .split('\n')
        .map((line) => line.replace(/^\s*[-*•]\s*/, '').trim())
        .filter(Boolean);
      const title = lines.shift() || `Ide ${index + 1}`;
      return createIdeaFromLines(title, 'Ide dari jawaban yang kamu tempel.', lines, {
        duration,
        style,
        seed: index + 1,
        tag: 'Tempelan',
      });
    })
    .filter(Boolean);
}

export function projectStats(project) {
  const scenes = Array.isArray(project?.scenes) ? project.scenes : [];
  return {
    sceneCount: scenes.length,
    duration: scenes.reduce((sum, scene) => sum + (Number(scene?.dur) || 0), 0),
  };
}

export function formatDuration(seconds) {
  const value = Math.max(0, Math.round(Number(seconds) || 0));
  return `${value} dtk`;
}

export function relativeTime(timestamp) {
  const diff = Date.now() - (Number(timestamp) || 0);
  if (diff < 60 * 1000) return 'baru saja';
  if (diff < 60 * 60 * 1000) return `${Math.floor(diff / (60 * 1000))} mnt lalu`;
  if (diff < 24 * 60 * 60 * 1000) return `${Math.floor(diff / (60 * 60 * 1000))} j lalu`;
  return `${Math.floor(diff / (24 * 60 * 60 * 1000))} hr lalu`;
}

function normalizeProject(project) {
  if (!project || typeof project !== 'object') return null;
  const scenes = Array.isArray(project.scenes)
    ? project.scenes.filter((scene) => scene && typeof scene.text === 'string')
    : [];

  return {
    id: String(project.id || newId('p')),
    title: String(project.title || 'Proyek tanpa judul').slice(0, 80),
    scenes,
    ideas: Array.isArray(project.ideas) ? project.ideas : [],
    ideaTitle: String(project.ideaTitle || ''),
    topic: String(project.topic || ''),
    duration: clamp(Number(project.duration) || 30, 5, 90),
    note: String(project.note || ''),
    style: STYLE_OPTIONS.some((item) => item.id === project.style) ? project.style : 'auto',
    updatedAt: Number(project.updatedAt) || Date.now(),
  };
}

export function loadIdeaProjects() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORE_KEY) || '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(normalizeProject)
      .filter(Boolean)
      .slice(0, MAX_PROJECTS);
  } catch {
    return [];
  }
}

export function saveIdeaProjects(projects) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(projects.slice(0, MAX_PROJECTS)));
  } catch {
    /* localStorage can be blocked; the page still works for this visit */
  }
}

export function loadIdeaCurrentId() {
  try {
    return localStorage.getItem(CURRENT_KEY) || null;
  } catch {
    return null;
  }
}

export function saveIdeaCurrentId(id) {
  try {
    if (id) localStorage.setItem(CURRENT_KEY, id);
  } catch {
    /* localStorage can be blocked; the page still works for this visit */
  }
}

export function downloadProjectJson(project) {
  const payload = {
    version: 1,
    title: project.title,
    ideaTitle: project.ideaTitle || '',
    scenes: project.scenes,
  };
  const slug = String(project.title || 'proyek')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'proyek';
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${slug}.json`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
