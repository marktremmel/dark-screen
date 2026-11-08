/**
 * SÖTÉT KÉPERNYŐ (Dark Screen) - Cross-Platform Audio & Haptics Engine
 * Phase 4: iOS/Mobile Web Audio Autoplay Unlock & Contextual Horror Vibration System
 */

(function () {
  'use strict';

  const STORAGE_KEY = 'sk_haptics_settings.v1';

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

  const SK_HAPTICS = {
    // Config & Preferences
    enabled: stored.enabled !== false,
    intensity: stored.intensity || 'standard', // 'subtle' | 'standard' | 'heavy'
    heartbeatEnabled: stored.heartbeat !== false,

    // Runtime state
    audioUnlocked: false,
    heartbeatActive: false,
    heartbeatIntervalId: null,
    currentNoiseLevel: 0,
    hasVibrationHardware: true,

    getCapacitorHaptics() {
      if (typeof window !== 'undefined' && window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Haptics) {
        return window.Capacitor.Plugins.Haptics;
      }
      return null;
    },

    init() {
      const capHaptics = this.getCapacitorHaptics();
      const nav = (typeof window !== 'undefined' && window.navigator) ? window.navigator : (typeof navigator !== 'undefined' ? navigator : null);
      this.hasVibrationHardware = !!capHaptics || !!(nav && typeof nav.vibrate === 'function');

      this.bindAudioUnlock();
      this.bindVisibility();
      this.bindSettingsObserver();

      console.log('[SK_HAPTICS] Initialized. Native Taptic Engine:', !!capHaptics, 'Vibrate API:', !!(nav && nav.vibrate), 'Enabled:', this.enabled);
    },

    // Intensity scaling factor
    getIntensityMultiplier() {
      switch (this.intensity) {
        case 'subtle': return 0.6;
        case 'heavy': return 1.4;
        case 'standard':
        default: return 1.0;
      }
    },

    // Core vibration dispatcher with iOS Taptic Engine & Android fallback
    vibrate(pattern) {
      if (!this.enabled) return;
      const mult = this.getIntensityMultiplier();
      const capHaptics = this.getCapacitorHaptics();

      // 1. Native iOS / Android Capacitor Taptic Engine
      if (capHaptics) {
        try {
          if (Array.isArray(pattern)) {
            const first = Math.round((pattern[0] || 25) * mult);
            if (first >= 80) {
              capHaptics.impact({ style: 'HEAVY' }).catch(() => {});
            } else if (first >= 30) {
              capHaptics.impact({ style: 'MEDIUM' }).catch(() => {});
            } else {
              capHaptics.impact({ style: 'LIGHT' }).catch(() => {});
            }

            if (pattern.length >= 3) {
              setTimeout(() => {
                const second = Math.round(pattern[2] * mult);
                if (second >= 60) {
                  capHaptics.impact({ style: 'HEAVY' }).catch(() => {});
                } else {
                  capHaptics.impact({ style: 'MEDIUM' }).catch(() => {});
                }
              }, Math.max(30, pattern[1] || 80));
            }
          } else if (typeof pattern === 'number') {
            const dur = Math.round(pattern * mult);
            if (dur >= 100) {
              capHaptics.notification({ type: 'WARNING' }).catch(() => {});
            } else if (dur >= 50) {
              capHaptics.impact({ style: 'HEAVY' }).catch(() => {});
            } else if (dur >= 20) {
              capHaptics.impact({ style: 'MEDIUM' }).catch(() => {});
            } else {
              capHaptics.impact({ style: 'LIGHT' }).catch(() => {});
            }
          }
        } catch (_) {}
        return;
      }

      // 2. Standard Web Navigator Vibrate API
      const nav = (typeof window !== 'undefined' && window.navigator) ? window.navigator : (typeof navigator !== 'undefined' ? navigator : null);
      if (!nav || typeof nav.vibrate !== 'function') return;

      let scaledPattern;
      if (Array.isArray(pattern)) {
        scaledPattern = pattern.map(v => Math.max(1, Math.round(v * mult)));
      } else if (typeof pattern === 'number') {
        scaledPattern = Math.max(1, Math.round(pattern * mult));
      } else {
        return;
      }

      try {
        nav.vibrate(scaledPattern);
      } catch (_) {}
    },

    // --- Web Audio Mobile Autoplay Unlocking & Hardware Wake ---
    reviveAudio() {
      const audio = window.SK_AUDIO;
      if (!audio || !audio.ve) return;
      let ctx = audio.ve.ctx;

      // 1. Recreate AudioContext if OS terminated or closed it
      if (!ctx || ctx.state === 'closed') {
        if (typeof window.Sg === 'function') {
          ctx = window.Sg();
          console.log('[SK_AUDIO] AudioContext was closed by OS; successfully reconstructed');
        }
      }
      if (!ctx) return;

      // 2. Resume suspended or interrupted context
      if (ctx.state === 'suspended' || ctx.state === 'interrupted') {
        ctx.resume().then(() => {
          console.log('[SK_AUDIO] AudioContext resumed, state:', ctx.state);
        }).catch(() => {});
      }

      // 3. Force-unmute iOS hardware DAC via 1-sample silent buffer on ctx.destination
      try {
        const buf = ctx.createBuffer(1, 1, 22050);
        const src = ctx.createBufferSource();
        src.buffer = buf;
        src.connect(ctx.destination);
        src.start(0);
      } catch (_) {}

      // 4. Ensure master gain is non-zero
      if (audio.ve.master && audio.ve.master.gain && window.SK_STATE?.settings?.master != null) {
        if (audio.ve.master.gain.value === 0 && window.SK_STATE.settings.master > 0) {
          audio.ve.master.gain.value = window.SK_STATE.settings.master;
        }
      }

      // 5. Restore music if it was running before sleep/lock
      if (audio.ve.curName && window.SK_AUDIO && typeof window.SK_AUDIO.music === 'function') {
        const curSrc = audio.ve.cur?.src;
        // If buffer source is missing or finished
        if (!audio.ve.cur || !curSrc || curSrc.playbackState === 3) {
          const musVol = window.SK_STATE?.settings?.music ?? 0.6;
          window.SK_AUDIO.music(audio.ve.curName, musVol, 0.5);
          console.log('[SK_AUDIO] Restored ambient music track:', audio.ve.curName);
        }
      }

      this.audioUnlocked = true;
    },

    bindAudioUnlock() {
      const onWake = () => {
        this.reviveAudio();
      };

      // Initial unlock triggers
      ['touchstart', 'touchend', 'pointerdown', 'mousedown', 'keydown'].forEach(evt => {
        window.addEventListener(evt, onWake, { capture: true, passive: true });
        document.addEventListener(evt, onWake, { capture: true, passive: true });
      });
    },

    // Background tab / Lock screen / App switch lifecycle handling
    bindVisibility() {
      const onForeground = () => {
        // Delay slightly (60ms) so OS audio session completes its hardware routing transition
        setTimeout(() => this.reviveAudio(), 60);
        setTimeout(() => this.reviveAudio(), 300);
      };

      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          // NOTE: Do NOT explicitly call ctx.suspend() here!
          // iOS WebKit automatically silences background tabs. If JS calls ctx.suspend(),
          // WebKit treats it as intentional and refuses to resume without a fresh user touch.
          this.stopHeartbeat();
        } else {
          onForeground();
        }
      });

      // Additional mobile lifecycle events (e.g. unlocking phone / app switch)
      window.addEventListener('pageshow', onForeground, { passive: true });
      window.addEventListener('focus', onForeground, { passive: true });
      window.addEventListener('blur', () => this.stopHeartbeat(), { passive: true });

      // Native Capacitor App state change listener
      if (window.Capacitor?.Plugins?.App) {
        try {
          window.Capacitor.Plugins.App.addListener('appStateChange', (state) => {
            if (state && state.isActive) {
              onForeground();
            } else {
              this.stopHeartbeat();
            }
          });
        } catch (_) {}
      }

      // Cordova/Capacitor native resume event
      document.addEventListener('resume', onForeground, { passive: true });
    },

    // --- Contextual Sound Haptic Hook (invoked from game.js function A) ---
    onSound(soundName, options) {
      if (!this.enabled) return;

      switch (soundName) {
        // Jump Scare & Stingers
        case 'stinger':
          this.vibrate([90, 40, 160, 30, 220]);
          break;

        // Static / Electrical Sparks (Episode 1 PC Build)
        case 'spark1':
        case 'spark2':
          this.vibrate([15, 20, 25, 15, 30]);
          break;

        // Heavy Impacts, Monster Footsteps, Thuds
        case 'thump':
        case 'heavy':
        case 'heavy1':
        case 'heavy2':
        case 'heavy3':
          this.vibrate([75]);
          break;

        // Inventory Pickup & Object Handling
        case 'pickup':
          this.vibrate([18, 35, 18]);
          break;

        // Door Knocking (Episode 1 & 2)
        case 'knock':
          this.vibrate([40, 80, 40]);
          break;

        // Doors, Drawers, Closets, Shutters, Latches
        case 'door_open':
        case 'door_close':
        case 'shutter':
        case 'latch':
        case 'sec_latch':
        case 'drawer':
        case 'closet':
          this.vibrate([35, 40, 25]);
          break;

        // Switches & Torch Toggle
        case 'lightsw':
        case 'switch_on':
        case 'switch_off':
        case 'poweron':
        case 'tvon':
        case 'crton':
          this.vibrate([22]);
          break;

        // Error / Lock / Denied
        case 'denied':
          this.vibrate([50, 40, 50]);
          break;

        // Presence / Threat Ambience
        case 'presence':
        case 'strange':
          this.vibrate([25, 80, 25]);
          break;

        // Rogue Stairwell Signals
        case 'rg_signal1':
        case 'rg_signal2':
          this.vibrate([20, 40, 20, 40, 35]);
          break;

        // UI Clicks & Typewriter Ticks
        case 'click':
        case 'uiclick':
        case 'phonebtn':
        case 'typing':
          this.vibrate([8]);
          break;

        default:
          break;
      }
    },

    // --- Jump-Scare Flash Hook (invoked from game.js function wt) ---
    onFlash(opacity, durationMs) {
      if (!this.enabled) return;
      this.vibrate([100, 40, 160, 30, 200]);
    },

    // --- Dynamic Tension Heartbeat Hook (invoked from game.js function ll) ---
    onNoise(level, isAlert) {
      this.currentNoiseLevel = level;

      if (!this.enabled || !this.heartbeatEnabled) {
        this.stopHeartbeat();
        return;
      }

      // Check if scene is active 3D gameplay
      const g = window.SK_GAME;
      const is3D = !!(g && g.scene && g.scene.player && g.scene.playing);
      const isOverlay = document.getElementById('overlay')?.children.length > 0;

      if (!is3D || isOverlay) {
        this.stopHeartbeat();
        return;
      }

      if (isAlert || level > 0.6) {
        this.startHeartbeat(level, isAlert);
      } else if (level < 0.3 && !isAlert) {
        this.stopHeartbeat();
      }
    },

    startHeartbeat(level, isAlert) {
      if (this.heartbeatActive) return;
      this.heartbeatActive = true;

      const beat = () => {
        if (!this.heartbeatActive) return;

        // Double-thump heartbeat pattern: "lub-DUB"
        this.vibrate([35, 65, 45]);

        // Interval scales dynamically with fear: 750ms down to 260ms
        const progress = Math.min(1, Math.max(0, (this.currentNoiseLevel - 0.5) / 0.5));
        const delay = isAlert ? 280 : Math.round(750 - progress * 480);

        this.heartbeatIntervalId = setTimeout(beat, delay);
      };

      beat();
    },

    stopHeartbeat() {
      this.heartbeatActive = false;
      if (this.heartbeatIntervalId) {
        clearTimeout(this.heartbeatIntervalId);
        this.heartbeatIntervalId = null;
      }
    },

    // --- In-Game Settings Panel Integration ---
    bindSettingsObserver() {
      const overlay = document.getElementById('overlay');
      if (!overlay) return;

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
      if (panel.querySelector('.sk-haptics-settings-row')) return;

      const btns = panel.querySelector('.btns');
      if (!btns) return;

      const container = document.createElement('div');
      container.className = 'sk-haptics-settings-row';
      container.innerHTML = `
        <div class="sk-settings-header">
          <span>📳 Haptics & Vibration (Rezgés)</span>
        </div>
        <div class="setting setting-toggle">
          <div>Haptic feedback (Rezgés)<div class="d">Tactile vibrations for jumpscares, switches, and actions.</div></div>
          <div><div id="sk-toggle-haptics-master" class="toggle ${this.enabled ? 'on' : ''}" role="switch" tabindex="0"></div></div>
        </div>
        <div class="setting setting-toggle">
          <div>Tension heartbeat<div class="d">Rhythmic physical heartbeat pulse when danger is near.</div></div>
          <div><div id="sk-toggle-heartbeat" class="toggle ${this.heartbeatEnabled ? 'on' : ''}" role="switch" tabindex="0"></div></div>
        </div>
        <div class="setting setting-other">
          <div>Haptic intensity<div class="d">Strength of vibration pulses.</div></div>
          <div>
            <div class="players">
              <button id="sk-haptic-subtle" class="btn small ${this.intensity === 'subtle' ? 'primary' : ''}" type="button">Subtle</button>
              <button id="sk-haptic-std" class="btn small ${this.intensity === 'standard' ? 'primary' : ''}" type="button">Standard</button>
              <button id="sk-haptic-heavy" class="btn small ${this.intensity === 'heavy' ? 'primary' : ''}" type="button">Heavy</button>
            </div>
          </div>
        </div>
      `;

      btns.parentNode.insertBefore(container, btns);

      // Wire up toggle handlers
      const masterToggle = container.querySelector('#sk-toggle-haptics-master');
      masterToggle.onclick = () => {
        this.enabled = !this.enabled;
        masterToggle.classList.toggle('on', this.enabled);
        stored.enabled = this.enabled;
        saveSettings(stored);
        if (this.enabled) this.vibrate(25);
      };

      const hbToggle = container.querySelector('#sk-toggle-heartbeat');
      hbToggle.onclick = () => {
        this.heartbeatEnabled = !this.heartbeatEnabled;
        hbToggle.classList.toggle('on', this.heartbeatEnabled);
        stored.heartbeat = this.heartbeatEnabled;
        saveSettings(stored);
        if (this.heartbeatEnabled) this.vibrate([35, 65, 45]);
        else this.stopHeartbeat();
      };

      const setIntensity = (val) => {
        this.intensity = val;
        stored.intensity = val;
        saveSettings(stored);

        container.querySelector('#sk-haptic-subtle').classList.toggle('primary', val === 'subtle');
        container.querySelector('#sk-haptic-std').classList.toggle('primary', val === 'standard');
        container.querySelector('#sk-haptic-heavy').classList.toggle('primary', val === 'heavy');

        this.vibrate([100, 40, 160]);
      };

      container.querySelector('#sk-haptic-subtle').onclick = () => setIntensity('subtle');
      container.querySelector('#sk-haptic-std').onclick = () => setIntensity('standard');
      container.querySelector('#sk-haptic-heavy').onclick = () => setIntensity('heavy');
    }
  };

  window.SK_HAPTICS = SK_HAPTICS;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => SK_HAPTICS.init());
  } else {
    SK_HAPTICS.init();
  }
})();
