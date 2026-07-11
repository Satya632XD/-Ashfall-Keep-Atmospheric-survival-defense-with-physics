// ==========================================================================
// player.js — Player state: health, fire-health, melee combat
// ==========================================================================

const Player = (function () {
  const MAX_HEALTH = 100;
  const MAX_FIRE_HEALTH = 100;

  const ATTACK_RANGE = 2.6;
  const ATTACK_CONE_COS = 0.55;
  const ATTACK_DAMAGE = 34;
  const ATTACK_COOLDOWN = 0.42;

  let health = MAX_HEALTH;
  let fireHealth = MAX_FIRE_HEALTH;
  let attackCooldownT = 0;
  let isDead = false;

  let healthBarEl, fireBarEl, damageFlashEl, gameOverEl, gameOverStatsEl;

  function initDOM() {
    healthBarEl = document.getElementById('healthBarInner');
    fireBarEl = document.getElementById('fireBarInner');
    damageFlashEl = document.getElementById('damageFlash');
    gameOverEl = document.getElementById('gameOverScreen');
    gameOverStatsEl = document.getElementById('gameOverStats');
  }

  function updateBars() {
    if (healthBarEl) healthBarEl.style.width = Math.max(0, (health / MAX_HEALTH) * 100) + '%';
    if (fireBarEl) fireBarEl.style.width = Math.max(0, (fireHealth / MAX_FIRE_HEALTH) * 100) + '%';
  }

  function flashDamage() {
    if (!damageFlashEl) return;
    damageFlashEl.style.transition = 'none';
    damageFlashEl.style.opacity = '1';
    requestAnimationFrame(() => {
      damageFlashEl.style.transition = 'opacity 0.4s ease-out';
      damageFlashEl.style.opacity = '0';
    });
  }

  function takeDamage(amount) {
    if (isDead) return;
    health = Math.max(0, health - amount);
    flashDamage();
    updateBars();
    if (health <= 0) triggerGameOver('slain');
  }

  function damageFire(amount) {
    if (isDead) return;
    fireHealth = Math.max(0, fireHealth - amount);
    updateBars();
    if (fireHealth <= 0) triggerGameOver('fire');
  }

  function triggerGameOver(reason) {
    if (isDead) return;
    isDead = true;
    if (gameOverEl) {
      const waveNum = (window.WaveManager && WaveManager.currentWave) || 1;
      gameOverStatsEl.textContent = reason === 'fire'
        ? `The fire went out on wave ${waveNum}.`
        : `You fell on wave ${waveNum}.`;
      gameOverEl.style.display = 'flex';
    }
  }

  function updateAttack(dt, camera, enemies, onHitCallback) {
    if (attackCooldownT > 0) attackCooldownT -= dt;
    if (isDead) return;

    if (Input.state.actionPressed && attackCooldownT <= 0) {
      attackCooldownT = ATTACK_COOLDOWN;

      const forward = new BABYLON.Vector3(
        Math.sin(camera.rotation.y),
        0,
        Math.cos(camera.rotation.y)
      );

      let hitAny = false;
      for (const enemy of enemies) {
        if (enemy.isDead) continue;
        const toEnemy = enemy.mesh.position.subtract(camera.position);
        toEnemy.y = 0;
        const dist = toEnemy.length();
        if (dist > ATTACK_RANGE || dist < 0.001) continue;

        const dir = toEnemy.normalize();
        const dot = BABYLON.Vector3.Dot(forward, dir);
        if (dot < ATTACK_CONE_COS) continue;

        enemy.takeDamage(ATTACK_DAMAGE, dir);
        hitAny = true;
      }

      if (onHitCallback) onHitCallback(hitAny);
    }
  }

  function reset() {
    health = MAX_HEALTH;
    fireHealth = MAX_FIRE_HEALTH;
    isDead = false;
    attackCooldownT = 0;
    updateBars();
  }

  return {
    init() { initDOM(); updateBars(); },
    takeDamage,
    damageFire,
    updateAttack,
    reset,
    get health() { return health; },
    get fireHealth() { return fireHealth; },
    get isDead() { return isDead; },
    get attackRange() { return ATTACK_RANGE; },
  };
})();
