import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import { setTimeout as delay } from 'node:timers/promises';
const server=spawn('python3',['-m','http.server','8767','--bind','127.0.0.1'],{stdio:'ignore'});
const base='http://127.0.0.1:8767/maestro/';
const out='test-artifacts/conductor';fs.mkdirSync(out,{recursive:true});
let browser, count=0;const errors=[];
function check(name,ok){assert.ok(ok,name);count++;console.log('PASS '+name)}
try{
 for(let i=0;i<40;i++){try{if((await fetch(base)).ok)break}catch{}await delay(200)}
 browser=await chromium.launch({headless:true});
 const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base);await page.locator('.maestro-genie-launcher').click();
 for(const text of ['Нужен бот для сайта','Сколько это стоит?','Хочу оставить заявку']){
  await page.locator('.maestro-genie-form input').fill(text);await page.locator('.maestro-genie-form button').click();
 }
 await page.locator('[data-mg="lead"]').click();
 check('Service survives price and submit intents',await page.locator('#interest').inputValue()==='ИИ-оператор');
 check('Initial project survives last message', (await page.locator('#business').inputValue()).includes('Нужен бот для сайта'));
 check('Compound bot for website is a bot',await page.evaluate(()=>MaestroCore.briefKind('Бот для сайта'))==='Бот');
 check('Cyrillic integration aliases',JSON.stringify(await page.evaluate(()=>MaestroCore.integrations('Телеграм, макс и црм')))===JSON.stringify(['Telegram','MAX','CRM']));
 await page.goto(base+'brief-builder.html');await page.locator('#kind').selectOption('Бот');await page.locator('#goal').fill('Собирать обращения');
 await page.locator('#lead').click();await page.waitForURL('**/index.html#lead');
 check('Builder handoff works',await page.locator('#interest').inputValue()==='Бот');
 await page.goto(base+'maestro-lab.html');check('Calculator retained',await page.locator('#hours').innerText()==='45,0');
 const motion=await browser.newContext({viewport:{width:1280,height:850},recordVideo:{dir:out+'/videos',size:{width:1280,height:850}}});
 const q=await motion.newPage();q.on('pageerror',e=>errors.push(e.message));
 await q.goto(base);await q.locator('.maestro-genie-launcher').click();await q.locator('[data-mg="lab-go"]').click();
 await q.waitForURL('**/maestro-lab.html');check('Gesture opens correct document',true);
 await q.waitForTimeout(200);await q.screenshot({path:out+'/gesture.png',animations:'allow'});
 await q.waitForTimeout(1100);check('Transition does not trap screen',await q.locator('.maestro-travel').count()===0);
 check('External navigation disallowed',await q.evaluate(()=>MaestroNavigate.go('https://example.com'))===false);
 await q.screenshot({path:out+'/lab.png',fullPage:true});await motion.close();
 const mobile=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true,reducedMotion:'reduce'});
 const m=await mobile.newPage();m.on('pageerror',e=>errors.push(e.message));await m.goto(base);await m.locator('.maestro-genie-launcher').click();
 check('No forced Android keyboard',await m.evaluate(()=>document.activeElement.tagName)!=='INPUT');
 check('Competing bottom CTA hidden',await m.locator('.mobilecta').evaluate(el=>getComputedStyle(el).visibility)==='hidden');
 const b=await m.locator('.maestro-genie-panel').boundingBox();check('Panel fits mobile viewport',b&&b.y>=0&&b.x>=0&&b.x+b.width<=391&&b.y+b.height<=845);
 await m.screenshot({path:out+'/genie-mobile.png'});
 await m.locator('[data-mg="brief-start"]').click();
 for(const a of ['Бот для сайта','Строительство','Не терять обращения','Пишем в таблицу','Телеграм и CRM']){
  await m.locator('.maestro-genie-form input').fill(a);await m.locator('.maestro-genie-form button').click();
 }
 await m.locator('[data-mg="brief-go"]').click();await m.waitForURL('**/brief-builder.html');
 check('Wizard preserves bot type',await m.locator('#kind').inputValue()==='Бот');
 check('Wizard accepts Russian Telegram',await m.locator('input[value="Telegram"]').isChecked());
 check('Wizard accepts CRM',await m.locator('input[value="CRM"]').isChecked());
 check('No uncaught browser errors',errors.length===0);
 fs.writeFileSync(out+'/checks.json',JSON.stringify({passed:count,errors},null,2));
 console.log('PASSED '+count+' conductor assertions');
}finally{await browser?.close();server.kill();}
