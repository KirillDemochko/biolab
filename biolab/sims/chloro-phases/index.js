import { createStage } from '../../js/core/canvas.js';
import { ribbon, chaikin, cytoplasm, mol, molIcon, put, ball, sceneLabel, roundRectPath } from '../_shared/art.js';

export const meta = { id: 'chloro-phases', title: 'Две фазы фотосинтеза' };

const STEPS = [
  { title: 'Старт: лист на свету', dur: 0, led: [0, 0, 0, 0, 0],
    text: 'Перед тобой хлоропласт изнутри: слева грана из тилакоидов, справа в строме — цикл Кальвина. Проследим, как из воды и углекислого газа получается глюкоза. Нажимай «Дальше».' },
  { title: 'Световая фаза: фотолиз воды', dur: 2.4, led: [6, 0, 0, 0, 0],
    text: 'Свет падает на тилакоиды. Хлорофилл поглощает его энергию, и вода расщепляется. Кислород уходит из хлоропласта наружу, а водород остаётся в работе.' },
  { title: 'Световая фаза: запас энергии', dur: 2.4, led: [6, 0, 18, 12, 0],
    text: 'Энергия света запасается в двух видах молекул: АТФ и НАДФ·Н₂. Они выходят из тилакоидов в строму. На одну молекулу глюкозы нужно 18 АТФ и 12 НАДФ·Н₂.' },
  { title: 'Темновая фаза: фиксация углерода', dur: 2.4, led: [6, 6, 18, 12, 0],
    text: 'В строме углекислый газ присоединяется к пятиуглеродному сахару. Так неорганический углерод попадает в органическое вещество. Свет для этого не нужен — нужны продукты световой фазы.' },
  { title: 'Темновая фаза: восстановление', dur: 2.6, led: [6, 6, 0, 0, 0],
    text: 'Цикл Кальвина тратит запасённые АТФ и НАДФ·Н₂: энергия и водород идут на то, чтобы превратить связанный углерод в сахар. Отработанные АДФ и НАДФ⁺ возвращаются к тилакоидам.' },
  { title: 'Темновая фаза: глюкоза', dur: 2.4, led: [6, 6, 0, 0, 1],
    text: 'Из цикла выходит глюкоза — шесть атомов углерода из шести молекул CO₂. Часть её сразу превращается в крахмал и откладывается в строме.' },
  { title: 'Итог', dur: 0, led: [6, 6, 0, 0, 1],
    text: '6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂ — на свету и при участии хлорофилла. Световая фаза идёт на мембранах тилакоидов и даёт АТФ, НАДФ·Н₂ и кислород. Темновая идёт в строме и даёт глюкозу. Кислород берётся из воды, углерод — из углекислого газа.' },
];
const LEDGER = [['o2', 'O₂ выделено'], ['co2', 'CO₂ поглощено'], ['atp', 'АТФ в запасе'], ['nadph', 'НАДФ·Н₂ в запасе'], ['glu', 'Глюкоза']];
const HELP = {
  grana: ['Грана: световая фаза', 'На мембранах тилакоидов хлорофилл улавливает свет. Здесь расщепляется вода и образуются АТФ и НАДФ·Н₂. Подробно — в разделе «Световая фаза».'],
  wheel: ['Цикл Кальвина: темновая фаза', 'Круговая цепочка реакций в строме. Углекислый газ присоединяется к пятиуглеродному сахару, затем за счёт АТФ и НАДФ·Н₂ восстанавливается до сахара, а пятиуглеродный сахар образуется заново.'],
  pool: ['АТФ и НАДФ·Н₂', 'Продукты световой фазы. АТФ несёт энергию, НАДФ·Н₂ — водород. Без них темновая фаза невозможна, поэтому ночью синтез глюкозы быстро останавливается.'],
  starch: ['Крахмал', 'Запасной углевод растений. Глюкоза соединяется в длинные цепи и откладывается в хлоропласте в виде зёрен.'],
  light: ['Свет', 'Источник энергии для фотосинтеза. Нужен только световой фазе — но без её продуктов не пойдёт и темновая.'],
  out: ['Обмен газами', 'Углекислый газ попадает в лист через устьица, кислород через них же выходит наружу.'],
};

const H = 400;
const ease = k => k * k * (3 - 2 * k);
const lerp = (a, b, k) => a + (b - a) * k;
const mix = (p, q, k) => [lerp(p[0], q[0], k), lerp(p[1], q[1], k)];
const seg = (k, a, b) => Math.max(0, Math.min(1, (k - a) / (b - a)));

export function mount(root, api) {
  root.innerHTML = `
    <div class="sim">
      <div class="sim-stage"><canvas aria-label="Схема двух фаз фотосинтеза"></canvas></div>
      <div class="sim-panel">
        <div class="help" hidden></div>
        <div class="info"><p class="quest-count"></p><h3></h3><p class="step-text"></p>
          <div class="btn-row"><button class="btn ghost prev">Назад</button><button class="btn next">Дальше</button></div>
        </div>
        <div class="controls"><p class="group-title">Счётчики на одну молекулу глюкозы</p><div class="ledger">
          ${LEDGER.map(([k, n]) => `<div><img src="${molIcon(k)}" alt="" style="height:13px"><span>${n}</span><b data-led="${k}">0</b></div>`).join('')}
        </div></div>
      </div>
    </div>`;
  const $ = s => root.querySelector(s);
  const help = $('.help');
  let L = 600, A = {}, step = 0, k = 1, finished = false;

  function layout(newL) { L = newL; A = { gr: [L * 0.2, 252], pool: [L * 0.45, 250], K: [L * 0.72, 248], R: 56, starch: [L * 0.86, 322], sky: [L * 0.82, 40], skyL: [L * 0.1, 40] }; }

  function carbons(ctx, [x, y], n, ang = 0) {
    const gap = 9.6, dx = Math.cos(ang) * gap, dy = Math.sin(ang) * gap, x0 = x - dx * (n - 1) / 2, y0 = y - dy * (n - 1) / 2;
    ctx.strokeStyle = 'rgba(230,236,242,.8)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0 + dx * (n - 1), y0 + dy * (n - 1)); ctx.stroke();
    for (let i = 0; i < n; i++) put(ctx, mol('carbon'), x0 + dx * i + (i % 2 ? 1.5 : -1.5) * Math.sin(ang), y0 + dy * i + (i % 2 ? 2.5 : -2.5) * Math.cos(ang));
  }
  function shot(ctx, kind, from, to, t0, d = 0.3, size = 1) {
    const q = seg(k, t0, t0 + d); if (q <= 0 || q >= 1) return;
    const [x, y] = mix(from, to, ease(q)); ctx.globalAlpha = Math.min(1, q * 6, (1 - q) * 4); put(ctx, mol(kind), x, y - Math.sin(q * Math.PI) * 14, 0, size); ctx.globalAlpha = 1;
  }

  function draw(ctx, { t, dt, scale }) {
    const dur = STEPS[step].dur;
    if (dur && k < 1) { k = Math.min(1, k + dt / dur); if (k === 1) panel(); }
    const s = step, led = ledger(), lightOn = s >= 1;
    cytoplasm(ctx, L, H, t);
    // свет
    for (let i = 0; i < 4; i++) { const x = L * (0.08 + i * 0.13) + 40; const g = ctx.createLinearGradient(x, 0, x - 70, 230); const a = (lightOn ? 0.3 : 0.14) + Math.sin(t * 1.8 + i) * 0.05; g.addColorStop(0, `rgba(255,236,150,${a})`); g.addColorStop(1, 'rgba(255,236,150,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x - 10, 0); ctx.lineTo(x + 16, 0); ctx.lineTo(x - 60, 240); ctx.lineTo(x - 90, 240); ctx.fill(); }
    // хлоропласт: две мембраны и строма
    const box = (inset, r) => chaikin([[inset, H + 40], [inset, 96 + inset + r], [inset + r * 0.3, 96 + inset + r * 0.3], [inset + r, 96 + inset], [L - inset - r, 96 + inset], [L - inset - r * 0.3, 96 + inset + r * 0.3], [L - inset, 96 + inset + r], [L - inset, H + 40]], 2);
    const outer = box(14, 44), inner = box(28, 40);
    ctx.beginPath(); outer.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.fillStyle = '#254A2C'; ctx.fill();
    ctx.beginPath(); inner.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    const sg = ctx.createRadialGradient(L * 0.4, 200, 10, L * 0.5, 260, L * 0.7); sg.addColorStop(0, '#8FD877'); sg.addColorStop(0.55, '#5AAE56'); sg.addColorStop(1, '#3B8348'); ctx.fillStyle = sg; ctx.fill();
    ribbon(ctx, outer); ribbon(ctx, inner, false, 0.72);
    sceneLabel(ctx, 'Снаружи хлоропласта', L - 14, 18, scale, 'right'); sceneLabel(ctx, 'Строма', 44, H - 16, scale);

    // грана
    const [gx, gy] = A.gr, lit = (s === 1 || s === 2) && k < 1;
    if (lit) { const g = ctx.createRadialGradient(gx, gy, 0, gx, gy, 110); g.addColorStop(0, `rgba(255,240,150,${0.4 + Math.sin(t * 9) * 0.12})`); g.addColorStop(1, 'rgba(255,240,150,0)'); ctx.fillStyle = g; ctx.fillRect(gx - 110, gy - 110, 220, 220); }
    for (let j = 0; j < 6; j++) {
      const y = gy - 50 + j * 20, w = 104;
      const g = ctx.createLinearGradient(0, y - 8, 0, y + 8); g.addColorStop(0, '#49B866'); g.addColorStop(0.5, '#1E7A3A'); g.addColorStop(1, '#0F5226');
      ctx.fillStyle = g; roundRectPath(ctx, gx - w / 2, y - 8, w, 16, 8); ctx.fill(); ctx.strokeStyle = '#0B3F1D'; ctx.lineWidth = 1.2; ctx.stroke();
      ctx.strokeStyle = 'rgba(190,255,200,.45)'; ctx.beginPath(); ctx.moveTo(gx - w / 2 + 9, y - 3); ctx.lineTo(gx + w / 2 - 9, y - 3); ctx.stroke();
    }
    sceneLabel(ctx, 'грана', gx, gy + 78, scale, 'center');

    // цикл Кальвина
    const [kx, ky] = A.K, R = A.R, turning = (s === 3 || s === 4) && k < 1;
    ctx.lineWidth = 9; ctx.strokeStyle = 'rgba(255,255,255,.2)'; ctx.beginPath(); ctx.arc(kx, ky, R, 0, 7); ctx.stroke();
    if (turning) { ctx.strokeStyle = 'rgba(255,225,120,.9)'; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(kx, ky, R, -Math.PI / 2 + k * 6.283 * 2, -Math.PI / 2 + k * 6.283 * 2 + 1.6); ctx.stroke(); }
    for (let i = 0; i < 8; i++) ball(ctx, kx + Math.cos(i * 0.785 - 1.571) * R, ky + Math.sin(i * 0.785 - 1.571) * R, 3.2, '#F8EAC4');
    const fixed = s > 3 || (s === 3 && k > 0.5);
    carbons(ctx, [kx - 22, ky - R], fixed && s < 6 && !(s === 5 && k > 0.2) ? 3 : 5); if (fixed && s < 5) carbons(ctx, [kx + 22, ky - R], 3);
    sceneLabel(ctx, 'цикл Кальвина', kx, ky, scale, 'center');

    // запас АТФ и НАДФ·Н₂ между граной и циклом
    const [px, py] = A.pool, nA = Math.round(led[2] / 2), nN = Math.round(led[3] / 2);
    for (let i = 0; i < nA; i++) put(ctx, mol('atp'), px - 18 + (i % 2) * 36, py - 50 + Math.floor(i / 2) * 13, 0, 0.8);
    for (let i = 0; i < nN; i++) put(ctx, mol('nadph'), px - 14 + (i % 2) * 28, py + 26 + Math.floor(i / 2) * 14);
    if (nA + nN) sceneLabel(ctx, `АТФ ${led[2]}, НАДФ·Н₂ ${led[3]}`, px, py - 70, scale, 'center');

    if (s === 1) for (let i = 0; i < 6; i++) { shot(ctx, 'h2o', [gx - 96, gy + 60 - i * 12], [gx - 40, gy - 30 + i * 12], 0.02 + i * 0.12, 0.2, 1.3); shot(ctx, 'o2', [gx + 20, gy - 50], [A.skyL[0] + i * 26, A.skyL[1]], 0.16 + i * 0.13, 0.25); }
    if (s === 2) for (let i = 0; i < 7; i++) { shot(ctx, 'atp', [gx + 50, gy - 20], [px, py - 30], 0.05 + i * 0.12, 0.2, 0.8); shot(ctx, 'nadph', [gx + 50, gy + 20], [px, py + 40], 0.1 + i * 0.12, 0.2); }
    if (s === 3) for (let i = 0; i < 6; i++) shot(ctx, 'co2', [A.sky[0] - i * 22, A.sky[1]], [kx, ky - R], 0.02 + i * 0.13, 0.26);
    if (s === 4) for (let i = 0; i < 7; i++) { shot(ctx, 'atp', [px, py - 30], [kx - R, ky - 10], 0.03 + i * 0.12, 0.2, 0.8); shot(ctx, 'nadph', [px, py + 40], [kx - R, ky + 14], 0.08 + i * 0.12, 0.2);
      shot(ctx, 'adp', [kx - R * 0.6, ky + R], [gx + 56, gy + 44], 0.18 + i * 0.11, 0.24, 0.8); shot(ctx, 'nadp', [kx - R * 0.5, ky + R], [gx + 56, gy + 56], 0.22 + i * 0.11, 0.24); }
    // глюкоза и крахмал
    const [sx, sy] = A.starch;
    const wg = ctx.createRadialGradient(sx - 5, sy - 6, 2, sx, sy, 24); wg.addColorStop(0, '#FFFFFF'); wg.addColorStop(1, '#CFCBBE');
    ctx.fillStyle = wg; ctx.beginPath(); ctx.ellipse(sx, sy, 22, 15, -0.2, 0, 7); ctx.fill(); sceneLabel(ctx, 'крахмал', sx, sy - 26, scale, 'center');
    if (s === 5 && k < 1) { const q = seg(k, 0.2, 1), pos = mix([kx + 10, ky + R], [sx - 30, sy - 4], ease(q)); if (k > 0.2) { carbons(ctx, pos, 6); sceneLabel(ctx, 'глюкоза', pos[0], pos[1] - 16, scale, 'center'); } }
    if (s > 5 || (s === 5 && k >= 1)) { carbons(ctx, [sx - 62, sy - 4], 6); sceneLabel(ctx, 'глюкоза', sx - 62, sy - 20, scale, 'center'); }

    if ((draw.tick = (draw.tick || 0) + dt) > 0.1) { draw.tick = 0; led.forEach((v, i) => { const b = root.querySelector(`[data-led="${LEDGER[i][0]}"]`); if (b.textContent !== String(v)) b.textContent = v; }); }
  }

  function ledger() { const prev = STEPS[Math.max(0, step - 1)].led, cur = STEPS[step].led, m = STEPS[step].dur ? seg(k, 0.35, 1) : 1; return cur.map((v, i) => Math.round(lerp(prev[i], v, m))); }
  function panel() {
    const st = STEPS[step];
    $('.quest-count').textContent = step === 0 ? 'Начало' : step === STEPS.length - 1 ? 'Конец пути' : `Шаг ${step} из ${STEPS.length - 2}`;
    $('.info h3').textContent = st.title; $('.step-text').textContent = st.text;
    $('.prev').disabled = step === 0; $('.next').textContent = step === STEPS.length - 1 ? 'Пройти заново' : 'Дальше'; $('.next').disabled = k < 1;
    if (step === STEPS.length - 1 && !finished) { finished = true; api.emit('done', {}); }
  }
  function showHelp(key) { const g = HELP[key]; help.hidden = !g; if (g) help.innerHTML = `<button class="help-close" aria-label="Закрыть справку">×</button><b>${g[0]}</b><p>${g[1]}</p>`; }
  function onTap(x, y) {
    const near = ([px, py], r) => Math.hypot(px - x, py - y) < r;
    if (near(A.gr, 72)) return showHelp('grana'); if (near(A.K, A.R + 16)) return showHelp('wheel');
    if (near(A.pool, 60)) return showHelp('pool'); if (near(A.starch, 40) || near([A.starch[0] - 62, A.starch[1]], 34)) return showHelp('starch');
    showHelp(y < 100 ? (x < L * 0.5 ? 'light' : 'out') : null);
  }

  const stage = createStage($('canvas'), { logicalH: H, draw, onTap, onResize: layout });
  $('.next').addEventListener('click', () => { step = step === STEPS.length - 1 ? 0 : step + 1; k = STEPS[step].dur ? 0 : 1; showHelp(null); panel(); });
  $('.prev').addEventListener('click', () => { if (step > 0) { step--; k = 1; showHelp(null); panel(); } });
  help.addEventListener('click', e => { if (e.target.closest('.help-close')) showHelp(null); });
  panel();
  return { destroy() { stage.destroy(); root.innerHTML = ''; } };
}
