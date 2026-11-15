import { sprite, ball, shade } from '../_shared/art.js';

export const meta = { id: 'genetics-punnett', title: 'Решётка Пеннета' };

// ——— рисунки фенотипов ———
const url = s => s.cv.toDataURL();
function pea(col, wrinkled) {
  return url(sprite(`pea${col}${wrinkled}`, 34, 34, c => {
    if (wrinkled) {
      c.beginPath();
      for (let i = 0; i < 40; i++) { const a = i / 40 * 6.283, r = 13.5 + Math.sin(a * 7) * 1.6 + Math.sin(a * 3 + 1) * 1.1; c.lineTo(17 + Math.cos(a) * r, 17 + Math.sin(a) * r); }
      c.closePath(); c.save(); c.clip(); ball(c, 17, 17, 17, col);
      c.strokeStyle = shade(col, 0.55); c.lineWidth = 1.4; c.lineCap = 'round';
      for (const [x, y, r, a0] of [[13, 13, 6, 0.3], [21, 19, 7, 2.2], [15, 23, 5, 4.4], [23, 11, 4, 1.2]]) { c.beginPath(); c.arc(x, y, r, a0, a0 + 1.5); c.stroke(); }
      c.restore();
    } else ball(c, 17, 17, 14.5, col);
  }));
}
function flower(col) {
  return url(sprite('fl' + col, 36, 36, c => {
    for (let i = 0; i < 5; i++) {
      c.save(); c.translate(18, 18); c.rotate(i * 1.2566);
      const g = c.createRadialGradient(0, -4, 1, 0, -10, 11); g.addColorStop(0, shade(col, 0.75)); g.addColorStop(1, col);
      c.fillStyle = g; c.beginPath(); c.ellipse(0, -10, 6.4, 8.2, 0, 0, 7); c.fill();
      c.strokeStyle = shade(col, 0.7); c.lineWidth = 0.6; c.stroke(); c.restore();
    }
    ball(c, 18, 18, 4.2, '#F2C230');
  }));
}
function person(col, female) {
  return url(sprite('p' + col + female, 30, 34, c => {
    c.beginPath(); female ? c.moveTo(15, 14) : c.moveTo(6, 16);
    if (female) { c.lineTo(26, 33); c.lineTo(4, 33); } else c.roundRect(6, 16, 18, 17, 5);
    c.closePath(); const g = c.createLinearGradient(0, 14, 0, 34); g.addColorStop(0, shade(col, 1.25)); g.addColorStop(1, shade(col, 0.7));
    c.fillStyle = g; c.fill(); ball(c, 15, 8.5, 7, col);
  }));
}
const Y = '#F2C230', G = '#6BBF4E', OK = '#3DA5B5', CARRIER = '#8E63D9', ILL = '#E5484D';

const sortPair = s => s.split('').sort((a, b) => (a.toLowerCase() === b.toLowerCase() ? (a < b ? -1 : 1) : a.toLowerCase() < b.toLowerCase() ? -1 : 1)).join('');
const uniq = a => [...new Set(a)];
const X = g => g.replace(/X([Dd])/g, 'X<sup>$1</sup>');
const zyg = pair => (pair[0] === pair[1] ? (pair[0] === pair[0].toUpperCase() ? 'доминантная гомозигота' : 'рецессивная гомозигота') : 'гетерозигота');

const CROSSES = [
  {
    id: 'mono', title: 'Один признак', trait: 'Горох: жёлтый цвет семян (A) доминирует над зелёным (a).',
    mothers: ['AA', 'Aa', 'aa'], fathers: ['AA', 'Aa', 'aa'], start: ['Aa', 'Aa'],
    gametes: g => uniq(g.split('')), child: (a, b) => sortPair(a + b),
    phenos: [['жёлтые', pea(Y)], ['зелёные', pea(G)]], pheno: g => (g.includes('A') ? 0 : 1),
    about: g => `${g} — ${zyg(g)}. ${g.includes('A') ? 'Есть доминантный аллель A, поэтому семена жёлтые.' : 'Доминантного аллеля нет, поэтому проявился рецессивный признак — зелёные семена.'}`,
    explain: (m, f) => (m === 'Aa' && f === 'Aa' ? 'Второй закон Менделя — закон расщепления: 3 : 1 по фенотипу и 1 : 2 : 1 по генотипу.'
      : m + f === 'AAaa' || m + f === 'aaAA' ? 'Первый закон Менделя — единообразие гибридов первого поколения: все потомки Aa и все жёлтые.'
      : (m === 'Aa' && f === 'aa') || (m === 'aa' && f === 'Aa') ? 'Анализирующее скрещивание: гетерозигота с рецессивной гомозиготой даёт расщепление 1 : 1.'
      : 'Расщепления по фенотипу нет: все потомки выглядят одинаково.'),
    goals: [['Получи расщепление 3 : 1', r => r.ratio === '3 : 1'], ['Получи расщепление 1 : 1', r => r.ratio === '1 : 1'],
      ['Скрести жёлтый горох с зелёным так, чтобы все потомки были жёлтыми', r => [r.m, r.f].sort().join() === 'AA,aa']],
  },
  {
    id: 'inc', title: 'Неполное доминирование', trait: 'Ночная красавица: AA — красные цветки, aa — белые, Aa — розовые.',
    mothers: ['AA', 'Aa', 'aa'], fathers: ['AA', 'Aa', 'aa'], start: ['AA', 'aa'],
    gametes: g => uniq(g.split('')), child: (a, b) => sortPair(a + b),
    phenos: [['красные', flower('#E5484D')], ['розовые', flower('#F59AB5')], ['белые', flower('#F5F2EA')]], pheno: g => (g === 'AA' ? 0 : g === 'Aa' ? 1 : 2),
    about: g => `${g} — ${zyg(g)}. ${g === 'Aa' ? 'Доминантный аллель не подавляет рецессивный полностью, поэтому признак промежуточный — розовые цветки.' : g === 'AA' ? 'Цветки красные.' : 'Цветки белые.'}`,
    explain: (m, f) => (m === 'Aa' && f === 'Aa' ? 'При неполном доминировании расщепление по фенотипу совпадает с расщеплением по генотипу: 1 : 2 : 1.'
      : [m, f].sort().join() === 'AA,aa' ? 'Все потомки — гетерозиготы Aa с промежуточным признаком: розовые цветки.'
      : 'У каждого генотипа свой фенотип, поэтому гетерозиготу здесь видно сразу — без анализирующего скрещивания.'),
    goals: [['Получи расщепление 1 : 2 : 1', r => r.ratio === '1 : 2 : 1'], ['Получи только розовые цветки', r => r.counts[1] === r.total],
      ['Получи поровну красных и розовых', r => r.counts[0] === r.counts[1] && r.counts[0] > 0 && !r.counts[2]]],
  },
  {
    id: 'di', title: 'Два признака', trait: 'Горох: цвет семян (A — жёлтый, a — зелёный) и форма (B — гладкая, b — морщинистая). Гены в разных хромосомах.',
    mothers: ['AABB', 'AABb', 'AAbb', 'AaBB', 'AaBb', 'Aabb', 'aaBB', 'aaBb', 'aabb'], start: ['AaBb', 'AaBb'],
    gametes: g => uniq([g[0] + g[2], g[0] + g[3], g[1] + g[2], g[1] + g[3]]), child: (a, b) => sortPair(a[0] + b[0]) + sortPair(a[1] + b[1]),
    phenos: [['жёлтые гладкие', pea(Y)], ['жёлтые морщинистые', pea(Y, 1)], ['зелёные гладкие', pea(G)], ['зелёные морщинистые', pea(G, 1)]],
    pheno: g => (g.includes('A') ? 0 : 2) + (g.includes('B') ? 0 : 1),
    about: g => `${g}: по гену цвета — ${zyg(g.slice(0, 2))}, по гену формы — ${zyg(g.slice(2))}. Семена ${g.includes('A') ? 'жёлтые' : 'зелёные'} и ${g.includes('B') ? 'гладкие' : 'морщинистые'}.`,
    explain: (m, f) => (m === 'AaBb' && f === 'AaBb' ? 'Третий закон Менделя — независимое наследование признаков: 9 : 3 : 3 : 1.'
      : [m, f].sort().join() === 'AaBb,aabb' ? 'Анализирующее скрещивание дигетерозиготы: четыре типа гамет дают четыре фенотипа поровну, 1 : 1 : 1 : 1.'
      : [m, f].sort().join() === 'AABB,aabb' ? 'Единообразие первого поколения: все потомки AaBb, жёлтые и гладкие.'
      : 'Каждая пара аллелей наследуется независимо от другой, поэтому расщепление по двум признакам — произведение двух моногибридных.'),
    goals: [['Получи расщепление 9 : 3 : 3 : 1', r => r.ratio === '9 : 3 : 3 : 1'], ['Получи расщепление 1 : 1 : 1 : 1', r => r.ratio === '1 : 1 : 1 : 1'],
      ['Скрести жёлтый гладкий горох с зелёным морщинистым так, чтобы все потомки были жёлтыми гладкими', r => [r.m, r.f].sort().join() === 'AABB,aabb']],
  },
  {
    id: 'sex', title: 'Сцепление с полом', trait: 'Дальтонизм у человека: рецессивный ген d находится в X-хромосоме. D — нормальное зрение. В Y-хромосоме этого гена нет.',
    mothers: ['XDXD', 'XDXd', 'XdXd'], fathers: ['XDY', 'XdY'], start: ['XDXd', 'XDY'],
    gametes: g => uniq(g.match(/X[Dd]|Y/g)), child: (a, b) => (b === 'Y' ? a + 'Y' : [a, b].sort().join('')),
    phenos: [['девочка, зрение в норме', person(OK, 1)], ['девочка-носительница, зрение в норме', person(CARRIER, 1)], ['девочка с дальтонизмом', person(ILL, 1)], ['мальчик, зрение в норме', person(OK, 0)], ['мальчик с дальтонизмом', person(ILL, 0)]],
    pheno: g => (g.endsWith('Y') ? (g.includes('D') ? 3 : 4) : g === 'XDXD' ? 0 : g === 'XDXd' ? 1 : 2),
    about: g => (g.endsWith('Y') ? `${X(g)} — мальчик. У него одна X-хромосома, поэтому единственный аллель проявляется всегда: ${g.includes('D') ? 'зрение в норме' : 'дальтонизм'}.`
      : `${X(g)} — девочка. ${g === 'XDXd' ? 'Зрение в норме, но она носительница: может передать ген d детям.' : g === 'XDXD' ? 'Зрение в норме, гена дальтонизма нет.' : 'Обе X-хромосомы несут ген d — дальтонизм.'}`),
    explain: (m, f) => (m === 'XDXd' && f === 'XDY' ? 'Оба родителя здоровы, но мать — носительница. Половина сыновей — дальтоники; дочери здоровы, но половина из них носительницы.'
      : m === 'XdXd' && f === 'XDY' ? 'Сыновья получают X-хромосому только от матери, поэтому все они дальтоники. Все дочери — носительницы: от отца им досталась хромосома с геном D.'
      : m === 'XDXD' && f === 'XdY' ? 'Отец-дальтоник передаёт X-хромосому только дочерям: все дочери — носительницы, все сыновья здоровы.'
      : 'Сын получает X-хромосому от матери, а Y — от отца. Дочь получает по одной X-хромосоме от каждого родителя.'),
    goals: [['У здоровых родителей родился сын-дальтоник', r => r.m === 'XDXd' && r.f === 'XDY'], ['Все сыновья — дальтоники, а все дочери видят нормально', r => r.m === 'XdXd' && r.f === 'XDY'],
      ['Получи девочку с дальтонизмом', r => r.counts[2] > 0]],
  },
];
CROSSES[2].fathers = CROSSES[2].mothers;
const gcd = (a, b) => (b ? gcd(b, a % b) : a);

export function mount(root, api) {
  root.innerHTML = `
    <div class="sim">
      <div class="chips sim-modes" role="group" aria-label="Тип скрещивания">
        ${CROSSES.map((c, i) => `<button class="chip" data-i="${i}" aria-pressed="false">${c.title}</button>`).join('')}
      </div>
      <div class="gen-board">
        <p class="gen-trait"></p>
        <div class="gen-parents"></div>
        <div class="punnett-wrap"><table class="punnett"></table></div>
      </div>
      <div class="sim-panel">
        <div class="help" hidden></div>
        <div class="info gen-result" aria-live="polite"></div>
        <div class="info goals"><p class="lab-intro">Подбери родителей так, чтобы выполнить задания.</p><ul class="goal-list"></ul></div>
      </div>
    </div>`;
  const $ = s => root.querySelector(s);
  const help = $('.help');
  let cross = CROSSES[0], m, f;
  const done = Object.fromEntries(CROSSES.map(c => [c.id, c.goals.map(() => false)]));
  let emitted = false;

  const fmt = g => (cross.id === 'sex' ? X(g) : g);
  const parentPheno = g => cross.phenos[cross.pheno(g)];

  function render() {
    root.querySelectorAll('.sim-modes .chip').forEach(b => b.setAttribute('aria-pressed', CROSSES[+b.dataset.i] === cross));
    $('.gen-trait').textContent = cross.trait;
    const card = (who, label, list, cur) => `
      <div class="gen-parent"><p><img src="${parentPheno(cur)[1]}" alt=""><b>${label}</b> <span>${fmt(cur)}</span></p>
        <div class="chips gen-geno" data-who="${who}">${list.map(g => `<button class="chip" data-g="${g}" aria-pressed="${g === cur}"><span>${fmt(g)}</span></button>`).join('')}</div></div>`;
    $('.gen-parents').innerHTML = card('m', '♀ Мать', cross.mothers, m) + card('f', '♂ Отец', cross.fathers, f);

    const gm = cross.gametes(m), gf = cross.gametes(f), counts = cross.phenos.map(() => 0), genos = {};
    let n = 0, html = `<tr><th class="corner"><span>гаметы</span></th>${gf.map(g => `<th><span class="gamete"><span>${fmt(g)}</span></span></th>`).join('')}</tr>`;
    for (const a of gm) {
      html += `<tr><th><span class="gamete"><span>${fmt(a)}</span></span></th>`;
      for (const b of gf) {
        const g = cross.child(a, b), p = cross.pheno(g); counts[p]++; genos[g] = (genos[g] || 0) + 1;
        html += `<td><button data-g="${g}" style="animation-delay:${n++ * 35}ms"><img src="${cross.phenos[p][1]}" alt="${cross.phenos[p][0]}"><span>${fmt(g)}</span></button></td>`;
      }
      html += '</tr>';
    }
    $('.punnett').innerHTML = html;
    const total = gm.length * gf.length, nz = counts.filter(Boolean), d = nz.reduce(gcd), ratio = nz.map(c => c / d).join(' : ');
    const gz = Object.values(genos), gd = gz.reduce(gcd);
    $('.gen-result').innerHTML = `
      <h3>Потомство${nz.length > 1 ? `: ${ratio}` : ' одинаковое'}</h3>
      <div class="gen-rows">${cross.phenos.map(([name, icon], i) => (counts[i] ? `<div><img src="${icon}" alt=""><span>${name}</span><b>${String(Math.round(counts[i] / total * 1000) / 10).replace('.', ',')}%</b></div>` : '')).join('')}</div>
      <p class="gen-geno-line">По генотипу: ${Object.keys(genos).map((g, i) => `${gz[i] / gd} ${fmt(g)}`).join(' : ')}</p>
      <p>${cross.explain(m, f)}</p>`;
    const r = { m, f, ratio, counts, total };
    cross.goals.forEach(([, test], i) => { if (test(r)) done[cross.id][i] = true; });
    $('.goal-list').innerHTML = cross.goals.map(([text], i) => `<li class="${done[cross.id][i] ? 'done' : ''}">${text}</li>`).join('');
    if (!emitted && Object.values(done).flat().filter(Boolean).length >= 8) { emitted = true; api.emit('done', {}); }
  }
  function setCross(i) { cross = CROSSES[i]; [m, f] = cross.start; help.hidden = true; render(); }

  $('.sim-modes').addEventListener('click', e => { const b = e.target.closest('.chip'); if (b) setCross(+b.dataset.i); });
  $('.gen-parents').addEventListener('click', e => {
    const b = e.target.closest('.chip'); if (!b) return;
    if (b.parentElement.dataset.who === 'm') m = b.dataset.g; else f = b.dataset.g;
    help.hidden = true; render();
  });
  $('.punnett').addEventListener('click', e => {
    const b = e.target.closest('td button'); if (!b) return;
    const g = b.dataset.g;
    help.hidden = false;
    help.innerHTML = `<button class="help-close" aria-label="Закрыть справку">×</button><b>${fmt(g)}: ${cross.phenos[cross.pheno(g)][0]}</b><p>${cross.about(g)}</p>`;
  });
  help.addEventListener('click', e => { if (e.target.closest('.help-close')) help.hidden = true; });
  setCross(0);
  return { destroy() { root.innerHTML = ''; } };
}
