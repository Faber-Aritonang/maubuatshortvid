import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import TrialHeader from './TrialHeader.jsx';
import './trial.css';

const MODES = [
  {
    id: 'idea',
    title: 'Minta ide dari topik',
    tag: 'Paling mudah',
    desc: 'Tulis satu topik, misalnya "disiplin". Kami siapkan kerangka scene-nya, kamu tinggal isi.',
    accent: 'orange',
    featured: true,
  },
  {
    id: 'narasi',
    title: 'Pakai narasi sendiri',
    tag: null,
    desc: 'Sudah punya cerita atau kata-kata sendiri? Tempel di studio, lalu pecah jadi beberapa scene.',
    accent: 'purple',
  },
  {
    id: 'promosi',
    title: 'Promosi produk / jasa',
    tag: null,
    desc: 'Isi nama produk, kelebihannya, dan kontaknya. Susun jadi video jualan yang siap posting.',
    accent: 'teal',
  },
];

function ModeIcon({ id }) {
  if (id === 'idea') {
    return (
      <svg
        viewBox="0 0 24 24"
        width="22"
        height="22"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        focusable="false"
      >
        <path d="M9 18h6" />
        <path d="M10 21h4" />
        <path d="M12 3a6 6 0 0 0-3.6 10.8c.6.45 1 1.15 1 1.9V16h5.2v-.3c0-.75.4-1.45 1-1.9A6 6 0 0 0 12 3Z" />
      </svg>
    );
  }

  if (id === 'narasi') {
    return (
      <svg
        viewBox="0 0 24 24"
        width="22"
        height="22"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        focusable="false"
      >
        <path d="m4 20 4.5-1 10-10a2.1 2.1 0 0 0-3-3l-10 10z" />
        <path d="m13.5 8.5 3 3" />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 24 24"
      width="22"
      height="22"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <rect x="6" y="5" width="12" height="16" rx="2" />
      <path d="M9 5V4h6v1" />
      <path d="M9 10h6M9 14h6" />
    </svg>
  );
}

export default function TrialMode() {
  const navigate = useNavigate();
  const location = useLocation();
  const projectTitle = location.state?.projectTitle || 'Video pertamaku';
  const projectId = location.state?.projectId;

  useEffect(() => {
    const previousTitle = document.title;
    document.title = 'Mau bikin video dari mana? - Satset Motion';
    return () => {
      document.title = previousTitle;
    };
  }, []);

  const chooseMode = (mode) => {
    if (mode === 'idea') {
      navigate('/app/trial/ide', { state: { projectTitle, projectId } });
      return;
    }
    if (mode === 'narasi') {
      navigate('/app/trial/narasi', { state: { projectTitle, projectId } });
      return;
    }
    navigate('/studio', { state: { projectTitle, mode } });
  };

  return (
    <div className="trial-page">
      <TrialHeader />

      <main className="trial-main trial-main-mode">
        <section className="trial-mode" aria-labelledby="mode-title">
          <p className="trial-mode-kicker">Proyek baru</p>
          <h1 id="mode-title">Mau bikin video dari mana?</h1>
          <p className="trial-sub">
            Pilih salah satu. Kalau bingung, mulai saja dari topik.
          </p>

          <div className="trial-mode-grid">
            {MODES.map((mode) => (
              <article
                className={`trial-mode-card accent-${mode.accent} ${
                  mode.featured ? 'is-featured' : ''
                }`}
                key={mode.id}
              >
                <span className="trial-mode-icon">
                  <ModeIcon id={mode.id} />
                </span>
                <h2>{mode.title}</h2>
                {mode.tag && <p className="trial-mode-tag">{mode.tag}</p>}
                <p className="trial-mode-desc">{mode.desc}</p>
                <button
                  type="button"
                  className="trial-mode-start"
                  onClick={() => chooseMode(mode.id)}
                  aria-label={`Mulai: ${mode.title}`}
                >
                  Mulai <span aria-hidden="true">→</span>
                </button>
              </article>
            ))}
          </div>

          <p className="trial-mode-flow">
            <strong>Setelah ini:</strong> Ide{' '}
            <span aria-hidden="true">→</span> Naskah{' '}
            <span aria-hidden="true">→</span> Suara{' '}
            <span aria-hidden="true">→</span> Animasi{' '}
            <span aria-hidden="true">→</span> Video jadi
          </p>
        </section>
      </main>
    </div>
  );
}
