(() => {
  const form=document.getElementById('home-demo');
  if(!form)return;
  const input=form.querySelector('textarea'),out=document.getElementById('home-demo-result');
  const examples={site:'Нужен сайт для студии мебели: показать коллекции и принимать заявки.',crm:'Заявки приходят из разных чатов и теряются. Нужны статусы и ответственные.',hr:'Нужно упорядочить отклики кандидатов и адаптацию новых сотрудников.'};
  document.querySelectorAll('[data-demo-example]').forEach(button=>button.addEventListener('click',()=>{input.value=examples[button.dataset.demoExample];form.requestSubmit()}));
  form.addEventListener('submit',event=>{
    event.preventDefault();const text=input.value.trim().toLowerCase();if(!text)return;
    let title='Разбор задачи',steps=['Уточнить текущий процесс и желаемый результат','Определить данные, участников и ограничения','Согласовать первый проверяемый этап'];
    if(/сайт|лендинг|каталог|витрин/.test(text)){title='Сайт и цифровая витрина';steps=['Разобрать аудиторию, предложение и материалы','Собрать структуру и интерактивный прототип','Проверить мобильную версию и путь до обращения']}
    else if(/кандидат|сотрудник|подбор|адаптац|hr/.test(text)){title='HR и работа с командой';steps=['Определить этапы подбора или адаптации','Собрать карточку кандидата и ответственных','Настроить статусы, напоминания и базу знаний']}
    else if(/заявк|crm|чат|продаж|статус/.test(text)){title='Заявки и CRM';steps=['Составить карту входящих каналов','Определить статусы и ответственных','Проверить передачу обращения и контроль следующего шага']}
    out.replaceChildren();const heading=document.createElement('strong');heading.textContent=title;const list=document.createElement('ol');steps.forEach(step=>{const item=document.createElement('li');item.textContent=step;list.append(item)});out.append(heading,list);out.hidden=false;
  });
})();
