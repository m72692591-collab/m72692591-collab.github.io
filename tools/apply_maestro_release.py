"""Reproducible, idempotent scoped patch. No network, credentials or cloud operations."""
from pathlib import Path
import re, json
ROOT=Path(__file__).resolve().parents[1]
P=ROOT/'maestro'
MARK='/* MAESTRO v1.1 context and motion */'
g=P/'assets/maestro-genie.js'
s=g.read_text()
if MARK not in s:
 s=s.replace('speaking: false, wizard: null','speaking: false, wizard: null, service: null, messages: []')
 s=s.replace("state.lastQuestion = question;", "state.lastQuestion = question;\n    state.messages.push(question); if(state.messages.length>12)state.messages.shift();")
 s=s.replace("const topic = chooseTopic(question);\n    if (topic !== 'general') state.topic = topic;", "const topic = window.MaestroCore?.intent(question) || chooseTopic(question);\n    const chosen = window.MaestroCore?.service(question);\n    if(chosen) state.service = chosen;\n    if(topic==='navigate_lab'||topic==='navigate_brief'){\n      const to=topic==='navigate_lab'?'maestro-lab.html':'brief-builder.html';\n      if(window.MaestroNavigate?.go(to))return;\n    }\n    if (topic !== 'general') state.topic = topic;")
 s=s.replace("if (select) select.value = values[state.topic] || 'Другое';", "if (select) select.value = window.MaestroCore?.services[state.service]?.label || values[state.topic] || 'Другое';")
 s=s.replace("if (details && !details.value.trim() && state.lastQuestion) details.value = 'Обсуждали с консультантом: ' + state.lastQuestion;", "if(details&&!details.value.trim()&&state.messages.length) details.value=window.MaestroCore?.summary(state.messages,state.service)||state.messages.join('\\n');")
 s=s.replace("    input.focus();\n  }\n  function close()", "    if(matchMedia('(pointer:fine)').matches)input.focus();\n    else root.querySelector('[data-mg=\"close\"]').focus({preventScroll:true});\n    document.body.classList.add('maestro-consulting');\n  }\n  function close()")
 s=s.replace('    panel.hidden = true;', "    panel.hidden = true;\n    document.body.classList.remove('maestro-consulting');")
 s=s.replace("window.location.href = 'brief-builder.html';", "if(!window.MaestroNavigate?.go('brief-builder.html'))window.location.href='brief-builder.html';")
 s=s.replace("'<button type=\"button\" data-mg=\"brief-start\">Собрать ТЗ</button></div>'", "'<button type=\"button\" data-mg=\"brief-start\">Собрать ТЗ</button><button type=\"button\" data-mg=\"lab-go\">Показать демо</button></div>'")
 s=s.replace("launcher.addEventListener('click', open);", "root.querySelector('[data-mg=\"lab-go\"]').addEventListener('click',()=>{if(!window.MaestroNavigate?.go('maestro-lab.html'))location.href='maestro-lab.html';});\n  launcher.addEventListener('click', open);")
 s=s.replace("    '</svg>'", "    '<g class=\"maestro-genie-arm\"><path d=\"M145 153L168 133L179 110\" fill=\"none\" stroke=\"#268a98\" stroke-width=\"13\" stroke-linecap=\"round\"/><circle cx=\"181\" cy=\"105\" r=\"8\" fill=\"#e5d3af\"/><path d=\"M184 101L206 50\" stroke=\"#ffda8a\" stroke-width=\"3\"/></g>',\n    '</svg>'",1)
 g.write_text(s+'\n'+MARK+'\n')
css=P/'assets/maestro-genie.css'
c=css.read_text()
if 'v1.1 viewport' not in c:
 c+='''\n/* v1.1 viewport and avatar framing */
.maestro-genie-stage{min-height:178px}.maestro-genie-avatar{height:205px;margin:-2px auto -18px}
.maestro-genie-status{background:#09172bc9;border-radius:8px;padding:3px 7px;width:max-content;max-width:calc(100% - 24px);margin:auto;bottom:4px}
@media(max-width:640px){.maestro-consulting .mobilecta{visibility:hidden}.maestro-genie-panel{bottom:max(12px,env(safe-area-inset-bottom));top:auto;max-height:calc(100dvh - 90px)}.maestro-genie-stage{min-height:137px}.maestro-genie-avatar{height:153px;width:170px;margin:-3px auto -13px}.maestro-genie-chat{max-height:170px}.maestro-genie-form input{font-size:16px}}
'''
 css.write_text(c)
b=P/'brief-builder.html';s=b.read_text()
start=s.find('      const guess=title.includes(');end=s.find('      if(options.includes(guess))',start)
if start>=0:
 assert end>start, 'Unexpected builder structure'
 s=s[:start]+"      const guess=window.MaestroCore.briefKind(title);\n"+s[end:]
 s=s.replace('if(a[4].toLocaleLowerCase("ru").includes(label))field.checked=true;', 'if(window.MaestroCore.integrations(a[4]).includes(field.value))field.checked=true;')
 s=s.replace('location.href="index.html#lead";', 'if(!window.MaestroNavigate?.go("index.html#lead"))location.href="index.html#lead";')
 s=s.replace('Изменения мгновенно отражаются в документе справа.', 'Изменения сразу отражаются в предпросмотре документа.')
 b.write_text(s)
for h in P.glob('*.html'):
 if h.name in ['GENIE_ENGINE.html']:continue
 t=h.read_text()
 if 'assets/maestro-core.js' not in t:t=t.replace('</head>','<script src="assets/maestro-core.js?v=11"></script>\n<link rel="stylesheet" href="assets/maestro-motion.css?v=11">\n</head>')
 if 'assets/maestro-motion.js' not in t:t=t.replace('</body>','<script src="assets/maestro-motion.js?v=11"></script>\n</body>')
 t=t.replace('maestro-genie.js?v=1"','maestro-genie.js?v=11"').replace('maestro-genie.css?v=1"','maestro-genie.css?v=11"')
 for a,z in [('LIVE DOCUMENT','ПРЕДПРОСМОТР ДОКУМЕНТА'),('MAESTRO / PROJECT DESIGNER','МАЭСТРО / КОНСТРУКТОР ПРОЕКТА'),('MAESTRO / PROCESS SIMULATOR','МАЭСТРО / ДЕМОНСТРАЦИЯ ПРОЦЕССА')]:t=t.replace(a,z)
 h.write_text(t)
from PIL import Image
savings=[]
for img in (P/'assets').glob('*.png'):
 out=img.with_suffix('.webp')
 with Image.open(img) as im:
  im.thumbnail((1440,1440));im.convert('RGB').save(out,'WEBP',quality=80,method=6)
 savings.append({'file':img.name,'before':img.stat().st_size,'after':out.stat().st_size})
for h in list(P.glob('*.html'))+list((P/'assets').glob('*.css')):
 t=h.read_text()
 for img in savings:t=t.replace('assets/'+img['file'],'assets/'+Path(img['file']).with_suffix('.webp').name).replace('url('+img['file']+')','url('+Path(img['file']).with_suffix('.webp').name+')')
 h.write_text(t)
(ROOT/'image-optimization.json').write_text(json.dumps(savings,ensure_ascii=False,indent=2))
print('Applied v1.1. Image bytes:',sum(x['before'] for x in savings),'->',sum(x['after'] for x in savings))
