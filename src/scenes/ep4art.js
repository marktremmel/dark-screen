// Illustrations for Episode 4 (all invented people and places).
// Painted images when the ep4 pack has them, flat SVGs otherwise.
import { A } from '../core/assets.js';
const photo = (k, extra = '', h = 300) => A.img[k] ? `<svg viewBox="0 0 300 ${h}" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice" style="width:100%;height:100%;display:block">${extra.startsWith('<defs') ? extra.split('</defs>')[0] + '</defs>' : ''}<image href="${A.img[k]}" x="0" y="0" width="300" height="${h}" preserveAspectRatio="xMidYMid slice" ${extra.includes('id="bl"') ? 'filter="url(#bl)"' : ''}/>${extra.startsWith('<defs') ? extra.split('</defs>')[1] : extra}</svg>` : null;
const svg = (body, vb = '0 0 300 300', ar = 'xMidYMid slice') => `<svg viewBox="${vb}" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="${ar}" style="width:100%;height:100%;display:block">${body}</svg>`;
const T = (x, y, s, t, fill = '#fff', extra = '') => `<text x="${x}" y="${y}" font-size="${s}" font-family="Impact,Arial Black,Arial" font-weight="900" fill="${fill}" stroke="#000" stroke-width="${s / 9}" paint-order="stroke" text-anchor="middle" ${extra}>${t}</text>`;

// the meme about Lili: a cartoon girl singing at the school concert, made "funny" with stickers
export function meme() {
  const ph = photo('ep4_meme', `<text x="40" y="210" font-size="34">😂</text><text x="225" y="232" font-size="34">💀</text><text x="215" y="120" font-size="24">😂</text>${T(150, 40, 30, 'WHEN LILI SINGS')}${T(150, 288, 26, 'CALL AN AMBULANCE 💀')}`); if (ph) return ph;
  return svg(`<rect width="300" height="300" fill="#2a1840"/>
  <path d="M0 300 L60 120 L90 300 Z M300 300 L240 120 L210 300 Z" fill="rgba(255,230,150,.16)"/>
  <rect y="230" width="300" height="70" fill="#5a2d1e"/>
  <ellipse cx="150" cy="105" rx="42" ry="48" fill="#4a2a18"/>
  <ellipse cx="150" cy="118" rx="33" ry="38" fill="#f0c6a2"/>
  <ellipse cx="150" cy="140" rx="12" ry="16" fill="#5a1a1a"/>
  <circle cx="137" cy="108" r="4" fill="#222"/><circle cx="163" cy="108" r="4" fill="#222"/>
  <path d="M95 300 C 95 210, 120 175, 150 172 C 180 175, 205 210, 205 300 Z" fill="#3d6bb3"/>
  <rect x="182" y="150" width="8" height="40" rx="3" fill="#333"/><circle cx="186" cy="146" r="9" fill="#555"/>
  <text x="70" y="90" font-size="30">🎵</text><text x="210" y="70" font-size="26">🎶</text>
  <text x="40" y="200" font-size="34">😂</text><text x="225" y="215" font-size="34">💀</text><text x="200" y="135" font-size="24">😂</text>
  ${T(150, 40, 30, 'WHEN LILI SINGS')}${T(150, 288, 26, 'CALL AN AMBULANCE 💀')}`);
}
// an edited photo of the player or of Bence: clown nose, scribbles, a caption
export function yourTurn(name, col = '#7a1f2b') {
  const me = col === '#7a1f2b';
  const F = me ? { nx: 167, ny: 126, by: 96, bx: 118, my: 150, mx: 140 } : { nx: 151, ny: 157, by: 112, bx: 102, my: 182, mx: 124 };
  const ph = photo(me ? 'ep4_turn_player' : 'ep4_turn_bence', `<circle cx="${F.nx}" cy="${F.ny}" r="10" fill="#e2231a"/>
    <path d="M${F.bx} ${F.by} q 18 -14 34 -2 M${F.bx + 44} ${F.by - 2} q 18 -12 34 2" stroke="#111" stroke-width="5" fill="none"/>
    <path d="M${F.mx} ${F.my} q 28 20 56 0" stroke="#e2231a" stroke-width="5" fill="none"/>
    <path d="M40 70 l40 30 M250 60 l-30 40 M40 250 l60 -20" stroke="#e2231a" stroke-width="4" opacity=".8"/>
    ${T(150, 42, 34, `${name.toUpperCase()} 🤡`)}${T(150, 284, 32, 'SNITCH?', '#ffde3a')}`); if (ph) return ph;
  return svg(`<rect width="300" height="300" fill="#cfd6dc"/>
  <ellipse cx="150" cy="118" rx="44" ry="50" fill="#3a2a22"/>
  <ellipse cx="150" cy="130" rx="35" ry="40" fill="#e2b493"/>
  <path d="M65 300 C 65 215, 100 178, 150 175 C 200 178, 235 215, 235 300 Z" fill="${col}"/>
  <circle cx="135" cy="122" r="4" fill="#222"/><circle cx="165" cy="122" r="4" fill="#222"/>
  <circle cx="150" cy="140" r="11" fill="#e2231a"/>
  <path d="M118 112 q 17 -14 30 0 M152 112 q 17 -14 30 0" stroke="#111" stroke-width="5" fill="none"/>
  <path d="M120 160 q 30 22 60 0" stroke="#e2231a" stroke-width="6" fill="none"/>
  <path d="M60 60 l40 30 M240 50 l-30 40 M50 250 l60 -20" stroke="#e2231a" stroke-width="4" opacity=".8"/>
  ${T(150, 42, 34, `${name.toUpperCase()} 🤡`)}${T(150, 284, 32, 'SNITCH?', '#ffde3a')}`);
}
export function videoThumb(blur) {
  const ph = photo('ep4_video', `<defs><filter id="bl"><feGaussianBlur stdDeviation="${blur ? 4 : 0}"/></filter></defs><circle cx="150" cy="85" r="26" fill="rgba(0,0,0,.55)"/><path d="M142 72 L166 85 L142 98 Z" fill="#fff"/><rect x="0" y="150" width="300" height="20" fill="rgba(0,0,0,.6)"/><text x="150" y="164" text-anchor="middle" font-size="11" font-family="Arial" fill="#fff">Lili_concert_FAST.mp4 · 0:24</text>`, 170); if (ph) return ph;
  return svg(`<defs><filter id="bl"><feGaussianBlur stdDeviation="${blur ? 6 : 0}"/></filter></defs>
  <g filter="url(#bl)"><rect width="300" height="170" fill="#1a1230"/><path d="M0 170 L60 40 L90 170 Z M300 170 L240 40 L210 170 Z" fill="rgba(255,230,150,.2)"/>
  <rect y="130" width="300" height="40" fill="#5a2d1e"/><circle cx="150" cy="80" r="20" fill="#f0c6a2"/><path d="M120 170 C 120 120, 135 105, 150 104 C 165 105, 180 120, 180 170 Z" fill="#3d6bb3"/></g>
  <circle cx="150" cy="85" r="26" fill="rgba(0,0,0,.55)"/><path d="M142 72 L166 85 L142 98 Z" fill="#fff"/>
  <rect x="0" y="150" width="300" height="20" fill="rgba(0,0,0,.6)"/><text x="8" y="164" font-size="11" font-family="Arial" fill="#fff">Lili_concert_FAST.mp4 · 0:24</text>`, '0 0 300 170');
}
// skateboard deck with the yellow lightning sticker
function deck(x, y, s = 1) {
  return `<g transform="translate(${x} ${y}) scale(${s}) rotate(-25)"><rect x="-70" y="-20" width="140" height="40" rx="20" fill="#1d2a44"/><circle cx="-45" cy="24" r="7" fill="#ddd"/><circle cx="45" cy="24" r="7" fill="#ddd"/>
  <path d="M-8 -14 L-18 3 L-4 3 L-12 16 L12 -4 L-2 -4 L6 -14 Z" fill="#ffd21a" stroke="#000" stroke-width="1.5"/></g>`;
}
export function ghostAvatar() { return photo('ep4_ghost_avatar') || svg(`<rect width="300" height="300" fill="#2b2f3a"/>${deck(150, 160, 1.6)}`); }
export function mateAvatar() {
  const ph = photo('ep4_mate_avatar'); if (ph) return ph;
  return svg(`<rect width="300" height="300" fill="#6c8fa8"/><rect y="220" width="300" height="80" fill="#8a8a8a"/>
  <ellipse cx="120" cy="105" rx="34" ry="38" fill="#2a1c12"/><ellipse cx="120" cy="115" rx="27" ry="31" fill="#d9a882"/>
  <path d="M60 300 C 60 200, 90 160, 120 158 C 150 160, 180 200, 180 300 Z" fill="#3a5a3a"/>
  ${deck(210, 200, 1.2)}`);
}
export function avatar(letter, col) {
  return svg(`<rect width="300" height="300" fill="${col}"/><text x="150" y="195" font-size="150" font-family="Arial" font-weight="700" fill="#fff" text-anchor="middle">${letter}</text>`);
}
