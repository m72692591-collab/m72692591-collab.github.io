// Synthetic integration tests. No real contacts and no production endpoint.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
const url='http://127.0.0.1:8766/lead-api.php';
const allowed='https://m72692591-collab.github.io';
const token='maestro-ci-test-admin-token-not-valid-in-production-2026-10';
const payload={name:'Проверка CI',contact:'@maestro_ci_synthetic',interest:'Бот',business:'Учебная заявка',channels:'Демонстрационный сайт',consent:true,request_id:randomUUID()};
let tests=0;
const verify=(label,condition)=>{assert.ok(condition,label);console.log('✓ '+label);tests++;};
for(let i=0;i<50;i++){try{if((await fetch(url)).status===401)break;}catch{}await delay(200);}
async function send(data,origin=allowed,contentType='application/json'){
 const response=await fetch(url,{method:'POST',headers:{Origin:origin,'Content-Type':contentType},body:JSON.stringify(data)});
 return {status:response.status,body:await response.json().catch(()=>null)};
}
async function inbox(){const r=await fetch(url,{headers:{Authorization:'Bearer '+token}});verify('Authorized inbox accessible',r.status===200);return (await r.json()).leads;}
verify('Admin without token rejected',(await fetch(url)).status===401);
verify('Empty initial inbox',(await inbox()).length===0);
let x=await send(payload,'https://untrusted.example');verify('Wrong origin rejected',x.status===403);
x=await send({...payload,consent:false});verify('Consent required',x.status===422&&x.body.error==='consent_required');
x=await send({...payload,contact:''});verify('Missing contact rejected',x.status===422);
x=await send({...payload,interest:'unknown'});verify('Unknown category rejected',x.status===422);
x=await send({...payload,website:'bot-field-set'});verify('Honeypot not stored',x.status===200&&x.body.received===false);
x=await send({...payload,request_id:'not-a-uuid'});verify('Malformed retry identifier rejected',x.status===422);
x=await send({...payload,business:'я'.repeat(6001)});verify('Long text rejected, not truncated',x.status===422&&x.body.error==='field_too_long'&&x.body.field==='business');
x=await send({...payload,business:'x'.repeat(66000)});verify('Body byte ceiling enforced',x.status===413);
x=await send(payload);verify('Valid lead actually stored',x.status===201&&x.body.received===true&&/^M-\d{7,}$/.test(x.body.reference));
const first=x.body.reference;
x=await send(payload);verify('Retry returns same receipt',x.status===200&&x.body.reference===first&&x.body.duplicate===true);
x=await send({...payload,business:'Другая задача'});verify('Same identifier with different text conflicts',x.status===409&&x.body.error==='request_conflict');
verify('Retry and conflict created no extra row',(await inbox()).length===1);
const unicode={...payload,request_id:randomUUID(),business:'🙂'.repeat(6000),channels:'я'.repeat(1500)};
x=await send(unicode);verify('Valid multibyte text beyond old 16KB limit accepted',x.status===201);
let rows=await inbox();verify('Full Unicode text preserved',rows.find(r=>r.business===unicode.business)?.channels===unicode.channels);
const race={...payload,request_id:randomUUID(),business:'Проверка параллельного повтора'};
const racing=await Promise.all([send(race),send(race)]);
verify('Concurrent identical requests return one reference',new Set(racing.map(r=>r.body?.reference)).size===1&&racing.every(r=>[200,201].includes(r.status)));
verify('Unique database constraint keeps one row',(await inbox()).length===3);
for(let i=0;i<2;i++){x=await send({...payload,request_id:randomUUID()});verify('New submission within rate limit '+i,x.status===201);}
x=await send({...payload,request_id:randomUUID()});verify('Sixth new submission rejected',x.status===429);
x=await send(payload);verify('Accepted retry still works after rate limit',x.status===200&&x.body.reference===first);
let r=await fetch(url,{method:'OPTIONS',headers:{Origin:allowed,'Access-Control-Request-Method':'POST'}});verify('Allowed preflight',r.status===204&&r.headers.get('access-control-allow-origin')===allowed);
r=await fetch(url,{method:'OPTIONS',headers:{Origin:'https://untrusted.example'}});verify('Untrusted preflight rejected',r.status===403);
console.log('PASS '+tests+' backend integration assertions');
