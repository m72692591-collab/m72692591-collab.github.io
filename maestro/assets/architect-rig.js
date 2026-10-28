import * as THREE from './vendor/three.module.min.js';
import { clamp, mouthPose, smooth } from './architect-motion.js';

const normalize = name => name.toLowerCase().replace(/^mixamorig:?/, '').replace(/[^a-z0-9]/g, '');

export function createRig(model) {
  const nodes = new Map(), morphs = new Map(), rests = new Map();
  model.traverse(node => {
    nodes.set(normalize(node.name), node);
    if (node.isBone) rests.set(node, node.quaternion.clone());
    if (node.morphTargetDictionary) Object.entries(node.morphTargetDictionary).forEach(([name, index]) => {
      const key = normalize(name);
      if (!morphs.has(key)) morphs.set(key, []);
      morphs.get(key).push([node, index]);
    });
  });
  const find = (...names) => names.map(normalize).map(name => nodes.get(name)).find(Boolean);
  const head = find('Head', 'head', 'DEF-spine.006');
  if (head) head.scale.multiplyScalar(1.12);
  const headPose = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, .20, -.035));
  const spine = find('Spine2', 'Spine', 'spine03', 'spine.003', 'DEF-spine.003');
  const arms = ['Right', 'Left'].map((side, index) => {
    const suffix = index ? 'L' : 'R';
    return {
      shoulder: find(side + 'Arm', 'upperarm.' + suffix, 'upperarm01.' + suffix, 'DEF-upper_arm.' + suffix),
      elbow: find(side + 'ForeArm', 'lowerarm.' + suffix, 'lowerarm01.' + suffix, 'DEF-forearm.' + suffix),
      hand: find(side + 'Hand', 'hand.' + suffix, 'DEF-hand.' + suffix),
      side: index ? 1 : -1
    };
  });
  const fingers = [];
  for (const [name, node] of nodes) {
    const match = name.match(/^(left|right)hand(index|middle|ring|pinky)([123])$/);
    if (match) fingers.push({ node, side: match[1] === 'left' ? 1 : -1, index: match[2] === 'index', segment: Number(match[3]) });
  }
  let speaking = false, speechText = '', speechIndex = 0, wordAt = 0, initialized = false;
  const controlledMorphs = new Set();
  const resetFace = () => { controlledMorphs.forEach(([mesh, index]) => { mesh.morphTargetInfluences[index] = 0; }); controlledMorphs.clear(); };
  const setMorph = (names, amount) => {
    for (const name of names) {
      const entries = morphs.get(normalize(name));
      entries?.forEach(([mesh, index]) => { mesh.morphTargetInfluences[index] = amount; controlledMorphs.add([mesh, index]); });
    }
  };
  // Apply a world-space rotation in the bone parent's coordinate frame.
  const rotateToward = (bone, endpoint, target) => {
    const origin = bone.getWorldPosition(new THREE.Vector3());
    const from = endpoint.getWorldPosition(new THREE.Vector3()).sub(origin).normalize();
    const to = target.clone().sub(origin).normalize();
    const parentRotation = bone.parent.getWorldQuaternion(new THREE.Quaternion());
    const delta = new THREE.Quaternion().setFromUnitVectors(from, to);
    delta.premultiply(parentRotation.clone().invert()).multiply(parentRotation);
    bone.quaternion.premultiply(delta);
    model.updateMatrixWorld(true);
  };
  const reach = (arm, target, weight) => {
    if (!arm.shoulder || !arm.elbow || !arm.hand || weight <= 0) return;
    model.updateMatrixWorld(true);
    const start = arm.shoulder.getWorldPosition(new THREE.Vector3());
    const elbow = arm.elbow.getWorldPosition(new THREE.Vector3());
    const wrist = arm.hand.getWorldPosition(new THREE.Vector3());
    const upper = start.distanceTo(elbow), lower = elbow.distanceTo(wrist);
    const wanted = wrist.clone().lerp(target, weight), direction = wanted.clone().sub(start);
    const distance = clamp(direction.length(), Math.abs(upper - lower) + .01, (upper + lower) * .97);
    direction.normalize(); wanted.copy(start).addScaledVector(direction, distance);
    const pole = new THREE.Vector3(arm.side * .55, -.85, .75);
    pole.addScaledVector(direction, -pole.dot(direction)).normalize();
    const cosine = clamp((upper * upper + distance * distance - lower * lower) / (2 * upper * distance), -1, 1);
    const desiredElbow = start.clone().addScaledVector(direction, upper * cosine).addScaledVector(pole, upper * Math.sqrt(1 - cosine * cosine));
    rotateToward(arm.shoulder, arm.elbow, desiredElbow);
    rotateToward(arm.elbow, arm.hand, wanted);
  };
  const aliases = name => [name, 'viseme_' + name, 'viseme.' + name, 'viseme' + name];
  return {
    capabilities: { body: arms.some(arm => arm.hand && arm.elbow && arm.shoulder), face: morphs.size > 0, morphs: morphs.size },
    chestPosition() { return spine?.getWorldPosition(new THREE.Vector3()) || null; },
    handPosition(side) { return arms[side < 0 ? 0 : 1].hand?.getWorldPosition(new THREE.Vector3()) || null; },
    speech(detail, time) {
      if (detail.phase === 'end') { speaking = false; resetFace(); return; }
      if (detail.phase === 'start') { speaking = true; speechText = detail.text || ''; speechIndex = 0; }
      if (detail.phase === 'boundary') speechIndex = detail.charIndex || 0;
      wordAt = time;
    },
    update({ time, animate, reachAmount = 0, side = 1, target, gaze = 0 }) {
      if (!animate && initialized) { resetFace(); return; }
      initialized = true;
      rests.forEach((rest, bone) => bone.quaternion.copy(rest));
      resetFace();
      if (head) head.quaternion.multiply(headPose);
      if (animate && spine) spine.quaternion.multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.sin(time * 1.4) * .008, Math.sin(time * .42) * .018, 0)));
      if (animate && head) head.quaternion.multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.sin(time * .7) * .015 + (speaking ? Math.sin(time * 3.4) * .012 : 0), clamp(gaze, -.25, .25), .012 * Math.sin(time * .43))));
      arms.forEach(arm => {
        if (!arm.shoulder || !arm.elbow || !arm.hand) return;
        model.updateMatrixWorld(true);
        const shoulder = arm.shoulder.getWorldPosition(new THREE.Vector3());
        const elbow = arm.elbow.getWorldPosition(new THREE.Vector3());
        const hand = arm.hand.getWorldPosition(new THREE.Vector3());
        const length = shoulder.distanceTo(elbow) + elbow.distanceTo(hand);
        const idle = shoulder.clone().add(new THREE.Vector3(arm.side < 0 ? -.08 : -.10, -length * (arm.side < 0 ? .93 : .32), length * (arm.side < 0 ? .16 : .48)));
        if (target && arm.side === side) idle.lerp(target, reachAmount);
        reach(arm, idle, 1);
        if (arm.side > 0) arm.hand.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), 1.0));
      });
      fingers.forEach(finger => {
        const amount = animate && finger.side === side ? reachAmount : 0;
        const rest = finger.segment === 2 ? .10 : finger.segment === 3 ? .08 : .06;
        const bend = rest + (finger.index ? -.1 * amount : .12 * amount);
        finger.node.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), bend));
      });
      if (!animate) return;
      const blinkTime = (time + 1.7) % 5.3;
      const blink = blinkTime < .26 ? Math.sin(Math.PI * blinkTime / .26) ** 2 : 0;
      setMorph(['eyeBlinkLeft', 'eyeBlinkRight', 'eyesClosed', 'eyes_closed'], blink);
      setMorph(['browInnerUp'], speaking ? .035 + Math.sin(time * 2) * .015 : reachAmount * .045);
      const eyeTurn = clamp(Math.abs(gaze) * .55, 0, .14);
      setMorph(gaze > 0 ? ['eyeLookOutLeft', 'eyeLookInRight'] : ['eyeLookInLeft', 'eyeLookOutRight'], eyeTurn);
      if (speaking) {
        const offset = Math.floor(Math.min(time - wordAt, .8) * 10);
        const pose = mouthPose(speechText, speechIndex + offset);
        setMorph(aliases(pose.viseme), pose.amount * (.7 + Math.sin(time * 16) * .2));
        setMorph(['jawOpen'], .08 + Math.max(0, Math.sin(time * 12)) * .12);
      }
    }
  };
}
