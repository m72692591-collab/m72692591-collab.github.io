// Shared navigation and description data for both presentations of MAESTRO NEXT.
export const catalog = [
  {id:'strategy', title:'Стратегия', description:'Разберём задачу, клиентов и предложение, чтобы выбрать первый шаг.', href:'#solutions', interest:'Аудит'},
  {id:'sites', title:'Сайты и дизайн', description:'Сайт, лендинг или витрина с понятным путём к обращению.', href:'#solutions', interest:'Сайт'},
  {id:'marketing', title:'Маркетинг', description:'Покажем ценность предложения и проверим каналы привлечения.', href:'#solutions', interest:'Другое'},
  {id:'sales', title:'Продажи и CRM', description:'Соберём входящие обращения, статусы и ответственных в один процесс.', href:'#products', interest:'CRM'},
  {id:'automation', title:'Автоматизация', description:'Уберём повторяющиеся операции и настроим передачу данных.', href:'#products', interest:'Автоматизация'},
  {id:'ai', title:'ИИ-оператор', description:'Проверим, где цифровой помощник может быть полезен команде.', href:'#lab', interest:'ИИ-оператор'},
  {id:'team', title:'Команда', description:'Опишем роли, подбор и рабочие договорённости.', href:'#solutions', interest:'HR'},
  {id:'analytics', title:'Аналитика', description:'Определим показатели и способ видеть результат работы.', href:'#solutions', interest:'Аудит'},
  {id:'cases', title:'Портфолио', description:'Посмотрите доступные примеры работ и решений.', href:'#portfolio', interest:'Другое'},
  {id:'pricing', title:'Форматы работы', description:'Сравните существующие форматы работы и обсудите состав проекта.', href:'#pricing', interest:'Другое'},
  {id:'documents', title:'Документы', description:'Реквизиты и условия работы доступны до обращения.', href:'#documents', interest:'Другое'}
];

// Live screens read only their topic's exact authored copy from the classic cards.
const topicSources = {
  strategy: {icon:'strategy', cards:[{section:'solutions', heading:'Стратегия и предложение', selector:'.palette article'}, {section:'products', heading:'Аудит рекламы и обращений'}]},
  sites: {icon:'view', cards:[{section:'solutions', heading:'Сайты, лендинги, блоги и цифровые витрины'}, {section:'products', heading:'Лендинг'}, {section:'products', heading:'Блог'}]},
  marketing: {icon:'marketing', cards:[{section:'solutions', heading:'Маркетинг и аналитика'}, {section:'products', heading:'Аудит рекламы и обращений'}]},
  sales: {icon:'finance', cards:[{section:'solutions', heading:'CRM и продажи'}]},
  automation: {icon:'automation', cards:[{section:'solutions', heading:'Авто-КП и документооборот'}, {section:'products', heading:'Бот'}]},
  ai: {icon:'chat', cards:[{section:'solutions', heading:'ИИ для бизнеса'}, {section:'products', heading:'Голосовой ИИ'}], link:{href:'maestro-lab.html', label:'Попробовать демо ИИ-оператора'}},
  team: {icon:'team', cards:[{section:'solutions', heading:'HR и KPI'}]},
  analytics: {icon:'strategy', cards:[{section:'solutions', heading:'Маркетинг и аналитика'}]},
  cases: {icon:'view', collection:{section:'portfolio', selector:'.grid3 > .card'}, intro:true},
  pricing: {icon:'finance', collection:{section:'pricing', selector:'.pricing > .price'}, note:true},
  documents: {icon:'view', collection:{section:'documents', selector:'.docs > .doc'}, intro:true}
};
catalog.forEach(item => { item.topic = topicSources[item.id]; });
