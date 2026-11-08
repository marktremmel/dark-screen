/**
 * SÖTÉT KÉPERNYŐ (Dark Screen) - Cross-Platform Touch & Mobile Input Engine
 * Phase 1: Virtual Thumbstick, Camera Look Swipe, Tappable Prompts, Action Buttons & Settings
 */

(function () {
  'use strict';

  // Local storage key for persistent touch settings
  const STORAGE_KEY = 'sk_touch_settings.v1';

  function loadSettings() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    } catch (_) {
      return {};
    }
  }

  function saveSettings(obj) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
    } catch (_) {}
  }

  const stored = loadSettings();

  // Haptic feedback helper
  function vibrate(pattern) {
    if (!SK_TOUCH.hapticsEnabled) return;
    if (window.SK_HAPTICS && typeof window.SK_HAPTICS.vibrate === 'function') {
      window.SK_HAPTICS.vibrate(pattern);
      return;
    }
    if (window.Capacitor?.Plugins?.Haptics) {
      window.Capacitor.Plugins.Haptics.impact({ style: 'LIGHT' }).catch(() => {});
      return;
    }
    if (navigator.vibrate) {
      try { navigator.vibrate(pattern); } catch (_) {}
    }
  }

  // Audio Context unlock helper for mobile web
  function unlockAudio() {
    try {
      if (window.SK_AUDIO && window.SK_AUDIO.resume) window.SK_AUDIO.resume();
    } catch (_) {}
  }

  // Live System Clock & Device Battery Monitor
  const SK_DEVICE = {
    batteryPct: 67,
    isCharging: false,
    async init() {
      // 1. Capacitor native Device plugin (iOS / Android)
      if (window.Capacitor?.Plugins?.Device?.getBatteryInfo) {
        try {
          const info = await window.Capacitor.Plugins.Device.getBatteryInfo();
          if (info && typeof info.batteryLevel === 'number') {
            this.batteryPct = Math.round(info.batteryLevel * 100);
            this.isCharging = !!info.isCharging;
          }
        } catch (_) {}
      } else if (navigator.getBattery) {
        // 2. Web Battery Status API
        try {
          const b = await navigator.getBattery();
          const update = () => {
            this.batteryPct = Math.round(b.level * 100);
            this.isCharging = !!b.charging;
            this.updateAllPhoneBars();
          };
          update();
          b.addEventListener('levelchange', update);
          b.addEventListener('chargingchange', update);
        } catch (_) {}
      }

      this.updateAllPhoneBars();
      // Keep phone screens updated live
      setInterval(() => {
        this.updateAllPhoneBars();
      }, 2000);
    },

    getFormattedTime() {
      const d = new Date();
      return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
    },

    getFormattedBattery() {
      const bars = this.batteryPct > 60 ? '▮▮▮' : this.batteryPct > 25 ? '▮▮' : '▮';
      const icon = this.isCharging ? '⚡ ' : `${bars} `;
      return `${icon}${this.batteryPct}%`;
    },

    updateAllPhoneBars() {
      const timeStr = this.getFormattedTime();
      const battStr = this.getFormattedBattery();

      document.querySelectorAll('.phone .bar, .phone3 .pbar, .phone .pbar').forEach(bar => {
        const spans = bar.querySelectorAll('span');
        if (spans.length >= 2) {
          spans[0].textContent = timeStr;
          spans[1].textContent = battStr;
        }
      });

      const pclock = document.getElementById('pclock');
      if (pclock) pclock.textContent = timeStr;
      const pbatt = document.getElementById('pbatt');
      if (pbatt) pbatt.textContent = battStr;
    }
  };
  window.SK_DEVICE = SK_DEVICE;

  const SK_TOUCH = {
    // Touch engine state
    active: false,
    sensitivity: typeof stored.touchSens === 'number' ? stored.touchSens : 2.0,
    deadzone: 10,
    maxRadius: 60,
    sprintThreshold: 0.82,
    hapticsEnabled: stored.haptics !== false,
    enabledBySetting: stored.touchControls !== false,
    debugMouse: false,
    portraitFov: typeof stored.portraitFov === 'number' ? stored.portraitFov : 95,
    landscapeFov: 70,
    isTablet: false,
    orientationMode: stored.orientationMode || 'auto',

    async setOrientationMode(mode = 'auto') {
      this.orientationMode = mode;
      stored.orientationMode = mode;
      saveSettings(stored);
      if (typeof te !== 'undefined' && te?.settings) {
        te.settings.orientationMode = mode;
        if (typeof _e === 'function') _e();
      }

      try {
        if (mode === 'landscape') {
          if (window.Capacitor?.Plugins?.ScreenOrientation?.lock) {
            await window.Capacitor.Plugins.ScreenOrientation.lock({ orientation: 'landscape' });
          } else if (window.screen?.orientation?.lock) {
            await window.screen.orientation.lock('landscape');
          }
        } else if (mode === 'portrait') {
          if (window.Capacitor?.Plugins?.ScreenOrientation?.lock) {
            await window.Capacitor.Plugins.ScreenOrientation.lock({ orientation: 'portrait' });
          } else if (window.screen?.orientation?.lock) {
            await window.screen.orientation.lock('portrait');
          }
        } else {
          // 'auto' / both ways: unlock orientation
          if (window.Capacitor?.Plugins?.ScreenOrientation?.unlock) {
            await window.Capacitor.Plugins.ScreenOrientation.unlock();
          } else if (window.screen?.orientation?.unlock) {
            window.screen.orientation.unlock();
          }
        }
      } catch (_) {}
      this.updateCameraFov();
    },

    async initOrientation() {
      const isTablet = /iPad/i.test(navigator.userAgent) || 
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) || 
        Math.min(window.screen.width, window.screen.height) >= 600;

      this.isTablet = isTablet;

      // Apply saved orientation preference ('auto' = both ways unlocked, 'landscape', 'portrait')
      const targetMode = stored.orientationMode || (typeof te !== 'undefined' && te?.settings?.orientationMode) || 'auto';
      await this.setOrientationMode(targetMode);
    },

    // Touch tracking
    moveTouchId: null,
    lookTouchId: null,
    baseX: 0,
    baseY: 0,
    lastLookX: 0,
    lastLookY: 0,
    lookStartX: 0,
    lookStartY: 0,
    lookStartTime: 0,

    init() {
      const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
      this.active = this.enabledBySetting && (isTouchDevice || this.debugMouse);

      this.createDOM();
      this.bindTouchEvents();
      this.bindMouseDebugEvents();
      this.bindPromptListener();
      this.bindObjectiveListener();
      this.bindChecklistCollapsible();
      this.bindSettingsObserver();
      this.bindFovListeners();
      this.startLoop();
      SK_DEVICE.init();
      this.initOrientation();

      window.addEventListener('touchstart', () => {
        this.initOrientation();
      }, { once: true, passive: true });

      console.log('[SK_TOUCH] Initialized. Touch device:', isTouchDevice, 'Active:', this.active, 'Tablet:', this.isTablet);
    },

    enable(force) {
      this.active = !!force;
      this.debugMouse = !!force;
      this.enabledBySetting = !!force;
      stored.touchControls = this.enabledBySetting;
      saveSettings(stored);
      console.log('[SK_TOUCH] Active state changed to:', this.active);
    },

    setKey(code, isPressed) {
      if (!window.SK_INPUT) return;
      if (isPressed) {
        if (!window.SK_INPUT.keys[code]) {
          window.SK_INPUT.pressed[code] = true;
        }
        window.SK_INPUT.keys[code] = true;
      } else {
        window.SK_INPUT.keys[code] = false;
      }
    },

    triggerAction(code) {
      if (!window.SK_INPUT) return;
      window.SK_INPUT.pressed[code] = true;
      window.SK_INPUT.keys[code] = true;
      if (code === 'KeyQ') {
        const scene = window.SK_GAME?.scene;
        if (scene && typeof scene.toggleLens === 'function') {
          vibrate(35); // tactile confirmation for Badger lens toggle
        } else {
          vibrate(20);
        }
      } else {
        vibrate(15);
      }
      setTimeout(() => {
        if (window.SK_INPUT) window.SK_INPUT.keys[code] = false;
      }, 100);
    },

    createDOM() {
      if (document.getElementById('touch-root')) return;

      const root = document.createElement('div');
      root.id = 'touch-root';
      root.innerHTML = `
        <div id="touch-joy-zone">
          <div id="touch-joy-anchor"></div>
          <div id="touch-joy-base">
            <div id="touch-joy-knob"></div>
          </div>
        </div>
        <div id="touch-look-zone"></div>
        <div id="touch-actions">
          <div id="touch-satellites">
            <button id="touch-btn-torch" class="touch-btn touch-btn-sub" title="Flashlight (F)" aria-label="Flashlight">🔦</button>
            <button id="touch-btn-app" class="touch-btn touch-btn-sub" title="Open App (Tab)" aria-label="Open App">📱</button>
            <button id="touch-btn-rotate" class="touch-btn touch-btn-sub" title="Rotate (R)" aria-label="Rotate">🔄</button>
            <button id="touch-btn-scale-down" class="touch-btn touch-btn-sub" title="Smaller (Z)" aria-label="Smaller">➖</button>
            <button id="touch-btn-scale-up" class="touch-btn touch-btn-sub" title="Bigger (C)" aria-label="Bigger">➕</button>
            <button id="touch-btn-drop" class="touch-btn touch-btn-sub" title="Action (Q)" aria-label="Action (Q)">🥽</button>
            <button id="touch-btn-hood" class="touch-btn touch-btn-sub" title="Hood (H)" aria-label="Hood">🧢</button>
          </div>
          <button id="touch-btn-use" class="touch-btn touch-btn-modern" title="Interact / Use (E)" aria-label="Interact">
            <div class="use-btn-bezel"></div>
            <div class="use-btn-core">
              <svg class="use-icon-glyph" viewBox="0 0 48 48" fill="none" aria-hidden="true">
                <circle cx="24" cy="24" r="21" class="glyph-ring-outer" stroke="currentColor" stroke-width="1.8" stroke-dasharray="6 3" />
                <circle cx="24" cy="24" r="14" class="glyph-ring-inner" stroke="currentColor" stroke-width="1.4" />
                <path d="M24 6 V12 M24 36 V42 M6 24 H12 M36 24 H42" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
                <polygon points="24,18 29,24 24,30 19,24" class="glyph-center" fill="currentColor" />
              </svg>
              <div class="use-btn-text">
                <span class="use-text-main">USE</span>
                <span class="use-text-key">[E]</span>
              </div>
            </div>
          </button>
        </div>
        <button id="touch-pause-btn" class="touch-btn" title="Pause Menu (Esc)" aria-label="Pause Menu">
          <span class="icon">❚❚</span>
        </button>
      `;

      document.body.appendChild(root);

      this.els = {
        root: root,
        joyZone: document.getElementById('touch-joy-zone'),
        joyAnchor: document.getElementById('touch-joy-anchor'),
        joyBase: document.getElementById('touch-joy-base'),
        joyKnob: document.getElementById('touch-joy-knob'),
        lookZone: document.getElementById('touch-look-zone'),
        actions: document.getElementById('touch-actions'),
        btnUse: document.getElementById('touch-btn-use'),
        btnTorch: document.getElementById('touch-btn-torch'),
        btnApp: document.getElementById('touch-btn-app'),
        btnRotate: document.getElementById('touch-btn-rotate'),
        btnScaleDown: document.getElementById('touch-btn-scale-down'),
        btnScaleUp: document.getElementById('touch-btn-scale-up'),
        btnDrop: document.getElementById('touch-btn-drop'),
        btnQ: document.getElementById('touch-btn-drop'),
        btnHood: document.getElementById('touch-btn-hood'),
        btnPause: document.getElementById('touch-pause-btn'),
      };
    },

    bindTouchEvents() {
      const { joyZone, lookZone, btnUse, btnTorch, btnApp, btnRotate, btnScaleDown, btnScaleUp, btnDrop, btnHood, btnPause } = this.els;

      // Prevent default gestures (scrolling/pinch-zoom) on touch zones
      [joyZone, lookZone].forEach(zone => {
        zone.addEventListener('touchstart', (e) => { e.preventDefault(); unlockAudio(); }, { passive: false });
        zone.addEventListener('touchmove', (e) => { e.preventDefault(); }, { passive: false });
      });

      // Joystick touch start
      joyZone.addEventListener('touchstart', (e) => {
        if (e.target && (e.target.closest('#checklist') || e.target.closest('#objective') || e.target.closest('#touch-actions') || e.target.closest('#touch-pause-btn'))) return;
        if (this.moveTouchId !== null) return;
        const touch = e.changedTouches[0];
        this.moveTouchId = touch.identifier;
        this.baseX = touch.clientX;
        this.baseY = touch.clientY;

        this.els.joyBase.style.left = `${this.baseX}px`;
        this.els.joyBase.style.top = `${this.baseY}px`;
        this.els.joyBase.classList.add('visible');
        if (this.els.joyAnchor) this.els.joyAnchor.classList.add('hidden');
      });

      // Unified touch move for movement and camera look
      window.addEventListener('touchmove', (e) => {
        // 1. Process movement joystick
        if (this.moveTouchId !== null) {
          for (let i = 0; i < e.changedTouches.length; i++) {
            const touch = e.changedTouches[i];
            if (touch.identifier === this.moveTouchId) {
              const dx = touch.clientX - this.baseX;
              const dy = touch.clientY - this.baseY;
              const dist = Math.hypot(dx, dy);

              const clampedDist = Math.min(dist, this.maxRadius);
              const angle = Math.atan2(dy, dx);
              const knobX = Math.cos(angle) * clampedDist;
              const knobY = Math.sin(angle) * clampedDist;
              this.els.joyKnob.style.transform = `translate(${knobX}px, ${knobY}px)`;

              if (dist < this.deadzone) {
                this.setKey('KeyW', false);
                this.setKey('KeyS', false);
                this.setKey('KeyA', false);
                this.setKey('KeyD', false);
                this.setKey('ShiftLeft', false);
                this.els.joyBase.classList.remove('sprint');
              } else {
                const nx = dx / dist;
                const ny = dy / dist;
                const THRESH = 0.38;

                this.setKey('KeyW', ny < -THRESH);
                this.setKey('KeyS', ny > THRESH);
                this.setKey('KeyA', nx < -THRESH);
                this.setKey('KeyD', nx > THRESH);

                const isSprint = dist >= (this.maxRadius * this.sprintThreshold);
                this.setKey('ShiftLeft', isSprint);
                this.els.joyBase.classList.toggle('sprint', isSprint);
              }
              break;
            }
          }
        }

        // 2. Process camera look swipe
        if (this.lookTouchId !== null) {
          for (let i = 0; i < e.changedTouches.length; i++) {
            const touch = e.changedTouches[i];
            if (touch.identifier === this.lookTouchId) {
              const deltaX = touch.clientX - this.lastLookX;
              const deltaY = touch.clientY - this.lastLookY;

              if (window.SK_INPUT) {
                window.SK_INPUT.mdx += deltaX * this.sensitivity;
                window.SK_INPUT.mdy += deltaY * this.sensitivity;
              }

              this.lastLookX = touch.clientX;
              this.lastLookY = touch.clientY;
              break;
            }
          }
        }
      }, { passive: false });

      const handleTouchEnd = (e) => {
        for (let i = 0; i < e.changedTouches.length; i++) {
          const touch = e.changedTouches[i];

          // Joystick release
          if (touch.identifier === this.moveTouchId) {
            this.moveTouchId = null;
            this.setKey('KeyW', false);
            this.setKey('KeyS', false);
            this.setKey('KeyA', false);
            this.setKey('KeyD', false);
            this.setKey('ShiftLeft', false);

            this.els.joyKnob.style.transform = 'translate(0, 0)';
            this.els.joyBase.classList.remove('visible', 'sprint');
            if (this.els.joyAnchor) this.els.joyAnchor.classList.remove('hidden');
          }

          // Look swipe release / Tap detection
          if (touch.identifier === this.lookTouchId) {
            const elapsed = performance.now() - this.lookStartTime;
            const dist = Math.hypot(touch.clientX - this.lookStartX, touch.clientY - this.lookStartY);

            // Quick tap on right zone triggers interact if prompt is active
            if (elapsed < 240 && dist < 12) {
              const prompt = document.getElementById('prompt');
              if (prompt && prompt.classList.contains('on')) {
                this.triggerAction('KeyE');
              }
            }
            this.lookTouchId = null;
          }
        }
      };

      window.addEventListener('touchend', handleTouchEnd);
      window.addEventListener('touchcancel', handleTouchEnd);

      // Look zone touch start
      lookZone.addEventListener('touchstart', (e) => {
        if (this.lookTouchId !== null) return;
        const touch = e.changedTouches[0];
        this.lookTouchId = touch.identifier;
        this.lastLookX = touch.clientX;
        this.lastLookY = touch.clientY;
        this.lookStartX = touch.clientX;
        this.lookStartY = touch.clientY;
        this.lookStartTime = performance.now();
      });

      // Action button listeners (supports static code or dynamic getter function)
      const attachAction = (el, getCode) => {
        if (!el) return;
        const trigger = (e) => {
          e.preventDefault();
          e.stopPropagation();
          unlockAudio();
          el.classList.add('pressed');
          const code = typeof getCode === 'function' ? getCode() : getCode;
          if (code) {
            this.triggerAction(code);
          }
          setTimeout(() => el.classList.remove('pressed'), 120);
        };
        el.addEventListener('touchstart', trigger, { passive: false });
        el.addEventListener('mousedown', trigger);
      };

      attachAction(btnUse, 'KeyE');
      attachAction(btnTorch, 'KeyF');
      attachAction(btnApp, () => {
        const scene = window.SK_GAME?.scene;
        if (scene && typeof scene.readPhone === 'function' && scene.st?.phone) {
          return 'KeyP'; // Read phone messages in school gym
        }
        return 'Tab'; // Open App in Episode 2
      });
      attachAction(btnRotate, 'KeyR');
      attachAction(btnScaleDown, 'KeyZ');
      attachAction(btnScaleUp, 'KeyC');
      attachAction(btnDrop, () => {
        const scene = window.SK_GAME?.scene;
        if (scene?.placing) {
          return 'KeyX'; // Cancel furniture placement in Room 214
        }
        return 'KeyQ'; // Toggles Badger Lens in Zone 2 / drops carried item / moves furniture
      });
      attachAction(btnHood, 'KeyH');

      // Pause menu button listener
      const triggerPause = (e) => {
        e.preventDefault();
        e.stopPropagation();
        unlockAudio();
        vibrate(20);
        if (window.SK_GAME && typeof window.SK_GAME.openPause === 'function') {
          window.SK_GAME.openPause();
        } else {
          window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape', key: 'Escape', bubbles: true }));
        }
      };
      btnPause.addEventListener('touchstart', triggerPause, { passive: false });
      btnPause.addEventListener('mousedown', triggerPause);
    },

    // Mouse fallback for desktop development and debugging
    bindMouseDebugEvents() {
      let isMouseDownJoy = false;
      let isMouseDownLook = false;

      this.els.joyZone.addEventListener('mousedown', (e) => {
        if (!this.debugMouse) return;
        isMouseDownJoy = true;
        this.baseX = e.clientX;
        this.baseY = e.clientY;
        this.els.joyBase.style.left = `${this.baseX}px`;
        this.els.joyBase.style.top = `${this.baseY}px`;
        this.els.joyBase.classList.add('visible');
        if (this.els.joyAnchor) this.els.joyAnchor.classList.add('hidden');
      });

      this.els.lookZone.addEventListener('mousedown', (e) => {
        if (!this.debugMouse) return;
        isMouseDownLook = true;
        this.lastLookX = e.clientX;
        this.lastLookY = e.clientY;
        this.lookStartX = e.clientX;
        this.lookStartY = e.clientY;
        this.lookStartTime = performance.now();
      });

      window.addEventListener('mousemove', (e) => {
        if (isMouseDownJoy) {
          const dx = e.clientX - this.baseX;
          const dy = e.clientY - this.baseY;
          const dist = Math.hypot(dx, dy);
          const clampedDist = Math.min(dist, this.maxRadius);
          const angle = Math.atan2(dy, dx);
          const knobX = Math.cos(angle) * clampedDist;
          const knobY = Math.sin(angle) * clampedDist;
          this.els.joyKnob.style.transform = `translate(${knobX}px, ${knobY}px)`;

          if (dist < this.deadzone) {
            this.setKey('KeyW', false);
            this.setKey('KeyS', false);
            this.setKey('KeyA', false);
            this.setKey('KeyD', false);
            this.setKey('ShiftLeft', false);
            this.els.joyBase.classList.remove('sprint');
          } else {
            const nx = dx / dist;
            const ny = dy / dist;
            const THRESH = 0.38;
            this.setKey('KeyW', ny < -THRESH);
            this.setKey('KeyS', ny > THRESH);
            this.setKey('KeyA', nx < -THRESH);
            this.setKey('KeyD', nx > THRESH);

            const isSprint = dist >= (this.maxRadius * this.sprintThreshold);
            this.setKey('ShiftLeft', isSprint);
            this.els.joyBase.classList.toggle('sprint', isSprint);
          }
        }

        if (isMouseDownLook) {
          const deltaX = e.clientX - this.lastLookX;
          const deltaY = e.clientY - this.lastLookY;
          if (window.SK_INPUT) {
            window.SK_INPUT.mdx += deltaX * this.sensitivity;
            window.SK_INPUT.mdy += deltaY * this.sensitivity;
          }
          this.lastLookX = e.clientX;
          this.lastLookY = e.clientY;
        }
      });

      window.addEventListener('mouseup', (e) => {
        if (isMouseDownJoy) {
          isMouseDownJoy = false;
          this.setKey('KeyW', false);
          this.setKey('KeyS', false);
          this.setKey('KeyA', false);
          this.setKey('KeyD', false);
          this.setKey('ShiftLeft', false);
          this.els.joyKnob.style.transform = 'translate(0, 0)';
          this.els.joyBase.classList.remove('visible', 'sprint');
          if (this.els.joyAnchor) this.els.joyAnchor.classList.remove('hidden');
        }

        if (isMouseDownLook) {
          isMouseDownLook = false;
          const elapsed = performance.now() - this.lookStartTime;
          const dist = Math.hypot(e.clientX - this.lookStartX, e.clientY - this.lookStartY);
          if (elapsed < 240 && dist < 12) {
            const prompt = document.getElementById('prompt');
            if (prompt && prompt.classList.contains('on')) {
              this.triggerAction('KeyE');
            }
          }
        }
      });
    },

    // Make the existing on-screen #prompt badge directly tappable
    bindPromptListener() {
      const promptEl = document.getElementById('prompt');
      if (!promptEl) return;

      const onPromptTrigger = (e) => {
        e.preventDefault();
        e.stopPropagation();
        unlockAudio();
        promptEl.classList.add('touched');
        this.triggerAction('KeyE');
        setTimeout(() => promptEl.classList.remove('touched'), 150);
      };

      promptEl.addEventListener('touchstart', onPromptTrigger, { passive: false });
      promptEl.addEventListener('mousedown', onPromptTrigger);
    },

    // Make objective badge directly tappable if it indicates an action like (Q) or (P)
    bindObjectiveListener() {
      const objEl = document.getElementById('objective');
      if (!objEl || objEl._skActionBound) return;
      objEl._skActionBound = true;

      const onObjectiveTrigger = (e) => {
        const txt = objEl.textContent || '';
        if (/[\(\s\[]Q[\)\:\s\]]/i.test(txt) || /badger\s+lens/i.test(txt)) {
          e.preventDefault();
          e.stopPropagation();
          unlockAudio();
          this.triggerAction('KeyQ');
        } else if (/[\(\s\[]P[\)\:\s\]]/i.test(txt) || /read the phone/i.test(txt)) {
          e.preventDefault();
          e.stopPropagation();
          unlockAudio();
          this.triggerAction('KeyP');
        }
      };

      objEl.addEventListener('touchstart', onObjectiveTrigger, { passive: false });
      objEl.addEventListener('mousedown', onObjectiveTrigger);
    },

    // Make #checklist collapsible by tapping it (frees up screen space in stairwell & corridors)
    bindChecklistCollapsible() {
      const checklist = document.getElementById('checklist');
      if (!checklist || checklist._skCollapsibleBound) return;
      checklist._skCollapsibleBound = true;

      let lastToggle = 0;
      const toggleCollapse = (e) => {
        if (e) {
          e.preventDefault();
          e.stopPropagation();
        }
        const now = Date.now();
        if (now - lastToggle < 350) return;
        lastToggle = now;

        checklist.classList.toggle('sk-checklist-collapsed');
        vibrate(15);
      };

      checklist.addEventListener('click', toggleCollapse);
      checklist.addEventListener('touchend', toggleCollapse, { passive: false });
    },

    // Bind window resize & orientation change to dynamically maintain camera FOV
    bindFovListeners() {
      const apply = () => this.updateCameraFov();
      window.addEventListener('resize', apply, { passive: true });
      window.addEventListener('orientationchange', apply, { passive: true });
    },

    updateCameraFov() {
      const g = window.SK_GAME;
      const cam = g?.camera || g?.scene?.G?.camera;
      if (!cam) return;

      const isPortrait = window.innerWidth < window.innerHeight;
      const targetFov = isPortrait ? (this.portraitFov || 95) : (this.landscapeFov || 70);

      if (Math.abs(cam.fov - targetFov) > 0.5) {
        cam.fov = targetFov;
        cam.updateProjectionMatrix();
        if (g.scene?.vmCam) {
          g.scene.vmCam.fov = isPortrait ? Math.min(80, targetFov * 0.85) : 62;
          g.scene.vmCam.updateProjectionMatrix();
        }
      }
    },

    // Seamlessly inject Touch Controls options into the in-game Settings panel
    bindSettingsObserver() {
      const overlay = document.getElementById('overlay');
      if (!overlay) return;

      const updateOverlayState = () => {
        const hasOverlay = !!(overlay && Array.from(overlay.children).some(child => {
          if (!child || child.nodeType !== 1) return false;
          try {
            const style = window.getComputedStyle(child);
            return style.display !== 'none' && style.visibility !== 'hidden' && (child.offsetWidth > 0 || child.offsetHeight > 0 || child.children.length > 0);
          } catch (_) {
            return child.offsetWidth > 0 || child.offsetHeight > 0;
          }
        }));
        document.body.classList.toggle('has-screen-overlay', hasOverlay);
        document.body.classList.toggle('in-menu', hasOverlay);

        const crosshair = document.getElementById('crosshair');
        if (crosshair) {
          if (hasOverlay) {
            crosshair.style.setProperty('display', 'none', 'important');
            crosshair.style.setProperty('opacity', '0', 'important');
            crosshair.style.setProperty('visibility', 'hidden', 'important');
          } else {
            crosshair.style.removeProperty('display');
            crosshair.style.removeProperty('opacity');
            crosshair.style.removeProperty('visibility');
          }
        }

        const hud = document.getElementById('hud');
        if (hud) {
          hud.classList.toggle('overlay-hidden', hasOverlay);
        }

        for (const child of overlay.children) {
          const panel = child.classList.contains('panel') ? child : child.querySelector('.panel');
          if (!panel) continue;

          // Attach sleek top-right close button if missing. v1.4: only on panels that have a real Close / OK / Continue
          // button; on a dialogue it used to click the first answer (a choice the player never made).
          if (!panel.querySelector('.panel-close-btn') && panel.querySelector('#x, #ok, #r')) {
            const closeBtn = document.createElement('button');
            closeBtn.className = 'panel-close-btn';
            closeBtn.type = 'button';
            closeBtn.setAttribute('aria-label', 'Close dialog');
            closeBtn.innerHTML = `
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            `;
            closeBtn.onclick = (e) => {
              e.preventDefault();
              e.stopPropagation();
              vibrate(15);
              const doneBtn = panel.querySelector('#x, #ok, #r');
              if (doneBtn) {
                doneBtn.click();
              } else {
                child.remove();
              }
            };
            panel.appendChild(closeBtn);
          }

          const h2 = panel.querySelector('h2');
          if (h2 && /Settings/i.test(h2.textContent)) {
            this.injectSettingsUI(panel);
          }
        }
      };

      const observer = new MutationObserver(updateOverlayState);
      observer.observe(overlay, { childList: true, subtree: true });
      updateOverlayState();
    },

    injectSettingsUI(panel) {
      if (panel.querySelector('.sk-touch-settings-row')) return;

      const btns = panel.querySelector('.btns');
      if (!btns) return;

      // Tag all settings rows with specific layout classes
      panel.querySelectorAll('.setting').forEach(row => {
        if (row.querySelector('input[type="range"]')) {
          row.classList.add('setting-range');
        } else if (row.querySelector('.toggle')) {
          row.classList.add('setting-toggle');
        } else {
          row.classList.add('setting-other');
        }
      });

      // Insert section headers for base settings if not already present
      if (!panel.querySelector('.sk-settings-header')) {
        const quietRow = panel.querySelector('.toggle[data-k="quiet"]')?.closest('.setting');
        if (quietRow) {
          const hdr = document.createElement('div');
          hdr.className = 'sk-settings-header';
          hdr.innerHTML = '<span>🎮 Game & Visuals</span>';
          quietRow.parentNode.insertBefore(hdr, quietRow);
        }

        const audioRow = panel.querySelector('input[data-k="master"]')?.closest('.setting');
        if (audioRow) {
          const hdr = document.createElement('div');
          hdr.className = 'sk-settings-header';
          hdr.innerHTML = '<span>🔊 Audio & Sound</span>';
          audioRow.parentNode.insertBefore(hdr, audioRow);
        }

        const retroRow = panel.querySelector('.toggle[data-k="subs"]')?.closest('.setting') || 
                         panel.querySelector('.toggle[data-k="sharp"]')?.closest('.setting');
        if (retroRow) {
          const hdr = document.createElement('div');
          hdr.className = 'sk-settings-header';
          hdr.innerHTML = '<span>📺 Atmosphere & Effects</span>';
          retroRow.parentNode.insertBefore(hdr, retroRow);
        }
      }

      const container = document.createElement('div');
      container.className = 'sk-touch-settings-row';
      container.innerHTML = `
        <div class="sk-settings-header">
          <span>📱 Touch Controls (Mobil vezérlés)</span>
        </div>
        <div class="setting setting-toggle">
          <div>Touch controls<div class="d">Show on-screen virtual thumbstick and action buttons.</div></div>
          <div><div id="sk-toggle-touch" class="toggle ${this.enabledBySetting ? 'on' : ''}" role="switch" tabindex="0"></div></div>
        </div>
        <div class="setting setting-range">
          <div>Touch swipe speed<div class="d">Sensitivity for camera look swipe.</div></div>
          <div><input id="sk-range-sens" type="range" min="0.8" max="4.0" step="0.1" value="${this.sensitivity}"></div>
        </div>
        <div class="setting setting-range">
          <div>Portrait Field of View (FOV)<div class="d">Camera angle in vertical orientation (<span id="sk-fov-val">${this.portraitFov}</span>°).</div></div>
          <div><input id="sk-range-fov" type="range" min="65" max="115" step="1" value="${this.portraitFov}"></div>
        </div>
        <div class="setting setting-toggle">
          <div>Vibration & Haptics<div class="d">Haptic feedback on button presses and interactions.</div></div>
          <div><div id="sk-toggle-haptics" class="toggle ${this.hapticsEnabled ? 'on' : ''}" role="switch" tabindex="0"></div></div>
        </div>
        <div class="setting setting-other">
          <div>Képernyő tájolás (Orientation)<div class="d">Tájolási mód: <span id="sk-orient-val">${this.getOrientationLabel(this.orientationMode)}</span>.</div></div>
          <div><button id="sk-btn-orient-cycle" class="btn small" type="button">${this.getOrientationLabel(this.orientationMode)}</button></div>
        </div>
      `;

      btns.parentNode.insertBefore(container, btns);

      // Wire up injected settings controls
      const touchToggle = container.querySelector('#sk-toggle-touch');
      touchToggle.onclick = () => {
        this.enabledBySetting = !this.enabledBySetting;
        this.active = this.enabledBySetting;
        touchToggle.classList.toggle('on', this.enabledBySetting);
        stored.touchControls = this.enabledBySetting;
        saveSettings(stored);
        vibrate(15);
      };

      const sensRange = container.querySelector('#sk-range-sens');
      sensRange.oninput = () => {
        this.sensitivity = parseFloat(sensRange.value);
        stored.touchSens = this.sensitivity;
        saveSettings(stored);
      };

      const fovRange = container.querySelector('#sk-range-fov');
      const fovVal = container.querySelector('#sk-fov-val');
      if (fovRange) {
        fovRange.oninput = () => {
          this.portraitFov = parseInt(fovRange.value, 10);
          if (fovVal) fovVal.textContent = this.portraitFov;
          stored.portraitFov = this.portraitFov;
          saveSettings(stored);
          this.updateCameraFov();
        };
      }

      const hapticsToggle = container.querySelector('#sk-toggle-haptics');
      hapticsToggle.onclick = () => {
        this.hapticsEnabled = !this.hapticsEnabled;
        hapticsToggle.classList.toggle('on', this.hapticsEnabled);
        stored.haptics = this.hapticsEnabled;
        saveSettings(stored);
        vibrate(25);
      };

      const orientBtn = container.querySelector('#sk-btn-orient-cycle');
      const orientVal = container.querySelector('#sk-orient-val');
      if (orientBtn) {
        orientBtn.onclick = async () => {
          const modes = ['auto', 'landscape', 'portrait'];
          const nextIdx = (modes.indexOf(this.orientationMode) + 1) % modes.length;
          const nextMode = modes[nextIdx];
          await this.setOrientationMode(nextMode);
          const lbl = this.getOrientationLabel(nextMode);
          orientBtn.textContent = lbl;
          if (orientVal) orientVal.textContent = lbl;
          vibrate(15);
        };
      }
    },

    getOrientationLabel(mode) {
      if (mode === 'landscape') return '↔️ Fekvő (Landscape)';
      if (mode === 'portrait') return '📱 Álló (Portrait)';
      return '📱↔️ Mindkettő (Auto)';
    },

    // Main animation and visibility evaluation loop
    startLoop() {
      const raf = (typeof window !== 'undefined' && window.requestAnimationFrame) ? window.requestAnimationFrame.bind(window) : (cb => setTimeout(cb, 16));
      const tick = () => {
        this.updateCameraFov();
        this.updateState();
        raf(tick);
      };
      raf(tick);
    },

    updateState() {
      const g = window.SK_GAME;
      const overlay = document.getElementById('overlay');
      const hasOverlay = !!(overlay && Array.from(overlay.children).some(child => {
        if (!child || child.nodeType !== 1) return false;
        try {
          const style = window.getComputedStyle(child);
          return style.display !== 'none' && style.visibility !== 'hidden' && (child.offsetWidth > 0 || child.offsetHeight > 0 || child.children.length > 0);
        } catch (_) {
          return child.offsetWidth > 0 || child.offsetHeight > 0;
        }
      }));
      const isPaused = (typeof te !== 'undefined' && te && te.paused) || false;
      document.body.classList.toggle('has-screen-overlay', !!hasOverlay);
      document.body.classList.toggle('in-menu', !!hasOverlay);
      document.body.classList.toggle('paused', isPaused);

      const fade = document.getElementById('fade');
      const isFade = fade && fade.classList.contains('on');
      const loading = document.getElementById('loading');
      const isLoading = loading && loading.style.display !== 'none' && !loading.classList.contains('hidden');
      const hud = document.getElementById('hud');
      const isHudHidden = hud && hud.classList.contains('hidden');

      const is3D = !!(g && g.scene && g.scene.player && g.scene.playing);
      const is2DScene = !!(g && g.scene && !g.scene.player && g.scene.playing);

      const shouldShow3DHUD = this.active && is3D && !hasOverlay && !isFade && !isLoading && !isHudHidden && !isPaused;
      const shouldShowPauseBtn = (is3D || is2DScene) && !hasOverlay && !isFade && !isLoading;

      // Ensure crosshair (looking cursor) is strictly hidden whenever in a menu, paused, or non-3D
      const crosshair = document.getElementById('crosshair');
      if (crosshair) {
        const shouldHideCrosshair = hasOverlay || isPaused || !is3D || isFade || isLoading || isHudHidden;
        if (shouldHideCrosshair) {
          if (crosshair.style.display !== 'none') {
            crosshair.style.setProperty('display', 'none', 'important');
            crosshair.style.setProperty('opacity', '0', 'important');
            crosshair.style.setProperty('visibility', 'hidden', 'important');
          }
        } else {
          if (crosshair.style.display === 'none') {
            crosshair.style.removeProperty('display');
            crosshair.style.removeProperty('opacity');
            crosshair.style.removeProperty('visibility');
          }
        }
      }

      if (hud) {
        hud.classList.toggle('overlay-hidden', !!hasOverlay || isPaused);
      }

      // Keep window.SK_INPUT.locked true during active touch gameplay
      if (this.active && window.SK_INPUT) {
        if (shouldShow3DHUD) {
          window.SK_INPUT.locked = true;
        } else if (hasOverlay) {
          window.SK_INPUT.locked = false;
        }
      }

      if (this.els.root) {
        this.els.root.classList.toggle('active', shouldShow3DHUD);
      }

      // Keep Pause button accessible in both 3D and 2D scenes
      if (this.els.btnPause) {
        this.els.btnPause.style.display = shouldShowPauseBtn ? 'flex' : 'none';
      }

      if (!shouldShow3DHUD) {
        if (hasOverlay || isPaused) {
          const promptEl = document.getElementById('prompt');
          if (promptEl) promptEl.classList.remove('on');
        }
        return;
      }

      // --- Contextual Button Updates ---
      const promptEl = document.getElementById('prompt');
      const isPromptOn = promptEl && promptEl.classList.contains('on');

      if (this.els.btnUse) {
        this.els.btnUse.classList.toggle('ready', isPromptOn);
      }

      const scene = g.scene;

      // Torch button
      if (this.els.btnTorch) {
        const hasTorch = !!scene.hasFlash;
        this.els.btnTorch.classList.toggle('visible', hasTorch);
        this.els.btnTorch.classList.toggle('active-torch', !!scene.flashOn);
      }

      // App / Phone button (Episode 2 / Episode 7)
      if (this.els.btnApp) {
        const hasApp = typeof scene.openApp === 'function';
        const hasPhone = typeof scene.readPhone === 'function' && !!(scene.st && scene.st.phone);
        const isPhoneVisible = hasApp || hasPhone;
        this.els.btnApp.classList.toggle('visible', isPhoneVisible);
        if (hasPhone) {
          this.els.btnApp.title = 'Read Phone (P)';
          this.els.btnApp.setAttribute('aria-label', 'Read Phone (P)');
          const unread = scene.msgs && scene.st && (scene.st.sorted < scene.msgs.length);
          this.els.btnApp.classList.toggle('has-unread', !!unread);
        } else if (hasApp) {
          this.els.btnApp.title = 'Open App (Tab)';
          this.els.btnApp.setAttribute('aria-label', 'Open App (Tab)');
          this.els.btnApp.classList.remove('has-unread');
        }
      }

      // Rotate button
      if (this.els.btnRotate) {
        const canRotate = !!scene.placing;
        this.els.btnRotate.classList.toggle('visible', canRotate);
      }

      // Poster & Sticker Scale buttons (Z / C)
      if (this.els.btnScaleDown && this.els.btnScaleUp) {
        const canScale = !!(scene.placing && scene.placing.item && scene.placing.item.kind === 'wall');
        this.els.btnScaleDown.classList.toggle('visible', canScale);
        this.els.btnScaleUp.classList.toggle('visible', canScale);
      }

      // Action Satellite: Q (Badger Lens / Drop Item / Pick Up Furniture / Cancel Placement)
      if (this.els.btnDrop) {
        const isCarrying = !!(scene.st && scene.st.carrying);
        const hasLens = typeof scene.toggleLens === 'function' || !!(scene.trackers && scene.trackers.length);
        const isLensZone = hasLens && (scene.st?.zone >= 2 || (scene.trackers && scene.trackersLeft && scene.trackersLeft() > 0));
        const isPlacing = !!scene.placing;
        const canPickUpPlaced = !isPlacing && !!(scene.placed && scene.placed.length);

        // Fallback: Check if objective, hud or prompt mentions Q or Badger Lens
        const objText = (document.getElementById('objective')?.textContent || '') + ' ' +
                        (document.getElementById('prompt')?.textContent || '') + ' ' +
                        (document.getElementById('hud')?.textContent || '');
        const mentionsQ = /[\(\s\[]Q[\)\:\s\]]/i.test(objText) || /badger\s+lens/i.test(objText) || /trackers?/i.test(objText);

        if (isLensZone || (hasLens && mentionsQ)) {
          this.els.btnDrop.classList.add('visible');
          this.els.btnDrop.innerHTML = '🥽';
          this.els.btnDrop.title = scene.lensOn ? 'Turn Off Badger Lens (Q)' : 'Badger Lens: See Trackers (Q)';
          this.els.btnDrop.setAttribute('aria-label', this.els.btnDrop.title);
          this.els.btnDrop.classList.toggle('active-lens', !!scene.lensOn);
        } else if (isPlacing) {
          // In furniture placement mode, cancels placement
          this.els.btnDrop.classList.add('visible');
          this.els.btnDrop.innerHTML = '✕';
          this.els.btnDrop.title = 'Cancel Placement (X)';
          this.els.btnDrop.setAttribute('aria-label', 'Cancel Placement');
          this.els.btnDrop.classList.remove('active-lens');
        } else if (canPickUpPlaced) {
          this.els.btnDrop.classList.add('visible');
          this.els.btnDrop.innerHTML = '↔️';
          this.els.btnDrop.title = 'Move Furniture (Q)';
          this.els.btnDrop.setAttribute('aria-label', 'Move Furniture');
          this.els.btnDrop.classList.remove('active-lens');
        } else if (isCarrying) {
          this.els.btnDrop.classList.add('visible');
          this.els.btnDrop.innerHTML = '✕';
          this.els.btnDrop.title = 'Drop / Put Back Item (Q)';
          this.els.btnDrop.setAttribute('aria-label', 'Drop Item');
          this.els.btnDrop.classList.remove('active-lens');
        } else if (mentionsQ) {
          this.els.btnDrop.classList.add('visible');
          this.els.btnDrop.innerHTML = 'Q';
          this.els.btnDrop.title = 'Action (Q)';
          this.els.btnDrop.setAttribute('aria-label', 'Action Q');
          this.els.btnDrop.classList.remove('active-lens');
        } else {
          this.els.btnDrop.classList.remove('visible');
          this.els.btnDrop.classList.remove('active-lens');
        }
      }

      // Hood button (Episode 7)
      if (this.els.btnHood) {
        const hasHood = !!(scene.st && typeof scene.st.hood !== 'undefined');
        this.els.btnHood.classList.toggle('visible', hasHood);
      }
    },

    // PointerLock hook handlers called from game.js
    onLock() {
      if (this.active && window.SK_INPUT) {
        window.SK_INPUT.locked = true;
      }
    },

    resetMovement() {
      this.moveTouchId = null;
      this.lookTouchId = null;
      this.setKey('KeyW', false);
      this.setKey('KeyS', false);
      this.setKey('KeyA', false);
      this.setKey('KeyD', false);
      this.setKey('ShiftLeft', false);
      if (this.els && this.els.joyKnob) this.els.joyKnob.style.transform = 'translate(0, 0)';
      if (this.els && this.els.joyBase) this.els.joyBase.classList.remove('visible', 'sprint');
      if (this.els && this.els.joyAnchor) this.els.joyAnchor.classList.remove('hidden');
      if (window.SK_INPUT) {
        window.SK_INPUT.mdx = 0;
        window.SK_INPUT.mdy = 0;
        if (window.SK_INPUT.keys) {
          window.SK_INPUT.keys['KeyW'] = false;
          window.SK_INPUT.keys['KeyS'] = false;
          window.SK_INPUT.keys['KeyA'] = false;
          window.SK_INPUT.keys['KeyD'] = false;
          window.SK_INPUT.keys['ShiftLeft'] = false;
          window.SK_INPUT.keys['KeyE'] = false;
          window.SK_INPUT.keys['KeyF'] = false;
        }
      }
    },

    onUnlock() {
      this.resetMovement();
      if (this.active && window.SK_INPUT) {
        const overlay = document.getElementById('overlay');
        const hasOverlay = !!(overlay && Array.from(overlay.children).some(child => {
          if (!child || child.nodeType !== 1) return false;
          try {
            const style = window.getComputedStyle(child);
            return style.display !== 'none' && style.visibility !== 'hidden' && (child.offsetWidth > 0 || child.offsetHeight > 0 || child.children.length > 0);
          } catch (_) {
            return child.offsetWidth > 0 || child.offsetHeight > 0;
          }
        }));
        const isPaused = (typeof te !== 'undefined' && te && te.paused) || false;
        if (hasOverlay || isPaused) {
          window.SK_INPUT.locked = false;
        }
      }
    }
  };

  // Expose globally
  window.SK_TOUCH = SK_TOUCH;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => SK_TOUCH.init());
  } else {
    SK_TOUCH.init();
  }
})();
