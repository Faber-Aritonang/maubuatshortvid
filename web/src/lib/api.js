/**
 * API Client Layer — clean-room implementation
 * Mirrors Satset's api-BN1bGxlM.js pattern (organized endpoint functions)
 * but with proper error handling, env-based config, and TypeScript-ready JSDoc.
 *
 * All calls go through Supabase PostgREST + RPC. No hardcoded secrets.
 * Config via VITE_* env vars (see .env.example).
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('[api] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY');
}

const BASE = `${SUPABASE_URL}/rest/v1`;
const RPC_BASE = `${SUPABASE_URL}/rest/v1/rpc`;

function headers(extra = {}) {
  return {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    ...extra,
  };
}

/** @param {Response} res */
async function handleResponse(res) {
  const text = await res.text();
  if (!res.ok) {
    let detail = text;
    try { detail = JSON.parse(text); } catch {}
    const err = new Error(`API ${res.status}: ${detail?.message || detail}`);
    err.status = res.status;
    err.detail = detail;
    throw err;
  }
  if (!text) return null;
  try { return JSON.parse(text); } catch { return text; }
}

/** Generic GET with query params */
async function get(path, params = {}) {
  const qs = new URLSearchParams(params).toString();
  const url = `${BASE}${path}${qs ? `?${qs}` : ''}`;
  return handleResponse(await fetch(url, { headers: headers() }));
}

/** Generic POST */
async function post(path, body) {
  return handleResponse(await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: headers({ Prefer: 'return=representation' }),
    body: JSON.stringify(body),
  }));
}

/** Generic PATCH */
async function patch(path, body, match = {}) {
  const qs = new URLSearchParams(match).toString();
  return handleResponse(await fetch(`${BASE}${path}${qs ? `?${qs}` : ''}`, {
    method: 'PATCH',
    headers: headers({ Prefer: 'return=representation' }),
    body: JSON.stringify(body),
  }));
}

/** Generic DELETE */
async function del(path, match = {}) {
  const qs = new URLSearchParams(match).toString();
  return handleResponse(await fetch(`${BASE}${path}${qs ? `?${qs}` : ''}`, {
    method: 'DELETE',
    headers: headers(),
  }));
}

/** Call Supabase RPC (Postgres function) */
async function rpc(name, params = {}) {
  return handleResponse(await fetch(`${RPC_BASE}/${name}`, {
    method: 'POST',
    headers: headers({ Prefer: 'return=representation' }),
    body: JSON.stringify(params),
  }));
}

/** Supabase Storage helper */
async function storageUpload(bucket, path, file, opts = {}) {
  const form = new FormData();
  form.append('', file);
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${bucket}/${path}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      ...opts.headers,
    },
    body: form,
  });
  return handleResponse(res);
}

async function storageDownload(bucket, path) {
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${bucket}/${path}`, {
    headers: { 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` },
  });
  if (!res.ok) throw new Error(`Storage download failed: ${res.status}`);
  return res.blob();
}

async function storageDelete(bucket, paths) {
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${bucket}`, {
    method: 'DELETE',
    headers: headers(),
    body: JSON.stringify(paths),
  });
  return handleResponse(res);
}

// ============ Auth / Profile ============

/** @returns {Promise<{user: any, session: any}|null>} */
export async function getSession() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;
  const { data: { session } } = await import('@supabase/supabase-js').then(m =>
    m.createClient(SUPABASE_URL, SUPABASE_ANON_KEY).auth.getSession()
  );
  return session;
}

/** @returns {Promise<any>} current user profile */
export async function getProfile() {
  const session = await getSession();
  if (!session) return null;
  return get('/profiles', { id: `eq.${session.user.id}`, select: '*' }).then(r => r?.[0]);
}

/** @param {Object} data - {display_name, avatar_url, ...} */
export async function updateProfile(data) {
  const session = await getSession();
  if (!session) throw new Error('Unauthenticated');
  return patch('/profiles', data, { id: `eq.${session.user.id}` });
}

/** @returns {Promise<any>} user plan with limits */
export async function getMyPlan() {
  const session = await getSession();
  if (!session) return null;
  return rpc('get_user_quota');
}

// ============ Projects ============

/** @returns {Promise<Array>} list projects */
export async function listProjects() {
  return get('/projects', {
    select: '*,scenes(*)',
    order: 'updated_at.desc'
  });
}

/** @param {Object} project - {title, scenes: [...]} */
export async function createProject(project) {
  return post('/projects', project);
}

/** @param {string} id */
export async function getProject(id) {
  const res = await get('/projects', { id: `eq.${id}`, select: '*,scenes(*)' });
  return res?.[0];
}

/** @param {string} id, @param {Object} updates */
export async function updateProject(id, updates) {
  return patch('/projects', updates, { id: `eq.${id}` });
}

/** @param {string} id */
export async function deleteProject(id) {
  return del('/projects', { id: `eq.${id}` });
}

// ============ Scenes ============

/** @param {string} projectId */
export async function listScenes(projectId) {
  return get('/scenes', { project_id: `eq.${projectId}`, order: 'sort.asc' });
}

/** @param {Object} scene */
export async function createScene(scene) {
  return post('/scenes', scene);
}

/** @param {string} id, @param {Object} updates */
export async function updateScene(id, updates) {
  return patch('/scenes', updates, { id: `eq.${id}` });
}

/** @param {string} id */
export async function deleteScene(id) {
  return del('/scenes', { id: `eq.${id}` });
}

/** Reorder scenes - batch update sort */
export async function reorderScenes(updates) {
  // updates: [{id, sort}, ...]
  const promises = updates.map(u => updateScene(u.id, { sort: u.sort }));
  return Promise.all(promises);
}

// ============ Export / Render ============

/** Record export usage (consumes quota) */
export async function recordExport(projectId, durationSec, format = 'webm') {
  return rpc('consume_quota', { p_kind: 'export', p_amount: 1 });
}

/** Record TTS usage */
export async function recordTTS(chars) {
  return rpc('consume_quota', { p_kind: 'tts_chars', p_amount: chars });
}

// ============ Plans / Subscription ============

/** @returns {Promise<Array>} active plans for pricing page */
export async function listPlans() {
  return get('/plans', { active: 'eq.true', order: 'sort.asc' });
}

/** @param {string} planId */
export async function getPlan(planId) {
  const res = await get('/plans', { id: `eq.${planId}` });
  return res?.[0];
}

// ============ Promo Codes ============

/** Validate promo code (public read) */
export async function validatePromo(code) {
  const res = await get('/promos', { code: `eq.${code}`, select: '*' });
  return res?.[0] || null;
}

/** Apply promo (user) */
export async function applyPromo(promoId, planId) {
  return rpc('apply_promo', { p_promo_id: promoId, p_plan_id: planId });
}

/** @returns {Promise<Array>} user's promo usage history */
export async function getPromoHistory() {
  return get('/promo_usages', { select: '*,promos(*)', order: 'created_at.desc' });
}

// ============ Affiliate ============

/** Get my affiliate info */
export async function getMyAffiliate() {
  const session = await getSession();
  if (!session) return null;
  return get('/affiliates', { user_id: `eq.${session.user.id}`, select: '*' }).then(r => r?.[0]);
}

/** Apply to become affiliate */
export async function applyAffiliate(data) {
  const session = await getSession();
  if (!session) throw new Error('Unauthenticated');
  return post('/affiliates', { ...data, user_id: session.user.id });
}

/** Get my affiliate sales */
export async function getAffiliateSales() {
  const session = await getSession();
  if (!session) return [];
  const affiliate = await getMyAffiliate();
  if (!affiliate) return [];
  return get('/affiliate_sales', { affiliate_code: `eq.${affiliate.code}`, order: 'created_at.desc' });
}

/** Validate affiliate code (public) */
export async function validateAffiliateCode(code) {
  const res = await get('/affiliates', { code: `eq.${code}`, status: 'eq.active', select: '*' });
  return res?.[0] || null;
}

/** Claim referral bonus */
export async function claimReferral(referralCode) {
  return rpc('claim_referral', { p_referral_code: referralCode });
}

// ============ Gemini API Keys ============

/** @returns {Promise<Array>} user's saved keys (hash only) */
export async function listGeminiKeys() {
  return get('/gemini_keys', { user_id: `eq.${(await getSession())?.user?.id}`, order: 'created_at.desc' });
}

/** Save new key (stores hash only) */
export async function saveGeminiKey(keyName, rawKey) {
  const session = await getSession();
  if (!session) throw new Error('Unauthenticated');

  // Hash the key client-side (SHA-256)
  const encoder = new TextEncoder();
  const data = encoder.encode(rawKey);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const keyHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  const keyPreview = rawKey.slice(-8);

  return post('/gemini_keys', {
    user_id: session.user.id,
    key_name: keyName,
    key_hash: keyHash,
    key_preview: keyPreview,
  });
}

/** Delete key */
export async function deleteGeminiKey(id) {
  return del('/gemini_keys', { id: `eq.${id}` });
}

/** Set active key */
export async function setActiveGeminiKey(id) {
  const session = await getSession();
  if (!session) throw new Error('Unauthenticated');
  // Deactivate all
  await patch('/gemini_keys', { is_active: false }, { user_id: `eq.${session.user.id}` });
  // Activate one
  return patch('/gemini_keys', { is_active: true }, { id: `eq.${id}`, user_id: `eq.${session.user.id}` });
}

// ============ User Preferences ============

/** @returns {Promise<Object>} */
export async function getPreferences() {
  const session = await getSession();
  if (!session) return {};
  const res = await get('/user_preferences', { user_id: `eq.${session.user.id}` });
  return res?.[0]?.data || {};
}

/** @param {Object} data */
export async function savePreferences(data) {
  const session = await getSession();
  if (!session) throw new Error('Unauthenticated');
  return post('/user_preferences', { user_id: session.user.id, data }, { on_conflict: 'user_id' })
    .catch(() => patch('/user_preferences', { data }, { user_id: `eq.${session.user.id}` }));
}

// ============ App Settings (public) ============

/** @returns {Promise<Object>} */
export async function getAppSettings() {
  const res = await get('/app_settings', { id: 'eq.1' });
  return res?.[0] || {};
}

// ============ Admin RPCs (require service_role - called via Edge Function) ============

/** Admin: create user (calls Edge Function) */
export async function adminCreateUser(data) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/admin-create-user`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

/** Admin: set user plan */
export async function adminSetPlan(userId, planId, expiresAt) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/admin-set-plan`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ user_id: userId, plan_id: planId, expires_at: expiresAt }),
  });
  return handleResponse(res);
}

/** Admin: affiliate summary */
export async function adminAffiliateSummary() {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/admin-affiliate-summary`, {
    method: 'POST',
    headers: headers(),
  });
  return handleResponse(res);
}

/** Admin: record sale (webhook) */
export async function adminRecordSale(data) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/admin-record-sale`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

// ============ Storage ============

/** Upload project asset (image/video/audio) */
export async function uploadAsset(projectId, file, folder = 'projects') {
  const path = `${folder}/${projectId}/${Date.now()}_${file.name}`;
  return storageUpload('assets', path, file);
}

/** Download asset */
export async function downloadAsset(path) {
  return storageDownload('assets', path);
}

/** Delete asset */
export async function deleteAsset(paths) {
  return storageDelete('assets', paths);
}

/** Upload export result */
export async function uploadExport(projectId, blob, format = 'webm') {
  const path = `exports/${projectId}/${Date.now()}.${format}`;
  return storageUpload('exports', path, blob);
}

export default {
  // Auth/Profile
  getSession,
  getProfile,
  updateProfile,
  getMyPlan,
  // Projects
  listProjects,
  createProject,
  getProject,
  updateProject,
  deleteProject,
  // Scenes
  listScenes,
  createScene,
  updateScene,
  deleteScene,
  reorderScenes,
  // Export
  recordExport,
  recordTTS,
  // Plans
  listPlans,
  getPlan,
  // Promo
  validatePromo,
  applyPromo,
  getPromoHistory,
  // Affiliate
  getMyAffiliate,
  applyAffiliate,
  getAffiliateSales,
  validateAffiliateCode,
  claimReferral,
  // Gemini Keys
  listGeminiKeys,
  saveGeminiKey,
  deleteGeminiKey,
  setActiveGeminiKey,
  // Preferences
  getPreferences,
  savePreferences,
  // Settings
  getAppSettings,
  // Admin
  adminCreateUser,
  adminSetPlan,
  adminAffiliateSummary,
  adminRecordSale,
  // Storage
  uploadAsset,
  downloadAsset,
  deleteAsset,
  uploadExport,
};