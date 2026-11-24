/**
 * Auth Components - Login, Register, Profile
 * Clean-room implementation with Supabase Auth integration
 */

import React, { useState, useEffect } from 'react';
import { useAuth, useSupabaseAuth } from '../hooks/useAuth.js';
import { Link, useNavigate, useLocation } from 'react-router-dom';

/**
 * Login Form
 */
export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const { signInWithEmail } = useSupabaseAuth();
  const { refresh } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/studio';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await signInWithEmail(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || 'Login gagal');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-card">
      <h2>Masuk</h2>
      <p className="auth-sub">Masuk untuk mengakses proyek Anda</p>

      {error && <div className="auth-error">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            disabled={loading}
          />
        </div>

        <div className="field">
          <label htmlFor="password">Kata Sandi</label>
          <div className="password-input">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              disabled={loading}
            />
            <button
              type="button"
              className="toggle-password"
              onClick={() => setShowPassword(!showPassword)}
              disabled={loading}
            >
              {showPassword ? 'Sembunyikan' : 'Tampilkan'}
            </button>
          </div>
        </div>

        <button type="submit" className="btn primary" disabled={loading || !email || !password}>
          {loading ? 'Memproses...' : 'Masuk'}
        </button>
      </form>

      <div className="auth-links">
        <p>Belum punya akun? <Link to="/register">Daftar</Link></p>
      </div>
    </div>
  );
}

/**
 * Register Form
 */
export function RegisterForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const { signUpWithEmail } = useSupabaseAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Kata sandi tidak cocok');
      return;
    }

    if (password.length < 8) {
      setError('Kata sandi minimal 8 karakter');
      return;
    }

    setLoading(true);

    try {
      await signUpWithEmail(email, password, { full_name: name });
      setError('success');
      // Redirect to login with success message
      setTimeout(() => navigate('/login?registered=true'), 1500);
    } catch (err) {
      setError(err.message || 'Registrasi gagal');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-card">
      <h2>Daftar Akun</h2>
      <p className="auth-sub">Buat akun untuk memulai</p>

      {error === 'success' && (
        <div className="auth-success">Akun dibuat! Silakan cek email untuk verifikasi.</div>
      )}
      {error && error !== 'success' && <div className="auth-error">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="name">Nama Lengkap</label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoComplete="name"
            disabled={loading}
          />
        </div>

        <div className="field">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            disabled={loading}
          />
        </div>

        <div className="field">
          <label htmlFor="password">Kata Sandi</label>
          <div className="password-input">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
              disabled={loading}
              minLength={8}
            />
            <button
              type="button"
              className="toggle-password"
              onClick={() => setShowPassword(!showPassword)}
              disabled={loading}
            >
              {showPassword ? 'Sembunyikan' : 'Tampilkan'}
            </button>
          </div>
        </div>

        <div className="field">
          <label htmlFor="confirmPassword">Konfirmasi Kata Sandi</label>
          <input
            id="confirmPassword"
            type={showPassword ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            autoComplete="new-password"
            disabled={loading}
          />
        </div>

        <button type="submit" className="btn primary" disabled={loading || !email || !password || !name}>
          {loading ? 'Memproses...' : 'Daftar'}
        </button>
      </form>

      <div className="auth-links">
        <p>Sudah punya akun? <Link to="/login">Masuk</Link></p>
      </div>
    </div>
  );
}

/**
 * Profile Page Component
 */
export function ProfilePage() {
  const { profile, plan, preferences, loading, updateProfile, signOut } = useAuth();
  const navigate = useNavigate();
  const { updatePassword } = useSupabaseAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  // Profile form state
  const [formData, setFormData] = useState({
    display_name: '',
    avatar_url: '',
  });

  // Password change state
  const [passwordData, setPasswordData] = useState({
    current: '',
    new: '',
    confirm: '',
  });
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    if (profile) {
      setFormData({
        display_name: profile.display_name || '',
        avatar_url: profile.avatar_url || '',
      });
    }
  }, [profile]);

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');

    try {
      await updateProfile(formData);
      setMessage({ type: 'success', text: 'Profil diperbarui' });
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setChangingPassword(true);
    setMessage('');

    if (passwordData.new !== passwordData.confirm) {
      setMessage({ type: 'error', text: 'Konfirmasi kata sandi tidak cocok' });
      setChangingPassword(false);
      return;
    }

    if (passwordData.new.length < 8) {
      setMessage({ type: 'error', text: 'Kata sandi baru minimal 8 karakter' });
      setChangingPassword(false);
      return;
    }

    try {
      await updatePassword(passwordData.new);
      setPasswordData({ current: '', new: '', confirm: '' });
      setMessage({ type: 'success', text: 'Kata sandi diubah' });
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setChangingPassword(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (err) {
      console.error('Sign out failed:', err);
    }
  };

  if (loading) return <div className="loading">Memuat...</div>;
  if (!profile) return <div className="auth-card">Silakan <Link to="/login">masuk</Link> terlebih dahulu.</div>;

  return (
    <div className="profile-page">
      <div className="profile-header">
        <div className="avatar">
          {formData.avatar_url ? (
            <img src={formData.avatar_url} alt={formData.display_name} />
          ) : (
            <span>{formData.display_name?.[0]?.toUpperCase() || 'U'}</span>
          )}
        </div>
        <div className="profile-info">
          <h1>{formData.display_name || 'Pengguna'}</h1>
          <p className="plan-badge plan-{plan?.id || 'free'}">
            {plan?.name || 'Gratis'}
          </p>
        </div>
      </div>

      <div className="profile-tabs">
        <button className={activeTab === 'profile' ? 'active' : ''} onClick={() => setActiveTab('profile')}>
          Profil
        </button>
        <button className={activeTab === 'security' ? 'active' : ''} onClick={() => setActiveTab('security')}>
          Keamanan
        </button>
        <button className={activeTab === 'plan' ? 'active' : ''} onClick={() => setActiveTab('plan')}>
          Langganan
        </button>
      </div>

      {message && (
        <div className={`auth-message ${message.type}`}>{message.text}</div>
      )}

      {activeTab === 'profile' && (
        <form onSubmit={handleProfileSave} className="profile-form">
          <div className="field">
            <label htmlFor="display_name">Nama Tampil</label>
            <input
              id="display_name"
              type="text"
              value={formData.display_name}
              onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
              required
            />
          </div>

          <div className="field">
            <label htmlFor="avatar_url">URL Avatar (opsional)</label>
            <input
              id="avatar_url"
              type="url"
              value={formData.avatar_url}
              onChange={(e) => setFormData({ ...formData, avatar_url: e.target.value })}
              placeholder="https://example.com/avatar.png"
            />
          </div>

          <div className="field">
            <label>Email</label>
            <input type="email" value={profile.email || ''} disabled />
            <small className="hint">Email tidak bisa diubah di sini</small>
          </div>

          <button type="submit" className="btn primary" disabled={saving}>
            {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
          </button>
        </form>
      )}

      {activeTab === 'security' && (
        <form onSubmit={handlePasswordChange} className="profile-form">
          <h3>Ubah Kata Sandi</h3>

          <div className="field">
            <label htmlFor="current">Kata Sandi Saat Ini</label>
            <input
              id="current"
              type="password"
              value={passwordData.current}
              onChange={(e) => setPasswordData({ ...passwordData, current: e.target.value })}
              required
              disabled={changingPassword}
            />
          </div>

          <div className="field">
            <label htmlFor="new">Kata Sandi Baru</label>
            <input
              id="new"
              type="password"
              value={passwordData.new}
              onChange={(e) => setPasswordData({ ...passwordData, new: e.target.value })}
              required
              minLength={8}
              disabled={changingPassword}
            />
          </div>

          <div className="field">
            <label htmlFor="confirm">Konfirmasi Kata Sandi Baru</label>
            <input
              id="confirm"
              type="password"
              value={passwordData.confirm}
              onChange={(e) => setPasswordData({ ...passwordData, confirm: e.target.value })}
              required
              disabled={changingPassword}
            />
          </div>

          <button type="submit" className="btn primary" disabled={changingPassword || !passwordData.current || !passwordData.new}>
            {changingPassword ? 'Mengubah...' : 'Ubah Kata Sandi'}
          </button>
        </form>
      )}

      {activeTab === 'plan' && (
        <div className="plan-section">
          <h3>Paket Saat Ini: {plan?.name || 'Gratis'}</h3>
          <p className="plan-desc">{plan?.features?.join(' · ') || 'Fitur dasar'}</p>

          <div className="plan-limits">
            <h4>Batas Penggunaan</h4>
            <ul>
              {plan?.limits && Object.entries(plan.limits).map(([key, value]) => (
                <li key={key}>
                  <span>{key.replace(/_/g, ' ')}:</span>
                  <strong>{value === -1 ? 'Tak Terbatas' : value}</strong>
                </li>
              ))}
            </ul>
          </div>

          <div className="plan-actions">
            <button className="btn secondary" onClick={() => navigate('/pricing')}>
              Lihat Paket Lainnya
            </button>
            {plan?.id !== 'free' && (
              <button className="btn danger" onClick={() => { /* downgrade logic */ }}>
                Turunkan ke Gratis
              </button>
            )}
          </div>
        </div>
      )}

      <div className="profile-danger">
        <button className="btn danger" onClick={handleSignOut}>
          Keluar
        </button>
      </div>
    </div>
  );
}

/**
 * Protected Route Wrapper
 */
export function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate('/login', { state: { from: location }, replace: true });
    }
  }, [isAuthenticated, loading, navigate, location]);

  if (loading) return <div className="loading">Memeriksa autentikasi...</div>;
  if (!isAuthenticated) return null;

  return children;
}