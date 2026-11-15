import { createStage } from '../../js/core/canvas.js';
import { lipid, protein, put, mol, molIcon, backdrop, sceneLabel } from '../_shared/art.js';
import { GLOSSARY } from '../_shared/glossary.js';

export const meta = { id: 'membrane-lab', title: 'Лаборатория мембраны' };

const SUB = { o2: 'Кислород O₂', co2: 'Углекислый газ CO₂', h2o: 'Вода', glu: 'Глюкоза', na: 'Натрий Na⁺', k: 'Калий K⁺' };
const PROT = {
  glut: { name: 'Переносчик глюкозы', gloss: 'carrier', half: 22, max: 2 },
  naCh: { name: 'Канал для Na⁺', gloss: 'naCh', half: 20, max: 2 },
  kCh: { name: 'Канал для K⁺', gloss: 'kCh', half: 20, max: 2 },
  aqua: { name: 'Аквапорин', gloss: 'aqua', half: 17, max: 2 },
  pump: { name: 'Na⁺/K⁺-насос', gloss: 'pump', half: 36, max: 1 },
};

// Шаги лаборатории. test(S) получает статистику опыта и возвращает true, когда цель достигнута.
const LEVELS = [
  {
    id: 'simple', title: 'Шаг 1. Без белков', subs: ['o2', 'co2', 'h2o', 'glu', 'na'], prots: [],
    intro: 'Перед тобой чистый липидный слой, без единого белка. Добавляй вещества с любой стороны и выясни, что проходит само.',
    goals: [
      { text: 'Кислород прошёл через мембрану', test: S => S.crossed.o2 >= 3 },
      { text: 'Углекислый газ тоже прошёл', test: S => S.crossed.co2 >= 3 },
      { text: 'Глюкоза за 5 секунд не прошла ни разу', test: S => S.age('glu') >= 5 && !S.crossed.glu },
      { text: 'Ион натрия за 5 секунд не прошёл ни разу', test: S => S.age('na') >= 5 && !S.crossed.na },
    ],
    done: 'Вывод: сами через липиды проходят маленькие молекулы без заряда — O₂ и CO₂. Вода просачивается, но медленно. Глюкозе и ионам нужны белки — переходи к шагу 2.',
  },
  {
    id: 'proteins', title: 'Шаг 2. Каналы и переносчики', subs: ['glu', 'na', 'k', 'h2o'], prots: ['glut', 'naCh', 'kCh', 'aqua'],
    intro: 'Теперь у тебя есть белки. Поставь их на мембрану и проведи через неё то, что само не проходит.',
    goals: [
      { text: 'Глюкоза попала на другую сторону', test: S => S.crossed.glu >= 3 },
      { text: 'Na⁺ прошёл через свой канал', test: S => S.crossed.na >= 3 },
      { text: 'K⁺ прошёл через свой канал', test: S => S.crossed.k >= 3 },
      { text: 'Ион попробовал пройти в чужой канал — и не прошёл', test: S => S.rejected >= 3 },
      { text: 'Глюкозы стало поровну с обеих сторон', test: S => S.crossed.glu >= 6 && S.n('glu', -1) + S.n('glu', 1) >= 8 && Math.abs(S.n('glu', -1) - S.n('glu', 1)) <= 2 },
    ],
    done: 'Вывод: у каждого вещества свой белок. Перенос идёт по градиенту и без АТФ, а когда концентрации выравниваются, общий поток прекращается. Создать разницу концентраций так нельзя — для этого нужен насос.',
  },
  {
    id: 'active', title: 'Шаг 3. Насос', subs: ['na', 'k'], prots: ['pump', 'naCh', 'kCh'], atp: true, preset: { na: [8, 8], k: [8, 8] },
    intro: 'Натрия и калия поровну с обеих сторон. Сделай так, чтобы натрия стало больше снаружи, а калия — внутри, как в живой клетке.',
    goals: [
      { text: 'Насос потратил 3 молекулы АТФ', test: S => S.pumpUsed >= 3 },
      { text: 'Na⁺ снаружи вдвое больше, чем в клетке', test: S => S.n('na', -1) >= 10 && S.n('na', -1) >= 2 * S.n('na', 1) },
      { text: 'K⁺ в клетке вдвое больше, чем снаружи', test: S => S.n('k', 1) >= 10 && S.n('k', 1) >= 2 * S.n('k', -1) },
      { text: 'Выключи АТФ и поставь каналы: разница исчезла', test: S => S.goal(1) && !S.atp && S.hasProt('naCh') && Math.abs(S.n('na', -1) - S.n('na', 1)) <= 3 },
    ],
    done: 'Вывод: только активный транспорт создаёт и удерживает разницу концентраций — и платит за это АТФ. Без АТФ ионы через каналы возвращаются к равновесию.',
  },
  {
    id: 'free', title: 'Свободный режим', subs: ['o2', 'co2', 'h2o', 'glu', 'na', 'k'], prots: ['glut', 'naCh', 'kCh', 'aqua', 'pump'], atp: true,
    intro: 'Здесь доступно всё сразу. Собери свою мембрану и проверь любую догадку.', goals: [], done: '',
  },
];

const H = 380, EDGE = 38, MEM = 190, MAX_SIDE = 28, STEP = 4;
const SPEED = { h2o: 135, o2: 95, co2: 95 };
const rnd = (a, b) => a + Math.random() * (b - a);
const ease = k => k * k * (3 - 2 * k);
const lerp = (a, b, k) => a + (b - a) * k;

export function mount(root, api) {
  root.innerHTML = `
    <div class="sim">
      <div class="chips sim-modes" role="group" aria-label="Шаг лаборатории">
        ${LEVELS.map((l, i) => `<button class="chip" data-i="${i}" aria-pressed="false">${l.title}</button>`).join('')}
      </div>
      <div class="sim-stage"><canvas aria-label="Конструктор мембраны: вещества и белки"></canvas></div>
      <div class="sim-panel">
        <div class="help" hidden></div>
        <div class="info goals"><p class="lab-intro"></p><ul class="goal-list"></ul><p class="lab-done" hidden></p></div>
        <div class="controls">
          <p class="group-title">Вещества</p>
          <div class="lab-subs"></div>
          <p class="group-title prot-title">Белки на мембране</p>
          <div class="chips lab-prots"></div>
          <label class="switch lab-atp"><input type="checkbox" checked> <span>АТФ в клетке есть</span></label>
        </div>
        <button class="btn ghost restart">Очистить опыт</button>
      </div>
    </div>`;
  const $ = s => root.querySelector(s);
  const help = $('.help'), goalList = $('.goal-list'), doneEl = $('.lab-done');

  let level = LEVELS[0], L = 600, parts = [], prots = [], picked = null, helpProt = null, atp = true, now = 0;
  let stats, goalDone = [];
  const finished = new Set();

  const n = (kind, side) => parts.reduce((c, p) => c + (p.kind === kind && p.side === side && !p.cross && !p.bound ? 1 : 0), 0);
  const S = {
    get crossed() { return stats.crossed; }, get rejected() { return stats.rejected; }, get atp() { return atp; },
    get pumpUsed() { return prots.find(p => p.type === 'pump')?.used || 0; },
    age: kind => (stats.first[kind] != null && parts.some(p => p.kind === kind) ? now - stats.first[kind] : 0),
    n, goal: i => goalDone[i], hasProt: type => prots.some(p => p.type === type),
  };

  function spawn(kind, side, count) {
    for (let i = 0; i < count; i++) {
      const a = rnd(0, 6.28), v = SPEED[kind] || 82, ion = kind === 'na' || kind === 'k';
      parts.push({ kind, side, v, x: rnd(12, L - 12), y: side < 0 ? rnd(14, MEM - EDGE - 8) : rnd(MEM + EDGE + 8, H - 14),
        vx: Math.cos(a) * v, vy: Math.sin(a) * v, rot: ion ? 0 : rnd(0, 6.28), spin: ion ? 0 : rnd(-2, 2) });
    }
    stats.first[kind] ??= now;
  }
  function reset() {
    parts = []; prots = []; picked = null; helpProt = null; goalDone = level.goals.map(() => false);
    stats = { crossed: {}, rejected: 0, first: {} };
    for (const [kind, [out, inn]] of Object.entries(level.preset || {})) { spawn(kind, -1, out); spawn(kind, 1, inn); }
  }

  // ——— белки ———
  function layout() { prots.forEach((p, i) => { p.tx = L * (i + 1) / (prots.length + 1); }); }
  function addProt(type) {
    const def = PROT[type];
    if (prots.length >= 5 || prots.filter(p => p.type === type).length >= def.max) return;
    const p = { type, half: def.half, a: 0, flash: 0 };
    if (type === 'glut') Object.assign(p, { open: -1, phase: 'idle', idle: 0.3, bound: null });
    if (type === 'pump') Object.assign(p, { open: 1, phase: 'na', timer: 0, bound: [], used: 0, target: 1, next: '', P: false, mAtp: null, adp: null, pi: null, glow: 0 });
    prots.push(p); layout(); p.x = p.tx; syncPalette();
  }
  function removeProt(p) {
    if (p.type === 'glut' && p.bound) p.bound.bound = false;
    if (p.type === 'pump') p.bound.forEach(q => { q.bound = false; });
    prots.splice(prots.indexOf(p), 1); layout(); syncPalette();
  }

  // ——— правила: что и где проходит ———
  function tryCross(p) {
    const at = (type, w) => prots.find(c => c.type === type && Math.abs(p.x - c.x) < w);
    const under = prots.some(c => Math.abs(p.x - c.x) < c.half);
    if (p.kind === 'o2' || p.kind === 'co2') return !under && Math.random() < 0.4 ? 'cross' : false;
    if (p.kind === 'h2o') {
      const aq = at('aqua', 16);
      if (aq) { p.x = aq.x; return 'cross'; }
      return !under && Math.random() < 0.05 ? 'cross' : false;
    }
    if (p.kind === 'glu') {
      const c = prots.find(c => c.type === 'glut' && c.phase === 'idle' && !c.bound && c.open === p.side && Math.abs(p.x - c.x) < 24);
      if (!c) return false;
      c.bound = p; c.phase = 'hold'; c.timer = 0.1; p.bound = true; return 'bound';
    }
    const own = at(p.kind === 'na' ? 'naCh' : 'kCh', 15);
    if (own) { p.x = own.x; return 'cross'; }
    const other = at(p.kind === 'na' ? 'kCh' : 'naCh', 15);
    if (other) { stats.rejected++; other.flash = 0.6; }
    return false;
  }
  const LURE = { glu: 'glut', na: 'naCh', k: 'kCh', h2o: 'aqua' };
  function lure(p) {
    const type = LURE[p.kind]; if (!type) return null;
    let best = null, bd = 100;
    for (const c of prots) {
      if (c.type !== type) continue;
      const d = Math.abs(c.x - p.x); if (d < bd) { bd = d; best = c; }
    }
    return best;
  }
  const crossed = kind => { stats.crossed[kind] = (stats.crossed[kind] || 0) + 1; };

  function step(dt) {
    now += dt;
    for (const p of parts) {
      p.rot += p.spin * dt;
      if (p.bound) { p.x += (p.tx - p.x) * Math.min(1, dt * 9); p.y += (p.ty - p.y) * Math.min(1, dt * 9); continue; }
      if (p.cross) {
        p.y += -p.side * 130 * dt;
        if (p.side < 0 ? p.y > MEM + EDGE : p.y < MEM - EDGE) { p.side = -p.side; p.cross = false; p.vy = p.side * p.v * 0.8; crossed(p.kind); }
        continue;
      }
      p.vx += rnd(-1, 1) * 170 * dt; p.vy += rnd(-1, 1) * 170 * dt;
      const c = lure(p);                // рядом со «своим» белком частицу затягивает к его входу
      if (c && Math.abs(p.y - (MEM + p.side * EDGE)) < 95) { p.vx += Math.max(-1, Math.min(1, (c.x - p.x) / 40)) * 560 * dt; p.vy += -p.side * 280 * dt; }
      const v = Math.hypot(p.vx, p.vy) || 1; p.vx *= p.v / v; p.vy *= p.v / v;
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.x < 8) { p.x = 8; p.vx = Math.abs(p.vx); }
      if (p.x > L - 8) { p.x = L - 8; p.vx = -Math.abs(p.vx); }
      if (p.y < 10) { p.y = 10; p.vy = Math.abs(p.vy); }
      if (p.y > H - 10) { p.y = H - 10; p.vy = -Math.abs(p.vy); }
      const wall = MEM + p.side * EDGE;
      if (p.side < 0 ? p.y > wall : p.y < wall) {
        const r = tryCross(p);
        if (r === 'cross') { p.cross = true; p.y = wall; }
        else if (!r) { p.y = wall; p.vy = p.side * Math.abs(p.vy); }
      }
    }
    for (const c of prots) {
      c.x += (c.tx - c.x) * Math.min(1, dt * 7); c.a = Math.min(1, c.a + dt * 4); c.flash = Math.max(0, c.flash - dt);
      if (c.type === 'glut') stepCarrier(c, dt);
      if (c.type === 'pump') stepPump(c, dt);
    }
  }

  function stepCarrier(c, dt) {
    if (c.bound) { c.bound.tx = c.x; c.bound.ty = MEM + c.open * 12; }
    if (c.phase === 'hold') { if ((c.timer -= dt) <= 0) { c.phase = 'flip'; c.target = -c.open; } }
    else if (c.phase === 'idle' && !c.bound) {
      // пустой переносчик быстро разворачивается, если с его стороны никто не ждёт
      const waiting = parts.some(q => q.kind === 'glu' && q.side === c.open && !q.bound && !q.cross && Math.abs(q.x - c.x) < 60 && Math.abs(q.y - (MEM + q.side * EDGE)) < 70);
      if ((c.idle -= dt * (waiting ? 1 : 6)) <= 0) { c.phase = 'flip'; c.target = -c.open; }
    }
    else if (c.phase === 'flip') {
      c.open += Math.sign(c.target - c.open) * dt * 7;
      if (Math.abs(c.target - c.open) < 0.2) {
        c.open = c.target; c.phase = 'idle'; c.idle = rnd(0.9, 1.4);
        const p = c.bound;
        if (p) { c.bound = null; p.bound = false; p.side = c.open; p.y = MEM + p.side * (EDGE + 3); p.vy = p.side * p.v; p.vx = rnd(-25, 25); crossed('glu'); }
      }
    }
  }

  function stepPump(pm, dt) {
    const sites = need => pm.bound.forEach((p, i) => { p.tx = pm.x + (i - (need - 1) / 2) * 10.5; p.ty = MEM + pm.open * 16; });
    const bind = (kind, side, need) => {
      if (pm.bound.length < need) {
        const free = parts.filter(p => p.kind === kind && p.side === side && !p.bound && !p.cross);
        if (free.length) {
          const p = free.reduce((a, b) => (Math.hypot(b.x - pm.x, b.y - MEM) < Math.hypot(a.x - pm.x, a.y - MEM) ? b : a));
          p.bound = true; pm.bound.push(p);
        }
      }
      sites(need);
      return pm.bound.length === need && pm.bound.every(p => Math.hypot(p.x - p.tx, p.y - p.ty) < 3);
    };
    const release = side => {
      pm.bound.forEach(p => { p.bound = false; p.side = side; p.y = MEM + side * (EDGE + 4); p.vy = side * p.v; p.vx = rnd(-30, 30); });
      pm.bound = [];
    };
    const site = { x: pm.x + 24, y: MEM + 70 };
    if (pm.phase === 'na') { if (bind('na', 1, 3) && atp) { pm.phase = 'atpIn'; pm.timer = 0; } }
    else if (pm.phase === 'atpIn') {
      const k = Math.min(1, (pm.timer += dt) / 0.45); sites(3);
      pm.mAtp = { x: lerp(pm.x + 110, site.x + 12, ease(k)), y: lerp(MEM + 160, site.y + 8, ease(k)) };
      if (k === 1) { pm.phase = 'hydro'; pm.timer = 0.15; pm.glow = 1; }
    } else if (pm.phase === 'hydro') {
      sites(3);
      if ((pm.timer -= dt) <= 0) { pm.P = true; pm.used++; pm.adp = { x: pm.mAtp.x, y: pm.mAtp.y + 6, a: 1 }; pm.mAtp = null; pm.phase = 'flip'; pm.target = -1; pm.next = 'relNa'; }
    } else if (pm.phase === 'flip') {
      pm.open += Math.sign(pm.target - pm.open) * dt * 5; sites(pm.bound.length);
      if (Math.abs(pm.target - pm.open) < 0.15) { pm.open = pm.target; pm.phase = pm.next; }
    } else if (pm.phase === 'relNa') { release(-1); pm.phase = 'k'; }
    else if (pm.phase === 'k') { if (bind('k', -1, 2)) { pm.P = false; pm.pi = { x: site.x, y: site.y, a: 1 }; pm.phase = 'flip'; pm.target = 1; pm.next = 'relK'; } }
    else if (pm.phase === 'relK') { release(1); pm.phase = 'na'; }
    for (const m of [pm.adp, pm.pi]) if (m) { m.x += 16 * dt; m.y += 26 * dt; m.a -= dt * 0.9; }
    if (pm.adp?.a <= 0) pm.adp = null;
    if (pm.pi?.a <= 0) pm.pi = null;
    pm.glow = Math.max(0, pm.glow - dt * 2.2);
  }

  // ——— рисование ———
  function draw(ctx, { t, dt, scale }) {
    step(dt);
    backdrop(ctx, L, H, MEM, t);
    sceneLabel(ctx, 'Снаружи клетки', 14, 20, scale);
    sceneLabel(ctx, 'Цитоплазма', 14, H - 18, scale);
    for (let x = 7.5, i = 0; x < L + 8; x += 15, i++) {
      if (prots.some(p => Math.abs(x - p.x) < p.half + 3)) continue;
      const wob = Math.sin(t * 2.4 + i * 1.9) * 2, dx = Math.sin(t * 1.7 + i * 2.7) * 1.3;
      lipid(ctx, x + dx, MEM - 30, 1, wob, 22, 6.2); lipid(ctx, x - dx, MEM + 30, -1, wob, 22, 6.2);
    }
    for (const p of prots) {
      ctx.globalAlpha = p.a;
      if (p.type === 'glut') { put(ctx, protein('carrierL'), p.x - 10, MEM, p.open * 0.17); put(ctx, protein('carrierR'), p.x + 10, MEM, -p.open * 0.17); }
      else if (p.type === 'aqua') put(ctx, protein('aqua'), p.x, MEM);
      else if (p.type === 'naCh' || p.type === 'kCh') {
        put(ctx, protein(p.type === 'kCh' ? 'kChannel' : 'naChannel'), p.x, MEM);
        if (p.flash > 0) {
          ctx.strokeStyle = `rgba(255,90,110,${p.flash * 1.6})`; ctx.lineWidth = 3; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(p.x - 9, MEM - 9); ctx.lineTo(p.x + 9, MEM + 9); ctx.moveTo(p.x + 9, MEM - 9); ctx.lineTo(p.x - 9, MEM + 9); ctx.stroke();
        }
      } else if (p.type === 'pump') {
        put(ctx, protein('pumpDomain'), p.x, MEM + 62);
        put(ctx, protein('pumpL'), p.x - 20, MEM, p.open * 0.19); put(ctx, protein('pumpR'), p.x + 20, MEM, -p.open * 0.19);
        if (p.glow > 0) {
          const g = ctx.createRadialGradient(p.x + 24, MEM + 70, 0, p.x + 24, MEM + 70, 60);
          g.addColorStop(0, `rgba(255,235,150,${p.glow * 0.9})`); g.addColorStop(1, 'rgba(255,235,150,0)');
          ctx.fillStyle = g; ctx.fillRect(p.x - 40, MEM, 130, 140);
        }
        if (p.P) { put(ctx, mol('pi'), p.x + 24, MEM + 70, 0, 1.15 + Math.sin(t * 6) * 0.08); sceneLabel(ctx, 'Ф', p.x + 40, MEM + 71, scale); }
        if (p.mAtp) { put(ctx, mol('atp'), p.mAtp.x + 14, p.mAtp.y); sceneLabel(ctx, 'АТФ', p.mAtp.x + 36, p.mAtp.y, scale); }
        for (const [m, kind, label] of [[p.adp, 'adp', 'АДФ'], [p.pi, 'pi', 'Ф']]) if (m) {
          ctx.globalAlpha = Math.max(0, Math.min(1, m.a)); put(ctx, mol(kind), m.x + 12, m.y); sceneLabel(ctx, label, m.x + 32, m.y, scale); ctx.globalAlpha = p.a;
        }
        if (!atp && p.phase === 'na') sceneLabel(ctx, 'нет АТФ — насос стоит', p.x, MEM + 108, scale, 'center');
      }
      if (p === helpProt) {
        ctx.strokeStyle = `rgba(255,255,255,${0.5 + Math.sin(t * 6) * 0.25})`; ctx.lineWidth = 2; ctx.setLineDash([5, 5]);
        ctx.strokeRect(p.x - p.half - 4, MEM - 58, p.half * 2 + 8, 116); ctx.setLineDash([]);
      }
    }
    ctx.globalAlpha = 1;
    for (const p of parts) put(ctx, mol(p.kind), p.x, p.y, p.rot);
    if (picked && (picked.t -= dt) > 0 && parts.includes(picked.p)) {
      ctx.strokeStyle = `rgba(255,255,255,${0.55 + Math.sin(t * 8) * 0.3})`; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(picked.p.x, picked.p.y, 13, 0, 7); ctx.stroke();
    }
    if (!parts.length && !prots.length) sceneLabel(ctx, 'Добавь вещество кнопкой «+» под моделью', L / 2, MEM - 80, scale, 'center');
    if ((draw.tick = (draw.tick || 0) + dt) > 0.2) { draw.tick = 0; tick(); }
  }

  // ——— панель ———
  function showHelp(key, prot = null) {
    const g = GLOSSARY[key]; helpProt = prot;
    help.hidden = !g; if (!g) { picked = null; return; }
    help.innerHTML = `<button class="help-close" aria-label="Закрыть справку">×</button><b>${g.t}</b><p>${g.d}</p>${prot ? '<button class="btn ghost" data-remove>Убрать с мембраны</button>' : ''}`;
  }
  function onTap(x, y) {
    let best = null, bd = 17;
    for (const p of parts) { const d = Math.hypot(p.x - x, p.y - y); if (d < bd) { bd = d; best = p; } }
    if (best) { picked = { p: best, t: 4 }; return showHelp(best.kind); }
    picked = null;
    const pr = prots.find(p => Math.abs(x - p.x) < p.half + 4 && y > MEM - 60 && y < MEM + (p.type === 'pump' ? 90 : 60));
    if (pr) return showHelp(PROT[pr.type].gloss, pr);
    showHelp(Math.abs(y - MEM) < EDGE ? 'bilayer' : null);
  }

  function tick() {
    root.querySelectorAll('.sub').forEach(row => {
      row.querySelectorAll('[data-n]').forEach(b => { b.textContent = n(row.dataset.kind, +b.dataset.n); });
    });
    let changed = false;
    level.goals.forEach((g, i) => { if (!goalDone[i] && g.test(S)) { goalDone[i] = true; changed = true; } });
    if (changed) renderGoals();
  }
  function renderGoals() {
    goalList.innerHTML = level.goals.map((g, i) => `<li class="${goalDone[i] ? 'done' : ''}">${g.text}</li>`).join('');
    const all = level.goals.length > 0 && goalDone.every(Boolean);
    doneEl.hidden = !all; doneEl.textContent = level.done;
    if (all && !finished.has(level.id)) { finished.add(level.id); if (finished.size === 3) api.emit('done', {}); }
  }
  function syncPalette() {
    root.querySelectorAll('.lab-prots .chip').forEach(b => {
      const have = prots.filter(p => p.type === b.dataset.type).length;
      b.disabled = prots.length >= 5 || have >= PROT[b.dataset.type].max;
    });
  }
  function renderLevel() {
    root.querySelectorAll('.sim-modes .chip').forEach(b => b.setAttribute('aria-pressed', LEVELS[+b.dataset.i] === level));
    $('.lab-intro').textContent = level.intro;
    $('.lab-subs').innerHTML = level.subs.map(k => `
      <div class="sub" data-kind="${k}">
        <span class="sub-name"><img src="${molIcon(k)}" alt="" style="height:15px">${SUB[k]}</span>
        ${[[-1, 'снаружи'], [1, 'в клетке']].map(([side, label]) => `<span class="stepper"><span class="lbl">${label}</span>
          <button data-side="${side}" data-d="-1" aria-label="Убрать ${label}: ${SUB[k]}">−</button><b data-n="${side}">0</b><button data-side="${side}" data-d="1" aria-label="Добавить ${label}: ${SUB[k]}">+</button></span>`).join('')}
      </div>`).join('');
    $('.prot-title').hidden = $('.lab-prots').hidden = !level.prots.length;
    $('.lab-prots').innerHTML = level.prots.map(t => `<button class="chip" data-type="${t}">+ ${PROT[t].name}</button>`).join('');
    $('.lab-atp').hidden = !level.atp; $('.lab-atp input').checked = atp = true;
    showHelp(null); renderGoals(); syncPalette(); tick();
  }
  function setLevel(i) { level = LEVELS[i]; reset(); renderLevel(); }

  const stage = createStage($('canvas'), { logicalH: H, draw, onTap, onResize(newL) { L = newL; layout(); } });

  $('.sim-modes').addEventListener('click', e => { const b = e.target.closest('.chip'); if (b) setLevel(+b.dataset.i); });
  $('.lab-subs').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    const kind = b.closest('.sub').dataset.kind, side = +b.dataset.side;
    if (+b.dataset.d > 0) spawn(kind, side, Math.min(STEP, MAX_SIDE - n(kind, side)));
    else for (let i = 0; i < STEP; i++) { const j = parts.findIndex(p => p.kind === kind && p.side === side && !p.cross && !p.bound); if (j >= 0) parts.splice(j, 1); }
    tick();
  });
  $('.lab-prots').addEventListener('click', e => { const b = e.target.closest('.chip'); if (b) addProt(b.dataset.type); });
  $('.lab-atp input').addEventListener('change', e => { atp = e.target.checked; });
  help.addEventListener('click', e => {
    if (e.target.closest('[data-remove]') && helpProt) { removeProt(helpProt); showHelp(null); }
    else if (e.target.closest('.help-close')) showHelp(null);
  });
  $('.restart').addEventListener('click', () => { reset(); renderLevel(); });

  stats = { crossed: {}, rejected: 0, first: {} };
  setLevel(0);
  return { destroy() { stage.destroy(); root.innerHTML = ''; } };
}
