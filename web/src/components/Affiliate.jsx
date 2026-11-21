/**
 * Affiliate Dashboard Components
 * Requires affiliate record linked to user profile
 */

import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/index.js';
import { supabase } from '../lib/supabase.js';

/**
 * Affiliate Page - Main affiliate dashboard
 */
export function AffiliatePage() {
  const { profile, user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [affiliate, setAffiliate] = useState(null);
  const [sales, setSales] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [promoUsages, setPromoUsages] = useState([]);

  // Check affiliate permission
  useEffect(() => {
    loadAffiliateData();
  }, [profile]);

  const loadAffiliateData = async () => {
    setLoading(true);
    try {
      // Get affiliate record for current user
      const { data: affData, error: affError } = await supabase
        .from('affiliates')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (affError && affError.code !== 'PGRST116') throw affError;

      if (affData) {
        setAffiliate(affData);

        // Load related data
        const [salesRes, payoutsRes, promoRes] = await Promise.all([
          fetchSales(affData.id),
          fetchPayouts(affData.id),
          fetchPromoUsages(affData.id),
        ]);
        setSales(salesRes);
        setPayouts(payoutsRes);
        setPromoUsages(promoRes);
      }
    } catch (err) {
      console.error('Failed to load affiliate data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSales = async (affiliateId) => {
    const { data, error } = await supabase
      .from('affiliate_sales')
      .select(`
        *,
        profiles!inner(display_name, email),
        promos(code)
      `)
      .eq('affiliate_id', affiliateId)
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) throw error;
    return data || [];
  };

  const fetchPayouts = async (affiliateId) => {
    const { data, error } = await supabase
      .from('affiliate_payouts')
      .select('*')
      .eq('affiliate_id', affiliateId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  };

  const fetchPromoUsages = async (affiliateId) => {
    const { data, error } = await supabase
      .from('promo_usages')
      .select(`
        *,
        profiles!inner(display_name, email),
        promos!inner(code, discount_percent, affiliate_id)
      `)
      .eq('promos.affiliate_id', affiliateId)
      .order('used_at', { ascending: false })
      .limit(100);
    if (error) throw error;
    return data || [];
  };

  const handleCopyLink = () => {
    if (!affiliate) return;
    const link = `${window.location.origin}/register?ref=${affiliate.code}`;
    navigator.clipboard.writeText(link);
    alert('Link afiliasi disalin ke clipboard!');
  };

  if (loading) {
    return <div className="affiliate-loading">Memuat dashboard afiliasi...</div>;
  }

  if (!affiliate) {
    return (
      <div className="affiliate-page no-affiliate">
        <div className="affiliate-card">
          <h1>Dashboard Afiliasi</h1>
          <p>Anda belum terdaftar sebagai afiliasi.</p>
          <p>Hubungi admin untuk mendaftarkan kode afiliasi Anda.</p>
        </div>
      </div>
    );
  }

  const totalCommission = sales.reduce((sum, s) => sum + (s.commission_amount || 0), 0);
  const paidCommission = payouts.filter(p => p.status === 'paid').reduce((sum, p) => sum + (p.amount || 0), 0);
  const pendingCommission = totalCommission - paidCommission;
  const thisMonthSales = sales.filter(s => new Date(s.created_at) > new Date(new Date().setDate(1))).length;
  const thisMonthCommission = sales
    .filter(s => new Date(s.created_at) > new Date(new Date().setDate(1)))
    .reduce((sum, s) => sum + (s.commission_amount || 0), 0);

  return (
    <div className="affiliate-page">
      <header className="affiliate-header">
        <div className="header-info">
          <h1>Dashboard Afiliasi</h1>
          <p>Kode: <code>{affiliate.code}</code> • Komisi: {affiliate.commission_rate}%</p>
        </div>
        <div className="header-actions">
          <button className="btn secondary" onClick={handleCopyLink}>
            📋 Salin Link Referral
          </button>
        </div>
      </header>

      <div className="affiliate-stats">
        <div className="stat-card">
          <span className="stat-value">Rp {pendingCommission.toLocaleString('id-ID')}</span>
          <span className="stat-label">Komisi Tertunda</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">Rp {paidCommission.toLocaleString('id-ID')}</span>
          <span className="stat-label">Sudah Dibayar</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{thisMonthSales}</span>
          <span className="stat-label">Penjualan Bulan Ini</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">Rp {thisMonthCommission.toLocaleString('id-ID')}</span>
          <span className="stat-label">Komisi Bulan Ini</span>
        </div>
      </div>

      <nav className="affiliate-tabs">
        <button className={activeTab === 'dashboard' ? 'active' : ''} onClick={() => setActiveTab('dashboard')}>
          Ringkasan
        </button>
        <button className={activeTab === 'sales' ? 'active' : ''} onClick={() => setActiveTab('sales')}>
          Penjualan
        </button>
        <button className={activeTab === 'promos' ? 'active' : ''} onClick={() => setActiveTab('promos')}>
          Penggunaan Promo
        </button>
        <button className={activeTab === 'payouts' ? 'active' : ''} onClick={() => setActiveTab('payouts')}>
          Pembayaran
        </button>
        <button className={activeTab === 'link' ? 'active' : ''} onClick={() => setActiveTab('link')}>
          Link Referral
        </button>
      </nav>

      <main className="affiliate-content">
        {activeTab === 'dashboard' && <DashboardTab affiliate={affiliate} stats={{ totalCommission, paidCommission, pendingCommission, thisMonthSales, thisMonthCommission }} />}
        {activeTab === 'sales' && <SalesTab sales={sales} />}
        {activeTab === 'promos' && <PromosTab promoUsages={promoUsages} />}
        {activeTab === 'payouts' && <PayoutsTab payouts={payouts} />}
        {activeTab === 'link' && <LinkTab affiliate={affiliate} />}
      </main>
    </div>
  );
}

/**
 * Dashboard Tab
 */
function DashboardTab({ affiliate, stats }) {
  return (
    <div className="affiliate-tab">
      <div className="dashboard-grid">
        <div className="dashboard-card">
          <h3>Ringkasan Komisi</h3>
          <dl>
            <dt>Total Komisi</dt><dd>Rp {stats.totalCommission.toLocaleString('id-ID')}</dd>
            <dt>Sudah Dibayar</dt><dd>Rp {stats.paidCommission.toLocaleString('id-ID')}</dd>
            <dt>Menunggu Bayar</dt><dd>Rp {stats.pendingCommission.toLocaleString('id-ID')}</dd>
          </dl>
        </div>
        <div className="dashboard-card">
          <h3>Performa Bulan Ini</h3>
          <dl>
            <dt>Penjualan</dt><dd>{stats.thisMonthSales}</dd>
            <dt>Komisi</dt><dd>Rp {stats.thisMonthCommission.toLocaleString('id-ID')}</dd>
          </dl>
        </div>
        <div className="dashboard-card">
          <h3>Info Afiliasi</h3>
          <dl>
            <dt>Kode</dt><dd><code>{affiliate.code}</code></dd>
            <dt>Rate Komisi</dt><dd>{affiliate.commission_rate}%</dd>
            <dt>Status</dt><dd><span className={`badge ${affiliate.is_active ? 'active' : 'inactive'}`}>{affiliate.is_active ? 'Aktif' : 'Nonaktif'}</span></dd>
            <dt>Dibuat</dt><dd>{new Date(affiliate.created_at).toLocaleDateString('id-ID')}</dd>
          </dl>
        </div>
        <div className="dashboard-card">
          <h3>Link Referral Anda</h3>
          <p className="referral-link">{window.location.origin}/register?ref={affiliate.code}</p>
          <p className="hint">Bagikan link ini. Saat orang daftar via link ini, Anda dapat komisi dari pembelian mereka.</p>
        </div>
      </div>
    </div>
  );
}

/**
 * Sales Tab
 */
function SalesTab({ sales }) {
  return (
    <div className="affiliate-tab">
      <h2>Riwayat Penjualan</h2>
      {sales.length === 0 ? (
        <p className="empty">Belum ada penjualan.</p>
      ) : (
        <div className="table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Tanggal</th>
                <th>Pelanggan</th>
                <th>Paket</th>
                <th>Jumlah</th>
                <th>Komisi</th>
                <th>Promo Digunakan</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {sales.map((sale) => (
                <tr key={sale.id}>
                  <td>{new Date(sale.created_at).toLocaleDateString('id-ID')}</td>
                  <td>
                    <div>{sale.profiles?.display_name || '—'}</div>
                    <small>{sale.profiles?.email}</small>
                  </td>
                  <td>{sale.plan_id}</td>
                  <td>Rp {(sale.amount / 100).toLocaleString('id-ID')}</td>
                  <td>Rp {(sale.commission_amount || 0).toLocaleString('id-ID')}</td>
                  <td>{sale.promos?.code || '—'}</td>
                  <td><span className={`badge ${sale.status}`}>{sale.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/**
 * Promo Usages Tab
 */
function PromosTab({ promoUsages }) {
  return (
    <div className="affiliate-tab">
      <h2>Penggunaan Kode Promo</h2>
      {promoUsages.length === 0 ? (
        <p className="empty">Belum ada penggunaan kode promo.</p>
      ) : (
        <div className="table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Tanggal</th>
                <th>Pengguna</th>
                <th>Kode Promo</th>
                <th>Diskon</th>
                <th>Paket</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {promoUsages.map((usage) => (
                <tr key={usage.id}>
                  <td>{new Date(usage.used_at).toLocaleDateString('id-ID')}</td>
                  <td>
                    <div>{usage.profiles?.display_name || '—'}</div>
                    <small>{usage.profiles?.email}</small>
                  </td>
                  <td><code>{usage.promos?.code}</code></td>
                  <td>{usage.promos?.discount_percent}%</td>
                  <td>{usage.plan_id}</td>
                  <td><span className={`badge ${usage.status}`}>{usage.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/**
 * Payouts Tab
 */
function PayoutsTab({ payouts }) {
  return (
    <div className="affiliate-tab">
      <h2>Riwayat Pembayaran Komisi</h2>
      {payouts.length === 0 ? (
        <p className="empty">Belum ada pembayaran.</p>
      ) : (
        <div className="table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Tanggal</th>
                <th>Periode</th>
                <th>Jumlah</th>
                <th>Metode</th>
                <th>Status</th>
                <th>Catatan</th>
              </tr>
            </thead>
            <tbody>
              {payouts.map((payout) => (
                <tr key={payout.id}>
                  <td>{new Date(payout.created_at).toLocaleDateString('id-ID')}</td>
                  <td>{payout.period_start} - {payout.period_end}</td>
                  <td>Rp {(payout.amount || 0).toLocaleString('id-ID')}</td>
                  <td>{payout.method || '—'}</td>
                  <td><span className={`badge ${payout.status}`}>{payout.status}</span></td>
                  <td>{payout.notes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/**
 * Referral Link Tab
 */
function LinkTab({ affiliate }) {
  const referralLink = `${window.location.origin}/register?ref=${affiliate.code}`;
  const [copied, setCopied] = useState(false);

  return (
    <div className="affiliate-tab">
      <h2>Link Referral Anda</h2>

      <div className="link-card">
        <div className="link-display">
          <input
            type="text"
            value={referralLink}
            readOnly
            className="referral-input"
          />
          <button
            className="btn secondary"
            onClick={() => {
              navigator.clipboard.writeText(referralLink);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
          >
            {copied ? '✓ Disalin!' : '📋 Salin'}
          </button>
        </div>

        <div className="link-info">
          <h3>Cara Kerja</h3>
          <ol>
            <li>Bagikan link di atas ke audiens Anda (media sosial, blog, email, dll)</li>
            <li>Orang mengklik link dan mendaftar di MauBuatShortVid</li>
            <li>Saat mereka berlangganan paket berbayar, Anda mendapat komisi {affiliate.commission_rate}%</li>
            <li>Komisi dikumpulkan dan dibayar sesuai jadwal pembayaran</li>
          </ol>
        </div>

        <div className="link-info">
          <h3>Tips Promosi</h3>
          <ul>
            <li>Buat konten demo/video tutorial menggunakan MauBuatShortVid</li>
            <li>Sertakan link referral di bio/profile media sosial</li>
            <li>Tawarkan bonus sendiri (template, panduan) bagi yang daftar via link Anda</li>
            <li>Gunakan kode promo khusus jika admin memberikan</li>
          </ul>
        </div>

        <div className="link-qr">
          <h3>QR Code (untuk sharing offline)</h3>
          <div className="qr-placeholder">
            <p>QR Code generator bisa ditambahkan di sini</p>
            <small>Link: {referralLink}</small>
          </div>
        </div>
      </div>
    </div>
  );
}