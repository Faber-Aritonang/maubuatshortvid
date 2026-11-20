import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CANVAS_W, CANVAS_H, drawProject, projectDuration, sceneAt } from './renderer.js';
import { STYLES, CAMERAS, TRANSITIONS } from './styles.js';
import { ensureTiming, speakAll, stopSpeak, ttsStatus } from './tts.js';
import { exportVideo, downloadBlob, probeExportSupport } from './exporter.js';
import { buildMix, cachedAudio, playMix, stopMix } from './audio.js';
import { isCloudConfigured, saveProject, listProjects, loadProject } from './cloud.js';

const HUES = [210, 160, 265, 15, 330, 190];

function blankScene(i) {
  return {
    text: i === 0 ? 'Tulis naskah videomu di sini' : `Scene ${i + 1}: satu ide, satu kalimat`,
    style: 'kotak',
    camera: 'push',
    transition: 'fade',
    dur: 4,
    bg: HUES[i % HUES.length],
    words: [],
  };
}

function demoProject() {
  const scenes = [blankScene(0), blankScene(1), blankScene(2)];
  scenes[0].text = 'Punya 30 detik? Ubah jadi video pendek yang rapi';
  scenes[0].style = 'karaoke';
  scenes[1].text = 'Tulis naskah, dengarkan suara, lalu export sekali klik';
  scenes[1].style = 'kotak';
  scenes[1].camera = 'pan-r';
  scenes[2].text = 'Semua render di browser. Gratis dan open source';
  scenes[2].style = 'neon';
  scenes[2].camera = 'pull';
  return ensureTiming({ version: 1, scenes });
}

export default function App() {
  const [project, setProject] = useState(demoProject);
  const [title, setTitle] = useState('Video pertamaku');
  const [sel, setSel] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [busy, setBusy] = useState('');
  const [progress, setProgress] = useState(0);
  const [rate, setRate] = useState(1);
  const [tts, setTts] = useState({ provider: 'none', ready: false, voices: [], defaultVoice: '' });
  const [voice, setVoice] = useState('');
  const [voiceMsg, setVoiceMsg] = useState('');
  const [mixDur, setMixDur] = useState(0);
  const [format, setFormat] = useState('mp4');
  const [withAudio, setWithAudio] = useState(true);
  const [support, setSupport] = useState(null);
  const [result, setResult] = useState('');
  const [cloud, setCloud] = useState({ configured: isCloudConfigured(), msg: '', list: [], id: null });
  const canvasRef = useRef(null);
  const rafRef = useRef(0);
  const t0Ref = useRef(0);
  const mixRef = useRef(null);

  const total = useMemo(() => projectDuration(project), [project]);
  const cur = sceneAt(project, Math.min(time, Math.max(0, total - 0.001)));

  // Identitas audio: berubah kalau naskah/durasi/suara/kecepatan berubah.
  const mixKey = useMemo(
    () => JSON.stringify({ v: voice, s: rate, sc: project.scenes.map((s) => [s.text, s.dur]) }),
    [project, voice, rate],
  );

  // gambar ulang tiap ada perubahan waktu/project
  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    drawProject(ctx, project, time);
  }, [project, time]);

  // status TTS + dukungan export browser
  useEffect(() => {
    ttsStatus().then((s) => {
      setTts(s);
      setVoice(s.defaultVoice || s.voices[0] || '');
    });
    probeExportSupport(CANVAS_W, CANVAS_H).then(setSupport).catch(() => setSupport(null));
  }, []);

  // audio lama tidak berlaku lagi kalau naskah berubah
  useEffect(() => {
    if (mixRef.current && mixRef.current.key !== mixKey) {
      mixRef.current = null;
      setMixDur(0);
      stopMix();
    }
  }, [mixKey]);

  // loop preview
  useEffect(() => {
    if (!playing) return;
    t0Ref.current = performance.now() - time * 1000;
    function frame(now) {
      const t = (now - t0Ref.current) / 1000;
      if (t >= total) {
        setTime(0);
        t0Ref.current = now;
        if (mixRef.current) playMix(mixRef.current.buffer, { offset: 0, onEnd: () => setPlaying(false) });
      } else setTime(t);
      rafRef.current = requestAnimationFrame(frame);
    }
    rafRef.current = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafRef.current);
  }, [playing, total]); // eslint-disable-line

  function patchScene(i, patch) {
    setProject((p) => {
      const scenes = p.scenes.map((s, k) => (k === i ? { ...s, ...patch } : s));
      return ensureTiming({ ...p, scenes });
    });
  }

  function addScene() {
    if (project.scenes.length >= 6) return;
    setProject((p) => ensureTiming({ ...p, scenes: [...p.scenes, blankScene(p.scenes.length)] }));
    setSel(project.scenes.length);
  }

  function removeScene(i) {
    if (project.scenes.length <= 1) return;
    setProject((p) => ensureTiming({ ...p, scenes: p.scenes.filter((_, k) => k !== i) }));
    setSel(0);
    setTime(0);
  }

  function togglePlay() {
    if (playing) {
      setPlaying(false);
      stopMix();
      return;
    }
    if (mixRef.current) playMix(mixRef.current.buffer, { offset: time, onEnd: () => setPlaying(false) });
    setPlaying(true);
  }

  function restart() {
    setTime(0);
    if (mixRef.current) playMix(mixRef.current.buffer, { offset: 0, onEnd: () => setPlaying(false) });
    else stopMix();
  }

  async function makeVoice() {
    if (!tts.ready) {
      setVoiceMsg('TTS server belum aktif. Jalankan `npm run server` dengan OPENAI_API_KEY (lihat README).');
      return;
    }
    setBusy('Menyiapkan suara');
    setVoiceMsg('');
    stopMix();
    try {
      const timed = ensureTiming(project);
      setProject(timed);
      const { buffer, missing, duration } = await buildMix(timed, {
        voice, speed: rate,
        onProgress: (p, label) => setVoiceMsg(label),
      });
      mixRef.current = { buffer, key: mixKey };
      setMixDur(duration);
      setVoiceMsg(
        `Suara siap (${duration.toFixed(1)} dtk).` +
        (missing.length ? ` ${missing.length} scene gagal: ${missing[0].message}` : ''),
      );
    } catch (e) {
      setVoiceMsg(e.message);
    } finally {
      setBusy('');
    }
  }

  function previewVoice() {
    stopMix();
    setPlaying(false);
    speakAll(project.scenes, { rate });
  }

  async function handleExport() {
    const cv = canvasRef.current;
    if (!cv) return;
    setBusy('Menyiapkan');
    setProgress(0);
    setResult('');
    setPlaying(false);
    stopMix();
    stopSpeak();
    try {
      const timed = ensureTiming(project);
      setProject(timed);
      const ctx = cv.getContext('2d');
      let audioBuffer = null;
      if (withAudio && tts.ready) {
        if (mixRef.current) audioBuffer = mixRef.current.buffer;
        else {
          const built = await buildMix(timed, { voice, speed: rate });
          audioBuffer = built.buffer;
          mixRef.current = { buffer: built.buffer, key: mixKey };
          setMixDur(built.duration);
        }
      }
      const totalDur = Math.max(projectDuration(timed), audioBuffer ? audioBuffer.duration : 0);
      const res = await exportVideo({
        canvas: cv,
        draw: (t) => drawProject(ctx, timed, t),
        totalDur,
        audioBuffer,
        format,
        onProgress: (p, label) => { setProgress(p); setBusy(label); },
      });
      downloadBlob(res.blob, `shortvid.${res.ext}`);
      setResult(
        `${res.ext.toUpperCase()} · ${(res.blob.size / 1048576).toFixed(2)} MB · ${res.codec}` +
        (res.audioCodec ? ` + ${res.audioCodec}` : '') + (res.note || ''),
      );
      setBusy('');
      drawProject(ctx, timed, time); // kembalikan pratinjau ke posisi playhead, bukan frame terakhir export
    } catch (e) {
      setBusy('');
      setResult('Gagal: ' + e.message);
    }
  }

  function exportJSON() {
    downloadBlob(new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' }), 'project.json');
  }

  function importJSON(e) {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    f.text().then((t) => {
      try {
        const p = JSON.parse(t);
        if (!Array.isArray(p.scenes) || !p.scenes.length) throw new Error('bad');
        setProject(ensureTiming({ version: 1, scenes: p.scenes.slice(0, 6) }));
        setSel(0);
        setTime(0);
      } catch {
        alert('File project tidak valid.');
      }
    });
    e.target.value = '';
  }

  async function handleCloudSave() {
    setCloud((c) => ({ ...c, msg: 'Menyimpan…' }));
    try {
      const timed = ensureTiming(project);
      const blobs = [];
      timed.scenes.forEach((sc, i) => {
        const hit = cachedAudio(sc.text, { voice, speed: rate });
        if (hit) blobs.push({ index: i, blob: hit.blob });
      });
      const { id } = await saveProject({
        title, project: timed, audioBlobs: blobs, cloudId: cloud.id,
        onProgress: (p, label) => setCloud((c) => ({ ...c, msg: label })),
      });
      setCloud((c) => ({ ...c, id, msg: `Tersimpan${blobs.length ? ` + ${blobs.length} audio` : ''} · ${id.slice(0, 8)}` }));
    } catch (e) {
      setCloud((c) => ({ ...c, msg: e.message }));
    }
  }

  async function handleCloudList() {
    setCloud((c) => ({ ...c, msg: 'Memuat daftar…' }));
    try {
      const list = await listProjects();
      setCloud((c) => ({ ...c, list, msg: list.length ? '' : 'Belum ada project tersimpan.' }));
    } catch (e) {
      setCloud((c) => ({ ...c, msg: e.message }));
    }
  }

  async function handleCloudOpen(id) {
    try {
      const row = await loadProject(id);
      setProject(ensureTiming({ version: 1, scenes: row.payload.scenes.slice(0, 6) }));
      setTitle(row.title);
      setCloud((c) => ({ ...c, id, list: [], msg: `Dibuka: ${row.title}` }));
      setSel(0);
      setTime(0);
    } catch (e) {
      setCloud((c) => ({ ...c, msg: e.message }));
    }
  }

  const s = project.scenes[Math.min(sel, project.scenes.length - 1)];
  const mp4ok = !support || support.mp4.ok;
  const exportLabel = busy
    ? `${busy} ${Math.round(progress * 100)}%`
    : `Export ${format.toUpperCase()}${withAudio && mixDur ? ' (dengan suara)' : ''}`;

  return (
    <div className="wrap">
      <header className="top">
        <div>
          <h1>MauBuatShortVid <span className="tag">v0.2 prototype</span></h1>
          <p className="sub">Naskah → Suara TTS → Subtitle → Animasi → Export MP4. Render 100% di browser.</p>
        </div>
        <div className="topbtn">
          <button onClick={exportJSON}>Simpan JSON</button>
          <label className="filebtn">Buka JSON<input type="file" accept=".json" hidden onChange={importJSON} /></label>
        </div>
      </header>

      <main className="grid">
        <section className="stage">
          <canvas ref={canvasRef} width={CANVAS_W} height={CANVAS_H} />
          <div className="transport">
            <button onClick={togglePlay} className="primary">{playing ? 'Jeda' : 'Putar'}</button>
            <button onClick={restart}>Ulangi</button>
            <button onClick={previewVoice} title="Pratinjau cepat memakai suara bawaan browser">Suara browser</button>
            <span className="t">{time.toFixed(1)}s / {total.toFixed(1)}s</span>
          </div>
          <input
            type="range" min="0" max={total} step="0.05" value={time}
            onChange={(e) => { setPlaying(false); stopMix(); setTime(Number(e.target.value)); }}
            className="seek"
          />
          <div className="row" style={{ marginTop: 10 }}>
            <button onClick={makeVoice} disabled={!!busy || !tts.ready} className="primary" style={{ flex: 2 }}>
              {busy === 'Menyiapkan suara' ? 'Membuat suara…' : 'Buat suara TTS'}
            </button>
            <select value={voice} onChange={(e) => setVoice(e.target.value)} disabled={!tts.ready} style={{ flex: 2 }}>
              {(tts.voices.length ? tts.voices : [voice || 'default']).map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
          <p className="hint">
            {tts.ready
              ? `TTS aktif (${tts.provider}). ${mixDur ? `Audio timeline ${mixDur.toFixed(1)} dtk.` : 'Tekan "Buat suara TTS" untuk menyiapkan narasi.'}`
              : 'TTS sungguhan butuh server: jalankan `npm run server` dengan OPENAI_API_KEY. Tanpa itu, pakai "Suara browser".'}
            {voiceMsg ? ' ' + voiceMsg : ''}
          </p>
          <div className="row" style={{ marginTop: 8 }}>
            <select value={format} onChange={(e) => setFormat(e.target.value)} style={{ flex: 1 }}>
              <option value="mp4" disabled={!mp4ok}>MP4 (H.264)</option>
              <option value="webm">WebM (VP9)</option>
            </select>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--mut)' }}>
              <input type="checkbox" checked={withAudio} onChange={(e) => setWithAudio(e.target.checked)} />
              sertakan suara
            </label>
          </div>
          <button onClick={handleExport} disabled={!!busy} className="export">{exportLabel}</button>
          <p className="hint">
            {support && !mp4ok && 'Browser ini tidak bisa encode H.264; pakai WebM. '}
            {format === 'mp4' && support && support.mp4.ok && !support.mp4.audio &&
              'Audio AAC tidak tersedia di browser ini, audio MP4 memakai Opus (VLC/Chrome bisa memutar). '}
            {result}
          </p>
        </section>

        <section className="panel">
          <div className="scenelist">
            {project.scenes.map((sc, i) => (
              <button key={i} className={i === sel ? 'sc active' : 'sc'} onClick={() => { setSel(i); }}>
                {i + 1}. {sc.text.slice(0, 28) || '(kosong)'}
              </button>
            ))}
            <div className="row">
              <button onClick={addScene} disabled={project.scenes.length >= 6}>+ Scene</button>
              <button onClick={() => removeScene(sel)} disabled={project.scenes.length <= 1}>Hapus</button>
            </div>
          </div>

          <label>Naskah scene {sel + 1}</label>
          <textarea value={s.text} rows={3} onChange={(e) => patchScene(sel, { text: e.target.value })} />

          <div className="row3">
            <div>
              <label>Gaya subtitle</label>
              <select value={s.style} onChange={(e) => patchScene(sel, { style: e.target.value })}>
                {STYLES.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
              </select>
            </div>
            <div>
              <label>Kamera</label>
              <select value={s.camera} onChange={(e) => patchScene(sel, { camera: e.target.value })}>
                {CAMERAS.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
              </select>
            </div>
            <div>
              <label>Transisi</label>
              <select value={s.transition} onChange={(e) => patchScene(sel, { transition: e.target.value })}>
                {TRANSITIONS.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
              </select>
            </div>
          </div>

          <div className="row3">
            <div>
              <label>Durasi (detik)</label>
              <input type="number" min="2" max="15" value={s.dur} onChange={(e) => patchScene(sel, { dur: Math.max(2, Math.min(15, Number(e.target.value) || 4)) })} />
            </div>
            <div>
              <label>Warna latar</label>
              <input type="range" min="0" max="360" value={s.bg} onChange={(e) => patchScene(sel, { bg: Number(e.target.value) })} />
            </div>
            <div>
              <label>Kecepatan suara</label>
              <input type="range" min="0.7" max="1.3" step="0.05" value={rate} onChange={(e) => setRate(Number(e.target.value))} />
            </div>
          </div>

          <p className="hint">Scene aktif: {cur.index + 1} · {cur.scene.style} · {cur.scene.camera} · {cur.scene.transition}</p>

          <hr style={{ border: 0, borderTop: '1px solid var(--line)', width: '100%' }} />
          <label>Cloud (Supabase)</label>
          {cloud.configured ? (
            <>
              <input
                value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Judul project"
                style={{ width: '100%', background: '#0f1220', color: 'var(--txt)', border: '1px solid var(--line)', borderRadius: 8, padding: 8 }}
              />
              <div className="row">
                <button onClick={handleCloudSave}>Simpan ke cloud</button>
                <button onClick={handleCloudList}>Daftar project</button>
              </div>
              {cloud.list.length > 0 && (
                <div className="scenelist">
                  {cloud.list.map((p) => (
                    <button key={p.id} className="sc" onClick={() => handleCloudOpen(p.id)}>
                      {p.title} · {new Date(p.updated_at).toLocaleString('id-ID')}
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : (
            <p className="hint">
              Belum dikonfigurasi. Isi <code>VITE_SUPABASE_URL</code> dan <code>VITE_SUPABASE_ANON_KEY</code> di
              <code> web/.env.local</code>, lalu restart dev server.
            </p>
          )}
          {cloud.msg && <p className="hint">{cloud.msg}</p>}
        </section>
      </main>

      <footer className="foot">Clean-room prototype. Semua teks, gaya, dan kode ditulis ulang dari nol.</footer>
    </div>
  );
}
