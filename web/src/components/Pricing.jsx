/**
 * Pricing Page Component
 * Public page showing available plans
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/index.js';
import { listPlans } from '../lib/api.js';

/**
 * Pricing Page - Public pricing display
 */
export function PricingPage() {
  const { isAuthenticated } = useAuthStore();
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    try {
      const data = await listPlans();
      setPlans(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPlan = (plan) => {
    if (plan.id === 'free') {
      navigate(isAuthenticated ? '/studio' : '/register', {
        state: isAuthenticated ? undefined : { plan: plan.id },
      });
      return;
    }
    // TODO: alur checkout belum ada; tombol sengaja dinonaktifkan setelah login.
    if (!isAuthenticated) {
      navigate('/register', { state: { plan: plan.id } });
    }
  };

  if (loading) {
    return (
      <div className="pricing-page loading">
        <div className="spinner"></div>
        <p>Memuat paket...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="pricing-page error">
        <p>Gagal memuat paket: {error}</p>
        <button className="btn primary" onClick={loadPlans}>Coba Lagi</button>
      </div>
    );
  }

  return (
    <div className="pricing-page">
      <header className="pricing-header">
        <h1>Paket dan batas pemakaian</h1>
        <p>Semua paket membuka editor di browser: ide, naskah, suara, subtitle, animasi, export.</p>
      </header>

      <div className="pricing-grid">
        {plans.map((plan) => (
          <article key={plan.id} className={`pricing-card ${plan.id === 'pro' ? 'popular' : ''}`}>
            {plan.id === 'pro' && <div className="popular-badge">Populer</div>}

            <h3>{plan.name}</h3>
            <div className="price">
              <span className="amount">
                {plan.price_monthly > 0 ? `Rp ${(plan.price_monthly / 100).toLocaleString('id-ID')}` : 'Gratis'}
              </span>
              <span className="period">/bulan</span>
            </div>
            <p className="yearly">
              {plan.price_yearly > 0
                ? `Tahunan: Rp ${(plan.price_yearly / 100).toLocaleString('id-ID')}`
                : 'Tahunan: Gratis'}
            </p>

            <ul className="features">
              {(plan.features || []).map((f, i) => (
                <li key={i}>✓ {f}</li>
              ))}
            </ul>

            <div className="limits">
              <small>
                Batas: {plan.limits?.exports_per_month === -1
                  ? 'Export tak terbatas'
                  : `${plan.limits?.exports_per_month || 0} export/bulan`}
                {plan.limits?.tts_chars_per_month && (
                  <> · {plan.limits.tts_chars_per_month.toLocaleString()} karakter TTS/bulan</>
                )}
              </small>
            </div>

            <button
              className={`btn ${plan.id === 'free' ? 'secondary' : 'primary'} ${plan.id === 'pro' ? 'wide' : ''}`}
              onClick={() => handleSelectPlan(plan)}
              disabled={!plan.is_active || (plan.id !== 'free' && isAuthenticated)}
              title={
                plan.id !== 'free' && isAuthenticated
                  ? 'Checkout belum tersedia di prototype ini'
                  : undefined
              }
            >
              {plan.id === 'free'
                ? 'Gunakan Gratis'
                : plan.id !== 'free' && isAuthenticated
                  ? 'Checkout belum tersedia'
                  : 'Pilih Paket Ini'}
            </button>
          </article>
        ))}
      </div>

      <section className="pricing-comparison">
        <h2>Perbandingan Fitur</h2>
        <div className="comparison-table">
          <table>
            <thead>
              <tr>
                <th>Fitur</th>
                {plans.map((plan) => (
                  <th key={plan.id}>{plan.name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Export Video</td>
                {plans.map((plan) => (
                  <td key={plan.id}>
                    {plan.limits?.exports_per_month === -1 ? 'Tak Terbatas' : `${plan.limits?.exports_per_month || 0}/bln`}
                  </td>
                ))}
              </tr>
              <tr>
                <td>Karakter TTS/bulan</td>
                {plans.map((plan) => (
                  <td key={plan.id}>
                    {(plan.limits?.tts_chars_per_month || 0).toLocaleString()}
                  </td>
                ))}
              </tr>
              <tr>
                <td>Maks Scene per Video</td>
                {plans.map((plan) => (
                  <td key={plan.id}>{plan.limits?.max_scenes || 6}</td>
                ))}
              </tr>
              <tr>
                <td>Maks Durasi Video</td>
                {plans.map((plan) => (
                  <td key={plan.id}>{plan.limits?.max_duration || 90} detik</td>
                ))}
              </tr>
              <tr>
                <td>Gaya Subtitle</td>
                {plans.map((plan) => <td key={plan.id}>Semua (7 gaya)</td>)}
              </tr>
              <tr>
                <td>Preset Kamera</td>
                {plans.map((plan) => <td key={plan.id}>Semua (5 kamera)</td>)}
              </tr>
              <tr>
                <td>Transisi</td>
                {plans.map((plan) => <td key={plan.id}>Semua (5 transisi)</td>)}
              </tr>
              <tr>
                <td>TTS Browser (Gratis)</td>
                {plans.map((plan) => <td key={plan.id}>✓</td>)}
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <footer className="pricing-footer">
        <p>Semua harga dalam Rupiah (IDR). Prototype ini belum punya alur pembayaran.</p>
      </footer>
    </div>
  );
}