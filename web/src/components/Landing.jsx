import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { drawProject } from '../renderer.js';
import { ensureTiming, pickVoice, stopSpeak } from '../tts.js';
import './landing.css';

const CLOUD_READY = Boolean(
  import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY
);

const TICKER_ITEMS = [
  'Naskah per scene',
  '7 gaya subtitle',
  '5 kamera',
  '5 transisi',
  'Foto produk',
  'Export MP4',
  'Render di browser',
  'Proyek JSON',
];

const STYLE_PREVIEWS = [
  {
    name: 'Karaoke',
    desc: 'Kata yang sudah diucap berubah kuning.',
    text: 'Punya 30 detik? Ubah jadi video pendek yang rapi.',
    style: 'karaoke',
    bg: 160,
  },
  {
    name: 'Kotak',
    desc: 'Teks putih di atas pil hitam. Paling aman dibaca.',
    text: 'Tulis naskah, atur scene, lalu export.',
    style: 'kotak',
    bg: 265,
  },
  {
    name: 'Neon',
    desc: 'Cahaya cyan untuk konten yang lebih berani.',
    text: 'Satu ide. Satu kalimat. Satu scene.',
    style: 'neon',
    bg: 210,
  },
  {
    name: 'Stiker',
    desc: 'Strip kuning miring, seperti catatan tempel.',
    text: 'Mulai kecil, nanti melekat.',
    style: 'stiker',
    bg: 15,
  },
].map((item) => ({
  ...item,
  project: ensureTiming({
    version: 1,
    scenes: [
      {
        text: item.text,
        style: item.style,
        camera: 'push',
        transition: 'fade',
        dur: 6,
        bg: item.bg,
        words: [],
      },
    ],
  }),
}));

const FEATURES = [
  {
    title: 'Naskah per scene',
    desc: 'Tulis atau tempel teks tiap scene. Preview langsung berubah.',
  },
  {
    title: 'Suara narrator',
    desc: 'Pakai suara browser, atau sambungkan TTS server untuk suara yang lebih natural.',
  },
  {
    title: 'Subtitle bergaya',
    desc: 'Tujuh gaya: kotak, karaoke, ketik, pop, neon, stiker, dan tanpa teks.',
  },
  {
    title: 'Kamera dan transisi',
    desc: 'Lima gerakan kamera dan lima transisi, diatur per scene.',
  },
  {
    title: 'Foto produk',
    desc: 'Unggah gambar per scene. File dikecilkan supaya project tetap ringan.',
  },
  {
    title: 'Warna latar',
    desc: 'Atur hue tiap scene untuk memberi suasana yang berbeda.',
  },
  {
    title: 'Export MP4',
    desc: 'Render 720x1280, 30 fps, dengan audio bila browser mendukung.',
  },
  {
    title: 'Jalan di HP dan laptop',
    desc: 'Editor responsif. Preview dan kontrol tetap bisa dipakai di layar kecil.',
  },
  {
    title: 'Proyek JSON',
    desc: 'Simpan dan buka project sebagai file JSON, termasuk gambar yang sudah dikecilkan.',
  },
  {
    title: 'Cloud opsional',
    desc: 'Kalau Supabase diisi, project bisa disimpan ke akun dan dibuka lagi.',
  },
  {
    title: 'Render lokal',
    desc: 'Video dirender di browser. Tidak ada upload video ke server.',
    highlight: true,
    tag: 'LOKAL',
  },
];

const FAQS = [
  {
    q: 'Aku gak bisa edit video sama sekali. Bisa pakai?',
    a: 'Bisa. Kamu cukup menulis ide atau topik. Naskah per scene, subtitle, kamera, dan transisi sudah punya nilai awal, dan semuanya bisa diubah kalau mau.',
  },
  {
    q: 'Suaranya dari mana?',
    a: 'Ada dua jalur. Suara browser langsung tanpa API key, atau TTS server kalau kamu menjalankan npm run server dengan kunci API. Kalau server belum aktif, tombol suara browser tetap bisa dipakai.',
  },
  {
    q: 'Bisa dipakai di HP?',
    a: 'Bisa. Layout editor menyesuaikan lebar layar. Untuk export MP4 yang berat, laptop biasanya lebih cepat.',
  },
  {
    q: 'Bisa upload foto produk?',
    a: 'Bisa, satu gambar per scene. Gambar dikecilkan dulu supaya project tetap ringan dan ikut tersimpan saat kamu export JSON.',
  },
  {
    q: 'Format videonya apa?',
    a: 'MP4 720x1280 (H.264) kalau browser mendukung. Kalau tidak, WebM. Keduanya vertikal 9:16.',
  },
  {
    q: 'Project disimpan di mana?',
    a: 'Di browser secara lokal. Kalau Supabase diisi, kamu bisa menyimpan project ke cloud dan membukanya lagi dari akun.',
  },
  {
    q: 'Apakah ini gratis?',
    a: 'Prototype ini tidak punya alur pembayaran. Semua fitur editor terbuka. Kalau kamu memakai TTS server, biaya API mengikuti penyedia yang kamu pilih.',
  },
];

const SAMPLE_NARRATION =
  'Misalnya temanmu jualan kue pukis. Foto produknya sudah ada. Masukkan fotonya ke Satset, tulis ide jualannya, lalu atur naskah dan subtitle per scene.';

function Ticker() {
  const [paused, setPaused] = useState(false);

  return (
    <div className="ticker" role="region" aria-label="Fitur singkat">
      <div className={`ticker-track ${paused ? 'is-paused' : ''}`}>
        {[0, 1].map((copy) => (
          <div className="ticker-group" key={copy} aria-hidden={copy === 1 ? 'true' : undefined}>
            {TICKER_ITEMS.map((item) => (
              <span className="ticker-item" key={`${copy}-${item}`}>
                {item}
              </span>
            ))}
          </div>
        ))}
      </div>
      <button
        type="button"
        className="ticker-pause"
        aria-pressed={paused}
        aria-label={paused ? 'Jalankan teks berjalan' : 'Jeda teks berjalan'}
        onClick={() => setPaused((value) => !value)}
      >
        {paused ? 'Jalan' : 'Jeda'}
      </button>
    </div>
  );
}

function StylePreview({ project }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reduceMotion) {
      drawProject(ctx, project, 2);
      return undefined;
    }

    let frame = 0;
    const start = performance.now();
    const loop = (now) => {
      const time = ((now - start) / 1000) % 6;
      drawProject(ctx, project, time, undefined);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [project]);

  return <canvas ref={canvasRef} width={720} height={1280} className="style-canvas" aria-hidden="true" />;
}

function HeroPhone() {
  return (
    <div className="phone hero-phone" aria-hidden="true">
      <div className="phone-notch" />
      <div className="phone-screen hero-screen">
        <div className="editor-top">
          <span>00:07</span>
          <span>9:16</span>
        </div>
        <div className="editor-canvas">
          <div className="editor-bubble">masih sering mikir</div>
          <span className="editor-alert">!</span>
        </div>
        <div className="editor-timeline">
          {Array.from({ length: 14 }).map((_, index) => (
            <span key={index} style={{ height: `${28 + ((index * 19) % 64)}%` }} />
          ))}
        </div>
        <div className="editor-toolbar">
          <span />
          <span />
          <span />
        </div>
      </div>
      <span className="sticker-label label-sub">Subtitle otomatis</span>
      <span className="sticker-label label-voice">Suara narrator</span>
      <span className="sticker-label label-mp4">MP4 siap upload</span>
    </div>
  );
}

function UseCaseArt() {
  return (
    <div className="phone promo-phone" aria-hidden="true">
      <div className="phone-notch" />
      <div className="phone-screen promo-screen">
        <span className="promo-tag">Contoh scene</span>
        <svg className="product-art" viewBox="0 0 220 240">
          <ellipse cx="110" cy="214" rx="70" ry="14" fill="#d8c49a" />
          <path
            d="M46 108c0-14 10-24 24-24h80c14 0 24 10 24 24v72c0 18-14 30-32 30H78c-18 0-32-12-32-30z"
            fill="#f2a24b"
            stroke="#141414"
            strokeWidth="6"
          />
          <path d="M46 128h128" stroke="#141414" strokeWidth="6" />
          <path
            d="M76 84c0-16 14-28 34-28s34 12 34 28"
            fill="#ffd23f"
            stroke="#141414"
            strokeWidth="6"
          />
          <circle cx="110" cy="44" r="14" fill="#ff5a1f" stroke="#141414" strokeWidth="6" />
          <path
            d="M92 160c12-10 24-10 36 0"
            fill="none"
            stroke="#141414"
            strokeWidth="5"
            strokeLinecap="round"
          />
        </svg>
        <p className="promo-subtitle">Kue pukis, freshly baked.</p>
      </div>
    </div>
  );
}

export default function Landing() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const canSpeak = typeof window !== 'undefined' && 'speechSynthesis' in window;

  useEffect(() => {
    if (!menuOpen) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [menuOpen]);

  useEffect(() => () => stopSpeak(), []);

  const closeMenu = () => setMenuOpen(false);

  const toggleSample = () => {
    if (!canSpeak) return;
    if (speaking) {
      stopSpeak();
      setSpeaking(false);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(SAMPLE_NARRATION);
    const voice = pickVoice('id-ID');
    if (voice) utterance.voice = voice;
    utterance.lang = (voice && voice.lang) || 'id-ID';
    utterance.rate = 0.95;
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    setSpeaking(true);
  };

  return (
    <div className="landing">
      <a className="skip-link" href="#main">
        Lewati ke konten
      </a>

      <header className="site-header">
        <div className="header-inner">
          <Link className="brand" to="/" aria-label="Satset Motion, ke beranda">
            <span className="brand-mark" aria-hidden="true">
              S
            </span>
            <span>Satset Motion</span>
          </Link>

          <button
            type="button"
            className="menu-toggle"
            aria-expanded={menuOpen}
            aria-controls="site-nav"
            onClick={() => setMenuOpen((value) => !value)}
          >
            {menuOpen ? 'Tutup' : 'Menu'}
          </button>

          <nav
            id="site-nav"
            className={`site-nav ${menuOpen ? 'is-open' : ''}`}
            aria-label="Navigasi utama"
          >
            <a href="#hasil" onClick={closeMenu}>
              Hasil
            </a>
            <a href="#cara-kerja" onClick={closeMenu}>
              Cara kerja
            </a>
            <a href="#fitur" onClick={closeMenu}>
              Fitur
            </a>
            <a href="#faq" onClick={closeMenu}>
              FAQ
            </a>
            {CLOUD_READY ? (
              <Link to="/login" onClick={closeMenu}>
                Masuk
              </Link>
            ) : null}
            <Link className="btn btn-primary nav-cta" to="/app/trial" onClick={closeMenu}>
              Cobain trial
            </Link>
          </nav>
        </div>
      </header>

      <main id="main">
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero-copy">
            <p className="eyebrow">Tanpa skill edit video</p>
            <h1 id="hero-title">
              Video pendek,
              <br />
              <span className="marker">satset jadi.</span>
            </h1>
            <p className="hero-lead">
              Mulai dari satu ide. Satset Motion menyiapkan naskah per scene, subtitle,
              suara, kamera, dan transisi. Hasilnya video vertikal 9:16 yang siap kamu
              unggah ke TikTok, Reels, atau Shorts.
            </p>
            <div className="hero-actions">
              <a className="btn btn-primary" href="#hasil">
                Lihat demonya
              </a>
              <Link className="btn" to="/app/trial">
                Cobain trial gratis
              </Link>
            </div>
            <p className="hero-note">Render di browser. Tanpa upload video ke server.</p>
          </div>

          <div className="hero-visual">
            <HeroPhone />
          </div>
        </section>

        <Ticker />

        <section id="hasil" className="section gallery" aria-labelledby="hasil-title">
          <div className="section-head">
            <p className="kicker">Contoh render</p>
            <h2 id="hasil-title">Ini hasilnya. Beneran dari mesin Satset.</h2>
            <p className="section-lead">
              Empat preview di bawah digambar langsung oleh renderer canvas yang sama
              dengan yang dipakai di studio. Bukan rekaman, bukan gambar tempelan.
            </p>
          </div>

          <div className="style-grid">
            {STYLE_PREVIEWS.map((item) => (
              <article className="style-card" key={item.name}>
                <div className="phone small">
                  <div className="phone-notch" />
                  <div className="phone-screen">
                    <StylePreview project={item.project} />
                  </div>
                </div>
                <h3>{item.name}</h3>
                <p>{item.desc}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="band usecase" aria-labelledby="promo-title">
          <div className="band-inner usecase-grid">
            <div className="usecase-visual">
              <UseCaseArt />
              <button
                type="button"
                className="btn btn-yellow play-btn"
                onClick={toggleSample}
                aria-pressed={speaking}
                aria-label={
                  speaking
                    ? 'Hentikan contoh narasi'
                    : 'Putar contoh narasi dengan suara browser'
                }
                disabled={!canSpeak}
              >
                {canSpeak
                  ? speaking
                    ? 'Hentikan suara'
                    : 'Putar dengan suara'
                  : 'Audio tidak didukung'}
              </button>
            </div>

            <div className="usecase-copy">
              <p className="kicker pink">Contoh pemakaian</p>
              <h2 id="promo-title">
                Video promo buat usaha teman, jadi dalam sekali duduk.
              </h2>
              <p className="section-lead">
                Misalnya temanmu jualan kue pukis. Foto produknya sudah ada. Masukkan
                fotonya ke Satset, tulis satu-dua kalimat soal jualannya, lalu atur
                naskah dan subtitle per scene.
              </p>
              <div className="callout">
                Ini contoh alurnya. Tekan tombol putar untuk mendengar narasinya.
              </div>
              <ul className="check-list">
                <li>Foto produk masuk sebagai latar scene.</li>
                <li>Subtitle dan suara mengikuti naskah.</li>
                <li>Tambahkan ajakan beli di scene terakhir.</li>
              </ul>
            </div>
          </div>
        </section>

        <section id="cara-kerja" className="band steps" aria-labelledby="steps-title">
          <div className="band-inner">
            <div className="section-head">
              <p className="kicker">Cara kerja</p>
              <h2 id="steps-title">4 langkah. Gak perlu buka aplikasi edit.</h2>
            </div>

            <ol className="step-grid">
              <li className="step-card">
                <span className="step-num">1</span>
                <h3>Tulis ide atau topik</h3>
                <p>
                  Mulai dari satu kalimat. Pecah jadi beberapa scene, masing-masing
                  2 sampai 15 detik.
                </p>
              </li>
              <li className="step-card">
                <span className="step-num">2</span>
                <h3>Atur subtitle dan kamera</h3>
                <p>
                  Pilih gaya subtitle, gerakan kamera, dan transisi per scene. Semua
                  perubahan langsung terlihat di preview.
                </p>
              </li>
              <li className="step-card">
                <span className="step-num">3</span>
                <h3>Tambah suara dan foto</h3>
                <p>
                  Pakai suara browser atau TTS server. Unggah foto produk kalau scene
                  butuh gambar latar.
                </p>
              </li>
              <li className="step-card">
                <span className="step-num">4</span>
                <h3>Preview lalu export</h3>
                <p>
                  Putar di canvas, geser timeline, lalu export MP4 atau WebM 720x1280.
                </p>
              </li>
            </ol>
          </div>
        </section>

        <section className="section audience" aria-labelledby="audience-title">
          <div className="section-head">
            <p className="kicker teal">Buat siapa?</p>
            <h2 id="audience-title">Cocok buat kamu yang butuh konten tiap hari.</h2>
          </div>

          <div className="audience-grid">
            <article className="audience-card orange">
              <span className="audience-index">01 / KREATOR</span>
              <h3>Kreator harian</h3>
              <p>Butuh video pendek tiap hari, tapi gak mau buka aplikasi edit.</p>
            </article>
            <article className="audience-card teal">
              <span className="audience-index">02 / JUALAN</span>
              <h3>UMKM dan toko online</h3>
              <p>Foto produk sudah ada. Tinggal jadi video promo vertikal.</p>
            </article>
            <article className="audience-card pink">
              <span className="audience-index">03 / EDUKASI</span>
              <h3>Guru dan pembicara</h3>
              <p>Materi singkat jadi video dengan subtitle yang mudah diikuti.</p>
            </article>
          </div>
        </section>

        <section id="fitur" className="band features" aria-labelledby="fitur-title">
          <div className="band-inner">
            <div className="section-head">
              <p className="kicker">Fitur</p>
              <h2 id="fitur-title">Semua yang benar-benar jalan di studio.</h2>
              <p className="section-lead">
                Bukan daftar roadmap. Ini fitur yang bisa kamu pakai sekarang.
              </p>
            </div>

            <div className="feature-grid">
              {FEATURES.map((feature, index) => (
                <article
                  className={`feature-card ${feature.highlight ? 'is-highlight' : ''}`}
                  key={feature.title}
                >
                  <span className="feature-index">
                    {String(index + 1).padStart(2, '0')}
                    {feature.tag ? ` / ${feature.tag}` : ''}
                  </span>
                  <h3>{feature.title}</h3>
                  <p>{feature.desc}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="band offer" aria-labelledby="offer-title">
          <div className="band-inner offer-inner">
            <div className="offer-copy">
              <p className="kicker">Gratis</p>
              <h2 id="offer-title">Cobain dulu. Studio-nya terbuka.</h2>
              <p className="section-lead">
                Tidak ada akun wajib untuk mulai. Buka halaman ide, pilih ide, lalu lihat
                hasilnya di preview.
              </p>
            </div>

            <div className="offer-card">
              <ul className="check-list">
                <li>Naskah, subtitle, kamera, dan transisi</li>
                <li>Foto produk per scene</li>
                <li>Export MP4 atau WebM</li>
                <li>Simpan project ke JSON</li>
                <li>Cloud opsional lewat Supabase</li>
              </ul>
              <Link className="btn btn-dark" to="/app/trial">
                Cobain trial gratis
              </Link>
              <p className="offer-note">Prototype ini belum punya alur pembayaran.</p>
            </div>
          </div>
        </section>

        <section id="faq" className="section faq" aria-labelledby="faq-title">
          <div className="section-head">
            <p className="kicker">FAQ</p>
            <h2 id="faq-title">Yang sering ditanyain.</h2>
          </div>

          <div className="faq-list">
            {FAQS.map((item) => (
              <details className="faq-item" name="faq" key={item.q}>
                <summary>
                  <span>{item.q}</span>
                  <span className="faq-plus" aria-hidden="true">
                    +
                  </span>
                </summary>
                <p>{item.a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="final-cta" aria-labelledby="final-title">
          <div className="final-card">
            <h2 id="final-title">Konten tiap hari, tanpa begadang ngedit.</h2>
            <Link className="btn btn-primary" to="/app/trial">
              Cobain trial gratis
            </Link>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="footer-inner">
          <p>© 2026 Satset Motion. Prototype.</p>
          <nav className="footer-links" aria-label="Tautan footer">
            <a href="#hasil">Hasil</a>
            <a href="#fitur">Fitur</a>
            <a href="#faq">FAQ</a>
            <Link to="/studio">Studio</Link>
            {CLOUD_READY ? <Link to="/login">Masuk</Link> : null}
          </nav>
        </div>
      </footer>
    </div>
  );
}
