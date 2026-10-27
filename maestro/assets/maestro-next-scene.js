import * as THREE from './vendor/three.module.min.js';
import {GLTFLoader} from './vendor/GLTFLoader.js';

export function createScene(container,orbit,catalog,reduced,onSelect){
  const count=catalog.length;
  const canvas=document.createElement('canvas');container.append(canvas);
  const renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'low-power'});
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,matchMedia('(max-width:640px)').matches?1.25:1.75));
  const scene=new THREE.Scene();
  const camera=new THREE.PerspectiveCamera(40,1,.1,100);camera.position.set(0,1.2,10);camera.lookAt(0,.3,0);
  scene.add(new THREE.AmbientLight(0x77c9ff,1.5));
  const key=new THREE.PointLight(0xb6ecff,110);key.position.set(-3,4,4);scene.add(key);
  const rim=new THREE.PointLight(0x279dff,115);rim.position.set(3,1,-3);scene.add(rim);
  const human=new THREE.Group();human.visible=false;scene.add(human);
  const shell=new THREE.MeshPhysicalMaterial({color:0x58bfff,transparent:true,opacity:.38,metalness:.48,roughness:.2,side:THREE.DoubleSide,depthWrite:false});
  const wire=new THREE.MeshBasicMaterial({color:0x91eaff,wireframe:true,transparent:true,opacity:.22,depthWrite:false});
  const head=new THREE.Mesh(new THREE.SphereGeometry(.42,24,18),shell);head.scale.set(.8,1.16,.86);head.position.y=1.45;human.add(head);
  const torso=new THREE.Mesh(new THREE.CylinderGeometry(.55,.78,1.45,12,1),shell);torso.position.y=.34;human.add(torso);
  const torsoWire=torso.clone();torsoWire.material=wire;human.add(torsoWire);
  const neck=new THREE.Mesh(new THREE.CylinderGeometry(.16,.18,.26,12),shell);neck.position.y=1.04;human.add(neck);
  const armMaterial=shell.clone();armMaterial.opacity=.48;
  function arm(x){const group=new THREE.Group();group.position.set(x,.82,0);const upper=new THREE.Mesh(new THREE.CylinderGeometry(.16,.13,.95,12),armMaterial);upper.position.set(x>0?.21:-.21,-.42,0);upper.rotation.z=x>0?-.4:.4;group.add(upper);const lower=new THREE.Mesh(new THREE.CylinderGeometry(.12,.09,.84,12),armMaterial);lower.position.set(x>0?.48:-.48,-1.12,.25);lower.rotation.z=x>0?-.25:.25;group.add(lower);human.add(group);return group}
  arm(-.58);const gesture=arm(.58);
  let character=human,armBone=null,armRest=null,leftArmBone=null,leftArmRest=null,disposed=false;
  let modelStatus=container.parentElement.querySelector('#next-model-status');
  if(!modelStatus){modelStatus=document.createElement('div');modelStatus.id='next-model-status';modelStatus.className='next-loading';modelStatus.setAttribute('aria-live','polite');container.parentElement.append(modelStatus)}
  modelStatus.hidden=false;modelStatus.textContent='Загружаем объёмную модель…';
  const modelSource=matchMedia('(max-width:650px)').matches?'./assets/models/architect-mobile.glb':'./assets/models/architect-rigged.glb';
  new GLTFLoader().load(modelSource,gltf=>{
    if(disposed)return;
    const model=gltf.scene;
    const bounds=new THREE.Box3().setFromObject(model),size=bounds.getSize(new THREE.Vector3());
    if(!Number.isFinite(size.y)||size.y<=0)throw new Error('Invalid character dimensions');
    model.scale.setScalar(4.7/size.y);
    model.updateMatrixWorld(true);
    const fitted=new THREE.Box3().setFromObject(model),center=fitted.getCenter(new THREE.Vector3());
    model.position.x-=center.x;model.position.y+=-1.29-fitted.min.y;model.position.z-=center.z;model.userData.baseY=model.position.y;
    model.traverse(node=>{
      if(node.isMesh){
        const old=Array.isArray(node.material)?node.material[0]:node.material;
        node.material=new THREE.MeshPhysicalMaterial({map:old?.map||null,normalMap:old?.normalMap||null,color:0xb9e9ff,emissive:0x1675ae,emissiveIntensity:.75,transparent:true,opacity:.84,metalness:.26,roughness:.36,side:THREE.DoubleSide,depthWrite:false});
      }
    });
    armBone=model.getObjectByName('RightArm');armRest=armBone?.quaternion.clone()||null;
    leftArmBone=model.getObjectByName('LeftArm');leftArmRest=leftArmBone?.quaternion.clone()||null;
    human.visible=false;scene.add(model);character=model;
    modelStatus.textContent='Объёмная модель загружена';setTimeout(()=>{modelStatus.hidden=true},1400);
    redraw();
  },undefined,()=>{human.visible=true;modelStatus.textContent='Модель не загрузилась: показан 3D-прототип';setTimeout(()=>{modelStatus.hidden=true},5000);redraw()});
  const base=new THREE.Mesh(new THREE.CylinderGeometry(1.35,1.55,.12,64),new THREE.MeshStandardMaterial({color:0x06243b,metalness:.8,roughness:.25}));base.position.y=-1.42;scene.add(base);
  const rings=[];for(const radius of [1.43,2.48]){const ring=new THREE.Mesh(new THREE.TorusGeometry(radius,.014,5,96),new THREE.MeshBasicMaterial({color:0x53d8ff,transparent:true,opacity:.55}));ring.rotation.x=Math.PI/2;ring.position.y=-1.31;scene.add(ring);rings.push(ring)}
  function panelTexture(label){
    const surface=document.createElement('canvas');surface.width=512;surface.height=128;
    const ctx=surface.getContext('2d');ctx.fillStyle='rgba(5,32,54,.92)';ctx.fillRect(0,0,512,128);
    ctx.strokeStyle='#7be2ff';ctx.lineWidth=5;ctx.strokeRect(4,4,504,120);
    ctx.fillStyle='#e8faff';ctx.font='bold 30px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(label,256,64,475);
    const texture=new THREE.CanvasTexture(surface);texture.colorSpace=THREE.SRGBColorSpace;return texture;
  }
  const panelGroup=new THREE.Group();scene.add(panelGroup);
  const panels=catalog.map((item,i)=>{const mesh=new THREE.Mesh(new THREE.BoxGeometry(1.16,.3,.025),new THREE.MeshBasicMaterial({map:panelTexture(item.title),color:i===0?0xb4f0ff:0xffffff,transparent:true,opacity:.84,side:THREE.DoubleSide,depthWrite:false}));mesh.userData.index=i;panelGroup.add(mesh);return mesh});
  const touch=new THREE.Mesh(new THREE.SphereGeometry(.11,16,12),new THREE.MeshBasicMaterial({color:0xbaf2ff,transparent:true,opacity:.75}));scene.add(touch);
  let chosen=0,phase=0,frame=0,visible=true,paused=false,drag=false,hovered=false,lastX=0,downX=0,rotation=0,lastLabels=0,gestureAt=0,focusSide=1,lastFrame=performance.now();
  const buttons=[...orbit.querySelectorAll('button')];
  function resize(){const w=container.clientWidth,h=container.clientHeight;if(!w||!h)return;renderer.setSize(w,h,false);camera.aspect=w/h;camera.position.z=w<650?9.5:10;camera.updateProjectionMatrix();render()}
  function render(){if(!visible||paused||document.hidden)return;
    const moving=!reduced.matches&&!drag&&!hovered;
    const now=performance.now(),delta=Math.min((now-lastFrame)/1000,.06);lastFrame=now;
    if(moving)phase+=delta*.18;
    const gestureAmount=Math.max(0,1-(performance.now()-gestureAt)/2500);
    const chosenSide=Math.sign(panels[chosen].position.x)||1;
    character.rotation.y=rotation+phase*.8+gestureAmount*chosenSide*.18;
    character.position.y=(character.userData.baseY||0)+(moving?Math.sin(phase*1.7)*.025:0);
    gesture.rotation.z=-.42-gestureAmount*.36;
    if(armBone&&armRest)armBone.quaternion.copy(armRest);
    if(leftArmBone&&leftArmRest)leftArmBone.quaternion.copy(leftArmRest);
    const selectedArm=chosenSide<0?armBone:leftArmBone;
    if(selectedArm&&gestureAmount)selectedArm.quaternion.multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(gestureAmount*1.5,0,-chosenSide*gestureAmount*1.75)));
    const updateLabels=performance.now()-lastLabels>900||!moving;
    panels.forEach((mesh,i)=>{
      const angle=i*Math.PI*2/count+phase+rotation*.35;
      const mobile=container.clientWidth<650;
      mesh.position.set(Math.sin(angle)*(mobile?1.65:2.25),Math.sin(angle*1.3)*(mobile?.72:1.05)+.4,Math.cos(angle)*(mobile?.9:1.3));
      mesh.rotation.y=-angle*.5;
      if(i===chosen){const pop=gestureAt?Math.min(1,(now-gestureAt)/650):1;mesh.position.lerp(new THREE.Vector3(focusSide*(mobile?1.15:1.85),mobile?1.1:1.65,mobile?1.9:2.45),pop*.83);mesh.rotation.y*=1-pop;mesh.scale.setScalar(1+pop*(mobile?.25:1.1))}else mesh.scale.setScalar(mobile?.8:1);
      mesh.material.color.setHex(0xffffff);
      mesh.material.opacity=i===chosen?.98:(mesh.position.z>0?.76:.26);
      if(updateLabels){
        const button=buttons[i];
        const mobile=container.clientWidth<650;
        button.style.left=mobile?`${i%2?83:17}%`:`${i%2?87:13}%`;
        button.style.top=`${12+Math.floor(i/2)*15}%`;
        button.style.zIndex=String(Math.round((mesh.position.z+2)*10));}
    });
    touch.visible=gestureAmount>.01&&!reduced.matches;
    if(touch.visible){
      const target=panels[chosen].position.clone();target.z+=.08;
      const hand=character.getObjectByName(focusSide<0?'RightHand':'LeftHand');
      if(hand){character.updateMatrixWorld(true);hand.getWorldPosition(touch.position);touch.position.lerp(target,Math.min(1,(now-gestureAt)/900))}
      else touch.position.copy(target);
      touch.scale.setScalar(.6+gestureAmount*1.1);touch.material.opacity=gestureAmount*.75;
    }
    if(updateLabels)lastLabels=performance.now();
    renderer.render(scene,camera);
    if(moving||gestureAmount>0)frame=requestAnimationFrame(render);
  }
  function redraw(){cancelAnimationFrame(frame);render()}
  const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible)redraw();else cancelAnimationFrame(frame)});observer.observe(container);
  const sizeObserver=new ResizeObserver(resize);sizeObserver.observe(container);
  const down=e=>{drag=true;lastX=downX=e.clientX;canvas.setPointerCapture(e.pointerId);cancelAnimationFrame(frame)};
  const move=e=>{if(!drag)return;rotation+=(e.clientX-lastX)*.006;lastX=e.clientX;render()};
  const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();
  const up=e=>{const click=drag&&Math.abs(e.clientX-downX)<7;drag=false;
    if(click){const rect=canvas.getBoundingClientRect();pointer.set(((e.clientX-rect.left)/rect.width)*2-1,-((e.clientY-rect.top)/rect.height)*2+1);raycaster.setFromCamera(pointer,camera);const hit=raycaster.intersectObjects(panels)[0];if(hit)onSelect(hit.object.userData.index)}
    redraw()};
  canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',up);
  const change=()=>redraw();reduced.addEventListener?.('change',change);document.addEventListener('visibilitychange',change);
  const stage=container.parentElement;
  stage.addEventListener('pointerenter',()=>{hovered=true;redraw()});
  stage.addEventListener('pointerleave',()=>{hovered=false;redraw()});
  buttons.forEach(button=>{button.addEventListener('pointerenter',()=>{hovered=true;redraw()});button.addEventListener('pointerleave',()=>{hovered=false;redraw()});button.addEventListener('focus',()=>{hovered=true;redraw()});button.addEventListener('blur',()=>{hovered=false;redraw()})});
  resize();
  return {focus(index,animate=true){chosen=index;focusSide=Math.sign(panels[index].position.x)||1;if(animate&&!reduced.matches)gestureAt=performance.now();redraw()},pause(){paused=true;cancelAnimationFrame(frame)},resume(){paused=false;redraw()},dispose(){disposed=true;cancelAnimationFrame(frame);observer.disconnect();sizeObserver.disconnect();reduced.removeEventListener?.('change',change);document.removeEventListener('visibilitychange',change);renderer.dispose();canvas.remove();modelStatus.remove()}};
}
