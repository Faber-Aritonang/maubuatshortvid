import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import TrialHeader from './TrialHeader.jsx';
import {
  DURATION_OPTIONS,
  MAX_PROJECTS,
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

export default function TrialNarration() {
  const navigate = useNavigate();
  const location = useLocation();
  const [projects, setProjects] = useState(() => loadIdeaProjects());
  const [currentId] = useState(() => location.state?.projectId || newId('p'));
  const [narration, setNarration] = useState('');
  const [duration, setDuration] = useState(30);
  const [scenes, setScenes] = useState([]);
  const [status, setStatus] = useState('');

  const projectTitle = location.state?.projectTitle || 'Video pertamaku';

  useEffect(() => {
    saveIdeaProjects(projects);
  }, [projects]);

  useEffect(() => {
    saveIdeaCurrentId(currentId);
  }, [currentId]);

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

      <div className="idea-workspace">
        <aside className="idea-sidebar" aria-label="Narasi sendiri">
          <div className="idea-form-body">
            <div className="idea-field">
              <label className="idea-field-label" htmlFor="narasi-text">
                Narasi / cerita kamu
              </label>
              <textarea
                id="narasi-text"
                className="idea-textarea"
                rows={9}
                value={narration}
                onChange={(event) => setNarration(event.target.value)}
                placeholder="tulis bebas, boleh kasar dan belum rapi. Setiap kalimat jadi satu scene."
              />
              <p className="idea-hint">Dipecah otomatis per kalimat, maksimal 6 scene.</p>
            </div>

            <div className="idea-field">
              <span className="idea-field-label">Target durasi</span>
              <div className="idea-chips" role="group" aria-label="Target durasi">
                {DURATION_OPTIONS.map((option) => (
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
            <p className="idea-actions-note">Narasi dipecah lokal. Tidak memakai AI.</p>
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
              <strong>Tulis narasimu di panel kiri, lalu pecah jadi scene.</strong>
              <span>Boleh masih kasar, nanti dirapikan di studio.</span>
            </div>
          </div>

          <section className="idea-results" aria-labelledby="narasi-title">
            <div className="idea-results-head">
              <h1 id="narasi-title">Dari narasi kamu</h1>
            </div>
            {scenes.length === 0 ? (
              <div className="idea-empty">
                <div>
                  <h2>Belum ada scene</h2>
                  <p>Narasimu dipecah jadi scene setelah kamu klik Pecah jadi scene.</p>
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
          <div className="idea-project-list">
            {projects.map((project) => {
              const stats = projectStats(project);
              return (
                <article className="idea-project-card" key={project.id}>
                  <p className="idea-project-open">{project.title}</p>
                  <p className="idea-project-meta">
                    {stats.sceneCount} scene · {formatDuration(stats.duration)} ·{' '}
                    {relativeTime(project.updatedAt)}
                  </p>
                </article>
              );
            })}
          </div>
        </aside>
      </div>
    </div>
  );
}
