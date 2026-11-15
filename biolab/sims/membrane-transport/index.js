import { createStage } from '../../js/core/canvas.js';
import { lipid, protein, put, mol, molIcon, backdrop, sceneLabel } from '../_shared/art.js';
import { GLOSSARY } from '../_shared/glossary.js';

export const meta = { id: 'membrane-transport', title: 'Мембранный транспорт' };

const NAMES = {
  o2: 'Кислород O₂', glu: 'Глюкоза', h2o: 'Вода', suc: 'Сахар (не проходит через мембрану)',
  na: 'Ион натрия Na⁺', k: 'Ион калия K⁺', atp: 'АТФ', food: 'Бактерия', sec: 'Секрет клетки, например гормон', enz: 'Ферменты лизосомы',
};

const MODES = {
  diffusion: {
    title: 'Простая диффузия', legend: ['o2'],
    facts: ['АТФ не нужна', 'по градиенту концентрации', 'прямо через липидный слой'],
    about: 'Маленькие неполярные молекулы — O₂, CO₂ — проходят прямо между фосфолипидами. Их никто не «тянет»: молекулы движутся хаотично, и там, где их больше, они чаще переходят на другую сторону.',
    try: 'Измени количество кислорода снаружи и дождись, пока концентрации выровняются. Нажми на любую молекулу или белок — появится справка.',
  },
  facilitated: {
    title: 'Облегчённая диффузия', legend: ['glu'],
    facts: ['АТФ не нужна', 'по градиенту концентрации', 'через белок-переносчик или канал'],
    about: 'Глюкоза, аминокислоты и ионы сами через липидный слой не пройдут: они слишком крупные или заряженные. Глюкозу переносит белок-переносчик: он открыт то наружу, то внутрь, и каждый раз меняет форму. Энергия при этом не тратится.',
    try: 'Убери все белки — транспорт остановится. Добавь больше — пойдёт быстрее.',
  },
  osmosis: {
    title: 'Осмос', legend: ['h2o', 'suc'],
    facts: ['АТФ не нужна', 'вода идёт туда, где больше растворённых веществ', 'через липидный слой и белки-аквапорины'],
    about: 'Осмос — это диффузия воды через полупроницаемую мембрану. Сахар пройти не может, а вода может: быстро через каналы-аквапорины и понемногу прямо через липиды. Поэтому вода переходит туда, где раствор концентрированнее.',
    try: 'Добавь сахара снаружи — клетка потеряет воду. Убери сахар — клетка набухнет.',
  },
  pump: {
    title: 'Натрий-калиевый насос', legend: ['na', 'k', 'atp'],
    facts: ['нужна АТФ', 'против градиента концентрации', 'через белок-насос'],
    about: 'Активный транспорт. Насос захватывает внутри клетки 3 иона Na⁺, получает от АТФ фосфатную группу, меняет форму и выпускает натрий наружу. Затем берёт снаружи 2 иона K⁺, теряет фосфат и возвращается в исходную форму, выпуская калий в клетку.',
    try: 'Выключи АТФ: насос остановится, и ионы постепенно выровняются через ионные каналы по краям.',
  },
  vesicle: {
    title: 'Эндоцитоз и экзоцитоз', legend: ['food', 'enz', 'sec'],
    facts: ['нужна АТФ', 'перенос крупных частиц', 'в мембранных пузырьках'],
    about: 'То, что не проходит ни через липиды, ни через белки, клетка переносит в пузырьках. Здесь масштаб другой: бактерия в сотни раз толще мембраны, поэтому мембрана показана лентой. Эндоцитоз — захват внутрь: твёрдых частиц (фагоцитоз) или капель жидкости (пиноцитоз). Экзоцитоз — выведение наружу гормонов, ферментов, отходов.',
    try: 'Запусти оба процесса и проследи, что происходит с мембраной.',
  },
};
const MODE_IDS = Object.keys(MODES);

const H = 380;
const SPEED = { h2o: 135, o2: 95 };
const rnd = (a, b) => a + Math.random() * (b - a);
const ease = k => k * k * (3 - 2 * k);
const lerp = (a, b, k) => a + (b - a) * k;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export function mount(root, api) {
  root.innerHTML = `
    <div class="sim">
      <div class="chips sim-modes" role="group" aria-label="Вид транспорта">
        ${MODE_IDS.map(k => `<button class="chip" data-k="${k}" aria-pressed="false">${MODES[k].title}</button>`).join('')}
      </div>
      <div class="sim-stage"><canvas aria-label="Модель транспорта веществ через мембрану"></canvas></div>
      <div class="sim-panel">
        <div class="help" hidden></div>
        <div class="controls">
          <div class="mode-controls"></div>
          <p class="readout"></p>
          <p class="try"></p>
        </div>
        <div class="info">
          <h3></h3><ul class="facts"></ul><p class="about"></p>
          <div class="legend"></div>
        </div>
        <button class="btn ghost restart">Начать заново</button>
      </div>
    </div>`;
  const $ = s => root.querySelector(s);
  const readout = $('.readout'), ctl = $('.mode-controls');

  let mode = 'diffusion', L = 600, memBase = 190, memY = 190, EDGE = 38;
  let parts = [], prots = [], pump = null, ves = null;
  const P = { o2: 28, carriers: 3, sugar: 8, atp: true };
  const seen = new Set();
  let picked = null;                  // частица, на которую нажали
  const help = $('.help');
  function showHelp(key) {
    const g = GLOSSARY[key];
    help.hidden = !g; if (!g) { picked = null; return; }
    help.innerHTML = `<button class="help-close" aria-label="Закрыть справку">×</button><b>${g.t}</b><p>${g.d}</p>`;
  }
  help.addEventListener('click', e => { if (e.target.closest('.help-close')) showHelp(null); });
  function onTap(x, y) {
    let best = null, bd = 17;
    for (const p of parts) { const d = Math.hypot(p.x - x, p.y - y); if (d < bd) { bd = d; best = p; } }
    if (best) { picked = { p: best, t: 4 }; return showHelp(best.kind); }
    picked = null;
    if (ves) {
      const v = ves;
      if (v.food && Math.hypot(v.food.x - x, v.food.y - y) < 30) return showHelp('food');
      if (v.lyso && Math.hypot(v.lyso.x - x, v.lyso.y - y) < v.lyso.r + 6) return showHelp('lysosome');
      if (v.body && Math.hypot(v.body.x - x, v.body.y - y) < v.body.r + 6) return showHelp('phagosome');
      if (v.exo && Math.hypot(v.cx - x, v.exo.y - y) < RHO + 6) return showHelp('sec');
      return showHelp(Math.abs(y - memY) < 16 ? 'membraneFar' : null);
    }
    const pr = prots.find(p => Math.abs(x - p.x) < p.half && Math.abs(y - memY) < 62);
    if (pr) return showHelp(pr.type === 'leak' ? (pr.ion === 'k' ? 'kCh' : 'naCh') : pr.type);
    if (pump && Math.abs(x - pump.x) < 40 && y > memY && y < memY + 90) return showHelp('pump');
    showHelp(Math.abs(y - memY) < EDGE ? 'bilayer' : null);
  }

  const count = (kind, side) => parts.reduce((n, p) => n + (p.kind === kind && p.side === side && !p.cross && !p.bound ? 1 : 0), 0);

  function spawn(kind, side, n) {
    for (let i = 0; i < n; i++) {
      const a = rnd(0, 6.28), v = SPEED[kind] || 82;
      parts.push({
        kind, side, v, x: rnd(12, L - 12),
        y: side < 0 ? rnd(14, memY - EDGE - 8) : rnd(memY + EDGE + 8, H - 14),
        vx: Math.cos(a) * v, vy: Math.sin(a) * v,
        rot: kind === 'na' || kind === 'k' ? 0 : rnd(0, 6.28), spin: kind === 'na' || kind === 'k' ? 0 : rnd(-2, 2),
      });
    }
  }

  function setup() {
    parts = []; prots = []; pump = null; ves = null;
    EDGE = mode === 'vesicle' ? 9 : 38;
    memBase = mode === 'vesicle' ? 150 : 190; memY = memBase;
    if (mode === 'diffusion') { spawn('o2', -1, P.o2); spawn('o2', 1, 4); }
    if (mode === 'facilitated') {
      for (let i = 0; i < P.carriers; i++) prots.push({ type: 'carrier', x: L * (i + 1) / (P.carriers + 1), half: 22, open: -1, phase: 'idle', idle: rnd(0.3, 0.6), bound: null });
      spawn('glu', -1, 22); spawn('glu', 1, 2);
    }
    if (mode === 'osmosis') {
      for (const k of [0.2, 0.5, 0.8]) prots.push({ type: 'aqua', x: L * k, half: 17 });
      spawn('h2o', -1, 34); spawn('h2o', 1, 34); spawn('suc', -1, P.sugar); spawn('suc', 1, 8);
    }
    if (mode === 'pump') {
      pump = { x: L / 2, open: 1, phase: 'na', timer: 0, bound: [], used: 0, target: 1, next: '', P: false, atp: null, adp: null, pi: null, flash: 0 };
      prots.push({ type: 'pump', x: L / 2, half: 36 }, { type: 'leak', ion: 'k', x: L * 0.14, half: 20 }, { type: 'leak', ion: 'na', x: L * 0.86, half: 20 });
      spawn('na', -1, 10); spawn('na', 1, 10); spawn('k', -1, 10); spawn('k', 1, 10);
    }
    if (mode === 'vesicle') ves = { phase: 'idle', t: 0, cx: L / 2, cy: 0, phi: 0, food: null, body: null, lyso: null, exo: null, path: null, note: '' };
  }

  // ——— правила перехода через мембрану ———
  function tryCross(p) {
    if (mode === 'diffusion') return Math.random() < 0.4 ? 'cross' : false;
    if (mode === 'facilitated') {
      const c = prots.find(c => c.phase === 'idle' && !c.bound && c.open === p.side && Math.abs(p.x - c.x) < 24);
      if (!c) return false;
      c.bound = p; c.phase = 'hold'; c.timer = 0.1; p.bound = true; return 'bound';
    }
    if (mode === 'osmosis') {
      if (p.kind !== 'h2o') return false;
      const aq = prots.find(a => Math.abs(p.x - a.x) < 16);
      if (Math.random() >= (aq ? 1 : 0.28) / (1 + 0.16 * count('suc', p.side))) return false;
      if (aq) p.x = aq.x;
      return 'cross';
    }
    if (mode === 'pump') {
      const ch = prots.find(c => c.type === 'leak' && c.ion === p.kind && Math.abs(p.x - c.x) < 13);
      if (!ch || Math.random() > 0.9) return false;
      p.x = ch.x; return 'cross';
    }
    return false;
  }

  function lure(p) {
    let best = null, bd = 100;
    for (const c of prots) {
      const fits = (p.kind === 'glu' && c.type === 'carrier') || (p.kind === 'h2o' && c.type === 'aqua') || (c.type === 'leak' && c.ion === p.kind);
      if (!fits) continue;
      const d = Math.abs(c.x - p.x); if (d < bd) { bd = d; best = c; }
    }
    return best;
  }

  function step(dt) {
    for (const p of parts) {
      p.rot += p.spin * dt;
      if (p.free > 0) { p.free -= dt; p.x += p.vx * dt; p.y += p.vy * dt; continue; }
      if (p.bound) {
        p.x += (p.tx - p.x) * Math.min(1, dt * 9); p.y += (p.ty - p.y) * Math.min(1, dt * 9);
        continue;
      }
      if (p.cross) {
        p.y += -p.side * 130 * dt;
        if (p.side < 0 ? p.y > memY + EDGE : p.y < memY - EDGE) { p.side = -p.side; p.cross = false; p.vy = p.side * p.v * 0.8; }
        continue;
      }
      p.vx += rnd(-1, 1) * 170 * dt; p.vy += rnd(-1, 1) * 170 * dt;
      const c = lure(p);                // рядом со «своим» белком частицу затягивает к его входу
      if (c && Math.abs(p.y - (memY + p.side * EDGE)) < 95) { p.vx += Math.max(-1, Math.min(1, (c.x - p.x) / 40)) * 560 * dt; p.vy += -p.side * 280 * dt; }
      const v = Math.hypot(p.vx, p.vy) || 1; p.vx *= p.v / v; p.vy *= p.v / v;
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.x < 8) { p.x = 8; p.vx = Math.abs(p.vx); }
      if (p.x > L - 8) { p.x = L - 8; p.vx = -Math.abs(p.vx); }
      if (p.y < 10) { p.y = 10; p.vy = Math.abs(p.vy); }
      if (p.y > H - 10) { p.y = H - 10; p.vy = -Math.abs(p.vy); }
      const wall = memY + p.side * EDGE;
      if (p.side < 0 ? p.y > wall : p.y < wall) {
        const r = tryCross(p);
        if (r === 'cross') { p.cross = true; p.y = wall; }
        else if (!r) { p.y = wall; p.vy = p.side * Math.abs(p.vy); }
      }
    }
    if (mode === 'facilitated') stepCarriers(dt);
    if (mode === 'osmosis') {
      const target = clamp(memBase + (34 - count('h2o', 1)) * 3.4, 122, 258);
      memY += (target - memY) * Math.min(1, dt * 2.5);
    }
    if (pump) stepPump(dt);
    if (ves) stepVesicle(dt);
  }

  // ——— белок-переносчик: открыт то наружу, то внутрь ———
  function stepCarriers(dt) {
    for (const c of prots) {
      if (c.bound) { c.bound.tx = c.x; c.bound.ty = memY + c.open * 12; }
      if (c.phase === 'hold') { if ((c.timer -= dt) <= 0) { c.phase = 'flip'; c.target = -c.open; } }
      else if (c.phase === 'idle' && !c.bound) {
      // пустой переносчик быстро разворачивается, если с его стороны никто не ждёт
      const waiting = parts.some(q => q.kind === 'glu' && q.side === c.open && !q.bound && !q.cross && Math.abs(q.x - c.x) < 60 && Math.abs(q.y - (memY + q.side * EDGE)) < 70);
      if ((c.idle -= dt * (waiting ? 1 : 6)) <= 0) { c.phase = 'flip'; c.target = -c.open; }
    }
      else if (c.phase === 'flip') {
        c.open += Math.sign(c.target - c.open) * dt * 7;
        if (Math.abs(c.target - c.open) < 0.2) {
          c.open = c.target; c.phase = 'idle'; c.idle = rnd(0.9, 1.4);
          const p = c.bound;
          if (p) { c.bound = null; p.bound = false; p.side = c.open; p.y = memY + p.side * (EDGE + 3); p.vy = p.side * p.v; p.vx = rnd(-25, 25); }
        }
      }
    }
  }

  // ——— натрий-калиевый насос ———
  function stepPump(dt) {
    const pm = pump;
    const sites = need => pm.bound.forEach((p, i) => { p.tx = pm.x + (i - (need - 1) / 2) * 10.5; p.ty = memY + pm.open * 16; });
    const bind = (kind, side, need) => {
      if (pm.bound.length < need) {
        const free = parts.filter(p => p.kind === kind && p.side === side && !p.bound && !p.cross);
        if (free.length) {
          const p = free.reduce((a, b) => (Math.hypot(b.x - pm.x, b.y - memY) < Math.hypot(a.x - pm.x, a.y - memY) ? b : a));
          p.bound = true; pm.bound.push(p);
        }
      }
      sites(need);
      return pm.bound.length === need && pm.bound.every(p => Math.hypot(p.x - p.tx, p.y - p.ty) < 3);
    };
    const release = side => {
      pm.bound.forEach(p => { p.bound = false; p.side = side; p.y = memY + side * (EDGE + 4); p.vy = side * p.v; p.vx = rnd(-30, 30); });
      pm.bound = [];
    };
    const site = { x: pm.x + 24, y: memY + 70 };               // место посадки АТФ и фосфата
    if (pm.phase === 'na') {
      if (bind('na', 1, 3) && P.atp) { pm.phase = 'atpIn'; pm.timer = 0; }
    } else if (pm.phase === 'atpIn') {
      const k = Math.min(1, (pm.timer += dt) / 0.45); sites(3);
      pm.atp = { x: lerp(pm.x + 110, site.x + 12, ease(k)), y: lerp(memY + 160, site.y + 8, ease(k)) };
      if (k === 1) { pm.phase = 'hydro'; pm.timer = 0.15; pm.flash = 1; }
    } else if (pm.phase === 'hydro') {
      sites(3);
      if ((pm.timer -= dt) <= 0) {
        pm.P = true; pm.used++; pm.adp = { x: pm.atp.x, y: pm.atp.y + 6, a: 1 }; pm.atp = null;
        pm.phase = 'flip'; pm.target = -1; pm.next = 'relNa';
      }
    } else if (pm.phase === 'flip') {
      pm.open += Math.sign(pm.target - pm.open) * dt * 5; sites(pm.bound.length);
      if (Math.abs(pm.target - pm.open) < 0.15) { pm.open = pm.target; pm.phase = pm.next; }
    } else if (pm.phase === 'relNa') { release(-1); pm.phase = 'k'; }
    else if (pm.phase === 'k') {
      if (bind('k', -1, 2)) { pm.P = false; pm.pi = { x: site.x, y: site.y, a: 1 }; pm.phase = 'flip'; pm.target = 1; pm.next = 'relK'; }
    } else if (pm.phase === 'relK') { release(1); pm.phase = 'na'; }
    for (const m of [pm.adp, pm.pi]) if (m) { m.x += 16 * dt; m.y += 26 * dt; m.a -= dt * 0.7; }
    if (pm.adp?.a <= 0) pm.adp = null;
    if (pm.pi?.a <= 0) pm.pi = null;
    pm.flash = Math.max(0, pm.flash - dt * 2.2);
  }

  // ——— пузырьки: фагоцитоз и экзоцитоз ———
  const R = 44, T = 18, RHO = 30;
  // Мембрана вокруг частицы: вмятина, из которой вырастают псевдоподии.
  // Углы отсчитываются от направления «вниз» вокруг центра частицы.
  function cupPath(cx, cy, r, t, phi) {
    const d = memY - cy;
    if (d >= r) return [[-20, memY], [L + 20, memY]];
    const aIn = Math.acos(Math.max(-1, d / r));
    const rm0 = r + t / 2, phMax = Math.PI - (t / 2) / rm0 - 0.03;
    const ph = clamp(phi, aIn, Math.max(aIn, phMax));
    const te = t * ease(clamp((ph - aIn) / 0.7, 0, 1));
    const ro = r + te, a0 = Math.acos(clamp(d / ro, -1, 1));
    const pod = s => {
      const pts = [];
      if (te > 0.5 && ph > a0) {
        for (let a = a0; a < ph; a += 0.12) pts.push([cx - s * ro * Math.sin(a), cy + ro * Math.cos(a)]);
        const rm = r + te / 2, da = (te / 2) / rm;
        for (let u = 0; u <= Math.PI + 0.01; u += Math.PI / 6) {
          const rr = rm + (te / 2) * Math.cos(u), a = ph + da * Math.sin(u);
          pts.push([cx - s * rr * Math.sin(a), cy + rr * Math.cos(a)]);
        }
      }
      return pts;
    };
    const pts = [[-20, memY], [cx - ro * Math.sin(a0) - 18, memY], ...pod(1)];
    for (let a = ph; a >= -ph; a -= 0.12) pts.push([cx - r * Math.sin(a), cy + r * Math.cos(a)]);
    pts.push(...pod(-1).reverse(), [cx + ro * Math.sin(a0) + 18, memY], [L + 20, memY]);
    return pts;
  }
  // После смыкания псевдоподий: мембрана снова цельная, над пузырьком остаётся бугорок.
  function domePath(cx, cy, ro) {
    const d = memY - cy;
    if (d <= -ro) return [[-20, memY], [L + 20, memY]];
    const a0 = Math.acos(clamp(d / ro, -1, 1));
    const pts = [[-20, memY], [cx - ro * Math.sin(a0) - 18, memY]];
    for (let a = a0; a <= 2 * Math.PI - a0; a += 0.12) pts.push([cx - ro * Math.sin(a), cy + ro * Math.cos(a)]);
    pts.push([cx + ro * Math.sin(a0) + 18, memY], [L + 20, memY]);
    return pts;
  }
  function chaikin(p, it = 2) {
    for (; it--;) {
      const q = [p[0]];
      for (let i = 0; i < p.length - 1; i++) {
        const [x0, y0] = p[i], [x1, y1] = p[i + 1];
        q.push([0.75 * x0 + 0.25 * x1, 0.75 * y0 + 0.25 * y1], [0.25 * x0 + 0.75 * x1, 0.25 * y0 + 0.75 * y1]);
      }
      q.push(p[p.length - 1]); p = q;
    }
    return p;
  }

  function startEndo() {
    parts = []; Object.assign(ves, { phase: 'approach', t: 0, body: null, lyso: null, exo: null, phi: 0,
      food: { x: ves.cx - 70, y: 26, rot: 0.5, a: 1, s: 1 }, note: 'Бактерия приближается к клетке' });
    syncButtons();
  }
  function startExo() {
    parts = []; Object.assign(ves, { phase: 'rise', t: 0, body: null, lyso: null, food: null,
      exo: { y: H + RHO, ring: true, dots: true }, note: 'Пузырёк с секретом движется к мембране' });
    syncButtons();
  }
  function stepVesicle(dt) {
    const v = ves; v.t += dt; v.path = null;
    const go = (phase, note) => { v.phase = phase; v.t = 0; v.note = note; };
    const yTouch = memY - R + 2;
    if (v.phase === 'approach') {
      const k = Math.min(1, v.t / 0.9);
      v.food.x = lerp(v.cx - 70, v.cx, ease(k)); v.food.y = lerp(26, yTouch, ease(k)); v.food.rot = 0.5 * (1 - ease(k));
      if (k === 1) go('bind', 'Бактерия прикрепилась к рецепторам мембраны');
    } else if (v.phase === 'bind') {
      if (v.t > 0.35) go('engulf', 'Мембрана образует выросты — псевдоподии — и окружает бактерию');
    } else if (v.phase === 'engulf') {
      const k = Math.min(1, v.t / 1.9);
      v.cy = v.food.y = lerp(yTouch, memY - R * 0.2, ease(k)); v.phi = Math.PI * Math.pow(k, 0.85);
      v.path = cupPath(v.cx, v.cy, R, T, v.phi);
      if (k === 1) { v.body = { x: v.cx, y: v.cy, r: R, acid: 0 }; go('sink', 'Псевдоподии сомкнулись: пузырёк-фагосома уходит внутрь клетки'); }
    } else if (v.phase === 'sink') {
      const k = Math.min(1, v.t / 1.1);
      v.body.y = v.food.y = lerp(memY - R * 0.2, memY + R + 80, ease(k));
      v.path = domePath(v.cx, v.body.y, R + T);
      if (k === 1) { v.lyso = { x: v.cx + 190, y: H - 20, r: 17 }; go('lyso', 'К фагосоме подходит лизосома с пищеварительными ферментами'); }
    } else if (v.phase === 'lyso') {
      const k = Math.min(1, v.t / 0.9), a = 0.55;
      v.lyso.x = lerp(v.cx + 190, v.body.x + Math.cos(a) * (R + 15), ease(k)); v.lyso.y = lerp(H - 20, v.body.y + Math.sin(a) * (R + 15), ease(k));
      if (k === 1) go('merge', 'Лизосома сливается с фагосомой');
    } else if (v.phase === 'merge') {
      const k = Math.min(1, v.t / 0.45);
      v.lyso.r = 17 * (1 - ease(k)); v.body.acid = ease(k);
      v.lyso.x = lerp(v.lyso.x, v.body.x, k * 0.1); v.lyso.y = lerp(v.lyso.y, v.body.y, k * 0.1);
      if (k === 1) { v.lyso = null; go('digest', 'Ферменты расщепляют бактерию'); }
    } else if (v.phase === 'digest') {
      const k = Math.min(1, v.t / 1.7);
      v.food.a = 1 - ease(k); v.food.s = 1 - 0.35 * k; v.food.frag = k;
      if (k === 1) { v.food = null; go('idle', 'Готово: бактерия переварена, полезные вещества уйдут в цитоплазму'); syncButtons(); seenAll(); }
    } else if (v.phase === 'rise') {
      const k = Math.min(1, v.t / 1);
      v.exo.y = lerp(H + RHO, memY + RHO + 8, ease(k));
      if (k === 1) go('fuse', 'Мембрана пузырька сливается с мембраной клетки');
    } else if (v.phase === 'fuse') {
      const k = Math.min(1, v.t / 1.4);
      v.exo.ring = false; v.exo.y = lerp(memY + RHO * 0.95, memY - RHO, ease(k));
      v.path = cupPath(v.cx, v.exo.y, RHO, 0, 0);
      if (k > 0.3 && v.exo.dots) {
        v.exo.dots = false;
        DOTS.forEach(([dx, dy]) => parts.push({ kind: 'sec', side: -1, v: 46, x: v.cx + dx, y: v.exo.y + dy, vx: dx * 2.2 + rnd(-8, 8), vy: -rnd(42, 70), rot: 0, spin: 0, free: 1.1 }));
        v.note = 'Содержимое пузырька выходит наружу';
      }
      if (k === 1) { v.exo = null; go('idle', 'Готово: секрет снаружи, а мембрана пузырька стала частью мембраны клетки'); syncButtons(); seenAll(); }
    }
  }
  const DOTS = [[-10, -4], [8, -7], [0, 6], [-6, 10], [11, 7], [1, -12], [-13, 5], [5, 13]];

  // ——— рисование ———
  function ribbon(ctx, pts, closed = false, k = 1) {
    ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    if (closed) ctx.closePath();
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.strokeStyle = '#7C4E0E'; ctx.lineWidth = 12 * k; ctx.stroke();
    ctx.strokeStyle = '#F5A524'; ctx.lineWidth = 9.6 * k; ctx.stroke();
    ctx.strokeStyle = '#F8EAC4'; ctx.lineWidth = 3.2 * k; ctx.stroke();
  }
  const circle = (x, y, r) => Array.from({ length: 40 }, (_, i) => [x + Math.cos(i / 40 * 6.283) * r, y + Math.sin(i / 40 * 6.283) * r]);

  function drawMembrane(ctx, t) {
    for (let x = 7.5, i = 0; x < L + 8; x += 15, i++) {
      if (prots.some(p => Math.abs(x - p.x) < p.half + 3)) continue;
      const wob = Math.sin(t * 2.4 + i * 1.9) * 2, dx = Math.sin(t * 1.7 + i * 2.7) * 1.3;
      lipid(ctx, x + dx, memY - 30, 1, wob, 22, 6.2); lipid(ctx, x - dx, memY + 30, -1, wob, 22, 6.2);
    }
  }

  function drawProteins(ctx, t, scale) {
    for (const p of prots) {
      if (p.type === 'carrier') {
        put(ctx, protein('carrierL'), p.x - 10, memY, p.open * 0.17); put(ctx, protein('carrierR'), p.x + 10, memY, -p.open * 0.17);
      } else if (p.type === 'aqua') put(ctx, protein('aqua'), p.x, memY);
      else if (p.type === 'leak') {
        put(ctx, protein(p.ion === 'k' ? 'kChannel' : 'naChannel'), p.x, memY);
        sceneLabel(ctx, p.ion === 'k' ? 'канал для K⁺' : 'канал для Na⁺', clamp(p.x, 62, L - 62), memY + 66, scale, 'center');
      } else if (p.type === 'pump') {
        const pm = pump;
        put(ctx, protein('pumpDomain'), p.x, memY + 62);
        put(ctx, protein('pumpL'), p.x - 20, memY, pm.open * 0.19); put(ctx, protein('pumpR'), p.x + 20, memY, -pm.open * 0.19);
        if (pm.flash > 0) {
          const g = ctx.createRadialGradient(p.x + 24, memY + 70, 0, p.x + 24, memY + 70, 60);
          g.addColorStop(0, `rgba(255,235,150,${pm.flash * 0.9})`); g.addColorStop(1, 'rgba(255,235,150,0)');
          ctx.fillStyle = g; ctx.fillRect(p.x - 40, memY, 130, 140);
        }
        if (pm.P) { put(ctx, mol('pi'), p.x + 24, memY + 70, 0, 1.15 + Math.sin(t * 6) * 0.08); sceneLabel(ctx, 'Ф', p.x + 40, memY + 71, scale); }
        if (pm.atp) { put(ctx, mol('atp'), pm.atp.x + 14, pm.atp.y); sceneLabel(ctx, 'АТФ', pm.atp.x + 36, pm.atp.y, scale); }
        for (const [m, kind, label] of [[pm.adp, 'adp', 'АДФ'], [pm.pi, 'pi', 'Ф']]) if (m) {
          ctx.globalAlpha = clamp(m.a, 0, 1); put(ctx, mol(kind), m.x + 12, m.y); sceneLabel(ctx, label, m.x + 32, m.y, scale); ctx.globalAlpha = 1;
        }
        if (!P.atp && pm.phase === 'na') sceneLabel(ctx, 'нет АТФ — насос стоит', p.x, memY + 108, scale, 'center');
      }
    }
  }

  function drawVesicles(ctx, t, scale) {
    const v = ves;
    ribbon(ctx, chaikin(v.path || [[-20, memY], [L + 20, memY]]));
    sceneLabel(ctx, 'масштаб мельче', L - 14, 20, scale, 'right');
    if (v.body) {
      const b = v.body;
      ribbon(ctx, circle(b.x, b.y, b.r), true);
      if (b.acid) {
        ctx.fillStyle = `rgba(255,95,120,${0.2 * b.acid})`; ctx.beginPath(); ctx.arc(b.x, b.y, b.r - 5, 0, 7); ctx.fill();
        ctx.globalAlpha = b.acid;
        for (let i = 0; i < 12; i++) put(ctx, mol('enz'), b.x + Math.cos(i * 2.4 + t * 0.9) * (12 + (i % 4) * 7), b.y + Math.sin(i * 1.7 + t * 1.1) * (10 + (i % 3) * 8));
        ctx.globalAlpha = 1;
      }
    }
    if (v.lyso && v.lyso.r > 1) {
      const l = v.lyso;
      ctx.fillStyle = 'rgba(255,95,120,.28)'; ctx.beginPath(); ctx.arc(l.x, l.y, l.r, 0, 7); ctx.fill();
      ribbon(ctx, circle(l.x, l.y, l.r), true, 0.8);
      for (let i = 0; i < 6; i++) put(ctx, mol('enz'), l.x + Math.cos(i * 1.05 + t) * l.r * 0.5, l.y + Math.sin(i * 1.05 + t) * l.r * 0.5);
    }
    if (v.food) {
      const f = v.food;
      ctx.save(); ctx.translate(f.x, f.y); ctx.rotate(f.rot); ctx.scale(f.s, f.s); ctx.globalAlpha = f.a;
      ctx.strokeStyle = 'rgba(190,235,140,.8)'; ctx.lineWidth = 1.5; ctx.lineCap = 'round';
      const wave = v.body ? 0.3 : 1;
      for (const off of [-5, 5]) {                    // жгутики
        ctx.beginPath(); ctx.moveTo(-32, off * 0.6);
        for (let s = 0; s <= 22; s += 2) ctx.lineTo(-32 - s * (v.body ? 0.35 : 1), off * 0.6 + Math.sin(s * 0.5 - t * 9 * wave + off) * 3.2 * (s / 22) + off * s / 30);
        ctx.stroke();
      }
      put(ctx, mol('food'), 0, 0);
      ctx.restore(); ctx.globalAlpha = 1;
      if (f.frag) for (let i = 0; i < 10; i++) {      // обломки
        ctx.globalAlpha = Math.min(1, f.frag * 2) * (1 - f.frag * 0.4);
        ctx.fillStyle = '#A9DC6A'; ctx.beginPath();
        ctx.arc(f.x + Math.cos(i * 2.2) * (6 + f.frag * (10 + (i % 4) * 5)), f.y + Math.sin(i * 1.3) * (4 + f.frag * (8 + (i % 3) * 6)), 2.2, 0, 7); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    if (v.exo) {
      if (v.exo.ring) ribbon(ctx, circle(v.cx, v.exo.y, RHO), true);
      if (v.exo.dots) DOTS.forEach(([dx, dy], i) => put(ctx, mol('sec'), v.cx + dx + Math.sin(t * 3 + i) * 1.2, v.exo.y + dy + Math.cos(t * 2.6 + i * 2) * 1.2));
    }
  }

  function draw(ctx, { t, dt, scale }) {
    step(dt);
    backdrop(ctx, L, H, memY, t);
    sceneLabel(ctx, 'Снаружи клетки', 14, 20, scale);
    sceneLabel(ctx, 'Цитоплазма', 14, H - 18, scale);
    if (ves) drawVesicles(ctx, t, scale);
    else { drawMembrane(ctx, t); drawProteins(ctx, t, scale); }
    for (const p of parts) put(ctx, mol(p.kind), p.x, p.y, p.rot);
    if (picked && (picked.t -= dt) > 0 && parts.includes(picked.p)) {
      ctx.strokeStyle = `rgba(255,255,255,${0.55 + Math.sin(t * 8) * 0.3})`; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(picked.p.x, picked.p.y, 13, 0, 7); ctx.stroke();
    }
    if ((draw.tick = (draw.tick || 0) + dt) > 0.25) { draw.tick = 0; updateReadout(); }
  }

  // ——— панель ———
  function updateReadout() {
    let s = '';
    if (mode === 'diffusion' || mode === 'facilitated') {
      const kind = mode === 'diffusion' ? 'o2' : 'glu', out = count(kind, -1), inn = count(kind, 1);
      s = `Снаружи: ${out}, в клетке: ${inn}. `;
      s += mode === 'facilitated' && !P.carriers ? 'Без белков глюкоза не проходит совсем.'
        : Math.abs(out - inn) <= 3 ? 'Концентрации выровнялись: молекулы всё ещё движутся, но поровну в обе стороны.'
        : 'Молекулы идут туда, где их меньше.';
    } else if (mode === 'osmosis') {
      const so = count('suc', -1), si = count('suc', 1);
      s = `Воды в клетке: ${count('h2o', 1)}. ` + (so > si + 1 ? 'Раствор снаружи гипертонический: вода выходит, клетка сморщивается. У растительной клетки так начинается плазмолиз.'
        : so < si - 1 ? 'Раствор снаружи гипотонический: вода входит, клетка набухает. Животная клетка может лопнуть, растительную удержит клеточная стенка.'
        : 'Раствор изотонический: воды входит столько же, сколько выходит.');
    } else if (mode === 'pump') {
      s = `Na⁺: снаружи ${count('na', -1)}, в клетке ${count('na', 1)}. K⁺: снаружи ${count('k', -1)}, в клетке ${count('k', 1)}. Потрачено АТФ: ${pump.used}.`;
    } else if (ves) s = ves.note || 'Выбери процесс.';
    if (readout.textContent !== s) readout.textContent = s;
  }

  function syncButtons() {
    ctl.querySelectorAll('button').forEach(b => { b.disabled = !!ves && ves.phase !== 'idle'; });
  }
  function seenAll() {
    seen.add(mode);
    if (seen.size === MODE_IDS.length) api.emit('done', {});
  }

  const range = (label, key, min, max) =>
    `<label class="range"><span>${label}: <b>${P[key]}</b></span><input type="range" min="${min}" max="${max}" value="${P[key]}" data-key="${key}" aria-label="${label}"></label>`;

  function renderPanel() {
    const m = MODES[mode];
    root.querySelectorAll('.chip').forEach(b => b.setAttribute('aria-pressed', b.dataset.k === mode));
    $('.info h3').textContent = m.title;
    $('.facts').innerHTML = m.facts.map(f => `<li>${f}</li>`).join('');
    $('.about').textContent = m.about;
    $('.legend').innerHTML = m.legend.map(k => `<span><img src="${molIcon(k)}" alt="" style="height:${k === 'food' ? 18 : k === 'atp' ? 12 : 16}px">${NAMES[k]}</span>`).join('');
    $('.try').textContent = m.try;
    ctl.innerHTML = {
      diffusion: range('Кислорода снаружи', 'o2', 4, 40),
      facilitated: range('Белков-переносчиков', 'carriers', 0, 4),
      osmosis: range('Сахара снаружи', 'sugar', 0, 20),
      pump: `<label class="switch"><input type="checkbox" data-key="atp" ${P.atp ? 'checked' : ''}> <span>АТФ в клетке есть</span></label>`,
      vesicle: `<div class="btn-row"><button class="btn" data-act="endo">Запустить фагоцитоз</button><button class="btn" data-act="exo">Запустить экзоцитоз</button></div>`,
    }[mode];
  }

  function setMode(k) { mode = k; showHelp(null); if (k !== 'vesicle') seenAll(); setup(); renderPanel(); updateReadout(); }

  const stage = createStage($('canvas'), {
    logicalH: H, draw, onTap,
    onResize(newL) { L = newL; setup(); if (ves) syncButtons(); },
  });

  $('.chips').addEventListener('click', e => { const b = e.target.closest('.chip'); if (b) setMode(b.dataset.k); });
  ctl.addEventListener('input', e => {
    const key = e.target.dataset.key; if (!key) return;
    if (key === 'atp') { P.atp = e.target.checked; return; }
    P[key] = +e.target.value;
    e.target.closest('.range').querySelector('b').textContent = P[key];
    if (key === 'sugar') {          // сахар меняем на ходу, чтобы было видно реакцию клетки
      const have = count('suc', -1);
      if (P.sugar > have) spawn('suc', -1, P.sugar - have);
      else for (let n = have - P.sugar; n > 0; n--) parts.splice(parts.findIndex(p => p.kind === 'suc' && p.side < 0), 1);
    } else setup();
  });
  ctl.addEventListener('click', e => {
    const act = e.target.dataset.act; if (!act || !ves || ves.phase !== 'idle') return;
    (act === 'endo' ? startEndo : startExo)();
  });
  $('.restart').addEventListener('click', () => { setup(); updateReadout(); syncButtons(); });

  setMode('diffusion');
  return { destroy() { stage.destroy(); root.innerHTML = ''; } };
}
