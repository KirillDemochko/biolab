// Общая «сцена» для моделей: масштаб под любой экран, цикл анимации, нажатия.
// Модель рисует в условных координатах: высота всегда logicalH, ширина L зависит от экрана.
export function createStage(canvas, opts) {
  const { logicalH = 360, ratio = 0.62, minH = 250, maxH = 440, draw, onTap, onResize, speedControl = true } = opts;
  const ctx = canvas.getContext('2d');
  let L = 600, scale = 1, raf = 0, last = 0, t = 0, visible = true, dead = false;

  // Кнопка скорости: одна на все модели, выбор запоминается.
  const SPEEDS = [1, 2, 4];
  let speed = 1, speedBtn = null;
  if (speedControl) {
    try { speed = SPEEDS.includes(+localStorage.getItem('biolab:speed')) ? +localStorage.getItem('biolab:speed') : 1; } catch { /* без сохранения */ }
    speedBtn = document.createElement('button');
    speedBtn.className = 'speed-btn';
    speedBtn.setAttribute('aria-label', 'Скорость модели');
    const label = () => { speedBtn.innerHTML = `<span class="lbl">Скорость</span>${speed}×`; };
    speedBtn.addEventListener('click', () => {
      speed = SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length]; label();
      try { localStorage.setItem('biolab:speed', speed); } catch { /* без сохранения */ }
    });
    label(); canvas.parentElement.append(speedBtn);
  }

  function resize() {
    const w = canvas.parentElement.clientWidth;
    if (!w) return;
    const h = Math.round(Math.max(minH, Math.min(maxH, w * ratio)));
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    canvas.style.height = h + 'px';
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    scale = h / logicalH;
    const newL = w / scale;
    ctx.setTransform(dpr * scale, 0, 0, dpr * scale, 0, 0);
    if (Math.abs(newL - L) > 0.5 || !resize.done) { L = newL; resize.done = true; onResize?.(L); }
  }

  function frame(now) {
    if (dead) return;
    raf = requestAnimationFrame(frame);
    if (!visible || document.hidden) { last = now; return; }
    const dt = Math.min(0.034, (now - last) / 1000 || 0) * speed;
    last = now; t += dt;
    draw(ctx, { L, H: logicalH, t, dt, scale });
  }

  const ro = new ResizeObserver(resize);
  ro.observe(canvas.parentElement);
  const io = new IntersectionObserver(es => { visible = es[0].isIntersecting; });
  io.observe(canvas);
  const tap = e => {
    const r = canvas.getBoundingClientRect();
    onTap?.((e.clientX - r.left) / scale, (e.clientY - r.top) / scale);
  };
  canvas.addEventListener('click', tap);
  resize();
  raf = requestAnimationFrame(frame);

  return {
    get L() { return L; },
    destroy() { dead = true; cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); canvas.removeEventListener('click', tap); speedBtn?.remove(); },
  };
}

export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
