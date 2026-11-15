// Соответствие: каждой строке нужно выбрать категорию.
// Формат: { categories: [...], rows: [{ t: "текст", c: индекс категории }] }
import { shuffle } from './util.js';

export function create(item, host, onChange) {
  const rows = shuffle(item.rows.map((r, i) => ({ ...r, i })));
  const picked = new Map(); let locked = false;
  host.innerHTML = rows.map(r => `
    <div class="match-row" data-i="${r.i}">
      <p>${r.t}</p>
      <div class="seg">${item.categories.map((c, ci) => `<button data-c="${ci}" aria-pressed="false">${c}</button>`).join('')}</div>
    </div>`).join('');
  const paint = () => host.querySelectorAll('.match-row').forEach(row => {
    row.classList.remove('ok', 'bad');
    row.querySelectorAll('button').forEach(b => { b.setAttribute('aria-pressed', picked.get(+row.dataset.i) === +b.dataset.c); b.disabled = locked; b.classList.remove('right'); });
  });
  host.onclick = e => {
    const b = e.target.closest('.seg button'); if (!b || locked) return;
    picked.set(+b.closest('.match-row').dataset.i, +b.dataset.c); paint(); onChange();
  };
  return {
    ready: () => picked.size === rows.length,
    check() {
      locked = true; paint(); let all = true;
      host.querySelectorAll('.match-row').forEach(row => {
        const r = item.rows[+row.dataset.i], ok = picked.get(+row.dataset.i) === r.c;
        row.classList.add(ok ? 'ok' : 'bad'); if (!ok) { all = false; row.querySelector(`[data-c="${r.c}"]`).classList.add('right'); }
      });
      return all;
    },
    reset() { locked = false; picked.clear(); paint(); },
  };
}
