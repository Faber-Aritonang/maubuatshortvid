// Daftar gaya original untuk prototype. Nama generik, implementasi sendiri.
// Tidak menyalin daftar/nama aset dari aplikasi mana pun.

export const STYLES = [
  { id: 'kotak', label: 'Kotak', hint: 'Teks putih di atas pil hitam' },
  { id: 'karaoke', label: 'Karaoke', hint: 'Kata terucap jadi kuning' },
  { id: 'ketik', label: 'Ketik', hint: 'Huruf muncul satu per satu' },
  { id: 'pop', label: 'Pop', hint: 'Tiap kata meletup' },
  { id: 'neon', label: 'Neon', hint: 'Cahaya cyan' },
  { id: 'stiker', label: 'Stiker', hint: 'Strip kuning miring' },
  { id: 'off', label: 'Tanpa teks', hint: 'Scene visual saja' },
];

export const CAMERAS = [
  { id: 'static', label: 'Diam' },
  { id: 'push', label: 'Push in' },
  { id: 'pull', label: 'Pull out' },
  { id: 'pan-l', label: 'Pan kiri' },
  { id: 'pan-r', label: 'Pan kanan' },
];

export const TRANSITIONS = [
  { id: 'cut', label: 'Cut' },
  { id: 'fade', label: 'Fade' },
  { id: 'slide', label: 'Slide' },
  { id: 'zoom', label: 'Zoom' },
  { id: 'wipe', label: 'Wipe' },
];

export function isKnown(list, id) {
  return list.some((x) => x.id === id);
}
