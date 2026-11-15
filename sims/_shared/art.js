// Общая «художественная» библиотека моделей: объёмные молекулы, липиды, белки, фон.
// Всё сложное рисуется один раз в спрайт (скрытый холст) и потом быстро копируется в кадр.

const RES = 3;
const cache = new Map();

export function sprite(key, w, h, paint) {
  let s = cache.get(key);
  if (!s) {
    const cv = document.createElement('canvas');
    cv.width = Math.ceil(w * RES); cv.height = Math.ceil(h * RES);
    const c = cv.getContext('2d'); c.scale(RES, RES); paint(c, w, h);
    s = { cv, w, h }; cache.set(key, s);
  }
  return s;
}
export function put(ctx, s, x, y, rot = 0, k = 1) {
  if (rot) { ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.drawImage(s.cv, -s.w / 2 * k, -s.h / 2 * k, s.w * k, s.h * k); ctx.restore(); }
  else ctx.drawImage(s.cv, x - s.w / 2 * k, y - s.h / 2 * k, s.w * k, s.h * k);
}

const rgb = h => (h[0] === '#' ? [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)) : h.match(/\d+/g).map(Number));
// k < 1 — темнее, k > 1 — светлее
export function shade(h, k) {
  const f = k <= 1 ? c => c * k : c => c + (255 - c) * Math.min(1, k - 1);
  const [r, g, b] = rgb(h);
  return `rgb(${f(r) | 0},${f(g) | 0},${f(b) | 0})`;
}
// шар с бликом: свет падает слева сверху
export function ball(c, x, y, r, col) {
  const g = c.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.05, x, y, r);
  g.addColorStop(0, shade(col, 1.65)); g.addColorStop(0.5, col); g.addColorStop(1, shade(col, 0.45));
  c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill();
}

function rng(seed) { return () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296; }
export const ell = (cx, cy, rx, ry, p = 2) => (x, y) => Math.abs((x - cx) / rx) ** p + Math.abs((y - cy) / ry) ** p < 1;
export const any = (...fs) => (x, y) => fs.some(f => f(x, y));

// Белок как «молекулярная поверхность»: силуэт плотно заполняется затенёнными шариками.
export function paintBlob(c, inside, box, base, seed = 1) {
  const R = rng(seed), [x0, y0, x1, y1] = box, pts = [];
  const n = Math.round((x1 - x0) * (y1 - y0) / 8);
  for (let i = 0; i < n * 4 && pts.length < n; i++) {
    const x = x0 + R() * (x1 - x0), y = y0 + R() * (y1 - y0);
    if (!inside(x, y)) continue;
    let e = 0;
    for (let k = 0; k < 8; k++) if (inside(x + Math.cos(k * 0.785) * 6, y + Math.sin(k * 0.785) * 6)) e++;
    pts.push({ x, y, r: 3 + R() * 2.4, e: e / 8, z: e / 8 + R() * 0.5, v: 0.9 + R() * 0.2 });
  }
  pts.sort((a, b) => a.z - b.z);
  c.fillStyle = shade(base, 0.42);
  for (const p of pts) { c.beginPath(); c.arc(p.x, p.y, p.r + 1.1, 0, 7); c.fill(); }
  for (const p of pts) ball(c, p.x, p.y, p.r, shade(base, (0.7 + 0.42 * p.e) * p.v));
}
function light(c, w, h) {
  c.globalCompositeOperation = 'source-atop';
  const g = c.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, 'rgba(255,255,255,.2)'); g.addColorStop(0.5, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(10,10,40,.32)');
  c.fillStyle = g; c.fillRect(0, 0, w, h);
  c.globalCompositeOperation = 'source-over';
}

export const C = {
  head: '#F5A524', chol: '#DDEB6B', integral: '#8E63D9', glycoP: '#E85D85', semi: '#3F9BE0', periph: '#F08B55',
  carb: '#3DB56E', carrier: '#1FB3A0', aqua: '#4D9FEA', channel: '#6F86D8', actin: '#C58BA5',
};

// ——— белки ———
const mirror = (f, w) => (x, y) => f(w - x, y);
// ионный канал: цвет совпадает с цветом «своего» иона
function channel(c, w, h, col) {
  paintBlob(c, ell(20, 49, 7, 42, 4), [0, 0, w, h], shade(col, 0.5), 47);
  const l = any(ell(10, 49, 8.5, 46, 4), ell(9, 12, 9, 10), ell(9, 86, 9, 10));
  paintBlob(c, l, [0, 0, w, h], col, 53); paintBlob(c, mirror(l, w), [0, 0, w, h], col, 59);
}
const PROTEINS = {
  // световая фаза фотосинтеза (четвёртое число — уровень мембраны в спрайте)
  ps2: [74, 128, (c, w, h) => paintBlob(c, any(ell(37, 58, 32, 50, 3), ell(37, 108, 22, 17)), [0, 0, w, h], '#2FA84F', 151), 58],
  b6f: [52, 116, (c, w, h) => { paintBlob(c, ell(16, 58, 13, 54, 3), [0, 0, w, h], '#D455A8', 157); paintBlob(c, ell(36, 58, 13, 54, 3), [0, 0, w, h], '#E06BB8', 163); }, 58],
  ps1: [70, 126, (c, w, h) => paintBlob(c, any(ell(35, 70, 30, 50, 3), ell(35, 18, 24, 16)), [0, 0, w, h], '#1E9E7A', 167), 70],
  pc: [18, 18, (c, w, h) => paintBlob(c, ell(9, 9, 8, 8), [0, 0, w, h], '#3F8FE8', 173), 9],
  // биосинтез белка
  rnap: [96, 112, (c, w, h) => paintBlob(c, any(ell(48, 56, 44, 50), ell(30, 30, 26, 24)), [0, 0, w, h], '#1FB3A0', 131), 56],
  riboL: [176, 124, (c, w, h) => paintBlob(c, any(ell(88, 66, 84, 56), ell(60, 40, 50, 36)), [0, 0, w, h], '#7F93BE', 137), 62],
  riboS: [160, 50, (c, w, h) => paintBlob(c, ell(80, 25, 76, 22), [0, 0, w, h], '#A892D4', 139), 25],
  trna: [48, 92, (c, w, h) => paintBlob(c, any(ell(24, 50, 7, 36, 4), ell(10, 36, 10, 6.5), ell(38, 36, 10, 6.5), ell(24, 12, 6.5, 11), ell(24, 82, 11, 8)), [0, 0, w, h], '#E9B44C', 149), 92],
  // дыхательная цепь: в спрайте мембрана проходит на уровне, указанном четвёртым числом
  c1: [74, 150, (c, w, h) => paintBlob(c, any(ell(34, 44, 30, 40, 3), ell(50, 100, 21, 46)), [0, 0, w, h], '#3F8FE8', 61), 44],
  c2: [46, 84, (c, w, h) => paintBlob(c, any(ell(23, 24, 15, 22, 3), ell(23, 58, 21, 23)), [0, 0, w, h], '#3DB56E', 67), 24],
  c3: [62, 124, (c, w, h) => { paintBlob(c, ell(19, 62, 15, 58, 3), [0, 0, w, h], '#D455A8', 71); paintBlob(c, ell(43, 62, 15, 58, 3), [0, 0, w, h], '#E06BB8', 73); }, 62],
  c4: [56, 108, (c, w, h) => paintBlob(c, any(ell(28, 54, 24, 50, 3), ell(28, 14, 20, 12)), [0, 0, w, h], '#22B5A0', 79), 54],
  cytc: [20, 20, (c, w, h) => paintBlob(c, ell(10, 10, 9, 9), [0, 0, w, h], '#E5484D', 83), 10],
  f1: [78, 70, (c, w, h) => { for (let i = 0; i < 3; i++) { paintBlob(c, ell(15 + i * 24, 35, 13, 31), [0, 0, w, h], i % 2 ? '#F2B441' : '#E8833A', 89 + i); } paintBlob(c, ell(27, 35, 12, 30), [0, 0, w, h], '#F2B441', 97); paintBlob(c, ell(51, 35, 12, 30), [0, 0, w, h], '#E8833A', 101); }, 35],
  stator: [16, 150, (c, w, h) => paintBlob(c, ell(8, 75, 6, 72, 4), [0, 0, w, h], '#B8793A', 103), 20],
  cring: [18, 78, (c, w, h) => paintBlob(c, ell(9, 39, 7.5, 37, 4), [0, 0, w, h], '#F0A03C', 107), 39],
  // канал: две передние субъединицы и задняя, видимая сквозь пору
  channel: [72, 134, (c, w, h) => {
    paintBlob(c, ell(36, 67, 12, 55, 4), [0, 0, w, h], shade(C.integral, 0.5), 3);
    const left = any(ell(18, 67, 13, 60, 4), ell(16, 15, 15, 13), ell(17, 121, 14, 11));
    paintBlob(c, left, [0, 0, w, h], C.integral, 5);
    paintBlob(c, mirror(left, w), [0, 0, w, h], C.integral, 9);
  }],
  // гликопротеин: крупный наружный домен, тонкий трансмембранный участок, небольшой внутренний
  glyco: [64, 158, (c, w, h) => paintBlob(c, any(ell(32, 27, 27, 23), ell(32, 81, 12, 50, 4), ell(32, 138, 17, 14)), [0, 0, w, h], C.glycoP, 7)],
  semi: [46, 72, (c, w, h) => paintBlob(c, ell(23, 36, 20, 33, 2.5), [0, 0, w, h], C.semi, 11)],
  periph: [68, 38, (c, w, h) => paintBlob(c, ell(34, 19, 31, 16), [0, 0, w, h], C.periph, 13)],
  carrierL: [26, 98, (c, w, h) => paintBlob(c, any(ell(14, 49, 9.5, 46, 4), ell(12, 13, 11, 11), ell(12, 85, 11, 11)), [0, 0, w, h], C.carrier, 17)],
  carrierR: [26, 98, (c, w, h) => paintBlob(c, mirror(any(ell(14, 49, 9.5, 46, 4), ell(12, 13, 11, 11), ell(12, 85, 11, 11)), w), [0, 0, w, h], C.carrier, 19)],
  pumpL: [32, 114, (c, w, h) => paintBlob(c, any(ell(17, 57, 12, 54, 4), ell(14, 14, 13, 12), ell(14, 98, 13, 13)), [0, 0, w, h], C.integral, 23)],
  pumpR: [32, 114, (c, w, h) => paintBlob(c, mirror(any(ell(17, 57, 12, 54, 4), ell(14, 14, 13, 12), ell(14, 98, 13, 13)), w), [0, 0, w, h], C.integral, 29)],
  pumpDomain: [66, 44, (c, w, h) => paintBlob(c, ell(33, 22, 30, 19), [0, 0, w, h], shade(C.integral, 0.72), 31)],
  aqua: [34, 96, (c, w, h) => {
    paintBlob(c, ell(17, 48, 6, 42, 4), [0, 0, w, h], shade(C.aqua, 0.5), 37);
    paintBlob(c, any(ell(8, 48, 7, 45, 4), ell(8, 10, 8, 9), ell(8, 86, 8, 9)), [0, 0, w, h], C.aqua, 41);
    paintBlob(c, mirror(any(ell(8, 48, 7, 45, 4), ell(8, 10, 8, 9), ell(8, 86, 8, 9)), w), [0, 0, w, h], C.aqua, 43);
  }],
  naChannel: [40, 98, (c, w, h) => channel(c, w, h, '#D98A2B')],
  kChannel: [40, 98, (c, w, h) => channel(c, w, h, '#8468E0')],
};
export function protein(name) {
  const [w, h, paint, anchor] = PROTEINS[name];
  const s = sprite('prot:' + name, w, h, (c, w, h) => { paint(c, w, h); light(c, w, h); });
  s.anchor = anchor ?? h / 2;
  return s;
}
// Поставить белок так, чтобы его «мембранная» часть оказалась на высоте memY.
export function putAt(ctx, name, x, memY, k = 1) { const s = protein(name); ctx.drawImage(s.cv, x - s.w / 2 * k, memY - s.anchor * k, s.w * k, s.h * k); }

// ——— фосфолипид ———
const headSprite = () => sprite('head', 15, 15, c => ball(c, 7.5, 7.5, 6.5, C.head));
// Головка в (x, y); хвосты направлены по dir (+1 вниз, −1 вверх).
// Один хвост прямой (насыщенная жирная кислота), второй с изломом (двойная связь).
export function lipid(ctx, x, y, dir, wob = 0, len = 31, r = 6.5) {
  const yb = y + dir * r * 0.75;
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (const s of [-1, 1]) {
    const x0 = x + s * r * 0.36;
    ctx.beginPath(); ctx.moveTo(x0, yb);
    if (s < 0) ctx.bezierCurveTo(x0 + wob * 0.5, yb + dir * len * 0.35, x0 - wob * 0.5, yb + dir * len * 0.7, x0 + wob * 0.35, yb + dir * len);
    else {
      const kx = x0 + r * 0.42 * Math.min(1, len / 31) + wob * 0.4, ky = yb + dir * len * 0.5;
      ctx.lineTo(kx, ky); ctx.quadraticCurveTo(kx + wob * 0.3, ky + dir * len * 0.25, x0 + wob * 0.6, yb + dir * len * 0.94);
    }
    ctx.strokeStyle = '#9C7B45'; ctx.lineWidth = r * 0.5; ctx.stroke();
    ctx.strokeStyle = '#F4E4B8'; ctx.lineWidth = r * 0.25; ctx.stroke();
  }
  ctx.fillStyle = '#B9701D'; ctx.beginPath(); ctx.ellipse(x, yb, r * 0.62, r * 0.36, 0, 0, 7); ctx.fill();
  put(ctx, headSprite(), x, y, 0, r / 6.5);
}
export function lipidHead(ctx, x, y, r = 6.5) { put(ctx, headSprite(), x, y, 0, r / 6.5); }

// ——— холестерин: гидроксильная группа у головок, четыре сцепленных кольца, короткий хвост ———
export function cholesterol(ctx, x, yHead, dir) {
  const y = yHead + dir * 8;
  ctx.lineJoin = 'round';
  for (let i = 3; i >= 0; i--) {
    const cy = y + dir * (4.8 + i * 5.3), cx = x + (i % 2 ? 1.3 : -1.3), n = i < 3 ? 6 : 5, rr = i < 3 ? 3.6 : 3.1;
    ctx.beginPath();
    for (let k = 0; k < n; k++) { const a = k / n * 6.283 + dir * 0.52; ctx.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); }
    ctx.closePath(); ctx.fillStyle = C.chol; ctx.fill(); ctx.strokeStyle = '#75861D'; ctx.lineWidth = 0.9; ctx.stroke();
  }
  const ty = y + dir * (4.8 + 3 * 5.3 + 3);
  ctx.beginPath(); ctx.moveTo(x + 1.3, ty); ctx.quadraticCurveTo(x + 3.2, ty + dir * 4, x, ty + dir * 8);
  ctx.strokeStyle = '#C3D455'; ctx.lineWidth = 1.9; ctx.lineCap = 'round'; ctx.stroke();
  ball(ctx, x, y, 2.5, '#E5484D');
}

// ——— углеводные цепочки (цвета остатков — как принято в гликобиологии) ———
const SUGAR = { N: '#3E7BD9', M: '#3DB56E', G: '#F2C230', S: '#B061C9' };
const sugar = k => sprite('sugar' + k, 11, 11, c => {
  c.beginPath();
  for (let i = 0; i < 6; i++) c.lineTo(5.5 + Math.cos(i * 1.047 + 0.52) * 5, 5.5 + Math.sin(i * 1.047 + 0.52) * 5);
  c.closePath(); c.save(); c.clip(); ball(c, 5.5, 5.5, 7, SUGAR[k]); c.restore();
  c.strokeStyle = shade(SUGAR[k], 0.5); c.lineWidth = 0.7; c.stroke();
});
const TREES = {
  // разветвлённая цепочка гликопротеина
  N: [[0, -8, 'N', -1], [0, -17, 'N', 0], [0, -26, 'M', 1], [-8, -33, 'M', 2], [-11, -42, 'G', 3], [-12, -51, 'S', 4], [8, -33, 'M', 2], [11, -42, 'G', 6]],
  // короткая цепочка гликолипида
  L: [[0, -9, 'N', -1], [0, -18, 'G', 0], [-2, -27, 'G', 1], [8, -24, 'S', 1]],
};
export function glycan(ctx, x, y, t, seed, kind = 'N') {
  const tree = TREES[kind];
  const pos = tree.map(([dx, dy], i) => [x + dx + Math.sin(t * 1.1 + seed + i * 0.6) * (-dy / 14), y + dy]);
  ctx.strokeStyle = 'rgba(225,240,235,.85)'; ctx.lineWidth = 1.5; ctx.lineCap = 'round';
  tree.forEach(([, , , parent], i) => {
    const a = parent < 0 ? [x, y] : pos[parent];
    ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(pos[i][0], pos[i][1]); ctx.stroke();
  });
  tree.forEach(([, , k], i) => put(ctx, sugar(k), pos[i][0], pos[i][1]));
}

// ——— нить цитоскелета (актин): две закрученные цепочки шариков ———
export function filament(ctx, x0, x1, y, t, phase = 0) {
  const bead = sprite('actin', 9, 9, c => ball(c, 4.5, 4.5, 3.8, C.actin));
  for (let x = x0, i = 0; x < x1; x += 5.4, i++) {
    const yy = y + Math.sin(x * 0.012 + phase + t * 0.25) * 6;
    put(ctx, bead, x, yy + Math.sin(i * 0.48 + phase) * 2.6);
    put(ctx, bead, x + 2.7, yy - Math.sin(i * 0.48 + phase) * 2.6);
  }
}

// ——— молекулы для моделей транспорта ———
const plus = (c, x, y, s) => {
  c.strokeStyle = 'rgba(30,25,60,.85)'; c.lineWidth = 1.5; c.lineCap = 'round';
  c.beginPath(); c.moveTo(x - s, y); c.lineTo(x + s, y); c.moveTo(x, y - s); c.lineTo(x, y + s); c.stroke();
};
const ring = (c, cx, cy, n, rad, r, col, oAt) => {
  for (let i = 0; i < n; i++) {
    const a = i / n * 6.283 - 1.57;
    ball(c, cx + Math.cos(a) * rad, cy + Math.sin(a) * rad, r, i === oAt ? '#E5484D' : col);
  }
};
const MOLS = {
  o2: [17, 10, c => { ball(c, 5.2, 5, 4.4, '#E5484D'); ball(c, 11.8, 5, 4.4, '#E5484D'); }],
  co2: [23, 10, c => { ball(c, 4.8, 5, 4.2, '#E5484D'); ball(c, 18.2, 5, 4.2, '#E5484D'); ball(c, 11.5, 5, 4.4, '#5F6B78'); }],
  h2o: [13, 12, c => { ball(c, 2.9, 8.6, 2.4, '#F4F7FA'); ball(c, 10.1, 8.6, 2.4, '#F4F7FA'); ball(c, 6.5, 5, 4, '#E5484D'); }],
  glu: [22, 22, c => { ball(c, 17.6, 3.6, 2.5, '#7BE0A0'); ring(c, 10, 12, 6, 5.6, 3, '#7BE0A0', 1); }],
  suc: [32, 20, c => { ring(c, 9, 10, 6, 5.4, 2.9, '#E0A458', -1); ball(c, 16.6, 10, 2.3, '#B9742A'); ring(c, 23.6, 10, 5, 4.6, 2.8, '#E0A458', -1); }],
  na: [12, 12, c => { ball(c, 6, 6, 5.2, '#FFB13D'); plus(c, 6, 6, 2.3); }],
  k: [15, 15, c => { ball(c, 7.5, 7.5, 6.7, '#A98BFF'); plus(c, 7.5, 7.5, 2.6); }],
  hp: [10, 10, c => { ball(c, 5, 5, 4.2, '#FFE680'); plus(c, 5, 5, 2); }],
  nadh: [24, 13, c => { ball(c, 6, 6.5, 5.2, '#4C8DFF'); ball(c, 14, 6.5, 4.4, '#7FB2FF'); ball(c, 20.2, 6.5, 2.8, '#FFFFFF'); }],
  nad: [20, 13, c => { ball(c, 6, 6.5, 5.2, '#3C5F9E'); ball(c, 14, 6.5, 4.4, '#5878AD'); }],
  fadh2: [24, 13, c => { ball(c, 6, 6.5, 5.2, '#FF8A3D'); ball(c, 14, 6.5, 4.4, '#FFB27A'); ball(c, 20.2, 6.5, 2.8, '#FFFFFF'); }],
  q: [16, 16, c => { c.beginPath(); for (let i = 0; i < 6; i++) c.lineTo(8 + Math.cos(i * 1.047) * 7, 8 + Math.sin(i * 1.047) * 7); c.closePath(); c.save(); c.clip(); ball(c, 8, 8, 10, '#C6E04A'); c.restore(); c.strokeStyle = '#5F7414'; c.lineWidth = 1; c.stroke(); }],
  carbon: [11, 11, c => ball(c, 5.5, 5.5, 4.8, '#6C7786')],
  nadph: [24, 13, c => { ball(c, 6, 6.5, 5.2, '#16A085'); ball(c, 14, 6.5, 4.4, '#5FD0B8'); ball(c, 20.2, 6.5, 2.8, '#FFFFFF'); }],
  nadp: [20, 13, c => { ball(c, 6, 6.5, 5.2, '#2F6B60'); ball(c, 14, 6.5, 4.4, '#4F8F84'); }],
  sec: [9, 9, c => ball(c, 4.5, 4.5, 3.8, '#FFD166')],
  enz: [7, 7, c => ball(c, 3.5, 3.5, 2.8, '#FF7A8A')],
  pi: [10, 10, c => ball(c, 5, 5, 4.2, '#FFD23F')],
  atp: [36, 14, c => { ball(c, 6.5, 7, 5.2, '#5AA9FF'); ball(c, 13, 7, 3.8, '#9AD0FF'); ball(c, 19.5, 7, 3.6, '#FFD23F'); ball(c, 25, 7, 3.6, '#FFD23F'); ball(c, 30.5, 7, 3.6, '#FFD23F'); }],
  adp: [30, 14, c => { ball(c, 6.5, 7, 5.2, '#5AA9FF'); ball(c, 13, 7, 3.8, '#9AD0FF'); ball(c, 19.5, 7, 3.6, '#FFD23F'); ball(c, 25, 7, 3.6, '#FFD23F'); }],
  // бактерия-палочка
  food: [70, 34, (c, w, h) => {
    const body = () => { c.beginPath(); c.roundRect(3, 4, w - 6, h - 8, 13); };
    const g = c.createLinearGradient(0, 4, 0, h - 4);
    g.addColorStop(0, '#C9EE8A'); g.addColorStop(0.45, '#8CCB4E'); g.addColorStop(1, '#4E8A2C');
    body(); c.fillStyle = g; c.fill(); c.save(); body(); c.clip();
    const R = rng(71);
    for (let i = 0; i < 60; i++) { c.fillStyle = `rgba(40,90,30,${0.15 + R() * 0.25})`; c.beginPath(); c.arc(6 + R() * (w - 12), 6 + R() * (h - 12), 0.8 + R(), 0, 7); c.fill(); }
    c.strokeStyle = 'rgba(235,255,210,.55)'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(18, 17);
    for (let x = 18; x < 52; x += 4) c.quadraticCurveTo(x + 2, 17 + (x % 8 ? 5 : -5), x + 4, 17);
    c.stroke(); c.restore();
    body(); c.strokeStyle = '#3B6E22'; c.lineWidth = 1.6; c.stroke();
  }],
};
export function mol(kind) { const [w, h, paint] = MOLS[kind]; return sprite('mol:' + kind, w, h, paint); }
export const molIcon = kind => mol(kind).cv.toDataURL();

// ——— фон: сверху внеклеточная среда, снизу цитоплазма ———
export function backdrop(ctx, L, H, memY, t = 0) {
  const k = Math.max(0.05, Math.min(0.95, memY / H));
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#15606B'); g.addColorStop(k, '#0B3540');
  g.addColorStop(k, '#1B2B47'); g.addColorStop(1, '#2A1E40');
  ctx.fillStyle = g; ctx.fillRect(0, 0, L, H);
  // мягкие блики, которые медленно плывут
  for (let i = 0; i < 4; i++) {
    const x = L * (0.15 + 0.25 * i) + Math.sin(t * 0.13 + i * 2.1) * 40, y = i % 2 ? H * 0.88 : H * 0.08, r = 150;
    const rg = ctx.createRadialGradient(x, y, 0, x, y, r);
    rg.addColorStop(0, i % 2 ? 'rgba(190,120,220,.13)' : 'rgba(120,230,230,.13)'); rg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = rg; ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
}

export function sceneLabel(ctx, text, x, y, scale, align = 'left') {
  ctx.font = `600 ${Math.max(13, 12 / scale)}px system-ui, sans-serif`;
  ctx.textAlign = align; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
  ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(8,25,35,.55)'; ctx.strokeText(text, x, y);
  ctx.fillStyle = 'rgba(255,255,255,.78)'; ctx.fillText(text, x, y);
}

// ——— общие приёмы для «дальнего» масштаба ———
// Мембрана лентой: два тёмно-жёлтых слоя головок и светлая середина из хвостов.
export function ribbon(ctx, pts, closed = false, k = 1) {
  ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  if (closed) ctx.closePath();
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.strokeStyle = '#7C4E0E'; ctx.lineWidth = 12 * k; ctx.stroke();
  ctx.strokeStyle = '#F5A524'; ctx.lineWidth = 9.6 * k; ctx.stroke();
  ctx.strokeStyle = '#F8EAC4'; ctx.lineWidth = 3.2 * k; ctx.stroke();
}
export function chaikin(p, it = 2, closed = false) {
  for (; it--;) {
    const q = closed ? [] : [p[0]], n = p.length;
    for (let i = 0; i < (closed ? n : n - 1); i++) {
      const [x0, y0] = p[i], [x1, y1] = p[(i + 1) % n];
      q.push([0.75 * x0 + 0.25 * x1, 0.75 * y0 + 0.25 * y1], [0.25 * x0 + 0.75 * x1, 0.25 * y0 + 0.75 * y1]);
    }
    if (!closed) q.push(p[n - 1]);
    p = q;
  }
  return p;
}
// Фон «внутри клетки»: цитоплазма с мягкими бликами.
export function cytoplasm(ctx, L, H, t = 0) {
  const g = ctx.createLinearGradient(0, 0, L * 0.3, H);
  g.addColorStop(0, '#16324A'); g.addColorStop(1, '#2A1E40');
  ctx.fillStyle = g; ctx.fillRect(0, 0, L, H);
  for (let i = 0; i < 4; i++) {
    const x = L * (0.12 + 0.26 * i) + Math.sin(t * 0.13 + i * 2.1) * 40, y = i % 2 ? H * 0.9 : H * 0.06, r = 160;
    const rg = ctx.createRadialGradient(x, y, 0, x, y, r);
    rg.addColorStop(0, i % 2 ? 'rgba(190,120,220,.12)' : 'rgba(110,200,230,.12)'); rg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = rg; ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
}

export function roundRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
