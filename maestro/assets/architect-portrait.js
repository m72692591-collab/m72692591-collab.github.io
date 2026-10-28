import * as THREE from './vendor/three.module.min.js';

// A movable 2.5D cutout of the approved portrait. The underlying image remains a
// raster photograph; this module does not create a volumetric human model.
const SOURCE_WIDTH = 1536;
const SOURCE_HEIGHT = 1024;
const PLANE_Z = .35;
const FINGERTIP = { x: 830, y: 640 };
const unit = value => Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));

const vertexShader = `
  uniform float uTime;
  uniform float uAnimate;
  uniform float uReach;
  uniform float uAttach;
  uniform float uCarry;
  varying vec2 vUv;

  float segmentDistance(vec2 point, vec2 start, vec2 end) {
    vec2 edge = end - start;
    float along = clamp(dot(point - start, edge) / dot(edge, edge), 0.0, 1.0);
    return length(point - (start + along * edge));
  }

  void main() {
    vUv = uv;
    vec2 source = vec2(position.x + 768.0, 512.0 - position.y);
    vec2 warped = source;

    // Only the upper body breathes. The face has a tiny independent roll/nod.
    float upper = (1.0 - smoothstep(390.0, 920.0, source.y))
      * smoothstep(430.0, 620.0, source.x)
      * (1.0 - smoothstep(1060.0, 1320.0, source.x));
    vec2 headDelta = (source - vec2(785.0, 230.0)) / vec2(190.0, 190.0);
    float head = exp(-dot(headDelta, headDelta) * 1.8)
      * (1.0 - smoothstep(380.0, 500.0, source.y));
    float roll = sin(uTime * .57) * .009 * uAnimate;
    warped.x += head * (-(source.y - 340.0) * roll + sin(uTime * .73) * 1.2 * uAnimate);
    warped.y += head * ((source.x - 800.0) * roll + sin(uTime * .91) * 1.3 * uAnimate);

    // The cutout has no separate arm layer. Keep the deformation near the
    // photographed right arm and anchored at the shoulder.
    float upperArm = (1.0 - smoothstep(45.0, 95.0,
      segmentDistance(source, vec2(1000.0, 400.0), vec2(1060.0, 600.0))))
      * smoothstep(400.0, 615.0, source.y) * .55;
    float forearm = (1.0 - smoothstep(48.0, 105.0,
      segmentDistance(source, vec2(1060.0, 600.0), vec2(950.0, 690.0)))) * .78;
    float hand = 1.0 - smoothstep(48.0, 110.0,
      segmentDistance(source, vec2(950.0, 690.0), vec2(830.0, 640.0)));
    float arm = max(max(upperArm, forearm), hand);
    warped.y -= sin(uTime * 1.2) * 1.7 * upper * (1.0 - arm) * uAnimate;
    float reach = uReach * uAnimate;
    float carrying = uCarry * uAttach * uAnimate;
    warped += arm * vec2(-52.0 * reach - 82.0 * carrying,
                          -14.0 * reach + 10.0 * carrying);

    vec3 transformed = vec3(warped.x - 768.0, 512.0 - warped.y, position.z);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(transformed, 1.0);
  }
`;

const fragmentShader = `
  uniform sampler2D uMap;
  uniform float uBlink;
  uniform float uMouth;
  varying vec2 vUv;

  void main() {
    vec2 source = vec2(vUv.x * 1536.0, (1.0 - vUv.y) * 1024.0);
    float leftEye = exp(-pow((source.x - 731.0) / 32.0, 2.0)
                        - pow((source.y - 213.0) / 12.0, 2.0));
    float rightEye = exp(-pow((source.x - 813.0) / 34.0, 2.0)
                         - pow((source.y - 210.0) / 12.0, 2.0));
    vec2 samplePoint = source;
    samplePoint.y -= uBlink * max(leftEye, rightEye) * 5.5;
    float mouth = exp(-pow((source.x - 782.0) / 51.0, 2.0)
                      - pow((source.y - 285.0) / 16.0, 2.0));
    samplePoint.y -= uMouth * mouth * smoothstep(277.0, 291.0, source.y) * 3.0;
    vec2 sampleUv = vec2(samplePoint.x / 1536.0, 1.0 - samplePoint.y / 1024.0);
    vec4 color = texture2D(uMap, clamp(sampleUv, vec2(0.0), vec2(1.0)));
    color.a *= 1.0 - smoothstep(900.0, 1024.0, source.y);
    if (color.a < .003) discard;
    gl_FragColor = color;
    #include <colorspace_fragment>
  }
`;

export function createPortrait(scene, { onReady, onError } = {}) {
  const geometry = new THREE.PlaneGeometry(SOURCE_WIDTH, SOURCE_HEIGHT, 96, 64);
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uMap: { value: null }, uTime: { value: 0 }, uAnimate: { value: 0 },
      uReach: { value: 0 }, uAttach: { value: 0 }, uCarry: { value: 0 },
      uBlink: { value: 0 }, uMouth: { value: 0 }
    },
    vertexShader, fragmentShader, transparent: true, depthWrite: false,
    toneMapped: false, side: THREE.DoubleSide
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;
  mesh.renderOrder = -2; // Orbit and contact light remain in front of the cutout.
  mesh.visible = false;
  scene.add(mesh);

  let disposed = false, ready = false, wantedVisible = true, texture = null;
  let speaking = false, lastBoundary = 0, handPose = { reach: 0, attach: 0, carry: 0 };
  let laidOut = false;
  new THREE.TextureLoader().load(
    new URL('./architect/architect-portrait-cutout.webp', import.meta.url).href,
    loaded => {
      if (disposed) { loaded.dispose(); return; }
      texture = loaded;
      texture.colorSpace = THREE.SRGBColorSpace;
      material.uniforms.uMap.value = texture;
      ready = true;
      mesh.visible = wantedVisible;
      onReady?.();
    },
    undefined,
    error => { if (!disposed) onError?.(error); }
  );

  return {
    resize(camera, width, height) {
      if (disposed || !camera?.isPerspectiveCamera || width <= 0 || height <= 0) return;
      const mobile = width < 700;
      const imageHeight = mobile ? Math.min(520, height * .65) : Math.min(760, height * .94);
      const imageWidth = imageHeight * 1.5;
      const anchor = !mobile && width <= 1100 ? .66 : .59;
      const left = width * anchor - imageWidth * .54;
      const top = mobile ? 120 : 60;
      const distance = Math.max(.01, Math.abs(camera.position.z - PLANE_Z));
      const worldPerPixel = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) * distance / height;
      const centerX = left + imageWidth / 2;
      const centerY = top + imageHeight / 2;
      mesh.scale.setScalar(imageHeight / SOURCE_HEIGHT * worldPerPixel);
      mesh.position.set((centerX - width / 2) * worldPerPixel,
        camera.position.y + (height / 2 - centerY) * worldPerPixel, PLANE_Z);
      mesh.updateMatrixWorld(true);
      laidOut = true;
    },
    update({ time = 0, animate = true, gesture = null } = {}) {
      if (disposed) return;
      const moving = Boolean(animate);
      const now = Number.isFinite(time) ? time : 0;
      const reach = moving ? unit(gesture?.reach) : 0;
      const attach = moving ? unit(gesture?.attach) : 0;
      const carry = moving ? unit(gesture?.carry) : 0;
      handPose = { reach, attach, carry };
      material.uniforms.uTime.value = now;
      material.uniforms.uAnimate.value = moving ? 1 : 0;
      material.uniforms.uReach.value = reach;
      material.uniforms.uAttach.value = attach;
      material.uniforms.uCarry.value = carry;
      const blinkCycle = (now + 1.7) % 5.3;
      material.uniforms.uBlink.value = moving && blinkCycle >= 0 && blinkCycle < .24
        ? Math.sin(Math.PI * blinkCycle / .24) ** 2 : 0;
      const accent = Math.exp(-Math.max(0, now - lastBoundary) * 4);
      material.uniforms.uMouth.value = moving && speaking
        ? (.2 + .45 * (.5 + .5 * Math.sin(now * 13))) * (.7 + .3 * accent) : 0;
    },
    speech(detail, time = 0) {
      if (disposed || !detail) return;
      if (detail.phase === 'end') { speaking = false; material.uniforms.uMouth.value = 0; return; }
      if (detail.phase === 'start' || detail.phase === 'boundary') {
        speaking = true;
        lastBoundary = Number.isFinite(time) ? time : 0;
      }
    },
    handPosition() {
      if (disposed || !ready || !laidOut) return null;
      const carrying = handPose.carry * handPose.attach;
      const x = FINGERTIP.x - 52 * handPose.reach - 82 * carrying;
      const y = FINGERTIP.y - 14 * handPose.reach + 10 * carrying;
      mesh.updateMatrixWorld(true);
      return mesh.localToWorld(new THREE.Vector3(x - SOURCE_WIDTH / 2, SOURCE_HEIGHT / 2 - y, 0));
    },
    setVisible(value) {
      wantedVisible = Boolean(value);
      mesh.visible = !disposed && ready && wantedVisible;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      scene.remove(mesh);
      geometry.dispose(); material.dispose(); texture?.dispose();
    }
  };
}
