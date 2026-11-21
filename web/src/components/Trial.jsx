import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/index.js';
import './trial.css';

const CLOUD_READY = Boolean(
  import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY
);

function readTipPreference() {
  try {
    return localStorage.getItem('satset:trial-tip') !== 'off';
  } catch {
    return true;
  }
}

export default function Trial() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const profile = useAuthStore((state) => state.profile);
  const plan = useAuthStore((state) => state.plan);

  const [name, setName] = useState('');
  const [helpOpen, setHelpOpen] = useState(false);
  const [showTip, setShowTip] = useState(readTipPreference);
  const helpRef = useRef(null);

  const rawName = String(
    profile?.display_name || user?.email?.split('@')[0] || 'Kreator'
  );
  const displayName = rawName.charAt(0).toUpperCase() + rawName.slice(1);
  const initial = displayName.charAt(0).toUpperCase();

  const limitRaw = profile?.quota_exports_limit ?? plan?.limits?.exports_per_month;
  const limit = limitRaw === null || limitRaw === undefined ? NaN : Number(limitRaw);
  const used = Number(profile?.quota_exports_used ?? 0);
  const creditLabel = Number.isFinite(limit)
    ? limit < 0
      ? 'Tanpa batas'
      : `Sisa kredit ${Math.max(0, limit - (Number.isFinite(used) ? used : 0))}`
    : 'Mode lokal';

  useEffect(() => {
    const previousTitle = document.title;
    document.title = 'Proyek baru - Satset Motion';
    return () => {
      document.title = previousTitle;
    };
  }, []);

  useEffect(() => {
    if (!helpOpen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setHelpOpen(false);
    };
    const handlePointerDown = (event) => {
      if (helpRef.current && !helpRef.current.contains(event.target)) {
        setHelpOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handlePointerDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handlePointerDown);
    };
  }, [helpOpen]);

  const dismissTip = () => {
    setShowTip(false);
    try {
      localStorage.setItem('satset:trial-tip', 'off');
    } catch {
      /* localStorage can be blocked; the tip still hides for this visit */
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const projectTitle = name.trim() || 'Video pertamaku';
    navigate('/studio', { state: { projectTitle } });
  };

  return (
    <div className="trial-page">
      <header className="trial-header">
        <div className="trial-header-inner">
          <Link className="trial-brand" to="/" aria-label="Satset Motion, ke beranda">
            <span className="trial-brand-mark" aria-hidden="true">
              S
            </span>
            <span>Satset Motion</span>
          </Link>

          <div className="trial-crumb">
            <span>ide → narasi → suara → animasi</span>
            <strong>Proyek baru</strong>
          </div>

          <div className="trial-header-actions">
            <div className="trial-help-wrap" ref={helpRef}>
              <button
                type="button"
                className="trial-help-btn"
                aria-label="Bantuan"
                aria-expanded={helpOpen}
                aria-controls="trial-help-panel"
                onClick={() => setHelpOpen((value) => !value)}
              >
                ?
              </button>
              {helpOpen && (
                <div className="trial-help-panel" id="trial-help-panel">
                  <p>
                    Isi nama proyek kalau mau. Kalau dikosongkan, kita pakai
                    "Video pertamaku". Setelah itu kamu masuk ke studio.
                  </p>
                  <div className="trial-help-actions">
                    <a href="/#faq">Buka FAQ</a>
                    <button type="button" onClick={() => setHelpOpen(false)}>
                      Tutup
                    </button>
                  </div>
                </div>
              )}
            </div>

            {CLOUD_READY ? (
              <Link className="trial-affiliate" to="/affiliate">
                <span className="trial-affiliate-top">GABUNG</span>
                <strong>AFILIASI</strong>
                <span className="trial-affiliate-sub">Komisi</span>
              </Link>
            ) : (
              <span
                className="trial-affiliate is-static"
                title="Program afiliasi aktif setelah login"
              >
                <span className="trial-affiliate-top">PROGRAM</span>
                <strong>AFILIASI</strong>
                <span className="trial-affiliate-sub">Komisi</span>
              </span>
            )}

            <Link className="trial-price" to="/pricing">
              Lihat Harga
            </Link>

            <span className="trial-credit" title={creditLabel}>
              <span className="trial-dot" aria-hidden="true" />
              {creditLabel}
            </span>

            {user ? (
              <Link
                className="trial-avatar"
                to="/profile"
                aria-label={`Buka profil ${displayName}`}
              >
                {initial}
              </Link>
            ) : CLOUD_READY ? (
              <Link className="trial-avatar" to="/login" aria-label="Masuk">
                {initial}
              </Link>
            ) : (
              <span className="trial-avatar is-static" aria-hidden="true">
                {initial}
              </span>
            )}
          </div>
        </div>
      </header>

      <main className="trial-main">
        <section className="trial-welcome" aria-labelledby="trial-title">
          <h1 id="trial-title">
            Halo, {displayName}!{' '}
            <span className="trial-wave" aria-hidden="true">
              👋
            </span>
          </h1>
          <p className="trial-sub">
            Yuk bikin video pertamamu. Mulai dengan membuat proyek baru.
          </p>

          <form className="trial-card" onSubmit={handleSubmit}>
            <label className="trial-label" htmlFor="project-name">
              Nama proyek (boleh dikosongkan)
            </label>
            <input
              id="project-name"
              className="trial-input"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="contoh: Video disiplin pagi"
              maxLength={80}
              autoComplete="off"
            />
            <button className="trial-create" type="submit">
              <span aria-hidden="true">+</span> Buat proyek baru
            </button>

            {showTip && (
              <div className="trial-tip">
                <p>Klik di sini untuk membuat proyek baru</p>
                <button
                  type="button"
                  className="trial-tip-close"
                  onClick={dismissTip}
                >
                  <span aria-hidden="true">×</span> Matikan
                </button>
              </div>
            )}
          </form>

          {!showTip && (
            <p className="trial-note">
              Nama boleh kosong. Semua proses di browser, tanpa kartu kredit.
            </p>
          )}
        </section>
      </main>
    </div>
  );
}
