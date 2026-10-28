// CPU-only checks for the raster cutout controller. The texture loader is replaced;
// no image file, browser, WebGL context or network is needed.
import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from '../maestro/assets/vendor/three.module.min.js';
import {createPortrait} from '../maestro/assets/architect-portrait.js';
import {presentationFrame} from '../maestro/assets/architect-motion.js';

const close = (actual, expected, label, tolerance = 1e-5) =>
  assert.ok(Math.abs(actual - expected) < tolerance, `${label}: ${actual} versus ${expected}`);

test('approved raster cutout fits the stage and its fingertip follows only the gesture', () => {
  const originalLoad = THREE.TextureLoader.prototype.load;
  let imageUrl, disposedTexture = false;
  THREE.TextureLoader.prototype.load = function (url, onLoad) {
    imageUrl = url;
    const texture = new THREE.Texture();
    texture.addEventListener('dispose', () => { disposedTexture = true; });
    onLoad(texture);
    return texture;
  };
  const scene = new THREE.Scene();
  let ready = 0;
  let portrait;
  try {
    portrait = createPortrait(scene, {onReady: () => { ready++; }});
    assert.equal(ready, 1);
    assert.ok(imageUrl.endsWith('/architect/architect-portrait-cutout.webp'));
    const mesh = scene.children[0];
    assert.ok(mesh instanceof THREE.Mesh && mesh.material instanceof THREE.ShaderMaterial);
    assert.equal(mesh.material.toneMapped, false, 'portrait keeps the source colors outside scene tone mapping');
    assert.equal(mesh.material.uniforms.uMap.value.colorSpace, THREE.SRGBColorSpace);
    assert.equal(mesh.visible, true);

    const camera = new THREE.PerspectiveCamera(38, 800 / 650, .1, 60);
    camera.position.set(0, 1.5, 8.2);
    camera.lookAt(0, 1.5, 0);
    camera.updateMatrixWorld(true);
    const checkCenter = (width, height, expectedTop) => {
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      portrait.resize(camera, width, height);
      const imageHeight = width < 700 ? Math.min(520, height * .65) : Math.min(760, height * .94);
      const imageWidth = imageHeight * 1.5;
      const left = width * .59 - imageWidth * .54;
      const center = mesh.position.clone().project(camera);
      close((center.x * .5 + .5) * width, left + imageWidth / 2, 'image center x');
      close((-center.y * .5 + .5) * height, expectedTop + imageHeight / 2, 'image center y');
      close(mesh.geometry.parameters.width * mesh.scale.x / (mesh.geometry.parameters.height * mesh.scale.y), 1.5, 'source aspect ratio');
    };
    checkCenter(800, 650, 60);
    portrait.update({time: 0, animate: false});
    const resting = portrait.handPosition();
    assert.ok(resting?.isVector3);
    portrait.update({time: 1.35, animate: true, gesture: presentationFrame(1.35)});
    const pulling = portrait.handPosition();
    assert.ok(pulling.x < resting.x, 'right hand pulls the card toward viewer left');
    portrait.update({time: 3, animate: true, gesture: presentationFrame(3)});
    close(portrait.handPosition().x, resting.x, 'hand returns while the card remains presented');

    portrait.speech({phase: 'start', text: 'Здравствуйте'}, 3);
    portrait.update({time: 3.2, animate: true});
    assert.ok(mesh.material.uniforms.uMouth.value > 0, 'mouth warp runs during actual speech');
    portrait.speech({phase: 'end'}, 3.2);
    assert.equal(mesh.material.uniforms.uMouth.value, 0, 'speech end clears the mouth immediately');
    portrait.speech({phase: 'start'}, 4);
    portrait.update({time: 4.1, animate: false, gesture: presentationFrame(1.2)});
    assert.equal(mesh.material.uniforms.uMouth.value, 0, 'reduced motion keeps the mouth still');
    assert.equal(mesh.material.uniforms.uReach.value, 0, 'reduced motion keeps the arm still');
    close(portrait.handPosition().x, resting.x, 'reduced motion returns hand to rest');

    checkCenter(390, 700, 120);
    portrait.setVisible(false);
    assert.equal(mesh.visible, false);
    portrait.setVisible(true);
    assert.equal(mesh.visible, true);
  } finally {
    portrait?.dispose();
    THREE.TextureLoader.prototype.load = originalLoad;
  }
  assert.equal(scene.children.length, 0, 'dispose removes the portrait mesh');
  assert.equal(disposedTexture, true, 'dispose releases the raster texture');
});

test('late image completion after disposal cannot resurrect the portrait', () => {
  const originalLoad = THREE.TextureLoader.prototype.load;
  let complete, disposedTexture = false;
  THREE.TextureLoader.prototype.load = function (_url, onLoad) { complete = onLoad; return new THREE.Texture(); };
  const scene = new THREE.Scene();
  let ready = 0;
  try {
    const portrait = createPortrait(scene, {onReady: () => { ready++; }});
    portrait.dispose();
    const late = new THREE.Texture();
    late.addEventListener('dispose', () => { disposedTexture = true; });
    complete(late);
    assert.equal(ready, 0);
    assert.equal(scene.children.length, 0);
    assert.equal(disposedTexture, true);
  } finally { THREE.TextureLoader.prototype.load = originalLoad; }
});
