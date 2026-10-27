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
  question.maxLength=350;
  const answer=document.getElementById('next-answer');
  const detail=root.querySelector('.next-detail');
  let active=catalog[0],scene=null,loading=null;
  const reduce=matchMedia('(prefers-reduced-motion: reduce)');
  const setFormInterest=(item)=>{const interest=document.getElementById('interest');if(interest&&[...interest.options].some(option=>option.value===item.interest))interest.value=item.interest};
  const select=(item,userSelected=false)=>{
    active=item;title.textContent=item.title;description.textContent=item.description;open.href=item.href;
    lead.href='#lead';orbit.querySelectorAll('button').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.id===item.id)));
    answer.textContent='';scene?.focus(catalog.indexOf(item));
    if(userSelected)setFormInterest(item);
  };
  const classicList=document.getElementById('next-classic-list');
  catalog.forEach((item)=>{
    const link=document.createElement('a');link.href=item.href;
    const strong=document.createElement('strong');strong.textContent=item.title;
    const span=document.createElement('span');span.textContent=item.description;
    link.append(strong,span);link.addEventListener('click',()=>select(item,true));classicList.append(link);
    const button=document.createElement('button');button.type='button';button.textContent=item.title;button.dataset.id=item.id;
    button.addEventListener('click',()=>select(item,true));orbit.append(button);
  });
  select(active);
  lead.addEventListener('click',()=>setFormInterest(active));
  const fallback=(message)=>{document.getElementById('next-canvas').replaceChildren();document.getElementById('next-fallback').textContent=message;document.getElementById('next-fallback').hidden=false;orbit.classList.add('next-static');orbit.querySelectorAll('button').forEach(button=>{button.style.left='';button.style.top=''})};
  const start=async()=>{
    if(scene||loading)return loading;
    loading=import('./maestro-next-scene.js').then(module=>{
      scene=module.createScene(document.getElementById('next-canvas'),orbit,catalog,reduce,index=>select(catalog[index],true));
      scene.focus(catalog.indexOf(active),false);
    }).catch(()=>fallback('3D-сцена недоступна. Направления и заявка остаются доступны.'));
    return loading;
  };
  const setMode=(mode,scroll=false)=>{
    const isLive=mode==='live';classic.hidden=isLive;live.hidden=!isLive;
    document.body.classList.toggle('next-mode-live',isLive);
    root.querySelectorAll('[data-next-mode]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.nextMode===mode)));
    const headerToggle=document.getElementById('next-header-toggle');
    if(headerToggle)headerToggle.textContent=isLive?'Классический':'Живой 3D';
    try{sessionStorage.setItem('maestro_next_mode',mode)}catch{}
    if(isLive){if(scene)scene.resume();else start()}else{scene?.pause();window.MAESTRO_GENIE?.setLeadInterest?.(null)}
    const genieRoot=document.getElementById('maestro-genie-root');
    if(genieRoot)(isLive?detail:document.body).append(genieRoot);
    if(scroll)window.scrollTo(0,0);
  };
  root.querySelectorAll('[data-next-mode]').forEach(button=>button.addEventListener('click',()=>setMode(button.dataset.nextMode,true)));
  document.getElementById('next-header-toggle')?.addEventListener('click',()=>{setMode(document.body.classList.contains('next-mode-live')?'classic':'live',true);document.getElementById('links')?.classList.remove('open');document.getElementById('menu')?.setAttribute('aria-expanded','false')});
  document.querySelectorAll('a[href^="#"]').forEach(link=>link.addEventListener('click',()=>{
    const target=document.querySelector(link.getAttribute('href'));
    const section=target?.closest('main > section');
    if(section&&document.body.classList.contains('next-mode-live')&&section.id!=='lead'&&section.id!=='next-experience')setMode('classic');
  }));
  document.getElementById('next-ask').addEventListener('click',()=>{
    const task=question.value.trim();
    if(!task){answer.textContent='Расскажите, что хотите изменить в работе.';question.focus();return}
    if(!window.MAESTRO_GENIE){answer.textContent='Консультант сейчас недоступен. Вы можете описать задачу в заявке ниже.';return}
    answer.textContent='';window.MAESTRO_GENIE.setLeadInterest(active.interest);window.MAESTRO_GENIE.open();window.MAESTRO_GENIE.ask(`${active.title}: ${task}`);
  });
  const requestedMode=new URLSearchParams(location.search).get('mode');
  try{if(requestedMode==='live'||(requestedMode!=='classic'&&sessionStorage.getItem('maestro_next_mode')==='live'))setMode('live')}catch{if(requestedMode==='live')setMode('live')}
  addEventListener('DOMContentLoaded',()=>{if(document.body.classList.contains('next-mode-live')){const genieRoot=document.getElementById('maestro-genie-root');if(genieRoot)detail.append(genieRoot)}});
  addEventListener('pagehide',event=>{if(event.persisted)scene?.pause();else{scene?.dispose();scene=null;loading=null}});
  addEventListener('pageshow',()=>{if(document.body.classList.contains('next-mode-live')){if(scene)scene.resume();else start()}});
}
