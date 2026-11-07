/* Public intake only. No administrative credentials belong in this file. */
(() => {
  'use strict';
  const form = document.getElementById('leadForm');
  const result = document.getElementById('result');
  const endpoint = document.querySelector('meta[name="maestro-lead-endpoint"]')?.content;
  const allowedEndpoint = 'https://maestro-business-ai-g-m-v.msk1.amvera.tech/lead';
  if (!form || !result || endpoint !== allowedEndpoint) return;
  const button = form.querySelector('button[type="submit"]');
  const value = id => document.getElementById(id).value.trim();
  const services = { 'Сайт': 'website', 'Лендинг': 'website', 'Блог': 'website',
    'Бот': 'chatbot', 'CRM': 'crm', 'ИИ-оператор': 'ai', 'Автоматизация': 'automation' };
  let pending = false;
  if (button) button.textContent = 'Отправить заявку';
  result.setAttribute('role', 'status');
  result.setAttribute('aria-live', 'polite');
  const show = text => { result.style.display = 'block'; result.textContent = text; };
  form.addEventListener('submit', async event => {
    event.preventDefault();
    event.stopImmediatePropagation();
    if (pending || !form.reportValidity()) return;
    const name = value('name'), contact = value('contact'), interest = value('interest');
    const message = 'Интерес: ' + interest + '\nБизнес: ' + value('business') + '\nЧто уже есть: ' + value('channels');
    if (!document.getElementById('agree').checked) {
      show('Для отправки нужно согласие на обработку данных.'); return;
    }
    if (name.length > 100 || contact.length > 200 || message.length > 2000) {
      show('Заявка не отправлена. Сократите имя до 100, контакт до 200, описание бизнеса и текущих инструментов вместе до 1900 знаков. Полный текст сохранён в полях.'); return;
    }
    pending = true;
    if (button) button.disabled = true;
    show('Отправляем заявку…');
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch(endpoint, {
        method: 'POST', credentials: 'omit', cache: 'no-store',
        headers: { 'Content-Type': 'application/json' }, signal: controller.signal,
        body: JSON.stringify({ name, contact, service: services[interest] || 'other',
          message, consent: true, page: location.origin + location.pathname, website: '' })
      });
      const data = await response.json();
      if (response.status === 200 && data.ok === true && Number.isSafeInteger(data.lead_id) && data.lead_id > 0) {
        show('Заявка №' + data.lead_id + ' принята. Ответим по указанному контакту.');
      } else if (response.status === 429) {
        show('Слишком много попыток. Подождите несколько минут и повторите. Текст остаётся в форме.');
      } else if (response.status === 400) {
        show('Заявка не принята. Проверьте контакт: телефон, почта или имя пользователя с @. Текст остаётся в форме.');
      } else {
        show('Не удалось подтвердить приём заявки. Текст остаётся в форме; попробуйте отправить ещё раз.');
      }
    } catch (_) {
      show('Не удалось подтвердить приём заявки. Проверьте соединение и повторите отправку. Текст остаётся в форме.');
    } finally {
      clearTimeout(timer);
      pending = false;
      if (button) button.disabled = false;
    }
  }, true);
})();
