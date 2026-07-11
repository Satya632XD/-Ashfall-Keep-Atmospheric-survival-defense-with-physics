// ==========================================================================
// game.js — Ashfall Keep core scene (Turn 2)
// ==========================================================================

window.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('renderCanvas');
  const engine = new BABYLON.Engine(canvas, true, {
    preserveDrawingBuffer: true,
    stencil: true,
    antialias: true,
  });

  Input.init(canvas);
  Player.init();

  const scene = createScene(engine, canvas);

  scene.executeWhenReady(() => {
    document.getElementById('loadingScreen').style.display = 'none';
  });

  engine.runRenderLoop(() => {
    Input.update();
    scene.onBeforeRenderObservable.notifyObservers();
    scene.render();
    Input.lateUpdate();
  });

  window.addEventListener('resize', () => engine.resize());
});

function createScene(engine, canvas) {
  const scene = new BABYLON.Scene(engine);
  scene.clearColor = new BABYLON.Color4(0.02, 0.015, 0.03, 1);

  scene.fogMode = BABYLON.Scene.FOGMODE_EXP2;
  scene.fogDensity = 0.045;
  scene.fogColor = new BABYLON.Color3(0.05, 0.045, 0.07);

  const camera = new BABYLON.UniversalCamera(
    'playerCam',
    new BABYLON.Vector3(0, 1.7, -6),
    scene
  );
  camera.minZ = 0.05;
  camera.fov = 0.95;
  camera.inputs.clear();

  const EYE_HEIGHT = 1.7;
  const MOVE_SPEED = 4.2;
  let camRotY = Math.PI;
  let camRotX = 0;
  let bobTime = 0;

  const ARENA_RADIUS = 11.5;

  scene.onBeforeRenderObservable.add(() => {
    if (Player.isDead) return;
    const dt = engine.getDeltaTime() / 1000;

    camRotY += Input.state.lookDX;
    camRotX += Input.state.lookDY;
    camRotX = Math.max(-1.2, Math.min(1.2, camRotX));

    camera.rotation.y = camRotY;
    camera.rotation.x = camRotX;

    const forward = new BABYLON.Vector3(Math.sin(camRotY), 0, Math.cos(camRotY));
    const right = new BABYLON.Vector3(Math.cos(camRotY), 0, -Math.sin(camRotY));

    const mv = Input.state.moveY;
    const mh = Input.state.moveX;

    let moveVec = forward.scale(mv).add(right.scale(mh));
    if (moveVec.length() > 1) moveVec = moveVec.normalize();
    moveVec = moveVec.scale(MOVE_SPEED * dt);

    let nx = camera.position.x + moveVec.x;
    let nz = camera.position.z + moveVec.z;

    const distFromCenter = Math.hypot(nx, nz);
    if (distFromCenter > ARENA_RADIUS) {
      const scale = ARENA_RADIUS / distFromCenter;
      nx *= scale;
      nz *= scale;
    }

    camera.position.x = nx;
    camera.position.z = nz;

    const isMoving = Math.abs(mv) > 0.05 || Math.abs(mh) > 0.05;
    if (isMoving) {
      bobTime += dt * 8.5;
      camera.position.y = EYE_HEIGHT + Math.sin(bobTime) * 0.035;
    } else {
      bobTime *= 0.9;
      camera.position.y += (EYE_HEIGHT - camera.position.y) * 0.15;
    }
  });

  const moonLight = new BABYLON.HemisphericLight('moon', new BABYLON.Vector3(0.2, 1, 0.1), scene);
  moonLight.diffuse = new BABYLON.Color3(0.25, 0.28, 0.4);
  moonLight.groundColor = new BABYLON.Color3(0.03, 0.03, 0.05);
  moonLight.intensity = 0.35;

  const fireLight = new BABYLON.PointLight('fireLight', new BABYLON.Vector3(0, 1.4, 0), scene);
  fireLight.diffuse = new BABYLON.Color3(1, 0.55, 0.2);
  fireLight.specular = new BABYLON.Color3(1, 0.6, 0.3);
  fireLight.intensity = 2.2;
  fireLight.range = 18;

  const shadowGen = new BABYLON.ShadowGenerator(1024, fireLight);
  shadowGen.useBlurExponentialShadowMap = true;
  shadowGen.blurKernel = 16;
  shadowGen.darkness = 0.35;

  let flickerT = 0;
  scene.onBeforeRenderObservable.add(() => {
    const dt = engine.getDeltaTime() / 1000;
    flickerT += dt;
    const flicker =
      Math.sin(flickerT * 13.1) * 0.15 +
      Math.sin(flickerT * 27.3) * 0.08 +
      Math.sin(flickerT * 5.7) * 0.12;
    fireLight.intensity = 2.2 + flicker;
    fireLight.position.x = Math.sin(flickerT * 3.3) * 0.05;
    fireLight.position.z = Math.cos(flickerT * 2.7) * 0.05;
  });

  const stoneMat = new BABYLON.PBRMaterial('stoneMat', scene);
  stoneMat.albedoColor = new BABYLON.Color3(0.22, 0.21, 0.24);
  stoneMat.metallic = 0.0;
  stoneMat.roughness = 0.95;

  const darkStoneMat = new BABYLON.PBRMaterial('darkStoneMat', scene);
  darkStoneMat.albedoColor = new BABYLON.Color3(0.09, 0.09, 0.11);
  darkStoneMat.metallic = 0.0;
  darkStoneMat.roughness = 1.0;

  const emberMat = new BABYLON.StandardMaterial('emberMat', scene);
  emberMat.emissiveColor = new BABYLON.Color3(1, 0.45, 0.1);
  emberMat.diffuseColor = new BABYLON.Color3(0.3, 0.1, 0.02);

  const wraithMat = new BABYLON.StandardMaterial('wraithMat', scene);
  wraithMat.emissiveColor = new BABYLON.Color3(0.35, 0.55, 0.6);
  wraithMat.diffuseColor = new BABYLON.Color3(0.05, 0.08, 0.09);
  wraithMat.alpha = 0.82;

  const ground = BABYLON.MeshBuilder.CreateDisc('ground', { radius: 14, tessellation: 48 }, scene);
  ground.rotation.x = Math.PI / 2;
  ground.material = stoneMat;
  ground.receiveShadows = true;

  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const r = 4 + (i % 3) * 2.5;
    const slab = BABYLON.MeshBuilder.CreateBox('slab' + i, { width: 1.6, depth: 1.6, height: 0.08 }, scene);
    slab.position.set(Math.cos(a) * r, 0.04, Math.sin(a) * r);
    slab.rotation.y = a + (Math.random() - 0.5) * 0.6;
    slab.material = darkStoneMat;
    slab.receiveShadows = true;
  }

  const wallSegments = 10;
  for (let i = 0; i < wallSegments; i++) {
    const a = (i / wallSegments) * Math.PI * 2;
    const height = Math.max(0.6, 2.2 + Math.sin(i * 2.1) * 1.4 + Math.random() * 0.8);
    const wall = BABYLON.MeshBuilder.CreateBox('wall' + i, { width: 2.6, depth: 0.6, height }, scene);
    wall.position.set(Math.cos(a) * 11.5, height / 2, Math.sin(a) * 11.5);
    wall.rotation.y = -a;
    wall.material = stoneMat;
    wall.receiveShadows = true;
    shadowGen.addShadowCaster(wall);
  }

  const brazierBase = BABYLON.MeshBuilder.CreateCylinder('brazierBase', {
    diameterTop: 1.1, diameterBottom: 0.5, height: 1.1, tessellation: 8,
  }, scene);
  brazierBase.position.y = 0.55;
  brazierBase.material = darkStoneMat;
  brazierBase.receiveShadows = true;
  shadowGen.addShadowCaster(brazierBase);

  const emberCore = BABYLON.MeshBuilder.CreateSphere('emberCore', { diameter: 0.55, segments: 6 }, scene);
  emberCore.position.y = 1.15;
  emberCore.material = emberMat;

  scene.onBeforeRenderObservable.add(() => {
    emberCore.scaling.setAll(1 + Math.sin(flickerT * 9) * 0.06);
    const healthScale = 0.55 + 0.45 * (Player.fireHealth / 100);
    emberCore.scaling.scaleInPlace(healthScale);
    fireLight.intensity = (2.2 + Math.sin(flickerT * 13.1) * 0.15) * (0.4 + 0.6 * (Player.fireHealth / 100));
  });

  const fireParticles = new BABYLON.ParticleSystem('fire', 200, scene);
  fireParticles.particleTexture = new BABYLON.Texture(
    'https://raw.githubusercontent.com/BabylonJS/Babylon.js/master/packages/tools/playground/public/textures/flare.png',
    scene
  );
  fireParticles.emitter = new BABYLON.Vector3(0, 1.2, 0);
  fireParticles.minEmitBox = new BABYLON.Vector3(-0.15, 0, -0.15);
  fireParticles.maxEmitBox = new BABYLON.Vector3(0.15, 0, 0.15);
  fireParticles.color1 = new BABYLON.Color4(1, 0.6, 0.2, 1);
  fireParticles.color2 = new BABYLON.Color4(1, 0.3, 0.05, 1);
  fireParticles.colorDead = new BABYLON.Color4(0.2, 0.05, 0, 0);
  fireParticles.minSize = 0.15;
  fireParticles.maxSize = 0.45;
  fireParticles.minLifeTime = 0.4;
  fireParticles.maxLifeTime = 0.9;
  fireParticles.emitRate = 60;
  fireParticles.blendMode = BABYLON.ParticleSystem.BLENDMODE_ADD;
  fireParticles.gravity = new BABYLON.Vector3(0, 2.2, 0);
  fireParticles.direction1 = new BABYLON.Vector3(-0.3, 1, -0.3);
  fireParticles.direction2 = new BABYLON.Vector3(0.3, 1, 0.3);
  fireParticles.minAngularSpeed = -1;
  fireParticles.maxAngularSpeed = 1;
  fireParticles.start();

  const ashParticles = new BABYLON.ParticleSystem('ash', 150, scene);
  ashParticles.particleTexture = fireParticles.particleTexture;
  ashParticles.emitter = new BABYLON.Vector3(0, 3, 0);
  ashParticles.minEmitBox = new BABYLON.Vector3(-11, 0, -11);
  ashParticles.maxEmitBox = new BABYLON.Vector3(11, 3, 11);
  ashParticles.color1 = new BABYLON.Color4(0.6, 0.6, 0.65, 0.4);
  ashParticles.color2 = new BABYLON.Color4(0.4, 0.4, 0.5, 0.25);
  ashParticles.colorDead = new BABYLON.Color4(0.3, 0.3, 0.3, 0);
  ashParticles.minSize = 0.03;
  ashParticles.maxSize = 0.08;
  ashParticles.minLifeTime = 4;
  ashParticles.maxLifeTime = 8;
  ashParticles.emitRate = 12;
  ashParticles.gravity = new BABYLON.Vector3(0, -0.15, 0);
  ashParticles.direction1 = new BABYLON.Vector3(-0.1, -0.2, -0.1);
  ashParticles.direction2 = new BABYLON.Vector3(0.1, -0.05, 0.1);
  ashParticles.blendMode = BABYLON.ParticleSystem.BLENDMODE_STANDARD;
  ashParticles.start();

  const brazierPos = new BABYLON.Vector3(0, 1.5, 0);
  WaveManager.init(scene, shadowGen, wraithMat, brazierPos);

  scene.onBeforeRenderObservable.add(() => {
    if (Player.isDead) return;
    const dt = engine.getDeltaTime() / 1000;

    WaveManager.update(
      dt,
      camera.position,
      (dmg) => Player.damageFire(dmg),
      (dmg) => Player.takeDamage(dmg)
    );

    Player.updateAttack(dt, camera, WaveManager.enemies, () => {});
  });

  const pipeline = new BABYLON.DefaultRenderingPipeline('defaultPipeline', true, scene, [camera]);
  pipeline.bloomEnabled = true;
  pipeline.bloomThreshold = 0.55;
  pipeline.bloomWeight = 0.65;
  pipeline.bloomKernel = 48;
  pipeline.fxaaEnabled = true;
  pipeline.imageProcessing.contrast = 1.15;
  pipeline.imageProcessing.exposure = 1.05;
  pipeline.imageProcessing.vignetteEnabled = true;
  pipeline.imageProcessing.vignetteWeight = 2.2;
  pipeline.imageProcessing.vignetteColor = new BABYLON.Color4(0, 0, 0, 1);

  return scene;
}
