import { createStage } from '../../js/core/canvas.js';
import { lipid, putAt, put, mol, molIcon, backdrop, sceneLabel, roundRectPath } from '../_shared/art.js';

export const meta = { id: 'chloro-light', title: 'Световая фаза' };

const HELP = {
  ps2: ['Фотосистема II', 'Белковый комплекс с хлорофиллом. Свет выбивает из хлорофилла электроны, и они уходят в цепь переноса. Недостающие электроны фотосистема забирает у воды: 2H₂O → O₂ + 4H⁺ + 4e⁻. Это фотолиз воды — отсюда берётся кислород, которым мы дышим.'],
  pq: ['Пластохинон', 'Маленький переносчик внутри мембраны. Возит электроны от фотосистемы II к комплексу цитохромов.'],
  b6f: ['Комплекс цитохромов', 'Передаёт электроны дальше и на их энергии перекачивает протоны из стромы в полость тилакоида.'],
  pc: ['Пластоцианин', 'Небольшой белок в полости тилакоида. Переносит электроны от цитохромов к фотосистеме I.'],
  ps1: ['Фотосистема I', 'Второй комплекс с хлорофиллом. Свет ещё раз возбуждает электроны, и они идут на восстановление НАДФ⁺: получается НАДФ·Н₂ — переносчик водорода для темновой фазы.'],
  synth: ['АТФ-синтаза', 'Тот же фермент, что и в митохондрии. Протоны выходят через неё из полости тилакоида в строму, вращают ротор, и головка фермента синтезирует АТФ. Синтез АТФ за счёт света называют фотофосфорилированием.'],
  hp: ['Протон H⁺', 'Протоны накапливаются в полости тилакоида: их поставляют фотолиз воды и работа цитохромов. Их стремление выйти в строму — запас энергии для синтеза АТФ.'],
  photon: ['Квант света', 'Порция световой энергии. Хлорофилл лучше всего поглощает красные и сине-фиолетовые лучи, а зелёные отражает — поэтому листья зелёные.'],
  h2o: ['Вода H₂O', 'Источник электронов и протонов для световой фазы. При её расщеплении выделяется кислород.'],
  o2: ['Кислород O₂', 'Побочный продукт фотолиза воды. Весь кислород, выделяемый при фотосинтезе, берётся из воды, а не из углекислого газа.'],
  nadph: ['НАДФ·Н₂', 'Переносчик водорода (в биохимии его записывают как НАДФН). Вместе с АТФ уходит в строму, где нужен для синтеза глюкозы.'],
  atp: ['АТФ', 'Вместе с НАДФ·Н₂ — главный результат световой фазы. В темновой фазе вся эта АТФ тратится на синтез глюкозы.'],
  mem: ['Мембрана тилакоида', 'В неё встроены хлорофилл, белки-переносчики и АТФ-синтаза. Для протонов мембрана непроницаема — они проходят только через АТФ-синтазу.'],
  stroma: ['Строма', 'Сюда выходят АТФ и НАДФ·Н₂. Здесь же, в строме, они будут использованы в темновой фазе.'],
  lumen: ['Полость тилакоида', 'Внутреннее пространство тилакоида. На свету здесь накапливаются протоны, поэтому среда становится кислой.'],
};

const H = 400, M = 196, RATE = [0, 1.7, 0.85, 0.42], BASE = 6;
const rnd = (a, b) => a + Math.random() * (b - a);
const ease = k => k * k * (3 - 2 * k);
const lerp = (a, b, k) => a + (b - a) * k;

export function mount(root, api) {
  root.innerHTML = `
    <div class="sim">
      <div class="sim-stage"><canvas aria-label="Световая фаза фотосинтеза на мембране тилакоида"></canvas></div>
      <div class="sim-panel">
        <div class="help" hidden></div>
        <div class="controls">
          <label class="range"><span>Яркость света</span>
            <input type="range" min="0" max="3" value="2" aria-label="Яркость света">
            <span class="ends"><span>темно</span><span>ярко</span></span>
          </label>
          <p class="readout"></p>
          <p class="try">Убери свет и посмотри, что остановится. Нажми на любой белок или молекулу — появится справка.</p>
        </div>
        <div class="info">
          <h3>Что здесь происходит</h3>
          <ul class="steps">
            <li>Свет выбивает электроны из хлорофилла фотосистемы II.</li>
            <li>Фотосистема возвращает их себе, расщепляя воду: выделяется кислород.</li>
            <li>Электроны идут по цепи; протоны накапливаются в полости тилакоида.</li>
            <li>Фотосистема I на свету передаёт электроны на НАДФ⁺: получается НАДФ·Н₂.</li>
            <li>Протоны выходят через АТФ-синтазу, и она синтезирует АТФ.</li>
          </ul>
          <div class="legend">
            ${[['h2o', 'вода'], ['o2', 'O₂'], ['hp', 'протон H⁺'], ['nadph', 'НАДФ·Н₂'], ['atp', 'АТФ']].map(([k, n]) => `<span><img src="${molIcon(k)}" alt="" style="height:12px">${n}</span>`).join('')}
          </div>
        </div>
        <button class="btn ghost restart">Начать заново</button>
      </div>
    </div>`;
  const $ = s => root.querySelector(s);
  const help = $('.help'), readout = $('.readout');
  let light = 2, L = 600, X = {}, S = null, wasDark = false, done = false;

  const walker = (x, y) => { const a = rnd(0, 6.28); return { x, y, vx: Math.cos(a) * 60, vy: Math.sin(a) * 60 }; };
  function reset() {
    S = { tokens: [], h: [], fly: [], rays: [], t2: 0.2, n: 0, rot: 0, rotT: 0, hc: 0, cool: 0, atp: 0, nadph: 0, o2: 0, glow: 0, g2: 0, g1: 0 };
    for (let i = 0; i < BASE; i++) S.h.push(walker(rnd(20, L - 20), rnd(M + 60, H - 20)));
  }
  const occ = st => S.tokens.filter(t => t.stage === st).length;
  const fly = (kind, from, to, dur, onEnd, o = {}) => S.fly.push({ kind, from, to, dur, k: -(o.delay || 0) / dur, onEnd, fade: o.fade, label: o.label });
  const ray = (x, onEnd) => S.rays.push({ x0: x - 70, x1: x, k: 0, onEnd });
  const intoLumen = (x, n, fromTop) => { for (let i = 0; i < n; i++) { const px = x + (i - (n - 1) / 2) * 9; fly('hp', [px, fromTop ? M - 46 : M + 52], [px + rnd(-8, 8), M + 66 + rnd(0, 40)], fromTop ? 0.42 : 0.3, f => S.h.push(walker(f.to[0], f.to[1])), { delay: i * 0.05 }); } };

  function step(dt) {
    // свет возбуждает фотосистему II: рождается пара электронов, вода расщепляется
    if (light && (S.t2 -= dt) <= 0 && !occ('II') && occ('PQ') < 2 && !S.rays.some(r => r.x1 === X.ps2)) {
      S.t2 = RATE[light];
      ray(X.ps2, () => {
        S.g2 = 1; S.tokens.push({ stage: 'II', k: 0 }); S.n++;
        fly('h2o', [X.ps2 - 46, H - 10], [X.ps2 - 4, M + 60], 0.3, () => intoLumen(X.ps2 + 6, 2, false));
        if (S.n % 2 === 0) { S.o2++; fly('o2', [X.ps2 - 10, M + 62], [X.ps2 - 60, H + 10], 0.9, null, { fade: true, label: 'O₂' }); }
      });
    }
    for (const t of S.tokens) {
      if (t.stage === 'II') { if ((t.k += dt / 0.3) >= 1 && occ('PQ') < 2) { t.stage = 'PQ'; t.k = 0; } }
      else if (t.stage === 'PQ') { if ((t.k = Math.min(1, t.k + dt / 0.4)) >= 1 && !occ('b6f')) { t.stage = 'b6f'; t.k = 0; } }
      else if (t.stage === 'b6f') { if ((t.k += dt / 0.3) >= 1 && !occ('PC')) { intoLumen(X.b6f, 4, true); t.stage = 'PC'; t.k = 0; } }
      else if (t.stage === 'PC') { if ((t.k = Math.min(1, t.k + dt / 0.35)) >= 1 && !occ('I')) { t.stage = 'I'; t.k = 0; t.lit = false; } }
      else if (t.stage === 'I') {
        if (!t.asked && light) { t.asked = true; ray(X.ps1, () => { t.lit = true; S.g1 = 1; }); }
        if (!light) t.asked = false;
        if (t.lit && (t.k += dt / 0.3) >= 1) { t.stage = 'done'; S.nadph++; fly('nadph', [X.ps1 + 14, M - 78], [X.ps1 + 80, 12], 0.9, null, { fade: true, label: 'НАДФ·Н₂' }); }
      }
    }
    S.tokens = S.tokens.filter(t => t.stage !== 'done');
    for (const r of S.rays) { r.k += dt / 0.3; if (r.k >= 1 && !r.ended) { r.ended = true; r.onEnd(); } }
    S.rays = S.rays.filter(r => !r.ended);
    for (const p of S.h) {
      p.vx += rnd(-1, 1) * 200 * dt; p.vy += rnd(-1, 1) * 200 * dt;
      const v = Math.hypot(p.vx, p.vy) || 1; p.vx *= 60 / v; p.vy *= 60 / v; p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.x < 8) { p.x = 8; p.vx = Math.abs(p.vx); } if (p.x > L - 8) { p.x = L - 8; p.vx = -Math.abs(p.vx); }
      if (p.y < M + 52) { p.y = M + 52; p.vy = Math.abs(p.vy); } if (p.y > H - 12) { p.y = H - 12; p.vy = -Math.abs(p.vy); }
    }
    const excess = S.h.length - BASE; S.cool -= dt;
    if (excess > 0 && S.cool <= 0) {
      const gate = [X.syn + 24, M + 48], p = S.h.reduce((a, b) => (Math.hypot(b.x - gate[0], b.y - gate[1]) < Math.hypot(a.x - gate[0], a.y - gate[1]) ? b : a));
      S.h.splice(S.h.indexOf(p), 1);
      fly('hp', [p.x, p.y], gate, Math.max(0.1, Math.hypot(p.x - gate[0], p.y - gate[1]) / 420), () => fly('hp', gate, [X.syn + 24, M - 48], 0.22, () => {
        S.rotT += 2 * Math.PI / 9; S.hc++;
        fly('hp', [X.syn + 24, M - 48], [X.syn + 56 + rnd(0, 26), M - 96], 0.5, null, { fade: true });
        if (S.hc % 3 === 0) { S.atp++; S.glow = 1; fly('atp', [X.syn - 10, M - 142], [X.syn - 84, 14], 0.9, null, { fade: true, label: 'АТФ' }); }
      }));
      S.cool = Math.max(0.05, Math.min(0.4, 0.5 / excess));
    }
    S.rot += (S.rotT - S.rot) * Math.min(1, dt * 10);
    for (const key of ['glow', 'g1', 'g2']) S[key] = Math.max(0, S[key] - dt * 2.5);
    for (const f of S.fly) { f.k += dt / f.dur; if (f.k >= 1 && !f.ended) { f.ended = true; f.onEnd?.(f); } }
    S.fly = S.fly.filter(f => !f.ended);
    if (!light) wasDark = true;
    if (!done && wasDark && S.atp >= 8) { done = true; api.emit('done', {}); }
  }

  function tokenPos(t) {
    const k = ease(Math.min(1, t.k));
    if (t.stage === 'II') return [X.ps2, lerp(M + 30, M - 6, k)];
    if (t.stage === 'PQ') return [lerp(X.ps2 + 34, X.b6f - 24, k), M + Math.sin(k * Math.PI) * 7];
    if (t.stage === 'b6f') return [lerp(X.b6f - 24, X.b6f + 22, k), lerp(M, M + 46, k)];
    if (t.stage === 'PC') return [lerp(X.b6f + 24, X.ps1 - 12, k), M + 60 + Math.sin(k * Math.PI) * 6];
    return [X.ps1, lerp(M + 46, M - 56, k)];
  }
  const halo = (ctx, x, y, r, a, col = '255,240,140') => { const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, `rgba(${col},${a})`); g.addColorStop(1, `rgba(${col},0)`); ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2); };

  function draw(ctx, { t, dt, scale }) {
    step(dt);
    backdrop(ctx, L, H, M, t);
    if (light) for (let i = 0; i < 4; i++) { const x = L * (0.2 + i * 0.26); const g = ctx.createLinearGradient(x, 0, x - 60, 120); g.addColorStop(0, `rgba(255,236,150,${0.05 * light})`); g.addColorStop(1, 'rgba(255,236,150,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x - 14, 0); ctx.lineTo(x + 20, 0); ctx.lineTo(x - 50, 130); ctx.lineTo(x - 84, 130); ctx.fill(); }
    sceneLabel(ctx, 'Строма', 14, 18, scale); sceneLabel(ctx, 'Полость тилакоида', 14, H - 16, scale);
    sceneLabel(ctx, `H⁺ в полости: ${S.h.length}`, L - 14, 18, scale, 'right');
    const zones = [[X.ps2, 36], [X.b6f, 27], [X.ps1, 34], [X.syn + 10, 36]];
    for (let x = 7.5, i = 0; x < L + 8; x += 15, i++) {
      if (zones.some(([zx, half]) => Math.abs(x - zx) < half)) continue;
      const wob = Math.sin(t * 2.4 + i * 1.9) * 2; lipid(ctx, x, M - 30, 1, wob, 22, 6.2); lipid(ctx, x, M + 30, -1, wob, 22, 6.2);
    }
    // АТФ-синтаза: головка смотрит в строму, поэтому рисуем её зеркально относительно мембраны
    ctx.save(); ctx.translate(0, 2 * M); ctx.scale(1, -1);
    putAt(ctx, 'stator', X.syn + 36, M);
    const ring = []; for (let i = 0; i < 10; i++) { const a = S.rot + i * Math.PI / 5; ring.push([Math.sin(a), Math.cos(a)]); }
    ring.sort((a, b) => a[1] - b[1]);
    for (const [sx, cz] of ring) { ctx.save(); ctx.translate(X.syn + sx * 19, 0); ctx.scale(0.45 + 0.55 * Math.abs(cz), 1); ctx.globalAlpha = cz < 0 ? 0.45 : 1; putAt(ctx, 'cring', 0, M); ctx.restore(); }
    ctx.globalAlpha = 1; ctx.fillStyle = '#8A4F26'; roundRectPath(ctx, X.syn - 5 + Math.sin(S.rot * 3) * 2.5, M + 36, 10, 40, 5); ctx.fill();
    putAt(ctx, 'f1', X.syn, M + 104); ctx.restore();
    if (S.glow > 0) halo(ctx, X.syn, M - 104, 70, S.glow * 0.8);

    putAt(ctx, 'ps2', X.ps2, M); putAt(ctx, 'b6f', X.b6f, M); putAt(ctx, 'ps1', X.ps1, M);
    if (S.g2 > 0) halo(ctx, X.ps2, M, 60, S.g2 * 0.7); if (S.g1 > 0) halo(ctx, X.ps1, M, 60, S.g1 * 0.7);
    const wide = L > 640;
    sceneLabel(ctx, wide ? 'фотосистема II' : 'ФС II', Math.max(X.ps2, 40), M - 70, scale, 'center'); sceneLabel(ctx, 'цитохромы', X.b6f, M - 72, scale, 'center');
    sceneLabel(ctx, wide ? 'фотосистема I' : 'ФС I', X.ps1, M - 92, scale, 'center'); sceneLabel(ctx, 'АТФ-синтаза', Math.min(X.syn + 8, L - 62), M + 62, scale, 'center');

    const onQ = S.tokens.filter(k => k.stage === 'PQ'), onC = S.tokens.filter(k => k.stage === 'PC');
    if (!onQ.length) put(ctx, mol('q'), (X.ps2 + X.b6f) / 2, M + Math.sin(t * 2) * 4, t * 0.6);
    if (!onC.length) putAt(ctx, 'pc', X.b6f + 26 + Math.sin(t * 1.5) * 3, M + 60);
    for (const k of S.tokens) {
      const [x, y] = tokenPos(k);
      if (k.stage === 'PQ') put(ctx, mol('q'), x, y, t * 2);
      if (k.stage === 'PC') putAt(ctx, 'pc', x, y);
      halo(ctx, x, y, 11, 0.95, '150,240,255'); halo(ctx, x, y, 4, 1, '255,255,255');
    }
    if (!light && occ('I')) sceneLabel(ctx, 'нет света', X.ps1, M + 84, scale, 'center');
    // кванты света
    for (const r of S.rays) {
      const k = Math.max(0, r.k), x = lerp(r.x0, r.x1, k), y = lerp(-10, M - 40, k);
      ctx.strokeStyle = 'rgba(255,240,140,.95)'; ctx.lineWidth = 2.4; ctx.lineCap = 'round'; ctx.beginPath();
      for (let s = 0; s <= 30; s += 2) { const px = x - s * 0.55, py = y - s; ctx.lineTo(px + Math.sin(s * 0.8 + t * 30) * 3.5, py); }
      ctx.stroke(); halo(ctx, x, y, 12, 0.8);
    }
    for (const f of S.fly) {
      if (f.k < 0) continue;
      const k = ease(Math.min(1, f.k)), x = lerp(f.from[0], f.to[0], k), y = lerp(f.from[1], f.to[1], k);
      ctx.globalAlpha = f.fade ? 1 - k * k : 1; put(ctx, mol(f.kind), x, y, f.kind === 'o2' || f.kind === 'h2o' ? t * 2 : 0, f.kind === 'h2o' ? 1.3 : 1);
      if (f.label) sceneLabel(ctx, f.label, x + 20, y, scale);
    }
    ctx.globalAlpha = 1;
    for (const p of S.h) put(ctx, mol('hp'), p.x, p.y);
    if ((draw.tick = (draw.tick || 0) + dt) > 0.25) {
      draw.tick = 0;
      const s = (!light ? 'В темноте хлорофилл не возбуждается: электроны не идут, вода не расщепляется, АТФ и НАДФ·Н₂ не образуются. ' : S.h.length > BASE + 3 ? 'Свет есть: вода расщепляется, протоны копятся в полости и выходят через АТФ-синтазу. ' : '')
        + `Получено АТФ: ${S.atp}, НАДФ·Н₂: ${S.nadph}, выделено O₂: ${S.o2}.`;
      if (readout.textContent !== s) readout.textContent = s;
    }
  }

  function showHelp(key) { const g = HELP[key]; help.hidden = !g; if (g) help.innerHTML = `<button class="help-close" aria-label="Закрыть справку">×</button><b>${g[0]}</b><p>${g[1]}</p>`; }
  function onTap(x, y) {
    const near = (px, py, r = 16) => Math.hypot(px - x, py - y) < r, dy = y - M;
    const f = S.fly.find(f => f.k > 0 && HELP[f.kind] && near(lerp(f.from[0], f.to[0], ease(Math.min(1, f.k))), lerp(f.from[1], f.to[1], ease(Math.min(1, f.k))), 18));
    if (f) return showHelp(f.kind);
    if (S.rays.some(r => near(lerp(r.x0, r.x1, r.k), lerp(-10, M - 40, r.k), 24))) return showHelp('photon');
    if (near((X.ps2 + X.b6f) / 2, M, 14) || S.tokens.some(k => k.stage === 'PQ' && near(...tokenPos(k), 14))) return showHelp('pq');
    if (near(X.b6f + 26, M + 60, 14) || S.tokens.some(k => k.stage === 'PC' && near(...tokenPos(k), 14))) return showHelp('pc');
    if (Math.abs(x - X.ps2) < 36 && dy > -60 && dy < 70) return showHelp('ps2');
    if (Math.abs(x - X.b6f) < 27 && Math.abs(dy) < 60) return showHelp('b6f');
    if (Math.abs(x - X.ps1) < 34 && dy > -72 && dy < 58) return showHelp('ps1');
    if (x > X.syn - 42 && x < X.syn + 46 && dy < 42 && dy > -142) return showHelp('synth');
    if (S.h.some(p => near(p.x, p.y, 13))) return showHelp('hp');
    showHelp(Math.abs(dy) < 38 ? 'mem' : dy < 0 ? (y < 60 && light ? 'photon' : 'stroma') : 'lumen');
  }

  const stage = createStage($('canvas'), { logicalH: H, draw, onTap, onResize(newL) { L = newL; X = { ps2: L * 0.13, b6f: L * 0.37, ps1: L * 0.6, syn: L * 0.84 }; reset(); } });
  $('input[type=range]').addEventListener('input', e => { light = +e.target.value; S.t2 = Math.min(S.t2, 0.2); });
  help.addEventListener('click', e => { if (e.target.closest('.help-close')) showHelp(null); });
  $('.restart').addEventListener('click', reset);
  return { destroy() { stage.destroy(); root.innerHTML = ''; } };
}
