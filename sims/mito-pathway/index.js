import { createStage } from '../../js/core/canvas.js';
import { ribbon, chaikin, cytoplasm, mol, molIcon, put, ball, sceneLabel, roundRectPath } from '../_shared/art.js';

export const meta = { id: 'mito-pathway', title: 'Путь глюкозы' };

const STEPS = [
  { title: 'Старт: глюкоза в цитоплазме', dur: 0, led: [0, 0, 0, 0, 0, 0],
    text: 'Молекула глюкозы C₆H₁₂O₆ попала в клетку. В ней шесть атомов углерода — серые шарики. Проследим, что с ними будет. Нажимай «Дальше».' },
  { title: 'Гликолиз', dur: 2.2, led: [2, 2, 0, 0, 0, 0],
    text: 'В цитоплазме глюкоза расщепляется на две молекулы пировиноградной кислоты (ПВК), по три атома углерода в каждой. Кислород для этого не нужен. Выход: 2 АТФ и 2 НАДН.' },
  { title: 'ПВК входит в митохондрию', dur: 2.4, led: [2, 4, 0, 2, 0, 0],
    text: 'В матриксе каждая ПВК теряет один атом углерода — он уходит в виде CO₂. Остаток из двух атомов присоединяется к коферменту А: получается ацетил-КоА. Выход: 2 CO₂ и 2 НАДН.' },
  { title: 'Цикл Кребса: первый оборот', dur: 2.6, led: [3, 7, 1, 4, 0, 0],
    text: 'Ацетил-КоА входит в цикл. За оборот два атома углерода уходят в виде CO₂, а водород забирают переносчики. Выход одного оборота: 2 CO₂, 3 НАДН, 1 ФАДН₂ и 1 АТФ.' },
  { title: 'Цикл Кребса: второй оборот', dur: 2.6, led: [4, 10, 2, 6, 0, 0],
    text: 'Вторая молекула ацетил-КоА проходит тот же путь. Теперь все шесть атомов углерода глюкозы превратились в CO₂, а её водород — у переносчиков: 10 НАДН и 2 ФАДН₂.' },
  { title: 'Дыхательная цепь на кристах', dur: 3, led: [38, 0, 0, 6, 6, 6],
    text: 'Переносчики отдают электроны в дыхательную цепь. В конце цепи их принимает кислород — образуется вода. На энергии этого потока АТФ-синтаза выдаёт основную часть АТФ: 34 молекулы.' },
  { title: 'Итог', dur: 0, led: [38, 0, 0, 6, 6, 6],
    text: 'C₆H₁₂O₆ + 6O₂ → 6CO₂ + 6H₂O + 38 АТФ. Из них 2 АТФ даёт бескислородный этап (гликолиз) и 36 — кислородный (в митохондрии). Это школьный счёт, принятый на ЕГЭ; по современным измерениям выходит около 30–32 АТФ.' },
];
const LEDGER = [['atp', 'АТФ'], ['nadh', 'НАДН'], ['fadh2', 'ФАДН₂'], ['co2', 'CO₂ выделено'], ['h2o', 'H₂O образовано'], ['o2', 'O₂ потрачено']];

const HELP = {
  glu: ['Глюкоза C₆H₁₂O₆', 'Главное «топливо» клетки. Вся её энергия заключена в связях между атомами; дыхание высвобождает эту энергию по частям.'],
  pvk: ['Пировиноградная кислота (ПВК)', 'Продукт гликолиза, три атома углерода. Если кислород есть, ПВК идёт в митохондрию. Если его нет, в мышцах она превращается в молочную кислоту, а у дрожжей — в спирт и CO₂ (брожение).'],
  acoa: ['Ацетил-КоА', 'Остаток уксусной кислоты из двух атомов углерода, присоединённый к коферменту А. В таком виде углерод входит в цикл Кребса. В ацетил-КоА превращаются также жирные кислоты и часть аминокислот.'],
  krebs: ['Цикл Кребса', 'Круговая цепочка реакций в матриксе. Ацетил (2C) присоединяется к веществу из четырёх атомов углерода (4C), получается лимонная кислота (6C). Дальше от неё по очереди отщепляются два CO₂, и снова остаётся 4C — цикл замыкается.'],
  pool: ['НАДН и ФАДН₂', 'Переносчики водорода. Они забирают у остатков глюкозы атомы водорода с электронами и несут их к дыхательной цепи. Именно в них сейчас «спрятана» бóльшая часть энергии глюкозы.'],
  crista: ['Криста: дыхательная цепь и АТФ-синтаза', 'На складках внутренней мембраны электроны переносчиков идут по цепи белков к кислороду, а АТФ-синтаза синтезирует АТФ. Подробно — в разделе «Дыхательная цепь».'],
  co2: ['Углекислый газ', 'Весь углерод глюкозы в итоге уходит из клетки в виде CO₂. Это тот самый углекислый газ, который мы выдыхаем.'],
  atp: ['АТФ', 'Универсальный источник энергии в клетке. Школьный счёт: 2 АТФ в гликолизе и 36 в митохондрии, всего 38.'],
};

const H = 400;
const ease = k => k * k * (3 - 2 * k);
const lerp = (a, b, k) => a + (b - a) * k;
const mix = (p, q, k) => [lerp(p[0], q[0], k), lerp(p[1], q[1], k)];
const seg = (k, a, b) => Math.max(0, Math.min(1, (k - a) / (b - a)));

export function mount(root, api) {
  root.innerHTML = `
    <div class="sim">
      <div class="sim-stage"><canvas aria-label="Схема клеточного дыхания: путь атомов глюкозы"></canvas></div>
      <div class="sim-panel">
        <div class="help" hidden></div>
        <div class="info"><p class="quest-count"></p><h3></h3><p class="step-text"></p>
          <div class="btn-row"><button class="btn ghost prev">Назад</button><button class="btn next">Дальше</button></div>
        </div>
        <div class="controls"><p class="group-title">Что получила клетка</p><div class="ledger">
          ${LEDGER.map(([k, n]) => `<div><img src="${molIcon(k)}" alt="" style="height:13px"><span>${n}</span><b data-led="${k}">0</b></div>`).join('')}
        </div></div>
      </div>
    </div>`;
  const $ = s => root.querySelector(s);
  const help = $('.help');
  let L = 600, A = {}, step = 0, k = 1, finished = false;

  function layout(newL) {
    L = newL;
    A = {
      g0: [L * 0.13, 56], split: [L * 0.34, 56], p1: [L * 0.56, 38], p2: [L * 0.56, 78],
      a1: [L * 0.15, 214], a2: [L * 0.15, 276], K: [L * 0.45, 268], R: 58,
      pool: [L * 0.635, 240], cr: L * 0.81, atp: [L - 116, 34], co2: [L * 0.06, 150],
    };
  }

  // ——— элементы рисунка ———
  function carbons(ctx, [x, y], n, ang = 0, alpha = 1) {
    const gap = 9.6, dx = Math.cos(ang) * gap, dy = Math.sin(ang) * gap, x0 = x - dx * (n - 1) / 2, y0 = y - dy * (n - 1) / 2;
    ctx.globalAlpha = alpha; ctx.strokeStyle = 'rgba(230,236,242,.75)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0 + dx * (n - 1), y0 + dy * (n - 1)); ctx.stroke();
    for (let i = 0; i < n; i++) put(ctx, mol('carbon'), x0 + dx * i + (i % 2 ? 1.5 : -1.5) * Math.sin(ang), y0 + dy * i + (i % 2 ? 2.5 : -2.5) * Math.cos(ang));
    ctx.globalAlpha = 1;
  }
  function tag(ctx, [x, y], text, col) {
    ctx.font = '700 11px system-ui, sans-serif'; const w = ctx.measureText(text).width + 10;
    ctx.fillStyle = col; roundRectPath(ctx, x - w / 2, y - 8, w, 16, 8); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, x, y + 0.5);
  }
  // значок летит из точки в точку в отрезке [t0, t0 + d] текущего шага
  function shot(ctx, kind, from, to, t0, d = 0.3, size = 1) {
    const q = seg(k, t0, t0 + d); if (q <= 0 || q >= 1) return;
    const [x, y] = mix(from, to, ease(q)); ctx.globalAlpha = Math.min(1, q * 6, (1 - q) * 4);
    put(ctx, mol(kind), x, y - Math.sin(q * Math.PI) * 14, 0, size); ctx.globalAlpha = 1;
  }
  const dashed = (ctx, pts) => {
    ctx.save(); ctx.setLineDash([3, 6]); ctx.strokeStyle = 'rgba(255,255,255,.3)'; ctx.lineWidth = 1.6;
    ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke(); ctx.restore();
  };

  function draw(ctx, { t, dt, scale }) {
    const dur = STEPS[step].dur;
    if (dur && k < 1) { k = Math.min(1, k + dt / dur); if (k === 1) updatePanel(); }
    const s = step, done = n => s > n || (s === n && k >= 1);

    cytoplasm(ctx, L, H, t);
    // митохондрия: две мембраны, криста справа
    const box = (inset, r) => chaikin([[inset, H + 40], [inset, 128 + inset + r], [inset + r * 0.3, 128 + inset + r * 0.3], [inset + r, 128 + inset],
      [L - inset - r, 128 + inset], [L - inset - r * 0.3, 128 + inset + r * 0.3], [L - inset, 128 + inset + r], [L - inset, H + 40]], 2);
    const outer = box(14, 44);
    ctx.beginPath(); outer.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.fillStyle = '#4A2550'; ctx.fill();
    const top = 158, cr = A.cr, tip = 322, sway = Math.sin(t * 0.5) * 2.5, fw = 11;
    const innerPts = [[29, H + 40], [29, top + 44], [29 + 12, top + 12], [29 + 44, top], [cr - fw, top], [cr - fw + sway * 0.5, (top + tip) / 2], [cr - fw + sway, tip - fw]];
    for (const d of [150, 120, 90, 60, 30]) innerPts.push([cr + sway + fw * Math.cos(d * Math.PI / 180), tip - fw + fw * Math.sin(d * Math.PI / 180)]);
    innerPts.push([cr + fw + sway, tip - fw], [cr + fw + sway * 0.5, (top + tip) / 2], [cr + fw, top], [L - 29 - 44, top], [L - 29 - 12, top + 12], [L - 29, top + 44], [L - 29, H + 40]);
    const inner = chaikin(innerPts, 2);
    ctx.beginPath(); inner.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    const mg = ctx.createRadialGradient(L * 0.35, 220, 10, L * 0.5, 280, L * 0.7);
    mg.addColorStop(0, '#E07A4E'); mg.addColorStop(0.5, '#B94C3D'); mg.addColorStop(1, '#7E2E40');
    ctx.fillStyle = mg; ctx.fill();
    ribbon(ctx, outer); ribbon(ctx, inner, false, 0.72);
    // белки цепи и АТФ-синтазы на стенках кристы
    const active = s === 5 && k < 1;
    for (let y = top + 30, i = 0; y < tip - 14; y += 20, i++) for (const side of [-1, 1]) {
      const x = cr + sway * (y - top) / (tip - top) + side * (fw + 4);
      if (i % 3 === 2) { ctx.strokeStyle = '#B8793A'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + side * 5, y); ctx.stroke(); ball(ctx, x + side * 8, y, 3.8, '#FFD166'); }
      else ball(ctx, x - side * 3, y, 4.6, ['#3F8FE8', '#D455A8', '#22B5A0'][(i + (side > 0 ? 1 : 0)) % 3]);
    }
    if (active) {
      const g = ctx.createRadialGradient(cr, 232, 0, cr, 232, 90);
      g.addColorStop(0, `rgba(255,225,120,${0.35 + Math.sin(t * 9) * 0.12})`); g.addColorStop(1, 'rgba(255,225,120,0)');
      ctx.fillStyle = g; ctx.fillRect(cr - 90, 150, 180, 180);
    }

    sceneLabel(ctx, 'Цитоплазма', 14, 18, scale);
    sceneLabel(ctx, 'Матрикс митохондрии', 44, H - 16, scale);
    sceneLabel(ctx, 'криста', cr, 340, scale, 'center');

    // маршруты
    dashed(ctx, [A.g0, A.split, [L * 0.52, 58]]);
    dashed(ctx, [[L * 0.5, 84], [L * 0.3, 118], [A.a1[0] + 20, A.a1[1] + 30]]);
    dashed(ctx, [[A.a1[0] + 26, A.a1[1] + 30], [A.K[0] - A.R - 6, A.K[1]]]);
    if (s <= 1) sceneLabel(ctx, 'гликолиз', A.split[0], 92, scale, 'center');

    // цикл Кребса
    const [kx, ky] = A.K, R = A.R, turning = (s === 3 || s === 4) && k < 1, q = turning ? seg(k, 0.2, 1) : 0;
    ctx.lineWidth = 9; ctx.strokeStyle = 'rgba(255,255,255,.14)'; ctx.beginPath(); ctx.arc(kx, ky, R, 0, 7); ctx.stroke();
    if (turning) {
      ctx.strokeStyle = 'rgba(255,225,120,.85)'; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(kx, ky, R, -Math.PI / 2, -Math.PI / 2 + q * 6.283); ctx.stroke();
    }
    for (let i = 0; i < 8; i++) ball(ctx, kx + Math.cos(i * 0.785 - 1.571) * R, ky + Math.sin(i * 0.785 - 1.571) * R, 3.2, '#F8EAC4');
    const ang = -Math.PI / 2 + q * 6.283, nC = !turning ? 4 : q < 0.33 ? 6 : q < 0.66 ? 5 : 4;
    carbons(ctx, [kx + Math.cos(ang) * R, ky + Math.sin(ang) * R], nC, ang + Math.PI / 2);
    sceneLabel(ctx, 'цикл Кребса', kx, ky - 8, scale, 'center');
    sceneLabel(ctx, `${nC}C`, kx, ky + 12, scale, 'center');
    if (turning) {
      const rim = a => [kx + Math.cos(-1.571 + a * 6.283) * R, ky + Math.sin(-1.571 + a * 6.283) * R], t0 = a => 0.2 + a * 0.8;
      shot(ctx, 'co2', rim(0.33), A.co2, t0(0.33), 0.32); shot(ctx, 'co2', rim(0.66), [A.co2[0], A.co2[1] + 60], t0(0.66), 0.3);
      shot(ctx, 'nadh', rim(0.28), A.pool, t0(0.28), 0.25); shot(ctx, 'nadh', rim(0.55), A.pool, t0(0.55), 0.25); shot(ctx, 'nadh', rim(0.92), A.pool, t0(0.9), 0.2);
      shot(ctx, 'fadh2', rim(0.78), A.pool, t0(0.78), 0.2); shot(ctx, 'atp', rim(0.68), A.atp, t0(0.68), 0.3, 0.8);
    }

    // углеродный скелет глюкозы
    if (s === 0) { carbons(ctx, A.g0, 6); sceneLabel(ctx, 'глюкоза, 6C', A.g0[0], A.g0[1] + 22, scale, 'center'); }
    if (s === 1) {
      if (k < 0.45) carbons(ctx, mix(A.g0, A.split, ease(k / 0.45)), 6);
      else { const m = ease(seg(k, 0.45, 1)); carbons(ctx, mix(A.split, A.p1, m), 3); carbons(ctx, mix(A.split, A.p2, m), 3); }
      shot(ctx, 'atp', A.split, A.atp, 0.5, 0.35, 0.8); shot(ctx, 'atp', A.split, A.atp, 0.62, 0.35, 0.8);
      shot(ctx, 'nadh', A.split, A.pool, 0.55, 0.4); shot(ctx, 'nadh', A.split, A.pool, 0.6, 0.4);
    }
    if (s === 2) {
      const m = ease(seg(k, 0, 0.5)), c = seg(k, 0.5, 1);
      [[A.p1, A.a1], [A.p2, A.a2]].forEach(([p, a], i) => {
        const pos = mix(p, a, m);
        if (c <= 0) carbons(ctx, pos, 3);
        else {
          carbons(ctx, pos, 2); tag(ctx, [pos[0] + 28, pos[1]], 'КоА', '#8E63D9');
          if (c < 1) { const [x, y] = mix(pos, [A.co2[0], A.co2[1] - 30 + i * 40], ease(c)); ctx.globalAlpha = 1 - c * c; put(ctx, mol('co2'), x, y); ctx.globalAlpha = 1; }
        }
        shot(ctx, 'nadh', a, A.pool, 0.6 + i * 0.08, 0.35);
      });
    } else if (s === 1 && k >= 1) sceneLabel(ctx, '2 ПВК, по 3C', A.p1[0] + 50, 58, scale);
    // ацетил-КоА ждут своей очереди в цикл
    [[A.a1, 3], [A.a2, 4]].forEach(([a, enter]) => {
      if (s < 3 && !(s === 2 && k >= 1)) return;
      if (s > enter) return;
      const m = s === enter ? ease(seg(k, 0, 0.2)) : 0;
      if (s === enter && k >= 0.2) return;
      const pos = mix(a, [kx, ky - R], m); carbons(ctx, pos, 2); tag(ctx, [pos[0] + 28, pos[1]], 'КоА', '#8E63D9');
    });

    // запас переносчиков водорода
    const led = ledger(), nN = led[1], nF = led[2];
    for (let i = 0; i < nN; i++) put(ctx, mol('nadh'), A.pool[0] - 13 + (i % 2) * 27, A.pool[1] - 26 + Math.floor(i / 2) * 14);
    for (let i = 0; i < nF; i++) put(ctx, mol('fadh2'), A.pool[0] - 13 + i * 27, A.pool[1] + 50);
    if (nN + nF) sceneLabel(ctx, 'НАДН и ФАДН₂', A.pool[0] + 30, A.pool[1] - 52, scale, 'right');

    // дыхательная цепь: электроны к кристе, кислород внутрь, вода и АТФ наружу
    if (active) {
      for (let i = 0; i < 7; i++) {
        const q2 = (k * 5 + i / 7) % 1, [x, y] = mix(A.pool, [cr - 16, 232], q2);
        const g = ctx.createRadialGradient(x, y, 0, x, y, 9); g.addColorStop(0, 'rgba(255,255,255,.95)'); g.addColorStop(0.4, 'rgba(120,235,255,.8)'); g.addColorStop(1, 'rgba(120,235,255,0)');
        ctx.fillStyle = g; ctx.fillRect(x - 9, y - 9, 18, 18);
      }
      for (let i = 0; i < 6; i++) {
        shot(ctx, 'o2', [L - 40 - i * 12, 96], [cr + 18, 250], 0.05 + i * 0.13, 0.22);
        shot(ctx, 'h2o', [cr + 18, 260], [L - 44, 372], 0.2 + i * 0.13, 0.22, 1.3);
        shot(ctx, 'atp', [cr - 20, 200], A.atp, 0.1 + i * 0.14, 0.22, 0.8); shot(ctx, 'atp', [cr + 20, 290], A.atp, 0.16 + i * 0.14, 0.22, 0.8);
      }
    }

    // счётчик АТФ в цитоплазме
    put(ctx, mol('atp'), A.atp[0], A.atp[1], 0, 0.9);
    sceneLabel(ctx, `АТФ: ${led[0]}`, A.atp[0] + 24, A.atp[1], scale);

    if ((draw.tick = (draw.tick || 0) + dt) > 0.1) { draw.tick = 0; led.forEach((v, i) => { const b = root.querySelector(`[data-led="${LEDGER[i][0]}"]`); if (b.textContent !== String(v)) b.textContent = v; }); }
  }

  // показания счётчиков плавно доезжают до значений шага
  function ledger() {
    const prev = STEPS[Math.max(0, step - 1)].led, cur = STEPS[step].led, m = STEPS[step].dur ? seg(k, 0.45, 1) : 1;
    return cur.map((v, i) => Math.round(lerp(prev[i], v, m)));
  }

  function updatePanel() {
    const st = STEPS[step];
    $('.quest-count').textContent = step === 0 ? 'Начало' : step === STEPS.length - 1 ? 'Конец пути' : `Шаг ${step} из ${STEPS.length - 2}`;
    $('.info h3').textContent = st.title; $('.step-text').textContent = st.text;
    $('.prev').disabled = step === 0;
    $('.next').textContent = step === STEPS.length - 1 ? 'Пройти заново' : 'Дальше';
    $('.next').disabled = k < 1;
    if (step === STEPS.length - 1 && !finished) { finished = true; api.emit('done', {}); }
  }
  function go(n) { step = n; k = STEPS[n].dur ? 0 : 1; showHelp(null); updatePanel(); }

  function showHelp(key) {
    const g = HELP[key]; help.hidden = !g;
    if (g) help.innerHTML = `<button class="help-close" aria-label="Закрыть справку">×</button><b>${g[0]}</b><p>${g[1]}</p>`;
  }
  function onTap(x, y) {
    const near = ([px, py], r) => Math.hypot(px - x, py - y) < r;
    if (near(A.atp, 44)) return showHelp('atp');
    if (near(A.K, A.R + 14)) return showHelp('krebs');
    if (Math.abs(x - A.cr) < 30 && y > 140 && y < 340) return showHelp('crista');
    if (near(A.pool, 50)) return showHelp('pool');
    if (y < 120) return showHelp(step === 0 || (step === 1 && k < 0.45) ? 'glu' : step <= 2 ? 'pvk' : 'glu');
    if (x < L * 0.3 && y > 180) return showHelp(step < 2 || (step === 2 && k < 0.5) ? 'pvk' : 'acoa');
    if (x < L * 0.12) return showHelp('co2');
    showHelp(null);
  }

  const stage = createStage($('canvas'), { logicalH: H, draw, onTap, onResize: layout });
  $('.next').addEventListener('click', () => go(step === STEPS.length - 1 ? 0 : step + 1));
  $('.prev').addEventListener('click', () => { if (step > 0) { step--; k = 1; showHelp(null); updatePanel(); } });
  help.addEventListener('click', e => { if (e.target.closest('.help-close')) showHelp(null); });
  updatePanel();

  return { destroy() { stage.destroy(); root.innerHTML = ''; } };
}
