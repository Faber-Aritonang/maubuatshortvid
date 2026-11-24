import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import TrialHeader from './TrialHeader.jsx';
import {
  DURATION_OPTIONS,
  MAX_PROJECTS,
  SAMPLE_TOPICS,
  SIZE_OPTIONS,
  STYLE_OPTIONS,
  buildPrompt,
  downloadProjectJson,
  formatDuration,
  generateIdeas,
  createIdeaFromLines,
  loadIdeaCurrentId,
  loadIdeaProjects,
  newId,
  parseIdeaAnswer,
  projectStats,
  relativeTime,
  saveIdeaCurrentId,
  saveIdeaProjects,
} from '../lib/ideaEngine.js';
import './trial.css';
import './trial-idea.css';

function makeDraft(id, title) {
  return {
    id: id || newId('p'),
    title: String(title || 'Video pertamaku').slice(0, 80),
    scenes: [],
    ideas: [],
    ideaTitle: '',
    topic: '',
    duration: 30,
    note: '',
    style: 'auto',
    updatedAt: Date.now(),
  };
}

function Icon({ children, size = 18, className = '' }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

function SparkleIcon({ size = 18 }) {
  return (
    <Icon size={size}>
      <path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" />
      <path d="m19 16 .7 2.3L22 19l-2.3.7L19 22l-.7-2.3L16 19l2.3-.7z" />
    </Icon>
  );
}

function LockIcon({ size = 13 }) {
  return (
    <Icon size={size}>
      <rect x="5" y="10" width="14" height="10" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </Icon>
  );
}

function UserIcon({ size = 14 }) {
  return (
    <Icon size={size}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
    </Icon>
  );
}

function PaletteIcon({ size = 14 }) {
  return (
    <Icon size={size}>
      <path d="M12 3a9 9 0 1 0 0 18h1.5a2.5 2.5 0 0 0 0-5H12a2 2 0 0 1 0-4h4.5A4.5 4.5 0 0 0 21 7.5C21 5 17 3 12 3Z" />
      <circle cx="7.5" cy="10" r="1" fill="currentColor" />
      <circle cx="9.5" cy="6.5" r="1" fill="currentColor" />
      <circle cx="14" cy="6" r="1" fill="currentColor" />
    </Icon>
  );
}

function GaugeIcon({ size = 14 }) {
  return (
    <Icon size={size}>
      <path d="M4 18a8 8 0 1 1 16 0" />
      <path d="m12 18 4-5" />
      <circle cx="12" cy="18" r="1" fill="currentColor" />
    </Icon>
  );
}

function TransitionIcon({ size = 14 }) {
  return (
    <Icon size={size}>
      <path d="M4 8h16" />
      <path d="m16 4 4 4-4 4" />
      <path d="M20 16H4" />
      <path d="m8 12-4 4 4 4" />
    </Icon>
  );
}

function ClipboardIcon({ size = 13 }) {
  return (
    <Icon size={size}>
      <rect x="5" y="4" width="14" height="17" rx="2" />
      <path d="M9 4V3h6v1" />
      <path d="M9 10h6M9 14h6" />
    </Icon>
  );
}

function CopyIcon({ size = 13 }) {
  return (
    <Icon size={size}>
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15V5a2 2 0 0 1 2-2h10" />
    </Icon>
  );
}

function SearchIcon({ size = 14 }) {
  return (
    <Icon size={size}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-4-4" />
    </Icon>
  );
}

function PencilIcon({ size = 13 }) {
  return (
    <Icon size={size}>
      <path d="m4 20 4.5-1 10-10a2.1 2.1 0 0 0-3-3l-10 10z" />
      <path d="m13.5 8.5 3 3" />
    </Icon>
  );
}

function DownloadIcon({ size = 13 }) {
  return (
    <Icon size={size}>
      <path d="M12 4v12" />
      <path d="m7 11 5 5 5-5" />
      <path d="M5 20h14" />
    </Icon>
  );
}

function TrashIcon({ size = 13 }) {
  return (
    <Icon size={size}>
      <path d="M4 7h16" />
      <path d="M9 7V5h6v2" />
      <path d="m6 7 1 13h10l1-13" />
    </Icon>
  );
}

function PlusIcon({ size = 16 }) {
  return (
    <Icon size={size}>
      <path d="M12 5v14M5 12h14" />
    </Icon>
  );
}

function UploadIcon({ size = 14 }) {
  return (
    <Icon size={size}>
      <path d="M12 16V4" />
      <path d="m7 9 5-5 5 5" />
      <path d="M5 20h14" />
    </Icon>
  );
}

function CloseIcon({ size = 17 }) {
  return (
    <Icon size={size}>
      <path d="m6 6 12 12M18 6 6 18" />
    </Icon>
  );
}

function Mascot() {
  return (
    <svg className="idea-mascot" viewBox="0 0 90 100" aria-hidden="true">
      <ellipse cx="45" cy="93" rx="26" ry="5" fill="rgba(20,20,20,.12)" />
      <path
        d="M23 70c0-12 10-20 22-20s22 8 22 20v16H23z"
        fill="#2bbfa3"
        stroke="#141414"
        strokeWidth="3"
      />
      <path d="M45 50v8" stroke="#141414" strokeWidth="3" />
      <circle cx="45" cy="36" r="18" fill="#f4c9a8" stroke="#141414" strokeWidth="3" />
      <path d="M27 32c2-12 10-18 18-18s16 6 18 18" fill="#141414" />
      <rect x="31" y="31" width="12" height="9" rx="2" fill="#fffdf7" stroke="#141414" strokeWidth="2.5" />
      <rect x="47" y="31" width="12" height="9" rx="2" fill="#fffdf7" stroke="#141414" strokeWidth="2.5" />
      <path d="M43 35h4" stroke="#141414" strokeWidth="2.5" />
      <path d="M39 46c4 3 8 3 12 0" stroke="#141414" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M31 72h28" stroke="#141414" strokeWidth="3" />
      <circle cx="45" cy="80" r="4" fill="#ffd23f" stroke="#141414" strokeWidth="2" />
    </svg>
  );
}

const STEPS = [
  { id: 'ide', label: 'Ide', active: true },
  { id: 'narasi', label: 'Narasi' },
  { id: 'suara', label: 'Suara' },
  { id: 'animasi', label: 'Animasi' },
];

export default function TrialIdea() {
  const navigate = useNavigate();
  const location = useLocation();
  const [boot] = useState(() => {
    const stored = loadIdeaProjects();
    const stateTitle = location.state?.projectTitle;
    const requestedId = location.state?.projectId || loadIdeaCurrentId();
    const found = requestedId ? stored.find((project) => project.id === requestedId) : null;
    const current = found
      ? { ...found, title: stateTitle || found.title, updatedAt: Date.now() }
      : makeDraft(location.state?.projectId || null, stateTitle || 'Video pertamaku');
    const list = [current, ...stored.filter((project) => project.id !== current.id)]
      .slice(0, MAX_PROJECTS);
    return { current, list };
  });

  const [projects, setProjects] = useState(boot.list);
  const [currentId, setCurrentId] = useState(boot.current.id);
  const [topic, setTopic] = useState(boot.current.topic || '');
  const [duration, setDuration] = useState(boot.current.duration || 30);
  const [note, setNote] = useState(boot.current.note || '');
  const [style, setStyle] = useState(boot.current.style || 'auto');
  const [ideas, setIdeas] = useState(Array.isArray(boot.current.ideas) ? boot.current.ideas : []);
  const [generation, setGeneration] = useState(
    Array.isArray(boot.current.ideas) && boot.current.ideas.length ? 1 : 0,
  );
  const [customOpen, setCustomOpen] = useState(false);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [pasteError, setPasteError] = useState('');

  const topicRef = useRef(null);
  const pasteRef = useRef(null);
  const importRef = useRef(null);
  const resultsRef = useRef(null);

  const currentProject = projects.find((project) => project.id === currentId) || projects[0] || boot.current;
  const projectTitle = currentProject?.title || location.state?.projectTitle || 'Video pertamaku';
  const selectedStyle = STYLE_OPTIONS.find((item) => item.id === style) || STYLE_OPTIONS[0];

  useEffect(() => {
    const previousTitle = document.title;
    document.title = 'Pilih ide - Satset Motion';
    return () => {
      document.title = previousTitle;
    };
  }, []);

  useEffect(() => {
    saveIdeaProjects(projects);
  }, [projects]);

  useEffect(() => {
    saveIdeaCurrentId(currentId);
  }, [currentId]);

  useEffect(() => {
    setProjects((list) =>
      list.map((project) =>
        project.id === currentId
          ? { ...project, topic, duration, note, style, updatedAt: Date.now() }
          : project,
      ),
    );
  }, [currentId, topic, duration, note, style]);

  useEffect(() => {
    setProjects((list) =>
      list.map((project) =>
        project.id === currentId ? { ...project, ideas, updatedAt: Date.now() } : project,
      ),
    );
  }, [currentId, ideas]);

  useEffect(() => {
    if (!pasteOpen) return undefined;
    const timer = window.setTimeout(() => pasteRef.current?.focus(), 50);
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setPasteOpen(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [pasteOpen]);

  const filteredProjects = search.trim()
    ? projects.filter((project) =>
        `${project.title} ${project.ideaTitle || ''}`
          .toLowerCase()
          .includes(search.trim().toLowerCase()),
      )
    : projects;

  const handleGenerate = async () => {
    const showResults = () => {
      if (typeof window !== 'undefined' && window.innerWidth <= 980) {
        window.setTimeout(() => {
          resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 80);
      }
    };

    setStatus('Membuat ide dengan AI...');
    try {
      const res = await fetch('/api/ideas', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ topic, duration, note }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !Array.isArray(data.ideas) || !data.ideas.length) {
        throw new Error(data.error || 'AI tidak tersedia.');
      }
      const next = data.ideas.map((idea) => createIdeaFromLines(idea.title, idea.desc, idea.lines, {
        duration,
        style,
        seed: generation,
        tag: idea.tag,
      })).filter(Boolean);
      if (!next.length) throw new Error('Ide AI kosong.');
      setIdeas(next);
      setGeneration((value) => value + 1);
      setStatus(`${next.length} ide dari AI siap. Pilih satu untuk masuk studio.`);
      showResults();
      return;
    } catch (error) {
      // Server LLM belum siap: pakai engine lokal supaya alur tetap jalan.
      const next = generateIdeas({ topic, duration, note, style, seed: generation });
      setIdeas(next);
      setGeneration((value) => value + 1);
      setStatus(
        `AI belum bisa dipakai (${error.message}). Memakai ide lokal: ${next.length} ide siap.`,
      );
      showResults();
    }
  };

  const handleRandomTopic = () => {
    const options = SAMPLE_TOPICS.filter((item) => item !== topic.trim().toLowerCase());
    const next = options[Math.floor(Math.random() * options.length)] || SAMPLE_TOPICS[0];
    setTopic(next);
    setStatus('Topik diacak. Klik Buat ide untuk menyusunnya.');
    topicRef.current?.focus();
  };

  const handleCopyPrompt = async () => {
    const prompt = buildPrompt({ topic, duration, note, style });
    try {
      if (!navigator.clipboard || !navigator.clipboard.writeText) throw new Error('clipboard');
      await navigator.clipboard.writeText(prompt);
      setStatus('Prompt disalin. Tempel ke AI favoritmu, lalu klik Tempel jawaban.');
    } catch {
      setStatus('Clipboard tidak tersedia di browser ini. Kamu masih bisa klik Buat ide.');
    }
  };

  const openPaste = () => {
    setPasteError('');
    setPasteOpen(true);
  };

  const handlePasteSubmit = () => {
    try {
      const next = parseIdeaAnswer(pasteText, { duration, style });
      if (!next.length) {
        setPasteError('Jawaban belum bisa dibaca. Tempel JSON array atau teks dengan satu ide per blok.');
        return;
      }
      setIdeas(next);
      setPasteOpen(false);
      setPasteText('');
      setPasteError('');
      setStatus(`${next.length} ide dari jawaban yang kamu tempel.`);
    } catch {
      setPasteError('Jawaban belum bisa dibaca. Coba tempel ulang sebagai JSON atau teks biasa.');
    }
  };

  const handleUseIdea = (idea) => {
    const scenes = idea.scenes.map((scene) => ({ ...scene }));
    const nextProjects = projects.map((project) =>
      project.id === currentId
        ? { ...project, scenes, ideaTitle: idea.title, updatedAt: Date.now() }
        : project,
    );
    setProjects(nextProjects);
    // Persist before navigating so the studio back stack and a reload both
    // see the selected scenes.
    saveIdeaProjects(nextProjects);
    saveIdeaCurrentId(currentId);
    navigate('/studio', {
      state: {
        projectTitle,
        mode: 'idea',
        scenes,
        ideaTitle: idea.title,
        projectId: currentId,
      },
    });
  };

  const handleSelectProject = (project) => {
    if (project.scenes && project.scenes.length) {
      navigate('/studio', {
        state: {
          projectTitle: project.title,
          mode: 'idea',
          scenes: project.scenes,
          ideaTitle: project.ideaTitle || '',
          projectId: project.id,
        },
      });
      return;
    }

    setCurrentId(project.id);
    setTopic(project.topic || '');
    setDuration(project.duration || 30);
    setNote(project.note || '');
    setStyle(project.style || 'auto');
    setIdeas(Array.isArray(project.ideas) ? project.ideas : []);
    setStatus(`Proyek dibuka: ${project.title}`);
  };

  const handleNewProject = () => {
    navigate('/app/trial');
  };

  const handleImport = async (event) => {
    const file = event.target.files && event.target.files[0];
    event.target.value = '';
    if (!file) return;

    try {
      const data = JSON.parse(await file.text());
      const rawScenes = Array.isArray(data.scenes) ? data.scenes : Array.isArray(data) ? data : [];
      const scenes = rawScenes
        .filter((scene) => scene && typeof scene.text === 'string')
        .slice(0, 6);
      if (!scenes.length) throw new Error('File tidak punya scene yang valid.');

      const imported = {
        ...makeDraft(null, data.title || file.name.replace(/\.json$/i, '') || 'Proyek impor'),
        scenes,
        ideaTitle: String(data.ideaTitle || ''),
      };

      setProjects((list) => [imported, ...list].slice(0, MAX_PROJECTS));
      setCurrentId(imported.id);
      setTopic('');
      setDuration(30);
      setNote('');
      setStyle('auto');
      setIdeas([]);
      setStatus(`Proyek "${imported.title}" diimpor. Buka di studio dari panel kanan.`);
    } catch (error) {
      setStatus(`Impor gagal: ${error.message}`);
    }
  };

  const handleExportProject = (project) => {
    if (!project.scenes || !project.scenes.length) {
      setStatus('Proyek ini belum punya scene. Pilih ide dulu.');
      return;
    }
    downloadProjectJson(project);
    setStatus(`JSON "${project.title}" diunduh.`);
  };

  const handleDeleteProject = (project) => {
    if (!window.confirm(`Hapus proyek "${project.title}"?`)) return;
    const next = projects.filter((item) => item.id !== project.id);
    setProjects(next);
    saveIdeaProjects(next);

    if (project.id === currentId) {
      navigate('/app/trial');
      return;
    }
    setStatus(`Proyek "${project.title}" dihapus.`);
  };

  return (
    <div className="trial-page idea-page">
      <TrialHeader />

      <div className="idea-workspace">
        <aside className="idea-sidebar" aria-label="Pengaturan ide">
          <form
            className="idea-form"
            onSubmit={(event) => {
              event.preventDefault();
              handleGenerate();
            }}
          >
            <div className="idea-form-body">
              <ol className="idea-steps" aria-label="Tahap proyek">
                {STEPS.map((step, index) => (
                  <li
                    className={`idea-step ${step.active ? 'is-active' : 'is-locked'}`}
                    key={step.id}
                    aria-current={step.active ? 'step' : undefined}
                    aria-label={`${index + 1}. ${step.label}${step.active ? ', aktif' : ', terkunci'}`}
                  >
                    <span className="idea-step-dot" aria-hidden="true">
                      {step.active ? index + 1 : <LockIcon />}
                    </span>
                    <span className="idea-step-label" aria-hidden="true">
                      {step.label}
                    </span>
                  </li>
                ))}
              </ol>

              <div className="idea-field">
                <label className="idea-field-label" htmlFor="idea-topic">
                  Topik video
                </label>
                <input
                  ref={topicRef}
                  id="idea-topic"
                  className="idea-input"
                  type="text"
                  value={topic}
                  onChange={(event) => setTopic(event.target.value)}
                  placeholder="contoh: disiplin pagi"
                  maxLength={80}
                  autoComplete="off"
                />
                <p className="idea-hint">Boleh kosong kalau mau ide bebas.</p>
              </div>

              <div className="idea-field">
                <span className="idea-field-label">Target durasi</span>
                <div className="idea-chips" role="group" aria-label="Target durasi">
                  {DURATION_OPTIONS.map((option) => (
                    <button
                      type="button"
                      className={`idea-chip ${
                        !customOpen && duration === option.value ? 'is-active' : ''
                      }`}
                      key={option.value}
                      aria-pressed={!customOpen && duration === option.value}
                      onClick={() => {
                        setCustomOpen(false);
                        setDuration(option.value);
                      }}
                    >
                      {option.label}
                    </button>
                  ))}
                  <button
                    type="button"
                    className={`idea-chip ${customOpen ? 'is-active' : ''}`}
                    aria-pressed={customOpen}
                    onClick={() => setCustomOpen((value) => !value)}
                  >
                    Custom
                  </button>
                </div>
                {customOpen && (
                  <div className="idea-custom-row">
                    <label htmlFor="idea-custom-duration">Detik</label>
                    <input
                      id="idea-custom-duration"
                      type="number"
                      min="5"
                      max="90"
                      step="5"
                      value={duration}
                      onChange={(event) =>
                        setDuration(Math.max(5, Math.min(90, Number(event.target.value) || 5)))
                      }
                    />
                  </div>
                )}
              </div>

              <div className="idea-field">
                <label className="idea-field-label" htmlFor="idea-note">
                  Catatan &amp; ajakan penutup (opsional)
                </label>
                <textarea
                  id="idea-note"
                  className="idea-textarea"
                  rows={3}
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="contoh: tutup dengan ajakan follow @akunmu"
                  maxLength={160}
                />
                <p className="idea-hint">Dipakai sebagai scene terakhir. Ikut tersimpan di proyek ini.</p>
              </div>

              <section className="idea-style-card" aria-labelledby="idea-style-title">
                <div className="idea-style-head">
                  <span className="idea-style-badge" aria-hidden="true">
                    <SparkleIcon size={16} />
                  </span>
                  <span className="idea-style-title" id="idea-style-title">
                    Gaya video
                  </span>
                </div>
                <select
                  id="idea-style"
                  className="idea-select"
                  value={style}
                  onChange={(event) => setStyle(event.target.value)}
                  aria-label="Gaya video"
                >
                  {STYLE_OPTIONS.map((option) => (
                    <option value={option.id} key={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <p className="idea-style-desc">{selectedStyle.desc}</p>

                <dl className="idea-specs">
                  <div>
                    <dt>
                      <UserIcon /> Karakter
                    </dt>
                    <dd>Tanpa wajah</dd>
                  </div>
                  <div>
                    <dt>
                      <PaletteIcon /> Warna brand
                    </dt>
                    <dd>Ikut gaya</dd>
                  </div>
                  <div>
                    <dt>
                      <GaugeIcon /> Tempo
                    </dt>
                    <dd>Otomatis</dd>
                  </div>
                  <div>
                    <dt>
                      <TransitionIcon /> Transisi
                    </dt>
                    <dd>Otomatis</dd>
                  </div>
                </dl>

                <div className="idea-size-block">
                  <span className="idea-size-label">Ukuran video</span>
                  <div className="idea-size-chips" role="group" aria-label="Ukuran video">
                    {SIZE_OPTIONS.map((size) => (
                      <button
                        type="button"
                        className={`idea-size-chip ${size.id === '9:16' ? 'is-active' : ''}`}
                        key={size.id}
                        disabled={!size.ready}
                        aria-pressed={size.id === '9:16'}
                        title={size.ready ? 'Ukuran video saat ini' : 'Segera hadir'}
                      >
                        {size.label}
                      </button>
                    ))}
                  </div>
                  <p className="idea-hint">Saat ini video vertikal 9:16. Ukuran lain menyusul.</p>
                </div>
              </section>
            </div>

            <div className="idea-actions">
              <div className="idea-actions-row">
                <button type="submit" className="idea-generate">
                  <SparkleIcon size={17} /> Buat ide
                </button>
                <button
                  type="button"
                  className="idea-dice"
                  onClick={handleRandomTopic}
                  aria-label="Acak topik"
                  title="Acak topik"
                >
                  <svg
                    width="19"
                    height="19"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <rect x="4" y="4" width="16" height="16" rx="3" />
                    <circle cx="9" cy="9" r="1" fill="currentColor" />
                    <circle cx="15" cy="9" r="1" fill="currentColor" />
                    <circle cx="9" cy="15" r="1" fill="currentColor" />
                    <circle cx="15" cy="15" r="1" fill="currentColor" />
                  </svg>
                </button>
              </div>

              <div className="idea-secondary-actions">
                <button type="button" onClick={handleCopyPrompt}>
                  <CopyIcon /> Salin prompt
                </button>
                <button
                  type="button"
                  onClick={openPaste}
                  aria-expanded={pasteOpen}
                  aria-controls="idea-paste-modal"
                >
                  <ClipboardIcon /> Tempel jawaban
                </button>
              </div>
              <p className="idea-actions-note">
                Coba AI server dulu. Jika tidak tersedia, ide dibuat secara lokal.
              </p>
            </div>
          </form>
        </aside>

        <main className="idea-center">
          <div className="idea-callout">
            <button
              type="button"
              className="idea-back"
              onClick={() =>
                navigate('/app/trial/mulai', {
                  state: { projectTitle, projectId: currentId },
                })
              }
              aria-label="Kembali ke pilihan cara mulai"
            >
              <Icon size={17}>
                <path d="M19 12H5" />
                <path d="m11 18-6-6 6-6" />
              </Icon>
            </button>
            <div className="idea-callout-copy">
              <strong>Isi topik, lalu klik "Buat ide" di panel kiri.</strong>
              <span>Topik boleh dikosongkan kalau mau ide bebas.</span>
            </div>
          </div>

          <section className="idea-results" aria-labelledby="idea-title" ref={resultsRef}>
            <div className="idea-results-head">
              <h1 id="idea-title">Pilih ide</h1>
              {ideas.length > 0 && (
                <button type="button" className="idea-regenerate" onClick={handleGenerate}>
                  Buat ulang
                </button>
              )}
            </div>

            {ideas.length === 0 ? (
              <div className="idea-empty">
                <div>
                  <h2>Belum ada ide</h2>
                  <p>Tulis topik di panel kiri, lalu klik Buat ide. Ide-idenya muncul di sini.</p>
                </div>
                <Mascot />
              </div>
            ) : (
              <>
                <p className="idea-results-meta">
                  Topik: <strong>{topic.trim() || 'ide bebas'}</strong> · {formatDuration(duration)} ·{' '}
                  {selectedStyle.label}
                </p>
                <div className="idea-grid">
                  {ideas.map((idea) => {
                    const titleId = `idea-card-${idea.id}`;
                    return (
                      <article
                        className={`idea-card accent-${idea.accent}`}
                        key={idea.id}
                        aria-labelledby={titleId}
                      >
                        <div className="idea-card-top">
                          <span className="idea-card-tag">{idea.tag}</span>
                          <span className="idea-card-meta">
                            {idea.scenes.length} scene · {formatDuration(idea.duration)}
                          </span>
                        </div>
                        <h2 id={titleId}>{idea.title}</h2>
                        <p className="idea-card-hook">“{idea.hook}”</p>
                        <p className="idea-card-desc">{idea.desc}</p>
                        <button
                          type="button"
                          className="idea-use"
                          onClick={() => handleUseIdea(idea)}
                        >
                          Pakai ide ini <span aria-hidden="true">→</span>
                        </button>
                      </article>
                    );
                  })}
                </div>
              </>
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
            <PlusIcon /> Tambah Proyek Baru
          </button>

          <p className="idea-projects-note">
            Maksimal {MAX_PROJECTS} proyek tersimpan di browser ini. Unduh proyek sebagai JSON,
            lalu buka lagi lewat Impor proyek.
          </p>

          <button
            type="button"
            className="idea-import"
            onClick={() => importRef.current?.click()}
          >
            <UploadIcon /> Impor proyek (.json)
          </button>
          <input
            ref={importRef}
            type="file"
            accept=".json,application/json"
            hidden
            onChange={handleImport}
          />

          <label className="idea-search">
            <SearchIcon />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari proyek..."
              aria-label="Cari proyek"
            />
          </label>

          <div className="idea-project-list">
            {filteredProjects.length === 0 ? (
              <p className="idea-project-empty">Tidak ada proyek yang cocok.</p>
            ) : (
              filteredProjects.map((project) => {
                const stats = projectStats(project);
                const active = project.id === currentId;
                return (
                  <article
                    className={`idea-project-card ${active ? 'is-active' : ''}`}
                    key={project.id}
                    aria-current={active ? 'true' : undefined}
                  >
                    <button
                      type="button"
                      className="idea-project-open"
                      onClick={() => handleSelectProject(project)}
                    >
                      {project.title}
                    </button>
                    <p className="idea-project-meta">
                      {stats.sceneCount} scene · {formatDuration(stats.duration)} ·{' '}
                      {relativeTime(project.updatedAt)}
                    </p>
                    {project.ideaTitle && (
                      <p className="idea-project-idea">Ide: {project.ideaTitle}</p>
                    )}
                    <div className="idea-project-foot">
                      <span className="idea-project-badge">9:16</span>
                      <div className="idea-project-tools">
                        <button
                          type="button"
                          onClick={() => handleSelectProject(project)}
                          aria-label={`Buka ${project.title} di studio`}
                          title="Buka di studio"
                        >
                          <PencilIcon />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleExportProject(project)}
                          aria-label={`Unduh ${project.title} sebagai JSON`}
                          title="Unduh JSON"
                          disabled={stats.sceneCount === 0}
                        >
                          <DownloadIcon />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteProject(project)}
                          aria-label={`Hapus ${project.title}`}
                          title="Hapus proyek"
                        >
                          <TrashIcon />
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </aside>
      </div>

      {pasteOpen && (
        <div
          className="idea-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setPasteOpen(false);
          }}
        >
          <div
            className="idea-modal"
            id="idea-paste-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="idea-paste-title"
          >
            <div className="idea-modal-head">
              <h2 id="idea-paste-title">Tempel jawaban</h2>
              <button
                type="button"
                className="idea-modal-close"
                onClick={() => setPasteOpen(false)}
                aria-label="Tutup"
              >
                <CloseIcon />
              </button>
            </div>
            <p>
              Tempel JSON dari prompt, atau teks biasa. Satu ide per blok, pisahkan dengan baris
              kosong.
            </p>
            <textarea
              ref={pasteRef}
              value={pasteText}
              onChange={(event) => setPasteText(event.target.value)}
              rows={10}
              aria-label="Jawaban ide yang akan ditempel"
              placeholder={'[{"title":"...","desc":"...","scenes":["...","..."]}]'}
            />
            {pasteError && (
              <p className="idea-modal-error" role="alert">
                {pasteError}
              </p>
            )}
            <div className="idea-modal-actions">
              <button
                type="button"
                className="idea-modal-cancel"
                onClick={() => setPasteOpen(false)}
              >
                Batal
              </button>
              <button
                type="button"
                className="idea-modal-submit"
                onClick={handlePasteSubmit}
                disabled={!pasteText.trim()}
              >
                Gunakan jawaban
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
