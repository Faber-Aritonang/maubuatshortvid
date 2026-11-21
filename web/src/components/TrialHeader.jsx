import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/index.js';

const CLOUD_READY = Boolean(
  import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY
);

export function useTrialIdentity() {
  const user = useAuthStore((state) => state.user);
  const profile = useAuthStore((state) => state.profile);
  const plan = useAuthStore((state) => state.plan);

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

  return { user, profile, plan, displayName, initial, creditLabel };
}

export default function TrialHeader() {
  const { user, displayName, initial, creditLabel } = useTrialIdentity();
  const [helpOpen, setHelpOpen] = useState(false);
  const helpRef = useRef(null);

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

  return (
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
                  "Video pertamaku". Setelah itu pilih cara mulai, lalu masuk ke
                  studio.
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
  );
}
