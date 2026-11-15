import { createStage } from '../../js/core/canvas.js';
import { C, lipid, lipidHead, cholesterol, glycan, filament, protein, put, backdrop, sceneLabel } from '../_shared/art.js';

export const meta = { id: 'membrane-structure', title: 'Строение мембраны' };

const PARTS = {
  lipid: {
    name: 'Фосфолипиды', color: C.head,
    text: 'Образуют двойной слой — основу мембраны. У каждой молекулы гидрофильная головка («любит воду») и два гидрофобных хвоста из жирных кислот. Головки смотрят к воде — наружу и в цитоплазму, хвосты спрятаны внутрь. Поэтому слой собирается сам и не пропускает ионы и крупные полярные молекулы. Присмотрись: один хвост с изломом. Это двойная связь — из-за неё липиды не упакованы вплотную, и мембрана остаётся текучей.',
  },
  chol: {
    name: 'Холестерин', color: C.chol,
    text: 'Встроен между хвостами фосфолипидов в мембранах животных клеток и работает как стабилизатор: на жаре не даёт мембране стать слишком жидкой, на холоде — слишком жёсткой. Проверь это ползунком температуры: выключи холестерин и сравни.',
  },
  integral: {
    name: 'Интегральные белки', color: C.integral,
    text: 'Пронизывают мембрану насквозь. Многие из них транспортные: каналы и переносчики, через которые проходят ионы, глюкоза, аминокислоты. Другие служат рецепторами: принимают сигнал снаружи и передают его внутрь клетки.',
  },
  semi: {
    name: 'Полуинтегральные белки', color: C.semi,
    text: 'Погружены в мембрану только частично — в один слой липидов. Часто это ферменты и рецепторы.',
  },
  periph: {
    name: 'Периферические белки', color: C.periph,
    text: 'Лежат на поверхности мембраны и не погружены в липидный слой. С внутренней стороны связывают мембрану с цитоскелетом и помогают клетке держать форму; многие работают как ферменты. На модели такой белок держит нить цитоскелета.',
  },
  glyco: {
    name: 'Гликокаликс', color: C.carb,
    text: 'Углеводные цепочки, прикреплённые к белкам (гликопротеины) и липидам (гликолипиды). Они есть только на наружной стороне мембраны животной клетки. Это «опознавательные знаки»: по ним клетки узнают друг друга, от них зависят группы крови и работа иммунитета.',
  },
};
const ORDER = ['lipid', 'chol', 'integral', 'semi', 'periph', 'glyco'];

const QUEST = [
  { q: 'Что образует основу мембраны — двойной слой?', a: 'lipid' },
  { q: 'Через что в клетку проходят ионы?', a: 'integral' },
  { q: 'По чему клетки узнают друг друга?', a: 'glyco' },
  { q: 'Что не даёт мембране застыть на холоде?', a: 'chol' },
  { q: 'Какой белок вообще не погружён в липидный слой?', a: 'periph' },
  { q: 'Какой белок погружён только в один слой липидов?', a: 'semi' },
];

const MID = 165, HEAD_Y = 40, H = 330;

export function mount(root, api) {
  root.innerHTML = `
    <div class="sim">
      <div class="chips sim-modes" role="group" aria-label="Части мембраны">
        ${ORDER.map(k => `<button class="chip" data-k="${k}" aria-pressed="false"><i class="dot" style="background:${PARTS[k].color}"></i>${PARTS[k].name}</button>`).join('')}
      </div>
      <div class="sim-stage"><canvas aria-label="Модель клеточной мембраны в разрезе"></canvas></div>
      <div class="sim-panel">
        <div class="info" aria-live="polite"></div>
        <div class="controls">
          <label class="range"><span>Температура</span>
            <input type="range" min="0" max="100" value="50" aria-label="Температура">
            <span class="ends"><span>холодно</span><span>жарко</span></span>
          </label>
          <label class="switch"><input type="checkbox" checked> <span>Холестерин в мембране</span></label>
          <p class="readout"></p>
        </div>
        <button class="btn quest-btn">Сыграть: найди на модели</button>
      </div>
    </div>`;
  const $ = s => root.querySelector(s);
  const info = $('.info'), readout = $('.readout'), chips = $('.chips'), questBtn = $('.quest-btn');

  let sel = null, temp = 0.5, chol = true, scene = null, quest = null, flash = null;
  const dim = {};                       // плавное затемнение невыбранных частей
  ORDER.forEach(k => { dim[k] = 1; });

  const fluidity = () => (chol ? 0.5 + (temp - 0.5) * 0.45 : temp);

  function build(L) {
    const prot = [
      { type: 'integral', kind: 'channel', x0: L * 0.17, block: 38, ph: 1 },
      { type: 'integral', kind: 'glyco', x0: L * 0.5, block: 19, ph: 3 },
      { type: 'semi', x0: L * 0.69, block: 25, ph: 5 },
      { type: 'periph', x0: L * 0.87, block: 0, ph: 7 },
    ];
    prot.forEach(p => { p.x = p.x0; });
    const n = Math.round(L / 15), step = L / n;
    const lipids = [], chols = [];
    const blocked = (x, top) => prot.some(p =>
      (p.type === 'integral' || (p.type === 'semi' && !top)) && Math.abs(x - p.x0) < p.block + 5);
    for (const top of [true, false]) {
      let prev = null, k = top ? 2 : 4;
      for (let i = 0; i < n; i++) {
        const x = (i + 0.5) * step;
        if (blocked(x, top)) { prev = null; continue; }
        lipids.push({ x, top, ph: Math.random() * 6.28 });
        if (prev !== null && ++k % 5 === 0) chols.push({ x: (prev + x) / 2, top, ph: Math.random() * 6.28 });
        prev = x;
      }
    }
    // дальние ряды головок: поверхность мембраны, уходящая вглубь
    const back = [];
    for (let row = 4; row >= 1; row--) {
      const s = 1 - row * 0.11;
      for (let x = (row % 2 ? 0 : step * 0.5); x < L + step; x += step * (0.96 + row * 0.01)) back.push({ x, row, s, ph: Math.random() * 6.28 });
    }
    // гликолипид — ближайший к отметке 0.33 липид наружного слоя
    const tops = lipids.filter(l => l.top);
    const gl = tops.reduce((a, b) => (Math.abs(b.x - L * 0.33) < Math.abs(a.x - L * 0.33) ? b : a));
    gl.glyco = true;
    scene = { L, prot, lipids, chols, back, gl };
  }

  function draw(ctx, { L, t, dt, scale }) {
    if (!scene) return;
    const f = fluidity();
    const hi = flash?.type ?? sel;
    for (const k of ORDER) { const target = hi && hi !== k ? 0.16 : 1; dim[k] += (target - dim[k]) * Math.min(1, dt * 7); }
    const pulse = 10 + Math.sin(t * 4) * 5;
    const glow = type => { const on = hi === type; ctx.shadowColor = on ? 'rgba(255,255,255,.95)' : 'transparent'; ctx.shadowBlur = on ? pulse : 0; };
    for (const p of scene.prot) p.x = p.x0 + Math.sin(t * 0.13 + p.ph) * 6 * (0.3 + f);

    backdrop(ctx, L, H, MID, t);
    sceneLabel(ctx, 'Снаружи клетки', 14, 20, scale);
    sceneLabel(ctx, 'Цитоплазма', 14, H - 18, scale);

    // цитоскелет под мембраной
    ctx.globalAlpha = Math.max(dim.periph, 0.35) * 0.9;
    filament(ctx, L * 0.52, L + 12, MID + HEAD_Y + 44, t, 0);
    ctx.globalAlpha = Math.max(dim.periph, 0.35) * 0.45;
    filament(ctx, -12, L * 0.6, MID + HEAD_Y + 86, t, 2);

    // дальние ряды головок
    for (const b of scene.back) {
      ctx.globalAlpha = dim.lipid * (1 - b.row * 0.19);
      const dx = Math.sin(t * (0.7 + 3 * f) + b.ph) * (0.4 + 3 * f);
      lipidHead(ctx, b.x + dx, MID - HEAD_Y - b.row * 6.2 + b.row * b.row * 0.35, 6.5 * b.s);
    }

    // передний ряд: липиды в разрезе
    for (const l of scene.lipids) {
      const dx = Math.sin(t * (0.7 + 3 * f) + l.ph) * (0.3 + 3.6 * f);
      const dy = Math.sin(t * (1.1 + 2 * f) + l.ph * 2.3) * (0.3 + 1.4 * f);
      const wob = Math.sin(t * (1 + 4.5 * f) + l.ph * 1.7) * (0.3 + 5.2 * f);
      ctx.globalAlpha = dim.lipid;
      lipid(ctx, l.x + dx, (l.top ? MID - HEAD_Y : MID + HEAD_Y) + dy, l.top ? 1 : -1, wob);
      l.dx = dx;
    }

    // холестерин
    if (chol) {
      ctx.globalAlpha = dim.chol; glow('chol');
      for (const c of scene.chols) {
        const dx = Math.sin(t * (0.7 + 3 * f) + c.ph) * (0.3 + 2.4 * f);
        cholesterol(ctx, c.x + dx, c.top ? MID - HEAD_Y : MID + HEAD_Y, c.top ? 1 : -1);
      }
      ctx.shadowBlur = 0;
    }

    // белки
    for (const p of scene.prot) {
      const bob = Math.sin(t * 0.6 + p.ph) * 1.4, tilt = Math.sin(t * 0.4 + p.ph) * 0.02;
      ctx.globalAlpha = dim[p.type]; glow(p.type);
      if (p.kind === 'channel') put(ctx, protein('channel'), p.x, MID + bob, tilt);
      else if (p.kind === 'glyco') put(ctx, protein('glyco'), p.x, MID + bob, tilt);
      else if (p.type === 'semi') put(ctx, protein('semi'), p.x, MID + 41 + bob, tilt);
      else put(ctx, protein('periph'), p.x, MID + HEAD_Y + 25 + bob * 0.5, tilt);
      p.bob = bob;
    }
    ctx.shadowBlur = 0;

    // гликокаликс
    ctx.globalAlpha = dim.glyco; glow('glyco');
    const g = scene.prot[1];
    glycan(ctx, g.x - 11, MID - 70 + g.bob, t, 2, 'N'); glycan(ctx, g.x + 12, MID - 72 + g.bob, t, 4, 'N');
    glycan(ctx, scene.gl.x + (scene.gl.dx || 0), MID - HEAD_Y - 5, t, 1, 'L');
    ctx.shadowBlur = 0; ctx.globalAlpha = 1;
  }

  function hit(x, y) {
    const s = scene; if (!s) return null;
    const dy = y - MID;
    if (Math.abs(x - s.gl.x) < 15 && dy > -HEAD_Y - 38 && dy < -HEAD_Y - 5) return 'glyco';
    for (const p of s.prot) {
      const dx = Math.abs(x - p.x);
      if (p.kind === 'glyco' && dx < 27 && dy > -132 && dy < -74) return 'glyco';
    }
    for (const p of s.prot) {
      const dx = Math.abs(x - p.x);
      if (p.kind === 'channel' && dx < 37 && Math.abs(dy) < 68) return 'integral';
      if (p.kind === 'glyco' && ((dx < 28 && dy > -76 && dy < -28) || (dx < 15 && Math.abs(dy) < 62) || (dx < 19 && dy > 44 && dy < 78))) return 'integral';
      if (p.type === 'semi' && dx < 22 && dy > 8 && dy < 78) return 'semi';
      if (p.type === 'periph' && dx < 33 && dy > 46 && dy < 86) return 'periph';
    }
    if (chol) for (const c of s.chols) {
      if (Math.abs(x - c.x) < 7.5 && (c.top ? dy > -34 && dy < -2 : dy > 2 && dy < 34)) return 'chol';
    }
    if (dy > -HEAD_Y - 30 && dy < HEAD_Y + 9) return 'lipid';
    return null;
  }

  function showInfo() {
    if (quest) return;
    chips.querySelectorAll('.chip').forEach(b => b.setAttribute('aria-pressed', b.dataset.k === sel));
    info.innerHTML = sel
      ? `<h3>${PARTS[sel].name}</h3><p>${PARTS[sel].text}</p>`
      : `<h3>Жидкостно-мозаичная модель</h3><p>Мембрана — не твёрдая стенка, а подвижная плёнка толщиной 7–10 нм: липиды и белки в ней постоянно движутся. Нажми на любую часть модели или выбери её в списке.</p>`;
  }

  function showReadout() {
    const f = fluidity();
    let text = f < 0.25 ? 'Мембрана застывает: липиды упакованы плотно, вещества проходят хуже.'
      : f > 0.75 ? 'Мембрана слишком жидкая: теряет прочность, начинает «протекать».'
      : 'Текучесть в норме: белки и липиды свободно движутся в слое.';
    if (chol && (temp < 0.2 || temp > 0.8)) text += ' Холестерин сглаживает перепад температуры.';
    readout.textContent = text;
  }

  // ——— игра «найди на модели» ———
  function questStep() {
    const s = QUEST[quest.i];
    info.innerHTML = `<p class="quest-count">Вопрос ${quest.i + 1} из ${QUEST.length}</p><h3>${s.q}</h3><p class="quest-msg">Нажми на эту часть на модели.</p>`;
  }
  function questStart() {
    quest = { i: 0, misses: 0 }; sel = null; chips.hidden = true;
    if (!chol) { chol = true; $('.switch input').checked = true; showReadout(); }
    questBtn.textContent = 'Выйти из игры'; questStep();
  }
  function questEnd(finished) {
    const q = quest; quest = null; chips.hidden = false; questBtn.textContent = 'Сыграть: найди на модели';
    showInfo();
    if (finished) {
      info.innerHTML = `<h3>${q.misses ? 'Готово' : 'Без единой ошибки'}</h3><p>Найдено ${QUEST.length} из ${QUEST.length}, промахов: ${q.misses}. ${q.misses ? 'Попробуй пройти ещё раз без промахов.' : 'Строение мембраны ты знаешь.'}</p>`;
      api.emit('done', { misses: q.misses });
    }
  }
  function questTap(type) {
    if (!type || flash) return;
    const s = QUEST[quest.i];
    if (type === s.a) {
      flash = { type };
      info.querySelector('.quest-msg').innerHTML = `<b class="ok">Верно: ${PARTS[type].name.toLowerCase()}.</b>`;
      setTimeout(() => {
        flash = null; if (!quest) return;
        if (++quest.i >= QUEST.length) questEnd(true); else questStep();
      }, 1100);
    } else {
      quest.misses++;
      info.querySelector('.quest-msg').innerHTML = `<b class="bad">Это ${PARTS[type].name.toLowerCase()}.</b> Попробуй ещё раз.`;
    }
  }

  const stage = createStage($('canvas'), {
    logicalH: H, draw, onResize: build,
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
  $('input[type=range]').addEventListener('input', e => { temp = e.target.value / 100; showReadout(); });
  $('.switch input').addEventListener('change', e => { chol = e.target.checked; if (!chol && sel === 'chol') sel = null; showInfo(); showReadout(); });
  questBtn.addEventListener('click', () => (quest ? questEnd(false) : questStart()));
  showInfo(); showReadout();

  return { destroy() { stage.destroy(); quest = null; root.innerHTML = ''; } };
}
