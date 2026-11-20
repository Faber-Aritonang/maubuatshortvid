// Gambar latar per scene (original).
//
// Setiap gambar punya id acak. Modul ini menyimpan tiga hal per id:
//   blob  - versi kecil (maks 720px, JPEG ~0.82) untuk upload & export JSON
//   url   - ObjectURL untuk <img> pratinjau
//   el    - HTMLImageElement untuk digambar renderer ke canvas
//
// Sumber gambar: file lokal (input file) atau URL (signed URL Supabase / data URL).
// Scene hanya menyimpan id di field `scene.img`, jadi project JSON tetap ramping;
// saat export JSON, blob diubah ke data URL dan ditulis ke payload.images.

const store = new Map(); // id -> { blob, name, url, el, ready: Promise }

function loadElement(url) {
  return new Promise((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error('Gambar tidak bisa dibaca.'));
    el.src = url;
  });
}

export function newImageId() {
  return 'img-' + Math.random().toString(36).slice(2, 10);
}

// Kecilkan gambar ke maks 720px (sisi panjang) agar upload/JSON ringan.
export async function downscaleImage(file, maxSide = 720) {
  const srcUrl = URL.createObjectURL(file);
  try {
    const src = await loadElement(srcUrl);
    const scale = Math.min(1, maxSide / Math.max(src.naturalWidth, src.naturalHeight));
    const w = Math.max(1, Math.round(src.naturalWidth * scale));
    const h = Math.max(1, Math.round(src.naturalHeight * scale));
    const cv = document.createElement('canvas');
    cv.width = w;
    cv.height = h;
    cv.getContext('2d').drawImage(src, 0, 0, w, h);
    const blob = await new Promise((res, rej) =>
      cv.toBlob((b) => (b ? res(b) : rej(new Error('Gagal memproses gambar.'))), 'image/jpeg', 0.82),
    );
    return { blob, name: (file.name || 'latar').replace(/\.[^.]+$/, '') + '.jpg' };
  } finally {
    URL.revokeObjectURL(srcUrl);
  }
}

export async function putImageBlob(id, blob, name = 'latar.jpg') {
  removeImage(id);
  const url = URL.createObjectURL(blob);
  const entry = { blob, name, url, el: null, ready: null };
  store.set(id, entry);
  entry.ready = loadElement(url).then((el) => {
    entry.el = el;
    return el;
  });
  return entry.ready;
}

export async function putImageUrl(id, url, blob = null, name = 'latar.jpg') {
  removeImage(id);
  const entry = { blob, name, url, el: null, ready: null };
  store.set(id, entry);
  entry.ready = loadElement(url).then((el) => {
    entry.el = el;
    return el;
  }).catch((e) => {
    store.delete(id);
    throw e;
  });
  return entry.ready;
}

// id -> HTMLImageElement yang sudah termuat (untuk renderer).
export function imageElements() {
  const out = {};
  for (const [id, e] of store) if (e.el) out[id] = e.el;
  return out;
}

export function imageUrl(id) {
  const e = store.get(id);
  return e ? e.url : null;
}

export function imageBlob(id) {
  const e = store.get(id);
  return e ? e.blob : null;
}

export function imageName(id) {
  const e = store.get(id);
  return e ? e.name : 'latar.jpg';
}

export function imageReady(id) {
  const e = store.get(id);
  return e ? e.ready : Promise.resolve(null);
}

export async function imageDataUrl(id) {
  const blob = imageBlob(id);
  if (!blob) return null;
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result);
    fr.onerror = () => reject(new Error('Gagal membaca gambar.'));
    fr.readAsDataURL(blob);
  });
}

export function removeImage(id) {
  const e = store.get(id);
  if (!e) return;
  if (e.blob && e.url.startsWith('blob:')) {
    try { URL.revokeObjectURL(e.url); } catch { /* abaikan */ }
  }
  store.delete(id);
}

// Data URL (dari JSON project) -> blob, agar bisa diunggah ulang ke cloud.
export async function dataUrlToBlob(dataUrl) {
  const res = await fetch(dataUrl);
  return res.blob();
}
