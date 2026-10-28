// Focused speech bridge checks. Uses synthetic browser speech events; no audio or network.
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {dirname, resolve} from 'node:path';
import {chromium} from 'playwright';

const script=resolve(dirname(fileURLToPath(import.meta.url)), '../maestro/assets/maestro-genie.js');
const browser=await chromium.launch({headless:true,...(process.env.CI?{}:{channel:'chrome'})});
try{
  const page=await browser.newPage();
  await page.setContent('<div id="links"></div><section id="lead"><select id="interest"><option>Другое</option></select><textarea id="business"></textarea><input id="name"></section>');
  await page.evaluate(()=>{
    window.__events=[];
    window.addEventListener('maestro:speech',event=>window.__events.push(event.detail));
    window.__voiceEvents=[];
    window.addEventListener('maestro:voice',event=>window.__voiceEvents.push(event.detail.enabled));
    window.__utterances=[];
    window.__cancelCount=0;
    window.__voices=[];
    window.__synth=Object.assign(new EventTarget(),{
      getVoices:()=>window.__voices,speak:utterance=>window.__utterances.push(utterance),cancel:()=>{window.__cancelCount++}
    });
    Object.defineProperty(window,'speechSynthesis',{configurable:true,value:window.__synth});
    window.SpeechSynthesisUtterance=class{constructor(text){this.text=text}};
  });
  await page.addScriptTag({path:script});
  const result=await page.evaluate(async()=>{
    const api=window.MAESTRO_GENIE;
    const expected=(condition,message)=>{if(!condition)throw Error(message)};
    await api.speak('Без разрешения');
    expected(window.__utterances.length===0&&window.__events.length===0,'voice must be opt-in');

    document.querySelector('[data-mg="voice"]').click();
    expected(api.voiceEnabled===true,'voice toggle must be observable');
    expected(window.__voiceEvents.join(',')==='true','voice event reflects consultant toggle');
    await api.speak('Дождались русского голоса');
    expected(window.__utterances.length===0,'empty first voice list waits instead of speaking with an unknown voice');
    expected(document.querySelector('.maestro-genie-status').textContent.includes('Подбираем русский голос'),'waiting is disclosed');
    window.__voices=[
      {name:'English',lang:'en-US',localService:true},
      {name:'Pavel remote',lang:'ru-RU',localService:false},
      {name:'Anna',lang:'ru-RU',localService:true},
      {name:'Павел',lang:'ru-RU',localService:true}
    ];
    window.__synth.dispatchEvent(new Event('voiceschanged'));
    const delayed=window.__utterances.at(-1);
    expected(window.__utterances.length===1&&delayed.voice.name==='Павел','late local Russian Pavel is chosen before speech');
    delayed.onstart();delayed.onend();
    window.__events=[];
    await api.speak('Привет мир');
    const first=window.__utterances.at(-1);
    expected(first.voice.name==='Павел','local Russian Pavel preferred');
    expected(window.__events.length===0,'queued browser speech is not a start event');
    first.onstart();first.onboundary({charIndex:2,charLength:4});first.onend();
    expected(window.__events.map(e=>e.phase).join(',')==='start,boundary,end','browser event sequence');
    expected(window.__events[1].text==='Привет мир'&&window.__events[1].charIndex===2&&window.__events[1].charLength===4,'boundary payload');

    await api.speak('Старое');const old=window.__utterances.at(-1);old.onstart();
    await api.speak('Новое');const fresh=window.__utterances.at(-1);
    old.onend();old.onerror();fresh.onstart();
    expected(document.querySelector('#maestro-genie-panel').classList.contains('is-talking'),'late old callbacks must not end new speech');
    fresh.onend();
    expected(window.__events.filter(e=>e.phase==='end'&&e.text==='Старое').length===1,'cancellation ends once');
    expected(window.__events.filter(e=>e.phase==='end'&&e.text==='Новое').length===1,'new speech ends once');

    const pending=[];
    window.MAESTRO_GENIE_VOICE={speak:(text,hooks)=>new Promise((resolve,reject)=>pending.push({text,hooks,resolve,reject})),stop:()=>{}};
    const firstCustom=api.speak('Первый');pending[0].hooks.onStart();
    const secondCustom=api.speak('Второй');pending[1].hooks.onStart();
    pending[0].hooks.onBoundary(3,2);pending[0].reject(Error('canceled'));await firstCustom;
    expected(document.querySelector('#maestro-genie-panel').classList.contains('is-talking'),'late custom rejection must not reset new speech');
    expected(window.__events.filter(e=>e.phase==='boundary'&&e.text==='Первый').length===0,'late custom boundary ignored');
    pending[1].hooks.onBoundary(1,3);pending[1].resolve();await secondCustom;
    expected(window.__events.filter(e=>e.phase==='end'&&e.text==='Второй').length===1,'custom speech ends once');

    const failing=api.speak('Сбой');pending[2].hooks.onStart();pending[2].hooks.onError();
    const fallback=window.__utterances.at(-1);fallback.onstart();
    pending[2].hooks.onEnd();pending[2].reject(Error('adapter failed'));await failing;
    expected(document.querySelector('#maestro-genie-panel').classList.contains('is-talking'),'late custom error must not end fallback');
    fallback.onend();
    expected(window.__events.filter(e=>e.phase==='end'&&e.text==='Сбой').length===2,'custom failure ends, then fallback ends');

    delete window.MAESTRO_GENIE_VOICE;
    await api.speak('Отмена');const canceled=window.__utterances.at(-1);canceled.onstart();
    api.setVoiceEnabled(false);canceled.onend();
    expected(window.__events.filter(e=>e.phase==='end'&&e.text==='Отмена').length===1,'disable ends active speech once');
    expected(api.voiceEnabled===false,'voice disabled');
    expected(window.__voiceEvents.join(',')==='true,false','voice event reflects public setter');
    await api.speak('Тишина');
    expected(!window.__events.some(e=>e.text==='Тишина'),'no autoplay after disable');
    api.setVoiceEnabled(true);
    window.__voices=[];
    const beforeWait=window.__utterances.length;
    await api.speak('Устаревшее ожидание');
    await api.speak('Актуальное ожидание');
    expected(window.__utterances.length===beforeWait,'neither pending run speaks before voices are ready');
    window.__voices=[{name:'Павел',lang:'ru-RU',localService:true}];
    window.__synth.dispatchEvent(new Event('voiceschanged'));
    const latest=window.__utterances.at(-1);
    expected(window.__utterances.length===beforeWait+1&&latest.text==='Актуальное ожидание','superseded waiting run cannot speak');
    latest.onstart();latest.onend();

    window.__voices=[];
    const beforeDisable=window.__utterances.length;
    await api.speak('Ожидание отмены');
    api.setVoiceEnabled(false);
    window.__voices=[{name:'Павел',lang:'ru-RU',localService:true}];
    window.__synth.dispatchEvent(new Event('voiceschanged'));
    await new Promise(resolve=>setTimeout(resolve,1320));
    expected(window.__utterances.length===beforeDisable,'disabled voice cannot speak after voiceschanged or timeout');
    expected(!window.__events.some(e=>e.phase==='start'&&e.text==='Ожидание отмены'),'canceled waiting run has no start event');
    api.setVoiceEnabled(true);
    window.__voices=[{name:'English',lang:'en-US',localService:true}];
    const countBefore=window.__utterances.length;
    await api.speak('Нет русского');
    expected(window.__utterances.length===countBefore,'known non-Russian voice is not used');
    expected(document.querySelector('.maestro-genie-status').textContent.includes('Русский голос недоступен'),'unavailable Russian voice is disclosed');
    window.__voices=[];
    await api.speak('Пустой список');
    expected(window.__utterances.length===countBefore,'empty list remains silent during bounded wait');
    await new Promise(resolve=>setTimeout(resolve,1320));
    const unlisted=window.__utterances.at(-1);
    expected(unlisted.text==='Пустой список'&&unlisted.lang==='ru-RU','empty list after timeout permits browser language selection');
    unlisted.onstart();unlisted.onend();
    return {events:window.__events.length,syntheticUtterances:window.__utterances.length};
  });
  assert.ok(result.events>0);
  console.log('Speech bridge PASS',result);
}finally{await browser.close()}
