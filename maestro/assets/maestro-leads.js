/* MAESTRO lead enhancement. Inactive until explicit, HTTPS meta configuration.
 * Does not store contacts in localStorage or send to third parties by default.
 * Production activation requires an RF-hosted HTTPS API and legal/QA review.
 */
(() => {
  "use strict";
  const form = document.getElementById("leadForm");
  const result = document.getElementById("result");
  const endpoint = document.querySelector('meta[name="maestro-lead-endpoint"]')?.content?.trim();
  if (!form || !result || !endpoint) return; // Existing copy-to-clipboard flow works as before.
  let target;
  try {
    target = new URL(endpoint);
    if (target.protocol !== "https:" || target.username || target.password || target.hash || target.search) return;
  } catch (_) { return; }

  // Honeypot visible to automated crawlers but not normal visitors.
  const honey = document.createElement("input");
  honey.type = "text";
  honey.name = "website";
  honey.autocomplete = "off";
  honey.tabIndex = -1;
  honey.setAttribute("aria-hidden", "true");
  honey.style.cssText = "position:absolute!important;left:-10000px!important;width:1px;height:1px;opacity:0;";
  form.appendChild(honey);

  const button = form.querySelector('button[type="submit"]');
  const value = id => document.getElementById(id)?.value?.trim() || "";
  let pending = false;
  function feedback(message) {
    result.textContent = message;
    result.classList.add("show");
    result.setAttribute("role", "status");
    result.setAttribute("aria-live", "polite");
  }
  async function backup(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (_) { return false; }
  }
  form.addEventListener("submit", async event => {
    // Capture ensures only one pathway runs: the original copy handler is not triggered twice.
    event.preventDefault();
    event.stopImmediatePropagation();
    if (pending || !form.reportValidity()) return;
    if (!document.getElementById("agree")?.checked) {
      feedback("Для отправки требуется согласие на обработку персональных данных.");
      return;
    }
    const payload = {
      name: value("name"), contact: value("contact"),
      interest: value("interest"), business: value("business"),
      channels: value("channels"), consent: true, website: honey.value
    };
    pending = true;
    if (button) { button.disabled = true; button.textContent = "Отправляем…"; }
    feedback("Защищённо передаём обращение на сервер. Не закрывайте страницу до подтверждения.");
    const timeout = new AbortController();
    const watchdog = setTimeout(() => timeout.abort(), 15000);
    try {
      const response = await fetch(target.href, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload), mode: "cors", credentials: "omit",
        cache: "no-store", signal: timeout.signal
      });
      const reply = await response.json().catch(() => null);
      if (response.status === 201 && reply?.ok === true && reply.received === true && typeof reply.reference === "string") {
        feedback("Обращение зарегистрировано на сервере МАЭСТРО. Номер: " + reply.reference + ". Мы свяжемся с вами по указанному контакту.");
        form.reset();
      } else if (response.status === 429) {
        feedback("Отправлено слишком много обращений. Попробуйте позже или используйте контактные способы связи.");
      } else {
        feedback("Сервер не подтвердил приём заявки. Обращение может не быть доставлено. Сохраните его текст и свяжитесь с нами другим способом.");
      }
    } catch (_) {
      feedback("Нет подтверждения доставки: соединение прервано либо сервер не ответил. Заявка могла дойти. Перед повтором проверьте её статус.");
      const text = "Заявка MAESTRO\nИмя: " + payload.name + "\nКонтакт: " + payload.contact +
        "\nУслуга: " + payload.interest + "\nБизнес: " + payload.business + "\nПроцессы: " + payload.channels;
      if (await backup(text)) feedback(result.textContent + "\nРезервная копия заявки сохранена в буфер обмена.");
    } finally {
      clearTimeout(watchdog);
      pending = false;
      if (button) { button.disabled = false; button.textContent = "Отправить заявку"; }
    }
  }, { capture: true });
})();