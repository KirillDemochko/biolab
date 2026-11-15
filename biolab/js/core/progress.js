// Прогресс ученика. Сейчас хранится в браузере; позже этот же интерфейс
// можно переключить на сервер, не трогая модели и задания.
const KEY = 'biolab:v1';
let state = load();

function load() {
  try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; }
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* приватный режим — живём без сохранения */ }
}

export const progress = {
  get(scope, id) { return state[scope]?.[id]; },
  set(scope, id, value) { (state[scope] ??= {})[id] = value; save(); },
  remove(scope, id) { if (state[scope]) { delete state[scope][id]; save(); } },
};
