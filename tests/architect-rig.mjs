// CPU-only regressions using the same Three.js, rig and timing modules as the site.
// No DOM, WebGL context, external avatar, speech service or network is required.
import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from '../maestro/assets/vendor/three.module.min.js';
import {createRig} from '../maestro/assets/architect-rig.js';
import {TAU, gestureFrame, nearestAngle} from '../maestro/assets/architect-motion.js';

const EPSILON = 1e-6;
const close = (actual, expected, message, tolerance = EPSILON) =>
  assert.ok(Math.abs(actual - expected) < tolerance, `${message}: ${actual} versus ${expected}`);

function fixture({rotated = false} = {}) {
  const model = new THREE.Group();
  const bones = [];
  const bone = (name, parent, position) => {
    const value = new THREE.Bone();
    value.name = name;
    value.position.fromArray(position);
    parent?.add(value);
    bones.push(value);
    return value;
  };
  const hips = bone('Hips', null, [0, 0, 0]);
  const spine = bone('Spine2', hips, [0, 1.2, 0]);
  bone('Head', spine, [0, .65, 0]);
  const arms = [-1, 1].map(side => {
    const name = side < 0 ? 'Right' : 'Left';
    const shoulder = bone(`${name}Arm`, spine, [side * .4, .3, 0]);
    const elbow = bone(`${name}ForeArm`, shoulder, [side * .9, 0, 0]);
    const hand = bone(`${name}Hand`, elbow, [side * .75, 0, 0]);
    return {side, shoulder, elbow, hand};
  });
  const geometry = new THREE.BufferGeometry();
  const positions = [0, 0, 0, .1, 0, 0, 0, .1, 0];
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(new Array(12).fill(0), 4));
  geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute([1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0], 4));
  geometry.morphAttributes.position = ['jawOpen', 'viseme_aa', 'eyeBlinkLeft', 'eyeBlinkRight'].map(name => {
    const attribute = new THREE.Float32BufferAttribute(positions, 3);
    attribute.name = name;
    return attribute;
  });
  const mesh = new THREE.SkinnedMesh(geometry, new THREE.MeshBasicMaterial());
  mesh.name = 'SyntheticFace';
  mesh.add(hips);
  model.add(mesh);
  const skeleton = new THREE.Skeleton(bones);
  mesh.bind(skeleton);
  if (rotated) {
    model.position.set(.35, -.2, .9);
    model.rotation.set(.1, .65, -.2);
    model.scale.setScalar(1.6);
  }
  model.updateMatrixWorld(true);
  const rig = createRig(model);
  const pose = () => bones.map(value => value.quaternion.toArray());
  const value = name => mesh.morphTargetInfluences[mesh.morphTargetDictionary[name]];
  const dispose = () => { geometry.dispose(); mesh.material.dispose(); skeleton.dispose(); };
  return {model, mesh, skeleton, bones, arms, rig, pose, value, dispose};
}

test('speech cancellation clears the mouth while body motion is paused', () => {
  const f = fixture();
  try {
    assert.ok(f.mesh instanceof THREE.SkinnedMesh && f.skeleton instanceof THREE.Skeleton, 'use real Three.js skinning objects');
    assert.equal(f.rig.capabilities.body, true);
    assert.equal(f.rig.capabilities.face, true);
    f.rig.speech({phase: 'start', text: 'Ааааааааа'}, 0);
    f.rig.update({time: .4, animate: true});
    assert.ok(f.value('jawOpen') > 0 && f.value('viseme_aa') > 0, 'speech first produces an observable mouth pose');
    const body = f.pose();
    f.rig.update({time: .4, animate: false});
    f.rig.speech({phase: 'end'}, .4);
    f.rig.update({time: .4, animate: false});
    assert.equal(f.value('jawOpen'), 0, 'cancel closes the jaw even without another animated frame');
    assert.equal(f.value('viseme_aa'), 0, 'cancel clears the active mouth shape');
    assert.deepEqual(f.pose(), body, 'cancel does not unpause the body');
    f.rig.update({time: .8, animate: true});
    assert.equal(f.value('jawOpen'), 0, 'resuming motion does not resume canceled speech');
    assert.equal(f.value('viseme_aa'), 0);
  } finally { f.dispose(); }
});

test('reduced motion keeps the initialized body still across time and speech events', () => {
  const f = fixture();
  try {
    f.rig.update({time: 0, animate: false});
    const body = f.pose();
    f.rig.speech({phase: 'start', text: 'Ааа'}, 0);
    for (const time of [.4, 3.73, 100]) f.rig.update({time, animate: false, gaze: .25});
    assert.deepEqual(f.pose(), body, 'idle breathing, gaze and speech nods remain disabled');
    assert.deepEqual(f.mesh.morphTargetInfluences, [0, 0, 0, 0], 'reduced motion does not start blinking or mouth movement');
    f.rig.speech({phase: 'end'}, 100);
    f.rig.update({time: 101, animate: false});
    assert.deepEqual(f.pose(), body);
  } finally { f.dispose(); }
});

for (const rotated of [false, true]) {
  for (const side of [-1, 1]) {
    test(`hand reaches a reachable target (${side < 0 ? 'right' : 'left'}, ${rotated ? 'transformed' : 'identity'} parent)`, () => {
      const f = fixture({rotated});
      try {
        const arm = f.arms.find(value => value.side === side);
        const shoulder = arm.shoulder.getWorldPosition(new THREE.Vector3());
        const target = shoulder.clone().add(new THREE.Vector3(side * .4, -.8, .75));
        f.rig.update({time: 0, animate: true, side, target, reachAmount: 1});
        f.model.updateMatrixWorld(true);
        const hand = f.rig.handPosition(side);
        assert.ok(hand.distanceTo(target) < EPSILON, `world-space hand misses target by ${hand.distanceTo(target)}`);
        for (const node of f.bones) {
          assert.ok(node.matrixWorld.elements.every(Number.isFinite), `${node.name} world matrix stays finite`);
          close(node.quaternion.length(), 1, `${node.name} keeps a unit quaternion`);
        }
      } finally { f.dispose(); }
    });
  }
}

test('unreachable targets keep the wrist within arm length without invalid transforms', () => {
  const f = fixture({rotated: true});
  try {
    for (const arm of f.arms) {
      const start = arm.shoulder.getWorldPosition(new THREE.Vector3());
      const elbow = arm.elbow.getWorldPosition(new THREE.Vector3());
      const wrist = arm.hand.getWorldPosition(new THREE.Vector3());
      const upper = start.distanceTo(elbow), lower = elbow.distanceTo(wrist);
      const target = start.clone().add(new THREE.Vector3(arm.side * 100, 70, 100));
      f.rig.update({time: 0, animate: true, side: arm.side, target, reachAmount: 1});
      f.model.updateMatrixWorld(true);
      const nextStart = arm.shoulder.getWorldPosition(new THREE.Vector3());
      const nextElbow = arm.elbow.getWorldPosition(new THREE.Vector3());
      const nextWrist = f.rig.handPosition(arm.side);
      close(nextStart.distanceTo(nextElbow), upper, 'IK does not stretch the upper arm');
      close(nextElbow.distanceTo(nextWrist), lower, 'IK does not stretch the forearm');
      assert.ok(nextStart.distanceTo(nextWrist) <= upper + lower + EPSILON, 'endpoint cannot exceed arm reach');
      assert.ok(nextWrist.toArray().every(Number.isFinite), 'clamped endpoint stays finite');
      assert.ok(nextWrist.distanceTo(target) > 1, 'an unreachable target is not reached by stretching');
    }
  } finally { f.dispose(); }
});

test('carousel wrapping uses the short path without discontinuity after multiple turns', () => {
  const degree = Math.PI / 180;
  close(nearestAngle(-179 * degree, 179 * degree), 181 * degree, 'cross positive pi by two degrees');
  close(nearestAngle(179 * degree, -179 * degree), -181 * degree, 'cross negative pi by two degrees');
  for (const current of [-20 * TAU - .3, 0, 37 * TAU + .8]) {
    const target = 2.4, selected = nearestAngle(target, current);
    assert.ok(Math.abs(selected - current) <= Math.PI + EPSILON, 'selection never adds an extra revolution');
    close(Math.sin(selected), Math.sin(target), 'wrapped angle reaches the same direction');
    close(Math.cos(selected), Math.cos(target), 'wrapped angle reaches the same direction');
  }
});

test('the hand reaches before the carousel moves and contact ends with the gesture', () => {
  const start = gestureFrame(0), anticipation = gestureFrame(.2), contact = gestureFrame(1.36), end = gestureFrame(1.8);
  assert.deepEqual(start, {progress: 0, reach: 0, contact: 0, done: false});
  assert.ok(anticipation.reach > 0 && anticipation.progress === 0 && anticipation.contact === 0, 'hand anticipates carousel movement');
  assert.ok(contact.progress > .99 && contact.reach > .5 && contact.contact > .9, 'light contact follows arrival while the hand is extended');
  assert.deepEqual(end, {progress: 1, reach: 0, contact: 0, done: true});
  assert.deepEqual(gestureFrame(4), end, 'late frames settle to the same completed state');
  let previous = 0;
  for (let step = 0; step <= 180; step++) {
    const value = gestureFrame(step / 100);
    assert.ok([value.progress, value.reach, value.contact].every(number => Number.isFinite(number) && number >= 0 && number <= 1), 'gesture weights stay finite and bounded');
    assert.ok(value.progress >= previous, 'carousel does not reverse inside one gesture');
    previous = value.progress;
  }
});
