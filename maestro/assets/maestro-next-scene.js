import * as THREE from './vendor/three.module.min.js';

export function createScene(container,orbit,count,reduced){
  const canvas=document.createElement('canvas');container.append(canvas);
  const renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'low-power'});
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,matchMedia('(max-width:640px)').matches?1.25:1.75));
  const scene=new THREE.Scene();
  const camera=new THREE.PerspectiveCamera(40,1,.1,100);camera.position.set(0,1.2,10);camera.lookAt(0,.3,0);
  scene.add(new THREE.AmbientLight(0x77c9ff,1.5));
  const key=new THREE.PointLight(0x9beaff,75);key.position.set(-3,4,4);scene.add(key);
  const rim=new THREE.PointLight(0x217cff,65);rim.position.set(3,1,-3);scene.add(rim);
  const human=new THREE.Group();scene.add(human);
  const shell=new THREE.MeshPhysicalMaterial({color:0x58bfff,transparent:true,opacity:.38,metalness:.48,roughness:.2,side:THREE.DoubleSide,depthWrite:false});
  const wire=new THREE.MeshBasicMaterial({color:0x91eaff,wireframe:true,transparent:true,opacity:.22,depthWrite:false});
  const head=new THREE.Mesh(new THREE.SphereGeometry(.42,24,18),shell);head.scale.set(.8,1.16,.86);head.position.y=1.45;human.add(head);
  const torso=new THREE.Mesh(new THREE.CylinderGeometry(.55,.78,1.45,12,1),shell);torso.position.y=.34;human.add(torso);
  const torsoWire=torso.clone();torsoWire.material=wire;human.add(torsoWire);
  const neck=new THREE.Mesh(new THREE.CylinderGeometry(.16,.18,.26,12),shell);neck.position.y=1.04;human.add(neck);
  const armMaterial=shell.clone();armMaterial.opacity=.48;
  function arm(x){const group=new THREE.Group();group.position.set(x,.82,0);const upper=new THREE.Mesh(new THREE.CylinderGeometry(.16,.13,.95,12),armMaterial);upper.position.set(x>0?.21:-.21,-.42,0);upper.rotation.z=x>0?-.4:.4;group.add(upper);const lower=new THREE.Mesh(new THREE.CylinderGeometry(.12,.09,.84,12),armMaterial);lower.position.set(x>0?.48:-.48,-1.12,.25);lower.rotation.z=x>0?-.25:.25;group.add(lower);human.add(group);return group}
  arm(-.58);const gesture=arm(.58);
  const base=new THREE.Mesh(new THREE.CylinderGeometry(1.35,1.55,.12,64),new THREE.MeshStandardMaterial({color:0x06243b,metalness:.8,roughness:.25}));base.position.y=-1.42;scene.add(base);
  const rings=[];for(const radius of [1.43,2.48]){const ring=new THREE.Mesh(new THREE.TorusGeometry(radius,.014,5,96),new THREE.MeshBasicMaterial({color:0x53d8ff,transparent:true,opacity:.55}));ring.rotation.x=Math.PI/2;ring.position.y=-1.31;scene.add(ring);rings.push(ring)}
  const panelGroup=new THREE.Group();scene.add(panelGroup);
  const panels=Array.from({length:count},(_,i)=>{const mesh=new THREE.Mesh(new THREE.BoxGeometry(.67,.31,.035),new THREE.MeshPhysicalMaterial({color:i===0?0x56d8ff:0x195782,transparent:true,opacity:.52,metalness:.25,roughness:.15,side:THREE.DoubleSide}));panelGroup.add(mesh);return mesh});
  let chosen=0,phase=0,frame=0,visible=true,paused=false,drag=false,hovered=false,lastX=0,rotation=0,lastLabels=0;
  const buttons=[...orbit.querySelectorAll('button')],point=new THREE.Vector3();
  function resize(){const w=container.clientWidth,h=container.clientHeight;if(!w||!h)return;renderer.setSize(w,h,false);camera.aspect=w/h;camera.position.z=w<650?12:10;camera.updateProjectionMatrix();render()}
  function render(){if(!visible||paused||document.hidden)return;
    const moving=!reduced.matches&&!drag&&!hovered;
    if(moving)phase+=.0004;
    human.rotation.y=rotation+Math.sin(phase*.8)*.17;
    human.position.y=moving?Math.sin(phase*1.7)*.025:0;
    gesture.rotation.z=moving?-.42+Math.sin(phase*2.4)*.11:-.42;
    const updateLabels=performance.now()-lastLabels>900||!moving;
    panels.forEach((mesh,i)=>{
      const angle=i*Math.PI*2/count+phase*.32+rotation*.35;
      mesh.position.set(Math.sin(angle)*2.55,Math.sin(angle*1.3)*.23+.1,Math.cos(angle)*1.1);
      mesh.rotation.y=-angle*.5;
      mesh.scale.setScalar(i===chosen?1.25:1);
      mesh.material.color.setHex(i===chosen?0x92eaff:0x195782);
      if(updateLabels){
        const button=buttons[i];
        const mobile=container.clientWidth<650;
        const labelAngle=i*Math.PI*2/count;
        button.style.left=mobile?`${i%2?83:17}%`:`${50+41*Math.sin(labelAngle)}%`;
        button.style.top=mobile?`${12+Math.floor(i/2)*15}%`:`${50-39*Math.cos(labelAngle)}%`;
        button.style.zIndex=String(Math.round((mesh.position.z+2)*10));}
    });
    if(updateLabels)lastLabels=performance.now();
    renderer.render(scene,camera);
    if(moving)frame=requestAnimationFrame(render);
  }
  function redraw(){cancelAnimationFrame(frame);render()}
  const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible)redraw();else cancelAnimationFrame(frame)});observer.observe(container);
  const sizeObserver=new ResizeObserver(resize);sizeObserver.observe(container);
  const down=e=>{drag=true;lastX=e.clientX;canvas.setPointerCapture(e.pointerId);cancelAnimationFrame(frame)};
  const move=e=>{if(!drag)return;rotation+=(e.clientX-lastX)*.006;lastX=e.clientX;render()};
  const up=()=>{drag=false;redraw()};
  canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',up);
  const change=()=>redraw();reduced.addEventListener?.('change',change);document.addEventListener('visibilitychange',change);
  const stage=container.parentElement;
  stage.addEventListener('pointerenter',()=>{hovered=true;redraw()});
  stage.addEventListener('pointerleave',()=>{hovered=false;redraw()});
  buttons.forEach(button=>{button.addEventListener('pointerenter',()=>{hovered=true;redraw()});button.addEventListener('pointerleave',()=>{hovered=false;redraw()});button.addEventListener('focus',()=>{hovered=true;redraw()});button.addEventListener('blur',()=>{hovered=false;redraw()})});
  resize();
  return {focus(index){chosen=index;gesture.rotation.z=-.75;redraw()},pause(){paused=true;cancelAnimationFrame(frame)},resume(){paused=false;redraw()},dispose(){cancelAnimationFrame(frame);observer.disconnect();sizeObserver.disconnect();reduced.removeEventListener?.('change',change);document.removeEventListener('visibilitychange',change);renderer.dispose();canvas.remove()}};
}
