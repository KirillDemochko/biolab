// Последовательность: расставить шаги по порядку.
// Формат: { items: [шаги в ВЕРНОМ порядке] }
import { shuffle } from './util.js';

export function create(item, host, onChange) {
  let order, locked = false;
  const mix = () => { do { order = shuffle(item.items.map((_, i) => i)); } while (order.every((v, i) => v === i)); };
  const render = marks => {
    host.innerHTML = `<ol class="order">${order.map((v, pos) => `
      <li class="${marks ? (v === pos ? 'ok' : 'bad') : ''}">
        <span>${item.items[v]}</span>
        <span class="arrows">
          <button data-pos="${pos}" data-d="-1" aria-label="Поднять выше" ${locked || pos === 0 ? 'disabled' : ''}>↑</button>
          <button data-pos="${pos}" data-d="1" aria-label="Опустить ниже" ${locked || pos === order.length - 1 ? 'disabled' : ''}>↓</button>
        </span>
      </li>`).join('')}</ol>`;
  };
  host.onclick = e => {
    const b = e.target.closest('.arrows button'); if (!b || locked) return;
    const pos = +b.dataset.pos, to = pos + +b.dataset.d;
    [order[pos], order[to]] = [order[to], order[pos]]; render(); onChange();
    host.querySelector(`[data-pos="${to}"][data-d="${b.dataset.d}"]:not(:disabled)`)?.focus();
  };
  mix(); render();
  return {
    ready: () => true,
    check() { locked = true; render(true); return order.every((v, i) => v === i); },
    reset() { locked = false; mix(); render(); },
  };
}
