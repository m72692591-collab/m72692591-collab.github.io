// Synthetic-data integration test for the MAESTRO PHP/MySQL API. No real customer details.
import assert from "node:assert/strict";
import { setTimeout as delay } from "node:timers/promises";
const url = "http://127.0.0.1:8766/lead-api.php";
const allowed = "https://m72692591-collab.github.io";
const token = "maestro-ci-test-admin-token-not-valid-in-production-2026-10";
const payload = { name: "Проверка CI", contact: "@maestro_ci_synthetic", interest: "Бот",
  business: "Учебная тестовая заявка без реальных данных", channels: "Демонстрационный интернет-сайт", consent: true };
let tests = 0;
const verify = (label, condition) => { assert.ok(condition, label); console.log("✓ "+label); tests++; };
for(let i=0;i<50;i++){
  try{const x=await fetch(url); if(x.status===401) break;}catch{}
  await delay(200);
}
async function send(data,origin=allowed,contentType="application/json"){
  const response=await fetch(url,{method:"POST",headers:{"Origin":origin,"Content-Type":contentType},body:JSON.stringify(data)});
  let body=null;try{body=await response.json()}catch{}
  return {status:response.status,body};
}
let res=await fetch(url);
verify("Admin GET locked without token",res.status===401);
res=await fetch(url,{headers:{"Authorization":"Bearer "+token}});
verify("Admin GET with valid CI token",res.status===200);
let body=await res.json();
verify("Empty initial inbox",body.ok===true&&body.leads.length===0);
let x=await send(payload,"https://untrusted.example");
verify("Wrong origin rejected",x.status===403);
x=await send({...payload,consent:false});
verify("Missing consent rejected",x.status===422&&x.body.error==="consent_required");
x=await send({...payload,contact:""});
verify("Missing contact rejected",x.status===422);
x=await send({...payload,interest:"unknown"});
verify("Invalid category rejected",x.status===422);
x=await send({...payload,website:"bot-field-set"});
verify("Honeypot not stored",x.status===200&&x.body.received===false);
x=await send(payload);
verify("Valid synthetic lead accepted",x.status===201&&/^M-\d{7,}$/.test(x.body.reference));
res=await fetch(url,{headers:{"Authorization":"Bearer "+token}});
body=await res.json();
verify("Saved lead found in inbox",body.ok===true&&body.leads.length===1&&body.leads[0].contact===payload.contact);
for(let i=0;i<4;i++){x=await send(payload);verify("Permitted synthetic test submission "+(i+2),x.status===201)}
x=await send(payload);
verify("Rate limit enforced for sixth submission",x.status===429&&x.body.error==="rate_limited");
res=await fetch(url,{method:"OPTIONS",headers:{"Origin":allowed,"Access-Control-Request-Method":"POST"}});
verify("Valid origin OPTIONS preflight",res.status===204&&res.headers.get("access-control-allow-origin")===allowed);
res=await fetch(url,{method:"OPTIONS",headers:{"Origin":"https://untrusted.example"}});
verify("Wrong origin OPTIONS preflight rejected",res.status===403);
console.log("PASS "+tests+" backend integration assertions");
