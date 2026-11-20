import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CANVAS_W, CANVAS_H, drawProject, projectDuration, sceneAt } from './renderer.js';
import { STYLES, CAMERAS, TRANSITIONS } from './styles.js';
import { ensureTiming, speakAll, stopSpeak } from './tts.js';
import { exportVideo, downloadBlob } from './exporter.js';

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
  const [sel, setSel] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [busy, setBusy] = useState('');
  const [progress, setProgress] = useState(0);
  const [rate, setRate] = useState(1);
  const canvasRef = useRef(null);
  const rafRef = useRef(0);
  const t0Ref = useRef(0);

  const total = useMemo(() => projectDuration(project), [project]);
  const cur = sceneAt(project, Math.min(time, Math.max(0, total - 0.001)));

  // gambar ulang tiap ada perubahan waktu/project
  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    drawProject(ctx, project, time);
  }, [project, time]);

  // loop preview
  useEffect(() => {
    if (!playing) return;
    t0Ref.current = performance.now() - time * 1000;
    function frame(now) {
      const t = (now - t0Ref.current) / 1000;
      if (t >= total) {
        setTime(0);
        t0Ref.current = now;
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

  function previewVoice() {
    stopSpeak();
    speakAll(project.scenes, { rate });
  }

  async function handleExport() {
    const cv = canvasRef.current;
    if (!cv) return;
    setBusy('Merekam...');
    setProgress(0);
    setPlaying(false);
    stopSpeak();
    try {
      const timed = ensureTiming(project);
      setProject(timed);
      const ctx = cv.getContext('2d');
      const blob = await exportVideo({
        canvas: cv,
        audioEl: null, // v0.1: export bisu + putar TTS manual bila perlu
        totalDur: projectDuration(timed),
        draw: (t) => drawProject(ctx, timed, t),
        onProgress: setProgress,
      });
      downloadBlob(blob, 'shortvid.webm');
      setBusy('');
    } catch (e) {
      setBusy('');
      alert(e.message);
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

  const s = project.scenes[Math.min(sel, project.scenes.length - 1)];

  return (
    <div className="wrap">
      <header className="top">
        <div>
          <h1>MauBuatShortVid <span className="tag">v0.1 prototype</span></h1>
          <p className="sub">Naskah → Suara → Subtitle → Animasi → Export. Render 100% di browser.</p>
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
            <button onClick={() => { setPlaying(!playing); }} className="primary">{playing ? 'Jeda' : 'Putar'}</button>
            <button onClick={() => setTime(0)}>Ulangi</button>
            <button onClick={previewVoice}>Dengarkan suara</button>
            <span className="t">{time.toFixed(1)}s / {total.toFixed(1)}s</span>
          </div>
          <input
            type="range" min="0" max={total} step="0.05" value={time}
            onChange={(e) => { setPlaying(false); setTime(Number(e.target.value)); }}
            className="seek"
          />
          <button onClick={handleExport} disabled={!!busy} className="export">
            {busy ? `Merekam ${Math.round(progress * 100)}%…` : 'Export video (.webm)'}
          </button>
          <p className="hint">Butuh MP4? Jalankan: <code>ffmpeg -i shortvid.webm -c:v libx264 -pix_fmt yuv420p -c:a aac out.mp4</code></p>
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
        </section>
      </main>

      <footer className="foot">Clean-room prototype. Semua teks, gaya, dan kode ditulis ulang dari nol.</footer>
    </div>
  );
}
