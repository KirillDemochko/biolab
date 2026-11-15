// Короткий ответ: число или строка символов.
// Формат: { answer: ["вариант1", "вариант2"], placeholder?: "..." }
// При сравнении игнорируются пробелы, дефисы, регистр и путаница латинских и русских букв.
const LAT = { A: 'А', C: 'Ц', G: 'Г', U: 'У', T: 'Т', Y: 'У', X: 'Х', B: 'В', E: 'Е', K: 'К', M: 'М', H: 'Н', O: 'О', P: 'Р' };
const SEQ = /^[ACGUTАЦГУТ\s\-–—'′53]+$/i;
function norm(s) {
  let v = String(s).trim().toUpperCase().replace(/[\s\-–—'′’`]/g, '').replace(/,/g, '.');
  if (SEQ.test(s)) v = v.replace(/[53]/g, '').replace(/[ACGUT]/g, ch => LAT[ch]);
  return v;
}
export function create(item, host, onChange) {
  host.innerHTML = `<input class="answer" type="text" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="${item.placeholder || 'Ваш ответ'}" aria-label="Ответ"><p class="right-answer" hidden></p>`;
  const input = host.querySelector('input'), right = host.querySelector('.right-answer');
  input.addEventListener('input', onChange);
  return {
    ready: () => input.value.trim().length > 0,
    check() {
      const ok = item.answer.some(a => norm(a) === norm(input.value));
      input.readOnly = true; input.classList.add(ok ? 'ok' : 'bad');
      if (!ok) { right.hidden = false; right.textContent = `Верный ответ: ${item.answer[0]}`; }
      return ok;
    },
    reset() { input.readOnly = false; input.value = ''; input.classList.remove('ok', 'bad'); right.hidden = true; },
  };
}
