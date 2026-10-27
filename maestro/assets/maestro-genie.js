/* MAESTRO GENIE ENGINE v0.1 — progressive enhancement on a static site.
 * No tokens, cookies, trackers, paid services or server-side AI claims.
 * Optional future private TTS adapter: window.MAESTRO_GENIE_VOICE = { speak(text): Promise<void>, stop(): void }.
 * The voice adapter must be implemented on a trusted server, never put API keys or consent recordings in the public repo.
 */
(function () {
  "use strict";
  if (window.MAESTRO_GENIE || !document.body) return;

  const lamp = '<svg viewBox="0 0 64 64" fill="none" aria-hidden="true"><path d="M15 43c4-7 12-8 24-8h8c0 7-4 13-14 13H21z" fill="#e9b45f" stroke="#ffe0a2" stroke-width="2"/><path d="M16 41l-7 1c2 8 12 9 17 4M46 37c10-8 13-4 9 1-3 4-7 5-10 5" stroke="#ffe0a2" stroke-width="3" stroke-linecap="round"/><path d="M36 32c-4-9 11-12 4-24M28 31c-4-7 4-10 3-16" stroke="#76e5e4" stroke-width="3" stroke-linecap="round"/><circle cx="47" cy="17" r="2" fill="#f9df9c"/></svg>';
  const avatar = [
    '<svg class="maestro-genie-avatar" viewBox="0 0 220 230" aria-label="Цифровой советник МАЭСТРО" role="img">',
    '<defs><linearGradient id="mg-suit" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#10364a"/><stop offset=".55" stop-color="#25869a"/><stop offset="1" stop-color="#132339"/></linearGradient>',
    '<linearGradient id="mg-skin" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#e5d3af"/><stop offset="1" stop-color="#a78e78"/></linearGradient>',
    '<linearGradient id="mg-mist" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#87eaf1" stop-opacity=".9"/><stop offset="1" stop-color="#1b88a3" stop-opacity="0"/></linearGradient></defs>',
    '<path d="M76 147Q62 155 56 176Q52 191 83 192Q128 211 109 228Q168 218 126 184Q166 178 162 159L143 142Z" fill="url(#mg-mist)" opacity=".8"/>',
    '<path d="M27 196Q32 148 83 137L93 128L129 127L141 139Q184 148 193 196Z" fill="url(#mg-suit)" stroke="#83deeb" stroke-width="2"/>',
    '<path d="M92 135L111 165L129 135L120 118H101Z" fill="#b59b7d" stroke="#d4c2a6" stroke-width="2"/>',
    '<path d="M92 134L112 166L131 135L145 144L131 194H94L77 145Z" fill="#103044" opacity=".9"/>',
    '<path d="M87 68Q85 40 111 34Q141 35 140 67L139 98Q135 126 112 135Q91 128 85 101Z" fill="url(#mg-skin)" stroke="#edd8b4" stroke-width="2"/>',
    '<path d="M82 77Q71 34 93 25Q95 10 119 17Q148 8 151 39Q157 58 141 76L138 51Q126 42 116 35Q97 53 86 53Z" fill="#c5ccd2" stroke="#a3cbd3" stroke-width="2"/>',
    '<path d="M90 93Q100 83 106 92M116 92Q127 83 134 92" fill="none" stroke="#243f4c" stroke-width="3" stroke-linecap="round"/>',
    '<circle cx="101" cy="93" r="2.5" fill="#69e0ea"/><circle cx="124" cy="93" r="2.5" fill="#69e0ea"/>',
    '<path d="M112 99L108 111L115 114" fill="none" stroke="#785f51" stroke-width="1.8"/>',
    '<path class="maestro-genie-mouth" d="M104 118Q113 121 123 117" fill="none" stroke="#704f47" stroke-width="2.5" stroke-linecap="round"/>',
    '<path d="M84 103Q91 130 111 140Q131 135 141 104Q138 127 121 144L110 150L95 139Z" fill="#a0afb1" opacity=".8"/>',
    '<path d="M67 169Q90 185 111 194Q137 184 152 165" fill="none" stroke="#f5c56d" stroke-width="2"/>',
    '<circle cx="111" cy="175" r="6" fill="#ffd484" stroke="#ffffff" stroke-width="1"/>',
    '</svg>'
  ].join('');

  const root = document.createElement('div');
  root.id = 'maestro-genie-root';
  root.innerHTML =
    '<button type="button" class="maestro-genie-launcher" aria-controls="maestro-genie-panel" aria-expanded="false" aria-label="Вызвать консультанта МАЭСТРО">' + lamp + '<span>Позвать МАЭСТРО</span></button>' +
    '<aside id="maestro-genie-panel" class="maestro-genie-panel" aria-label="Консультант МАЭСТРО" hidden>' +
      '<div class="maestro-genie-head"><div class="maestro-genie-title"><strong>МАЭСТРО · ЦИФРОВОЙ СОВЕТНИК</strong><small>Бесплатная консультация · сценарный режим</small></div>' +
      '<div class="maestro-genie-controls"><button type="button" data-mg="voice" aria-label="Включить озвучивание ответов" aria-pressed="false" title="Включить голос">♫</button>' +
      '<button type="button" data-mg="mic" aria-label="Продиктовать вопрос" title="Продиктовать вопрос">🎙</button>' +
      '<button type="button" data-mg="close" aria-label="Закрыть консультанта">×</button></div></div>' +
      '<div class="maestro-genie-stage">' + avatar +
      '<span class="maestro-genie-star"></span><span class="maestro-genie-star"></span><span class="maestro-genie-star"></span><span class="maestro-genie-star"></span>' +
      '<div class="maestro-genie-status" role="status" aria-live="polite">Готов обсудить вашу задачу</div></div>' +
      '<div class="maestro-genie-chat" role="log" aria-label="История диалога" aria-live="polite" aria-relevant="additions"></div>' +
      '<div class="maestro-genie-quick"><button type="button" data-mg-question="Нужен ИИ-оператор для заявок">ИИ-оператор</button>' +
      '<button type="button" data-mg-question="Нужен сайт">Сайт</button><button type="button" data-mg-question="Нужны CRM и продажи">CRM и продажи</button>' +
      '<button type="button" data-mg-question="Как заказать проект?">Оставить заявку</button>' +
      '<button type="button" data-mg="brief-start">Собрать ТЗ</button></div>' +
      '<form class="maestro-genie-form"><input name="question" type="text" maxlength="400" autocomplete="off" aria-label="Ваш вопрос" placeholder="Расскажите, что нужно бизнесу" required><button type="submit">Отправить</button></form>' +
      '<button type="button" class="maestro-genie-go" data-mg="lead">Перейти к заявке →</button>' +
      '<button type="button" class="maestro-genie-go" data-mg="brief-go" hidden>Открыть готовый черновик ТЗ →</button>' +
      '<p class="maestro-genie-note">Первый этап: ответы по направлениям услуг, без подключения нейросети. Голос браузера может обрабатываться его провайдером. Контакты не отправляются без вашего действия.</p>' +
    '</aside>';
  document.body.append(root);

  const panel = root.querySelector('.maestro-genie-panel');
  const launcher = root.querySelector('.maestro-genie-launcher');
  const chat = root.querySelector('.maestro-genie-chat');
  const status = root.querySelector('.maestro-genie-status');
  const input = root.querySelector('input[name="question"]');
  const voiceButton = root.querySelector('[data-mg="voice"]');
  const micButton = root.querySelector('[data-mg="mic"]');
  const state = { voice: false, topic: 'general', lastQuestion: '', leadInterest: null, recognition: null, speaking: false, wizard: null };

  const knowledge = {
    general: 'Здравствуйте! Я МАЭСТРО. Помогаю выбрать подходящее направление: сайты, боты, ИИ-операторы, CRM, маркетинг, команда и аналитика. Расскажите, что вы хотите улучшить. Я могу помочь сформулировать заявку.',
    ai: 'ИИ-оператор может отвечать на типовые вопросы, собирать заявки и передавать обращения менеджеру. Для расчёта уточним канал (сайт, Telegram, MAX), объём обращений, используемую CRM и требования к передаче человеку. Покажем доступные варианты после уточнения задачи.',
    web: 'Разрабатываем сайты услуг, лендинги, каталоги и цифровые витрины. Важны цель сайта, примеры конкурентов, основные разделы, формы заявок и интеграции. Запишем требования и подготовим предложение.',
    crm: 'В CRM можно выстроить воронку, статусы обращений, напоминания, ответственных и аналитику. Начнём с источников заявок и того, где сейчас теряются обращения.',
    marketing: 'Поможем с позиционированием, рекламными материалами и аналитикой обращений. Чтобы выбрать формат, определим продукт, аудиторию, географию и доступный бюджет.',
    hr: 'Можно автоматизировать приём откликов, первичную анкету, согласование кандидатов и контроль задач команды. Чувствительные решения о найме остаются за человеком.',
    audit: 'Начнём с диагностики процессов: точки потерь, повторяющиеся операции и возможные быстрые улучшения. Для конкретного плана нужны сведения о текущем процессе.',
    price: 'На сайте приведены ориентировочные пакеты: «Старт» — 9 900 ₽, «Рост» — 24 900 ₽, «Система» — 49 900 ₽, Enterprise — от 99 000 ₽. Итог зависит от состава работ. Могу помочь оформить запрос на индивидуальную оценку.',
    lead: 'Чтобы получить предложение, нажмите «Перейти к заявке». Я перенесу тему обсуждения в форму. Впишите имя и контакт, ознакомьтесь с согласием на обработку данных и отправьте заявку по инструкции сайта.'
  };
  const intentChecks = [
    ['lead', ['заказать', 'оформить заявку', 'оставить заявку', 'связаться', 'контакт', 'обсудить проект', 'написать нам']],
    ['price', ['цен', 'стои', 'сколько', 'рубл', 'тариф', 'бюджет']],
    ['ai', ['ии-', 'ai-', 'нейросет', 'оператор', 'бот', 'автоматиз', 'телеграм', 'telegram', 'max']],
    ['crm', ['crm', 'црм', 'воронк', 'продаж', 'лид', 'клиент', 'звонк']],
    ['web', ['сайт', 'лендинг', 'витрин', 'каталог', 'интернет-магаз', 'web']],
    ['marketing', ['маркетинг', 'реклам', 'дизайн', 'контент', 'бренд']],
    ['hr', ['сотрудник', 'кадр', 'hr', 'найм', 'команд', 'персонал']],
    ['audit', ['аудит', 'аналитик', 'провер', 'процесс', 'эффективн']]
  ];

  function addMessage(from, text) {
    const item = document.createElement('div');
    item.className = 'maestro-genie-msg ' + from;
    item.textContent = text;
    chat.append(item);
    chat.scrollTop = chat.scrollHeight;
  }
  function setStatus(message) { status.textContent = message; }
  function chooseTopic(text) {
    const q = text.toLowerCase().replace(/ё/g, 'е');
    for (const entry of intentChecks) if (entry[1].some(word => q.includes(word))) return entry[0];
    return 'general';
  }
  function cancelSpeech() {
    try { window.speechSynthesis?.cancel(); } catch (_) {}
    try { window.MAESTRO_GENIE_VOICE?.stop?.(); } catch (_) {}
    panel.classList.remove('is-talking');
    state.speaking = false;
  }
  async function say(text) {
    if (!state.voice) return;
    cancelSpeech();
    const custom = window.MAESTRO_GENIE_VOICE;
    if (custom && typeof custom.speak === 'function') {
      try {
        panel.classList.add('is-talking');
        state.speaking = true;
        await custom.speak(text);
        panel.classList.remove('is-talking');
        state.speaking = false;
        return;
      } catch (_) { setStatus('Персональный голос недоступен — включён резервный'); }
    }
    if (!('speechSynthesis' in window)) { setStatus('В этом браузере нет синтеза речи'); return; }
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'ru-RU'; u.rate = 0.98; u.pitch = 0.96;
    const voices = window.speechSynthesis.getVoices();
    const voice = voices.find(v => v.lang?.toLowerCase() === 'ru-ru') || voices.find(v => v.lang?.toLowerCase().startsWith('ru'));
    if (voice) u.voice = voice;
    u.onstart = () => { state.speaking = true; panel.classList.add('is-talking'); setStatus('МАЭСТРО говорит'); };
    u.onend = u.onerror = () => { state.speaking = false; panel.classList.remove('is-talking'); setStatus('Готов к вашему вопросу'); };
    window.speechSynthesis.speak(u);
  }
  const wizardPrompts = [
    'Какую услугу или систему хотите получить? Например: бот для сайта, CRM или автоматизация обработки заявок.',
    'Чем занимается компания? Укажи сферу бизнеса, без персональных данных.',
    'Какую проблему необходимо решить и каким должен быть результат?',
    'Как этот процесс организован сейчас? Какие операции выполняют люди?',
    'К каким сервисам нужно подключиться: сайт, MAX, Telegram, CRM, почта или другое?'
  ];
  function startWizard() {
    cancelSpeech();
    state.wizard = { step: 0, answers: [] };
    root.querySelector('[data-mg="brief-go"]').hidden = true;
    const first = 'Создадим предварительное ТЗ за пять коротких вопросов. Если захотите остановиться, напишите «отмена». ' + wizardPrompts[0];
    addMessage('assistant', first);
    setStatus('Конструктор ТЗ: вопрос 1 из 5');
    void say(first);
    input.focus();
  }
  function answerWizard(answer) {
    if (/^отмена$/i.test(answer.trim())) {
      state.wizard = null;
      const message = 'Сбор ТЗ отменён. Можем продолжить обсуждение любой услуги.';
      addMessage('assistant', message);
      setStatus('Режим консультанта');
      void say(message);
      return;
    }
    state.wizard.answers.push(answer);
    state.wizard.step++;
    if (state.wizard.step < wizardPrompts.length) {
      const number = state.wizard.step + 1;
      const prompt = 'Вопрос ' + number + ' из 5. ' + wizardPrompts[state.wizard.step];
      addMessage('assistant', prompt);
      setStatus('Конструктор ТЗ: вопрос ' + number + ' из 5');
      void say(prompt);
    } else {
      const complete = 'Черновик готов! Нажмите «Открыть готовый черновик ТЗ», проверьте требования и при желании сохраните документ или подготовьте заявку.';
      addMessage('assistant', complete);
      try {
        sessionStorage.setItem('maestro_genie_brief_v1', JSON.stringify({
          answers: state.wizard.answers, created: Date.now()
        }));
        root.querySelector('[data-mg="brief-go"]').hidden = false;
        setStatus('Черновик ТЗ готов');
      } catch (_) {
        addMessage('assistant', 'Передать заполненные поля не удалось из-за настроек браузера. Можно заполнить конструктор вручную.');
        setStatus('Хранение в браузере недоступно');
      }
      state.wizard = null;
      void say(complete);
    }
  }
  function ask(text) {
    const question = String(text || '').trim().slice(0, 400);
    if (!question) return;
    cancelSpeech();
    state.lastQuestion = question;
    addMessage('user', question);
    if (state.wizard) { answerWizard(question); return; }
    const topic = chooseTopic(question);
    if (topic !== 'general') state.topic = topic;
    const answer = knowledge[topic] || knowledge.general;
    addMessage('assistant', answer);
    setStatus('Ответ по базе услуг');
    void say(answer);
  }
  function open() {
    if (!panel.hidden) return;
    panel.hidden = false;
    launcher.setAttribute('aria-expanded', 'true');
    launcher.hidden = true;
    if (!chat.children.length) addMessage('assistant', knowledge.general);
    input.focus();
  }
  function close() {
    cancelSpeech();
    if (state.recognition) { try { state.recognition.stop(); } catch (_) {} }
    panel.hidden = true;
    launcher.hidden = false;
    launcher.setAttribute('aria-expanded', 'false');
    state.leadInterest = null;
    launcher.focus();
  }
  function setLeadInterest(value) {
    const select = document.getElementById('interest');
    state.leadInterest = select && [...select.options].some(option => option.value === value) ? value : null;
  }
  function fillLead() {
    const select = document.getElementById('interest');
    const details = document.getElementById('business');
    const form = document.getElementById('lead');
    const values = { ai: 'ИИ-оператор', web: 'Сайт', crm: 'CRM', marketing: 'Другое', hr: 'HR', audit: 'Аудит', price: 'Другое', general: 'Другое', lead: 'Другое' };
    if (select) select.value = state.leadInterest || values[state.topic] || 'Другое';
    if (details && !details.value.trim() && state.lastQuestion) details.value = 'Обсуждали с консультантом: ' + state.lastQuestion;
    close();
    if (form) form.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
    setTimeout(() => document.getElementById('name')?.focus({ preventScroll: true }), 400);
  }
  function dictate() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) { setStatus('Диктовка не поддерживается. Напишите вопрос текстом.'); input.focus(); return; }
    if (state.recognition) { try { state.recognition.stop(); } catch (_) {} state.recognition = null; return; }
    const recognition = new SpeechRecognition();
    state.recognition = recognition;
    recognition.lang = 'ru-RU';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onstart = () => setStatus('Слушаю — задайте вопрос');
    recognition.onresult = event => { const transcript = event.results[0]?.[0]?.transcript; if (transcript) ask(transcript); };
    recognition.onerror = () => setStatus('Микрофон недоступен. Напишите вопрос.');
    recognition.onend = () => { state.recognition = null; if (!state.speaking) setStatus('Готов к вашему вопросу'); };
    try { recognition.start(); } catch (_) { state.recognition = null; setStatus('Не удалось включить микрофон'); }
  }

  launcher.addEventListener('click', open);
  root.querySelector('[data-mg="close"]').addEventListener('click', close);
  root.querySelector('[data-mg="lead"]').addEventListener('click', fillLead);
  root.querySelector('[data-mg="brief-start"]').addEventListener('click', startWizard);
  root.querySelector('[data-mg="brief-go"]').addEventListener('click', () => { window.location.href = 'brief-builder.html'; });
  voiceButton.addEventListener('click', () => {
    state.voice = !state.voice;
    voiceButton.setAttribute('aria-pressed', String(state.voice));
    voiceButton.title = state.voice ? 'Отключить голос' : 'Включить голос';
    voiceButton.setAttribute('aria-label', voiceButton.title);
    if (!state.voice) cancelSpeech();
    setStatus(state.voice ? 'Озвучивание включено' : 'Озвучивание выключено');
  });
  micButton.addEventListener('click', dictate);
  root.querySelectorAll('[data-mg-question]').forEach(button => button.addEventListener('click', () => ask(button.getAttribute('data-mg-question'))));
  root.querySelector('.maestro-genie-form').addEventListener('submit', event => {
    event.preventDefault();
    ask(input.value);
    input.value = '';
    input.focus();
  });
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && !panel.hidden) close(); });
  const nav = document.getElementById('links');
  if (nav) {
    const navButton = document.createElement('button');
    navButton.type = 'button';
    navButton.className = 'maestro-genie-nav';
    navButton.textContent = '✦ Позвать МАЭСТРО';
    navButton.addEventListener('click', () => {
      open();
      nav.classList.remove('open');
      document.getElementById('menu')?.setAttribute('aria-expanded', 'false');
    });
    nav.append(navButton);
  }
  window.MAESTRO_GENIE = Object.freeze({ open, close, ask, setLeadInterest, stopVoice: cancelSpeech });
})();
