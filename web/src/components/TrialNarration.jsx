import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import TrialHeader from './TrialHeader.jsx';
import {
  MAX_PROJECTS,
  buildPrompt,
  downloadProjectJson,
  parseIdeaAnswer,
  formatDuration,
  loadIdeaProjects,
  newId,
  projectStats,
  relativeTime,
  saveIdeaCurrentId,
  saveIdeaProjects,
  scenesFromNarration,
} from '../lib/ideaEngine.js';
import './trial.css';
import './trial-idea.css';

const DURATION_CHOICES = [
  { value: 120, label: '2 mnt' },
  { value: 180, label: '3 mnt' },
  { value: 300, label: '5 mnt' },
  { value: 480, label: '8 mnt' },
  { value: 600, label: '10 mnt' },
];

const STEPS = ['1. Ide', '2. Narasi', '3. Suara', '4. Animasi'];

export default function TrialNarration() {
  const navigate = useNavigate();
  const location = useLocation();
  const [projects, setProjects] = useState(() => loadIdeaProjects());
  const [currentId, setCurrentId] = useState(() => location.state?.projectId || newId('p'));
  const [query, setQuery] = useState('');
  const [narration, setNarration] = useState('');
  const [duration, setDuration] = useState(120);
  const [scenes, setScenes] = useState([]);
  const [status, setStatus] = useState('');
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [pasteError, setPasteError] = useState('');
  const importRef = useRef(null);

  const projectTitle = location.state?.projectTitle || 'Video pertamaku';
  const visibleProjects = projects.filter((project) =>
    project.title.toLowerCase().includes(query.trim().toLowerCase()),
  );

  useEffect(() => {
    saveIdeaProjects(projects);
  }, [projects]);

  useEffect(() => {
    saveIdeaCurrentId(currentId);
  }, [currentId]);

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setNarration(text);
      setStatus('');
    } catch {
      setStatus('Clipboard tidak bisa dibaca. Tulis langsung di kotak narasi.');
    }
  };

  const handleNewProject = () => {
    setCurrentId(newId('p'));
    setNarration('');
    setScenes([]);
    setStatus('');
  };

  const handleCopyPrompt = async () => {
    const prompt = buildPrompt({ topic: narration, duration, note: '', style: 'auto' });
    try {
      if (!navigator.clipboard || !navigator.clipboard.writeText) throw new Error('clipboard');
      await navigator.clipboard.writeText(prompt);
      setStatus('Prompt disalin. Tempel ke AI favoritmu, lalu klik Tempel jawaban.');
    } catch {
      setStatus('Clipboard tidak tersedia di browser ini.');
    }
  };

  const handlePasteSubmit = () => {
    try {
      const next = parseIdeaAnswer(pasteText, { duration, style: 'auto' });
      if (!next.length) {
        setPasteError('Jawaban belum bisa dibaca. Tempel JSON array atau teks biasa.');
        return;
      }
      const first = next[0];
      setScenes(first.scenes.map((scene) => ({ ...scene })));
      setPasteOpen(false);
      setPasteText('');
      setPasteError('');
      setStatus(`${first.scenes.length} scene dari jawaban yang kamu tempel.`);
    } catch {
      setPasteError('Jawaban belum bisa dibaca. Coba tempel ulang sebagai JSON atau teks biasa.');
    }
  };

  const handleImport = async (event) => {
    const file = event.target.files && event.target.files[0];
    event.target.value = '';
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      const rawScenes = Array.isArray(data.scenes) ? data.scenes : Array.isArray(data) ? data : [];
      const imported = rawScenes
        .filter((scene) => scene && typeof scene.text === 'string')
        .slice(0, 6);
      if (!imported.length) throw new Error('File tidak punya scene yang valid.');
      const title = data.title || file.name.replace(/\.json$/i, '') || 'Proyek impor';
      const project = {
        id: newId('p'),
        title,
        scenes: imported,
        ideaTitle: String(data.ideaTitle || ''),
        topic: '',
        duration,
        note: '',
        style: 'auto',
        ideas: [],
        updatedAt: Date.now(),
      };
      setProjects((list) => [project, ...list].slice(0, MAX_PROJECTS));
      setCurrentId(project.id);
      setScenes(imported);
      setStatus(`Proyek "${title}" diimpor.`);
    } catch (error) {
      setStatus(`Impor gagal: ${error.message}`);
    }
  };

  const handleDeleteProject = (project) => {
    if (!window.confirm(`Hapus proyek "${project.title}"?`)) return;
    const next = projects.filter((item) => item.id !== project.id);
    setProjects(next);
    saveIdeaProjects(next);
    if (project.id === currentId) {
      setCurrentId(newId('p'));
      setNarration('');
      setScenes([]);
    }
    setStatus(`Proyek "${project.title}" dihapus.`);
  };

  const handleExportProject = (project) => {
    if (!project.scenes || !project.scenes.length) {
      setStatus('Proyek ini belum punya scene.');
      return;
    }
    downloadProjectJson(project);
    setStatus(`JSON "${project.title}" diunduh.`);
  };

  const handleSplit = () => {
    const { scenes: next, total } = scenesFromNarration(narration, { duration });
    if (!next.length) {
      setStatus('Tulis narasimu dulu.');
      return;
    }
    setScenes(next);
    setStatus(`${total} kalimat dipecah jadi ${next.length} scene.`);
  };

  const handleOpenStudio = () => {
    if (!scenes.length) return;
    const project = {
      id: currentId,
      title: projectTitle,
      scenes,
      ideaTitle: '',
      topic: '',
      duration,
      note: '',
      style: 'auto',
      ideas: [],
      updatedAt: Date.now(),
    };
    const next = [project, ...projects.filter((item) => item.id !== currentId)].slice(0, MAX_PROJECTS);
    setProjects(next);
    saveIdeaProjects(next);
    saveIdeaCurrentId(currentId);
    navigate('/studio', { state: { projectTitle, mode: 'narasi', scenes, projectId: currentId } });
  };

  return (
    <div className="trial-page idea-page">
      <TrialHeader />

      <nav className="idea-steps" aria-label="Langkah">
        {STEPS.map((step, index) => (
          <span className={`idea-step ${index === 1 ? 'is-active' : ''}`} key={step}>
            {step}
          </span>
        ))}
      </nav>

      <div className="idea-workspace">
        <aside className="idea-sidebar" aria-label="Narasi sendiri">
          <div className="idea-form-body">
            <div className="idea-field">
              <label className="idea-field-label" htmlFor="narasi-start">Mulai dari</label>
              <select id="narasi-start" className="idea-input" defaultValue="narasi">
                <option value="narasi">Pakai narasi sendiri</option>
              </select>
            </div>
            <div className="idea-field">
              <label className="idea-field-label" htmlFor="narasi-lang">Bahasa</label>
              <select id="narasi-lang" className="idea-input" defaultValue="id">
                <option value="id">🇮🇩 Bahasa Indonesia</option>
              </select>
            </div>
            <div className="idea-field">
              <label className="idea-field-label" htmlFor="narasi-kind">Jenis konten</label>
              <select id="narasi-kind" className="idea-input" defaultValue="auto">
                <option value="auto">✨ Otomatis</option>
              </select>
            </div>

            <div className="idea-field">
              <div className="idea-field-head">
                <label className="idea-field-label" htmlFor="narasi-text">
                  Narasi / cerita kamu
                </label>
                <button type="button" className="idea-paste" onClick={handlePaste}>
                  Tempel
                </button>
              </div>
              <textarea
                id="narasi-text"
                className="idea-textarea"
                rows={9}
                value={narration}
                onChange={(event) => setNarration(event.target.value)}
                placeholder="tulis bebas, boleh kasar dan belum rapi. contoh: dulu aku tiap malam bilang besok mulai olahraga, tapi..."
              />
              <p className="idea-hint">Dipecah otomatis per kalimat, maksimal 6 scene.</p>
            </div>

            <div className="idea-field">
              <span className="idea-field-label">Target durasi</span>
              <div className="idea-chips" role="group" aria-label="Target durasi">
                {DURATION_CHOICES.map((option) => (
                  <button
                    type="button"
                    className={`idea-chip ${duration === option.value ? 'is-active' : ''}`}
                    key={option.value}
                    aria-pressed={duration === option.value}
                    onClick={() => setDuration(option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="idea-actions">
            <div className="idea-secondary-actions">
              <button type="button" onClick={handleCopyPrompt}>Salin prompt</button>
              <button type="button" onClick={() => { setPasteError(''); setPasteOpen(true); }}>
                Tempel jawaban
              </button>
            </div>
            <button type="button" className="idea-generate" onClick={handleSplit}>
              Pecah jadi scene
            </button>
            <button
              type="button"
              className="idea-generate"
              onClick={handleOpenStudio}
              disabled={!scenes.length}
            >
              Buka di studio
            </button>
            <p className="idea-actions-note">
              Narasi dipecah lokal. Untuk AI, salin prompt lalu tempel jawabannya.
            </p>
          </div>
        </aside>

        <main className="idea-center">
          <div className="idea-callout">
            <button
              type="button"
              className="idea-back"
              onClick={() => navigate('/app/trial/mulai', { state: { projectTitle, projectId: currentId } })}
              aria-label="Kembali ke pilihan cara mulai"
            >
              ←
            </button>
            <div className="idea-callout-copy">
              <strong>Tulis narasi atau ceritamu di panel kiri</strong>
              <span>Boleh masih kasar. Narasi dipecah jadi scene di langkah ini.</span>
            </div>
          </div>

          <section className="idea-results" aria-labelledby="narasi-title">
            <div className="idea-results-head">
              <h1 id="narasi-title">Dari narasi kamu</h1>
            </div>
            {scenes.length === 0 ? (
              <div className="idea-empty">
                <div>
                  <h2>Tanpa pilih ide</h2>
                  <p>Narasimu langsung dipecah jadi scene, lalu muncul di langkah 2.</p>
                </div>
              </div>
            ) : (
              <div className="idea-grid">
                {scenes.map((scene, index) => (
                  <article className="idea-card accent-orange" key={scene.id}>
                    <div className="idea-card-top">
                      <span className="idea-card-tag">Scene {index + 1}</span>
                      <span className="idea-card-meta">{formatDuration(scene.dur)}</span>
                    </div>
                    <p className="idea-card-desc">{scene.text}</p>
                  </article>
                ))}
              </div>
            )}
            <p className={`idea-status ${status ? 'is-visible' : ''}`} role="status" aria-live="polite">
              {status}
            </p>
          </section>
        </main>

        <aside className="idea-projects" aria-label="Daftar proyek">
          <div className="idea-projects-head">
            <h2>Proyek</h2>
            <span className="idea-projects-count">
              {projects.length}/{MAX_PROJECTS}
            </span>
          </div>
          <button type="button" className="idea-new-project" onClick={handleNewProject}>
            + Tambah Proyek Baru
          </button>
          <p className="idea-projects-note">
            Maksimal {MAX_PROJECTS} proyek tersimpan di browser ini. Unduh proyek sebagai JSON, lalu buka lagi lewat Impor proyek.
          </p>
          <button type="button" className="idea-import" onClick={() => importRef.current?.click()}>
            Impor proyek (.json)
          </button>
          <input ref={importRef} type="file" accept=".json,application/json" hidden onChange={handleImport} />
          <input
            className="idea-input idea-project-search"
            type="search"
            placeholder="Cari proyek..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="Cari proyek"
          />
          <div className="idea-project-list">
            {visibleProjects.map((project) => {
              const stats = projectStats(project);
              return (
                <article className="idea-project-card" key={project.id}>
                  <p className="idea-project-open">{project.title}</p>
                  <p className="idea-project-meta">
                    {stats.sceneCount} scene · {formatDuration(stats.duration)} ·{' '}
                    {relativeTime(project.updatedAt)}
                  </p>
                  <div className="idea-project-tools">
                    <button
                      type="button"
                      onClick={() => handleExportProject(project)}
                      aria-label={`Unduh ${project.title} sebagai JSON`}
                      title="Unduh JSON"
                      disabled={stats.sceneCount === 0}
                    >
                      Unduh
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteProject(project)}
                      aria-label={`Hapus ${project.title}`}
                      title="Hapus proyek"
                    >
                      Hapus
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </aside>
      </div>

      {pasteOpen && (
        <div className="idea-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setPasteOpen(false); }}>
          <div className="idea-modal" role="dialog" aria-modal="true" aria-labelledby="narasi-paste-title">
            <div className="idea-modal-head">
              <h2 id="narasi-paste-title">Tempel jawaban</h2>
              <button type="button" className="idea-modal-close" onClick={() => setPasteOpen(false)} aria-label="Tutup">
                ×
              </button>
            </div>
            <p>Tempel JSON dari prompt, atau teks biasa. Satu scene per baris.</p>
            <textarea
              value={pasteText}
              onChange={(event) => setPasteText(event.target.value)}
              rows={10}
              aria-label="Jawaban yang akan ditempel"
              placeholder={'[{"title":"...","scenes":["...","..."]}]'}
            />
            {pasteError && <p className="idea-modal-error" role="alert">{pasteError}</p>}
            <div className="idea-modal-actions">
              <button type="button" className="idea-modal-cancel" onClick={() => setPasteOpen(false)}>Batal</button>
              <button type="button" className="idea-modal-submit" onClick={handlePasteSubmit} disabled={!pasteText.trim()}>
                Gunakan jawaban
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
