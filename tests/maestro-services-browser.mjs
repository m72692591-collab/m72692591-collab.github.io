// Visitor-facing service explanations, summon behavior and the retired factory URL.
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import {setTimeout as delay} from 'node:timers/promises';
import {catalog} from '../maestro/assets/maestro-next-catalog.js';
const origin = 'http://127.0.0.1:8767';
const server = spawn(process.platform === 'win32' ? 'python' : 'python3', ['-m','http.server','8767','--bind','127.0.0.1'], {stdio:'ignore',windowsHide:true});
process.on('exit', () => server.kill());
let browser, checks = 0;
const check = (label, condition) => {assert.ok(condition,label); checks++; console.log('✓ '+label)};
const artifacts = 'test-artifacts/maestro';
fs.mkdirSync(artifacts,{recursive:true});
try {
  for (let i=0;i<50;i++) {
    const ready = await new Promise(resolve => {
      const request = http.get(origin+'/maestro/',r=>{r.resume();resolve(r.statusCode===200)});
      request.on('error',()=>resolve(false)); request.setTimeout(1000,()=>request.destroy());
    });
    if (ready) break;
    if (i===49) throw Error('Test server unavailable');
    await delay(150);
  }
  browser = await chromium.launch({headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader'],...(process.env.CI?{}:{channel:'chrome'})});
  const context = await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'reduce'});
  const page = await context.newPage(), errors=[], audioRequests=[];
  await page.addInitScript(()=>{const NativeAudio=window.Audio;window.testAudio=[];window.Audio=function(...args){const media=new NativeAudio(...args);window.testAudio.push(media);return media}});
  page.on('pageerror',error=>errors.push(error.message));
  page.on('request',request=>{if(/\/audio\/maestro\/.*\.(mp3|ogg|wav)(?:\?|$)/.test(request.url()))audioRequests.push(request.url())});
  await page.goto(origin+'/maestro/?mode=classic');
  await page.locator('#next-classic-list a').first().waitFor();
  check('Classic starts without loading the portrait renderer', await page.locator('#next-canvas canvas').count()===0);
  check('Summon is the visible mode entry',await page.locator('[data-next-mode=live]').innerText()==='Позвать Маэстро');
  check('No standalone factory in navigation',await page.locator('a[href*="site-factory"]').count()===0);
  for (const item of catalog) {
    await page.locator(`#next-classic-list a[data-topic="${item.id}"]`).click();
    const story=page.locator('#next-classic-detail .maestro-service-story');
    check(item.id+': actual process and outputs are shown in Classic',await story.getAttribute('data-service')===item.id && await story.locator('.service-offer').count()===item.details.offers.length && await story.locator('.service-step').count()>=3 && await story.locator('.service-deliverables li').count()>=3);
    const image=story.locator('.service-image');
    await image.scrollIntoViewIfNeeded();
    await image.evaluate(img=>img.decode());
    check(item.id+': local illustration is decoded',await image.evaluate(img=>img.naturalWidth>0));
  }
  await page.locator('#next-classic-list a[data-topic=sites]').click();
  check('Website explanation covers formats, design and the editing system',await page.locator('#next-classic-detail').innerText().then(text=>text.includes('Лендинг')&&text.includes('минимализм')&&text.includes('CMS')));
  await page.locator('#next-classic-detail').screenshot({path:artifacts+'/services-classic-sites.png'});
  await page.locator('.maestro-genie-launcher').click();
  await page.waitForFunction(()=>document.body.classList.contains('next-mode-live'));
  await page.waitForFunction(()=>document.querySelector('#next-canvas')?.dataset.portraitState==='loaded',null,{timeout:30000});
  check('Summon opens the approved live portrait without opening text chat',await page.locator('#next-live').getAttribute('data-presentation')==='portrait' && await page.locator('#maestro-genie-panel').isHidden());
  check('Live launcher becomes a separate question control',(await page.locator('.maestro-genie-launcher').innerText()).includes('Задать вопрос'));
  await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));
  const rear = await page.locator('#next-orbit button').evaluateAll(buttons=>buttons.filter(b=>b.style.zIndex==='0'&&!b.hidden).map(b=>({opacity:Number(getComputedStyle(b).opacity),label:Number(getComputedStyle(b.querySelector('strong')).opacity),blur:getComputedStyle(b).backdropFilter})));
  check('Rear screens retain readable labels and light frosted glass',rear.length>0&&rear.every(r=>r.opacity>=.879&&r.label===1&&r.blur==='blur(2px)'));
  await page.screenshot({path:artifacts+'/services-orbit-frosted.png'});
  check('No narration audio is loaded before visitor opt-in',audioRequests.length===0);
  await page.evaluate(()=>{window.testSpeechEvents=[];addEventListener('maestro:speech',event=>window.testSpeechEvents.push(event.detail.phase))});
  await page.locator('#architect-voice').click();
  await page.waitForFunction(()=>window.testSpeechEvents.includes('start'),null,{timeout:15000});
  await page.waitForFunction(()=>window.testAudio.some(media=>!media.muted&&media.volume>0&&media.currentTime>.1&&!media.paused),null,{timeout:10000});
  check('Opt-in decodes and starts the local narration',audioRequests.length>0&&audioRequests.every(url=>url.startsWith(origin+'/')));
  await page.locator('#architect-voice').click();
  check('Disabling narration sends its real end event',await page.evaluate(()=>window.testSpeechEvents.includes('end')&&!window.MAESTRO_GENIE.voiceEnabled));
  for (const item of catalog) {
    await page.locator('#architect-select').selectOption(item.id);
    const story=page.locator('.architect-topic .maestro-service-story');
    check(item.id+': Live contains the same complete explanation',await story.getAttribute('data-service')===item.id && await story.locator('.service-lead').innerText()===item.details.lead);
  }
  await page.locator('#architect-select').selectOption('strategy');
  await page.locator('.architect-topic .service-image').evaluate(img=>img.decode());
  await page.screenshot({path:artifacts+'/services-strategy-side.png'});
  await page.locator('.architect-page-layout').click();
  await page.waitForFunction(()=>document.querySelector('.next-detail').getAttribute('aria-modal')==='true');
  await page.screenshot({path:artifacts+'/services-strategy-full.png'});
  await page.locator('.architect-topic .service-offers').scrollIntoViewIfNeeded();
  await page.screenshot({path:artifacts+'/services-strategy-work.png'});
  await page.locator('.architect-topic .service-cta').click();
  check('Detailed service CTA closes full page and keeps enquiry context',await page.locator('#interest').inputValue()==='Аудит' && await page.locator('.next-detail').getAttribute('aria-modal')===null && await page.locator('#lead').evaluate(el=>!el.closest('[inert]')));
  await page.goto(origin+'/maestro/site-factory.html');
  await page.waitForURL(/topic=sites/);
  check('Old factory link opens websites inside MAESTRO',await page.locator('#next-classic-detail').getAttribute('data-topic')==='sites' && new URL(page.url()).pathname.endsWith('index.html'));
  await context.close();
  const mobileContext=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
  const mobile=await mobileContext.newPage();
  mobile.on('pageerror',error=>errors.push(error.message));
  await mobile.goto(origin+'/maestro/?mode=classic&topic=sites');
  await mobile.locator('#next-classic-detail .service-image').evaluate(img=>img.decode());
  check('Mobile Classic has no horizontal overflow',await mobile.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await mobile.locator('.maestro-genie-launcher').click();
  await mobile.waitForFunction(()=>document.querySelector('#next-canvas')?.dataset.portraitState==='loaded',null,{timeout:30000});
  await mobile.locator('#architect-select').selectOption('sites');
  await mobile.locator('.architect-page-layout').click();
  await mobile.waitForFunction(()=>document.querySelector('.next-detail').getAttribute('aria-modal')==='true');
  check('Mobile full service page stays within viewport',await mobile.locator('.next-detail').evaluate(el=>el.scrollWidth<=el.clientWidth+1));
  await mobile.locator('.architect-topic .service-image').evaluate(img=>img.decode());
  await mobile.screenshot({path:artifacts+'/services-sites-mobile.png'});
  await mobile.locator('.architect-topic .service-offers').scrollIntoViewIfNeeded();
  await mobile.screenshot({path:artifacts+'/services-sites-mobile-work.png'});
  await mobile.locator('.architect-topic .service-cta').click();
  check('Mobile service CTA restores the enquiry form',await mobile.locator('#interest').inputValue()==='Сайт'&& await mobile.locator('#lead').evaluate(el=>!el.closest('[inert]')));
  await mobileContext.close();
  check('Service journeys have no script errors',errors.length===0||(console.error(errors),false));
  console.log(`PASSED ${checks} service browser assertions.`);
} finally {if(browser)await browser.close();server.kill()}
