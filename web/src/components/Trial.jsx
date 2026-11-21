import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TrialHeader, { useTrialIdentity } from './TrialHeader.jsx';
import './trial.css';

function readTipPreference() {
  try {
    return localStorage.getItem('satset:trial-tip') !== 'off';
  } catch {
    return true;
  }
}

export default function Trial() {
  const navigate = useNavigate();
  const { displayName } = useTrialIdentity();
  const [name, setName] = useState('');
  const [showTip, setShowTip] = useState(readTipPreference);

  useEffect(() => {
    const previousTitle = document.title;
    document.title = 'Proyek baru - Satset Motion';
    return () => {
      document.title = previousTitle;
    };
  }, []);

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
    navigate('/app/trial/mulai', { state: { projectTitle } });
  };

  return (
    <div className="trial-page">
      <TrialHeader />

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
