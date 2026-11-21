/**
 * Settings Page Component
 */

import React, { useState, useEffect } from 'react';
import { useSettingsStore } from '../store/index.js';
import { useAuthStore } from '../store/index.js';

export function SettingsPage() {
  const { preferences, savePreferences, geminiKeys, loadSettings } = useSettingsStore();
  const { profile } = useAuthStore();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [showKeyForm, setShowKeyForm] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyValue, setNewKeyValue] = useState('');

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleSavePrefs = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await savePreferences(preferences);
      setMessage({ type: 'success', text: 'Pengaturan disimpan' });
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleAddKey = async (e) => {
    e.preventDefault();
    if (!newKeyName || !newKeyValue) return;
    try {
      const { saveGeminiKey } = await import('../lib/api.js');
      await saveGeminiKey(newKeyName, newKeyValue);
      setNewKeyName('');
      setNewKeyValue('');
      setShowKeyForm(false);
      setMessage({ type: 'success', text: 'Kunci API ditambahkan' });
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  const handleRemoveKey = async (id) => {
    if (!confirm('Hapus kunci API ini?')) return;
    try {
      const { deleteGeminiKey } = await import('../lib/api.js');
      await deleteGeminiKey(id);
      setMessage({ type: 'success', text: 'Kunci API dihapus' });
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  const handleSetActive = async (id) => {
    try {
      const { setActiveGeminiKey } = await import('../lib/api.js');
      await setActiveGeminiKey(id);
      setMessage({ type: 'success', text: 'Kunci aktif diubah' });
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  return (
    <div className="settings-page">
      <h1>Pengaturan</h1>

      {message && <div className={`auth-message ${message.type}`}>{message.text}</div>}

      <section className="settings-section">
        <h2>Preferensi Editor</h2>
        <form onSubmit={handleSavePrefs}>
          <div className="field">
            <label>
              <input
                type="checkbox"
                checked={preferences.autoSave !== false}
                onChange={(e) => {
                  const { savePreferences } = useSettingsStore.getState();
                  savePreferences({ ...preferences, autoSave: e.target.checked });
                }}
              />
              Auto-save proyek
            </label>
          </div>

          <div className="field">
            <label>
              <input
                type="checkbox"
                checked={preferences.showHints !== false}
                onChange={(e) => {
                  const { savePreferences } = useSettingsStore.getState();
                  savePreferences({ ...preferences, showHints: e.target.checked });
                }}
              />
              Tampilkan petunjuk
            </label>
          </div>

          <div className="field">
            <label>
              <input
                type="checkbox"
                checked={preferences.darkMode === true}
                onChange={(e) => {
                  const { savePreferences } = useSettingsStore.getState();
                  savePreferences({ ...preferences, darkMode: e.target.checked });
                }}
              />
              Mode gelap (belum diimplementasikan)
            </label>
          </div>

          <button type="submit" className="btn primary" disabled={saving}>
            {saving ? 'Menyimpan...' : 'Simpan Preferensi'}
          </button>
        </form>
      </section>

      <section className="settings-section">
        <h2>Kunci API Gemini (TTS Server)</h2>
        <p className="hint">Kunci disimpan sebagai hash (SHA-256), tidak pernah disimpan plaintext.</p>

        <button className="btn secondary" onClick={() => setShowKeyForm(!showKeyForm)}>
          {showKeyForm ? 'Batal' : '+ Tambah Kunci'}
        </button>

        {showKeyForm && (
          <form onSubmit={handleAddKey} className="key-form">
            <div className="field">
              <label>Nama Kunci</label>
              <input
                type="text"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                placeholder="Misal: kunci utama"
                required
              />
            </div>
            <div className="field">
              <label>Kunci API Gemini</label>
              <input
                type="password"
                value={newKeyValue}
                onChange={(e) => setNewKeyValue(e.target.value)}
                placeholder="AIzaSy..."
                required
              />
            </div>
            <button type="submit" className="btn primary">Simpan</button>
          </form>
        )}

        {geminiKeys.length === 0 ? (
          <p className="empty">Belum ada kunci API. Tambahkan untuk menggunakan TTS server.</p>
        ) : (
          <ul className="key-list">
            {geminiKeys.map((key) => (
              <li key={key.id} className={key.is_active ? 'active' : ''}>
                <div className="key-info">
                  <strong>{key.key_name}</strong>
                  <span className="key-preview">••••{key.key_preview}</span>
                  {key.is_active && <span className="badge active">Aktif</span>}
                  <small>Dibuat: {new Date(key.created_at).toLocaleDateString('id-ID')}</small>
                </div>
                <div className="key-actions">
                  {!key.is_active && (
                    <button className="btn small" onClick={() => handleSetActive(key.id)}>
                      Jadikan Aktif
                    </button>
                  )}
                  <button className="btn small danger" onClick={() => handleRemoveKey(key.id)}>
                    Hapus
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}