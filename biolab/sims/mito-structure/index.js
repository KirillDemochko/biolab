import { createStage } from '../../js/core/canvas.js';
import { ribbon, chaikin, cytoplasm, mol, molIcon, put, ball, sceneLabel } from '../_shared/art.js';

export const meta = { id: 'mito-structure', title: 'Строение митохондрии' };

const PARTS = {
  outer: { name: 'Наружная мембрана', color: '#F5A524', text: 'Гладкая, отделяет митохондрию от цитоплазмы. В ней много белков-пор, поэтому мелкие молекулы и ионы проходят через неё свободно.' },
  ims: { name: 'Межмембранное пространство', color: '#6B3A6E', text: 'Узкая щель между двумя мембранами, она же продолжается внутрь крист. Сюда дыхательная цепь перекачивает протоны H⁺ — так создаётся запас энергии для синтеза АТФ.' },
  inner: { name: 'Внутренняя мембрана', color: '#F8D27A', text: 'Пропускает вещества очень избирательно: даже протоны сами через неё не проходят. В неё встроены белки дыхательной цепи и АТФ-синтаза.' },
  crista: { name: 'Кристы', color: '#F2B441', text: 'Складки внутренней мембраны. Они во много раз увеличивают её площадь, а значит, и число ферментов, которые синтезируют АТФ. Чем больше энергии нужно клетке, тем больше в её митохондриях крист.' },
  matrix: { name: 'Матрикс', color: '#D9603F', text: 'Внутреннее содержимое митохондрии. Здесь идёт цикл Кребса, находятся собственная ДНК, рибосомы и множество ферментов.' },
  dna: { name: 'Кольцевая ДНК', color: '#8FD3FF', text: 'Собственная ДНК митохондрии, замкнутая в кольцо, как у бактерий. Кодирует часть митохондриальных белков и передаётся потомкам от матери. Одно из доказательств того, что предки митохондрий были свободноживущими бактериями.' },
  ribo: { name: 'Рибосомы', color: '#F3D9B1', text: 'Мельче, чем рибосомы в цитоплазме: они такого же типа, как у бактерий (70S). Синтезируют часть белков самой митохондрии, поэтому её называют полуавтономным органоидом.' },
  atpsyn: { name: 'АТФ-синтаза', color: '#FFD166', text: 'Фермент на кристах, под микроскопом похож на грибок на ножке. Протоны проходят через него обратно в матрикс и вращают его, а он собирает АТФ из АДФ и фосфата. Как это происходит — в разделе «Дыхательная цепь».' },
};
const ORDER = ['outer', 'ims', 'inner', 'crista', 'matrix', 'dna', 'ribo', 'atpsyn'];

const QUEST = [
  { q: 'Где идёт цикл Кребса?', a: ['matrix'] },
  { q: 'Что увеличивает площадь внутренней мембраны?', a: ['crista'] },
  { q: 'Какая из двух мембран гладкая?', a: ['outer'] },
  { q: 'Куда дыхательная цепь перекачивает протоны?', a: ['ims', 'crista'] },
  { q: 'Что роднит митохондрию с бактериями?', a: ['dna', 'ribo'] },
  { q: 'Где синтезируются собственные белки митохондрии?', a: ['ribo'] },
  { q: 'Какой фермент собирает АТФ?', a: ['atpsyn'] },
];

const H = 360, CY = 178, B = 112, GAP = 13, RB = B - GAP, FW = 8;
const rand = (seed => () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296)(42);

export function mount(root, api) {
  root.innerHTML = `
    <div class="sim">
      <div class="chips sim-modes" role="group" aria-label="Части митохондрии">
        ${ORDER.map(k => `<button class="chip" data-k="${k}" aria-pressed="false"><i class="dot" style="background:${PARTS[k].color}"></i>${PARTS[k].name}</button>`).join('')}
      </div>
      <div class="sim-stage"><canvas aria-label="Митохондрия в разрезе"></canvas></div>
      <div class="sim-panel">
        <div class="info" aria-live="polite"></div>
        <div class="controls">
          <div class="legend">
            <span><img src="${molIcon('o2')}" alt="" style="height:12px">кислород входит</span>
            <span><img src="${molIcon('co2')}" alt="" style="height:12px">углекислый газ выходит</span>
            <span><img src="${molIcon('atp')}" alt="" style="height:12px">АТФ уходит в клетку</span>
          </div>
        </div>
        <button class="btn quest-btn">Сыграть: найди на модели</button>
      </div>
    </div>`;
  const $ = s => root.querySelector(s);
  const info = $('.info'), chips = $('.chips'), questBtn = $('.quest-btn');

  let sel = null, G = null, quest = null, flash = null, flows = [];

  function build(L) {
    const cx = L / 2, a = Math.min(L * 0.46, 330), ai = a - GAP;
    const xL = cx - ai + RB, xR = cx + ai - RB, x0 = xL - 6, x1 = xR + 6;
    const count = Math.max(4, Math.round((x1 - x0) / 44)), cristae = [];
    const depths = [0.66, 0.58, 0.72, 0.6, 0.69, 0.55];
    for (let i = 0; i < count; i++) {
      const x = x0 + (x1 - x0) * (i + 0.5) / count;
      cristae.push({ x, top: i % 2 === 0, depth: 2 * RB * depths[i % 6], ph: i * 1.7, sway: 0 });
    }
    // ДНК — под кончиком верхней кристы и над кончиком нижней
    const tops = cristae.filter(c => c.top), bots = cristae.filter(c => !c.top);
    const d1 = tops[Math.min(1, tops.length - 1)], d2 = bots[Math.max(0, bots.length - 2)];
    const dna = [{ x: d1.x, y: CY - RB + d1.depth + 27 }, { x: d2.x, y: CY + RB - d2.depth - 27 }];
    G = { L, cx, a, ai, xL, xR, cristae, dna, ribo: [] };
    for (let i = 0; i < 400 && G.ribo.length < 26; i++) {
      const x = cx + (rand() * 2 - 1) * ai, y = CY + (rand() * 2 - 1) * RB;
      if (sd(x, y, ai, RB) > -10 || fingerDist(x, y) < 13 || dna.some(d => Math.hypot(d.x - x, d.y - y) < 22)) continue;
      G.ribo.push({ x, y, ph: rand() * 6.28 });
    }
    flows = [];
  }

  // расстояние до капсулы (отрицательное — внутри)
  const sd = (x, y, half, r) => Math.hypot(Math.max(Math.abs(x - G.cx) - (half - r), 0), y - CY) - r;
  // расстояние до ближайшей кристы (отрицательное — внутри неё)
  function fingerDist(x, y) {
    let best = 1e9;
    for (const c of G.cristae) {
      const dir = c.top ? 1 : -1, ax = c.x, ay = c.top ? CY - RB : CY + RB, bx = c.x + c.sway, by = ay + dir * (c.depth - FW);
      const k = Math.max(0, Math.min(1, ((x - ax) * (bx - ax) + (y - ay) * (by - ay)) / ((bx - ax) ** 2 + (by - ay) ** 2)));
      best = Math.min(best, Math.hypot(x - (ax + (bx - ax) * k), y - (ay + (by - ay) * k)) - FW);
    }
    return best;
  }

  function innerPath(t) {
    const { xL, xR, cristae } = G, yT = CY - RB, yB = CY + RB, pts = [[xL, yT]];
    const finger = (c, dir) => {
      c.sway = Math.sin(t * 0.5 + c.ph) * 3.5;
      const y0 = dir > 0 ? yT : yB, tip = y0 + dir * c.depth, s = dir;      // s: +1 идём слева направо, −1 справа налево
      pts.push([c.x - s * FW, y0], [c.x - s * FW + c.sway * 0.5, y0 + dir * c.depth * 0.5], [c.x - s * FW + c.sway, tip - dir * FW]);
      for (const deg of [150, 120, 90, 60, 30]) {
        const a = deg * Math.PI / 180;
        pts.push([c.x + c.sway + s * FW * Math.cos(a), tip - dir * FW + dir * FW * Math.sin(a)]);
      }
      pts.push([c.x + s * FW + c.sway, tip - dir * FW], [c.x + s * FW + c.sway * 0.5, y0 + dir * c.depth * 0.5], [c.x + s * FW, y0]);
    };
    cristae.filter(c => c.top).forEach(c => finger(c, 1));
    pts.push([xR, yT]);
    for (let d = -70; d <= 70; d += 20) pts.push([xR + RB * Math.cos(d * Math.PI / 180), CY + RB * Math.sin(d * Math.PI / 180)]);
    pts.push([xR, yB]);
    cristae.filter(c => !c.top).reverse().forEach(c => finger(c, -1));
    pts.push([xL, yB]);
    for (let d = 110; d <= 250; d += 20) pts.push([xL + RB * Math.cos(d * Math.PI / 180), CY + RB * Math.sin(d * Math.PI / 180)]);
    return chaikin(pts, 2, true);
  }
  const capsule = (half, r) => {
    const pts = [], { cx } = G;
    for (let d = -90; d <= 90; d += 10) pts.push([cx + half - r + r * Math.cos(d * Math.PI / 180), CY + r * Math.sin(d * Math.PI / 180)]);
    for (let d = 90; d <= 270; d += 10) pts.push([cx - half + r + r * Math.cos(d * Math.PI / 180), CY + r * Math.sin(d * Math.PI / 180)]);
    return pts;
  };
  const trace = (ctx, pts) => { ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); };

  // ——— потоки веществ: O₂ внутрь, CO₂ и АТФ наружу ———
  function spawnFlow() {
    const { cx, a, ai } = G, kind = ['o2', 'co2', 'atp'][Math.floor(Math.random() * 3)];
    const ang = Math.random() * 6.28, inside = [cx + (Math.random() * 2 - 1) * (ai - RB), CY + (Math.random() * 2 - 1) * RB * 0.6];
    const out = [cx + Math.cos(ang) * (a + 60), CY + Math.sin(ang) * (B + 70)];
    flows.push({ kind, k: 0, from: kind === 'o2' ? out : inside, to: kind === 'o2' ? inside : out, rot: Math.random() * 6 });
  }

  function draw(ctx, { L, t, dt, scale }) {
    if (!G) return;
    const hi = flash?.type ?? sel, pulse = 0.5 + Math.sin(t * 5) * 0.25;
    cytoplasm(ctx, L, H, t);
    const outer = capsule(G.a, B), inner = innerPath(t);

    ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.beginPath(); ctx.ellipse(G.cx, CY + B + 14, G.a * 0.9, 12, 0, 0, 7); ctx.fill();
    trace(ctx, outer); ctx.fillStyle = '#4A2550'; ctx.fill();
    if (hi === 'ims') { ctx.fillStyle = `rgba(255,255,255,${pulse * 0.45})`; ctx.fill(); }
    ribbon(ctx, outer, true);

    trace(ctx, inner);
    const mg = ctx.createRadialGradient(G.cx - G.a * 0.3, CY - 50, 10, G.cx, CY, G.a);
    mg.addColorStop(0, '#F08A55'); mg.addColorStop(0.55, '#C9533F'); mg.addColorStop(1, '#8A3142');
    ctx.fillStyle = mg; ctx.fill();
    if (hi === 'matrix') { ctx.fillStyle = `rgba(255,255,255,${pulse * 0.4})`; ctx.fill(); }
    ribbon(ctx, inner, true, 0.72);

    // АТФ-синтазы на стенках крист: ножка и головка смотрят в матрикс
    ctx.shadowColor = '#fff'; ctx.shadowBlur = hi === 'atpsyn' ? 10 * pulse + 4 : 0;
    for (const c of G.cristae) {
      const dir = c.top ? 1 : -1, y0 = c.top ? CY - RB : CY + RB;
      for (let s = 20; s < c.depth - 6; s += 14) for (const side of [-1, 1]) {
        const x = c.x + c.sway * s / c.depth + side * (FW + 4), y = y0 + dir * s;
        ctx.strokeStyle = '#B8793A'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + side * 5, y); ctx.stroke();
        ball(ctx, x + side * 7.5, y, 3.4, '#FFD166');
      }
    }
    ctx.shadowBlur = hi === 'ribo' ? 10 * pulse + 4 : 0;
    for (const r of G.ribo) {
      const x = r.x + Math.sin(t * 0.7 + r.ph) * 2, y = r.y + Math.cos(t * 0.6 + r.ph) * 2;
      ball(ctx, x, y, 2.7, '#F3D9B1'); ball(ctx, x + 2.6, y + 1.6, 2, '#E3C192');
    }
    ctx.shadowBlur = hi === 'dna' ? 10 * pulse + 4 : 0;
    ctx.lineWidth = 2.4; ctx.strokeStyle = '#BFE6FF';
    for (const d of G.dna) {
      ctx.beginPath();
      for (let i = 0; i <= 40; i++) {
        const a = i / 40 * 6.283, r = 11 + Math.sin(a * 3 + t * 0.8 + d.x) * 2.6;
        ctx.lineTo(d.x + Math.cos(a) * r * 1.25, d.y + Math.sin(a) * r);
      }
      ctx.closePath(); ctx.stroke();
    }
    ctx.shadowBlur = 0;

    // подсветка мембран
    if (hi === 'outer' || hi === 'inner' || hi === 'crista') {
      ctx.save(); ctx.shadowColor = '#fff'; ctx.shadowBlur = 12; ctx.strokeStyle = `rgba(255,255,255,${0.5 + pulse * 0.6})`; ctx.lineWidth = 4;
      if (hi === 'crista') { ctx.beginPath(); ctx.rect(0, CY - RB + 8, L, 2 * RB - 16); ctx.clip(); }
      trace(ctx, hi === 'outer' ? outer : inner); ctx.stroke(); ctx.restore();
    }

    // потоки
    if (flows.length < 7 && Math.random() < dt * 2.2) spawnFlow();
    flows = flows.filter(f => (f.k += dt * 0.42) < 1);
    for (const f of flows) {
      ctx.globalAlpha = Math.min(1, f.k * 5, (1 - f.k) * 5);
      put(ctx, mol(f.kind), f.from[0] + (f.to[0] - f.from[0]) * f.k, f.from[1] + (f.to[1] - f.from[1]) * f.k, f.kind === 'atp' ? 0 : f.rot + t, f.kind === 'atp' ? 0.62 : 0.9);
    }
    ctx.globalAlpha = 1;
    sceneLabel(ctx, 'Цитоплазма клетки', 14, 20, scale);
  }

  function hit(x, y) {
    if (!G) return null;
    if (G.dna.some(d => Math.hypot(d.x - x, d.y - y) < 17)) return 'dna';
    const dOut = sd(x, y, G.a, B);
    if (dOut > 7) return null;
    if (dOut > -7) return 'outer';
    const dIn = sd(x, y, G.ai, RB), fd = fingerDist(x, y);
    if (dIn > 5) return 'ims';
    if (fd < 3) return 'crista';
    if (dIn > -6) return 'inner';
    if (G.ribo.some(r => Math.hypot(r.x - x, r.y - y) < 7)) return 'ribo';
    if (fd < 15) return 'atpsyn';
    return 'matrix';
  }

  function showInfo() {
    if (quest) return;
    chips.querySelectorAll('.chip').forEach(b => b.setAttribute('aria-pressed', b.dataset.k === sel));
    info.innerHTML = sel
      ? `<h3>${PARTS[sel].name}</h3><p>${PARTS[sel].text}</p>`
      : `<h3>Энергетическая станция клетки</h3><p>Митохондрия окисляет органические вещества кислородом и запасает энергию в молекулах АТФ. У неё две мембраны, собственная ДНК и рибосомы. Нажми на любую часть модели или выбери её в списке.</p>`;
  }

  // ——— игра «найди на модели» ———
  function questStep() {
    info.innerHTML = `<p class="quest-count">Вопрос ${quest.i + 1} из ${QUEST.length}</p><h3>${QUEST[quest.i].q}</h3><p class="quest-msg">Нажми на эту часть на модели.</p>`;
  }
  function questEnd(finished) {
    const q = quest; quest = null; chips.hidden = false; questBtn.textContent = 'Сыграть: найди на модели'; sel = null; showInfo();
    if (finished) {
      info.innerHTML = `<h3>${q.misses ? 'Готово' : 'Без единой ошибки'}</h3><p>Найдено ${QUEST.length} из ${QUEST.length}, промахов: ${q.misses}. ${q.misses ? 'Попробуй пройти ещё раз без промахов.' : 'Строение митохондрии ты знаешь.'}</p>`;
      api.emit('done', { misses: q.misses });
    }
  }
  function questTap(type) {
    if (!type || flash) return;
    const s = QUEST[quest.i];
    if (s.a.includes(type)) {
      flash = { type };
      info.querySelector('.quest-msg').innerHTML = `<b class="ok">Верно: ${PARTS[type].name.toLowerCase()}.</b>`;
      setTimeout(() => { flash = null; if (!quest) return; if (++quest.i >= QUEST.length) questEnd(true); else questStep(); }, 1000);
    } else {
      quest.misses++;
      info.querySelector('.quest-msg').innerHTML = `<b class="bad">Это ${PARTS[type].name.toLowerCase()}.</b> Попробуй ещё раз.`;
    }
  }

  const stage = createStage($('canvas'), {
    logicalH: H, draw, onResize: build, speedControl: false,
    onTap(x, y) {
      const type = hit(x, y);
      if (quest) return questTap(type);
      sel = type === sel ? null : type; showInfo();
    },
  });
  chips.addEventListener('click', e => {
    const b = e.target.closest('.chip'); if (!b) return;
    sel = sel === b.dataset.k ? null : b.dataset.k; showInfo();
  });
  questBtn.addEventListener('click', () => {
    if (quest) return questEnd(false);
    quest = { i: 0, misses: 0 }; sel = null; chips.hidden = true; questBtn.textContent = 'Выйти из игры'; questStep();
  });
  showInfo();

  return { destroy() { stage.destroy(); quest = null; root.innerHTML = ''; } };
}
