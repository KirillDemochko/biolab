import { progress } from './core/progress.js';
import { createStage } from './core/canvas.js';
import { taskTypes } from './task-types/index.js';
import { lipid, lipidHead, backdrop, protein, put, glycan } from '../sims/_shared/art.js';

const view = document.getElementById('view');
let cleanup = [], catalog = null, token = 0;

async function getJSON(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${url}: ${r.status}`);
  return r.json();
}
const el = (tag, cls, html = '') => { const n = document.createElement(tag); if (cls) n.className = cls; n.innerHTML = html; return n; };
const allTopics = () => catalog.sections.flatMap(s => s.topics);

async function route() {
  const my = ++token;
  cleanup.forEach(f => f()); cleanup = [];
  try {
    catalog ??= await getJSON('content/catalog.json');
    // Адреса простые: #membrane — тема, #membrane-transport — её раздел.
    const hash = location.hash.slice(1);
    const topic = allTopics().find(t => hash === t.id || hash.startsWith(t.id + '-'));
    const partId = topic && hash.slice(topic.id.length + 1);
    if (topic) await showTopic(topic, partId, my); else showHome();
  } catch (e) {
    console.error(e);
    view.innerHTML = '<p class="error">Страница не загрузилась. Проверьте интернет и обновите её.</p>';
  }
}
addEventListener('hashchange', () => { route(); scrollTo(0, 0); });
route();

// ——— главная ———
function showHome() {
  document.title = 'Биолаб — интерактивная биология';
  view.innerHTML = `
    <section class="hero">
      <h1>Биология, которую можно потрогать</h1>
      <p class="lead">Живые модели и задания — от школьной программы до ЕГЭ. Работает на телефоне и компьютере, устанавливать ничего не нужно.</p>
      <a class="hero-band" href="#membrane">
        <canvas aria-hidden="true"></canvas>
        <span class="hero-cap">Это клеточная мембрана. Разобрать её на части</span>
      </a>
    </section>
    ${catalog.sections.map(s => `
      <section class="section">
        <h2>${s.title}</h2>
        ${s.topics.map(t => {
          const p = progress.get('topics', t.id);
          return `<a class="topic" href="#${t.id}">
            <span class="topic-main"><b>${t.title}</b><span>${t.summary}</span></span>
            <span class="topic-meta">${p ? `Решено ${p.done} из ${p.total}` : t.meta}</span>
          </a>`;
        }).join('')}
      </section>`).join('')}`;
  heroBand(view.querySelector('.hero-band canvas'));
}

function heroBand(canvas) {
  let L = 600; const ph = Array.from({ length: 400 }, () => Math.random() * 6.28);
  const stage = createStage(canvas, {
    logicalH: 250, ratio: 0.36, minH: 190, maxH: 280, speedControl: false, onResize: l => { L = l; },
    draw(ctx, { t }) {
      const M = 140;
      backdrop(ctx, L, 250, M, t);
      const n = Math.round(L / 15), step = L / n, px = [L * 0.24, L * 0.66];
      for (let row = 4; row >= 1; row--) {
        ctx.globalAlpha = 1 - row * 0.19;
        for (let i = 0; i <= n; i++) lipidHead(ctx, i * step + (row % 2) * step / 2 + Math.sin(t * 1.5 + ph[i + row * 70]) * 2, M - 40 - row * 6.2 + row * row * 0.35, 6.5 * (1 - row * 0.11));
      }
      ctx.globalAlpha = 1;
      for (let i = 0; i < n; i++) {
        const x = (i + 0.5) * step, dx = Math.sin(t * 1.6 + ph[i]) * 2.2, wob = Math.sin(t * 2.6 + ph[i] * 1.7) * 3;
        if (Math.abs(x - px[0]) > 43) lipid(ctx, x + dx, M - 40, 1, wob);
        if (Math.abs(x - px[0]) > 43) lipid(ctx, x - dx, M + 40, -1, wob);
        else continue;
      }
      put(ctx, protein('channel'), px[0], M + Math.sin(t * 0.6) * 1.5);
      if (L > 520) { put(ctx, protein('periph'), px[1], M + 65); }
      glycan(ctx, L * 0.52, M - 45, t, 1, 'L');
    },
  });
  cleanup.push(() => stage.destroy());
}

// ——— тема ———
async function showTopic(topic, partId, my) {
  const lesson = await getJSON(topic.file);
  if (my !== token) return;
  const idx = Math.max(0, lesson.parts.findIndex(p => p.id === partId));
  const part = lesson.parts[idx], next = lesson.parts[idx + 1];
  document.title = `${lesson.title} — Биолаб`;
  view.innerHTML = `
    <a class="back" href="#">Все темы</a>
    <h1 class="topic-title">${lesson.title}</h1>
    <nav class="tabs" aria-label="Разделы темы">
      ${lesson.parts.map(p => `<a href="#${topic.id}-${p.id}" ${p === part ? 'aria-current="page"' : ''}>${p.title}</a>`).join('')}
    </nav>
    <div class="part"></div>
    ${next ? `<a class="btn next-part" href="#${topic.id}-${next.id}">Дальше: ${next.title.toLowerCase()}</a>` : ''}`;
  const host = view.querySelector('.part');
  for (const block of part.blocks) {
    if (block.type === 'text') host.append(el('div', 'prose', block.html));
    else if (block.type === 'sim') await mountSim(block.sim, host, my);
    else if (block.type === 'tasks') renderTasks(host, topic.id, block.items);
    if (my !== token) return;
  }
}

async function mountSim(id, host, my) {
  const box = el('div', 'sim-host'); host.append(box);
  const mod = await import(`../sims/${id}/index.js`);
  if (my !== token) return;
  const handle = mod.mount(box, {
    emit(name, data) { if (name === 'done') progress.set('sims', id, { ok: true, ...data }); },
  });
  cleanup.push(() => handle.destroy());
}

const LEVEL_NAMES = ['Основы', 'Уверенный уровень', 'Формат ЕГЭ'];
const plural = (n, [one, few, many]) => (n % 10 === 1 && n % 100 !== 11 ? one : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14) ? few : many);

function renderTasks(host, topicId, items) {
  const key = it => `${topicId}/${it.id}`;
  const rec = it => progress.get('tasks', key(it));
  const groups = [1, 2, 3].map(l => items.filter(it => (it.level || 1) === l));
  const score = el('section', 'score');

  const update = () => {
    const done = items.filter(it => rec(it)?.ok).length, tried = items.filter(it => rec(it)).length;
    const first = items.filter(it => rec(it)?.first).length, pct = done / items.length;
    const verdict = tried < items.length ? `Осталось решить: ${items.length - tried}.`
      : pct >= 0.9 ? 'Отличный результат: тема усвоена.'
      : pct >= 0.7 ? 'Хороший результат. Перерешай задания, где была ошибка.'
      : 'Стоит вернуться к моделям и попробовать ещё раз.';
    score.innerHTML = `
      <h2>Итог</h2>
      <p class="score-big"><b>${done}</b> из ${items.length}</p>
      <div class="score-rows">${groups.map((g, i) => {
        if (!g.length) return '';
        const d = g.filter(it => rec(it)?.ok).length;
        return `<div><span>${LEVEL_NAMES[i]}</span><span class="bar"><i style="width:${d / g.length * 100}%"></i></span><span>${d} из ${g.length}</span></div>`;
      }).join('')}</div>
      <p class="score-note">С первой попытки: ${first}. ${verdict}</p>
      <button class="btn ghost reset">Сбросить результаты</button>`;
    progress.set('topics', topicId, { done, total: items.length });
  };
  score.addEventListener('click', e => {
    if (!e.target.closest('.reset')) return;
    items.forEach(it => progress.remove('tasks', key(it)));
    route(); scrollTo(0, 0);
  });

  let num = 0;
  groups.forEach((group, gi) => {
    if (!group.length) return;
    host.append(el('h2', 'level-title', `Уровень ${gi + 1}. ${LEVEL_NAMES[gi]} <span>${group.length} ${plural(group.length, ['задание', 'задания', 'заданий'])}</span>`));
    group.forEach(item => {
      const card = el('article', 'task', `
        <p class="task-head"><span>Задание ${++num}</span></p>
        <p class="q">${item.q}</p>
        <div class="task-body"></div>
        <div class="btn-row"><button class="btn check" disabled>Проверить</button><button class="btn ghost retry" hidden>Решить ещё раз</button></div>
        <p class="fb" role="status"></p>`);
      host.append(card);
      if (rec(item)?.ok) card.classList.add('solved');
      const check = card.querySelector('.check'), retry = card.querySelector('.retry'), fb = card.querySelector('.fb');
      const task = taskTypes[item.type].create(item, card.querySelector('.task-body'), () => { check.disabled = !task.ready(); });
      check.disabled = !task.ready();
      check.onclick = () => {
        const ok = task.check(), old = rec(item);
        fb.innerHTML = `<b class="${ok ? 'ok' : 'bad'}">${ok ? 'Верно.' : 'Есть ошибка.'}</b> ${item.why || ''}`;
        progress.set('tasks', key(item), { ok: ok || !!old?.ok, first: old ? !!old.first : ok });
        card.classList.toggle('solved', !!rec(item).ok);
        check.hidden = true; retry.hidden = false; update();
      };
      retry.onclick = () => { task.reset(); fb.innerHTML = ''; check.hidden = false; retry.hidden = true; check.disabled = !task.ready(); };
    });
  });
  host.append(score);
  update();
}
