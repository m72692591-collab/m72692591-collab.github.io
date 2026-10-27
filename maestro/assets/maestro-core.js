/* Shared deterministic catalogue. No paid API, network or personal-data storage. */
(function (scope) {
  'use strict';
  const services = Object.freeze({
    ai: {label:'ИИ-оператор', title:'ИИ-оператор и бот', words:['бот','чат-бот','оператор','нейросет','ии-','telegram-бот','max-бот']},
    crm: {label:'CRM', title:'CRM и продажи', words:['crm','црм','воронк','продаж','лид']},
    web: {label:'Сайт', title:'Сайты и витрины', words:['сайт','лендинг','витрин','каталог','интернет-магаз']},
    marketing: {label:'Другое', title:'Маркетинг и дизайн', words:['маркетинг','реклам','дизайн','контент','бренд']},
    hr: {label:'HR', title:'Команда и найм', words:['сотрудник','кадр','hr','найм','персонал']},
    audit: {label:'Аудит', title:'Аудит процессов', words:['аудит','аналитик','провер','диагност']},
    automation: {label:'Автоматизация', title:'Автоматизация', words:['автоматиз','процесс','интеграц']}
  });
  const normalize = value => String(value || '').toLocaleLowerCase('ru').replace(/ё/g,'е');
  const botWord = /(?:^|[^\p{L}\p{N}_])(?:чат[-\s]?)?бот(?:а|ов|у|ом|е|ы|ам|ами|ах)?(?=$|[^\p{L}\p{N}_])/u;
  function service(text) {
    const q = normalize(text);
    for (const [key, item] of Object.entries(services)) if (item.words.some(w => w === 'бот' ? botWord.test(q) : q.includes(w))) return key;
    return null;
  }
  function intent(text) {
    const q=normalize(text);
    if (/открой|покажи|перейди/.test(q)) {
      if (/лаборатор|демо/.test(q)) return 'navigate_lab';
      if (/конструктор|техническ|тз/.test(q)) return 'navigate_brief';
    }
    if (['заказать','оформить заявку','оставить заявку','связаться','контакт','обсудить проект'].some(w=>q.includes(w))) return 'lead';
    if (['цена','цену','стоим','стоит','сколько','тариф','бюджет'].some(w=>q.includes(w))) return 'price';
    return service(text) || 'general';
  }
  function briefKind(text) {
    const q=normalize(text);
    if (botWord.test(q)) return 'Бот';
    return services[service(text)]?.label || 'Автоматизация';
  }
  function integrations(text) {
    const q=normalize(text), out=[];
    for (const [label, variants] of Object.entries({Telegram:['telegram','телеграм'],MAX:['max','макс'],CRM:['crm','црм'],Сайт:['сайт'], 'Электронная почта':['почт','email','e-mail'],Таблицы:['таблиц','excel'],Платежи:['платеж','оплат']}))
      if (variants.some(v=>q.includes(v))) out.push(label);
    return out;
  }
  function summary(messages, chosen) {
    const unique=[...new Set(messages.map(x=>String(x).trim()).filter(Boolean))].slice(-12);
    const title=services[chosen]?.label || 'Уточнить направление';
    const text='Направление: '+title+'\nСодержание беседы:\n'+unique.map((s,i)=>(i+1)+'. '+s).join('\n');
    return text.slice(0,5000);
  }
  scope.MaestroCore=Object.freeze({services,service,intent,briefKind,integrations,summary});
})(typeof window==='undefined'?globalThis:window);
