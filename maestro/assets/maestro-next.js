import {catalog} from './maestro-next-catalog.js';

const root=document.getElementById('next-experience');
if(root){
  const classic=document.getElementById('next-classic');
  const live=document.getElementById('next-live');
  const orbit=document.getElementById('next-orbit');
  const title=document.getElementById('next-title');
  const description=document.getElementById('next-description');
  const open=document.getElementById('next-open');
  const lead=document.getElementById('next-lead');
  const question=document.getElementById('next-question');
  const answer=document.getElementById('next-answer');
  let active=catalog[0],scene=null,loading=null;
  const reduce=matchMedia('(prefers-reduced-motion: reduce)');
  const select=(item)=>{
    active=item;title.textContent=item.title;description.textContent=item.description;open.href=item.href;
    lead.href='#lead';orbit.querySelectorAll('button').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.id===item.id)));
    answer.textContent='';scene?.focus(catalog.indexOf(item));
    const interest=document.getElementById('interest');if(interest&&[...interest.options].some(option=>option.value===item.interest))interest.value=item.interest;
  };
  const classicList=document.getElementById('next-classic-list');
  catalog.forEach((item)=>{
    const link=document.createElement('a');link.href=item.href;
    const strong=document.createElement('strong');strong.textContent=item.title;
    const span=document.createElement('span');span.textContent=item.description;
    link.append(strong,span);link.addEventListener('click',()=>select(item));classicList.append(link);
    const button=document.createElement('button');button.type='button';button.textContent=item.title;button.dataset.id=item.id;
    button.addEventListener('click',()=>select(item));orbit.append(button);
  });
  select(active);
  const fallback=(message)=>{document.getElementById('next-canvas').replaceChildren();document.getElementById('next-fallback').textContent=message;document.getElementById('next-fallback').hidden=false;orbit.classList.add('next-static');orbit.querySelectorAll('button').forEach(button=>{button.style.left='';button.style.top=''})};
  const start=async()=>{
    if(scene||loading)return loading;
    loading=import('./maestro-next-scene.js').then(module=>{
      scene=module.createScene(document.getElementById('next-canvas'),orbit,catalog.length,reduce);
      scene.focus(catalog.indexOf(active));
    }).catch(()=>fallback('3D-сцена недоступна. Направления и заявка остаются доступны.'));
    return loading;
  };
  const setMode=(mode)=>{
    const isLive=mode==='live';classic.hidden=isLive;live.hidden=!isLive;
    root.querySelectorAll('[data-next-mode]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.nextMode===mode)));
    try{sessionStorage.setItem('maestro_next_mode',mode)}catch{}
    if(isLive){if(scene)scene.resume();else start()}else scene?.pause();
  };
  root.querySelectorAll('[data-next-mode]').forEach(button=>button.addEventListener('click',()=>setMode(button.dataset.nextMode)));
  document.getElementById('next-ask').addEventListener('click',()=>{
    const task=question.value.trim();
    if(!task){answer.textContent='Опишите задачу одним или двумя предложениями.';question.focus();return}
    answer.textContent=`Первый шаг для направления «${active.title}»: уточнить, что сейчас происходит и какой результат нужен. Затем проверить существующие инструменты и определить ответственного.\n\nВаша задача: ${task.slice(0,500)}`;
  });
  try{if(sessionStorage.getItem('maestro_next_mode')==='live')setMode('live')}catch{}
  addEventListener('pagehide',()=>scene?.dispose());
}
