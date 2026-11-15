import { createStage } from '../../js/core/canvas.js';
import { lipid, putAt, put, mol, molIcon, backdrop, sceneLabel, roundRectPath } from '../_shared/art.js';

export const meta = { id: 'mito-chain', title: 'Дыхательная цепь' };

const HELP = {
  c1: ['Комплекс I', 'Принимает два электрона от НАДН и перекачивает протоны из матрикса в межмембранное пространство.'],
  c2: ['Комплекс II', 'Принимает электроны от ФАДН₂. Протоны не перекачивает, поэтому ФАДН₂ даёт меньше АТФ, чем НАДН.'],
  q: ['Убихинон (кофермент Q)', 'Маленький жирорастворимый переносчик. Плавает внутри мембраны и возит электроны от комплексов I и II к комплексу III.'],
  c3: ['Комплекс III', 'Передаёт электроны на цитохром c и перекачивает протоны.'],
  cytc: ['Цитохром c', 'Небольшой белок на наружной стороне внутренней мембраны. Переносит электроны от комплекса III к комплексу IV.'],
  c4: ['Комплекс IV', 'Передаёт электроны кислороду: O₂ + 4e⁻ + 4H⁺ → 2H₂O. Тоже перекачивает протоны. Кислород — конечный акцептор электронов: без него вся цепь останавливается.'],
  synth: ['АТФ-синтаза', 'Протоны возвращаются в матрикс только через неё и вращают её ротор. Вращение заставляет головку фермента соединять АДФ и фосфат в АТФ. На модели на одну АТФ уходит три протона, в действительности — около четырёх.'],
  hp: ['Протон H⁺', 'Ион водорода. Цепь накапливает протоны в межмембранном пространстве. Их стремление вернуться в матрикс — это и есть запас энергии для синтеза АТФ.'],
  nadh: ['НАДН', 'Переносчик водорода (в школьных учебниках — НАД·Н₂). Приносит в цепь два электрона, отнятые у глюкозы в гликолизе и цикле Кребса, и превращается обратно в НАД⁺.'],
  fadh2: ['ФАДН₂', 'Ещё один переносчик водорода из цикла Кребса. Отдаёт электроны комплексу II, минуя комплекс I.'],
  o2: ['Кислород O₂', 'Конечный акцептор электронов. Именно здесь расходуется кислород, которым мы дышим.'],
  h2o: ['Вода H₂O', 'Конечный продукт дыхания: кислород принял электроны и протоны.'],
  atp: ['АТФ', 'Главный результат дыхания. Отсюда АТФ уходит в цитоплазму и питает все процессы в клетке.'],
  mem: ['Внутренняя мембрана митохондрии', 'Протоны сами через неё не проходят — только через АТФ-синтазу. Поэтому разница концентраций сохраняется и работает как заряженная батарейка.'],
  ims: ['Межмембранное пространство', 'Сюда перекачиваются протоны. Чем их здесь больше, тем сильнее они «давят» на АТФ-синтазу.'],
  matrix: ['Матрикс', 'Здесь идёт цикл Кребса, который поставляет в цепь НАДН и ФАДН₂. Сюда же обращена головка АТФ-синтазы.'],
};

const H = 390, M = 158, RATE = [0, 2.0, 1.0, 0.5], BASE = 6;
const rnd = (a, b) => a + Math.random() * (b - a);
const ease = k => k * k * (3 - 2 * k);
const lerp = (a, b, k) => a + (b - a) * k;

export function mount(root, api) {
  root.innerHTML = `
    <div class="sim">
      <div class="sim-stage"><canvas aria-label="Дыхательная цепь на внутренней мембране митохондрии"></canvas></div>
      <div class="sim-panel">
        <div class="help" hidden></div>
        <div class="controls">
          <label class="range"><span>Подача НАДН из цикла Кребса</span>
            <input type="range" min="0" max="3" value="2" data-key="supply" aria-label="Подача НАДН">
            <span class="ends"><span>нет</span><span>много</span></span>
          </label>
          <label class="switch"><input type="checkbox" checked data-key="o2"> <span>Кислород есть</span></label>
          <p class="readout"></p>
          <p class="try">Выключи кислород и посмотри, что станет с цепью и с АТФ. Нажми на любой белок или молекулу — появится справка.</p>
        </div>
        <div class="info">
          <h3>Что здесь происходит</h3>
          <ul class="steps">
            <li>НАДН и ФАДН₂ отдают электроны в цепь.</li>
            <li>Электроны идут по комплексам, а те на их энергии перекачивают протоны H⁺ через мембрану.</li>
            <li>В конце электроны принимает кислород — образуется вода.</li>
            <li>Протоны возвращаются через АТФ-синтазу, и она синтезирует АТФ.</li>
          </ul>
          <div class="legend">
            ${[['nadh', 'НАДН'], ['fadh2', 'ФАДН₂'], ['hp', 'протон H⁺'], ['o2', 'O₂'], ['h2o', 'вода'], ['atp', 'АТФ']].map(([k, n]) => `<span><img src="${molIcon(k)}" alt="" style="height:12px">${n}</span>`).join('')}
          </div>
        </div>
        <button class="btn ghost restart">Начать заново</button>
      </div>
    </div>`;
  const $ = s => root.querySelector(s);
  const help = $('.help'), readout = $('.readout');
  const P = { supply: 2, o2: true };
  let L = 600, X = {}, S = null, done = false;

  function reset() {
    S = { tokens: [], hTop: [], fly: [], wait: [], supplyT: 0.3, n: 0, o2: 0, o2coming: false, rot: 0, rotT: 0, h: 0, cool: 0, atp: 0, water: 0, glow: 0, picked: null };
    for (let i = 0; i < BASE; i++) S.hTop.push(walker(rnd(20, L - 20), rnd(20, M - 60)));
  }
  const walker = (x, y) => { const a = rnd(0, 6.28); return { x, y, vx: Math.cos(a) * 60, vy: Math.sin(a) * 60 }; };
  const occ = stage => S.tokens.filter(t => t.stage === stage).length;
  const fly = (kind, from, to, dur, onEnd, opts = {}) => S.fly.push({ kind, from, to, dur, k: -(opts.delay || 0) / dur, onEnd, fade: opts.fade, label: opts.label });

  function pump(x, n) {
    for (let i = 0; i < n; i++) {
      const px = x + (i - (n - 1) / 2) * 9;
      fly('hp', [px, M + 46], [px + rnd(-6, 6), M - 52 - rnd(0, 26)], 0.42, f => S.hTop.push(walker(f.to[0], f.to[1])), { delay: i * 0.05 });
    }
  }

  function step(dt) {
    // подача переносчиков: три НАДН, затем один ФАДН₂ — как в цикле Кребса
    if (P.supply && (S.supplyT -= dt) <= 0) {
      const kind = S.n % 4 === 3 ? 'fadh2' : 'nadh', same = S.wait.filter(w => w.kind === kind).length;
      if (same < (kind === 'nadh' ? 2 : 1)) {
        const tx = kind === 'nadh' ? X.c1 + 18 + same * 26 : X.c2 + 2, ty = kind === 'nadh' ? M + 118 + same * 16 : M + 76;
        S.wait.push({ kind, x: tx + rnd(-30, 60), y: H + 14, tx, ty, ready: false }); S.n++;
      }
      S.supplyT = RATE[P.supply];
    }
    for (const w of S.wait) {
      w.x += (w.tx - w.x) * Math.min(1, dt * 5); w.y += (w.ty - w.y) * Math.min(1, dt * 5);
      w.ready = Math.hypot(w.tx - w.x, w.ty - w.y) < 3;
    }
    // переносчик отдаёт электроны комплексу и улетает обратно окисленным
    for (const kind of ['nadh', 'fadh2']) {
      const stage = kind === 'nadh' ? 'I' : 'II', w = S.wait.find(w => w.kind === kind && w.ready);
      if (w && !occ(stage)) {
        S.wait.splice(S.wait.indexOf(w), 1);
        S.wait.filter(o => o.kind === kind).forEach((o, i) => { if (kind === 'nadh') { o.tx = X.c1 + 18 + i * 26; o.ty = M + 118 + i * 16; } });
        S.tokens.push({ stage, k: 0 });
        fly('nad', [w.x, w.y], [w.x - 50, H + 20], 0.7, null, { fade: true });
      }
    }
    for (const t of S.tokens) {
      if (t.stage === 'I') { if ((t.k += dt / 0.3) >= 1 && occ('Q') < 2) { pump(X.c1, 4); t.stage = 'Q'; t.k = 0; t.from = X.c1 + 32; } }
      else if (t.stage === 'II') { if ((t.k += dt / 0.3) >= 1 && occ('Q') < 2) { t.stage = 'Q'; t.k = 0; t.from = X.c2 + 16; } }
      else if (t.stage === 'Q') { if ((t.k = Math.min(1, t.k + dt / 0.4)) >= 1 && !occ('III')) { t.stage = 'III'; t.k = 0; } }
      else if (t.stage === 'III') { if ((t.k += dt / 0.3) >= 1 && !occ('c')) { pump(X.c3, 4); t.stage = 'c'; t.k = 0; } }
      else if (t.stage === 'c') { if ((t.k = Math.min(1, t.k + dt / 0.35)) >= 1 && !occ('IV')) { t.stage = 'IV'; t.k = 0; } }
      else if (t.stage === 'IV' && S.o2 > 0) {
        if ((t.k += dt / 0.3) >= 1) {
          pump(X.c4, 2); S.o2--; S.water++; t.stage = 'done';
          fly('h2o', [X.c4 + 8, M + 58], [X.c4 + 46, H - 16], 0.8, null, { fade: true });
        }
      }
    }
    S.tokens = S.tokens.filter(t => t.stage !== 'done');
    // кислород подходит к комплексу IV; одной молекулы хватает на две пары электронов
    if (P.o2 && S.o2 === 0 && !S.o2coming) {
      S.o2coming = true;
      fly('o2', [X.c4 + rnd(30, 90), H + 12], [X.c4, M + 62], 0.45, () => { S.o2 = 2; S.o2coming = false; });
    }
    // протоны в межмембранном пространстве
    for (const p of S.hTop) {
      p.vx += rnd(-1, 1) * 200 * dt; p.vy += rnd(-1, 1) * 200 * dt;
      const v = Math.hypot(p.vx, p.vy) || 1; p.vx *= 60 / v; p.vy *= 60 / v;
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.x < 8) { p.x = 8; p.vx = Math.abs(p.vx); } if (p.x > L - 8) { p.x = L - 8; p.vx = -Math.abs(p.vx); }
      if (p.y < 12) { p.y = 12; p.vy = Math.abs(p.vy); } if (p.y > M - 50) { p.y = M - 50; p.vy = -Math.abs(p.vy); }
    }
    // АТФ-синтаза: чем больше протонов накопилось, тем чаще они проходят
    const excess = S.hTop.length - BASE; S.cool -= dt;
    if (excess > 0 && S.cool <= 0) {
      const gate = [X.syn + 24, M - 46];
      const p = S.hTop.reduce((a, b) => (Math.hypot(b.x - gate[0], b.y - gate[1]) < Math.hypot(a.x - gate[0], a.y - gate[1]) ? b : a));
      S.hTop.splice(S.hTop.indexOf(p), 1);
      fly('hp', [p.x, p.y], gate, Math.max(0.1, Math.hypot(p.x - gate[0], p.y - gate[1]) / 420), () => {
        fly('hp', gate, [X.syn + 24, M + 46], 0.22, () => {
          S.rotT += 2 * Math.PI / 9; S.h++;
          fly('hp', [X.syn + 24, M + 46], [X.syn + 50 + rnd(0, 30), M + 100], 0.5, null, { fade: true });
          if (S.h % 3 === 0) { S.atp++; S.glow = 1; fly('atp', [X.syn - 10, M + 140], [X.syn - 80, H - 14], 0.9, null, { fade: true, label: 'АТФ' }); }
        });
      });
      S.cool = Math.max(0.05, Math.min(0.4, 0.5 / excess));
    }
    S.rot += (S.rotT - S.rot) * Math.min(1, dt * 10);
    S.glow = Math.max(0, S.glow - dt * 2.5);
    for (const f of S.fly) { f.k += dt / f.dur; if (f.k >= 1 && !f.ended) { f.ended = true; f.onEnd?.(f); } }
    S.fly = S.fly.filter(f => !f.ended);
    if (!done && S.atp >= 10 && !P.o2) { done = true; api.emit('done', {}); }
  }

  function tokenPos(t) {
    if (t.stage === 'I') return [lerp(X.c1 + 14, X.c1, ease(Math.min(1, t.k))), lerp(M + 96, M, ease(Math.min(1, t.k)))];
    if (t.stage === 'II') return [X.c2, lerp(M + 56, M + 6, ease(Math.min(1, t.k)))];
    if (t.stage === 'Q') return [lerp(t.from, X.c3 - 26, ease(t.k)), M + Math.sin(t.k * Math.PI) * 7];
    if (t.stage === 'III') return [lerp(X.c3 - 26, X.c3 + 22, ease(Math.min(1, t.k))), lerp(M, M - 48, ease(Math.min(1, t.k)))];
    if (t.stage === 'c') return [lerp(X.c3 + 24, X.c4 - 10, ease(t.k)), M - 56 - Math.sin(t.k * Math.PI) * 6];
    return [X.c4, lerp(M - 48, M + 30, ease(Math.min(1, t.k)))];
  }

  function draw(ctx, { t, dt, scale }) {
    step(dt);
    backdrop(ctx, L, H, M, t);
    sceneLabel(ctx, 'Межмембранное пространство', 14, 18, scale);
    sceneLabel(ctx, 'Матрикс', 14, H - 16, scale);
    sceneLabel(ctx, `H⁺ здесь: ${S.hTop.length}`, L - 14, 18, scale, 'right');

    const zones = [[X.c1, 36], [X.c2, 19], [X.c3, 31], [X.c4, 28], [X.syn + 10, 36]];
    for (let x = 7.5, i = 0; x < L + 8; x += 15, i++) {
      if (zones.some(([zx, half]) => Math.abs(x - zx) < half)) continue;
      const wob = Math.sin(t * 2.4 + i * 1.9) * 2;
      lipid(ctx, x, M - 30, 1, wob, 22, 6.2); lipid(ctx, x, M + 30, -1, wob, 22, 6.2);
    }

    // АТФ-синтаза: кольцо-ротор в мембране, ось и головка в матриксе
    putAt(ctx, 'stator', X.syn + 36, M);
    const ring = [];
    for (let i = 0; i < 10; i++) { const a = S.rot + i * Math.PI / 5; ring.push([Math.sin(a), Math.cos(a)]); }
    ring.sort((a, b) => a[1] - b[1]);
    for (const [sx, cz] of ring) {
      ctx.save(); ctx.translate(X.syn + sx * 19, 0); ctx.scale(0.45 + 0.55 * Math.abs(cz), 1); ctx.globalAlpha = cz < 0 ? 0.45 : 1;
      putAt(ctx, 'cring', 0, M); ctx.restore();
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#8A4F26'; roundRectPath(ctx, X.syn - 5 + Math.sin(S.rot * 3) * 2.5, M + 36, 10, 40, 5); ctx.fill();
    if (S.glow > 0) {
      const g = ctx.createRadialGradient(X.syn, M + 104, 0, X.syn, M + 104, 70);
      g.addColorStop(0, `rgba(255,225,120,${S.glow * 0.8})`); g.addColorStop(1, 'rgba(255,225,120,0)');
      ctx.fillStyle = g; ctx.fillRect(X.syn - 70, M + 34, 140, 140);
    }
    putAt(ctx, 'f1', X.syn, M + 104);

    putAt(ctx, 'c1', X.c1, M); putAt(ctx, 'c2', X.c2, M); putAt(ctx, 'c3', X.c3, M); putAt(ctx, 'c4', X.c4, M);
    sceneLabel(ctx, 'I', X.c1 - 8, M - 56, scale, 'center'); sceneLabel(ctx, 'II', X.c2, M - 56, scale, 'center');
    sceneLabel(ctx, 'III', X.c3, M - 76, scale, 'center'); sceneLabel(ctx, 'IV', X.c4, M - 80, scale, 'center');
    sceneLabel(ctx, 'АТФ-синтаза', Math.min(X.syn + 8, L - 62), M - 58, scale, 'center');

    // переносчики электронов: Q в мембране, цитохром c на её поверхности
    const onQ = S.tokens.filter(k => k.stage === 'Q'), onC = S.tokens.filter(k => k.stage === 'c');
    if (!onQ.length) put(ctx, mol('q'), X.c2 + 44, M + Math.sin(t * 2) * 4, t * 0.6);
    if (!onC.length) putAt(ctx, 'cytc', X.c3 + 26 + Math.sin(t * 1.5) * 3, M - 56);
    for (const k of S.tokens) {
      const [x, y] = tokenPos(k);
      if (k.stage === 'Q') put(ctx, mol('q'), x, y, t * 2);
      if (k.stage === 'c') putAt(ctx, 'cytc', x, y);
      const g = ctx.createRadialGradient(x, y, 0, x, y, 11);          // пара электронов
      g.addColorStop(0, 'rgba(255,255,255,.95)'); g.addColorStop(0.35, 'rgba(120,235,255,.8)'); g.addColorStop(1, 'rgba(120,235,255,0)');
      ctx.fillStyle = g; ctx.fillRect(x - 11, y - 11, 22, 22);
    }
    if (S.o2 > 0) put(ctx, mol('o2'), X.c4, M + 62, t);
    if (!P.o2 && occ('IV')) sceneLabel(ctx, 'нет O₂ — электронам некуда идти', Math.max(120, Math.min(X.c4, L - 130)), M + 84, scale, 'center');

    for (const w of S.wait) { put(ctx, mol(w.kind), w.x, w.y); sceneLabel(ctx, w.kind === 'nadh' ? 'НАДН' : 'ФАДН₂', w.x + 16, w.y, scale); }
    for (const f of S.fly) {
      if (f.k < 0) continue;
      const k = ease(Math.min(1, f.k)), x = lerp(f.from[0], f.to[0], k), y = lerp(f.from[1], f.to[1], k);
      ctx.globalAlpha = f.fade ? 1 - k * k : 1;
      put(ctx, mol(f.kind), x, y, f.kind === 'o2' || f.kind === 'h2o' ? t * 2 : 0);
      if (f.label) sceneLabel(ctx, f.label, x + 22, y, scale);
      if (f.kind === 'nad') sceneLabel(ctx, 'НАД⁺', x + 14, y, scale);
    }
    ctx.globalAlpha = 1;
    for (const p of S.hTop) put(ctx, mol('hp'), p.x, p.y);
    if ((draw.tick = (draw.tick || 0) + dt) > 0.25) { draw.tick = 0; updateReadout(); }
  }

  function updateReadout() {
    const stuck = !P.o2 && occ('IV');
    const s = (!P.supply ? 'НАДН не поступает: окислять нечего, цепь простаивает. '
      : stuck ? 'Без кислорода электронам некуда уходить: цепь встала, протоны больше не перекачиваются, АТФ не образуется. '
      : S.hTop.length > BASE + 3 ? 'Цепь работает: протоны накапливаются сверху и возвращаются через АТФ-синтазу. ' : '')
      + `Получено АТФ: ${S.atp}, воды: ${S.water}.`;
    if (readout.textContent !== s) readout.textContent = s;
  }

  function showHelp(key) {
    const g = HELP[key]; help.hidden = !g;
    if (g) help.innerHTML = `<button class="help-close" aria-label="Закрыть справку">×</button><b>${g[0]}</b><p>${g[1]}</p>`;
  }
  function onTap(x, y) {
    const near = (px, py, r = 16) => Math.hypot(px - x, py - y) < r;
    const w = S.wait.find(w => near(w.x + 6, w.y, 20)); if (w) return showHelp(w.kind);
    const f = S.fly.find(f => f.k > 0 && near(lerp(f.from[0], f.to[0], ease(Math.min(1, f.k))), lerp(f.from[1], f.to[1], ease(Math.min(1, f.k))), 18));
    if (f && HELP[f.kind]) return showHelp(f.kind);
    if (S.o2 > 0 && near(X.c4, M + 62)) return showHelp('o2');
    if (near(X.c2 + 44, M, 14) || S.tokens.some(k => k.stage === 'Q' && near(...tokenPos(k), 14))) return showHelp('q');
    if (near(X.c3 + 26, M - 56, 14) || S.tokens.some(k => k.stage === 'c' && near(...tokenPos(k), 14))) return showHelp('cytc');
    const dy = y - M;
    if (Math.abs(x - X.c1) < 36 && dy > -44 && dy < 106) return showHelp('c1');
    if (Math.abs(x - X.c2) < 22 && dy > -26 && dy < 62) return showHelp('c2');
    if (Math.abs(x - X.c3) < 31 && Math.abs(dy) < 62) return showHelp('c3');
    if (Math.abs(x - X.c4) < 28 && Math.abs(dy) < 56) return showHelp('c4');
    if (x > X.syn - 42 && x < X.syn + 46 && dy > -42 && dy < 142) return showHelp('synth');
    if (S.hTop.some(p => near(p.x, p.y, 13))) return showHelp('hp');
    showHelp(Math.abs(dy) < 38 ? 'mem' : dy < 0 ? 'ims' : 'matrix');
  }

  const stage = createStage($('canvas'), {
    logicalH: H, draw, onTap,
    onResize(newL) { L = newL; X = { c1: L * 0.11, c2: L * 0.27, c3: L * 0.43, c4: L * 0.61, syn: L * 0.84 }; reset(); },
  });
  root.addEventListener('input', e => {
    const key = e.target.dataset?.key; if (!key) return;
    P[key] = key === 'o2' ? e.target.checked : +e.target.value;
    if (key === 'supply') S.supplyT = Math.min(S.supplyT, 0.2);
  });
  help.addEventListener('click', e => { if (e.target.closest('.help-close')) showHelp(null); });
  $('.restart').addEventListener('click', reset);

  return { destroy() { stage.destroy(); root.innerHTML = ''; } };
}
