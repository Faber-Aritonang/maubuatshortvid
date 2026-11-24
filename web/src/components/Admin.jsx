/**
 * Admin Dashboard Components
 * Requires admin role (profiles.role = 'admin')
 */

import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/index.js';
import { supabase } from '../lib/supabase.js';

/**
 * Admin Page - Main admin dashboard
 */
export function AdminPage() {
  const { profile } = useAuthStore();
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({});
  const [users, setUsers] = useState([]);
  const [plans, setPlans] = useState([]);
  const [affiliates, setAffiliates] = useState([]);
  const [settings, setSettings] = useState({});

  // Check admin permission
  useEffect(() => {
    if (profile?.role !== 'admin') {
      window.location.href = '/';
      return;
    }
    loadAllData();
  }, [profile]);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [statsRes, usersRes, plansRes, affiliatesRes, settingsRes] = await Promise.all([
        fetchAdminStats(),
        fetchUsers(),
        fetchPlans(),
        fetchAffiliates(),
        fetchSettings(),
      ]);
      setStats(statsRes);
      setUsers(usersRes);
      setPlans(plansRes);
      setAffiliates(affiliatesRes);
      setSettings(settingsRes);
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAdminStats = async () => {
    const { data, error } = await supabase.rpc('admin_get_stats');
    if (error) throw error;
    return data || {};
  };

  const fetchUsers = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, display_name, email, role, plan_id, created_at, quota_exports_used, quota_exports_limit, quota_tts_chars_used, quota_tts_chars_limit')
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) throw error;
    return data || [];
  };

  const fetchPlans = async () => {
    const { data, error } = await supabase
      .from('plans')
      .select('*')
      .order('sort_order');
    if (error) throw error;
    return data || [];
  };

  const fetchAffiliates = async () => {
    const { data, error } = await supabase
      .from('affiliates')
      .select(`
        *,
        profiles!inner(display_name, email),
        affiliate_sales(count)
      `)
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) throw error;
    return data || [];
  };

  const fetchSettings = async () => {
    const { data, error } = await supabase
      .from('app_settings')
      .select('*')
      .single();
    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
    return data || {};
  };

  const handleUpdateUserPlan = async (userId, newPlanId) => {
    const { error } = await supabase.rpc('admin_set_plan', {
      target_user_id: userId,
      new_plan_id: newPlanId,
    });
    if (error) throw error;
    await loadAllData();
  };

  const handleUpdateUserRole = async (userId, newRole) => {
    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', userId);
    if (error) throw error;
    await loadAllData();
  };

  const handleCreatePlan = async (planData) => {
    const { error } = await supabase
      .from('plans')
      .insert(planData);
    if (error) throw error;
    await loadAllData();
  };

  const handleUpdatePlan = async (planId, updates) => {
    const { error } = await supabase
      .from('plans')
      .update(updates)
      .eq('id', planId);
    if (error) throw error;
    await loadAllData();
  };

  const handleDeletePlan = async (planId) => {
    if (!confirm('Hapus paket ini? Tindakan tidak dapat dibatalkan.')) return;
    const { error } = await supabase
      .from('plans')
      .delete()
      .eq('id', planId);
    if (error) throw error;
    await loadAllData();
  };

  const handleUpdateSettings = async (newSettings) => {
    const { error } = await supabase
      .from('app_settings')
      .upsert({ id: 1, ...newSettings });
    if (error) throw error;
    await loadAllData();
  };

  if (loading) {
    return <div className="admin-loading">Memuat dashboard admin...</div>;
  }

  return (
    <div className="admin-page">
      <header className="admin-header">
        <h1>Dashboard Admin</h1>
        <div className="admin-stats">
          <div className="stat-card">
            <span className="stat-value">{stats.total_users || 0}</span>
            <span className="stat-label">Total Pengguna</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">{stats.active_subscriptions || 0}</span>
            <span className="stat-label">Berlangganan Aktif</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">{stats.total_affiliates || 0}</span>
            <span className="stat-label">Afiliasi</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">Rp {(stats.total_revenue || 0).toLocaleString('id-ID')}</span>
            <span className="stat-label">Total Pendapatan</span>
          </div>
        </div>
      </header>

      <nav className="admin-tabs">
        <button className={activeTab === 'overview' ? 'active' : ''} onClick={() => setActiveTab('overview')}>
          Ringkasan
        </button>
        <button className={activeTab === 'users' ? 'active' : ''} onClick={() => setActiveTab('users')}>
          Pengguna
        </button>
        <button className={activeTab === 'plans' ? 'active' : ''} onClick={() => setActiveTab('plans')}>
          Paket
        </button>
        <button className={activeTab === 'affiliates' ? 'active' : ''} onClick={() => setActiveTab('affiliates')}>
          Afiliasi
        </button>
        <button className={activeTab === 'settings' ? 'active' : ''} onClick={() => setActiveTab('settings')}>
          Pengaturan
        </button>
      </nav>

      <main className="admin-content">
        {activeTab === 'overview' && <OverviewTab stats={stats} />}
        {activeTab === 'users' && <UsersTab users={users} plans={plans} onUpdatePlan={handleUpdateUserPlan} onUpdateRole={handleUpdateUserRole} />}
        {activeTab === 'plans' && <PlansTab plans={plans} onCreate={handleCreatePlan} onUpdate={handleUpdatePlan} onDelete={handleDeletePlan} />}
        {activeTab === 'affiliates' && <AffiliatesTab affiliates={affiliates} />}
        {activeTab === 'settings' && <SettingsTab settings={settings} onUpdate={handleUpdateSettings} />}
      </main>
    </div>
  );
}

/**
 * Overview Tab
 */
function OverviewTab({ stats }) {
  return (
    <div className="admin-tab">
      <h2>Ringkasan Sistem</h2>
      <div className="overview-grid">
        <div className="overview-card">
          <h3>Statistik Pengguna</h3>
          <dl>
            <dt>Total Pengguna</dt><dd>{stats.total_users || 0}</dd>
            <dt>Pengguna Baru (30 hari)</dt><dd>{stats.new_users_30d || 0}</dd>
            <dt>Pengguna Aktif (7 hari)</dt><dd>{stats.active_users_7d || 0}</dd>
          </dl>
        </div>
        <div className="overview-card">
          <h3>Langganan</h3>
          <dl>
            <dt>Berlangganan Aktif</dt><dd>{stats.active_subscriptions || 0}</dd>
            <dt>Paket Gratis</dt><dd>{stats.free_users || 0}</dd>
            <dt>Paket Pro</dt><dd>{stats.pro_users || 0}</dd>
            <dt>Paket Agency</dt><dd>{stats.agency_users || 0}</dd>
          </dl>
        </div>
        <div className="overview-card">
          <h3>Afiliasi</h3>
          <dl>
            <dt>Total Afiliasi</dt><dd>{stats.total_affiliates || 0}</dd>
            <dt>Penjualan Bulan Ini</dt><dd>{stats.affiliate_sales_month || 0}</dd>
            <dt>Komisi Bulan Ini</dt><dd>Rp {(stats.affiliate_commission_month || 0).toLocaleString('id-ID')}</dd>
          </dl>
        </div>
        <div className="overview-card">
          <h3>Pendapatan</h3>
          <dl>
            <dt>Total Pendapatan</dt><dd>Rp {(stats.total_revenue || 0).toLocaleString('id-ID')}</dd>
            <dt>Pendapatan Bulan Ini</dt><dd>Rp {(stats.revenue_month || 0).toLocaleString('id-ID')}</dd>
            <dt>Pendapatan Tahun Ini</dt><dd>Rp {(stats.revenue_year || 0).toLocaleString('id-ID')}</dd>
          </dl>
        </div>
      </div>
    </div>
  );
}

/**
 * Users Management Tab
 */
function UsersTab({ users, plans, onUpdatePlan, onUpdateRole }) {
  const [editingUser, setEditingUser] = useState(null);

  return (
    <div className="admin-tab">
      <h2>Manajemen Pengguna</h2>
      <div className="table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Nama</th>
              <th>Email</th>
              <th>Peran</th>
              <th>Paket</th>
              <th>Kuota Export</th>
              <th>Kuota TTS</th>
              <th>Bergabung</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>{user.display_name || '-'}</td>
                <td>{user.email}</td>
                <td>
                  <select
                    value={user.role}
                    onChange={(e) => onUpdateRole(user.id, e.target.value)}
                    className="small-select"
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                </td>
                <td>
                  <select
                    value={user.plan_id}
                    onChange={(e) => onUpdatePlan(user.id, e.target.value)}
                    className="small-select"
                  >
                    {plans.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </td>
                <td>{user.quota_exports_used || 0} / {user.quota_exports_limit === -1 ? '∞' : user.quota_exports_limit || 0}</td>
                <td>{(user.quota_tts_chars_used || 0).toLocaleString()} / {(user.quota_tts_chars_limit || 0).toLocaleString()}</td>
                <td>{new Date(user.created_at).toLocaleDateString('id-ID')}</td>
                <td>
                  <button className="btn small" onClick={() => setEditingUser(user)}>
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/**
 * Plans Management Tab
 */
function PlansTab({ plans, onCreate, onUpdate, onDelete }) {
  const [showForm, setShowForm] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    price_monthly: 0,
    price_yearly: 0,
    features: [],
    limits: { exports_per_month: 10, tts_chars_per_month: 50000, max_scenes: 6, max_duration: 90 },
    is_active: true,
    sort_order: 0,
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const data = {
      ...formData,
      price_monthly: Number(formData.price_monthly),
      price_yearly: Number(formData.price_yearly),
      sort_order: Number(formData.sort_order),
      limits: {
        exports_per_month: Number(formData.limits.exports_per_month),
        tts_chars_per_month: Number(formData.limits.tts_chars_per_month),
        max_scenes: Number(formData.limits.max_scenes),
        max_duration: Number(formData.limits.max_duration),
      },
      features: formData.features.filter(f => f.trim()),
    };
    if (editingPlan) {
      await onUpdate(editingPlan.id, data);
    } else {
      await onCreate(data);
    }
    setShowForm(false);
    setEditingPlan(null);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      id: '',
      name: '',
      price_monthly: 0,
      price_yearly: 0,
      features: [''],
      limits: { exports_per_month: 10, tts_chars_per_month: 50000, max_scenes: 6, max_duration: 90 },
      is_active: true,
      sort_order: 0,
    });
  };

  const handleEdit = (plan) => {
    setEditingPlan(plan);
    setFormData({
      id: plan.id,
      name: plan.name,
      price_monthly: plan.price_monthly,
      price_yearly: plan.price_yearly,
      features: plan.features || [''],
      limits: plan.limits || { exports_per_month: 10, tts_chars_per_month: 50000, max_scenes: 6, max_duration: 90 },
      is_active: plan.is_active,
      sort_order: plan.sort_order,
    });
    setShowForm(true);
  };

  return (
    <div className="admin-tab">
      <div className="tab-header">
        <h2>Manajemen Paket</h2>
        <button className="btn primary" onClick={() => { resetForm(); setEditingPlan(null); setShowForm(true); }}>
          + Tambah Paket
        </button>
      </div>

      {showForm && (
        <div className="admin-modal-overlay" onClick={() => { setShowForm(false); setEditingPlan(null); }}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <h3>{editingPlan ? 'Edit Paket' : 'Tambah Paket Baru'}</h3>
            <form onSubmit={handleSubmit}>
              <div className="field">
                <label>ID Paket (unik, tidak bisa diubah setelah dibuat)</label>
                <input
                  type="text"
                  value={formData.id}
                  onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                  disabled={!!editingPlan}
                  required
                />
              </div>
              <div className="field">
                <label>Nama Paket</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="controls-grid">
                <div className="field">
                  <label>Harga Bulanan (sen)</label>
                  <input
                    type="number"
                    value={formData.price_monthly}
                    onChange={(e) => setFormData({ ...formData, price_monthly: e.target.value })}
                    min="0"
                  />
                </div>
                <div className="field">
                  <label>Harga Tahunan (sen)</label>
                  <input
                    type="number"
                    value={formData.price_yearly}
                    onChange={(e) => setFormData({ ...formData, price_yearly: e.target.value })}
                    min="0"
                  />
                </div>
              </div>
              <div className="field">
                <label>Fitur (satu per baris)</label>
                <textarea
                  value={formData.features.join('\n')}
                  onChange={(e) => setFormData({ ...formData, features: e.target.value.split('\n') })}
                  rows={4}
                />
              </div>
              <fieldset className="field">
                <legend>Batasan</legend>
                <div className="controls-grid">
                  <div className="field">
                    <label>Export/bulan (-1 = unlimited)</label>
                    <input
                      type="number"
                      value={formData.limits.exports_per_month}
                      onChange={(e) => setFormData({ ...formData, limits: { ...formData.limits, exports_per_month: Number(e.target.value) } })}
                    />
                  </div>
                  <div className="field">
                    <label>Karakter TTS/bulan</label>
                    <input
                      type="number"
                      value={formData.limits.tts_chars_per_month}
                      onChange={(e) => setFormData({ ...formData, limits: { ...formData.limits, tts_chars_per_month: Number(e.target.value) } })}
                    />
                  </div>
                  <div className="field">
                    <label>Maks Scene</label>
                    <input
                      type="number"
                      value={formData.limits.max_scenes}
                      onChange={(e) => setFormData({ ...formData, limits: { ...formData.limits, max_scenes: Number(e.target.value) } })}
                    />
                  </div>
                  <div className="field">
                    <label>Maks Durasi (detik)</label>
                    <input
                      type="number"
                      value={formData.limits.max_duration}
                      onChange={(e) => setFormData({ ...formData, limits: { ...formData.limits, max_duration: Number(e.target.value) } })}
                    />
                  </div>
                </div>
              </fieldset>
              <div className="controls-grid">
                <div className="field">
                  <label>
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    />
                    Aktif
                  </label>
                </div>
                <div className="field">
                  <label>Urutan Tampil</label>
                  <input
                    type="number"
                    value={formData.sort_order}
                    onChange={(e) => setFormData({ ...formData, sort_order: Number(e.target.value) })}
                  />
                </div>
              </div>
              <div className="form-actions">
                <button type="button" className="btn secondary" onClick={() => { setShowForm(false); setEditingPlan(null); }}>
                  Batal
                </button>
                <button type="submit" className="btn primary">
                  {editingPlan ? 'Update' : 'Buat'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Nama</th>
              <th>Harga Bulanan</th>
              <th>Harga Tahunan</th>
              <th>Export/bln</th>
              <th>TTS/bln</th>
              <th>Max Scene</th>
              <th>Status</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {plans.map((plan) => (
              <tr key={plan.id}>
                <td><code>{plan.id}</code></td>
                <td>{plan.name}</td>
                <td>Rp {(plan.price_monthly / 100).toLocaleString('id-ID')}</td>
                <td>Rp {(plan.price_yearly / 100).toLocaleString('id-ID')}</td>
                <td>{plan.limits?.exports_per_month === -1 ? '∞' : plan.limits?.exports_per_month || 0}</td>
                <td>{(plan.limits?.tts_chars_per_month || 0).toLocaleString()}</td>
                <td>{plan.limits?.max_scenes || 6}</td>
                <td><span className={`badge ${plan.is_active ? 'active' : 'inactive'}`}>{plan.is_active ? 'Aktif' : 'Nonaktif'}</span></td>
                <td>
                  <button className="btn small" onClick={() => handleEdit(plan)}>Edit</button>
                  <button className="btn small danger" onClick={() => onDelete(plan.id)}>Hapus</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/**
 * Affiliates Tab
 */
function AffiliatesTab({ affiliates }) {
  return (
    <div className="admin-tab">
      <h2>Manajemen Afiliasi</h2>
      <div className="table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Kode</th>
              <th>Pengguna</th>
              <th>Komisi (%)</th>
              <th>Penjualan</th>
              <th>Total Komisi</th>
              <th>Status</th>
              <th>Dibuat</th>
            </tr>
          </thead>
          <tbody>
            {affiliates.map((aff) => (
              <tr key={aff.id}>
                <td><code>{aff.code}</code></td>
                <td>
                  <div>{aff.profiles?.display_name || '-'}</div>
                  <small>{aff.profiles?.email}</small>
                </td>
                <td>{aff.commission_rate}%</td>
                <td>{aff.affiliate_sales?.[0]?.count || 0}</td>
                <td>Rp {(aff.total_commission_earned || 0).toLocaleString('id-ID')}</td>
                <td><span className={`badge ${aff.is_active ? 'active' : 'inactive'}`}>{aff.is_active ? 'Aktif' : 'Nonaktif'}</span></td>
                <td>{new Date(aff.created_at).toLocaleDateString('id-ID')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/**
 * Settings Tab
 */
function SettingsTab({ settings, onUpdate }) {
  const [formData, setFormData] = useState({
    site_name: settings?.site_name || 'MauBuatShortVid',
    site_description: settings?.site_description || '',
    maintenance_mode: settings?.maintenance_mode || false,
    allow_registration: settings?.allow_registration !== false,
    default_plan_id: settings?.default_plan_id || 'free',
    max_file_size_mb: settings?.max_file_size_mb || 50,
    contact_email: settings?.contact_email || '',
    smtp_host: settings?.smtp_host || '',
    smtp_port: settings?.smtp_port || 587,
    smtp_user: settings?.smtp_user || '',
    smtp_pass: settings?.smtp_pass || '',
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    await onUpdate(formData);
  };

  return (
    <div className="admin-tab">
      <h2>Pengaturan Aplikasi</h2>
      <form onSubmit={handleSubmit} className="settings-form">
        <section>
          <h3>Umum</h3>
          <div className="field">
            <label>Nama Situs</label>
            <input type="text" value={formData.site_name} onChange={(e) => setFormData({ ...formData, site_name: e.target.value })} />
          </div>
          <div className="field">
            <label>Deskripsi</label>
            <textarea value={formData.site_description} onChange={(e) => setFormData({ ...formData, site_description: e.target.value })} rows={3} />
          </div>
          <div className="controls-grid">
            <div className="field">
              <label>
                <input type="checkbox" checked={formData.maintenance_mode} onChange={(e) => setFormData({ ...formData, maintenance_mode: e.target.checked })} />
                Mode Maintenance
              </label>
            </div>
            <div className="field">
              <label>
                <input type="checkbox" checked={formData.allow_registration} onChange={(e) => setFormData({ ...formData, allow_registration: e.target.checked })} />
                Izinkan Pendaftaran
              </label>
            </div>
          </div>
          <div className="field">
            <label>Paket Default</label>
            <input type="text" value={formData.default_plan_id} onChange={(e) => setFormData({ ...formData, default_plan_id: e.target.value })} />
          </div>
        </section>

        <section>
          <h3>Upload</h3>
          <div className="field">
            <label>Maks Ukuran File (MB)</label>
            <input type="number" value={formData.max_file_size_mb} onChange={(e) => setFormData({ ...formData, max_file_size_mb: Number(e.target.value) })} min="1" max="500" />
          </div>
        </section>

        <section>
          <h3>Email / SMTP</h3>
          <div className="field">
            <label>Email Kontak</label>
            <input type="email" value={formData.contact_email} onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })} />
          </div>
          <div className="controls-grid">
            <div className="field">
              <label>SMTP Host</label>
              <input type="text" value={formData.smtp_host} onChange={(e) => setFormData({ ...formData, smtp_host: e.target.value })} />
            </div>
            <div className="field">
              <label>SMTP Port</label>
              <input type="number" value={formData.smtp_port} onChange={(e) => setFormData({ ...formData, smtp_port: Number(e.target.value) })} />
            </div>
          </div>
          <div className="controls-grid">
            <div className="field">
              <label>SMTP User</label>
              <input type="text" value={formData.smtp_user} onChange={(e) => setFormData({ ...formData, smtp_user: e.target.value })} />
            </div>
            <div className="field">
              <label>SMTP Password</label>
              <input type="password" value={formData.smtp_pass} onChange={(e) => setFormData({ ...formData, smtp_pass: e.target.value })} />
            </div>
          </div>
        </section>

        <button type="submit" className="btn primary">Simpan Pengaturan</button>
      </form>
    </div>
  );
}