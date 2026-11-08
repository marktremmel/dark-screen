/**
 * SÖTÉT KÉPERNYŐ (Dark Screen) - Cross-Platform Virtual Keyboard & Typing Alternatives
 * Phase 3: Smart Suggestion Chips ("Autocorrect" Alternative), On-Screen Numpad, and Mobile Input Protector
 */

(function () {
  'use strict';

  function vibrate(ms) {
    if (window.SK_HAPTICS && typeof window.SK_HAPTICS.vibrate === 'function') {
      window.SK_HAPTICS.vibrate(ms);
      return;
    }
    if (window.Capacitor?.Plugins?.Haptics) {
      window.Capacitor.Plugins.Haptics.impact({ style: 'LIGHT' }).catch(() => {});
      return;
    }
    if (navigator.vibrate) {
      try { navigator.vibrate(ms); } catch (_) {}
    }
  }

  function playKeyClick() {
    try {
      if (window.SK_AUDIO && typeof window.SK_AUDIO.play === 'function') {
        window.SK_AUDIO.play('click', { vol: 0.12, rate: 1.4 });
      }
    } catch (_) {}
  }

  const SK_KEYBOARD = {
    active: false,
    keyboardOpen: false,
    chipsMode: true, // Default to convenient suggestion chips
    activeTargetElement: null,
    activeTypingInstance: null,

    init() {
      const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
      this.active = isTouch;

      this.createDOM();
      this.bindDOMObserver();
      this.bindVisualViewport();
      this.enforceInputFontSizes();

      console.log('[SK_KEYBOARD] Initialized. Touch device:', isTouch);
    },

    // Send single character via synthetic KeyboardEvent into game.js cm() listener
    dispatchKey(char) {
      const code = char === ' ' ? 'Space'
        : (/^[0-9]$/.test(char) ? 'Digit' + char
        : 'Key' + char.toUpperCase());

      const ev = new KeyboardEvent('keydown', {
        key: char,
        code: code,
        bubbles: true,
        cancelable: true
      });

      window.dispatchEvent(ev);
      playKeyClick();
      vibrate(10);
    },

    // Smooth sequential typing of a full word or phrase (Autocorrect / Chip tap)
    typeString(str, onComplete) {
      let idx = 0;
      const step = () => {
        if (idx >= str.length) {
          if (onComplete) onComplete();
          return;
        }
        const ch = str[idx++];
        this.dispatchKey(ch);
        setTimeout(step, 28);
      };
      step();
    },

    createDOM() {
      if (document.getElementById('sk-keyboard-root')) return;

      const root = document.createElement('div');
      root.id = 'sk-keyboard-root';
      root.className = 'sk-keyboard-layer';
      root.innerHTML = `
        <!-- Smart Word Suggestion Bar (Autocorrect Alternative) -->
        <div id="sk-suggest-bar" class="sk-suggest-container hidden">
          <div class="sk-suggest-header">
            <span class="sk-suggest-title">QUICK INPUT / AUTOCORRECT</span>
            <div style="display:flex;gap:6px;align-items:center;">
              <button id="sk-min-kb-btn" class="sk-btn-micro" type="button" title="Minimize / Hide">▾ HIDE</button>
              <button id="sk-toggle-kb-btn" class="sk-btn-micro" type="button" title="Toggle On-Screen Keyboard">⌨ KEYS</button>
            </div>
          </div>
          <div id="sk-chips-list" class="sk-chips-row"></div>
        </div>

        <!-- Floating Expand Pill (When Minimized) -->
        <button id="sk-expand-chips-btn" class="sk-expand-pill hidden" type="button">⌨ QUICK TYPE ▴</button>

        <!-- On-Screen Virtual Keyboard (QWERTY & Symbols) -->
        <div id="sk-virtual-keyboard" class="sk-vkeyboard hidden">
          <div class="sk-vk-topbar">
            <span class="sk-vk-title">PSX VIRTUAL TERMINAL</span>
            <div style="display:flex;gap:6px;align-items:center;">
              <button id="sk-vk-chips-btn" class="sk-btn-micro" type="button" title="Quick Word Chips">▲ CHIPS</button>
              <button id="sk-vk-close" class="sk-btn-micro" type="button">✕ HIDE</button>
            </div>
          </div>
          <div class="sk-vk-grid">
            <div class="sk-vk-row" data-row="1"></div>
            <div class="sk-vk-row" data-row="2"></div>
            <div class="sk-vk-row" data-row="3"></div>
            <div class="sk-vk-row sk-vk-bottom" data-row="4"></div>
          </div>
        </div>

        <!-- Quick Numeric / Code Pad for PINs & Passwords -->
        <div id="sk-numpad" class="sk-numpad-container hidden">
          <div class="sk-numpad-title">KEYPAD // ENTER PIN</div>
          <div class="sk-numpad-chips">
            <button class="sk-nchip" data-val="0000">0000 (Default)</button>
            <button class="sk-nchip" data-val="1234">1234</button>
            <button class="sk-nchip" data-val="admin">admin</button>
          </div>
          <div class="sk-numpad-grid">
            <button class="sk-np-key" data-k="1">1</button>
            <button class="sk-np-key" data-k="2">2</button>
            <button class="sk-np-key" data-k="3">3</button>
            <button class="sk-np-key" data-k="4">4</button>
            <button class="sk-np-key" data-k="5">5</button>
            <button class="sk-np-key" data-k="6">6</button>
            <button class="sk-np-key" data-k="7">7</button>
            <button class="sk-np-key" data-k="8">8</button>
            <button class="sk-np-key" data-k="9">9</button>
            <button class="sk-np-key sk-np-action" data-action="backspace">⌫</button>
            <button class="sk-np-key" data-k="0">0</button>
            <button class="sk-np-key sk-np-submit" data-action="submit">OK</button>
          </div>
        </div>
      `;

      document.body.appendChild(root);

      this.els = {
        root: root,
        suggestBar: document.getElementById('sk-suggest-bar'),
        chipsList: document.getElementById('sk-chips-list'),
        minKbBtn: document.getElementById('sk-min-kb-btn'),
        toggleKbBtn: document.getElementById('sk-toggle-kb-btn'),
        expandChipsBtn: document.getElementById('sk-expand-chips-btn'),
        vkeyboard: document.getElementById('sk-virtual-keyboard'),
        vkClose: document.getElementById('sk-vk-close'),
        vkChipsBtn: document.getElementById('sk-vk-chips-btn'),
        numpad: document.getElementById('sk-numpad')
      };

      this.buildKeyboardKeys();
      this.bindKeyboardEvents();
      this.bindNumpadEvents();
    },

    // Build standard QWERTY layout keys
    buildKeyboardKeys() {
      if (!this.els.vkeyboard) return;

      const rows = [
        ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
        ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
        ['Z', 'X', 'C', 'V', 'B', 'N', 'M', '-', '_']
      ];

      rows.forEach((rowKeys, idx) => {
        const rowEl = this.els.vkeyboard.querySelector(`[data-row="${idx + 1}"]`);
        if (!rowEl) return;
        rowKeys.forEach(k => {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'sk-vk-key';
          btn.textContent = k;
          btn.dataset.k = k;
          rowEl.appendChild(btn);
        });
      });

      // Bottom control row
      const bottomEl = this.els.vkeyboard.querySelector('[data-row="4"]');
      if (bottomEl) {
        bottomEl.innerHTML = `
          <button class="sk-vk-key sk-vk-wide" data-k="123" type="button">123</button>
          <button class="sk-vk-key sk-vk-space" data-k=" " type="button">SPACE</button>
          <button class="sk-vk-key sk-vk-wide" data-action="backspace" type="button">⌫ DEL</button>
          <button class="sk-vk-key sk-vk-action" data-action="enter" type="button">ENTER</button>
        `;
      }
    },

    bindKeyboardEvents() {
      const vk = this.els.vkeyboard;
      if (!vk) return;

      vk.addEventListener('pointerdown', (e) => {
        const btn = e.target.closest('button');
        if (!btn) return;
        e.preventDefault();
        e.stopPropagation();

        btn.classList.add('active');
        setTimeout(() => btn.classList.remove('active'), 120);

        if (btn.dataset.k) {
          if (btn.dataset.k === '123') {
            this.toggleNumbersMode(btn);
          } else {
            this.dispatchKey(btn.dataset.k);
          }
        } else if (btn.dataset.action === 'backspace') {
          window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace', code: 'Backspace', bubbles: true }));
          playKeyClick();
          vibrate(12);
        } else if (btn.dataset.action === 'enter') {
          window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true }));
          playKeyClick();
          vibrate(18);
        }
      });

      if (this.els.toggleKbBtn) {
        this.els.toggleKbBtn.onclick = () => {
          if (this.keyboardOpen) {
            this.closeVirtualKeyboard();
          } else {
            this.openVirtualKeyboard();
          }
          vibrate(15);
        };
      }

      if (this.els.vkClose) {
        this.els.vkClose.onclick = () => {
          this.closeVirtualKeyboard();
          vibrate(15);
        };
      }

      if (this.els.vkChipsBtn) {
        this.els.vkChipsBtn.onclick = () => {
          this.closeVirtualKeyboard();
          if (this.els.suggestBar) this.els.suggestBar.classList.remove('hidden');
          vibrate(15);
        };
      }

      if (this.els.minKbBtn) {
        this.els.minKbBtn.onclick = () => {
          this.minimized = true;
          this.closeVirtualKeyboard();
          if (this.els.suggestBar) this.els.suggestBar.classList.add('hidden');
          if (this.els.expandChipsBtn) this.els.expandChipsBtn.classList.remove('hidden');
          vibrate(15);
        };
      }

      if (this.els.expandChipsBtn) {
        this.els.expandChipsBtn.onclick = () => {
          this.minimized = false;
          this.els.expandChipsBtn.classList.add('hidden');
          if (!this.keyboardOpen && this.els.suggestBar) {
            this.els.suggestBar.classList.remove('hidden');
          }
          vibrate(15);
        };
      }
    },

    openVirtualKeyboard() {
      this.keyboardOpen = true;
      document.body.classList.add('sk-keyboard-open');
      if (this.els.vkeyboard) this.els.vkeyboard.classList.remove('hidden');
      if (this.els.suggestBar) this.els.suggestBar.classList.add('hidden');
      if (this.els.toggleKbBtn) this.els.toggleKbBtn.textContent = '▲ CHIPS';
    },

    closeVirtualKeyboard() {
      this.keyboardOpen = false;
      document.body.classList.remove('sk-keyboard-open');
      if (this.els.vkeyboard) this.els.vkeyboard.classList.add('hidden');
      if ((this.currentTyb || this.activeWave) && !this.minimized && this.els.suggestBar) {
        this.els.suggestBar.classList.remove('hidden');
      }
      if (this.els.toggleKbBtn) this.els.toggleKbBtn.textContent = '⌨ KEYS';
    },

    toggleNumbersMode(btn) {
      const isNum = btn.textContent === '123';
      btn.textContent = isNum ? 'ABC' : '123';
      const row1 = this.els.vkeyboard.querySelector('[data-row="1"]');
      const numKeys = isNum ? ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0']
                            : ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'];
      const buttons = row1.querySelectorAll('.sk-vk-key');
      buttons.forEach((b, i) => {
        b.textContent = numKeys[i];
        b.dataset.k = numKeys[i];
      });
      vibrate(15);
    },

    bindNumpadEvents() {
      const np = this.els.numpad;
      if (!np) return;

      np.addEventListener('pointerdown', (e) => {
        const btn = e.target.closest('button');
        if (!btn) return;
        e.preventDefault();
        e.stopPropagation();

        btn.classList.add('active');
        setTimeout(() => btn.classList.remove('active'), 120);

        if (btn.dataset.k) {
          this.insertIntoActiveInput(btn.dataset.k);
          playKeyClick();
          vibrate(10);
        } else if (btn.dataset.val) {
          // Quick Chip (e.g. 0000)
          if (this.activeTargetElement) {
            this.activeTargetElement.value = btn.dataset.val;
            this.activeTargetElement.dispatchEvent(new Event('input', { bubbles: true }));
          }
          playKeyClick();
          vibrate(18);
        } else if (btn.dataset.action === 'backspace') {
          if (this.activeTargetElement) {
            this.activeTargetElement.value = this.activeTargetElement.value.slice(0, -1);
            this.activeTargetElement.dispatchEvent(new Event('input', { bubbles: true }));
          }
          playKeyClick();
          vibrate(12);
        } else if (btn.dataset.action === 'submit') {
          if (this.activeTargetElement) {
            // Find nearby submit button in modal
            const panel = this.activeTargetElement.closest('.panel') || document.getElementById('overlay');
            const submitBtn = panel ? (panel.querySelector('#ok') || panel.querySelector('#pwok') || panel.querySelector('.primary')) : null;
            if (submitBtn) {
              submitBtn.click();
            } else {
              this.activeTargetElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true }));
            }
          }
          this.hideNumpad();
          vibrate(20);
        }
      });
    },

    insertIntoActiveInput(char) {
      if (!this.activeTargetElement) return;
      const el = this.activeTargetElement;
      const max = el.maxLength > 0 ? el.maxLength : 999;
      if (el.value.length < max) {
        el.value += char;
        el.dispatchEvent(new Event('input', { bubbles: true }));
      }
    },

    showNumpad(targetInput) {
      this.activeTargetElement = targetInput;
      this.els.numpad.classList.remove('hidden');

      // Position numpad near the input or docked cleanly
      const rect = targetInput.getBoundingClientRect();
      const pad = this.els.numpad;
      if (window.innerWidth > 600) {
        pad.style.position = 'fixed';
        pad.style.left = `${Math.min(window.innerWidth - 260, Math.max(10, rect.left))}px`;
        pad.style.top = `${Math.min(window.innerHeight - 300, rect.bottom + 10)}px`;
      }
    },

    hideNumpad() {
      this.els.numpad.classList.add('hidden');
      this.activeTargetElement = null;
    },

    // DOM Observer watching for .tyb (typing prompt), .tyl (wave targets), and inputs
    bindDOMObserver() {
      const observer = new MutationObserver((mutations) => {
        for (const m of mutations) {
          // Check for added nodes
          for (const node of m.addedNodes) {
            if (node.nodeType !== 1) continue;

            // 1. Detected modal typing prompt (.tyb)
            if (node.classList && node.classList.contains('tyb')) {
              this.handleTypingPromptOpened(node);
            } else if (node.querySelector && node.querySelector('.tyb')) {
              this.handleTypingPromptOpened(node.querySelector('.tyb'));
            }

            // 2. Detected input/password fields in modals
            const inputs = node.matches && node.matches('input') ? [node] : (node.querySelectorAll ? [...node.querySelectorAll('input')] : []);
            inputs.forEach(inp => this.attachInputHelper(inp));
          }

          // Check for removed nodes
          for (const node of m.removedNodes) {
            if (node.nodeType !== 1) continue;
            if (node.classList && node.classList.contains('tyb')) {
              this.handleTypingPromptClosed();
            }
          }
        }
      });

      observer.observe(document.body, { childList: true, subtree: true });

      // Scan existing elements
      document.querySelectorAll('.tyb').forEach(tyb => this.handleTypingPromptOpened(tyb));
      document.querySelectorAll('input').forEach(inp => this.attachInputHelper(inp));

      // Periodic scanner ensures wave targets (.tyl) in Courtyard & Stairwell are caught instantly
      this.startTypingScanner();
    },

    startTypingScanner() {
      if (this._scannerInterval) return;
      this._scannerInterval = setInterval(() => {
        this.scanTypingState();
      }, 180);
    },

    scanTypingState() {
      // 1. Check for modal typing prompt (.tyb)
      const tyb = document.querySelector('.tyb');
      if (tyb && tyb.offsetParent !== null) {
        if (!this.currentTyb || this.currentTyb !== tyb) {
          this.currentTyb = tyb;
          this.activeWave = false;
          this.handleTypingPromptOpened(tyb);
        }
        return;
      } else if (this.currentTyb) {
        this.currentTyb = null;
        this.handleTypingPromptClosed();
      }

      // 2. Check for creature wave badges (.tyl) in Courtyard, Stairwell, etc.
      const tylList = [...document.querySelectorAll('.tyl')].filter(el => {
        return el.style.display !== 'none';
      });

      if (tylList.length > 0) {
        // Make every creature badge touchable
        tylList.forEach(t => {
          if (!t._skTouchBound) {
            t._skTouchBound = true;
            t.style.pointerEvents = 'auto';
            t.style.cursor = 'pointer';
            t.addEventListener('pointerdown', (e) => {
              e.preventDefault();
              e.stopPropagation();
              const p = t.querySelector('.p');
              const text = p ? (p.textContent || '').trim() : '';
              if (text) {
                this.typeString(text);
              }
            });
          }
        });

        // Find the locked creature or first visible creature
        const lockedTyl = tylList.find(el => el.classList.contains('lock')) || tylList[0];
        const pEl = lockedTyl ? lockedTyl.querySelector('.p') : null;
        const targetText = pEl ? (pEl.textContent || '').trim() : '';

        if (targetText) {
          if (targetText !== this.lastWaveTarget) {
            this.lastWaveTarget = targetText;
            this.activeWave = true;
            if (!this.minimized) {
              this.els.suggestBar.classList.remove('hidden');
            } else if (this.els.expandChipsBtn) {
              this.els.expandChipsBtn.classList.remove('hidden');
            }
            this.renderSuggestionChips(targetText, lockedTyl);
          }

          // Update highlighted chip
          const doneText = lockedTyl.querySelector('.ty-done')?.textContent || '';
          this.updateChipsState(doneText);
        }
        return;
      }

      // 3. Neither .tyb nor .tyl is active
      if (this.activeWave) {
        this.activeWave = false;
        this.lastWaveTarget = null;
        this.handleTypingPromptClosed();
        if (this.els.expandChipsBtn) {
          this.els.expandChipsBtn.classList.add('hidden');
        }
      }
    },

    // Handle .tyb typing prompt opened (Rogue / Maze / Tasks)
    handleTypingPromptOpened(tybEl) {
      if (!this.minimized) {
        this.els.suggestBar.classList.remove('hidden');
      } else if (this.els.expandChipsBtn) {
        this.els.expandChipsBtn.classList.remove('hidden');
      }

      // Extract full target phrase
      const pEl = tybEl.querySelector('.p');
      if (!pEl) return;

      const fullText = pEl.textContent || '';
      this.renderSuggestionChips(fullText, tybEl);

      // Re-observe .p for active character changes
      const pObserver = new MutationObserver(() => {
        const curChar = tybEl.querySelector('.ty-cur');
        const doneText = (tybEl.querySelector('.ty-done')?.textContent || '');
        this.updateChipsState(doneText);
      });
      pObserver.observe(pEl, { childList: true, characterData: true, subtree: true });
      tybEl._pObserver = pObserver;
    },

    handleTypingPromptClosed() {
      this.closeVirtualKeyboard();
      if (this.els.suggestBar) {
        this.els.suggestBar.classList.add('hidden');
      }
      this.els.chipsList.innerHTML = '';
      if (this.els.expandChipsBtn) {
        this.els.expandChipsBtn.classList.add('hidden');
      }
    },

    // Render word chips for the prompt
    renderSuggestionChips(text, tybEl) {
      const list = this.els.chipsList;
      list.innerHTML = '';

      // Break sentence into words
      const words = text.trim().split(/\s+/).filter(Boolean);
      if (words.length === 0) return;


      words.forEach((word, idx) => {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'sk-chip';
        chip.textContent = word;
        chip.dataset.word = word;
        chip.dataset.idx = idx;

        chip.onclick = (e) => {
          e.preventDefault();
          e.stopPropagation();

          // Type out the word + space
          const suffix = (idx < words.length - 1) ? ' ' : '';
          this.typeString(word + suffix, () => {
            chip.classList.add('done');
          });
        };

        list.appendChild(chip);
      });

      this.updateChipsState('');
    },

    // Update active highlight of chips as player types
    updateChipsState(doneText) {
      const chips = this.els.chipsList.querySelectorAll('.sk-chip');
      let charCount = 0;

      chips.forEach(chip => {
        const word = chip.dataset.word;
        const wordStart = charCount;
        const wordEnd = wordStart + word.length;

        if (doneText.length >= wordEnd) {
          chip.classList.add('done');
          chip.classList.remove('current');
        } else if (doneText.length >= wordStart) {
          chip.classList.remove('done');
          chip.classList.add('current');
        } else {
          chip.classList.remove('done', 'current');
        }

        charCount += word.length + 1; // account for space
      });
    },

    // Helper for input and password fields
    attachInputHelper(input) {
      if (input._skBound) return;
      input._skBound = true;

      // Check if it is a PIN, code, or password input (#k, #nc, #pw)
      const isCodeInput = input.id === 'k' || input.id === 'nc' || input.id === 'pw' || input.type === 'password';

      if (isCodeInput) {
        input.addEventListener('focus', () => {
          this.showNumpad(input);
        });

        input.addEventListener('blur', () => {
          // Delay hide so tap on numpad buttons registers
          setTimeout(() => {
            if (document.activeElement !== input && !this.els.numpad.contains(document.activeElement)) {
              this.hideNumpad();
            }
          }, 250);
        });
      }
    },

    // VisualViewport API: prevent mobile keyboard from pushing canvas or hiding input
    bindVisualViewport() {
      if (!window.visualViewport) return;

      window.visualViewport.addEventListener('resize', () => {
        const vh = window.visualViewport.height;
        const isKeyboardUp = vh < (window.innerHeight * 0.75);

        document.body.classList.toggle('sk-softkeyboard-up', isKeyboardUp);

        // If an input is focused, scroll it into view smoothly
        const activeEl = document.activeElement;
        if (isKeyboardUp && activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) {
          setTimeout(() => {
            activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, 100);
        }
      });
    },

    // Ensure inputs are never smaller than 16px to prevent iOS Safari auto-zoom
    enforceInputFontSizes() {
      const style = document.createElement('style');
      style.id = 'sk-mobile-input-protect';
      style.textContent = `
        @media (max-width: 900px), (pointer: coarse) {
          input[type=text], input[type=password], input[type=number], textarea {
            font-size: 16px !important;
          }
        }
      `;
      document.head.appendChild(style);
    }
  };

  window.SK_KEYBOARD = SK_KEYBOARD;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => SK_KEYBOARD.init());
  } else {
    SK_KEYBOARD.init();
  }
})();
