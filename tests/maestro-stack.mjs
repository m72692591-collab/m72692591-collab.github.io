import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
const base='http://127.0.0.1:8082';
const origin='https://maestro.example';
const token=readFileSync(process.env.MAESTRO_SECRET_DIR+'/admin_token','utf8').trim();
let count=0;const check=(label,ok)=>{assert.ok(ok,label);count++;console.log('PASS '+label);};
async function post(payload){const r=await fetch(base+'/api/leads',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(payload)});return {status:r.status,body:await r.json()};}
for(let i=0;i<60;i++){try{if((await fetch(base+'/healthz')).ok)break;}catch{}await new Promise(r=>setTimeout(r,1000));}
const page=await fetch(base+'/maestro/');check('Public site served',page.status===200);check('Correct receiver injected',(await page.text()).includes(origin+'/api/leads'));
for(const path of ['/maestro/server/lead-api.php','/maestro/server/lead_schema.sql','/.env','/infra/runtime/compose.yaml','/api/unknown'])check('Private route blocked '+path,(await fetch(base+path)).status===404);
check('Anonymous inbox blocked',(await fetch(base+'/api/leads')).status===401);
const payload={name:'Учебный тест',contact:'test@example.invalid',interest:'Бот',business:'Синтетическая заявка',channels:'Тестовый сайт',consent:true,request_id:randomUUID()};
let result=await post(payload);check('Nginx to PHP to MySQL accepted',result.status===201&&result.body.received===true);const reference=result.body.reference;
result=await post(payload);check('Stack retry returns same receipt',result.status===200&&result.body.reference===reference);
const inbox=await fetch(base+'/api/leads',{headers:{Authorization:'Bearer '+token}});const data=await inbox.json();check('Operator sees exactly one persisted lead',inbox.status===200&&data.leads.length===1);
check('No secrets in response',!JSON.stringify(data).includes(token));
console.log('PASS '+count+' complete-stack assertions');
