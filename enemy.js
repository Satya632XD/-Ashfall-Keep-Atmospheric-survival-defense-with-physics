// ==========================================================================
// enemy.js — Wraith enemy AI + WaveManager
// ==========================================================================

class Wraith {
  constructor(scene, shadowGen, wraithMat, spawnPos, braziers) {
    this.scene = scene;
    this.isDead = false;
    this.state = 'CHASE';
    this.speed = 1.6 + Math.random() * 0.5;
    this.attackDamageToFire = 6;
    this.attackDamageToPlayer = 9;
    this.attackCooldown = 0;
    this.attackTickRate = 1.1;
    this.staggerT = 0;
    this.health = 60;
    this.maxHealth = 60;
    this.bobPhase = Math.random() * 10;

    this.target = braziers;

    const core = BABYLON.MeshBuilder.CreateSphere(
      'wraith_core_' + Math.random().toString(36).slice(2),
      { diameterX: 0.55, diameterY: 0.85, diameterZ: 0.55, segments: 8 },
      scene
    );
    core.material = wraithMat;
    core.position.copyFrom(spawnPos);

    const trail = BABYLON.MeshBuilder.CreateCylinder(
      'wraith_trail_' + Math.random().toString(36).slice(2),
      { diameterTop: 0.45, diameterBottom: 0.04, height: 1.1, tessellation: 8 },
      scene
    );
    trail.material = wraithMat;
    trail.parent = core;
    trail.position.y = -0.85;
    trail.rotation.x = Math.PI;

    shadowGen.addShadowCaster(core);

    this.mesh = core;
    this.trail = trail;
  }

  takeDamage(amount, knockbackDir) {
    if (this.isDead) return;
    this.health -= amount;
    this.state = 'STAGGER';
    this.staggerT = 0.28;
    this._knockDir = knockbackDir.scale(3.2);

    this.mesh.material.emissiveColor = new BABYLON.Color3(1, 1, 1);
    setTimeout(() => {
      if (this.mesh && this.mesh.material) {
        this.mesh.material.emissiveColor = new BABYLON.Color3(0.35, 0.55, 0.6);
      }
    }, 90);

    if (this.health <= 0) this.die();
  }

  die() {
    if (this.isDead) return;
    this.isDead = true;
    this.state = 'DEAD';
    this._dieT = 0;
  }

  update(dt, playerPos, onFireDamage, onPlayerDamage) {
    if (!this.mesh) return;

    if (this.state === 'DEAD') {
      this._dieT += dt;
      const s = Math.max(0, 1 - this._dieT * 2.2);
      this.mesh.scaling.setAll(s);
      this.mesh.position.y += dt * 0.6;
      if (this._dieT > 0.5) this._disposed = true;
      return;
    }

    this.bobPhase += dt * 2.2;
    const bobY = Math.sin(this.bobPhase) * 0.12;

    if (this.state === 'STAGGER') {
      this.staggerT -= dt;
      this.mesh.position.addInPlace(this._knockDir.scale(dt));
      this._knockDir = this._knockDir.scale(0.85);
      if (this.staggerT <= 0) this.state = 'CHASE';
      this.mesh.position.y = 1.5 + bobY;
      this.mesh.rotation.y += dt * 1.5;
      return;
    }

    const toTarget = this.target.subtract(this.mesh.position);
    toTarget.y = 0;
    const dist = toTarget.length();

    if (dist > 1.4) {
      const dir = toTarget.normalize();
      this.mesh.position.x += dir.x * this.speed * dt;
      this.mesh.position.z += dir.z * this.speed * dt;
      this.mesh.rotation.y = Math.atan2(dir.x, dir.z);
      this.state = 'CHASE';
    } else {
      this.state = 'ATTACK';
      this.attackCooldown -= dt;
      if (this.attackCooldown <= 0) {
        this.attackCooldown = this.attackTickRate;
        onFireDamage(this.attackDamageToFire);
      }
    }

    this.mesh.position.y = 1.5 + bobY;

    const toPlayer = playerPos.subtract(this.mesh.position);
    toPlayer.y = 0;
    if (toPlayer.length() < 1.1) {
      this.attackCooldown -= dt;
      if (this.attackCooldown <= 0) {
        this.attackCooldown = this.attackTickRate;
        onPlayerDamage(this.attackDamageToPlayer);
      }
    }
  }

  dispose() {
    if (this.trail) this.trail.dispose();
    if (this.mesh) this.mesh.dispose();
    this.mesh = null;
    this.trail = null;
  }
}

const WaveManager = (function () {
  let scene, shadowGen, wraithMat, brazierPos;
  let enemies = [];
  let currentWave = 0;
  let waveActive = false;
  let respiteT = 0;
  const RESPITE_DURATION = 8;

  let waveTitleEl, waveSubEl, waveBannerEl;
  const ARENA_RADIUS = 11.5;

  function init(_scene, _shadowGen, _wraithMat, _brazierPos) {
    scene = _scene;
    shadowGen = _shadowGen;
    wraithMat = _wraithMat;
    brazierPos = _brazierPos;

    waveTitleEl = document.getElementById('waveTitle');
    waveSubEl = document.getElementById('waveSub');
    waveBannerEl = document.getElementById('waveBanner');

    startRespite(2);
  }

  function showBanner(title, sub, duration) {
    waveTitleEl.textContent = title;
    waveSubEl.textContent = sub;
    waveBannerEl.style.opacity = '1';
    setTimeout(() => { waveBannerEl.style.opacity = '0'; }, duration * 1000);
  }

  function startRespite(overrideDuration) {
    waveActive = false;
    respiteT = overrideDuration !== undefined ? overrideDuration : RESPITE_DURATION;
  }

  function spawnWave() {
    currentWave += 1;
    waveActive = true;
    const count = 2 + Math.floor(currentWave * 1.6);

    showBanner('WAVE ' + currentWave, count + ' wraiths approach', 2.4);

    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = ARENA_RADIUS - 0.5;
      const pos = new BABYLON.Vector3(Math.cos(a) * r, 1.5, Math.sin(a) * r);
      setTimeout(() => {
        if (scene && !scene.isDisposed) {
          enemies.push(new Wraith(scene, shadowGen, wraithMat, pos, brazierPos));
        }
      }, i * 350);
    }
  }

  function update(dt, playerPos, onFireDamage, onPlayerDamage) {
    if (!waveActive) {
      respiteT -= dt;
      if (respiteT <= 0) spawnWave();
      return;
    }

    for (const enemy of enemies) {
      enemy.update(dt, playerPos, onFireDamage, onPlayerDamage);
    }

    for (let i = enemies.length - 1; i >= 0; i--) {
      if (enemies[i]._disposed) {
        enemies[i].dispose();
        enemies.splice(i, 1);
      }
    }

    if (enemies.length === 0 && waveActive) {
      waveActive = false;
      startRespite(RESPITE_DURATION);
      showBanner('WAVE ' + currentWave + ' CLEARED', 'the fire endures...', 2.2);
    }
  }

  function reset() {
    for (const e of enemies) e.dispose();
    enemies = [];
    currentWave = 0;
    startRespite(2);
  }

  return {
    init, update, reset,
    get enemies() { return enemies; },
    get currentWave() { return currentWave; },
  };
})();
