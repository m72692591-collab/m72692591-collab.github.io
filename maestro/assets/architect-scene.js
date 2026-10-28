import * as THREE from './vendor/three.module.min.js';
import { GLTFLoader } from './vendor/GLTFLoader.js';
import { MeshoptDecoder } from './vendor/meshopt_decoder.mjs';
import { createRig } from './architect-rig.js';
import { createPortrait } from './architect-portrait.js';
import { TAU, gestureFrame, presentationFrame, nearestAngle } from './architect-motion.js';

export function createScene(container, orbit, catalog, reduced, onSelect) {
  const stage = container.parentElement, buttons = [...orbit.querySelectorAll('button')];
  const live = stage.parentElement, detail = live.querySelector('.next-detail');
  const canvas = document.createElement('canvas');
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' });
  container.append(canvas);
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, matchMedia('(max-width:700px)').matches ? 1.25 : 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(38, 1, .1, 60);
  scene.add(new THREE.HemisphereLight(0xc5e9ff, 0x182535, 1.05));
  const key = new THREE.DirectionalLight(0xffede0, 3); key.position.set(-4, 5, 4); scene.add(key);
  const rim = new THREE.DirectionalLight(0x44baff, 2.5); rim.position.set(4, 2, -3); scene.add(rim);
  const fill = new THREE.DirectionalLight(0x81c9ff, .65); fill.position.set(0, 0, 5); scene.add(fill);
  const actor = new THREE.Group(); scene.add(actor);
  const meshes = catalog.map((item, index) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(2.1, .8, .025), new THREE.MeshBasicMaterial({ color: 0x3e96c9, transparent: true, opacity: .045, depthWrite: false }));
    mesh.userData.index = index; scene.add(mesh); return mesh;
  });
  const arc = new THREE.Mesh(new THREE.TorusGeometry(1, .0025, 4, 128), new THREE.MeshBasicMaterial({ color: 0x8bdcff, transparent: true, opacity: .17, depthWrite: false }));
  arc.rotation.x = Math.PI / 2; scene.add(arc);
  const touch = new THREE.Group();
  for (const radius of [.075, .13, .22]) touch.add(new THREE.Mesh(new THREE.RingGeometry(radius, radius + .012, 36), new THREE.MeshBasicMaterial({ color: 0xbfeeff, transparent: true, opacity: .8, side: THREE.DoubleSide, depthWrite: false })));
  scene.add(touch);
  let presentation = 'portrait', motion = true, loaded = false, modelRequested = false, disposed = false, paused = false, visible = true, docked = false;
  let hovered = false, focused = false, dragging = false, pointerId = null, downX = 0, lastX = 0;
  let chosen = 0, angle = 0, actorYaw = -.30, time = 0, action = null, rig = null, frame = 0, previousTime = performance.now();
  actor.rotation.y = actorYaw;
  let speechActive = false, speechState = null, statusTimer;
  let status = stage.querySelector('#next-model-status');
  if (!status) { status = document.createElement('div'); status.id = 'next-model-status'; status.className = 'next-loading'; status.setAttribute('aria-live', 'polite'); stage.append(status); }
  status.hidden = false; status.textContent = 'Оживляем образ…';
  const portrait = createPortrait(scene, {
    onReady() { container.dataset.portraitState = 'loaded'; live.dataset.portraitReady = 'true'; if (presentation === 'portrait') { clearTimeout(statusTimer); status.hidden = false; status.textContent = 'Живой образ загружен'; statusTimer = setTimeout(() => { status.hidden = true; }, 1400); } redraw(); },
    onError() { container.dataset.portraitState = 'failed'; if (presentation === 'portrait') { status.textContent = 'Показываем статичный образ. Карусель доступна.'; } redraw(); }
  });
  const modelSource = container.dataset.model || (matchMedia('(max-width:700px)').matches ? './assets/models/architect-human-mobile.glb?v=human-1' : './assets/models/architect-human.glb?v=human-1');
  const cleanupObject = object => object.traverse(node => {
    node.geometry?.dispose();
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    materials.filter(Boolean).forEach(material => {
      for (const value of Object.values(material)) if (value?.isTexture) value.dispose();
      material.dispose();
    });
  });
  function loadModel() {
  if (modelRequested) return;
  modelRequested = true; clearTimeout(statusTimer); status.hidden = false; status.textContent = 'Загружаем объёмный эскиз…';
  new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).load(modelSource, gltf => {
    if (disposed) { cleanupObject(gltf.scene); return; }
    const model = gltf.scene;
    const bounds = new THREE.Box3().setFromObject(model), size = bounds.getSize(new THREE.Vector3());
    if (!Number.isFinite(size.y) || size.y <= 0) { cleanupObject(model); failModel(); return; }
    model.scale.setScalar(7.6 / size.y); model.updateMatrixWorld(true);
    const fit = new THREE.Box3().setFromObject(model), center = fit.getCenter(new THREE.Vector3());
    model.position.set(-center.x, -4.3 - fit.min.y, -center.z);
    model.traverse(node => {
      if (!node.isMesh) return;
      node.frustumCulled = false;
      const old = Array.isArray(node.material) ? node.material : [node.material];
      node.material = old.map(material => {
        const name = `${node.name} ${material.name}`.toLowerCase();
        if (/wire|grid/.test(material.name.toLowerCase())) {
          node.renderOrder = 2;
          material.dispose(); return new THREE.MeshBasicMaterial({ color: 0x62c6ff, transparent: true, opacity: .24, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
        }
        const isSuit = !/openneckshirt/.test(name) && /suit|jacket|shirt|pants|trouser|cloth|blazer/.test(name);
        const result = new THREE.MeshPhysicalMaterial({
          name: material.name, map: material.map, normalMap: material.normalMap,
          color: isSuit ? 0x8bb5de : material.color, roughness: isSuit ? .62 : .58,
          metalness: isSuit ? .08 : 0, transparent: isSuit || material.transparent,
          opacity: isSuit ? .5 : material.opacity, side: isSuit ? THREE.DoubleSide : material.side,
          emissive: isSuit ? 0x137dd3 : 0x000000, emissiveIntensity: isSuit ? .08 : 0,
          depthWrite: isSuit ? false : material.depthWrite, alphaTest: material.alphaTest || (material.transparent && !isSuit ? .08 : 0)
        });
        if (isSuit) {
          result.onBeforeCompile = shader => {
            shader.fragmentShader = shader.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\nfloat hologramRim = pow(1.0 - abs(dot(normal, normalize(vViewPosition))), 3.0);\ntotalEmissiveRadiance += vec3(.12,.55,1.0) * hologramRim * 1.4;');
          };
          result.customProgramCacheKey = () => 'architect-suit-rim-2';
        }
        material.dispose(); return result;
      });
      if (node.material.length === 1) node.material = node.material[0];
    });
    actor.add(model); actor.updateMatrixWorld(true); rig = createRig(model); loaded = true;
    if (speechActive && speechState) { rig.speech({ ...speechState, phase: 'start' }, time); rig.speech({ ...speechState, phase: 'boundary' }, time); }
    container.dataset.modelState = 'loaded';
    container.dataset.bodyRig = String(rig.capabilities.body); container.dataset.faceRig = String(rig.capabilities.face);
    clearTimeout(statusTimer); status.hidden = false; status.textContent = 'Объёмная модель загружена'; statusTimer = setTimeout(() => { status.hidden = true; }, 1400);
    redraw();
  }, undefined, failModel);
  }
  function failModel() {
    if (disposed) return;
    clearTimeout(statusTimer); status.hidden = false; container.dataset.modelState = 'failed'; status.textContent = 'Модель не загрузилась. Показываем портрет.';
    stage.dispatchEvent(new CustomEvent('architect:model-error', { bubbles: true })); redraw();
  }
  function mobile() { return container.clientWidth < 700; }
  function resize() {
    if (disposed) return;
    const width = container.clientWidth, height = container.clientHeight;
    if (!width || !height) return;
    renderer.setSize(width, height, false); camera.aspect = width / height;
    camera.position.set(0, mobile() ? 1.15 : 1.5, mobile() ? 11.4 : 8.9);
    camera.lookAt(0, camera.position.y, 0); camera.updateProjectionMatrix();
    portrait.resize(camera, width, height);
    actor.position.x = mobile() ? .35 : .65; redraw();
  }
  function render(now = performance.now()) {
    frame = 0;
    if (disposed || !visible || paused || document.hidden) return;
    const dt = Math.min((now - previousTime) / 1000, .05); previousTime = now;
    const animate = motion && !reduced.matches;
    if (animate) time += dt;
    const idle = animate && !hovered && !focused && !dragging && !action;
    const picture = presentation === 'portrait';
    const present = action && picture ? presentationFrame(time - action.started) : null;
    const sweep = action ? (picture ? { reach: present.reach, contact: present.attach, progress: Math.min(1, (time - action.started) / .75), done: present.done } : gestureFrame(time - action.started)) : { reach: 0, contact: 0, progress: 0 };
    if (action) {
      angle = THREE.MathUtils.lerp(action.from, action.to, sweep.progress);
      if (sweep.done) { angle = action.to; action = null; if (picture) { docked = true; live.dataset.panelPresenting = 'open'; if (document.activeElement === buttons[chosen]) detail.querySelector('a')?.focus({preventScroll:true}); } }
    } else if (idle) {
      const cycle = time % 8, wave = cycle < 3 ? Math.sin(Math.PI * cycle / 3) ** 2 : 0;
      angle += dt * .14 * wave; sweep.reach = wave * .45;
    }
    actor.visible = presentation === 'model' && loaded;
    portrait.setVisible(picture);
    portrait.update({ time, animate, gesture: present });
    if (animate) { actor.rotation.y = actorYaw + Math.sin(time * .24) * .045; actor.position.y = Math.sin(time * 1.5) * .012; }
    else if (dragging) actor.rotation.y = actorYaw;
    actor.updateMatrixWorld(true);
    const modelChest = rig?.chestPosition();
    const photoHand = picture ? portrait.handPosition() : null;
    const chest = picture ? (photoHand?.y ?? .8) + .24 : (modelChest?.y ?? 2.2) - .55;
    const centerX = mobile() ? .15 : .65;
    const radius = mobile() ? 2.8 : Math.min(4.8, container.clientWidth / container.clientHeight * 2.05);
    meshes.forEach((mesh, index) => {
      const a = index * TAU / catalog.length + angle, front = (Math.cos(a) + 1) / 2;
      mesh.position.set(centerX + Math.sin(a) * radius, chest + Math.cos(a) * .12, Math.cos(a) * .8);
      mesh.rotation.y = -Math.sin(a) * .18;
      const projected = mesh.position.clone().project(camera), button = buttons[index];
      button.hidden = front < (mobile() ? .76 : .82) && index !== chosen;
      button.style.left = `${(projected.x * .5 + .5) * 100}%`;
      button.style.top = `${(-projected.y * .5 + .5) * 100}%`;
      button.style.opacity = String(.12 + front * .88);
      button.style.transform = `translate(-50%,-50%) perspective(900px) rotateY(${-Math.sin(a) * 24}deg) scale(${.62 + front * .38})`;
      button.style.zIndex = String(Math.round(front * 24));
      button.style.pointerEvents = front < .35 ? 'none' : '';
      if (picture && index === chosen && present && photoHand) {
        const hand = photoHand.clone().project(camera);
        const handX = (hand.x * .5 + .5) * container.clientWidth;
        const handY = (-hand.y * .5 + .5) * container.clientHeight;
        const width = button.offsetWidth || (mobile() ? 260 : 300);
        const anchorX = Math.max(width / 2 + 16, Math.min(container.clientWidth - width / 2 - 16, handX - width * .35));
        const anchorY = handY - 22;
        const originalX = (projected.x * .5 + .5) * container.clientWidth;
        const originalY = (-projected.y * .5 + .5) * container.clientHeight;
        const grip = present.release > 0 ? 1 : present.attach;
        button.style.left = `${THREE.MathUtils.lerp(originalX, anchorX, grip)}px`;
        button.style.top = `${THREE.MathUtils.lerp(originalY, anchorY, grip)}px`;
        button.style.transform = `translate(-50%,-50%) scale(${1 + present.expand * .12})`;
        button.style.opacity = String(1 - present.reveal);
        button.style.zIndex = '28';
        live.dataset.panelPresenting = 'moving';
        live.style.setProperty('--panel-reveal', present.reveal);
        if (!mobile() && present.carry > .96 && present.release === 0) {
          live.style.setProperty('--active-panel-left', `${Math.max(24, anchorX - 150)}px`);
          live.style.setProperty('--active-panel-top', `${Math.max(190, Math.min(container.clientHeight - 340, anchorY - 65))}px`);
        }
      }
      if (picture && docked && index === chosen) button.hidden = true;
      button.dataset.depth = front.toFixed(3);
      mesh.visible = !button.hidden; mesh.material.opacity = .025 + front * .025;
    });
    if (picture && docked) live.dataset.panelPresenting = 'open';
    detail.inert = picture && Boolean(present) && present.reveal < 1;
    arc.position.set(centerX, chest, 0); arc.scale.set(radius, .8, 1);
    const side = action?.side || 1, target = meshes[chosen].position.clone();
    target.x += side * .7; target.z += .45;
    rig?.update({ time, animate, reachAmount: sweep.reach, side, target, gaze: (target.x - actor.position.x) * .12 });
    touch.visible = animate && sweep.contact > .01;
    if (touch.visible) {
      const hand = picture ? photoHand : rig?.handPosition(side);
      touch.position.copy(hand || target);
      touch.lookAt(camera.position); touch.scale.setScalar(.65 + (1 - sweep.contact) * .7);
      touch.children.forEach(ring => { ring.material.opacity = sweep.contact * .8; });
    }
    container.dataset.motionState = dragging ? 'drag' : action ? 'gesture' : idle ? 'idle' : 'still';
    renderer.render(scene, camera);
    if (animate && ((!hovered && !focused && !dragging) || action || actor.visible || picture || speechActive)) frame = requestAnimationFrame(render);
  }
  function redraw() { cancelAnimationFrame(frame); previousTime = performance.now(); render(); }
  const intersection = new IntersectionObserver(entries => { visible = entries[0].isIntersecting; if (visible) redraw(); else cancelAnimationFrame(frame); });
  intersection.observe(container);
  const sizing = new ResizeObserver(resize); sizing.observe(container);
  const down = event => {
    if (event.button !== 0) return;
    dragging = true; pointerId = event.pointerId; downX = lastX = event.clientX; action = null; docked = false; live.dataset.panelPresenting = '';
    canvas.setPointerCapture(pointerId); redraw();
  };
  const move = event => { if (!dragging) return; const dx = event.clientX - lastX; angle += dx * .006; actorYaw += dx * .004; lastX = event.clientX; redraw(); };
  const raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2();
  const up = event => {
    if (!dragging) return;
    const click = event.type === 'pointerup' && Math.abs(event.clientX - downX) < 7;
    dragging = false;
    if (canvas.hasPointerCapture(pointerId)) canvas.releasePointerCapture(pointerId);
    pointerId = null;
    if (click) {
      const rect = canvas.getBoundingClientRect();
      pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
      raycaster.setFromCamera(pointer, camera); const hit = raycaster.intersectObjects(meshes.filter(mesh => mesh.visible))[0];
      if (hit) onSelect(hit.object.userData.index);
    }
    redraw();
  };
  const speech = event => { speechActive = event.detail.phase !== 'end'; speechState = speechActive ? { ...speechState, ...event.detail } : null; rig?.speech(event.detail, time); portrait.speech(event.detail,time); redraw(); };
  const reduceChange = () => { if (reduced.matches && action) { angle = action.to; action = null; docked = false; live.dataset.panelPresenting = ''; } redraw(); };
  const visibilityChange = () => { if (document.hidden) cancelAnimationFrame(frame); else redraw(); };
  const contextLost = event => { event.preventDefault(); cancelAnimationFrame(frame); stage.dispatchEvent(new CustomEvent('architect:context-lost', { bubbles: true })); };
  const listeners = [];
  function listen(target, event, callback) { target.addEventListener(event, callback); listeners.push([target, event, callback]); }
  listen(canvas, 'pointerdown', down); listen(canvas, 'pointermove', move); listen(canvas, 'pointerup', up); listen(canvas, 'pointercancel', up); listen(canvas, 'lostpointercapture', up);
  listen(canvas, 'webglcontextlost', contextLost); listen(window, 'maestro:speech', speech);
  listen(document, 'visibilitychange', visibilityChange); listen(reduced, 'change', reduceChange);
  buttons.forEach(button => {
    listen(button, 'pointerenter', () => { hovered = true; redraw(); });
    listen(button, 'pointerleave', () => { hovered = false; redraw(); });
    listen(button, 'focus', () => { focused = true; redraw(); });
    listen(button, 'blur', () => { focused = false; redraw(); });
  });
  resize();
  return {
    setPresentation(value) { clearTimeout(statusTimer); presentation = value; action = null; docked = false; live.dataset.panelPresenting = ''; detail.inert = false; if (value === 'model') loadModel(); else if (container.dataset.portraitState === 'loaded') status.hidden = true; redraw(); },
    setMotion(value) { motion = value; if (!motion) { action = null; docked = false; live.dataset.panelPresenting = ''; } redraw(); },
    focus(index, animate = true) {
      const direction = index === (chosen + 1) % catalog.length ? -1 : index === (chosen - 1 + catalog.length) % catalog.length ? 1 : 0;
      chosen = index; docked = false; live.dataset.panelPresenting = ''; const target = nearestAngle(-index * TAU / catalog.length, angle);
      if (animate && motion && !reduced.matches) action = { from: angle, to: target, started: time, side: direction || Math.sign(target - angle) || 1 };
      else { angle = target; action = null; }
      redraw();
    },
    pause() { paused = true; cancelAnimationFrame(frame); },
    resume() { paused = false; redraw(); },
    dispose() {
      disposed = true; cancelAnimationFrame(frame); clearTimeout(statusTimer);
      intersection.disconnect(); sizing.disconnect(); listeners.forEach(([target, event, callback]) => target.removeEventListener(event, callback));
      portrait.dispose(); cleanupObject(scene); renderer.dispose(); canvas.remove();
    }
  };
}
