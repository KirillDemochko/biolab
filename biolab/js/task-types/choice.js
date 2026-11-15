// Выбор одного (type: "choice") или нескольких (type: "multi") ответов.
// Формат: { options: [...], answer: [индексы верных] }
import { shuffle } from './util.js';

export function create(item, host, onChange) {
  const multi = item.type === 'multi';
  let picked = new Set(), locked = false;
  host.innerHTML = shuffle(item.options.map((_, i) => i))
    .map(i => `<button class="opt" data-i="${i}" aria-pressed="false">${item.options[i]}</button>`).join('');
  const buttons = [...host.querySelectorAll('.opt')];
  const paint = () => buttons.forEach(b => {
    b.setAttribute('aria-pressed', picked.has(+b.dataset.i)); b.classList.remove('ok', 'bad'); b.disabled = locked;
  });
  host.onclick = e => {
    const b = e.target.closest('.opt'); if (!b || locked) return;
    const i = +b.dataset.i;
    if (!multi) picked = new Set([i]); else if (picked.has(i)) picked.delete(i); else picked.add(i);
    paint(); onChange();
  };
  return {
    ready: () => picked.size > 0,
    check() {
      locked = true; paint();
      const ans = new Set(item.answer);
      buttons.forEach(b => {
        const i = +b.dataset.i;
        if (ans.has(i)) b.classList.add('ok'); else if (picked.has(i)) b.classList.add('bad');
      });
      return ans.size === picked.size && [...ans].every(i => picked.has(i));
    },
    reset() { locked = false; picked.clear(); paint(); },
  };
}
