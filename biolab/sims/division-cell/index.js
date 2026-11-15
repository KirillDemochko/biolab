import { createStage } from '../../js/core/canvas.js';
import { cytoplasm, ball, shade } from '../_shared/art.js';

export const meta = { id: 'division-cell', title: 'Митоз и мейоз' };

const H = 360, CY = 180, PI = Math.PI;
const MAT = '#E85D85', PAT = '#4D9FEA';
const IDS = ['A1', 'A2', 'a1', 'a2', 'B1', 'B2', 'b1', 'b2'];
const ease = k => k * k * (3 - 2 * k);
const lerp = (a, b, k) => a + (b - a) * k;

// ——— раскладка хромосом по фазам ———
// Каждая хроматида: положение центромеры, поворот, изгиб плеч (v), видимость (on), степень спирализации (cond), полюс веретена.
function layouts(L) {
  const cx = L / 2, s = Math.min(L * 0.25, 132), R1 = Math.min(118, L * 0.3), r2 = Math.min(94, s * 0.72), r4 = Math.min(60, s * 0.46);
  const one = (r = R1, e = 0) => [[cx - e, r], [cx - e, r], [cx + e, r], [cx + e, r]].map(([x, rr]) => ({ x, y: CY, r: rr }));
  const two = [-s, -s, s, s].map(d => ({ x: cx + d, y: CY, r: r2 }));
  const four = [-1.5, -0.5, 0.5, 1.5].map(d => ({ x: cx + d * s, y: CY, r: r4 }));
  const nuc = (cells, r, a) => cells.map(c => ({ x: c.x, y: c.y, r, a }));
  const S = () => ({});
  // хромосома из двух сестринских хроматид
  const chr = (st, name, x, y, o = {}) => {
    const { rot = -PI / 2, v = 0, cond = 1, sis = 1, poles = [-1, -1], gap = 4.6 } = o, nx = Math.cos(rot + PI / 2), ny = Math.sin(rot + PI / 2);
    st[name + '1'] = { x: x - nx * gap * sis, y: y - ny * gap * sis, rot: rot - 0.13 * sis, v, on: 1, cond, pole: poles[0] };
    st[name + '2'] = { x: x + nx * gap * sis, y: y + ny * gap * sis, rot: rot + 0.13 * sis, v, on: sis ? 1 : 0, cond, pole: poles[1] };
  };
  const one1 = (st, id, x, y, o = {}) => { st[id] = { x, y, rot: -PI / 2, v: 0, on: 1, cond: 1, pole: -1, ...o }; };
  const SC = { A: [-30, -26, 0.5], a: [24, -32, -0.9], B: [-22, 30, 1.2], b: [32, 22, -0.4] };
  const scatter = (st, o, k = 1) => Object.entries(SC).forEach(([n, [dx, dy, rot]]) => chr(st, n, cx + dx * k, CY + dy * k, { rot, ...o }));
  const P = (a, b, c, d, al = 1) => [a, b, c, d].map(([x, y]) => ({ x, y, a: al }));
  const top = [cx, CY - R1 + 22], pl = [cx - R1 + 20, CY], pr = [cx + R1 - 20, CY];

  const mitosis = [];
  { const st = S(); scatter(st, { cond: 0, sis: 0 }, 0.8); mitosis.push({ ch: st, cells: one(), nuc: nuc(one(), 84, 1), poles: P(top, top, top, top), sp: 0 }); }
  { const st = S(); scatter(st, { cond: 0.12 }, 0.8); mitosis.push({ ch: st, cells: one(), nuc: nuc(one(), 84, 1), poles: P([cx - 9, top[1]], top, top, [cx + 9, top[1]]), sp: 0 }); }
  { const st = S(); scatter(st, { cond: 1 }, 0.9); mitosis.push({ ch: st, cells: one(), nuc: nuc(one(), 84, 0.25), poles: P([cx - 70, CY - 62], pl, pr, [cx + 70, CY - 62]), sp: 0.25 }); }
  { const st = S(); ['A', 'B', 'a', 'b'].forEach((n, i) => chr(st, n, cx, CY + [-60, -20, 22, 62][i], { poles: [0, 3] })); mitosis.push({ ch: st, cells: one(), nuc: nuc(one(), 74, 0), poles: P(pl, pl, pr, pr), sp: 1 }); }
  { const st = S(); ['A', 'B', 'a', 'b'].forEach((n, i) => { const y = CY + [-52, -18, 18, 52][i]; one1(st, n + '1', cx - 60, y, { v: 1, pole: 0 }); one1(st, n + '2', cx + 60, y, { v: -1, pole: 3 }); });
    mitosis.push({ ch: st, cells: one(R1 - 8, 26), nuc: nuc(one(), 60, 0), poles: P([pl[0] - 22, CY], pl, pr, [pr[0] + 22, CY]), sp: 1 }); }
  { const st = S(); ['A', 'a', 'B', 'b'].forEach((n, i) => { const [dx, dy, rot] = Object.values(SC)[i]; one1(st, n + '1', cx - s + dx * 0.45, CY + dy * 0.45, { rot, cond: 0.45 }); one1(st, n + '2', cx + s + dx * 0.45, CY + dy * 0.45, { rot, cond: 0.45 }); });
    mitosis.push({ ch: st, cells: two, nuc: nuc(two, 58, 1), poles: P([cx - s, CY - 66], [cx - s, CY - 66], [cx + s, CY - 66], [cx + s, CY - 66], 0.7), sp: 0 }); }

  const meiosis = [];
  { const st = S(); scatter(st, { cond: 0.12 }, 0.8); meiosis.push({ ch: st, cells: one(), nuc: nuc(one(), 84, 1), poles: P([cx - 9, top[1]], top, top, [cx + 9, top[1]]), sp: 0 }); }
  { const st = S(); chr(st, 'A', cx - 36, CY - 26, { rot: -PI / 2 + 0.1 }); chr(st, 'a', cx - 16, CY - 26, { rot: -PI / 2 + 0.1 }); chr(st, 'b', cx + 18, CY + 30, { rot: -PI / 2 - 0.25 }); chr(st, 'B', cx + 38, CY + 30, { rot: -PI / 2 - 0.25 });
    meiosis.push({ ch: st, cells: one(), nuc: nuc(one(), 74, 0.25), poles: P([cx - 70, CY - 62], pl, pr, [cx + 70, CY - 62]), sp: 0.25, cross: 1 }); }
  { const st = S(); chr(st, 'A', cx - 11, CY - 32, { poles: [0, 0] }); chr(st, 'a', cx + 11, CY - 32, { poles: [3, 3] }); chr(st, 'b', cx - 11, CY + 32, { poles: [0, 0] }); chr(st, 'B', cx + 11, CY + 32, { poles: [3, 3] });
    meiosis.push({ ch: st, cells: one(), nuc: nuc(one(), 74, 0), poles: P(pl, pl, pr, pr), sp: 1, cross: 1 }); }
  { const st = S(); chr(st, 'A', cx - 60, CY - 30, { v: 0.6, poles: [0, 0] }); chr(st, 'a', cx + 60, CY - 30, { v: -0.6, poles: [3, 3] }); chr(st, 'b', cx - 60, CY + 30, { v: 0.6, poles: [0, 0] }); chr(st, 'B', cx + 60, CY + 30, { v: -0.6, poles: [3, 3] });
    meiosis.push({ ch: st, cells: one(R1 - 8, 26), nuc: nuc(one(), 60, 0), poles: P([pl[0] - 22, CY], pl, pr, [pr[0] + 22, CY]), sp: 1, cross: 1 }); }
  const II = (cond, na, sp, pol) => { const st = S(); chr(st, 'A', cx - s, CY - 22, { cond, poles: [0, 1] }); chr(st, 'b', cx - s, CY + 24, { cond, poles: [0, 1] }); chr(st, 'a', cx + s, CY - 22, { cond, poles: [2, 3] }); chr(st, 'B', cx + s, CY + 24, { cond, poles: [2, 3] });
    return { ch: st, cells: two, nuc: nuc(two, 60, na), poles: pol, sp, cross: 1 }; };
  const side = r2 - 18, polII = P([cx - s - side, CY], [cx - s + side, CY], [cx + s - side, CY], [cx + s + side, CY]);
  meiosis.push(II(0.6, 0.9, 0, P([cx - s, CY - 66], [cx - s, CY - 66], [cx + s, CY - 66], [cx + s, CY - 66], 0.7)));
  meiosis.push(II(1, 0.2, 0.25, P([cx - s - 40, CY - 50], [cx - s + 40, CY - 50], [cx + s - 40, CY - 50], [cx + s + 40, CY - 50])));
  meiosis.push(II(1, 0, 1, polII));
  { const st = S(); [['A', -s, -20, 0], ['b', -s, 22, 0], ['a', s, -20, 2], ['B', s, 22, 2]].forEach(([n, d, dy, p0]) => { one1(st, n + '1', cx + d - 36, CY + dy, { v: 1, pole: p0 }); one1(st, n + '2', cx + d + 36, CY + dy, { v: -1, pole: p0 + 1 }); });
    meiosis.push({ ch: st, cells: [-s - 16, -s + 16, s - 16, s + 16].map(d => ({ x: cx + d, y: CY, r: r2 - 6 })), nuc: nuc(two, 40, 0), poles: polII, sp: 1, cross: 1 }); }
  { const st = S(); [['A', 0, -12, 0.25], ['b', 0, 14, 2.9], ['a', 2, -12, 0.25], ['B', 2, 14, 2.9]].forEach(([n, c0, dy, rot]) => { one1(st, n + '1', four[c0].x, CY + dy, { rot, cond: 0.6 }); one1(st, n + '2', four[c0 + 1].x, CY + dy, { rot, cond: 0.6 }); });
    meiosis.push({ ch: st, cells: four, nuc: nuc(four, 44, 1), poles: P(...four.map(c => [c.x, CY - 44]), 0.6), sp: 0, cross: 1 }); }
  return { mitosis, meiosis };
}

const PHASES = {
  mitosis: [
    ['Интерфаза: до удвоения ДНК', '2n2c', 'Клетка растёт и работает. Хромосомы раскручены в тонкие нити, каждая состоит из одной молекулы ДНК. На модели две пары хромосом: розовые достались от матери, синие — от отца.'],
    ['Интерфаза: после удвоения ДНК', '2n4c', 'ДНК удвоилась. Каждая хромосома теперь состоит из двух сестринских хроматид, соединённых центромерой. Хромосом столько же, а молекул ДНК вдвое больше.'],
    ['Профаза', '2n4c', 'Хромосомы спирализуются и становятся заметными. Ядерная оболочка растворяется, центриоли расходятся к полюсам, начинает собираться веретено деления.'],
    ['Метафаза', '2n4c', 'Хромосомы выстраиваются на экваторе клетки. Нити веретена прикреплены к центромерам. В этой фазе хромосомы видны лучше всего — по ним считают кариотип.'],
    ['Анафаза', '4n4c', 'Центромеры делятся, сестринские хроматиды расходятся к полюсам и становятся самостоятельными хромосомами. В клетке на короткое время вдвое больше хромосом; у каждого полюса — 2n2c.'],
    ['Телофаза', '2n2c', 'Хромосомы раскручиваются, вокруг них образуются ядерные оболочки, цитоплазма делится. Получились две клетки, генетически одинаковые между собой и с материнской клеткой.', 'в каждой клетке'],
  ],
  meiosis: [
    ['Интерфаза', '2n4c', 'Перед мейозом, как и перед митозом, ДНК удваивается: каждая хромосома состоит из двух хроматид.'],
    ['Профаза I', '2n4c', 'Гомологичные хромосомы сближаются — это конъюгация. Образуются пары (биваленты), и хромосомы обмениваются участками — происходит кроссинговер. Посмотри на кончики длинных хромосом: они поменялись цветами.'],
    ['Метафаза I', '2n4c', 'На экваторе выстраиваются не отдельные хромосомы, а пары гомологов. Какая хромосома пары окажется с какой стороны — дело случая.'],
    ['Анафаза I', '2n4c', 'К полюсам расходятся целые хромосомы из двух хроматид: центромеры не делятся. Это редукционное деление: у каждого полюса оказывается n2c.'],
    ['Телофаза I', 'n2c', 'Образуются две клетки с гаплоидным набором: в каждой по одной хромосоме из пары, но каждая хромосома всё ещё из двух хроматид.', 'в каждой клетке'],
    ['Профаза II', 'n2c', 'ДНК перед вторым делением не удваивается. Ядерные оболочки снова растворяются, собирается веретено.', 'в каждой клетке'],
    ['Метафаза II', 'n2c', 'Хромосомы выстраиваются на экваторе каждой клетки — как в митозе, только хромосом вдвое меньше.', 'в каждой клетке'],
    ['Анафаза II', '2n2c', 'Центромеры делятся, хроматиды расходятся к полюсам. В каждой клетке на время 2n2c; у каждого полюса — nc.', 'в каждой клетке'],
    ['Телофаза II', 'nc', 'Образуются четыре гаплоидные клетки. Благодаря кроссинговеру и случайному расхождению хромосом все они генетически разные.', 'в каждой клетке'],
  ],
};
const SETS = [[4, 'как на модели'], [8, 'дрозофила'], [14, 'горох'], [46, 'человек']];
const HELP = {
  chr2: ['Хромосома из двух хроматид', 'После удвоения ДНК хромосома состоит из двух одинаковых сестринских хроматид, соединённых центромерой. Это по-прежнему одна хромосома, но две молекулы ДНК.'],
  chr1: ['Хромосома из одной хроматиды', 'Одна хромосома — одна молекула ДНК. Так хромосомы выглядят после расхождения хроматид и до следующего удвоения ДНК.'],
  pole: ['Центриоли и веретено деления', 'Центриоли расходятся к полюсам клетки. От них тянутся нити веретена — микротрубочки, которые прикрепляются к центромерам и растаскивают хромосомы.'],
  nuc: ['Ядро', 'В интерфазе хромосомы находятся в ядре в раскрученном виде. В начале деления ядерная оболочка растворяется, в телофазе образуется заново.'],
};

export function mount(root, api) {
  root.innerHTML = `
    <div class="sim">
      <div class="chips sim-modes" role="group" aria-label="Вид деления">
        <button class="chip" data-m="mitosis" aria-pressed="true">Митоз</button><button class="chip" data-m="meiosis" aria-pressed="false">Мейоз</button>
      </div>
      <div class="sim-stage"><canvas aria-label="Клетка в процессе деления"></canvas></div>
      <div class="sim-panel">
        <div class="help" hidden></div>
        <div class="info">
          <p class="quest-count"></p>
          <h3></h3>
          <p class="formula"><b></b><span></span></p>
          <p class="phase-text"></p>
          <div class="btn-row"><button class="btn ghost prev">Назад</button><button class="btn next">Дальше</button><button class="btn ghost play">Показать всё подряд</button></div>
        </div>
        <div class="controls">
          <p class="group-title">Пересчитать для другого организма</p>
          <div class="chips sets">${SETS.map(([n, who], i) => `<button class="chip" data-n="${n}" aria-pressed="${i === 0}">2n = ${n}<small>${who}</small></button>`).join('')}</div>
          <p class="readout"></p>
        </div>
      </div>
    </div>`;
  const $ = s => root.querySelector(s);
  const help = $('.help');
  let L = 600, LAY = null, mode = 'mitosis', i = 0, from = 0, k = 1, n2 = 4, playing = false, pause = 0;
  const seen = new Set();

  const cur = () => {
    const a = LAY[mode][from], b = LAY[mode][i], q = ease(k), mixO = (x, y, keys) => Object.fromEntries(keys.map(key => [key, lerp(x[key], y[key], q)]));
    const ch = {};
    for (const id of IDS) ch[id] = { ...mixO(a.ch[id], b.ch[id], ['x', 'y', 'rot', 'v', 'on', 'cond']), pole: q > 0.5 ? b.ch[id].pole : a.ch[id].pole };
    return { ch, cells: a.cells.map((c, j) => mixO(c, b.cells[j], ['x', 'y', 'r'])), nuc: a.nuc.map((c, j) => mixO(c, b.nuc[j], ['x', 'y', 'r', 'a'])),
      poles: a.poles.map((c, j) => mixO(c, b.poles[j], ['x', 'y', 'a'])), sp: lerp(a.sp, b.sp, q), cross: lerp(a.cross || 0, b.cross || 0, q) };
  };

  function chromatid(ctx, id, c, t, cross) {
    if (c.on < 0.03) return;
    const long = id[0] === 'A' || id[0] === 'a', own = id[0] === id[0].toUpperCase() ? MAT : PAT, other = own === MAT ? PAT : MAT;
    const ext = 1 + (1 - c.cond) * 0.3, w = 2.6 + c.cond * 5, amp = (1 - c.cond) * 5, arms = long ? [25, 15] : [14, 9];
    const swap = cross > 0.5 && (id === 'A2' || id === 'a1');
    ctx.globalAlpha = c.on; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const arm = (len, dir, k0, k1, col) => {
      const pts = [];
      for (let s = k0; s <= k1 + 0.001; s += 0.1) {
        const d = len * ext * s, off = Math.sin(s * 7 + id.charCodeAt(0) + id.charCodeAt(1) * 2 + t * 0.8) * amp * s;
        pts.push([c.x + Math.cos(dir) * d - Math.sin(dir) * off, c.y + Math.sin(dir) * d + Math.cos(dir) * off]);
      }
      for (const [col2, ww] of [[shade(col, 0.5), w + 2], [col, w], [shade(col, 1.45), w * 0.3]]) {
        ctx.strokeStyle = col2; ctx.lineWidth = ww; ctx.beginPath(); pts.forEach(([x, y], j) => (j ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke();
      }
    };
    arm(arms[1], c.rot + PI - c.v, 0, 1, own);
    arm(arms[0], c.rot + c.v, 0, swap ? 0.58 : 1, own);
    if (swap) arm(arms[0], c.rot + c.v, 0.58, 1, other);
    ctx.globalAlpha = 1;
  }

  function draw(ctx, { t, dt }) {
    if (!LAY) return;
    if (k < 1) { k = Math.min(1, k + dt / 1.1); if (k === 1) { pause = 1.1; update(); } }
    else if (playing && (pause -= dt) <= 0) { if (i < PHASES[mode].length - 1) go(i + 1); else { playing = false; update(); } }
    const st = cur();
    cytoplasm(ctx, L, H, t);
    // клетки: обводим все круги и заливаем поверх — остаётся общий контур, поэтому перетяжка получается сама
    for (const [col, w] of [['#7C4E0E', 13], ['#F5A524', 9.5], ['#F8EAC4', 3]]) { ctx.strokeStyle = col; ctx.lineWidth = w; for (const c of st.cells) { ctx.beginPath(); ctx.arc(c.x, c.y, c.r, 0, 7); ctx.stroke(); } }
    ctx.fillStyle = '#1F5262'; for (const c of st.cells) { ctx.beginPath(); ctx.arc(c.x, c.y, c.r - 1.2, 0, 7); ctx.fill(); }
    for (const c of st.nuc) if (c.a > 0.02) {
      ctx.globalAlpha = c.a; ctx.fillStyle = 'rgba(170,150,235,.25)'; ctx.beginPath(); ctx.arc(c.x, c.y, c.r, 0, 7); ctx.fill();
      ctx.setLineDash([6, 4]); ctx.strokeStyle = 'rgba(215,205,255,.9)'; ctx.lineWidth = 2; ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
    }
    // веретено
    if (st.sp > 0.02) {
      ctx.lineWidth = 1.1;
      for (const id of IDS) { const c = st.ch[id]; if (c.pole < 0 || c.on < 0.5) continue; const p = st.poles[c.pole];
        ctx.strokeStyle = `rgba(255,255,255,${0.45 * st.sp})`; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(c.x, c.y); ctx.stroke(); }
      for (const [a, b] of [[0, 1], [2, 3], [0, 3]]) { const p = st.poles[a], q = st.poles[b]; if (Math.hypot(p.x - q.x, p.y - q.y) < 40 || (a === 0 && b === 3 && Math.hypot(st.poles[1].x - p.x, st.poles[1].y - p.y) > 40)) continue;
        ctx.strokeStyle = `rgba(255,255,255,${0.16 * st.sp})`; for (const o of [-26, 0, 26]) { ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.quadraticCurveTo((p.x + q.x) / 2, (p.y + q.y) / 2 + o * 1.6, q.x, q.y); ctx.stroke(); } }
    }
    for (const p of st.poles) if (p.a > 0.02) {
      ctx.globalAlpha = p.a; ctx.strokeStyle = 'rgba(255,220,130,.5)'; ctx.lineWidth = 1;
      for (let j = 0; j < 8; j++) { ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + Math.cos(j * 0.785) * 9, p.y + Math.sin(j * 0.785) * 9); ctx.stroke(); }
      ball(ctx, p.x, p.y, 3.6, '#FFD166'); ctx.globalAlpha = 1;
    }
    for (const id of IDS) chromatid(ctx, id, st.ch[id], t, st.cross);
    // центромера там, где сестринские хроматиды ещё вместе
    for (const n of ['A', 'a', 'B', 'b']) { const p = st.ch[n + '1'], q = st.ch[n + '2']; if (q.on > 0.5 && Math.hypot(p.x - q.x, p.y - q.y) < 12 && p.cond > 0.5) ball(ctx, (p.x + q.x) / 2, (p.y + q.y) / 2, 3.3, '#FFF4CF'); }
  }

  function update() {
    const ph = PHASES[mode], [name, f, text, per] = ph[i];
    $('.quest-count').textContent = `${mode === 'mitosis' ? 'Митоз' : 'Мейоз'}, фаза ${i + 1} из ${ph.length}`;
    $('.info h3').textContent = name; $('.phase-text').textContent = text;
    $('.formula b').textContent = f; $('.formula span').textContent = per || '';
    const [, kn, kc] = f.match(/^(\d*)n(\d*)c$/), n = n2 / 2;
    $('.readout').textContent = `При 2n = ${n2} в этой фазе ${per || 'в клетке'}: хромосом — ${(+kn || 1) * n}, молекул ДНК — ${(+kc || 1) * n}.`;
    $('.prev').disabled = i === 0; $('.next').disabled = i === ph.length - 1 || k < 1;
    $('.play').textContent = playing ? 'Остановить' : 'Показать всё подряд';
    seen.add(mode + i);
    if (seen.size === PHASES.mitosis.length + PHASES.meiosis.length) api.emit('done', {});
  }
  function go(n) { from = i; i = n; k = Math.abs(n - from) === 1 ? 0 : 1; if (k === 1) from = n; help.hidden = true; update(); }

  function onTap(x, y) {
    const st = cur(), show = key => { help.hidden = false; help.innerHTML = `<button class="help-close" aria-label="Закрыть справку">×</button><b>${HELP[key][0]}</b><p>${HELP[key][1]}</p>`; };
    for (const id of IDS) { const c = st.ch[id]; if (c.on > 0.5 && Math.hypot(c.x - x, c.y - y) < 18) { const sis = st.ch[id[0] + (id[1] === '1' ? '2' : '1')]; return show(sis.on > 0.5 && Math.hypot(sis.x - c.x, sis.y - c.y) < 14 ? 'chr2' : 'chr1'); } }
    if (st.poles.some(p => p.a > 0.3 && Math.hypot(p.x - x, p.y - y) < 18)) return show('pole');
    if (st.nuc.some(c => c.a > 0.4 && Math.hypot(c.x - x, c.y - y) < c.r)) return show('nuc');
    help.hidden = true;
  }

  const stage = createStage($('canvas'), { logicalH: H, draw, onTap, onResize(newL) { L = newL; LAY = layouts(L); } });
  $('.sim-modes').addEventListener('click', e => {
    const b = e.target.closest('.chip'); if (!b) return;
    mode = b.dataset.m; playing = false; root.querySelectorAll('.sim-modes .chip').forEach(c => c.setAttribute('aria-pressed', c === b));
    i = from = 0; k = 1; update();
  });
  $('.next').addEventListener('click', () => { playing = false; go(i + 1); });
  $('.prev').addEventListener('click', () => { playing = false; go(i - 1); });
  $('.play').addEventListener('click', () => { playing = !playing; if (playing) { if (i === PHASES[mode].length - 1) { i = from = 0; k = 1; } pause = 0.4; } update(); });
  $('.sets').addEventListener('click', e => { const b = e.target.closest('.chip'); if (!b) return; n2 = +b.dataset.n; root.querySelectorAll('.sets .chip').forEach(c => c.setAttribute('aria-pressed', c === b)); update(); });
  help.addEventListener('click', e => { if (e.target.closest('.help-close')) help.hidden = true; });
  update();
  return { destroy() { stage.destroy(); root.innerHTML = ''; } };
}
