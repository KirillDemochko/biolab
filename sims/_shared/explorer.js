// Общий каркас для моделей «рассмотри строение»: список частей, карточка с объяснением и игра «найди на модели».
// Модель задаёт только геометрию: build(L), draw(ctx, env, hi, pulse) и hit(x, y).
import { createStage } from '../../js/core/canvas.js';

export function mountExplorer(root, api, cfg) {
  const { parts, order, quest, intro, legend = '', label } = cfg;
  root.innerHTML = `
    <div class="sim">
      <div class="chips sim-modes" role="group" aria-label="${label}">
        ${order.map(k => `<button class="chip" data-k="${k}" aria-pressed="false"><i class="dot" style="background:${parts[k].color}"></i>${parts[k].name}</button>`).join('')}
      </div>
      <div class="sim-stage"><canvas aria-label="${label}"></canvas></div>
      <div class="sim-panel">
        <div class="info" aria-live="polite"></div>
        ${legend ? `<div class="controls"><div class="legend">${legend}</div></div>` : ''}
        <button class="btn quest-btn">Сыграть: найди на модели</button>
      </div>
    </div>`;
  const $ = s => root.querySelector(s);
  const info = $('.info'), chips = $('.chips'), questBtn = $('.quest-btn');
  let sel = null, game = null, flash = null;

  function showInfo() {
    if (game) return;
    chips.querySelectorAll('.chip').forEach(b => b.setAttribute('aria-pressed', b.dataset.k === sel));
    info.innerHTML = sel ? `<h3>${parts[sel].name}</h3><p>${parts[sel].text}</p>` : `<h3>${intro[0]}</h3><p>${intro[1]}</p>`;
  }
  const ask = () => { info.innerHTML = `<p class="quest-count">Вопрос ${game.i + 1} из ${quest.length}</p><h3>${quest[game.i].q}</h3><p class="quest-msg">Нажми на эту часть на модели.</p>`; };
  function end(finished) {
    const g = game; game = null; chips.hidden = false; questBtn.textContent = 'Сыграть: найди на модели'; sel = null; showInfo();
    if (finished) {
      info.innerHTML = `<h3>${g.misses ? 'Готово' : 'Без единой ошибки'}</h3><p>Найдено ${quest.length} из ${quest.length}, промахов: ${g.misses}. ${g.misses ? 'Попробуй пройти ещё раз без промахов.' : 'Отличный результат.'}</p>`;
      api.emit('done', { misses: g.misses });
    }
  }
  function answer(type) {
    if (!type || flash) return;
    if (quest[game.i].a.includes(type)) {
      flash = type; info.querySelector('.quest-msg').innerHTML = `<b class="ok">Верно: ${parts[type].name.toLowerCase()}.</b>`;
      setTimeout(() => { flash = null; if (!game) return; if (++game.i >= quest.length) end(true); else ask(); }, 1000);
    } else { game.misses++; info.querySelector('.quest-msg').innerHTML = `<b class="bad">Это ${parts[type].name.toLowerCase()}.</b> Попробуй ещё раз.`; }
  }

  const stage = createStage($('canvas'), {
    logicalH: cfg.H, speedControl: false, onResize: cfg.build,
    draw(ctx, env) { cfg.draw(ctx, env, flash ?? sel, 0.5 + Math.sin(env.t * 5) * 0.25); },
    onTap(x, y) { const type = cfg.hit(x, y); if (game) return answer(type); sel = type === sel ? null : type; showInfo(); },
  });
  chips.addEventListener('click', e => { const b = e.target.closest('.chip'); if (!b) return; sel = sel === b.dataset.k ? null : b.dataset.k; showInfo(); });
  questBtn.addEventListener('click', () => {
    if (game) return end(false);
    game = { i: 0, misses: 0 }; sel = null; chips.hidden = true; questBtn.textContent = 'Выйти из игры'; ask();
  });
  showInfo();
  return { destroy() { stage.destroy(); game = null; root.innerHTML = ''; } };
}
