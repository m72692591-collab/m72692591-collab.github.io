/* Inactive until an approved HTTPS receiver is explicitly configured.
 * No contacts in localStorage, analytics or automatic clipboard transfers.
 * Same unchanged request in this open tab reuses a cryptographically random UUID.
 */
(() => {
  'use strict';
  const form = document.getElementById('leadForm');
  const result = document.getElementById('result');
  const endpoint = document.querySelector('meta[name="maestro-lead-endpoint"]')?.content?.trim();
  if (!form || !result || !endpoint) return;
  let target;
  try {
    target = new URL(endpoint);
    if (target.protocol !== 'https:' || target.username || target.password || target.hash || target.search) return;
  } catch (_) { return; }
  const honey = document.createElement('input');
  honey.type = 'text'; honey.name = 'website'; honey.autocomplete = 'off'; honey.tabIndex = -1;
  honey.setAttribute('aria-hidden', 'true');
  honey.style.cssText = 'position:absolute!important;left:-10000px!important;width:1px;height:1px;opacity:0;';
  form.append(honey);
  const button = form.querySelector('button[type="submit"]');
  if (button) button.textContent = 'Отправить заявку';
  const value = id => document.getElementById(id)?.value?.trim() || '';
  const limits = {name:100, contact:160, interest:60, business:6000, channels:1500};
  const labels = {name:'Имя', contact:'Контакт', interest:'Направление', business:'Описание задачи', channels:'Текущие каналы'};
  let pending = false, retry = null;
  function feedback(text) {
    result.textContent = text;
    result.classList.add('show');
    result.setAttribute('role', 'status');
    result.setAttribute('aria-live', 'polite');
  }
  function uuid() {
    if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
    const b = crypto.getRandomValues(new Uint8Array(16));
    b[6] = (b[6] & 15) | 64; b[8] = (b[8] & 63) | 128;
    const h = [...b].map(x => x.toString(16).padStart(2, '0')).join('');
    return [h.slice(0,8),h.slice(8,12),h.slice(12,16),h.slice(16,20),h.slice(20)].join('-');
  }
  form.addEventListener('submit', async event => {
    event.preventDefault();
    event.stopImmediatePropagation();
    if (pending || !form.reportValidity()) return;
    if (!document.getElementById('agree')?.checked) {
      feedback('Для отправки требуется согласие на обработку персональных данных.'); return;
    }
    const payload = {name:value('name'),contact:value('contact'),interest:value('interest'),business:value('business'),channels:value('channels'),consent:true,website:honey.value};
    for (const [key, maximum] of Object.entries(limits)) {
      if ([...payload[key]].length > maximum) {
        feedback(labels[key] + ': не более ' + maximum + ' символов. Текст не обрезан.'); return;
      }
    }
    const snapshot = JSON.stringify(payload);
    try {
      if (!retry || retry.snapshot !== snapshot) retry = {snapshot, id:uuid()};
    } catch (_) { feedback('Браузер не поддерживает безопасный идентификатор отправки. Данные остались в форме.'); return; }
    payload.request_id = retry.id;
    const body = JSON.stringify(payload);
    if (new TextEncoder().encode(body).length > 65536) {
      feedback('Заявка слишком велика. Сократите описание; текст не обрезан.'); return;
    }
    pending = true;
    if (button) { button.disabled = true; button.textContent = 'Отправляем…'; }
    feedback('Передаём обращение. Подтверждение появится после записи на сервере.');
    const controller = new AbortController();
    const watchdog = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch(target.href, {method:'POST',headers:{'Content-Type':'application/json'},body,mode:'cors',credentials:'omit',cache:'no-store',signal:controller.signal});
      const reply = await response.json().catch(() => null);
      if ((response.status === 201 || response.status === 200) && reply?.ok === true && reply.received === true && /^M-\d{7,}$/.test(reply.reference || '')) {
        feedback((reply.duplicate ? 'Повтор подтверждён без создания второй заявки. ' : 'Обращение зарегистрировано. ') + 'Номер: ' + reply.reference + '.');
        form.reset(); retry = null;
      } else if (response.status === 422 && reply?.error === 'field_too_long') {
        feedback((labels[reply.field] || 'Поле') + ': превышена допустимая длина. Текст сохранён в форме, ничего не обрезано.');
      } else if (response.status === 409) {
        feedback('Номер повторной отправки связан с другой версией заявки. Данные остаются в форме; требуется проверка, прежде чем отправлять заново.');
      } else if (response.status === 429) {
        feedback('Слишком много новых обращений. Попробуйте позже. Неизменный повтор уже принятой заявки не создаёт дубль.');
      } else {
        feedback('Сервер не подтвердил приём. Текст остался в форме. Для повтора той же заявки используйте эту же вкладку.');
      }
    } catch (_) {
      feedback('Подтверждение доставки не получено. Заявка могла дойти. Повтор в этой же вкладке с неизменным текстом использует прежний номер операции и не создаёт вторую запись.');
    } finally {
      clearTimeout(watchdog); pending = false;
      if (button) { button.disabled = false; button.textContent = 'Отправить заявку'; }
    }
  }, {capture:true});
})();
