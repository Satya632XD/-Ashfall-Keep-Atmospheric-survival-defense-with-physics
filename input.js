// ==========================================================================
// input.js — Unified input layer for Ashfall Keep
//
// Exposes a single global `Input` object that both desktop and mobile
// controls feed into. Gameplay code should ONLY read Input.state.
// ==========================================================================

const Input = (function () {
  const state = {
    moveX: 0,
    moveY: 0,
    lookDX: 0,
    lookDY: 0,
    actionPressed: false,
    actionHeld: false,
  };

  let _actionPressedThisFrame = false;
  const isTouchDevice = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;

  const keys = {};
  let pointerLocked = false;

  function setupDesktop(canvas) {
    window.addEventListener('keydown', (e) => { keys[e.code] = true; });
    window.addEventListener('keyup', (e) => { keys[e.code] = false; });

    canvas.addEventListener('click', () => {
      if (!isTouchDevice) canvas.requestPointerLock();
    });

    document.addEventListener('pointerlockchange', () => {
      pointerLocked = document.pointerLockElement === canvas;
    });

    window.addEventListener('mousemove', (e) => {
      if (!pointerLocked) return;
      state.lookDX += e.movementX * 0.0022;
      state.lookDY += e.movementY * 0.0022;
    });

    window.addEventListener('mousedown', (e) => {
      if (e.button === 0) {
        state.actionHeld = true;
        _actionPressedThisFrame = true;
      }
    });
    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) state.actionHeld = false;
    });
  }

  function pollDesktopKeys() {
    let mx = 0, my = 0;
    if (keys['KeyW'] || keys['ArrowUp']) my += 1;
    if (keys['KeyS'] || keys['ArrowDown']) my -= 1;
    if (keys['KeyD'] || keys['ArrowRight']) mx += 1;
    if (keys['KeyA'] || keys['ArrowLeft']) mx -= 1;

    const len = Math.hypot(mx, my);
    if (len > 1) { mx /= len; my /= len; }

    state.moveX = mx;
    state.moveY = my;

    if (keys['Space']) {
      if (!state.actionHeld) _actionPressedThisFrame = true;
      state.actionHeld = true;
    }
  }

  function setupMobile() {
    const joystickZone = document.getElementById('joystickZone');
    const joystickBase = document.getElementById('joystickBase');
    const joystickThumb = document.getElementById('joystickThumb');
    const lookZone = document.getElementById('lookZone');
    const actionBtn = document.getElementById('actionBtn');

    joystickBase.style.display = 'block';
    joystickThumb.style.display = 'block';
    actionBtn.style.display = 'flex';

    const JOY_RADIUS = 50;
    let joyActive = false;
    let joyOriginX = 0, joyOriginY = 0;
    let joyTouchId = null;

    function showBaseAt(x, y) {
      joystickBase.style.left = (x - 50) + 'px';
      joystickBase.style.top = (y - 50) + 'px';
      joystickBase.style.display = 'block';
    }

    joystickZone.addEventListener('touchstart', (e) => {
      const t = e.changedTouches[0];
      joyTouchId = t.identifier;
      joyOriginX = t.clientX;
      joyOriginY = t.clientY;
      showBaseAt(joyOriginX, joyOriginY);
      joyActive = true;
      e.preventDefault();
    }, { passive: false });

    joystickZone.addEventListener('touchmove', (e) => {
      if (!joyActive) return;
      let t = null;
      for (const touch of e.changedTouches) {
        if (touch.identifier === joyTouchId) { t = touch; break; }
      }
      if (!t) return;

      let dx = t.clientX - joyOriginX;
      let dy = t.clientY - joyOriginY;
      const dist = Math.hypot(dx, dy);
      if (dist > JOY_RADIUS) {
        dx = (dx / dist) * JOY_RADIUS;
        dy = (dy / dist) * JOY_RADIUS;
      }

      joystickThumb.style.left = (50 + dx - 23) + 'px';
      joystickThumb.style.top = (50 + dy - 23) + 'px';

      state.moveX = dx / JOY_RADIUS;
      state.moveY = -dy / JOY_RADIUS;

      e.preventDefault();
    }, { passive: false });

    function endJoystick(e) {
      if (!joyActive) return;
      for (const touch of e.changedTouches) {
        if (touch.identifier === joyTouchId) {
          joyActive = false;
          joyTouchId = null;
          joystickThumb.style.left = '27px';
          joystickThumb.style.top = '27px';
          joystickBase.style.display = 'none';
          state.moveX = 0;
          state.moveY = 0;
        }
      }
    }
    joystickZone.addEventListener('touchend', endJoystick);
    joystickZone.addEventListener('touchcancel', endJoystick);

    let lookTouchId = null;
    let lastLookX = 0, lastLookY = 0;

    lookZone.addEventListener('touchstart', (e) => {
      const t = e.changedTouches[0];
      lookTouchId = t.identifier;
      lastLookX = t.clientX;
      lastLookY = t.clientY;
      e.preventDefault();
    }, { passive: false });

    lookZone.addEventListener('touchmove', (e) => {
      let t = null;
      for (const touch of e.changedTouches) {
        if (touch.identifier === lookTouchId) { t = touch; break; }
      }
      if (!t) return;

      const dx = t.clientX - lastLookX;
      const dy = t.clientY - lastLookY;
      lastLookX = t.clientX;
      lastLookY = t.clientY;

      state.lookDX += dx * 0.0032;
      state.lookDY += dy * 0.0032;

      e.preventDefault();
    }, { passive: false });

    lookZone.addEventListener('touchend', (e) => {
      for (const touch of e.changedTouches) {
        if (touch.identifier === lookTouchId) lookTouchId = null;
      }
    });

    actionBtn.addEventListener('touchstart', (e) => {
      state.actionHeld = true;
      _actionPressedThisFrame = true;
      actionBtn.style.transform = 'scale(0.92)';
      e.preventDefault();
    }, { passive: false });

    actionBtn.addEventListener('touchend', (e) => {
      state.actionHeld = false;
      actionBtn.style.transform = 'scale(1)';
      e.preventDefault();
    });
  }

  function init(canvas) {
    setupDesktop(canvas);
    if (isTouchDevice) {
      setupMobile();
      document.getElementById('pcHint').style.display = 'none';
    }
  }

  function update() {
    pollDesktopKeys();
    state.actionPressed = _actionPressedThisFrame;
    _actionPressedThisFrame = false;
  }

  function lateUpdate() {
    state.lookDX = 0;
    state.lookDY = 0;
  }

  return {
    state,
    init,
    update,
    lateUpdate,
    get isTouchDevice() { return isTouchDevice; },
  };
})();
