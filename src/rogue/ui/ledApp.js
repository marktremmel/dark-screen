// The smart LED strip and its phone app. A small IoT story the player lives with:
// the strip arrives with a default password, old firmware and "control from anywhere" switched on. Leave it like that,
// and after a night out someone else is running a light show in your flat until you secure it. (Mark, 24 Oct)
import { openScreen, closeScreen } from '../../ui/screens.js';
import { play } from '../../core/audio.js';

export const LED_COLORS = ['#ff5ab4', '#9a5cff', '#4aa8ff', '#3fe0c0', '#7dff6a', '#ffd23a', '#ff8a3a', '#ff3b3b', '#ffffff'];
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function ledState(life) { return life.leds = life.leds || { color: '#9a5cff', fw: false, pw: false, remote: true, hacked: false, since: null }; }
export const ledSecure = s => s.fw && s.pw && !s.remote;

/** The app. Resolves when closed; changes the state in place. */
export function ledApp(life, nick) {
  return new Promise(res => {
    const s = ledState(life);
    const el = openScreen(`<div class="panel" style="width:min(560px,94vw);max-height:94vh;overflow:auto"><h2>GlowLink (the LED app)</h2><div id="b"></div>
      <div class="btns"><button class="btn" id="x">Close (Esc)</button></div></div>`);
    const body = el.querySelector('#b');
    const draw = () => {
      const lock = s.hacked && !ledSecure(s);
      body.innerHTML = `${s.hacked ? `<div style="background:#3a0a1a;border:1px solid #ff4a7a;border-radius:8px;padding:8px 10px;margin-bottom:8px">${ledSecure(s) ? '<b>Back in your hands.</b> The light show stopped. Nobody else can get in now.' : `<b>UNICORN PARTY MODE</b> by <i>n1ghtwatch</i>. Someone logged in to your lights from outside. Secure the strip to take them back: all three settings below.`}</div>` : ''}
        <h3 style="margin:6px 0">Colour</h3>
        <div style="display:flex;flex-wrap:wrap;gap:6px">${LED_COLORS.map(c => `<button class="btn small" data-c="${c}" ${lock ? 'disabled style="opacity:.35;' : 'style="'}background:${c};width:42px;height:32px;outline:${s.color === c ? '3px solid #fff' : 'none'}"></button>`).join('')}</div>
        <h3 style="margin:12px 0 6px">Settings (beállítások)</h3>
        <div class="setting"><div>Firmware <span class="sub">${s.fw ? 'v2.4.1, up to date' : 'v1.0.2 · update available (security fixes)'}</span></div><div>${s.fw ? '✓' : '<button class="btn small" id="fw">Update</button>'}</div></div>
        <div class="setting"><div>Password <span class="sub">${s.pw ? 'your own' : 'admin (the factory default, the same on every strip)'}</span>
          ${s.pw ? '' : '<div style="margin-top:4px"><input id="pw" type="password" placeholder="a new password, 12+ characters" style="width:100%"></div><div class="err" id="pe"></div>'}</div><div>${s.pw ? '✓' : '<button class="btn small" id="pwb">Set</button>'}</div></div>
        <div class="setting"><div>Control from anywhere <span class="sub">${s.remote ? 'on: the strip listens to the whole internet' : 'off: only from home Wi-Fi'}</span></div><div><button class="btn small" id="rm">${s.remote ? 'Switch off' : 'Off ✓'}</button></div></div>
        <p class="sub" style="font-size:.82em">${ledSecure(s) ? 'Secured. Smart devices are small computers: update them, give them their own password, and only open them to the internet if you need to.' : 'Smart devices (okoseszközök) ship with default passwords and old software. Attackers scan the internet for exactly these.'}</p>`;
      body.querySelectorAll('[data-c]').forEach(b => b.onclick = () => { if (lock) return; s.color = b.dataset.c; play('beep', { vol: 0.25, rate: 1.3 }); draw(); });
      const fw = body.querySelector('#fw'); if (fw) fw.onclick = () => { fw.disabled = true; fw.textContent = 'Updating…'; setTimeout(() => { s.fw = true; play('beep', { vol: 0.3, rate: 1.5 }); draw(); }, 1600); };
      const pwb = body.querySelector('#pwb'); if (pwb) pwb.onclick = () => {
        const v = body.querySelector('#pw').value, e = body.querySelector('#pe');
        if (v.length < 12) { e.textContent = 'At least 12 characters. A short sentence works well.'; return; }
        if (/admin|1234|password|jelszo|qwerty/i.test(v) || (nick && v.toLowerCase().includes(nick.toLowerCase()))) { e.textContent = 'Too easy to guess. Leave out your name and the usual words.'; return; }
        s.pw = true; play('beep', { vol: 0.3, rate: 1.5 }); draw();
      };
      const pw = body.querySelector('#pw'); if (pw) pw.addEventListener('keydown', e => e.stopPropagation());
      body.querySelector('#rm').onclick = () => { if (s.remote) { s.remote = false; play('click', { vol: 0.4 }); draw(); } };
    };
    const key = e => { if (e.code === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); done(); } };
    const done = () => { removeEventListener('keydown', key, true); closeScreen(el); res(); };
    setTimeout(() => addEventListener('keydown', key, true), 150);
    el.querySelector('#x').onclick = done;
    draw();
  });
}
