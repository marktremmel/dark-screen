/**
 * SÖTÉT KÉPERNYŐ (Dark Screen) - Cross-Platform Gyro Aim & Motion Controls Engine
 * Robust DeviceOrientation & DeviceMotion with Sensor Permission Management,
 * World-Space Up Projection, 1:1 Aiming, and Instant HUD Recalibration
 */

(function () {
  'use strict';

  const STORAGE_KEY = 'sk_gyro_settings.v1';

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

  function vibrate(pattern) {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try { navigator.vibrate(pattern); } catch (_) {}
    }
  }

  function angleDiff(a, b) {
    let diff = a - b;
    while (diff > 180) diff -= 360;
    while (diff < -180) diff += 360;
    return diff;
  }

  const SK_GYRO = {
    // Config & Preferences
    enabled: stored.enabled === true,
    sensitivity: typeof stored.sensitivity === 'number' ? stored.sensitivity : 1.2,
    invertPitch: stored.invertPitch === true,
    invertYaw: stored.invertYaw === true,
    deadzone: 0.18,        // Threshold in deg/s below which resting tremors are ignored
    smoothing: 0.65,       // Exponential moving average factor (0.65 = snappy, drift-free)

    // Runtime state
    active: false,
    permissionGranted: false,
    hasMotionHardware: false,
    listenersAttached: false,

    // Steering style preference: 'natural' (World-up projection) | 'yaw' (Pan only) | 'roll' (Steering roll)
    gyroMode: stored.gyroMode || 'natural',

    // Gravity vector in device coordinates (default to landscape orientation)
    gravityX: -9.8,
    gravityY: 0,
    gravityZ: 0,

    // Filtered rates (deg/s)
    rawYawRate: 0,
    rawPitchRate: 0,
    smoothYawRate: 0,
    smoothPitchRate: 0,

    // Calibration bias (deg/s offset)
    biasYaw: 0,
    biasPitch: 0,

    // Timing & history
    lastFrameTime: 0,
    lastMotionTime: 0,
    lastOrientTime: 0,
    lastAlpha: null,
    lastBeta: null,
    lastGamma: null,

    // Quick HUD indicator DOM
    quickCalBtn: null,

    init() {
      // Check if motion hardware APIs exist in this environment
      this.hasMotionHardware = (typeof window !== 'undefined') &&
        (('DeviceMotionEvent' in window) || ('DeviceOrientationEvent' in window));

      this.bindSettingsObserver();
      this.createQuickHUD();
      this.startMotionLoop();

      if (this.enabled) {
        this.attemptAutoStart();
      }

      console.log('[SK_GYRO] Initialized. Motion Hardware Available:', this.hasMotionHardware, 'Enabled:', this.enabled, 'Mode:', this.gyroMode);
    },

    // Check if permission is needed (iOS 13+ Safari & WKWebView)
    needsExplicitPermission() {
      if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
        return true;
      }
      if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
        return true;
      }
      return false;
    },

    // iOS 13+ requires user gesture to call requestPermission
    // IMPORTANT: WebKit only permits ONE requestPermission call during a user activation window.
    // Calling both sequentially drops the user activation, causing the second to fail with NotAllowedError.
    async requestPermission() {
      if (!this.needsExplicitPermission()) {
        this.permissionGranted = true;
        this.attachSensorListeners();
        return true;
      }

      try {
        let reqFn = null;
        if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
          reqFn = DeviceOrientationEvent.requestPermission.bind(DeviceOrientationEvent);
        } else if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
          reqFn = DeviceMotionEvent.requestPermission.bind(DeviceMotionEvent);
        }

        if (reqFn) {
          const res = await reqFn();
          this.permissionGranted = (res === 'granted');
          console.log('[SK_GYRO] Permission response:', res);
        } else {
          this.permissionGranted = true;
        }

        if (this.permissionGranted) {
          this.attachSensorListeners();
        }
        return this.permissionGranted;
      } catch (err) {
        console.warn('[SK_GYRO] Permission request failed:', err);
        // Fallback: attach listeners anyway to verify if events pass through
        this.attachSensorListeners();
        return false;
      }
    },

    attemptAutoStart() {
      if (!this.needsExplicitPermission()) {
        this.permissionGranted = true;
        this.attachSensorListeners();
        return;
      }

      // On iOS, listen for the first user click or touchend gesture to prompt or activate cleanly
      const onUserGesture = async () => {
        window.removeEventListener('click', onUserGesture, true);
        window.removeEventListener('touchend', onUserGesture, true);
        if (this.enabled && !this.permissionGranted) {
          const granted = await this.requestPermission();
          if (granted) {
            console.log('[SK_GYRO] Permission granted on initial user interaction');
          }
        }
      };

      window.addEventListener('click', onUserGesture, { capture: true, once: true });
      window.addEventListener('touchend', onUserGesture, { capture: true, once: true });
    },

    attachSensorListeners() {
      if (this.listenersAttached) return;
      this.listenersAttached = true;

      // Native CoreMotion Plugin (iOS CMMotionManager hardware bridge)
      if (window.Capacitor?.Plugins?.NativeMotion) {
        try {
          window.Capacitor.Plugins.NativeMotion.start().then((res) => {
            console.log('[SK_GYRO] NativeMotion started:', res);
          }).catch((err) => {
            console.warn('[SK_GYRO] NativeMotion start failed:', err);
          });
          window.Capacitor.Plugins.NativeMotion.addListener('motion', (e) => {
            const now = performance.now();
            if (typeof e.gx === 'number') this.gravityX = e.gx;
            if (typeof e.gy === 'number') this.gravityY = e.gy;
            if (typeof e.gz === 'number') this.gravityZ = e.gz;
            if (typeof e.x === 'number') {
              this.lastMotionTime = now;
              if (this.enabled && this.is3DActive()) {
                this.processRotationRate({ alpha: e.z, beta: e.x, gamma: e.y });
              }
            }
          });
          console.log('[SK_GYRO] Attached NativeMotion CoreMotion bridge listeners');
        } catch (err) {
          console.warn('[SK_GYRO] NativeMotion attach error:', err);
        }
      }

      // Native Capacitor Motion plugin if available (iOS CoreMotion & Android SensorManager)
      if (window.Capacitor?.Plugins?.Motion) {
        try {
          window.Capacitor.Plugins.Motion.addListener('accel', (e) => {
            const now = performance.now();
            if (e.accelerationIncludingGravity) {
              const ag = e.accelerationIncludingGravity;
              if (typeof ag.x === 'number' && !isNaN(ag.x)) this.gravityX = ag.x;
              if (typeof ag.y === 'number' && !isNaN(ag.y)) this.gravityY = ag.y;
              if (typeof ag.z === 'number' && !isNaN(ag.z)) this.gravityZ = ag.z;
            }
            if (e.rotationRate) {
              this.lastMotionTime = now;
              if (this.enabled && this.is3DActive()) {
                this.processRotationRate(e.rotationRate);
              }
            }
          });

          window.Capacitor.Plugins.Motion.addListener('orientation', (e) => {
            const now = performance.now();
            this.lastOrientTime = now;
            if (now - this.lastMotionTime < 400) return;
            if (this.enabled && this.is3DActive()) {
              this.processOrientationFallback(e);
            }
          });
          console.log('[SK_GYRO] Attached native Capacitor Motion listeners');
        } catch (err) {
          console.warn('[SK_GYRO] Native Capacitor Motion attach error:', err);
        }
      }

      // Primary sensor: DeviceMotionEvent (angular velocity via rotationRate)
      const handleMotion = (e) => {
        const now = performance.now();

        // 1. Keep gravity updated at all times so coordinate projection is always ready
        if (e.accelerationIncludingGravity) {
          const ag = e.accelerationIncludingGravity;
          if (typeof ag.x === 'number' && !isNaN(ag.x)) this.gravityX = ag.x;
          if (typeof ag.y === 'number' && !isNaN(ag.y)) this.gravityY = ag.y;
          if (typeof ag.z === 'number' && !isNaN(ag.z)) this.gravityZ = ag.z;
        }

        // 2. Process angular velocity if rotationRate is available
        if (e.rotationRate && (typeof e.rotationRate.beta === 'number' || typeof e.rotationRate.gamma === 'number')) {
          this.lastMotionTime = now;
          if (this.enabled && this.is3DActive()) {
            this.processRotationRate(e.rotationRate);
          }
        }
      };

      // Fallback sensor: DeviceOrientationEvent (absolute angles)
      const handleOrientation = (e) => {
        const now = performance.now();
        this.lastOrientTime = now;

        // If DeviceMotionEvent rotationRate is actively updating (within 400ms), prefer rotationRate
        if (now - this.lastMotionTime < 400) return;

        if (this.enabled && this.is3DActive()) {
          this.processOrientationFallback(e);
        }
      };

      window.addEventListener('devicemotion', handleMotion, { passive: true });
      window.addEventListener('deviceorientation', handleOrientation, { passive: true });
      window.addEventListener('orientationchange', () => {
        this.lastAlpha = null;
        this.lastBeta = null;
        this.lastGamma = null;
      }, { passive: true });

      console.log('[SK_GYRO] Sensor listeners attached');
    },

    // Convert rotationRate (deg/s) into screen-aligned yaw and pitch rates
    processRotationRate(rate) {
      const rAlpha = rate.alpha || 0; // rotation around screen normal Z (deg/s)
      const rBeta = rate.beta || 0;   // rotation around physical X (deg/s)
      const rGamma = rate.gamma || 0; // rotation around physical Y (deg/s)

      const screenAngle = this.getScreenAngle();
      let rawYaw = 0;
      let rawPitch = 0;

      // 1. Calculate World-Up vertical rotation rate (World-Space Yaw)
      // Gravity vector points down; real-world earth-up vector in device frame is -g / ||g||
      const gx = this.gravityX;
      const gy = this.gravityY;
      const gz = this.gravityZ;
      const gMag = Math.hypot(gx, gy, gz) || 9.8;
      const upX = -gx / gMag;
      const upY = -gy / gMag;
      const upZ = -gz / gMag;

      // Angular velocity projected onto real-world vertical axis
      const worldVerticalRate = (rBeta * upX + rGamma * upY + rAlpha * upZ);

      // 2. Calculate Screen-Aligned Pitch and Yaw based on orientation
      switch (screenAngle) {
        case 90:
          // Standard Landscape (top of phone on left, USB port on right)
          // Pitch: tilting up rotates top edge back (negative rGamma).
          // To look up, game pitch must increase, so deltaMdy must be negative.
          // Therefore rawPitch = rGamma.
          rawPitch = rGamma;

          if (this.gyroMode === 'yaw') {
            rawYaw = rBeta;
          } else if (this.gyroMode === 'roll') {
            rawYaw = -rAlpha;
          } else {
            // 'natural': World-Space Up
            rawYaw = -worldVerticalRate;
          }
          break;

        case 270:
        case -90:
          // Inverted Landscape (top of phone on right, USB port on left)
          rawPitch = -rGamma;

          if (this.gyroMode === 'yaw') {
            rawYaw = -rBeta;
          } else if (this.gyroMode === 'roll') {
            rawYaw = rAlpha;
          } else {
            rawYaw = -worldVerticalRate;
          }
          break;

        case 180:
          // Inverted Portrait
          rawPitch = rBeta;
          if (this.gyroMode === 'yaw') rawYaw = rGamma;
          else if (this.gyroMode === 'roll') rawYaw = rAlpha;
          else rawYaw = -worldVerticalRate;
          break;

        case 0:
        default:
          // Standard Portrait
          rawPitch = -rBeta;
          if (this.gyroMode === 'yaw') rawYaw = -rGamma;
          else if (this.gyroMode === 'roll') rawYaw = -rAlpha;
          else rawYaw = -worldVerticalRate;
          break;
      }

      // Subtract zero-point calibration bias
      this.rawYawRate = rawYaw - this.biasYaw;
      this.rawPitchRate = rawPitch - this.biasPitch;
    },

    // Fallback: Compute angular rates from absolute orientation differences
    processOrientationFallback(e) {
      if (e.alpha === null || e.beta === null || e.gamma === null) return;

      const now = performance.now();
      if (this.lastAlpha === null || this.lastOrientTime === 0) {
        this.lastAlpha = e.alpha;
        this.lastBeta = e.beta;
        this.lastGamma = e.gamma;
        this.lastOrientTime = now;
        return;
      }

      const dt = Math.max((now - this.lastOrientTime) / 1000, 0.005);
      const dAlpha = angleDiff(e.alpha, this.lastAlpha) / dt;
      const dBeta = angleDiff(e.beta, this.lastBeta) / dt;
      const dGamma = angleDiff(e.gamma, this.lastGamma) / dt;

      this.lastAlpha = e.alpha;
      this.lastBeta = e.beta;
      this.lastGamma = e.gamma;
      this.lastOrientTime = now;

      // Process as rotation rates
      this.processRotationRate({ alpha: dAlpha, beta: dBeta, gamma: dGamma });
    },

    getScreenAngle() {
      let angle = null;
      if (window.screen && window.screen.orientation && typeof window.screen.orientation.angle === 'number') {
        angle = window.screen.orientation.angle;
      } else if (typeof window.orientation === 'number') {
        angle = window.orientation;
      }

      const isLandscape = window.innerWidth > window.innerHeight;
      if (isLandscape) {
        if (angle === 90 || angle === 270 || angle === -90) {
          return angle;
        }
        // Deduce landscape variant from gravity vector if angle reported 0
        if (typeof this.gravityX === 'number' && Math.abs(this.gravityX) > 1.5) {
          return this.gravityX > 0 ? 270 : 90;
        }
        return 90;
      }

      return angle || 0;
    },

    // Deadzone filter to remove hand tremors and resting noise
    applyDeadzone(val, threshold) {
      if (Math.abs(val) <= threshold) return 0;
      return Math.sign(val) * (Math.abs(val) - threshold);
    },

    // Zero out any current resting drift and reset center
    recalibrate() {
      this.biasYaw = this.rawYawRate + this.biasYaw;
      this.biasPitch = this.rawPitchRate + this.biasPitch;
      this.smoothYawRate = 0;
      this.smoothPitchRate = 0;
      vibrate([20, 40, 20]);
      console.log('[SK_GYRO] Recalibrated. Zero bias set:', { yaw: this.biasYaw, pitch: this.biasPitch });

      if (this.quickCalBtn) {
        this.quickCalBtn.classList.add('calibrated');
        setTimeout(() => {
          if (this.quickCalBtn) this.quickCalBtn.classList.remove('calibrated');
        }, 1200);
      }
    },

    setEnabled(val) {
      this.enabled = !!val;
      stored.enabled = this.enabled;
      saveSettings(stored);

      if (this.enabled) {
        this.attemptAutoStart();
      } else {
        this.smoothYawRate = 0;
        this.smoothPitchRate = 0;
        this.rawYawRate = 0;
        this.rawPitchRate = 0;
      }
    },

    // Verify 3D gameplay is actively rendering and interactive
    is3DActive() {
      const g = window.SK_GAME;
      if (!g || !g.scene || !g.scene.player || !g.scene.playing) return false;

      // Overlay menus (Settings, Episode Select, Code modal)
      const overlay = document.getElementById('overlay');
      if (overlay && overlay.children.length > 0) return false;

      // Paused state
      const isPaused = (typeof te !== 'undefined' && te && te.paused) || false;
      if (isPaused) return false;

      // Screen transitions
      const fade = document.getElementById('fade');
      if (fade && fade.classList.contains('on')) return false;

      // Loading screen
      const loading = document.getElementById('loading');
      if (loading && loading.style.display !== 'none' && !loading.classList.contains('hidden')) return false;

      return true;
    },

    // Main frame loop: applies deadzone, exponential filter and injects camera rotation
    startMotionLoop() {
      const raf = (typeof window !== 'undefined' && window.requestAnimationFrame)
        ? window.requestAnimationFrame.bind(window)
        : (cb => setTimeout(cb, 16));

      const tick = () => {
        this.updateFrame();
        this.updateQuickHUD();
        raf(tick);
      };
      raf(tick);
    },

    updateFrame() {
      const now = performance.now();
      if (!this.lastFrameTime) {
        this.lastFrameTime = now;
        return;
      }

      const dt = Math.min((now - this.lastFrameTime) / 1000, 0.05); // Clamp dt to max 50ms
      this.lastFrameTime = now;

      if (!this.enabled || !this.is3DActive()) {
        this.smoothYawRate = 0;
        this.smoothPitchRate = 0;
        return;
      }

      // 1. Apply deadzone to raw rates
      const deadYaw = this.applyDeadzone(this.rawYawRate, this.deadzone);
      const deadPitch = this.applyDeadzone(this.rawPitchRate, this.deadzone);

      // 2. Low-pass exponential smoothing
      const alpha = 1 - this.smoothing;
      this.smoothYawRate += (deadYaw - this.smoothYawRate) * alpha;
      this.smoothPitchRate += (deadPitch - this.smoothPitchRate) * alpha;

      // 3. Convert deg/s to radians for this frame
      const degToRad = Math.PI / 180;
      const yawRad = (this.smoothYawRate * degToRad) * dt;
      const pitchRad = (this.smoothPitchRate * degToRad) * dt;

      // 4. Inversion & Sensitivity scaling
      const invYaw = this.invertYaw ? -1 : 1;
      const invPitch = this.invertPitch ? -1 : 1;
      const sens = this.sensitivity;

      // Scale to mouse delta (canceling base game mouse factor 0.0022 for exact 1:1 camera aim)
      const deltaMdx = (yawRad / 0.0022) * sens * invYaw;
      const deltaMdy = (pitchRad / 0.0022) * sens * invPitch;

      // 5. Apply directly to active player camera if available, and also accumulate into SK_INPUT
      const player = window.SK_GAME?.scene?.player;
      if (player && !player.frozen) {
        player.yaw -= yawRad * sens * invYaw;
        player.pitch -= pitchRad * sens * invPitch;
        player.pitch = Math.max(-1.35, Math.min(1.35, player.pitch));
        player.sync();
      } else if (window.SK_INPUT) {
        window.SK_INPUT.mdx += deltaMdx;
        window.SK_INPUT.mdy += deltaMdy;
      }
    },

    // Create subtle on-screen Gyro recalibration button during active 3D gameplay
    createQuickHUD() {
      if (this.quickCalBtn || typeof document === 'undefined' || !document.createElement) return;

      const btn = document.createElement('button');
      btn.id = 'sk-btn-gyro-quick';
      btn.className = 'sk-btn-gyro-quick';
      btn.type = 'button';
      btn.title = 'Giroszkóp újrakalibrálás (Re-center / Calibrate)';
      btn.innerHTML = `
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="9"/>
          <path d="M12 3v4M12 17v4M3 12h4M17 12h4"/>
          <circle cx="12" cy="12" r="2.5" fill="currentColor"/>
        </svg>
      `;

      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.recalibrate();
      });

      document.body.appendChild(btn);
      this.quickCalBtn = btn;
    },

    updateQuickHUD() {
      if (!this.quickCalBtn || !this.quickCalBtn.style) return;
      const visible = this.enabled && this.is3DActive();
      this.quickCalBtn.style.display = visible ? 'flex' : 'none';
    },

    // Inject Gyro settings cleanly into the in-game Settings panel
    bindSettingsObserver() {
      const overlay = document.getElementById('overlay');
      if (!overlay || typeof MutationObserver === 'undefined') return;

      const observer = new MutationObserver((mutations) => {
        for (const m of mutations) {
          for (const node of m.addedNodes) {
            if (node.nodeType !== 1) continue;
            const h2 = node.querySelector('h2');
            if (h2 && /Settings/i.test(h2.textContent)) {
              this.injectSettingsUI(node);
            }
          }
        }
      });

      observer.observe(overlay, { childList: true, subtree: true });
    },

    injectSettingsUI(panel) {
      if (panel.querySelector('.sk-gyro-settings-row')) return;

      const btns = panel.querySelector('.btns');
      if (!btns) return;

      const modeLabels = {
        natural: 'Természetes (World-Up)',
        yaw: 'Csak forgatás (Pan)',
        roll: 'Kormányzás (Roll)'
      };

      const container = document.createElement('div');
      container.className = 'sk-gyro-settings-row';
      container.innerHTML = `
        <div class="sk-settings-header">
          <span>🧭 Gyro Aim (Giroszkópos célzás)</span>
        </div>
        <div class="setting setting-toggle">
          <div>Giroszkóp célzás (Gyro aim)<div class="d">Finom célzás és nézelődés a telefon fizikai mozgatásával.</div></div>
          <div><div id="sk-toggle-gyro" class="toggle ${this.enabled ? 'on' : ''}" role="switch" tabindex="0"></div></div>
        </div>
        <div class="setting setting-range">
          <div>Giroszkóp érzékenység<div class="d">Célzási sebesség és mozgási reakcióidő (<span id="sk-gyro-sens-val">${this.sensitivity.toFixed(1)}</span>x).</div></div>
          <div><input id="sk-range-gyro-sens" type="range" min="0.4" max="3.0" step="0.1" value="${this.sensitivity}"></div>
        </div>
        <div class="setting setting-other">
          <div>Irányítási stílus (Steering mode)<div class="d">Hogyan reagáljon a vízszintes nézelődés a telefon mozgására.</div></div>
          <div><button id="sk-btn-gyro-mode" class="btn small" type="button">${modeLabels[this.gyroMode] || modeLabels.natural}</button></div>
        </div>
        <div class="setting setting-toggle">
          <div>Függőleges invertálás (Invert pitch)<div class="d">Fel/le billentés megfordítása.</div></div>
          <div><div id="sk-toggle-gyro-invert-pitch" class="toggle ${this.invertPitch ? 'on' : ''}" role="switch" tabindex="0"></div></div>
        </div>
        <div class="setting setting-toggle">
          <div>Vízszintes invertálás (Invert yaw)<div class="d">Bal/jobb forgatás megfordítása.</div></div>
          <div><div id="sk-toggle-gyro-invert-yaw" class="toggle ${this.invertYaw ? 'on' : ''}" role="switch" tabindex="0"></div></div>
        </div>
        <div class="setting setting-other" style="align-items: flex-start; padding: 12px 14px;">
          <div style="flex: 1; padding-right: 12px;">
            <div style="font-weight: bold; color: var(--ink, #fff);">Giroszkóp újrakalibrálás</div>
            <div class="d" style="font-size: 13px; line-height: 1.35; margin-top: 3px; color: var(--mute, #aaa);">
              Tartsd a telefont stabilan, kényelmes nézési pozícióban, majd érintsd meg az Újrakalibrálás gombot a nyugalmi állapot és középállás rögzítéséhez.
            </div>
          </div>
          <div><button id="sk-btn-gyro-cal" class="btn small" type="button" style="min-width: 120px; font-weight: bold;">Újrakalibrálás</button></div>
        </div>
      `;

      btns.parentNode.insertBefore(container, btns);

      // Wire up injected settings controls
      const gyroToggle = container.querySelector('#sk-toggle-gyro');
      gyroToggle.onclick = async () => {
        if (!this.enabled) {
          const granted = await this.requestPermission();
          if (!granted && this.needsExplicitPermission()) {
            alert('A giroszkópos célzáshoz engedélyezned kell a mozgásérzékelőket a böngésző vagy az iOS beállításaiban.');
            return;
          }
          this.setEnabled(true);
          gyroToggle.classList.add('on');
          vibrate(15);
        } else {
          this.setEnabled(false);
          gyroToggle.classList.remove('on');
          vibrate(15);
        }
      };

      const sensRange = container.querySelector('#sk-range-gyro-sens');
      const sensVal = container.querySelector('#sk-gyro-sens-val');
      sensRange.oninput = () => {
        this.sensitivity = parseFloat(sensRange.value);
        if (sensVal) sensVal.textContent = this.sensitivity.toFixed(1);
        stored.sensitivity = this.sensitivity;
        saveSettings(stored);
      };

      const modeBtn = container.querySelector('#sk-btn-gyro-mode');
      modeBtn.onclick = () => {
        const order = ['natural', 'yaw', 'roll'];
        const nextIdx = (order.indexOf(this.gyroMode) + 1) % order.length;
        this.gyroMode = order[nextIdx];
        stored.gyroMode = this.gyroMode;
        saveSettings(stored);
        modeBtn.textContent = modeLabels[this.gyroMode];
        vibrate(20);
      };

      const invertPitchToggle = container.querySelector('#sk-toggle-gyro-invert-pitch');
      invertPitchToggle.onclick = () => {
        this.invertPitch = !this.invertPitch;
        invertPitchToggle.classList.toggle('on', this.invertPitch);
        stored.invertPitch = this.invertPitch;
        saveSettings(stored);
        vibrate(15);
      };

      const invertYawToggle = container.querySelector('#sk-toggle-gyro-invert-yaw');
      invertYawToggle.onclick = () => {
        this.invertYaw = !this.invertYaw;
        invertYawToggle.classList.toggle('on', this.invertYaw);
        stored.invertYaw = this.invertYaw;
        saveSettings(stored);
        vibrate(15);
      };

      const calBtn = container.querySelector('#sk-btn-gyro-cal');
      calBtn.onclick = () => {
        calBtn.disabled = true;
        calBtn.textContent = '3...';
        vibrate(25);
        setTimeout(() => {
          calBtn.textContent = '2...';
          vibrate(25);
          setTimeout(() => {
            calBtn.textContent = '1...';
            vibrate(25);
            setTimeout(() => {
              this.recalibrate();
              calBtn.textContent = '✓ Kalibrálva!';
              calBtn.style.borderColor = 'var(--acc, #8fe3c9)';
              calBtn.style.color = 'var(--acc, #8fe3c9)';
              setTimeout(() => {
                calBtn.disabled = false;
                calBtn.textContent = 'Újrakalibrálás';
                calBtn.style.borderColor = '';
                calBtn.style.color = '';
              }, 2000);
            }, 300);
          }, 300);
        }, 300);
      };
    },

    // Developer and Diagnostics Status Reporter
    status() {
      return {
        enabled: this.enabled,
        is3DActive: this.is3DActive(),
        permissionGranted: this.permissionGranted,
        hasMotionHardware: this.hasMotionHardware,
        listenersAttached: this.listenersAttached,
        gyroMode: this.gyroMode,
        sensitivity: this.sensitivity,
        rates: {
          rawYaw: this.rawYawRate,
          rawPitch: this.rawPitchRate,
          smoothYaw: this.smoothYawRate,
          smoothPitch: this.smoothPitchRate
        },
        gravity: {
          x: this.gravityX,
          y: this.gravityY,
          z: this.gravityZ
        },
        screenAngle: this.getScreenAngle()
      };
    },

    // Simulator for automated or manual testing
    simulate(yawRateDegSec, pitchRateDegSec) {
      this.rawYawRate = yawRateDegSec;
      this.rawPitchRate = pitchRateDegSec;
      console.log(`[SK_GYRO] Simulated rates -> Yaw: ${yawRateDegSec}°/s, Pitch: ${pitchRateDegSec}°/s`);
    }
  };

  // Expose globally
  window.SK_GYRO = SK_GYRO;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => SK_GYRO.init());
  } else {
    SK_GYRO.init();
  }
})();
