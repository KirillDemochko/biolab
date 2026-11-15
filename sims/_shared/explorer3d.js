// Каркас для трёхмерных моделей «рассмотри строение»: сцена, которую можно вращать, подписи-выноски,
// список частей, подробная карточка и игра «найди на модели».
import { createScene3D } from '../../js/core/gl3d.js';

export function mountExplorer3D(root, api, cfg) {
  const { parts, order, quest, intro, label } = cfg;
  const byMat = {}; order.forEach(k => { byMat[parts[k].mat] ??= k; });
  root.innerHTML = `
    <div class="sim">
      <div class="chips sim-modes" role="group" aria-label="${label}">
        ${order.map(k => `<button class="chip" data-k="${k}" aria-pressed="false"><i class="dot" style="background:${parts[k].color}"></i>${parts[k].name}</button>`).join('')}
      </div>
      <div class="sim-stage stage3d">
        <canvas class="gl" aria-label="${label}"></canvas><canvas class="overlay" aria-hidden="true"></canvas>
        <div class="stage-tools"><button data-z="0.87" aria-label="Приблизить">+</button><button data-z="1.15" aria-label="Отдалить">−</button><button class="labels-btn" aria-pressed="true">Подписи</button></div>
        <p class="stage-hint">Поверни модель: проведи по ней пальцем или мышью</p>
      </div>
      <div class="sim-panel">
        <div class="info" aria-live="polite"></div>
        ${cfg.extra || ''}
        <button class="btn quest-btn">Сыграть: найди на модели</button>
      </div>
    </div>`;
  const $ = s => root.querySelector(s);
  const info = $('.info'), chips = $('.chips'), questBtn = $('.quest-btn'), overlay = $('.overlay'), octx = overlay.getContext('2d');
  let sel = null, game = null, flash = null, labelsOn = true, touched = false;

  let scene;
  try {
    scene = createScene3D($('.gl'), {
      scene: cfg.glsl, bound: cfg.bound, yaw: cfg.yaw, pitch: cfg.pitch, dist: cfg.dist, minDist: cfg.minDist, maxDist: cfg.maxDist,
      onTap(mat) { touched = true; pick(byMat[mat] || null); },
      onResize(w, h) { const k = Math.min(window.devicePixelRatio || 1, 2); overlay.width = w * k; overlay.height = h * k; overlay.style.height = h + 'px'; octx.setTransform(k, 0, 0, k, 0, 0); },
      onFrame: drawOverlay,
    });
  } catch (e) { console.error(e); }
  if (!scene) { $('.sim-stage').innerHTML = '<p class="error" style="padding:20px;color:#fff">Этому устройству не хватает поддержки 3D-графики (WebGL 2). Открой модель в свежей версии браузера.</p>'; }

  function drawOverlay(env) {
    const { w, h, project, t } = env;
    octx.clearRect(0, 0, w, h);
    cfg.overlay?.(octx, env);
    const hi = flash ?? sel, narrow = w < 560;
    if (game || !labelsOn) return;
    octx.font = `600 ${narrow ? 12 : 13}px system-ui, sans-serif`; octx.textBaseline = 'middle';
    const placed = [];
    for (const k of order) {
      const p = parts[k]; if (!p.anchor || (narrow && hi !== k)) continue;
      const [x, y, z] = project(p.anchor); if (z <= 0) continue;
      // подпись выносим от центра модели к краю кадра
      const dx = x - w / 2, dy = y - h / 2, len = Math.hypot(dx, dy) || 1, off = (p.out ?? 46) * (narrow ? 0.7 : 1);
      let lx = x + dx / len * off, ly = y + dy / len * off * 0.8 + (p.dy || 0);
      const text = p.short || p.name, tw = octx.measureText(text).width + 16, left = lx < w / 2;
      let bx = Math.max(4, Math.min(w - tw - 4, left ? lx - tw : lx)); ly = Math.max(14, Math.min(h - 14, ly));
      for (const q of placed) if (Math.abs(q.y - ly) < 24 && bx < q.x + q.w && q.x < bx + tw) ly = q.y + (ly >= q.y ? 25 : -25);
      placed.push({ x: bx, y: ly, w: tw });
      const on = hi === k, dim = hi && !on;
      octx.globalAlpha = dim ? 0.35 : 1;
      octx.strokeStyle = on ? '#FFE58A' : 'rgba(255,255,255,.75)'; octx.lineWidth = on ? 2 : 1.2;
      octx.beginPath(); octx.moveTo(x, y); octx.lineTo(left ? bx + tw : bx, ly); octx.stroke();
      octx.fillStyle = on ? '#FFE58A' : '#fff'; octx.beginPath(); octx.arc(x, y, on ? 4 : 3, 0, 7); octx.fill();
      octx.fillStyle = on ? '#FFE58A' : 'rgba(8,28,36,.82)'; octx.beginPath(); octx.roundRect(bx, ly - 11, tw, 22, 11); octx.fill();
      octx.fillStyle = on ? '#10212B' : '#fff'; octx.textAlign = 'left'; octx.fillText(text, bx + 8, ly + 0.5);
      octx.globalAlpha = 1;
    }
  }

  function showInfo() {
    if (game) return;
    chips.querySelectorAll('.chip').forEach(b => b.setAttribute('aria-pressed', b.dataset.k === sel));
    scene?.setHi(sel ? parts[sel].mat : 0);
    const p = sel && parts[sel];
    info.innerHTML = p
      ? `<h3>${p.name}</h3><p>${p.text}</p>${p.facts ? `<ul class="facts-list">${p.facts.map(f => `<li>${f}</li>`).join('')}</ul>` : ''}${p.exam ? `<p class="exam"><b>Для ЕГЭ.</b> ${p.exam}</p>` : ''}`
      : `<h3>${intro[0]}</h3><p>${intro[1]}</p>`;
  }
  function pick(k) { if (game) return answer(k); sel = k === sel ? null : k; showInfo(); }
  const ask = () => { info.innerHTML = `<p class="quest-count">Вопрос ${game.i + 1} из ${quest.length}</p><h3>${quest[game.i].q}</h3><p class="quest-msg">Поверни модель и нажми на эту часть.</p>`; };
  function end(finished) {
    const g = game; game = null; chips.hidden = false; questBtn.textContent = 'Сыграть: найди на модели'; sel = null; showInfo();
    if (finished) {
      info.innerHTML = `<h3>${g.misses ? 'Готово' : 'Без единой ошибки'}</h3><p>Найдено ${quest.length} из ${quest.length}, промахов: ${g.misses}. ${g.misses ? 'Попробуй пройти ещё раз без промахов.' : 'Отличный результат.'}</p>`;
      api.emit('done', { misses: g.misses });
    }
  }
  function answer(k) {
    if (!k || flash) return;
    if (quest[game.i].a.includes(k)) {
      flash = k; scene?.setHi(parts[k].mat); info.querySelector('.quest-msg').innerHTML = `<b class="ok">Верно: ${parts[k].name.toLowerCase()}.</b>`;
      setTimeout(() => { flash = null; scene?.setHi(0); if (!game) return; if (++game.i >= quest.length) end(true); else ask(); }, 1100);
    } else { game.misses++; info.querySelector('.quest-msg').innerHTML = `<b class="bad">Это ${parts[k].name.toLowerCase()}.</b> Попробуй ещё раз.`; }
  }

  chips.addEventListener('click', e => { const b = e.target.closest('.chip'); if (b) pick(b.dataset.k); });
  $('.stage-tools')?.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.z) scene?.zoom(+b.dataset.z); else { labelsOn = !labelsOn; b.setAttribute('aria-pressed', labelsOn); }
  });
  $('.sim-stage').addEventListener('pointerdown', () => { $('.stage-hint')?.remove(); }, { once: true });
  questBtn.addEventListener('click', () => {
    if (game) return end(false);
    game = { i: 0, misses: 0 }; sel = null; scene?.setHi(0); chips.hidden = true; questBtn.textContent = 'Выйти из игры'; ask();
  });
  showInfo();
  return { scene, destroy() { scene?.destroy(); game = null; root.innerHTML = ''; } };
}
