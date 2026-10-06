// Illustrations for the Episode 3 phone (all invented places and brands).
// Painted images are used when the ep3 pack has them; the flat SVGs are the fallback.
import { A } from '../core/assets.js';
const photo = (k, extra = '') => A.img[k] ? `<svg viewBox="0 0 300 300" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice" style="width:100%;height:100%;display:block"><image href="${A.img[k]}" x="0" y="0" width="300" height="300" preserveAspectRatio="xMidYMid slice"/>${extra}</svg>` : null;
const svg = (body, vb = '0 0 300 300') => `<svg viewBox="${vb}" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice" style="width:100%;height:100%;display:block">${body}</svg>`;

export function selfie(clues = false) {
  const pc = (id, x, y, w, h) => clues ? `<rect class="clue" data-clue="${id}" x="${x}" y="${y}" width="${w}" height="${h}" rx="4" fill="rgba(255,210,122,0)" stroke="rgba(255,210,122,0)" stroke-width="2"/>` : '';
  const ph = photo('ep3_selfie', `<path d="M85 150 h13 v8 c0 6 -6.5 9 -6.5 9 c0 0 -6.5 -3 -6.5 -9 z" fill="#2e6b4f" stroke="#d9e8df" stroke-width=".6"/><text x="91.5" y="172" font-size="3.6" text-anchor="middle" font-family="Arial" font-weight="700" fill="#d9e8df">PLATÁN</text>
    <rect x="271" y="58" width="13" height="10" fill="#f2d24b"/><text x="277.5" y="66.5" font-size="8" text-anchor="middle" font-family="Arial" font-weight="700" fill="#1b1b1b">14</text>${pc('crest', 78, 144, 28, 34)}${pc('tram', 262, 48, 32, 42)}`);
  if (ph) return ph;
  const clue = (id, x, y, w, h) => clues ? `<rect class="clue" data-clue="${id}" x="${x}" y="${y}" width="${w}" height="${h}" rx="4" fill="rgba(255,210,122,0)" stroke="rgba(255,210,122,.0)" stroke-width="2"/>` : '';
  return svg(`
  <rect width="300" height="300" fill="#cfd9df"/>
  ${Array.from({ length: 10 }, (_, i) => `<line x1="${i * 30}" y1="0" x2="${i * 30}" y2="300" stroke="#b8c4cb" stroke-width="2"/><line x1="0" y1="${i * 30}" x2="300" y2="${i * 30}" stroke="#b8c4cb" stroke-width="2"/>`).join('')}
  <rect x="20" y="15" width="260" height="285" rx="10" fill="#9fb3bf" stroke="#6d7f8a" stroke-width="6"/>
  <!-- window behind, with the tram stop sign outside -->
  <rect x="190" y="35" width="75" height="90" fill="#1d2a44" stroke="#e8e2d4" stroke-width="4"/>
  <line x1="227" y1="35" x2="227" y2="125" stroke="#e8e2d4" stroke-width="3"/>
  <rect x="236" y="70" width="22" height="14" fill="#f2d24b"/><text x="239" y="81" font-size="9" font-family="Arial" font-weight="700" fill="#1b1b1b">14</text>
  <rect x="246" y="84" width="2" height="30" fill="#8a8f96"/>
  <text x="231" y="98" font-size="3.6" font-family="Arial" fill="#f2d24b">PLATÁN TÉR</text>
  ${clue('tram', 228, 64, 36, 40)}
  <!-- person: hair, head, hoodie, phone -->
  <ellipse cx="140" cy="118" rx="38" ry="44" fill="#3a2a22"/>
  <ellipse cx="140" cy="128" rx="30" ry="36" fill="#e2b493"/>
  <path d="M60 300 C 60 210, 90 175, 140 172 C 190 175, 220 210, 220 300 Z" fill="#7a1f2b"/>
  <path d="M112 175 C 125 200, 155 200, 168 175" fill="none" stroke="#5c1520" stroke-width="5"/>
  <rect x="150" y="100" width="40" height="70" rx="6" fill="#1b1c22" stroke="#444" stroke-width="2"/>
  <ellipse cx="172" cy="172" rx="14" ry="10" fill="#e2b493"/>
  <!-- school crest on the PE shirt under the open hoodie -->
  <rect x="122" y="205" width="36" height="60" fill="#f1f1ee"/>
  <path d="M130 215 h20 v12 c0 8 -10 12 -10 12 c0 0 -10 -4 -10 -12 z" fill="#2e6b4f"/>
  <text x="125" y="250" font-size="4.2" font-family="Arial" font-weight="700" fill="#2e6b4f">PLATÁN</text>
  <text x="125" y="256" font-size="3.4" font-family="Arial" fill="#2e6b4f">SCHOOL · PE</text>
  ${clue('crest', 120, 208, 40, 52)}
  `);
}
export function cat() {
  const ph = photo('ep3_cat'); if (ph) return ph;
  return svg(`<rect width="300" height="300" fill="#2a3550"/>
  <rect x="30" y="20" width="240" height="190" fill="#16203a" stroke="#d9d2c3" stroke-width="8"/><line x1="150" y1="20" x2="150" y2="210" stroke="#d9d2c3" stroke-width="6"/>
  <circle cx="210" cy="70" r="5" fill="#f5d77a"/><rect x="208" y="70" width="4" height="120" fill="#555"/><circle cx="210" cy="70" r="26" fill="rgba(245,215,122,.15)"/>
  <rect x="0" y="210" width="300" height="20" fill="#cfc6b4"/><rect x="0" y="230" width="300" height="70" fill="#7b6a58"/>
  <ellipse cx="130" cy="200" rx="70" ry="34" fill="#e08a3c"/><circle cx="185" cy="170" r="30" fill="#e08a3c"/>
  <path d="M165 148 l6 -22 l12 18 z M190 146 l10 -20 l8 22 z" fill="#e08a3c"/>
  <circle cx="178" cy="168" r="4" fill="#2b2b2b"/><circle cx="196" cy="168" r="4" fill="#2b2b2b"/>
  <path d="M60 205 c -30 0 -30 -30 -10 -30" stroke="#e08a3c" stroke-width="12" fill="none"/>
  ${[0, 1, 2].map(i => `<path d="M${95 + i * 20} 180 q 8 8 0 18" stroke="#c46e25" stroke-width="5" fill="none"/>`).join('')}`);
}
export function rink(n = 1) {
  const ph = photo(n === 1 ? 'ep3_rink1' : 'ep3_rink2', n === 1 ? '<text x="125" y="84" font-size="15" text-anchor="middle" font-family="Arial" font-weight="700" fill="#e9f2ff" opacity=".9">JÉGPÁLYA PLATÁN</text>' : '<text x="10" y="290" font-size="11" font-family="Arial" fill="#e9f2ff" opacity=".8">18:04</text>'); if (ph) return ph;
  return svg(`<rect width="300" height="300" fill="#0d1630"/>
  ${[40, 120, 200, 270].map(x => `<circle cx="${x}" cy="40" r="6" fill="#fff6c8"/><circle cx="${x}" cy="40" r="22" fill="rgba(255,246,200,.12)"/>`).join('')}
  <rect x="20" y="70" width="260" height="30" fill="#24427a"/><text x="${n === 1 ? 52 : 48}" y="91" font-size="17" font-family="Arial" font-weight="700" fill="#e9f2ff">JÉGPÁLYA PLATÁN</text>
  <path d="M0 160 L300 140 L300 300 L0 300 Z" fill="#dbe9f5"/>
  ${Array.from({ length: 6 }, (_, i) => `<path d="M${20 + i * 50} ${200 + (i % 2) * 30} q 30 -10 60 0" stroke="#b6cbe0" stroke-width="2" fill="none"/>`).join('')}
  <rect x="0" y="130" width="300" height="16" fill="#f2f2f2"/><rect x="0" y="146" width="300" height="6" fill="#c73b3b"/>
  ${n === 1 ? `<path d="M90 250 h50 v-30 h-15 v-20 h-20 v20 h-15 z" fill="#f4f4f4" stroke="#333"/><rect x="85" y="252" width="62" height="5" fill="#9aa"/>
  <path d="M170 255 h50 v-30 h-15 v-20 h-20 v20 h-15 z" fill="#f4f4f4" stroke="#333"/><rect x="165" y="257" width="62" height="5" fill="#9aa"/>` :
  `<circle cx="150" cy="215" r="18" fill="#7a1f2b"/><rect x="138" y="232" width="24" height="40" fill="#7a1f2b"/><text x="110" y="290" font-size="12" font-family="Arial" fill="#55667a">18:04</text>`}`);
}
export function cake() {
  const ph = photo('ep3_cake'); if (ph) return ph;
  return svg(`<rect width="300" height="300" fill="#f1e4d0"/>
  <ellipse cx="150" cy="235" rx="110" ry="25" fill="#ddd"/>
  <rect x="60" y="150" width="180" height="80" rx="10" fill="#e88ca6"/><rect x="60" y="150" width="180" height="20" rx="8" fill="#fff"/>
  <rect x="115" y="100" width="10" height="50" fill="#6aa9e0"/><rect x="175" y="100" width="10" height="50" fill="#6aa9e0"/>
  <path d="M120 85 q -8 10 0 16 q 8 -6 0 -16" fill="#ffb02e"/><path d="M180 85 q -8 10 0 16 q 8 -6 0 -16" fill="#ffb02e"/>
  <text x="122" y="210" font-size="38" font-family="Arial" font-weight="700" fill="#fff">13</text>`);
}
export function windowView() {
  const ph = photo('ep3_window'); if (ph) return ph;
  return svg(`<rect width="300" height="300" fill="#f0a35e"/><rect y="120" width="300" height="180" fill="#5a4d6e"/>
  <circle cx="220" cy="110" r="28" fill="#ffd27a"/>
  ${[20, 70, 120, 170].map((x, i) => `<rect x="${x}" y="${150 - i * 10}" width="40" height="${150 + i * 10}" fill="#3a3150"/>`).join('')}
  <rect x="200" y="200" width="70" height="10" fill="#2b2b2b"/><rect x="230" y="160" width="20" height="14" fill="#f2d24b"/><text x="233" y="171" font-size="9" font-family="Arial" font-weight="700" fill="#1b1b1b">14</text>`);
}
export function bench() {
  const ph = photo('ep3_bench', '<rect x="0" y="276" width="300" height="24" fill="rgba(0,0,0,.45)"/><text x="150" y="292" text-anchor="middle" font-size="10" font-family="monospace" fill="#c8ccd6">PanoMap · street view · 2026</text>'); if (ph) return ph;
  return svg(`<rect width="300" height="300" fill="#05070c"/>
  <path d="M150 20 L60 300 L240 300 Z" fill="rgba(255,170,80,.16)"/><rect x="146" y="10" width="8" height="40" fill="#333"/><ellipse cx="150" cy="22" rx="16" ry="6" fill="#ffb469"/>
  <rect x="40" y="120" width="220" height="10" fill="#2a2d33"/><rect x="40" y="130" width="6" height="110" fill="#2a2d33"/><rect x="254" y="130" width="6" height="110" fill="#2a2d33"/>
  <rect x="60" y="130" width="180" height="80" fill="rgba(140,170,200,.12)" stroke="#3a3f48"/>
  <rect x="80" y="215" width="140" height="10" fill="#6b5240"/><rect x="85" y="225" width="5" height="25" fill="#3a3a3a"/><rect x="210" y="225" width="5" height="25" fill="#3a3a3a"/>
  <rect x="200" y="140" width="26" height="16" fill="#f2d24b"/><text x="204" y="152" font-size="10" font-family="Arial" font-weight="700" fill="#1b1b1b">14</text>
  <rect x="0" y="250" width="300" height="50" fill="#14161b"/>
  <text x="58" y="282" font-size="10" font-family="monospace" fill="#7a8090">PanoMap · street view · 2026</text>`);
}
export function map(vis, nick) {
  const me = (nick || 'Me').slice(0, 1).toUpperCase();
  return svg(`<rect width="300" height="420" fill="#e9e5dc"/>
  <rect x="180" y="40" width="100" height="120" fill="#c8dfb0"/><text x="196" y="105" font-size="11" font-family="Arial" fill="#5b7a43">Platán park</text>
  ${[60, 150, 250, 340].map(y => `<rect x="0" y="${y}" width="300" height="14" fill="#fff"/>`).join('')}
  ${[50, 160, 260].map(x => `<rect x="${x}" y="0" width="14" height="420" fill="#fff"/>`).join('')}
  <line x1="0" y1="157" x2="300" y2="157" stroke="#e0a43a" stroke-width="3" stroke-dasharray="8 5"/>
  <text x="70" y="148" font-size="10" font-family="Arial" fill="#8a6a2a">tram 14 · Platán tér</text>
  <rect x="190" y="185" width="90" height="50" fill="#bcd3ec"/><text x="196" y="214" font-size="10" font-family="Arial" fill="#3d5f86">Jégpálya Platán</text>
  <rect x="80" y="270" width="60" height="50" fill="#d8cfc0"/><text x="84" y="335" font-size="10" font-family="Arial" fill="#6a5f50">Hársfa u. 12</text>
  <circle cx="110" cy="292" r="${vis === 'me' ? 0 : 30}" fill="rgba(43,98,217,.15)"><animate attributeName="r" values="18;34;18" dur="2s" repeatCount="indefinite"/></circle>
  <circle cx="110" cy="292" r="16" fill="${vis === 'me' ? '#9aa' : '#2b62d9'}" stroke="#fff" stroke-width="3"/><text x="104" y="298" font-size="15" font-family="Arial" font-weight="700" fill="#fff">${me}</text>
  <circle cx="230" cy="80" r="12" fill="#e0662b" stroke="#fff" stroke-width="3"/><text x="226" y="85" font-size="12" font-family="Arial" fill="#fff">B</text>
  <circle cx="35" cy="380" r="12" fill="#8a3fc4" stroke="#fff" stroke-width="3"/><text x="31" y="385" font-size="12" font-family="Arial" fill="#fff">L</text>`, '0 0 300 420');
}
