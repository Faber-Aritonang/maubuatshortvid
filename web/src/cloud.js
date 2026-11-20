// Simpan/buka project di Supabase (opsional).
//
// Aktif hanya bila dua variabel ini ada saat build/dev:
//   VITE_SUPABASE_URL=https://xxxx.supabase.co
//   VITE_SUPABASE_ANON_KEY=eyJ...
// Tanpa itu aplikasi tetap jalan penuh secara lokal (offline-first).
//
// Butuh "Anonymous sign-ins" aktif di Supabase (Authentication > Providers),
// karena RLS skema memakai auth.uid() sebagai owner. Kalau anonymous dimatikan,
// fungsi di sini memberi pesan yang jelas alih-alih gagal senyap.

import { createClient } from '@supabase/supabase-js';

const URL_ = import.meta.env.VITE_SUPABASE_URL;
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const AUDIO_BUCKET = 'project-audio';
const IMAGE_BUCKET = 'project-images';

function extOf(name, fallback) {
  const m = /\.([a-z0-9]{2,5})$/i.exec(name || '');
  return m ? m[1].toLowerCase() : fallback;
}

let sb = null;

export function isCloudConfigured() {
  return Boolean(URL_ && KEY);
}

export function cloudClient() {
  if (!isCloudConfigured()) throw new Error('Supabase belum dikonfigurasi (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).');
  if (!sb) sb = createClient(URL_, KEY, { auth: { persistSession: true, autoRefreshToken: true } });
  return sb;
}

async function ensureSession() {
  const client = cloudClient();
  const { data } = await client.auth.getSession();
  if (data && data.session) return data.session;
  const { data: anon, error } = await client.auth.signInAnonymously();
  if (error) {
    throw new Error(
      'Tidak bisa masuk ke Supabase. Aktifkan Anonymous sign-in di dashboard Supabase, atau login dulu. ' + error.message,
    );
  }
  return anon.session;
}

export async function cloudUserEmail() {
  const session = await ensureSession();
  return session.user.email || '(anonim)';
}

// Simpan project + (opsional) audio dan gambar tiap scene ke Storage.
// audioBlobs: [{ index, blob }], imageBlobs: [{ index, blob, name }]
export async function saveProject({ title, project, audioBlobs = [], imageBlobs = [], cloudId = null, onProgress }) {
  const session = await ensureSession();
  const client = cloudClient();
  const uid = session.user.id;
  const id = cloudId || crypto.randomUUID();
  const jobs = audioBlobs.map((b) => ({ ...b, kind: 'audio' }))
    .concat(imageBlobs.map((b) => ({ ...b, kind: 'image' })));

  const audio = {};
  const images = {};
  for (let k = 0; k < jobs.length; k++) {
    const { kind, index, blob, name } = jobs[k];
    if (kind === 'audio') {
      const path = `${uid}/${id}/scene-${index + 1}.mp3`;
      onProgress && onProgress((k / jobs.length) * 0.8, `Mengunggah audio scene ${index + 1}`);
      const { error } = await client.storage
        .from(AUDIO_BUCKET)
        .upload(path, blob, { contentType: blob.type || 'audio/mpeg', upsert: true });
      if (error) throw new Error(`Upload audio scene ${index + 1} gagal: ${error.message}`);
      audio[index] = path;
    } else {
      const ext = extOf(name, 'jpg');
      const path = `${uid}/${id}/bg-${index + 1}.${ext}`;
      onProgress && onProgress((k / jobs.length) * 0.8, `Mengunggah gambar scene ${index + 1}`);
      const { error } = await client.storage
        .from(IMAGE_BUCKET)
        .upload(path, blob, { contentType: blob.type || 'image/jpeg', upsert: true });
      if (error) throw new Error(`Upload gambar scene ${index + 1} gagal: ${error.message}`);
      images[index] = path;
    }
  }

  onProgress && onProgress(0.85, 'Menyimpan project');
  const payload = { ...project, audio, images };
  const row = { title: title || 'Tanpa judul', payload, updated_at: new Date().toISOString() };
  const q = cloudId
    ? client.from('projects').update(row).eq('id', id).select('id').single()
    : client.from('projects').insert({ ...row, id, owner: uid }).select('id').single();
  const { error } = await q;
  if (error) throw new Error('Simpan project gagal: ' + error.message);

  // Catat pemakaian; kegagalan di sini tidak boleh membatalkan simpan.
  await client.from('usage_events').insert({ user_id: uid, kind: 'save' });

  onProgress && onProgress(1, 'Tersimpan');
  return { id };
}

export async function listProjects(limit = 12) {
  await ensureSession();
  const client = cloudClient();
  const { data, error } = await client
    .from('projects')
    .select('id,title,updated_at')
    .order('updated_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error('Gagal memuat daftar: ' + error.message);
  return data || [];
}

export async function loadProject(id) {
  await ensureSession();
  const client = cloudClient();
  const { data, error } = await client.from('projects').select('id,title,payload').eq('id', id).single();
  if (error) throw new Error('Gagal membuka project: ' + error.message);
  return data;
}

// URL bertanda tangan untuk satu path di bucket gambar (berlaku 7 hari).
// Kembalikan null bila gagal, agar project tetap bisa dibuka tanpa gambar.
export async function signedImageUrl(path) {
  const client = cloudClient();
  const { data, error } = await client.storage.from(IMAGE_BUCKET).createSignedUrl(path, 604800);
  if (error || !data || !data.signedUrl) return null;
  return data.signedUrl;
}
