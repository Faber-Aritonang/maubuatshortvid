/**
 * Editor Components - Canvas editor, scene controls, timeline
 * Main video creation interface
 */

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCurrentProject } from '../hooks/useProjects.js';
import { useCanvas, usePlayback, useTTS, useExport } from '../hooks/useEditor.js';
import { STYLES, CAMERAS, TRANSITIONS } from '../styles.js';
import { useEditorStore, useProjectStore } from '../store/index.js';
import { useAuth } from '../hooks/useAuth.js';

/**
 * Canvas Stage - Main preview area
 */
export function CanvasStage() {
  const { canvasRef } = useCanvas();
  const { playing, currentTime, totalDuration, restart, seek, toggle } = usePlayback();
  const {
    exportVideo,
    exportJSON,
    importJSON,
    canvasRef: exportCanvasRef,
    exportProgress,
    exporting,
  } = useExport();
  const { duration, newProject } = useCurrentProject();
  const { speak } = useTTS();

  // Preview and export draw on the same canvas, so both hook refs point at the
  // element that is actually rendered.
  const setCanvasNode = (node) => {
    canvasRef.current = node;
    exportCanvasRef.current = node;
  };

  const handleImport = (event) => {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    importJSON(file)
      .then((project) => newProject(project))
      .catch(() => window.alert('Gagal membuka file JSON.'));
    event.target.value = '';
  };

  return (
    <section className="stage">
      <canvas
        ref={setCanvasNode}
        width={720}
        height={1280}
        className="canvas"
      />

      <div className="transport">
        <button onClick={restart} className="btn" title="Ulangi dari awal">
          Ulangi
        </button>
        <button onClick={toggle} className="btn primary">
          {playing ? 'Jeda' : 'Putar'}
        </button>
        <button onClick={speak} className="btn" title="Dengarkan suara (TTS browser)">
          Suara
        </button>
        <span className="time-display">
          {currentTime.toFixed(1)}s / {totalDuration.toFixed(1)}s
        </span>
      </div>

      <input
        type="range"
        min="0"
        max={totalDuration}
        step="0.05"
        value={currentTime}
        onChange={(e) => seek(Number(e.target.value))}
        className="seek-bar"
        disabled={totalDuration === 0}
      />

      <div className="export-area">
        <button
          onClick={exportVideo}
          disabled={exporting || !duration}
          className="btn export-btn"
        >
          {exporting ? `Merekam ${Math.round(exportProgress * 100)}%…` : 'Export Video (.webm)'}
        </button>
        <button onClick={exportJSON} className="btn secondary" title="Simpan proyek sebagai JSON">
          Simpan JSON
        </button>
        <label className="btn secondary file-input">
          Buka JSON
          <input
            type="file"
            accept=".json"
            hidden
            onChange={handleImport}
            disabled={exporting}
          />
        </label>
      </div>

      <p className="hint">Butuh MP4? Konversi: <code>ffmpeg -i shortvid.webm -c:v libx264 -pix_fmt yuv420p -c:a aac out.mp4</code></p>
    </section>
  );
}

/**
 * Scene List Sidebar
 */
export function SceneList() {
  const {
    project,
    sceneIndex,
    sceneCount,
    setScene,
    addScene,
    removeScene,
    reorderScenes,
  } = useCurrentProject();
  const { selectedSceneIndex } = useEditorStore();

  const handleReorder = (fromIndex, toIndex) => {
    reorderScenes(fromIndex, toIndex);
  };

  return (
    <div className="scene-list">
      <h3>Scene ({sceneCount}/6)</h3>

      <div className="scenes">
        {project?.scenes?.map((sc, i) => (
          <button
            type="button"
            key={i}
            className={`scene-item ${i === selectedSceneIndex ? 'active' : ''}`}
            onClick={() => setScene(i)}
            aria-current={i === selectedSceneIndex ? 'true' : undefined}
            draggable
            onDragStart={(e) => { e.dataTransfer.setData('text/plain', i); }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const from = Number(e.dataTransfer.getData('text/plain'));
              const to = i;
              if (from !== to) handleReorder(from, to);
            }}
          >
            <span className="scene-number">{i + 1}</span>
            <span className="scene-preview">
              {sc.text?.slice(0, 30) || '(kosong)'}
            </span>
            <span className="scene-meta">
              {sc.style} · {sc.dur}s
            </span>
          </button>
        ))}
      </div>

      <div className="scene-actions">
        <button onClick={addScene} disabled={sceneCount >= 6} className="btn">
          + Scene
        </button>
        <button onClick={() => removeScene(sceneIndex)} disabled={sceneCount <= 1} className="btn danger">
          Hapus
        </button>
      </div>
    </div>
  );
}


/**
 * Scene Controls Panel
 */
export function SceneControls() {
  const { scene, sceneIndex, updateScene } = useCurrentProject();
  const { ttsRate, setRate } = useEditorStore();

  if (!scene) return <div className="no-scene">Pilih atau tambah scene</div>;

  return (
    <div className="scene-controls">
      <h3>Scene {sceneIndex + 1}</h3>

      <div className="field">
        <label htmlFor="scene-text">Naskah</label>
        <textarea
          id="scene-text"
          value={scene.text || ''}
          rows={3}
          onChange={(e) => updateScene({ text: e.target.value })}
          placeholder="Tulis naskah untuk scene ini..."
        />
      </div>

      <div className="controls-grid">
        <div className="field">
          <label htmlFor="scene-style">Gaya Subtitle</label>
          <select
            id="scene-style"
            value={scene.style}
            onChange={(e) => updateScene({ style: e.target.value })}
          >
            {STYLES.map((s) => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>
        </div>

        <div className="field">
          <label htmlFor="scene-camera">Kamera</label>
          <select
            id="scene-camera"
            value={scene.camera}
            onChange={(e) => updateScene({ camera: e.target.value })}
          >
            {CAMERAS.map((c) => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
        </div>

        <div className="field">
          <label htmlFor="scene-transition">Transisi</label>
          <select
            id="scene-transition"
            value={scene.transition}
            onChange={(e) => updateScene({ transition: e.target.value })}
          >
            {TRANSITIONS.map((t) => (
              <option key={t.id} value={t.id}>{t.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="controls-grid">
        <div className="field">
          <label htmlFor="scene-dur">Durasi (detik)</label>
          <input
            id="scene-dur"
            type="number"
            min="2"
            max="15"
            value={scene.dur}
            onChange={(e) => updateScene({ dur: Math.max(2, Math.min(15, Number(e.target.value) || 4)) })}
          />
        </div>

        <div className="field">
          <label htmlFor="scene-bg">Warna Latar (Hue 0-360)</label>
          <input
            id="scene-bg"
            type="range"
            min="0"
            max="360"
            value={scene.bg}
            onChange={(e) => updateScene({ bg: Number(e.target.value) })}
          />
          <span className="hue-value">{scene.bg}°</span>
        </div>

        <div className="field">
          <label htmlFor="scene-rate">Kecepatan Suara</label>
          <input
            id="scene-rate"
            type="range"
            min="0.7"
            max="1.3"
            step="0.05"
            value={ttsRate}
            onChange={(e) => setRate(Number(e.target.value))}
          />
          <span className="rate-value">{ttsRate.toFixed(2)}x</span>
        </div>
      </div>

      <div className="scene-info">
        Scene aktif: {scene.style} · {scene.camera} · {scene.transition} · {scene.dur}s · Hue {scene.bg}
      </div>
    </div>
  );
}

/**
 * Main Editor Layout
 */
export function EditorLayout() {
  const { loading, currentProject } = useCurrentProject();
  const { loading: authLoading } = useAuth();

  if (authLoading || loading) {
    return (
      <div className="editor-loading">
        <div className="spinner"></div>
        <p>Memuat editor...</p>
      </div>
    );
  }

  return (
    <div className="editor-layout">
      <header className="editor-header">
        <div className="title-area">
          <h1>MauBuatShortVid</h1>
          <p className="subtitle">Ide → Naskah → Suara → Subtitle → Animasi → Export</p>
        </div>
        <div className="header-actions">
          <ProjectSelector />
          <UserMenu />
        </div>
      </header>

      <main className="editor-main">
        <CanvasStage />
        <aside className="editor-sidebar">
          <SceneList />
          <SceneControls />
        </aside>
      </main>
    </div>
  );
}


/**
 * Project Selector Dropdown
 */
function ProjectSelector() {
  const { projects, currentProjectId, selectProject, newProject, loadProjects } = useProjectStore();
  const [open, setOpen] = useState(false);

  return (
    <div className="dropdown" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button
        type="button"
        className="btn secondary dropdown-toggle"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        {currentProjectId ? 'Proyek Aktif' : 'Pilih Proyek'}
      </button>
      {open && (
        <div className="dropdown-menu">
          {projects.map((p) => (
            <button
              key={p.id}
              className={`dropdown-item ${p.id === currentProjectId ? 'active' : ''}`}
              onClick={() => selectProject(p.id)}
            >
              {p.title || 'Tanpa Judul'}
            </button>
          ))}
          <hr />
          <button className="dropdown-item" onClick={() => newProject({ title: 'Proyek Baru' })}>
            + Proyek Baru
          </button>
          <button className="dropdown-item" onClick={loadProjects}>
            Muat Ulang
          </button>
        </div>
      )}
    </div>
  );
}


/**
 * User Menu Dropdown
 */
function UserMenu() {
  const { user, profile, plan, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  if (!user) {
    return (
      <div className="dropdown">
        <Link to="/login" className="btn secondary">Masuk</Link>
        <Link to="/register" className="btn primary">Daftar</Link>
      </div>
    );
  }

  return (
    <div className="dropdown" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button
        type="button"
        className="btn secondary dropdown-toggle"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        {profile?.avatar_url ? (
          <img src={profile.avatar_url} alt="" className="avatar-sm" />
        ) : (
          <span className="avatar-sm">{profile?.display_name?.[0]?.toUpperCase() || 'U'}</span>
        )}
        {profile?.display_name || user?.email?.split('@')[0]}
      </button>
      {open && (
        <div className="dropdown-menu user-menu">
          <div className="user-info">
            <strong>{profile?.display_name || 'Pengguna'}</strong>
            <small>{user?.email}</small>
            <span className={`plan-badge plan-${plan?.id || 'free'}`}>
              {plan?.name || 'Gratis'}
            </span>
          </div>
          <hr />
          <Link to="/profile" className="dropdown-item" onClick={() => setOpen(false)}>
            Profil
          </Link>
          <Link to="/settings" className="dropdown-item" onClick={() => setOpen(false)}>
            Pengaturan
          </Link>
          {plan?.id !== 'agency' && (
            <Link to="/pricing" className="dropdown-item" onClick={() => setOpen(false)}>
              Upgrade
            </Link>
          )}
          <hr />
          <button className="dropdown-item danger" onClick={handleSignOut}>
            Keluar
          </button>
        </div>
      )}
    </div>
  );
}