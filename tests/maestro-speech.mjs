// Prepared audio lifecycle checks. Synthetic events test races; real MP3s are
// separately decoded and played. Neither test claims a listening-quality review.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createServer} from 'node:http';
import {fileURLToPath} from 'node:url';
import {dirname, resolve, extname} from 'node:path';
import {chromium} from 'playwright';
import {catalog} from '../maestro/assets/maestro-next-catalog.js';
import {serviceDetails} from '../maestro/assets/maestro-service-details.js';
const root=resolve(dirname(fileURLToPath(import.meta.url)), '..');
const manifest=JSON.parse(await readFile(resolve(root,'maestro/assets/audio/maestro/manifest.json'),'utf8'));
assert.equal(manifest.clips.length,catalog.length);
for(const clip of manifest.clips){
  const item=catalog.find(item=>item.id===clip.id);
  assert.equal(clip.matchText,`${item.title}. ${item.description}`);
  assert.equal(clip.text,`${item.title}. ${serviceDetails[item.id].lead}`);
  assert.equal(clip.sha256,createHash('sha256').update(await readFile(resolve(root,'maestro/assets/audio/maestro',clip.file))).digest('hex'));
  assert.ok(clip.durationSeconds>5&&clip.durationSeconds<60);
}
const server=createServer(async(req,res)=>{
  const path=new URL(req.url,'http://localhost').pathname;
  if(path==='/'){res.setHeader('Content-Type','text/html; charset=utf-8');res.end('<!doctype html><meta charset="utf-8"><body><div id="links"></div>');return;}
  if(!/^\/maestro\/assets\/[\w/.\-]+$/.test(path)||path.includes('..')){res.writeHead(404).end();return;}
  try{const bytes=await readFile(resolve(root,'.'+path));res.setHeader('Content-Type',({'.js':'text/javascript','.json':'application/json','.mp3':'audio/mpeg'})[extname(path)]||'application/octet-stream');res.end(bytes)}catch{res.writeHead(404).end()}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const url=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,...(process.env.CI?{}:{channel:'chrome'})});
try{
  const page=await browser.newPage();
  await page.goto(url);
  await page.evaluate(()=>{
    window.__events=[];window.__audio=[];window.__browserSpeak=0;
    window.addEventListener('maestro:speech',event=>window.__events.push(event.detail));
    Object.defineProperty(window,'speechSynthesis',{value:{cancel(){},speak(){window.__browserSpeak++}}});
    window.Audio=class extends EventTarget{
      constructor(){super();this.duration=14;window.__audio.push(this)}
      play(){return Promise.resolve()}
      pause(){this.paused=true}
      removeAttribute(name){delete this[name]}
      load(){}
    };
  });
  await page.addScriptTag({url:url+'/maestro/assets/maestro-narration.js',type:'module'});
  await page.addScriptTag({url:url+'/maestro/assets/maestro-genie.js'});
  await page.waitForFunction(()=>window.MAESTRO_GENIE_VOICE);
  const result=await page.evaluate(async clips=>{
    const api=window.MAESTRO_GENIE, adapter=window.MAESTRO_GENIE_VOICE;
    let count=0;
    const expect=(condition,message)=>{if(!condition)throw Error(message);count++};
    const wait=async condition=>{for(let n=0;n<100&&!condition();n++)await new Promise(resolve=>setTimeout(resolve,10));expect(condition(),'audio queue timeout')};
    await api.speak(clips[0].matchText);
    expect(window.__audio.length===0,'voice is opt-in');
    api.setVoiceEnabled(true);
    const first=api.speak(clips[0].matchText);
    await wait(()=>window.__audio.length===1);
    const a=window.__audio[0];
    expect(a.preload==='none'&&new URL(a.src).pathname.endsWith('/strategy.mp3')&&new URL(a.src).searchParams.get('v')===clips[0].sha256,'own prepared strategy clip with content version');
    expect(!window.__events.some(event=>event.phase==='start'),'queued audio must not report playback');
    a.dispatchEvent(new Event('playing'));
    expect(window.__events.at(-1).text===clips[0].text,'speech event carries actual narration text');
    a.dispatchEvent(new Event('ended'));await first;
    expect(window.__events.map(event=>event.phase).join(',')==='start,end','no fabricated word boundaries');
    const old=api.speak(clips[0].matchText);await wait(()=>window.__audio.length===2);
    const oldAudio=window.__audio[1];oldAudio.dispatchEvent(new Event('playing'));
    const next=api.speak(clips[1].matchText);await wait(()=>window.__audio.length===3);
    const nextAudio=window.__audio[2];nextAudio.dispatchEvent(new Event('playing'));
    oldAudio.dispatchEvent(new Event('ended'));oldAudio.dispatchEvent(new Event('error'));await old;
    expect(document.querySelector('#maestro-genie-panel').classList.contains('is-talking'),'stale callbacks cannot stop new clip');
    api.setVoiceEnabled(false);await next;
    expect(nextAudio.paused&&!nextAudio.src,'disable releases media');
    expect(!document.querySelector('#maestro-genie-panel').classList.contains('is-talking'),'disable stops talking state');
    api.setVoiceEnabled(true);
    const before=window.__audio.length;
    await api.speak('Индивидуальный ответ на вопрос клиента');
    expect(window.__audio.length===before,'dynamic answer is never replaced with unrelated canned speech');
    expect(document.querySelector('.maestro-genie-status').textContent.includes('Ответ доступен текстом'),'text-only answer explained');
    const failed=api.speak(clips[0].matchText);await wait(()=>window.__audio.length===before+1);
    window.__audio.at(-1).dispatchEvent(new Event('error'));await failed;
    expect(document.querySelector('.maestro-genie-status').textContent.includes('Не удалось воспроизвести'),'load failure disclosed');
    expect(window.__browserSpeak===0,'robotic browser fallback never invoked');
    const pending=adapter.speak(clips[0].matchText);adapter.stop();await pending;
    expect(window.__audio.length===before+1,'canceled request cannot start after manifest resolves');
    return count;
  },manifest.clips);
  const real=await browser.newPage();
  await real.goto(url);
  const decoded=await real.evaluate(async clips=>{
    const durations=[];
    for(const clip of clips){
      const media=new Audio('/maestro/assets/audio/maestro/'+clip.file);
      media.preload='metadata';
      await new Promise((resolve,reject)=>{const t=setTimeout(()=>reject(Error('metadata timeout')),10000);media.onloadedmetadata=()=>{clearTimeout(t);resolve()};media.onerror=()=>{clearTimeout(t);reject(Error('decode failed'))}});
      if(!Number.isFinite(media.duration)||Math.abs(media.duration-clip.durationSeconds)>.3)throw Error('duration mismatch '+clip.id);
      durations.push(media.duration);media.removeAttribute('src');media.load();
    }
    const media=new Audio('/maestro/assets/audio/maestro/strategy.mp3');media.muted=true;
    await media.play();await new Promise(resolve=>setTimeout(resolve,250));
    if(media.currentTime<=0)throw Error('playback did not advance');
    media.pause();media.removeAttribute('src');media.load();
    return durations.length;
  },manifest.clips);
  console.log(`Narration PASS: ${result} lifecycle assertions, ${decoded} real MP3 decodes, actual playback advances; no listening-quality claim.`);
}finally{await browser.close();await new Promise(resolve=>server.close(resolve))}
