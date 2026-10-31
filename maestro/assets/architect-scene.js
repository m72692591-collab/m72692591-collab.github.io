import * as THREE from './vendor/three.module.min.js';
import { GLTFLoader } from './vendor/GLTFLoader.js';
import { MeshoptDecoder } from './vendor/meshopt_decoder.mjs';
import { createRig } from './architect-rig.js';
import { createPortrait } from './architect-portrait.js?v=manual-cube-4';
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
  const flightCube = new THREE.Group();
  const cubeShape = new THREE.BoxGeometry(1,1,1);
  flightCube.add(new THREE.Mesh(cubeShape,new THREE.MeshBasicMaterial({color:0x74cbff,transparent:true,opacity:.14,depthWrite:false})));
  flightCube.add(new THREE.LineSegments(new THREE.EdgesGeometry(cubeShape),new THREE.LineBasicMaterial({color:0xc7efff,transparent:true,opacity:.9})));
  flightCube.visible=false;scene.add(flightCube);
  let presentation = 'portrait', motion = true, loaded = false, modelRequested = false, disposed = false, paused = false, visible = true, docked = false;
  let dragging = false, pointerId = null, pointerTarget = null, downX = 0, downY = 0, lastX = 0, suppressClick = false;
  let selectionVersion = 0, pendingPresented = null;
  let holdOrbitUntil = 0;
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
  function notifyPresented() {
    const version = selectionVersion, index = chosen;
    pendingPresented = {version, index};
    // Speech listeners may redraw the scene. Dispatch after this frame finishes.
    queueMicrotask(flushPresented);
  }
  function flushPresented() {
    if (!pendingPresented || disposed) return;
    if (pendingPresented.version !== selectionVersion) { pendingPresented = null; return; }
    if (paused || document.hidden) return;
    const {index} = pendingPresented;
    pendingPresented = null;
    stage.dispatchEvent(new CustomEvent('architect:presented', { bubbles: true, detail: { index } }));
  }
  function finishPresentation(notify = true) {
    if (action) angle = action.to;
    action = null; docked = presentation === 'portrait';
    live.dataset.panelPresenting = docked ? 'open' : '';
    live.style.setProperty('--panel-reveal', '1');
    detail.inert = false;
    if (notify) notifyPresented();
  }
  function canPresent() {
    const rect = container.getBoundingClientRect();
    const headerBottom = document.querySelector('header')?.getBoundingClientRect().bottom || 0;
    const visibleHeight = Math.min(innerHeight, rect.bottom) - Math.max(headerBottom, rect.top);
    return !paused && !document.hidden && rect.width > 0 && visibleHeight >= Math.min(160, rect.height * .25);
  }
  function render(now = performance.now()) {
    frame = 0;
    if (disposed || !visible || paused || document.hidden) return;
    const dt = Math.min((now - previousTime) / 1000, .05); previousTime = now;
    const animate = motion && !reduced.matches;
    if (action && !canPresent()) finishPresentation();
    if (animate) time += dt;
    const orbitTurning = animate && !action && !dragging && !docked && !detail.dataset.sectionOpen
      && now > holdOrbitUntil && !orbit.contains(document.activeElement)
      && !buttons.some(button => button.matches(':hover'));
    if (orbitTurning) angle += dt * .045;
    container.dataset.orbitMotion = orbitTurning ? 'turning' : dragging ? 'drag' : 'held';
    const picture = presentation === 'portrait';
    const elapsed = action ? Math.max(0, (now - action.started) / 1000) : 0;
    const present = action && picture ? presentationFrame(elapsed) : null;
    const sweep = action ? (picture ? { reach: present.reach, contact: present.attach, progress: Math.min(1, elapsed / .75), done: present.done } : gestureFrame(elapsed)) : { reach: 0, contact: 0, progress: 0 };
    if (action) {
      angle = THREE.MathUtils.lerp(action.from, action.to, sweep.progress);
      if (sweep.done) { finishPresentation(); if (picture && document.activeElement === buttons[chosen]) detail.querySelector('a')?.focus({preventScroll:true}); }
    }
    actor.visible = presentation === 'model' && loaded;
    portrait.setVisible(picture);
    portrait.update({ time, animate, gesture: present });
    if (animate) { actor.rotation.y = actorYaw + Math.sin(time * .24) * .045; actor.position.y = Math.sin(time * 1.5) * .012; }
    else if (dragging) actor.rotation.y = actorYaw;
    actor.updateMatrixWorld(true);
    const modelChest = rig?.chestPosition();
    const photoHand = picture ? portrait.handPosition() : null;
    const portraitCenter = picture ? portrait.orbitCenter?.() : null;
    const centerX = picture ? (portraitCenter?.x ?? (mobile() ? .15 : .65)) : (mobile() ? .15 : .65);
    let centerY = picture ? (portraitCenter?.y ?? (photoHand?.y ?? .8) + .45) : (modelChest?.y ?? 2.2) - .55;
    const worldPerPixel = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) * Math.abs(camera.position.z) / container.clientHeight;
    const radiusX = Math.min(container.clientWidth * (mobile() ? .78 : .40), mobile() ? 310 : 560) * worldPerPixel;
    const radiusY = (mobile() ? 105 : container.clientWidth <= 1100 ? 125 : 110) * worldPerPixel;
    const radiusZ = mobile() ? 1.15 : 1.55;
    const cardWidth = mobile() ? 260 : container.clientWidth <= 1100 ? 280 : 380;
    const cardHeight = mobile() ? 232 : container.clientWidth <= 1100 ? 240 : 280;
    // Raise the entire elliptical orbit by its lowest (front) edge. This keeps
    // every resting screen above the fixed lower diagrams at every rotation.
    const lowerScreens = live.querySelector('.architect-bottom');
    if (lowerScreens) {
      const lowerTop = lowerScreens.getBoundingClientRect().top - container.getBoundingClientRect().top;
      const front = new THREE.Vector3(centerX, centerY - radiusY, radiusZ).project(camera);
      const frontBottom = (-front.y * .5 + .5) * container.clientHeight + cardHeight / 2;
      const lift = Math.max(0, frontBottom - (lowerTop - 24));
      centerY += lift * worldPerPixel * (camera.position.z - radiusZ) / camera.position.z;
    }
    flightCube.visible=false;
    const fullPage = live.dataset.pageLayout === 'full' && Boolean(detail.dataset.sectionOpen);
    const canvasBox = container.getBoundingClientRect();
    const detailBox = {x:detail.offsetLeft - (fullPage ? canvasBox.left : 0),y:detail.offsetTop - (fullPage ? canvasBox.top : 0),width:detail.offsetWidth,height:detail.offsetHeight};
    meshes.forEach((mesh, index) => {
      const a = index * TAU / catalog.length + angle, depth = Math.cos(a), front = (depth + 1) / 2;
      mesh.position.set(centerX + Math.sin(a) * radiusX, centerY - depth * radiusY, depth * radiusZ);
      mesh.rotation.y = -Math.sin(a) * .95;
      const projected = mesh.position.clone().project(camera), button = buttons[index];
      const x = (projected.x * .5 + .5) * container.clientWidth;
      const y = (-projected.y * .5 + .5) * container.clientHeight;
      const scale = .74 + front * .26;
      const turn = -Math.sin(a) * (mobile() ? 54 : 48);
      const apparentWidth = cardWidth * scale * Math.max(.24, Math.abs(Math.cos(THREE.MathUtils.degToRad(turn))));
      const apparentHeight = cardHeight * scale;
      button.hidden = x + apparentWidth / 2 < 0 || x - apparentWidth / 2 > container.clientWidth ||
        y + apparentHeight / 2 < 0 || y - apparentHeight / 2 > container.clientHeight;
      button.style.left = `${x}px`;
      button.style.top = `${y}px`;
      // Depth comes from position, scale and portrait occlusion, not disappearing text.
      button.style.opacity = String((.88 + .12 * front) * (present && index !== chosen ? .12 : 1));
      button.style.setProperty('--slide-label-opacity', '1');
      button.style.transform = `translate(-50%,-50%) perspective(1200px) rotateY(${turn}deg) scale(${scale})`;
      button.style.zIndex = depth < 0 ? '0' : '3';
      button.style.pointerEvents = depth < 0 ? 'none' : '';
      if (picture && index === chosen && present && photoHand) {
        const hand = photoHand.clone().project(camera);
        const handX = (hand.x * .5 + .5) * container.clientWidth;
        const handY = (-hand.y * .5 + .5) * container.clientHeight;
        const width = cardWidth;
        const handAnchorX = Math.max(width / 2 + 16, Math.min(container.clientWidth - width / 2 - 16, handX - width / 2 - 24));
        const handAnchorY = handY - 30;
        const upperDock = container.clientWidth > 1100 || fullPage;
        const dock = upperDock ? THREE.MathUtils.smoothstep(present.carry,.3,1) : THREE.MathUtils.smoothstep(present.carry,.72,1);
        const dockX=detailBox.x+detailBox.width/2;
        const landingY=upperDock ? Math.max(32,detailBox.y+16) : detailBox.y+90;
        const unfold=present.expand;
        const anchorX=THREE.MathUtils.lerp(handAnchorX,dockX,dock);
        const anchorY=THREE.MathUtils.lerp(handAnchorY,landingY,dock)-Math.sin(dock*Math.PI)*45;
        const grip=present.release>0 ? 1 : present.attach;
        const fold=upperDock ? THREE.MathUtils.smoothstep(present.carry,0,.3)*(1-unfold) : 0;
        button.style.left=`${THREE.MathUtils.lerp(x,anchorX,grip)}px`;
        button.style.top=`${THREE.MathUtils.lerp(y,THREE.MathUtils.lerp(anchorY,detailBox.y+cardHeight/2,unfold),grip)}px`;
        button.style.transform=`translate(-50%,-50%) scale(${(1-fold)*(1+unfold*.12)})`;
        button.style.opacity=String((1-present.reveal)*(1-fold));
        button.style.zIndex='28';
        button.style.setProperty('--slide-label-opacity', '1');
        if(upperDock && fold>.02){
          const ndc=new THREE.Vector3(anchorX/container.clientWidth*2-1,1-anchorY/container.clientHeight*2,.5).unproject(camera);
          const ray=ndc.sub(camera.position).normalize();
          flightCube.position.copy(camera.position).addScaledVector(ray,(1-camera.position.z)/ray.z);
          flightCube.scale.setScalar(44*worldPerPixel*fold);
          flightCube.rotation.set(.45+present.carry*1.6,.6+present.carry*2.4,.15+present.carry*.5);
          flightCube.visible=true;
        }
        live.style.setProperty('--panel-impact',String(Math.sin(unfold*Math.PI)*(1-present.reveal)));
        live.dataset.panelPresenting = 'moving';
        live.style.setProperty('--panel-reveal', present.reveal);
      }
      if (picture && docked && index === chosen) button.hidden = true;
      if (picture && index !== chosen && (!present || present.reveal > 0)) {
        const halfWidth = apparentWidth / 2;
        const halfHeight = apparentHeight / 2;
        if (x + halfWidth > detailBox.x && x - halfWidth < detailBox.x + detailBox.width &&
            y + halfHeight > detailBox.y && y - halfHeight < detailBox.y + detailBox.height) button.hidden = true;
      }
      button.dataset.depth = front.toFixed(3);
      mesh.visible = !button.hidden; mesh.material.opacity = .008 + front * .012;
    });
    if (picture && docked) live.dataset.panelPresenting = 'open';
    detail.inert = picture && Boolean(present) && present.reveal < 1;
    arc.position.set(centerX, centerY, 0); arc.scale.set(radiusX, radiusZ, 1);
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
    container.dataset.motionState = dragging ? 'drag' : action ? 'gesture' : animate ? 'idle' : 'still';
    renderer.render(scene, camera);
    if (animate) frame = requestAnimationFrame(render);
  }
  function redraw() { cancelAnimationFrame(frame); previousTime = performance.now(); render(); }
  const intersection = new IntersectionObserver(entries => { visible = entries[0].isIntersecting; if (visible) redraw(); else { if (action) finishPresentation(); cancelAnimationFrame(frame); } });
  intersection.observe(container);
  const sizing = new ResizeObserver(resize); sizing.observe(container);
  const down = event => {
    if (event.button !== 0 || !event.isPrimary || pointerId !== null) return;
    pointerId = event.pointerId; pointerTarget = event.currentTarget;
    holdOrbitUntil = performance.now() + 5000;
    downX = lastX = event.clientX; downY = event.clientY; suppressClick = false;
    pointerTarget.setPointerCapture(pointerId);
  };
  const move = event => {
    if (event.pointerId !== pointerId) return;
    const distanceX = event.clientX - downX, distanceY = event.clientY - downY;
    if (!dragging) {
      if (Math.abs(distanceX) <= 7) return;
      if (event.pointerType === 'touch' && Math.abs(distanceY) > Math.abs(distanceX)) return;
      dragging = true; suppressClick = true; selectionVersion++;
      action = null; docked = false; live.dataset.panelPresenting = ''; detail.inert = false;
    }
    event.preventDefault();
    const dx = event.clientX - lastX;
    holdOrbitUntil = performance.now() + 5000;
    angle += dx * .006; actorYaw += dx * .004; lastX = event.clientX;
    redraw();
  };
  const raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2();
  const up = event => {
    if (event.pointerId !== pointerId) return;
    const target = pointerTarget;
    const click = event.type === 'pointerup' && !dragging && Math.hypot(event.clientX - downX, event.clientY - downY) <= 7;
    const capturedId = pointerId;
    dragging = false; pointerId = null; pointerTarget = null;
    holdOrbitUntil = performance.now() + 5000;
    if (target.hasPointerCapture(capturedId)) target.releasePointerCapture(capturedId);
    if (click && target === canvas) {
      const rect = canvas.getBoundingClientRect();
      pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
      raycaster.setFromCamera(pointer, camera); const hit = raycaster.intersectObjects(meshes.filter(mesh => mesh.visible))[0];
      if (hit) onSelect(hit.object.userData.index);
    }
    redraw();
  };
  const preventDragClick = event => {
    if (suppressClick && event.detail !== 0) { event.preventDefault(); event.stopImmediatePropagation(); suppressClick = false; }
  };
  const speech = event => { speechActive = event.detail.phase !== 'end'; speechState = speechActive ? { ...speechState, ...event.detail } : null; rig?.speech(event.detail, time); portrait.speech(event.detail,time); redraw(); };
  const reduceChange = () => { if (reduced.matches && action) finishPresentation(); redraw(); };
  const visibilityChange = () => { if (document.hidden) { if (action) finishPresentation(); cancelAnimationFrame(frame); } else { redraw(); flushPresented(); } };
  const contextLost = event => { event.preventDefault(); cancelAnimationFrame(frame); stage.dispatchEvent(new CustomEvent('architect:context-lost', { bubbles: true })); };
  const listeners = [];
  function listen(target, event, callback, options = false) { target.addEventListener(event, callback, options); listeners.push([target, event, callback, options]); }
  [canvas, ...buttons].forEach(target => {
    target.style.touchAction = 'pan-y';
    listen(target, 'pointerdown', down); listen(target, 'pointermove', move); listen(target, 'pointerup', up); listen(target, 'pointercancel', up); listen(target, 'lostpointercapture', up);
    listen(target, 'click', preventDragClick, true);
  });
  listen(canvas, 'webglcontextlost', contextLost); listen(window, 'maestro:speech', speech);
  listen(document, 'visibilitychange', visibilityChange); listen(reduced, 'change', reduceChange);
  listen(live, 'architect:section-close', () => { selectionVersion++; pendingPresented = null; action = null; docked = false; detail.inert = false; live.dataset.panelPresenting = ''; holdOrbitUntil = performance.now() + 1200; redraw(); });
  resize();
  return {
    setPresentation(value) { clearTimeout(statusTimer); selectionVersion++; presentation = value; action = null; docked = false; live.dataset.panelPresenting = ''; detail.inert = false; if (value === 'model') loadModel(); else if (container.dataset.portraitState === 'loaded') status.hidden = true; redraw(); },
    setMotion(value) { motion = value; if (!motion && action) finishPresentation(); redraw(); },
    focus(index, animate = true) {
      const direction = index === (chosen + 1) % catalog.length ? -1 : index === (chosen - 1 + catalog.length) % catalog.length ? 1 : 0;
      selectionVersion++; chosen = index; docked = false; live.dataset.panelPresenting = ''; detail.inert = false; const target = nearestAngle(-index * TAU / catalog.length, angle);
      if (animate && motion && !reduced.matches && canPresent()) action = { from: angle, to: target, started: performance.now(), side: direction || Math.sign(target - angle) || 1 };
      else { angle = target; action = null; if (animate) finishPresentation(); }
      redraw();
    },
    pause() { paused = true; if (action) finishPresentation(); cancelAnimationFrame(frame); },
    resume() { paused = false; redraw(); flushPresented(); },
    dispose() {
      disposed = true; cancelAnimationFrame(frame); clearTimeout(statusTimer);
      intersection.disconnect(); sizing.disconnect(); listeners.forEach(([target, event, callback, options]) => target.removeEventListener(event, callback, options));
      portrait.dispose(); cleanupObject(scene); renderer.dispose(); canvas.remove();
    }
  };
}
