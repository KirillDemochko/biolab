import { createStage } from '../../js/core/canvas.js';
import { putAt, ball, backdrop, cytoplasm, sceneLabel, roundRectPath, shade } from '../_shared/art.js';

export const meta = { id: 'protein-synthesis', title: 'Биосинтез белка' };

// ——— генетический код ———
const B = ['U', 'C', 'A', 'G'];
const AAS = ('Фен Фен Лей Лей Сер Сер Сер Сер Тир Тир стоп стоп Цис Цис стоп Три ' + 'Лей Лей Лей Лей Про Про Про Про Гис Гис Глн Глн Арг Арг Арг Арг '
  + 'Иле Иле Иле Мет Тре Тре Тре Тре Асн Асн Лиз Лиз Сер Сер Арг Арг ' + 'Вал Вал Вал Вал Ала Ала Ала Ала Асп Асп Глу Глу Гли Гли Гли Гли').split(' ');
const CODE = {};
B.forEach((a, i) => B.forEach((b, j) => B.forEach((c, k) => { CODE[a + b + c] = AAS[i * 16 + j * 4 + k]; })));
const RU = { A: 'А', U: 'У', G: 'Г', C: 'Ц', T: 'Т' };
const COL = { A: '#3DB56E', U: '#F08B55', T: '#E5484D', G: '#4D9FEA', C: '#E0B020' };
const DNA_FOR = { A: 'T', U: 'A', G: 'C', C: 'G' };     // основание транскрибируемой цепи ДНК напротив основания иРНК
const PAIR = { A: 'U', U: 'A', G: 'C', C: 'G' };        // пары в РНК
const ru = s => [...s].map(ch => RU[ch]).join('');
const AA_COL = ['#E85D85', '#4D9FEA', '#3DB56E', '#F2B441', '#8E63D9', '#22B5A0', '#F08B55', '#C6E04A'];
const rnd = n => Math.floor(Math.random() * n);

function newGene() {
  const sense = Object.keys(CODE).filter(c => CODE[c] !== 'стоп' && c !== 'AUG'), stops = ['UAA', 'UAG', 'UGA'];
  const codons = ['AUG', sense[rnd(sense.length)], sense[rnd(sense.length)], sense[rnd(sense.length)], stops[rnd(3)]];
  const mrna = codons.join('');
  return { codons, mrna, tpl: [...mrna].map(b => DNA_FOR[b]).join(''), cod: mrna.replace(/U/g, 'T') };
}

const H = 340, EASE = k => k * k * (3 - 2 * k);

export function mount(root, api) {
  root.innerHTML = `
    <div class="sim">
      <div class="chips sim-modes" role="group" aria-label="Этап">
        <button class="chip" data-s="tx" aria-pressed="true">1. Транскрипция</button><button class="chip" data-s="tl" aria-pressed="false">2. Трансляция</button>
      </div>
      <div class="sim-stage"><canvas aria-label="Синтез иРНК на ДНК и синтез белка на рибосоме"></canvas></div>
      <div class="sim-panel">
        <div class="info">
          <h3 class="ps-title"></h3><p class="ps-text"></p>
          <div class="ps-picks" role="group" aria-label="Варианты"></div>
          <p class="ps-msg" role="status"></p>
          <div class="btn-row"><button class="btn ghost auto">Собрать автоматически</button><button class="btn ghost regen">Новый ген</button></div>
        </div>
        <div class="controls">
          <p class="group-title">Таблица генетического кода (иРНК)</p>
          <div class="code-table"></div>
          <p class="try">Первая буква кодона — строка, вторая — столбец, третья — внутри клетки.</p>
        </div>
      </div>
    </div>`;
  const $ = s => root.querySelector(s);
  const picks = $('.ps-picks'), msg = $('.ps-msg');
  let L = 600, G = newGene(), scene = 'tx', done = 0, polX = 0, auto = false, autoT = 0, shake = 0;
  let T = null;       // состояние трансляции

  $('.code-table').innerHTML = `<table><tr><th></th>${B.map(b => `<th>${RU[b]}</th>`).join('')}</tr>${B.map(a => `<tr><th>${RU[a]}</th>${B.map(b =>
    `<td>${B.map(c => `<span data-c="${a + b + c}"><i>${ru(a + b + c)}</i> ${CODE[a + b + c]}</span>`).join('')}</td>`).join('')}</tr>`).join('')}</table>`;

  const tw = () => Math.min(30, (L - 56) / G.mrna.length);
  const tx0 = () => (L - tw() * G.mrna.length) / 2;

  function resetTL() { T = { c: 0, scroll: 0, chain: [], anim: null, k: 0, leaving: null, finished: false, pendingStop: false }; }
  function resetAll(gene) { if (gene) G = newGene(); done = 0; auto = false; polX = tx0(); resetTL(); setScene('tx'); }

  // ——— рисование общих деталей ———
  function tile(ctx, base, x, y, w, alpha = 1, h = 26) {
    ctx.globalAlpha = alpha;
    const g = ctx.createLinearGradient(0, y - h / 2, 0, y + h / 2); g.addColorStop(0, shade(COL[base], 1.3)); g.addColorStop(1, shade(COL[base], 0.78));
    ctx.fillStyle = g; roundRectPath(ctx, x - w / 2 + 1.5, y - h / 2, w - 3, h, 6); ctx.fill();
    ctx.fillStyle = '#10212B'; ctx.font = `700 ${Math.min(16, w * 0.62)}px system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(RU[base], x, y + 1); ctx.globalAlpha = 1;
  }
  const strand = (ctx, x0, x1, y) => { ctx.strokeStyle = 'rgba(255,255,255,.3)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke(); };

  // ——— транскрипция ———
  function drawTx(ctx, t, dt, scale) {
    backdrop(ctx, L, H, H * 0.94, t);
    const w = tw(), x0 = tx0(), n = G.mrna.length, yC = 78, yT = 126, yR = 166;
    const target = x0 + (Math.min(done, n - 1) + 0.5) * w; polX += (target - polX) * Math.min(1, dt * 7);
    shake = Math.max(0, shake - dt * 3);
    sceneLabel(ctx, 'Ядро клетки', 14, 18, scale);
    putAt(ctx, 'rnap', polX + Math.sin(shake * 40) * shake * 6, yT + 6);
    const open = x => Math.max(0, 1 - Math.abs(x - polX) / (w * 3.2)) ** 0.8;
    ctx.strokeStyle = 'rgba(255,255,255,.3)'; ctx.lineWidth = 3;
    for (const [y, dir] of [[yC, -1], [yT, 1]]) { ctx.beginPath(); for (let x = x0 - 12; x <= x0 + n * w + 12; x += 6) ctx.lineTo(x, y + dir * open(x) * (dir < 0 ? 20 : 8)); ctx.stroke(); }
    for (let i = 0; i < n; i++) {
      const x = x0 + (i + 0.5) * w, o = open(x);
      tile(ctx, G.cod[i], x, yC - o * 20, w); tile(ctx, G.tpl[i], x, yT + o * 8, w);
      if (i === done && done < n) { ctx.strokeStyle = `rgba(255,255,255,${0.6 + Math.sin(t * 7) * 0.35})`; ctx.lineWidth = 2.5; roundRectPath(ctx, x - w / 2, yT + o * 8 - 15, w, 30, 7); ctx.stroke(); }
    }
    // иРНК: рядом с ферментом прижата к матрице, дальше отходит от неё
    for (let i = 0; i < done; i++) {
      const x = x0 + (i + 0.5) * w, away = Math.min(1, Math.max(0, (done - 1 - i - 2) / 4));
      tile(ctx, G.mrna[i], x, yR + open(x) * 8 + EASE(away) * 74, w);
    }
    if (done) { const y0 = yR + EASE(Math.min(1, Math.max(0, (done - 3) / 4))) * 74; sceneLabel(ctx, '5′', x0 - 12, y0, scale, 'center'); }
    sceneLabel(ctx, '5′', x0 - 12, yC, scale, 'center'); sceneLabel(ctx, '3′', x0 + n * w + 12, yC, scale, 'center');
    sceneLabel(ctx, '3′', x0 - 12, yT, scale, 'center'); sceneLabel(ctx, '5′', x0 + n * w + 12, yT, scale, 'center');
    sceneLabel(ctx, L > 560 ? 'ДНК: сверху смысловая цепь, снизу транскрибируемая' : 'ДНК: снизу транскрибируемая цепь', Math.max(14, x0 - 20), 44, scale);
    if (done) sceneLabel(ctx, 'иРНК', x0, H - 22, scale);
    if (L > 560) sceneLabel(ctx, 'РНК-полимераза', Math.min(Math.max(polX, 200), L - 70), 18, scale, 'center');
    if (auto && done < n && (autoT -= dt) <= 0) { autoT = 0.22; done++; if (done === n) { auto = false; panel(); } }
  }

  // ——— трансляция ———
  const TW = 30, MY = 262;
  const codonX = c => L * 0.46 + (c * 3 + 1.5) * TW - T.scroll;
  function drawTl(ctx, t, dt, scale) {
    cytoplasm(ctx, L, H, t);
    sceneLabel(ctx, 'Цитоплазма', 14, 18, scale);
    T.scroll += ((T.c - (T.anim ? 0 : 0)) * 3 * TW - T.scroll) * Math.min(1, dt * 5);
    const n = G.mrna.length, xa = codonX(T.c), split = T.finished ? Math.min(1, (T.k += dt / 1.2)) : 0;
    ctx.globalAlpha = 0.92; putAt(ctx, 'riboL', xa - TW * 1.5, MY - 96 - split * 40); ctx.globalAlpha = 1;
    putAt(ctx, 'riboS', xa - TW * 1.5, MY + 34 + split * 26);
    strand(ctx, codonX(0) - TW * 2.2, codonX(4) + TW * 2.2, MY);
    for (let i = 0; i < n; i++) tile(ctx, G.mrna[i], codonX(0) + (i - 1) * TW, MY, TW);
    sceneLabel(ctx, '5′', codonX(0) - TW * 2.4, MY, scale, 'center'); sceneLabel(ctx, '3′', codonX(4) + TW * 2.4, MY, scale, 'center');
    ctx.strokeStyle = `rgba(255,255,255,${0.55 + Math.sin(t * 6) * 0.3})`; ctx.lineWidth = 2.5;
    if (!T.finished) { roundRectPath(ctx, xa - TW * 1.5, MY - 16, TW * 3, 32, 8); ctx.stroke(); }

    const trna = (x, y, codon, alpha) => {
      ctx.globalAlpha = alpha; putAt(ctx, 'trna', x, y - 14);
      [...codon].forEach((b, i) => tile(ctx, PAIR[b], x + (i - 1) * TW, y, TW, alpha, 22)); ctx.globalAlpha = 1;
    };
    const chain = (x, y, list, alpha = 1) => {       // растущая цепочка аминокислот
      ctx.globalAlpha = alpha; ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 3; ctx.beginPath();
      const pos = list.map((_, i) => { const j = list.length - 1 - i; return [x - j * 19 - Math.sin(j * 0.5) * 6, y - j * 5 + Math.sin(j * 0.9 + t * 1.5) * 3]; });
      pos.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py))); ctx.stroke();
      list.forEach((a, i) => ball(ctx, pos[i][0], pos[i][1], 10.5, AA_COL[a.i % AA_COL.length]));
      ctx.globalAlpha = 1;
      if (list.length) sceneLabel(ctx, list[list.length - 1].name, pos[pos.length - 1][0], pos[pos.length - 1][1] - 20, scale, 'center');
    };
    const yA = MY - 30, top = yA - 14 - 92 + 4;
    if (T.leaving) { T.leaving.k += dt / 0.6; const q = EASE(Math.min(1, T.leaving.k)); trna(T.leaving.x - q * 70, yA - q * 80, T.leaving.codon, 1 - q); if (T.leaving.k >= 1) T.leaving = null; }
    if (T.anim) {                                  // новая тРНК входит в рибосому
      T.anim.k += dt / 0.55; const q = EASE(Math.min(1, T.anim.k));
      const x = xa + (1 - q) * 130, y = yA - (1 - q) * 120;
      if (T.c > 0) { trna(codonX(T.c - 1), yA, G.codons[T.c - 1], 1); chain(codonX(T.c - 1), top, T.chain); }
      trna(x, y, G.codons[T.c], 1); ball(ctx, x, y - 14 - 92 + 4, 10.5, AA_COL[T.anim.aa.i % AA_COL.length]);
      if (T.anim.k >= 1) {
        if (T.c > 0) T.leaving = { x: codonX(T.c - 1), codon: G.codons[T.c - 1], k: 0 };
        T.chain.push(T.anim.aa); T.anim = null; T.c++; panel();
      }
    } else if (T.c > 0 && !T.finished) { trna(codonX(T.c - 1), yA, G.codons[T.c - 1], 1); chain(codonX(T.c - 1), top, T.chain); }
    else if (T.finished) chain(codonX(T.c - 1) - split * 30, top - split * 40, T.chain);
    if (auto && !T.anim && !T.finished && (autoT -= dt) <= 0) { autoT = 0.5; pickTl(true); }
  }

  function draw(ctx, { t, dt, scale }) { (scene === 'tx' ? drawTx : drawTl)(ctx, t, dt, scale); }

  // ——— панель и ответы ———
  const proteinText = () => T.chain.map(a => a.name).join(' – ');
  function panel() {
    root.querySelectorAll('.code-table span').forEach(s => s.classList.remove('on'));
    const n = G.mrna.length;
    if (scene === 'tx') {
      $('.ps-title').textContent = done < n ? 'Достраивай иРНК' : 'иРНК готова';
      $('.ps-text').innerHTML = done < n
        ? `РНК-полимераза идёт по транскрибируемой цепи ДНК. Какой нуклеотид встанет в иРНК напротив подсвеченного основания <b>${RU[G.tpl[done]]}</b>?`
        : `Получилась иРНК: <code>5′-${ru(G.mrna)}-3′</code>. Она комплементарна транскрибируемой цепи и совпадает со смысловой, только вместо Т в ней У. Теперь иРНК выходит из ядра к рибосоме.`;
      picks.innerHTML = done < n ? B.map(b => `<button class="pick" data-b="${b}" style="--c:${COL[b]}">${RU[b]}</button>`).join('') : '<button class="btn to-tl">Перейти к трансляции</button>';
      $('.auto').hidden = done >= n;
    } else {
      const codon = G.codons[T.c];
      if (T.finished) {
        $('.ps-title').textContent = 'Белок готов';
        $('.ps-text').innerHTML = `Рибосома дошла до стоп-кодона, распалась на субъединицы и отпустила цепь: <b>${proteinText()}</b>. Три кодона — три аминокислоты после стартового Мет; стоп-кодон аминокислоту не кодирует.`;
        picks.innerHTML = ''; $('.auto').hidden = true; return;
      }
      $('.ps-title').textContent = `Кодон ${T.c + 1} из ${G.codons.length}: ${ru(codon)}`;
      $('.ps-text').innerHTML = `Рибосома читает иРНК по три нуклеотида. Какая тРНК подойдёт к кодону <code>5′-${ru(codon)}-3′</code>? Найди аминокислоту в таблице ниже и выбери антикодон.` + (T.chain.length ? ` Цепь сейчас: <b>${proteinText()}</b>.` : '');
      root.querySelector(`.code-table [data-c="${codon}"]`)?.classList.add('on');
      const right = [...codon].map(b => PAIR[b]).join(''), opts = new Set([right]);
      opts.add(codon); while (opts.size < 3) { const o = B[rnd(4)] + B[rnd(4)] + B[rnd(4)]; if (o !== right) opts.add(o); }
      const list = [...opts].sort(() => Math.random() - 0.5).map(o => `<button class="pick wide" data-a="${o}">3′-${ru(o)}-5′</button>`);
      list.push('<button class="pick wide" data-a="stop">Стоп-кодон: тРНК для него нет</button>');
      picks.innerHTML = list.join(''); $('.auto').hidden = false;
    }
  }
  function pickTx(b) {
    if (done >= G.mrna.length) return;
    if (b === G.mrna[done]) { done++; msg.textContent = ''; }
    else { shake = 1; msg.innerHTML = `<b class="bad">Не подходит.</b> В ДНК здесь ${RU[G.tpl[done]]}, а пары такие: А — У, Т — А, Г — Ц, Ц — Г.`; }
    panel();
  }
  function pickTl(force, a) {
    if (T.anim || T.finished) return;
    const codon = G.codons[T.c], right = [...codon].map(b => PAIR[b]).join(''), isStop = CODE[codon] === 'стоп';
    if (force) a = isStop ? 'stop' : right;
    if (isStop && a === 'stop') { T.finished = true; T.k = 0; auto = false; msg.innerHTML = `<b class="ok">Верно.</b> ${ru(codon)} — стоп-кодон: синтез окончен.`; panel(); api.emit('done', {}); return; }
    if (!isStop && a === right) {
      const name = CODE[codon]; T.anim = { k: 0, aa: { name, i: AAS.indexOf(name) } };
      msg.innerHTML = `<b class="ok">Верно.</b> Кодон 5′-${ru(codon)}-3′ — антикодон 3′-${ru(right)}-5′ (если писать от 5′-конца: ${ru([...right].reverse().join(''))}). Аминокислота: ${name}.`;
      picks.innerHTML = '';
    } else msg.innerHTML = `<b class="bad">Не подходит.</b> ${isStop ? 'Найди этот кодон в таблице: он не кодирует аминокислоту.' : a === 'stop' ? `Кодон ${ru(codon)} кодирует аминокислоту ${CODE[codon]}.` : 'Антикодон комплементарен кодону: А — У, Г — Ц.'}`;
  }
  function setScene(s) {
    scene = s; auto = false; msg.textContent = '';
    if (s === 'tl' && done < G.mrna.length) done = G.mrna.length;
    root.querySelectorAll('.sim-modes .chip').forEach(c => c.setAttribute('aria-pressed', c.dataset.s === s));
    panel();
  }

  const stage = createStage($('canvas'), { logicalH: H, draw, onResize(newL) { L = newL; polX = tx0() + (done + 0.5) * tw(); } });
  $('.sim-modes').addEventListener('click', e => { const b = e.target.closest('.chip'); if (b) setScene(b.dataset.s); });
  picks.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.classList.contains('to-tl')) return setScene('tl');
    if (b.dataset.b) pickTx(b.dataset.b); else if (b.dataset.a) pickTl(false, b.dataset.a);
  });
  $('.auto').addEventListener('click', () => { auto = true; autoT = 0; });
  $('.regen').addEventListener('click', () => resetAll(true));
  resetAll(false);
  return { destroy() { stage.destroy(); root.innerHTML = ''; } };
}
