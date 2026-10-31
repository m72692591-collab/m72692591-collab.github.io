// Drag a complete orbit and measure the rendered (perspective-transformed)
// screens. Checking the starting angle alone misses face/lower-panel collisions.
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import {setTimeout as delay} from 'node:timers/promises';

const origin='http://127.0.0.1:8768';
const out='test-artifacts/maestro/face-clearance';
fs.mkdirSync(out,{recursive:true});
const server=spawn(process.platform==='win32'?'python':'python3',['-m','http.server','8768','--bind','127.0.0.1'],{stdio:'ignore',windowsHide:true});
process.on('exit',()=>server.kill());
let browser;
const results=[];
try {
  for(let i=0;i<50;i++) {
    const ready=await new Promise(resolve=>{
      const request=http.get(origin+'/maestro/',response=>{response.resume();resolve(response.statusCode===200)});
      request.on('error',()=>resolve(false));request.setTimeout(1000,()=>request.destroy());
    });
    if(ready)break;
    if(i===49)throw Error('Face-clearance test server unavailable');
    await delay(150);
  }
  browser=await chromium.launch({headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader'],...(process.env.CI?{}:{channel:'chrome'})});
  for(const [width,height] of [[1583,772],[1440,780],[1366,768],[390,844]]) {
    const context=await browser.newContext({viewport:{width,height},reducedMotion:'reduce'});
    const page=await context.newPage(),errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.goto(origin+'/maestro/?mode=live');
    await page.waitForFunction(()=>document.querySelector('#next-canvas')?.dataset.portraitState==='loaded');
    await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));
    const read=()=>page.evaluate(()=>{
      const canvas=document.querySelector('#next-canvas'),box=canvas.getBoundingClientRect();
      const lower=document.querySelector('.architect-bottom').getBoundingClientRect();
      const cards=[...document.querySelectorAll('#next-orbit button:not([hidden])')].map(button=>{
        const rect=button.getBoundingClientRect();
        return {id:button.dataset.id,top:rect.top,bottom:rect.bottom};
      });
      const bottom=[...document.querySelectorAll('.architect-glass')].map(panel=>{
        const rect=panel.getBoundingClientRect();
        return {bottom:rect.bottom,scrollHeight:panel.scrollHeight,clientHeight:panel.clientHeight};
      });
      return {chin:box.top+Number(canvas.dataset.portraitChinY),lowerTop:lower.top,cards,bottom,motion:canvas.dataset.motionState};
    });
    const samples=[await read()];
    const start=await page.evaluate(()=>{
      for(const button of document.querySelectorAll('#next-orbit button:not([hidden])')) {
        if(button.style.zIndex!=='3')continue;
        const box=button.getBoundingClientRect();
        const x=Math.max(10,Math.min(innerWidth-10,box.x+box.width/2)),y=box.y+box.height/2;
        const target=document.elementFromPoint(x,y);
        if(target&&button.contains(target))return{x,y};
      }
      throw Error('No visible front screen available for dragging');
    });
    await page.mouse.move(start.x,start.y);await page.mouse.down();
    for(let step=1;step<=48;step++) {
      await page.mouse.move(start.x+step*(Math.PI*2/.006)/48,start.y);
      await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
      samples.push(await read());
    }
    await page.mouse.up();
    await page.screenshot({path:`${out}/${width}x${height}.png`,fullPage:width<700});
    assert.equal(samples.filter(sample=>sample.motion==='drag').length,48,'every pointer step actually drags the carousel');
    for(const [frame,sample] of samples.entries()) {
      assert.ok(sample.cards.length>=3,'carousel keeps visible screens');
      for(const card of sample.cards) {
        assert.ok(card.top>=sample.chin+11,`${width}x${height}, frame ${frame}: ${card.id} overlaps the face clearance`);
        assert.ok(card.bottom<=sample.lowerTop-23,`${width}x${height}, frame ${frame}: ${card.id} overlaps the lower panels`);
      }
      for(const panel of sample.bottom) {
        assert.ok(panel.scrollHeight<=panel.clientHeight+1,'lower-panel text is not clipped');
        if(width>1100)assert.ok(panel.bottom<=height,'lower panels fit in the desktop viewport');
      }
    }
    assert.deepEqual(errors,[],'no uncaught script errors');
    const result={width,height,positions:samples.length,minFaceGap:Math.min(...samples.flatMap(s=>s.cards.map(c=>c.top-s.chin))),minLowerGap:Math.min(...samples.flatMap(s=>s.cards.map(c=>s.lowerTop-c.bottom))),errors};
    results.push(result);console.log(JSON.stringify(result));
    await context.close();
  }
  fs.writeFileSync(out+'/results.json',JSON.stringify(results,null,2));
  console.log('PASS: 196 orbit positions across four viewports, face and lower panels clear.');
} finally {await browser?.close();server.kill()}
