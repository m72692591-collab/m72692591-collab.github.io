import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawn} from 'node:child_process';
import {setTimeout as delay} from 'node:timers/promises';
import {chromium} from 'playwright';
const server=spawn('python3',['-m','http.server','8768','--bind','127.0.0.1'],{stdio:'ignore'});
const base='http://127.0.0.1:8768/maestro/index.html';
const endpoint='https://maestro-receiver.invalid/lead-api.php';
let browser,count=0;const calls=[];
const check=(name,ok)=>{assert.ok(ok,name);count++;console.log('PASS '+name);};
try{
 for(let i=0;i<30;i++){try{if((await fetch(base)).ok)break;}catch{}await delay(100);}
 browser=await chromium.launch({headless:true});const page=await browser.newPage();
 const html=fs.readFileSync('maestro/index.html','utf8').replace('<meta name="maestro-lead-endpoint" content="">','<meta name="maestro-lead-endpoint" content="'+endpoint+'">');
 assert.ok(html.includes(endpoint));
 await page.route(base,route=>route.fulfill({status:200,contentType:'text/html',body:html}));
 await page.route(endpoint,async route=>{
  if(route.request().method()==='OPTIONS'){await route.fulfill({status:204,headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'content-type','Access-Control-Allow-Methods':'POST'}});return;}
  calls.push(route.request().postDataJSON());
  if(calls.length===1){await route.abort('failed');return;}
  await route.fulfill({status:200,headers:{'Access-Control-Allow-Origin':'*'},contentType:'application/json',body:JSON.stringify({ok:true,received:true,duplicate:true,reference:'M-0000001'})});
 });
 await page.goto(base,{waitUntil:'networkidle'});
 check('No request before explicit submission',calls.length===0);
 await page.locator('#name').fill('Учебный тест');await page.locator('#contact').fill('@synthetic_test');await page.locator('#business').fill('Учебная задача без личных данных');await page.locator('#channels').fill('Учебный канал');await page.locator('#agree').check();
 await page.locator('#leadForm button[type=submit]').click();
 await page.waitForFunction(()=>document.querySelector('#result').textContent.includes('Подтверждение доставки не получено'));
 check('Network failure preserves form',(await page.locator('#business').inputValue()).includes('Учебная задача'));
 await page.locator('#leadForm button[type=submit]').click();
 await page.waitForFunction(()=>document.querySelector('#result').textContent.includes('M-0000001'));
 check('Retry UUID is unchanged',calls.length===2&&calls[0].request_id===calls[1].request_id);
 check('UUID is generated in secure random format',/^[0-9a-f-]{36}$/.test(calls[0].request_id));
 check('Confirmed replay clears form',await page.locator('#business').inputValue()==='');
 check('Receipt explains that no duplicate was created',(await page.locator('#result').innerText()).includes('без создания второй заявки'));
 await page.locator('#name').fill('Учебный тест');await page.locator('#contact').fill('@synthetic_test');await page.locator('#business').fill('я'.repeat(6001));await page.locator('#channels').fill('Учебный канал');await page.locator('#agree').check();
 await page.locator('#leadForm button[type=submit]').click();
 check('Oversized field rejected before network',calls.length===2);
 check('Text is not silently truncated',(await page.locator('#business').inputValue()).length===6001);
 check('Useful length error shown',(await page.locator('#result').innerText()).includes('не более 6000'));
 console.log('PASS '+count+' frontend receipt assertions');
}finally{await browser?.close();server.kill();}
