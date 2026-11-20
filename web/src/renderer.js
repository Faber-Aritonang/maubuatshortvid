// Renderer Canvas 2D original (~200 baris inti).
// Satu fungsi murni: drawProject(ctx, project, timeSec) -> tidak ada dependensi luar.
// Ukuran kanvas acuan: W=720, H=1280 (9:16). Semua koordinat dihitung dari W/H.

const W = 720;
const H = 1280;
const TRANS_DUR = 0.35;

function smooth(p) {
  const c = Math.max(0, Math.min(1, p));
  return c * c * (3 - 2 * c);
}
function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function projectDuration(project) {
  return project.scenes.reduce((s, sc) => s + (Number(sc.dur) || 4), 0);
}

// Detik mulai tiap scene. Dipakai untuk menata audio TTS di timeline export.
export function sceneStarts(project) {
  let acc = 0;
  return project.scenes.map((sc) => {
    const start = acc;
    acc += Number(sc.dur) || 4;
    return start;
  });
}

// Cari scene aktif pada detik t. Kembalikan {scene, index, start, local, progress}
export function sceneAt(project, t) {
  let acc = 0;
  for (let i = 0; i < project.scenes.length; i++) {
    const sc = project.scenes[i];
    const d = Number(sc.dur) || 4;
    if (t < acc + d || i === project.scenes.length - 1) {
      const local = Math.max(0, t - acc);
      return { scene: sc, index: i, start: acc, local, progress: Math.min(1, local / d) };
    }
    acc += d;
  }
  const last = project.scenes[project.scenes.length - 1];
  return { scene: last, index: project.scenes.length - 1, start: acc, local: 0, progress: 0 };
}

function applyCamera(ctx, camera, p) {
  const e = smooth(p);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  // reset lalu terapkan dari tengah layar
  ctx.translate(W / 2, H / 2);
  let s = 1, x = 0;
  if (camera === 'push') s = lerp(1, 1.12, e);
  else if (camera === 'pull') s = lerp(1.12, 1, e);
  else if (camera === 'pan-l') x = lerp(40, -40, e);
  else if (camera === 'pan-r') x = lerp(-40, 40, e);
  ctx.scale(s, s);
  ctx.translate(x, 0);
  ctx.translate(-W / 2, -H / 2);
}

function drawBackground(ctx, hue, p) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, `hsl(${hue},45%,14%)`);
  g.addColorStop(1, `hsl(${(hue + 40) % 360},55%,26%)`);
  ctx.fillStyle = g;
  ctx.fillRect(-100, -100, W + 200, H + 200);

  // dekorasi prosedural: lingkaran + garis grid samar
  ctx.save();
  ctx.globalAlpha = 0.16;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  const cx = W / 2 + Math.sin(p * Math.PI * 2) * 30;
  const cy = H * 0.32;
  ctx.beginPath();
  ctx.arc(cx, cy, 180 + p * 40, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, 260 + p * 40, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 0.08;
  for (let y = 0; y < H + 200; y += 80) {
    ctx.beginPath();
    ctx.moveTo(-100, y);
    ctx.lineTo(W + 100, y);
    ctx.stroke();
  }
  ctx.restore();
}

// kata aktif = kata terakhir dengan t <= local
export function activeWordCount(words, local) {
  let n = 0;
  for (let i = 0; i < words.length; i++) {
    if (words[i].t <= local) n = i + 1;
    else break;
  }
  return n;
}

function wrapLines(ctx, text, maxWidth) {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  const lines = [];
  let cur = '';
  for (const w of words) {
    const next = cur ? cur + ' ' + w : w;
    if (ctx.measureText(next).width > maxWidth && cur) {
      lines.push(cur);
      cur = w;
    } else cur = next;
  }
  if (cur) lines.push(cur);
  return { lines, words };
}

function drawSubtitle(ctx, scene, local, p) {
  const style = scene.style || 'kotak';
  if (style === 'off') return;
  const text = scene.text || '';
  const fontPx = 54;
  ctx.save();
  ctx.font = `700 ${fontPx}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const maxWidth = W - 120;
  const { lines, words } = wrapLines(ctx, text, maxWidth);
  const lineH = fontPx * 1.35;
  const cy = H * 0.68;
  const y0 = cy - ((lines.length - 1) * lineH) / 2;

  const spoken = activeWordCount(scene.words || [], local);

  lines.forEach((line, li) => {
    const y = y0 + li * lineH;
    if (style === 'stiker') {
      ctx.save();
      ctx.translate(W / 2, y);
      ctx.rotate(-0.07);
      const wdt = Math.min(maxWidth, ctx.measureText(line).width + 56);
      ctx.fillStyle = '#ffd83d';
      ctx.shadowColor = 'rgba(0,0,0,.45)';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 6;
      ctx.fillRect(-wdt / 2, -fontPx * 0.75, wdt, fontPx * 1.5);
      ctx.shadowOffsetY = 0;
      ctx.fillStyle = '#141414';
      ctx.fillText(line, 0, 4);
      ctx.restore();
      return;
    }
    if (style === 'ketik') {
      const full = lines.slice(0, li + 1).join(' ').length;
      const shown = Math.floor(p * full * 1.15);
      let budget = shown;
      let out = '';
      for (let k = 0; k <= li; k++) {
        const part = k === li ? line.slice(0, Math.max(0, budget)) : lines[k];
        if (k === li) out = part;
        budget -= lines[k].length + 1;
      }
      const wdt = ctx.measureText(out || ' ').width;
      ctx.fillStyle = 'rgba(0,0,0,.72)';
      ctx.fillRect(W / 2 - wdt / 2 - 24, y - fontPx * 0.7, wdt + 48, fontPx * 1.4);
      ctx.fillStyle = '#fff';
      const cursor = Math.floor(performance.now() / 400) % 2 ? '▌' : '';
      ctx.fillText(out + cursor, W / 2, y);
      return;
    }
    if (style === 'karaoke') {
      ctx.fillStyle = 'rgba(0,0,0,.55)';
      const bgW = Math.min(maxWidth, ctx.measureText(line).width + 48);
      ctx.fillRect(W / 2 - bgW / 2, y - fontPx * 0.7, bgW, fontPx * 1.4);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(line, W / 2, y);
      // pass kedua: kata terucap digambar kuning (perkiraan per baris proporsional)
      ctx.save();
      ctx.fillStyle = '#ffd83d';
      const frac = words.length ? spoken / words.length : 0;
      const clipW = bgW * Math.max(0, Math.min(1, frac * lines.length - li));
      ctx.beginPath();
      ctx.rect(W / 2 - bgW / 2, y - fontPx, clipW, fontPx * 2);
      ctx.clip();
      ctx.fillText(line, W / 2, y);
      ctx.restore();
      return;
    }
    if (style === 'pop') {
      const frac = words.length ? spoken / words.length : p;
      const s = 0.85 + 0.3 * Math.abs(Math.sin(frac * Math.PI * 3));
      ctx.save();
      ctx.translate(W / 2, y);
      ctx.scale(s, s);
      ctx.fillStyle = 'rgba(0,0,0,.7)';
      const wdt = ctx.measureText(line).width + 48;
      ctx.fillRect(-wdt / 2, -fontPx * 0.7, wdt, fontPx * 1.4);
      ctx.fillStyle = '#fff';
      ctx.fillText(line, 0, 0);
      ctx.restore();
      return;
    }
    if (style === 'neon') {
      ctx.save();
      ctx.shadowColor = '#22d3ee';
      ctx.shadowBlur = 22;
      ctx.fillStyle = '#f0fdff';
      ctx.fillText(line, W / 2, y);
      ctx.restore();
      return;
    }
    // default 'kotak'
    const wdt = Math.min(maxWidth, ctx.measureText(line).width + 48);
    ctx.fillStyle = 'rgba(0,0,0,.72)';
    ctx.fillRect(W / 2 - wdt / 2, y - fontPx * 0.7, wdt, fontPx * 1.4);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(line, W / 2, y);
  });
  ctx.restore();
}

function applyTransitionIn(ctx, transition, local) {
  if (local >= TRANS_DUR || transition === 'cut' || !transition) return false;
  const p = smooth(local / TRANS_DUR);
  if (transition === 'fade') {
    ctx.save();
    ctx.fillStyle = `rgba(0,0,0,${1 - p})`;
    ctx.fillRect(-100, -100, W + 200, H + 200);
    ctx.restore();
  } else if (transition === 'slide') {
    ctx.translate((1 - p) * W, 0);
  } else if (transition === 'zoom') {
    ctx.translate(W / 2, H / 2);
    const s = lerp(0.92, 1, p);
    ctx.scale(s, s);
    ctx.translate(-W / 2, -H / 2);
  } else if (transition === 'wipe') {
    ctx.save();
    ctx.fillStyle = '#0b0b10';
    ctx.fillRect(-100, -100, (W + 200) * (1 - p), H + 200);
    ctx.restore();
  }
  return true;
}

export function drawProject(ctx, project, timeSec) {
  const { scene, local, progress } = sceneAt(project, timeSec);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, W, H);
  applyCamera(ctx, scene.camera || 'static', progress);
  drawBackground(ctx, Number(scene.bg ?? 220), progress);
  applyTransitionIn(ctx, scene.transition || 'cut', local);
  drawSubtitle(ctx, scene, local, progress);
  // bingkai aman vertikal
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}

export const CANVAS_W = W;
export const CANVAS_H = H;
