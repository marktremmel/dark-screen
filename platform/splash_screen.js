/**
 * splash_screen.js
 * Sötét Képernyő (Dark Screen) - Immersive PSX Artwork Loading & Splash Screen
 * 
 * Features:
 * - Context-aware artwork: matches the location (Stairwell, Metro, School, Arcade, Labyrinth, etc.)
 * - Smooth Ken Burns camera drift & PSX CRT scanline raster
 * - Displays location badges & atmospheric lore tips
 * - Rotating curated gallery on initial cold startup
 * - Seamless dismissal of Capacitor native splash screen
 */

(function () {
  'use strict';

  const SPLASH_REGISTRY = {
    stairwell: {
      src: 'assets/splash/stairwell.jpg',
      badge: 'LÉPCSŐHÁZ · 5. EMELET',
      tip: 'Ismerd meg a normálisat. Ha valami más: fordulj vissza.'
    },
    metro: {
      src: 'assets/splash/metro.jpg',
      badge: '3. METRÓVONAL · ÉJFÉLI PERON',
      tip: 'A régi posztjaid világítanak a falakon. Szedd le őket, mielőtt a Gyűjtő odaér.'
    },
    arcade: {
      src: 'assets/splash/arcade.jpg',
      badge: 'ESŐS ALULJÁRÓ ÉS JÁTÉKTEREM',
      tip: 'Telefonarcú alakok az éjszakában. Olvasd el, majd gépeld a biztonságos választ.'
    },
    school: {
      src: 'assets/splash/school.jpg',
      badge: '7.B OSZTÁLYTEREM ÉS FOLYOSÓ',
      tip: 'Kapcsold ki a képernyőket, amik húzzák a tekinteted. Állj ki amellett, akit bántanak.'
    },
    labyrinth: {
      src: 'assets/splash/labyrinth.jpg',
      badge: 'A SÁRGA SZOBÁK LABIRINTUSA',
      tip: 'Csak akkor mozog, amikor nem figyelsz. Találd meg a kijáratot.'
    },
    lab: {
      src: 'assets/splash/lab.jpg',
      badge: 'SZÁMÍTÁSTECHNIKA LABOR',
      tip: 'Egyetlen kattintás egy gyanús levélre... Zárolva.'
    },
    flat: {
      src: 'assets/splash/flat.jpg',
      badge: 'A PANEL LAKÁS · MENEKÜLŐPONT',
      tip: 'Itt semmi sem árthat neked. Rendezgesd a szobád, és készülj a következő éjszakára.'
    },
    alley: {
      src: 'assets/splash/alley.jpg',
      badge: 'SÖTÉT SIKÁTOR · BUDAPEST',
      tip: 'Minél gyorsabban és pontosabban gépelsz, annál nagyobb biztonságban vagy.'
    },
    dawn: {
      src: 'assets/splash/dawn.jpg',
      badge: 'HAJNAL A TELEPEN',
      tip: 'Túlélted az éjszakát. Az első villamosok már járnak.'
    },
    park: {
      src: 'assets/splash/park.jpg',
      badge: 'KÖDÖS PARK · ALKONYAT',
      tip: 'A zseblámpa fénye mutatja az utat. Figyeld az árnyékokat és a táblákat.'
    }
  };

  const STARTUP_KEYS = ['stairwell', 'metro', 'arcade', 'dawn', 'flat', 'alley', 'park'];

  function detectContext(text) {
    if (!text) return null;
    const lower = text.toLowerCase();
    
    if (lower.includes('stair') || lower.includes('lépcső') || lower.includes('landing') || lower.includes('emelet')) {
      return 'stairwell';
    }
    if (lower.includes('metro') || lower.includes('train') || lower.includes('metró') || lower.includes('vonat') || lower.includes('peron')) {
      return 'metro';
    }
    if (lower.includes('school') || lower.includes('iskola') || lower.includes('osztály') || lower.includes('folyosó')) {
      return 'school';
    }
    if (lower.includes('yellow') || lower.includes('rooms') || lower.includes('labyrinth') || lower.includes('labirint') || lower.includes('sárga')) {
      return 'labyrinth';
    }
    if (lower.includes('underpass') || lower.includes('aluljáró') || lower.includes('arcade') || lower.includes('játék')) {
      return 'arcade';
    }
    if (lower.includes('outside') || lower.includes('walk') || lower.includes('park') || lower.includes('séta') || lower.includes('udvar')) {
      return 'alley';
    }
    if (lower.includes('lab') || lower.includes('labor') || lower.includes('computer')) {
      return 'lab';
    }
    if (lower.includes('flat') || lower.includes('home') || lower.includes('otthon') || lower.includes('szoba') || lower.includes('morning') || lower.includes('reggel')) {
      return 'flat';
    }
    if (lower.includes('episode 1') || lower.includes('ep1')) return 'flat';
    if (lower.includes('episode 2') || lower.includes('ep2')) return 'stairwell';
    if (lower.includes('episode 3') || lower.includes('ep3')) return 'alley';
    if (lower.includes('episode 4') || lower.includes('ep4')) return 'arcade';
    if (lower.includes('episode 5') || lower.includes('ep5')) return 'metro';
    if (lower.includes('episode 6') || lower.includes('ep6')) return 'flat';
    if (lower.includes('episode 7') || lower.includes('ep7')) return 'arcade';
    if (lower.includes('episode 8') || lower.includes('ep8')) return 'school';
    if (lower.includes('episode 9') || lower.includes('ep9')) return 'stairwell';

    return null;
  }

  class SplashScreenManager {
    constructor() {
      this.currentKey = null;
      this.activeLayer = 'a';
      this.initDom();
      this.initObserver();
      this.setRandomStartup();
    }

    initDom() {
      const loading = document.getElementById('loading');
      if (!loading) return;

      // Ensure proper internal structure if not already rendered
      let backdrop = document.getElementById('loading-backdrop');
      if (!backdrop) {
        backdrop = document.createElement('div');
        backdrop.id = 'loading-backdrop';
        backdrop.className = 'loading-backdrop';
        backdrop.innerHTML = `
          <div id="loading-art-a" class="loading-art active"></div>
          <div id="loading-art-b" class="loading-art"></div>
          <div class="loading-vignette"></div>
          <div class="loading-scanlines"></div>
        `;
        loading.insertBefore(backdrop, loading.firstChild);
      }

      let stageEl = document.getElementById('lstage');
      if (!stageEl) {
        stageEl = document.createElement('div');
        stageEl.id = 'lstage';
        stageEl.className = 'loading-stage';
        const lbar = document.getElementById('lbar');
        if (lbar) loading.insertBefore(stageEl, lbar);
      }

      let quoteEl = document.getElementById('lquote');
      if (!quoteEl) {
        quoteEl = document.createElement('div');
        quoteEl.id = 'lquote';
        quoteEl.className = 'loading-quote';
        loading.appendChild(quoteEl);
      }

      this.artA = document.getElementById('loading-art-a');
      this.artB = document.getElementById('loading-art-b');
      this.stageEl = stageEl;
      this.quoteEl = quoteEl;
      this.lmsg = document.getElementById('lmsg');
      this.loadingEl = loading;
    }

    setRandomStartup() {
      const idx = Math.floor(Math.random() * STARTUP_KEYS.length);
      const key = STARTUP_KEYS[idx];
      this.applyArtwork(key, true);
    }

    applyArtwork(key, immediate = false) {
      if (!key || !SPLASH_REGISTRY[key]) return;
      if (this.currentKey === key && !immediate) return;

      this.currentKey = key;
      const data = SPLASH_REGISTRY[key];

      const nextTarget = this.activeLayer === 'a' ? this.artB : this.artA;
      const currTarget = this.activeLayer === 'a' ? this.artA : this.artB;

      if (nextTarget) {
        nextTarget.style.backgroundImage = `url("${data.src}")`;
        nextTarget.classList.add('active');
        if (currTarget) currTarget.classList.remove('active');
        this.activeLayer = this.activeLayer === 'a' ? 'b' : 'a';
      }

      if (this.stageEl) {
        this.stageEl.textContent = `[ ${data.badge} ]`;
      }
      if (this.quoteEl) {
        this.quoteEl.textContent = `„${data.tip}”`;
      }
    }

    initObserver() {
      if (!this.loadingEl || !this.lmsg) return;

      // Monitor loading message text changes to switch context artwork
      const msgObserver = new MutationObserver(() => {
        const text = this.lmsg.textContent || '';
        const detected = detectContext(text);
        if (detected) {
          this.applyArtwork(detected);
        }
      });
      msgObserver.observe(this.lmsg, { childList: true, characterData: true, subtree: true });

      // Monitor loading element class changes (hidden state)
      const classObserver = new MutationObserver(() => {
        const isHidden = this.loadingEl.classList.contains('hidden');
        if (isHidden) {
          this.onLoadingComplete();
        }
      });
      classObserver.observe(this.loadingEl, { attributes: true, attributeFilter: ['class'] });
    }

    onLoadingComplete() {
      // Dismiss Capacitor native splash screen with smooth fade
      if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.SplashScreen) {
        try {
          window.Capacitor.Plugins.SplashScreen.hide({ fadeOutDuration: 450 });
        } catch (e) {
          console.warn('Capacitor splash dismiss:', e);
        }
      }
    }
  }

  // Initialize once DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      window.SK_SPLASH = new SplashScreenManager();
    });
  } else {
    window.SK_SPLASH = new SplashScreenManager();
  }
})();
