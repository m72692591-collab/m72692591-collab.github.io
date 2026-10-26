/* Intentional same-origin navigation only. No AJAX HTML execution or remote navigation. */
(() => {
  'use strict';
  if(window.MaestroNavigate) return;
  const allowed=new Set(['index.html','maestro-lab.html','brief-builder.html','agency.html','case-make-telegram.html','brand-lab.html']);
  const key='maestro_gesture_v1';
  const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
  const avatar='<svg viewBox="0 0 220 240" aria-hidden="true"><defs><linearGradient id="mg-trail" x2="1" y2="1"><stop stop-color="#4cdad8"/><stop offset="1" stop-color="#152b40"/></linearGradient></defs><path d="M61 153Q24 190 94 212Q139 228 103 238Q185 220 143 180L145 148Z" fill="url(#mg-trail)" opacity=".72"/><path d="M50 179Q57 129 108 126Q151 126 166 179Z" fill="#194e61" stroke="#65dcd7" stroke-width="2"/><path d="M92 61Q111 41 132 63L135 94Q132 124 112 130Q91 121 87 94Z" fill="#dcc9a5"/><path d="M86 79Q74 42 102 37Q138 21 144 61L136 79L131 58L113 52L89 68Z" fill="#bdcfd5"/><path d="M96 88h8m17 0h8M103 109q10 6 18 0" fill="none" stroke="#416174" stroke-width="3" stroke-linecap="round"/><path d="M91 125l21 29 22-29M72 168q39 29 76-1" fill="none" stroke="#f2c475" stroke-width="3"/><g class="mg-travel-arm"><path d="M143 145L168 125L180 98" fill="none" stroke="#53b9bc" stroke-width="15" stroke-linecap="round"/><circle cx="182" cy="94" r="9" fill="#dec8a7"/><path d="M184 96L209 39" stroke="#ffd98d" stroke-width="4" stroke-linecap="round"/></g></svg>';
  let busy=false, overlay=null;
  function clear(){overlay?.remove();overlay=null;busy=false;document.documentElement.classList.remove('maestro-travelling');}
  function scene(arriving=false){
    clear(); overlay=document.createElement('div');overlay.className='maestro-travel '+(arriving?'is-arriving':'is-leaving');
    overlay.setAttribute('aria-hidden','true');
    overlay.innerHTML='<div class="mg-travel-curtain"></div><div class="mg-travel-guide">'+avatar+'</div><div class="mg-travel-ray"></div>';
    document.body.append(overlay);document.documentElement.classList.add('maestro-travelling');
    if(arriving)setTimeout(clear,950);
  }
  function target(value){
    try {const u=new URL(value,location.href),name=u.pathname.split('/').pop()||'index.html';
      const directory=location.pathname.slice(0,location.pathname.lastIndexOf('/')+1);
      if(u.origin!==location.origin||u.username||u.password||!allowed.has(name)||!u.pathname.startsWith(directory))return null;
      return u;
    }catch{return null;}
  }
  function go(value){
    const u=target(value);if(!u)return false;
    if(busy)return true;
    if(reduced()){location.assign(u.href);return true;}
    scene();busy=true;
    document.querySelector('.maestro-genie-panel')?.classList.add('is-guiding');
    try {sessionStorage.setItem(key,JSON.stringify({path:u.pathname,created:Date.now()}));} catch {}
    setTimeout(()=>location.assign(u.href),240);
    setTimeout(clear,5000);
    return true;
  }
  try {
    const raw=sessionStorage.getItem(key);sessionStorage.removeItem(key);
    const state=raw?JSON.parse(raw):null;
    if(state?.path===location.pathname&&Date.now()-state.created>=0&&Date.now()-state.created<12000&&!reduced()) scene(true);
  }catch{}
  document.addEventListener('click',e=>{
    if(e.defaultPrevented||e.button!==0||e.ctrlKey||e.metaKey||e.shiftKey||e.altKey)return;
    const a=e.target.closest('a[href]');
    if(!a||a.hasAttribute('download')||a.target&&a.target!=='_self')return;
    const u=target(a.href);if(!u||u.pathname===location.pathname)return;
    e.preventDefault();go(u.href);
  });
  window.addEventListener('pageshow',e=>{if(e.persisted)clear();});
  window.MaestroNavigate=Object.freeze({go});
})();
