import {catalog} from './maestro-next-catalog.js?v=service-stories-1';
import {createSectionScreen} from './architect-section.js?v=service-stories-1';
import {createServiceStory} from './maestro-service-view.js?v=service-stories-1';

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
  live.dataset.pageLayout='side';
  const sectionScreen=createSectionScreen(detail);
  let active=catalog[0],scene=null,loading=null,presentation='portrait',orbitPaused=false;
  const reduce=matchMedia('(prefers-reduced-motion: reduce)');
  const setFormInterest=(item)=>{const interest=document.getElementById('interest');if(interest&&[...interest.options].some(option=>option.value===item.interest))interest.value=item.interest};
  const classicDetail=document.getElementById('next-classic-detail');
  const showClassicStory=(item,focus=false)=>{
    const heading=document.createElement('h2');heading.id='next-classic-topic-title';heading.tabIndex=-1;heading.textContent=item.title;
    classicDetail.replaceChildren(heading,createServiceStory(item));classicDetail.hidden=false;classicDetail.dataset.topic=item.id;
    const resourceLabels={cases:'Посмотреть работы',pricing:'Сравнить тарифы',documents:'Открыть документы'};
    if(resourceLabels[item.id]){const resource=document.createElement('a');resource.className='service-cta';resource.href=item.href;resource.textContent=resourceLabels[item.id];classicDetail.append(resource)}
    classicList.querySelectorAll('a').forEach(link=>link.setAttribute('aria-current',String(link.dataset.topic===item.id)));
    if(focus){heading.focus({preventScroll:true});classicDetail.scrollIntoView({behavior:reduce.matches?'instant':'smooth',block:'start'})}
  };
  const select=(item,userSelected=false)=>{
    sectionScreen.restore({preserveLayout:true});
    active=item;document.getElementById('architect-select').value=item.id;title.textContent=item.title;description.textContent=item.description;open.href=item.href;
    if(userSelected){if(document.body.classList.contains('next-mode-live'))sectionScreen.show(item);else showClassicStory(item,true)}
    lead.href='#lead';orbit.querySelectorAll('button').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.id===item.id)));
    answer.textContent='';if(userSelected)window.MAESTRO_GENIE?.stopVoice?.();scene?.focus(catalog.indexOf(item),userSelected);
    document.getElementById('architect-counter').textContent=`${String(catalog.indexOf(item)+1).padStart(2,'0')} / ${catalog.length}`;
    document.querySelectorAll('.architect-directory button').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.id===item.id)));
    if(userSelected){setFormInterest(item);if(!scene){if(document.body.classList.contains('next-mode-live'))sectionScreen.present();window.MAESTRO_GENIE?.speak?.(`${item.title}. ${item.description}`)}}
  };
  live.addEventListener('architect:presented',()=>{
    if(!document.body.classList.contains('next-mode-live'))return;
    if(detail.dataset.sectionOpen!==active.id)sectionScreen.show(active);
    sectionScreen.present();
    window.MAESTRO_GENIE?.speak?.(`${active.title}. ${active.description}`);
  });
  live.addEventListener('architect:layout-request',event=>{
    if(!['side','full'].includes(event.detail?.layout)||!document.body.classList.contains('next-mode-live'))return;
    live.dataset.pageLayout=event.detail.layout;
    const headerBottom=document.querySelector('header')?.getBoundingClientRect().bottom||0;
    window.scrollTo({top:Math.max(0,window.scrollY+live.getBoundingClientRect().top-headerBottom),left:0,behavior:'instant'});
    select(active,true);
  });
  const classicList=document.getElementById('next-classic-list');
  open.textContent='Классический сайт';
  const slideIcons={strategy:'strategy',sites:'view',marketing:'marketing',sales:'finance',automation:'automation',ai:'chat',team:'team',analytics:'strategy',cases:'view',pricing:'finance',documents:'view'};
  catalog.forEach((item)=>{
    const option=document.createElement('option');option.value=item.id;option.textContent=item.title;document.getElementById('architect-select').append(option);
    const link=document.createElement('a');link.href=`?mode=classic&topic=${item.id}#next-classic-detail`;
    const strong=document.createElement('strong');strong.textContent=item.title;
    const span=document.createElement('span');span.textContent=item.description;
    link.dataset.topic=item.id;link.setAttribute('aria-controls','next-classic-detail');
    link.append(strong,span);link.addEventListener('click',event=>{if(event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;event.preventDefault();select(item,true)});classicList.append(link);
    const button=document.createElement('button');button.type='button';button.dataset.id=item.id;button.setAttribute('aria-label',item.title);
    const slideNumber=document.createElement('span');slideNumber.className='architect-slide-number';slideNumber.textContent=String(catalog.indexOf(item)+1).padStart(2,'0');
    const slideTitle=document.createElement('strong');slideTitle.textContent=item.title;const slideText=document.createElement('span');slideText.className='architect-slide-text';slideText.textContent=item.description;const slideIcon=document.createElement('img');slideIcon.className='architect-slide-icon';slideIcon.src="assets/icons/"+slideIcons[item.id]+'.svg';slideIcon.alt='';button.append(slideNumber,slideIcon,slideTitle,slideText);
    button.addEventListener('click',()=>select(item,true));orbit.append(button);
  });
  const directory=root.querySelector('.architect-directory');
  const icons={strategy:'strategy',sales:'finance',automation:'automation',marketing:'marketing',team:'team'};
  ['strategy','sales','automation','marketing','team'].forEach(id=>{
    const item=catalog.find(entry=>entry.id===id),button=document.createElement('button'),icon=document.createElement('img');
    button.type='button';button.dataset.id=id;icon.src=`assets/icons/${icons[id]}.svg`;icon.alt='';icon.width=18;icon.height=18;
    button.append(icon,document.createTextNode(item.title));button.addEventListener('click',()=>select(item,true));directory.append(button);
  });
  select(active);
  document.getElementById('architect-select').addEventListener('change',event=>select(catalog.find(item=>item.id===event.target.value),true));
  const advance=step=>select(catalog[(catalog.indexOf(active)+step+catalog.length)%catalog.length],true);
  orbit.addEventListener('keydown',event=>{if(event.key==='ArrowRight'||event.key==='ArrowLeft'){event.preventDefault();advance(event.key==='ArrowRight'?1:-1);orbit.querySelector('button[aria-pressed=true]')?.focus()}});
  document.getElementById('architect-prev').addEventListener('click',()=>advance(-1));
  document.getElementById('architect-next').addEventListener('click',()=>advance(1));
  document.getElementById('architect-pause').addEventListener('click',event=>{orbitPaused=!orbitPaused;event.currentTarget.setAttribute('aria-pressed',String(orbitPaused));event.currentTarget.textContent=orbitPaused?'Оживить':'Пауза';scene?.setMotion(!orbitPaused)});
  const voiceButton=document.createElement('button');voiceButton.type='button';voiceButton.id='architect-voice';voiceButton.textContent='Послушать Маэстро';voiceButton.title='Озвучивание выбранного раздела';voiceButton.setAttribute('aria-pressed','false');
  root.querySelector('.architect-view').insertBefore(voiceButton,document.getElementById('architect-view-note'));
  voiceButton.addEventListener('click',()=>{
    if(!window.MAESTRO_GENIE)return;
    const enabled=!window.MAESTRO_GENIE.voiceEnabled;window.MAESTRO_GENIE.setVoiceEnabled(enabled);
    voiceButton.setAttribute('aria-pressed',String(enabled));voiceButton.textContent=enabled?'Выключить голос':'Послушать Маэстро';
    if(enabled)window.MAESTRO_GENIE.speak(`${active.title}. ${active.description}`);
  });
  window.addEventListener('maestro:voice',event=>{voiceButton.setAttribute('aria-pressed',String(event.detail.enabled));voiceButton.textContent=event.detail.enabled?'Выключить голос':'Послушать Маэстро'});
  root.querySelectorAll('button[data-presentation]').forEach(button=>button.addEventListener('click',()=>{
    presentation=button.dataset.presentation;live.dataset.presentation=presentation;
    root.querySelectorAll('button[data-presentation]').forEach(control=>control.setAttribute('aria-pressed',String(control.dataset.presentation===presentation)));
    document.getElementById('architect-view-note').textContent=presentation==='model'?'Эскиз объёмной модели. Потяните, чтобы повернуть.':'Потяните экраны мышью и выберите направление';
    scene?.setPresentation(presentation);
  }));
  lead.addEventListener('click',()=>setFormInterest(active));
  document.getElementById('architect-orb')?.addEventListener('click',()=>{
    if(!document.body.classList.contains('next-mode-live')){summon();return}
    if(!window.MAESTRO_GENIE)return;
    window.MAESTRO_GENIE.setLeadInterest(detail.dataset.sectionOpen ? active.interest : null);
    window.MAESTRO_GENIE.open();
    window.scrollTo({left:0,top:Math.max(0,window.scrollY+detail.getBoundingClientRect().top-100),behavior:reduce.matches?'instant':'smooth'});
  });
  const fallback=(message)=>{delete live.dataset.portraitReady;live.dataset.panelPresenting='';detail.inert=false;scene?.dispose();scene=null;root.querySelector('button[data-presentation=model]').disabled=true;presentation='portrait';live.dataset.presentation='portrait';root.querySelectorAll('button[data-presentation]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.presentation==='portrait')));document.getElementById('architect-view-note').textContent='Портретный режим. 3D недоступно.';document.getElementById('next-canvas').replaceChildren();const status=document.getElementById('next-model-status');if(status)status.hidden=true;document.getElementById('next-fallback').textContent=message;document.getElementById('next-fallback').hidden=false;orbit.classList.add('next-static');orbit.querySelectorAll('button').forEach(button=>{button.hidden=false;button.removeAttribute('style')});if(document.body.classList.contains('next-mode-live'))sectionScreen.present()};
  live.addEventListener('architect:context-lost',()=>fallback('3D-сцена отключилась. Выберите направление на слайдах ниже.'));
  live.addEventListener('architect:model-error',()=>{
    presentation='portrait';live.dataset.presentation='portrait';scene?.setPresentation('portrait');
    root.querySelectorAll('button[data-presentation]').forEach(button=>{button.setAttribute('aria-pressed',String(button.dataset.presentation==='portrait'));if(button.dataset.presentation==='model')button.disabled=true});
    document.getElementById('architect-view-note').textContent='Модель недоступна. Портрет и карусель доступны.';
  });
  const start=async()=>{
    if(scene||loading)return loading;
    loading=import('./architect-scene.js?v=service-stories-1').then(module=>{
      scene=module.createScene(document.getElementById('next-canvas'),orbit,catalog,reduce,index=>select(catalog[index],true));
      scene.setPresentation(presentation);scene.setMotion(!orbitPaused);scene.focus(catalog.indexOf(active),false);
      if(!document.body.classList.contains('next-mode-live'))scene.pause();
      orbit.classList.add('architect-ready');
    }).catch(()=>fallback('3D-сцена недоступна. Направления и форма остаются доступны.'));
    return loading;
  };
  const setMode=(mode,scroll=false)=>{
    if(mode!=='live')sectionScreen.restore();
    const isLive=mode==='live';classic.hidden=isLive;live.hidden=!isLive;
    document.body.classList.toggle('next-mode-live',isLive);
    root.querySelectorAll('[data-next-mode]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.nextMode===mode)));
    const headerToggle=document.getElementById('next-header-toggle');
    if(headerToggle)headerToggle.textContent=isLive?'Классический':'Позвать Маэстро';
    const orb=document.getElementById('architect-orb');
    if(orb){orb.setAttribute('aria-label',isLive?'Задать вопрос Маэстро':'Позвать Маэстро');orb.setAttribute('aria-controls',isLive?'maestro-genie-panel':'next-live')}
    try{sessionStorage.setItem('maestro_next_mode',mode)}catch{}
    if(isLive){if(scene)scene.resume();else start()}else{scene?.pause();window.MAESTRO_GENIE?.stopVoice?.();window.MAESTRO_GENIE?.setLeadInterest?.(null)}
    const genieRoot=document.getElementById('maestro-genie-root');
    if(genieRoot)(isLive?detail:document.body).append(genieRoot);
    window.dispatchEvent(new CustomEvent('maestro:mode',{detail:{mode}}));
    if(scroll)window.scrollTo(0,0);
  };
  const summon=()=>{
    if(document.querySelector('#maestro-genie-panel:not([hidden])'))window.MAESTRO_GENIE?.close();
    presentation='portrait';live.dataset.presentation='portrait';
    root.querySelectorAll('button[data-presentation]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.presentation==='portrait')));
    scene?.setPresentation('portrait');setMode('live',true);
    document.getElementById('architect-select')?.focus({preventScroll:true});
    document.getElementById('links')?.classList.remove('open');document.getElementById('menu')?.setAttribute('aria-expanded','false');
  };
  window.addEventListener('maestro:summon',event=>{event.preventDefault();summon()});
  root.querySelectorAll('[data-next-mode]').forEach(button=>button.addEventListener('click',()=>button.dataset.nextMode==='live'?summon():setMode('classic',true)));
  document.getElementById('next-header-toggle')?.addEventListener('click',()=>{if(document.body.classList.contains('next-mode-live'))setMode('classic',true);else summon();document.getElementById('links')?.classList.remove('open');document.getElementById('menu')?.setAttribute('aria-expanded','false')});
  open.addEventListener('click',()=>{sectionScreen.restore();setMode('classic')});
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
  const requestedTopic=catalog.find(item=>item.id===new URLSearchParams(location.search).get('topic'));
  if(requestedTopic)select(requestedTopic,true);
  addEventListener('DOMContentLoaded',()=>{if(document.body.classList.contains('next-mode-live')){const genieRoot=document.getElementById('maestro-genie-root');if(genieRoot)detail.append(genieRoot)}});
  addEventListener('pagehide',event=>{window.MAESTRO_GENIE?.stopVoice?.();if(event.persisted)scene?.pause();else{scene?.dispose();scene=null;loading=null}});
  addEventListener('pageshow',()=>{if(document.body.classList.contains('next-mode-live')){if(scene)scene.resume();else start()}});
}
