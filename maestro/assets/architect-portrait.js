import * as THREE from './vendor/three.module.min.js';

// A movable 2.5D cutout of the approved portrait. The underlying image remains a
// raster photograph; this module does not create a volumetric human model.
const SOURCE_WIDTH = 1536;
const SOURCE_HEIGHT = 1024;
const PLANE_Z = .35;
const FINGERTIP = { x: 830, y: 640 };
const SHOULDER = {x:1005,y:392}, ELBOW = {x:1070,y:650};
// Author-defined cut lines follow the original sleeve and fingers. Each part is
// a rigid textured polygon: rotations never stretch its photographed pixels.
const ARM = [[970,348],[1030,335],[1081,352],[1097,403],[1107,487],[1110,532],[1120,592],[1134,651],[1127,708],[1090,746],[1042,768],[979,786],[944,764],[930,743],[893,739],[850,713],[822,687],[815,655],[827,642],[863,654],[871,626],[881,626],[929,648],[941,632],[932,587],[943,563],[956,568],[966,590],[980,620],[995,641],[999,602],[981,558],[965,531],[958,480],[960,421]];
const UPPER = [...ARM.slice(0,8),[1110,670],[1000,615],[999,602],...ARM.slice(31)];
const LOWER = [[1000,600],[1108,615],...ARM.slice(7,31)];
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

    // The arm is rendered by separate jointed meshes. Never warp the sleeve.

    vec3 transformed = vec3(warped.x - 768.0, 512.0 - warped.y, position.z);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(transformed, 1.0);
  }
`;

const fragmentShader = `
  uniform sampler2D uMap;
  uniform sampler2D uUnderlay;
  uniform vec2 uContour[${ARM.length}];
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
    bool inside = false;
    float edgeDistance = 10000.0;
    for (int i=0; i<${ARM.length}; i++) {
      vec2 a=uContour[i], b=uContour[(i+1)%${ARM.length}];
      vec2 edge=b-a;
      edgeDistance=min(edgeDistance,length(source-a-edge*clamp(dot(source-a,edge)/dot(edge,edge),0.0,1.0)));
      if ((a.y>source.y)!=(b.y>source.y) && source.x<(b.x-a.x)*(source.y-a.y)/(b.y-a.y)+a.x) inside=!inside;
    }
    float repairMask=inside ? 1.0 : 1.0-smoothstep(0.0,3.0,edgeDistance);
    color=mix(color,texture2D(uUnderlay,vUv),repairMask);
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
      uMap: { value: null }, uUnderlay:{value:null}, uContour:{value:ARM.map(([x,y])=>new THREE.Vector2(x,y))}, uTime: { value: 0 }, uAnimate: { value: 0 },
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

  const shoulder = new THREE.Group(), elbow = new THREE.Group();
  shoulder.position.set(SHOULDER.x-768,512-SHOULDER.y,.01);
  elbow.position.set(ELBOW.x-SHOULDER.x,SHOULDER.y-ELBOW.y,.01);
  mesh.add(shoulder); shoulder.add(elbow);
  const armMaterials=[];
  function part(points,pivot,parent,order) {
    const shape=new THREE.Shape(points.map(([x,y])=>new THREE.Vector2(x-pivot.x,pivot.y-y)));
    const geometry=new THREE.ShapeGeometry(shape), positions=geometry.getAttribute('position');
    const uv=geometry.getAttribute('uv');
    for(let i=0;i<positions.count;i++) uv.setXY(i,(positions.getX(i)+pivot.x)/1536,1-(pivot.y-positions.getY(i))/1024);
    const mat=new THREE.MeshBasicMaterial({transparent:true,depthWrite:false,toneMapped:false,side:THREE.DoubleSide});
    const piece=new THREE.Mesh(geometry,mat); piece.renderOrder=order; piece.frustumCulled=false;
    parent.add(piece);armMaterials.push(mat);return piece;
  }
  const upperArm=part(UPPER,SHOULDER,shoulder,-1), forearm=part(LOWER,ELBOW,elbow,0);
  mesh.userData.armParts={shoulder,elbow,upperArm,forearm};

  let disposed = false, ready = false, wantedVisible = true, texture = null, underlay=null;
  let speaking = false, lastBoundary = 0, handPose = { reach: 0, attach: 0, carry: 0 };
  let laidOut = false;
  new THREE.TextureLoader().load(
    new URL('./architect/architect-portrait-cutout.webp', import.meta.url).href,
    loaded => {
      if (disposed) { loaded.dispose(); return; }
      texture = loaded;
      texture.colorSpace = THREE.SRGBColorSpace;
      material.uniforms.uMap.value = texture;
      armMaterials.forEach(mat=>{mat.map=texture;mat.needsUpdate=true;});
      finish();
    },
    undefined,
    error => { if (!disposed) onError?.(error); }
  );
  function finish(){if(texture&&underlay&&!disposed){ready=true;mesh.visible=wantedVisible;onReady?.();}}
  new THREE.TextureLoader().load(new URL('./architect/architect-torso-underlay.webp',import.meta.url).href, loaded=>{
    if(disposed){loaded.dispose();return;} underlay=loaded;underlay.colorSpace=THREE.SRGBColorSpace;
    material.uniforms.uUnderlay.value=underlay;finish();
  },undefined,error=>{if(!disposed)onError?.(error);});

  return {
    resize(camera, width, height) {
      if (disposed || !camera?.isPerspectiveCamera || width <= 0 || height <= 0) return;
      const mobile = width < 700;
      const imageHeight = mobile ? Math.min(520, height * .65) : Math.min(760, height * .94);
      const imageWidth = imageHeight * 1.5;
      const anchor = !mobile && width <= 1100 ? .66 : .59;
      const left = width * anchor - imageWidth * .54;
      const top = mobile ? 120 : width > 1100 && height < 780 ? 32 : 60;
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
      const carrying=carry*attach;
      // Rotate the entire silhouette as a rigid plane, with a restrained torso
      // turn accompanying the arm. No stretching of the photographed suit.
      mesh.rotation.y = moving ? -.12 * carrying + Math.sin(now * .47) * .012 : 0;
      mesh.rotation.z = moving ? -.018 * carrying + Math.sin(now * .63) * .003 : 0;
      shoulder.rotation.z=moving ? -.035*reach-.105*carrying+Math.sin(now*.8)*.009 : 0;
      elbow.rotation.z=moving ? -.16*reach+.24*carrying+Math.sin(now*1.1+.5)*.016 : 0;
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
      mesh.updateMatrixWorld(true);
      return elbow.localToWorld(new THREE.Vector3(FINGERTIP.x-ELBOW.x,ELBOW.y-FINGERTIP.y,0));
    },
    orbitCenter(){
      if(disposed||!ready||!laidOut)return null;
      mesh.updateMatrixWorld(true);
      return new THREE.Vector3(880-768,512-530,0).multiply(mesh.scale).add(mesh.position);
    },
    setVisible(value) {
      wantedVisible = Boolean(value);
      mesh.visible = !disposed && ready && wantedVisible;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      scene.remove(mesh);
      geometry.dispose(); material.dispose(); texture?.dispose(); underlay?.dispose();
      upperArm.geometry.dispose();forearm.geometry.dispose();armMaterials.forEach(mat=>mat.dispose());
    }
  };
}
