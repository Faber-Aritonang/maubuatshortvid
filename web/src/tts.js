// TTS via Web Speech API (tanpa API key) + estimasi word-timing merata.
// Di browser yang mendukung boundary events, timing diperbarui real-time;
// fallback: tiap kata = durasiScene / jumlahKata.

export function pickVoice(lang = 'id-ID') {
  const vs = window.speechSynthesis ? speechSynthesis.getVoices() : [];
  return (
    vs.find((v) => v.lang === lang) ||
    vs.find((v) => v.lang && v.lang.startsWith(lang.slice(0, 2))) ||
    vs.find((v) => v.lang && v.lang.startsWith('id')) ||
    vs[0] ||
    null
  );
}

// Bagi teks scene menjadi kata + estimasi waktu mulai per kata.
export function estimateWords(text, dur) {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const per = dur / words.length;
  return words.map((w, i) => ({ w, t: +(i * per).toFixed(3) }));
}

// Isi scene.words untuk semua scene bila kosong.
export function ensureTiming(project) {
  return {
    ...project,
    scenes: project.scenes.map((sc) => ({
      ...sc,
      words: sc.words && sc.words.length ? sc.words : estimateWords(sc.text, Number(sc.dur) || 4),
    })),
  };
}

// Ucapkan seluruh naskah berurutan. Kembalikan controller {stop()}.
export function speakAll(scenes, { rate = 1, onEnd } = {}) {
  if (!('speechSynthesis' in window)) {
    onEnd && onEnd();
    return { stop() {} };
  }
  speechSynthesis.cancel();
  const rateSafe = Math.max(0.5, Math.min(1.5, rate));
  scenes.forEach((sc, i) => {
    const u = new SpeechSynthesisUtterance(sc.text);
    const v = pickVoice();
    if (v) u.voice = v;
    u.lang = (v && v.lang) || 'id-ID';
    u.rate = rateSafe;
    if (i === scenes.length - 1 && onEnd) u.onend = onEnd;
    speechSynthesis.speak(u);
  });
  return { stop() { speechSynthesis.cancel(); } };
}

export function stopSpeak() {
  if ('speechSynthesis' in window) speechSynthesis.cancel();
}
