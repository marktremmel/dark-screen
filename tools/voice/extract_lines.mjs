// Sötét Képernyő: collect every line that could be voiced → voice/lines.json + voice/summary.txt
// Run from the repo root: node tools/voice/extract_lines.mjs
import fs from 'fs'; import path from 'path'; import crypto from 'crypto';
import * as acorn from 'acorn'; import * as walk from 'acorn-walk';

const ROOT = process.cwd(), SRC = path.join(ROOT, 'src');
const files = []; (function rec(d) { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); fs.statSync(p).isDirectory() ? rec(p) : f.endsWith('.js') && files.push(p); } })(SRC);

// Which game part a file belongs to
function groupOf(rel) {
  const m = rel.match(/scenes\/(ep\d)/); if (m) return m[1];
  if (/rogue\/content\/(\w+)/.test(rel)) return 'lepcsohaz/' + rel.match(/rogue\/content\/(\w+)/)[1];
  if (rel.includes('rogue/')) return 'lepcsohaz/' + path.basename(rel, '.js');
  if (rel.includes('scenes/')) return 'hub/' + path.basename(rel, '.js');
  return 'common/' + path.basename(rel, '.js');
}

// String / template literal → { text, dynamic }
function str(n) {
  if (!n) return null;
  if (n.type === 'Literal' && typeof n.value === 'string') return { text: n.value, dynamic: false };
  if (n.type === 'TemplateLiteral') {
    let t = ''; n.quasis.forEach((q, i) => { t += q.value.cooked; if (i < n.expressions.length) t += '{' + src.slice(n.expressions[i].start, n.expressions[i].end).slice(0, 40) + '}'; });
    return { text: t, dynamic: n.expressions.length > 0 };
  }
  if (n.type === 'BinaryExpression' && n.operator === '+') { const a = str(n.left), b = str(n.right); if (a || b) return { text: (a?.text ?? '{…}') + (b?.text ?? '{…}'), dynamic: true }; }
  if (n.type === 'ConditionalExpression') return str(n.consequent); // first branch only; the other is caught separately
  return null;
}
const prop = (obj, k) => obj.properties?.find(p => p.type === 'Property' && (p.key.name === k || p.key.value === k))?.value;

const HU_CHARS = /[őűŐŰáéíóöüúÁÉÍÓÖÜÚ]/;
const EN_WORDS = /\b(the|and|you|is|it|to|of|a|in|that|your|this|what|me|my|i|not|for|on|with|be|are|do|was)\b/gi;
function lang(t) {
  const words = t.split(/\s+/).filter(Boolean).length, en = (t.match(EN_WORDS) || []).length;
  if (en === 0 && words >= 4 && HU_CHARS.test(t)) return 'hu';
  return HU_CHARS.test(t) ? 'mixed' : 'en';
}
// What will actually be spoken: drop Hungarian glosses in brackets, emojis, markup
function spoken(t) {
  return t.replace(/<[^>]+>/g, '').replace(/\s*\(([^()]*)\)/g, (m, inner) => (HU_CHARS.test(inner) || /^[a-z\- ]+$/.test(inner) && !EN_WORDS.test(inner)) ? '' : m)
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu, '').replace(/\s+/g, ' ').trim();
}

const lines = []; let src = '';
function add(file, node, who, text, source, extra = {}, raw) {
  if (raw && raw.type === 'ConditionalExpression') { add(file, node, who, str(raw.consequent), source, extra, raw.consequent); add(file, node, who, str(raw.alternate), source, extra, raw.alternate); return; }
  if (!text || !text.text) return;
  const t = text.text.trim(); if (file.endsWith('fit.js')) return; if (t.length < 2 || !/[a-zA-Zőű]{2}/.test(t.replace(/\{[^}]*\}/g, ''))) return;
  if (/^\[.*\]$/s.test(t)) extra = { ...extra, stage: true }; // [stage directions]: narrator, optional
  let w = who, say = t; const m = !who && t.match(/^([^:{]{2,48}):\s*(.+)$/s); if (m) { w = m[1].trim(); say = m[2].trim(); }
  const sp = spoken(say);
  lines.push({ id: '', group: groupOf(file), file, line: src.slice(0, node.start).split('\n').length, source, who: w || 'Narrator',
    lang: lang(sp), dynamic: text.dynamic, text: say, spoken: sp, words: sp.split(/\s+/).filter(Boolean).length, ...extra });
}

for (const f of files) {
  const rel = path.relative(ROOT, f); src = fs.readFileSync(f, 'utf8');
  let ast; try { ast = acorn.parse(src, { ecmaVersion: 'latest', sourceType: 'module', locations: false }); } catch (e) { console.warn('skip', rel, e.message); continue; }
  const isContent = rel.includes('rogue/content/');
  walk.full(ast, n => {
    if (n.type === 'CallExpression') {
      const c = n.callee, name = c.type === 'Identifier' ? c.name : c.type === 'MemberExpression' ? c.property.name : null, a = n.arguments;
      if (name === 'caption') { const kind = a[1]?.value || 'say'; if (kind === 'sfx') return; add(rel, n, null, str(a[0]), 'caption', kind === 'call' ? { fx: 'phone' } : {}); }
      else if (name === 'fade' && a[0]?.value === true) add(rel, n, 'Narrator', str(a[1]), 'fade');
      else if (name === 'say' && a.length >= 2) {
        const o = a.find(x => x.type === 'ObjectExpression'); if (o && prop(o, 'me')) return; // the player's own messages stay silent
        const chat = a[0].value || null;
        if (a.length >= 3 && !(a[2].type === 'ObjectExpression')) { const t = str(a[2]); if (!t || !t.text.trim()) return; add(rel, n, str(a[1])?.text || chat, t, 'chat', { fx: 'chat', chat }, a[2]); }
        else add(rel, n, chat, str(a[1]), 'chat', { fx: 'chat', chat }, a[1]);
      }
      else if (name === 'show' && a.length >= 2 && str(a[0])) add(rel, n, str(a[0]).text, str(a[1]), 'talk', {}, a[1]);
      else if (name === 'velaSay') add(rel, n, 'VELA (smart speaker)', str(a[0]), 'vela', { fx: 'speaker' });
      else if (name === 'sub' && c.type === 'MemberExpression') add(rel, n, 'Narrator', str(a[0]), 'sub');
      else if (name === 'notify') { const ss = a.slice(0, 2).map(x => ({ x, t: str(x) })).filter(o => o.t && /\s/.test(o.t.text)); if (!ss.length) return;
        const best = ss.reduce((m, o) => o.t.text.length > m.t.text.length ? o : m); add(rel, n, 'Notification', best.t, 'notify', { fx: 'notif' }, best.x); }
      else if (name === 'setTip') add(rel, n, 'Tip', str(a[0]), 'tip', { optional: true });
      else if (name === 'cutIn') add(rel, n, 'Narrator', str(a[1]), 'cutIn');
      else if (name === 'toast') { // hud toast(from, text) · ep4 toast(chat, who, text) · ep6 toast(from, text, kind): the longest string is the text
        const ss = a.slice(0, 3).map(x => ({ x, t: str(x) })).filter(o => o.t); if (!ss.length) return;
        const best = ss.reduce((m, o) => o.t.text.length > m.t.text.length ? o : m); if (!/\s/.test(best.t.text)) return;
        const bi = a.indexOf(best.x); add(rel, n, bi > 0 ? str(a[bi - 1])?.text || null : null, best.t, 'toast', { fx: 'chat' }, best.x); }
    }
    // HTML dialogue written straight into a panel: <b>Who:</b> text
    if ((n.type === 'Literal' && typeof n.value === 'string') || n.type === 'TemplateLiteral') {
      const whole = n.type === 'Literal' ? n.value : n.quasis.map(q => q.value.cooked).join('{…}');
      for (const m of whole.matchAll(/<b>([^<{$]{2,40}):<\/b>\s*([\s\S]*?)(?=<\/p>|<\/div>|$)/g)) {
        const t = m[2].replace(/<[^>]+>/g, '').replace(/&lt;|&gt;/g, '').trim(); if (/^(From|To|Subject)$/.test(m[1])) continue;
        add(rel, n, m[1].trim(), { text: t, dynamic: t.includes('{…}') }, 'panel', /voice|📞/i.test(m[1]) || rel.includes('ep9') && n.start > 0 && /The voice|Nagyi/.test(m[1]) ? { fx: 'phone' } : {});
      }
    }
    if (n.type === 'ObjectExpression') {
      const who = str(prop(n, 'who'))?.text, from = str(prop(n, 'from'))?.text;
      if (who && prop(n, 'say')) add(rel, n, who, str(prop(n, 'say')), isContent ? 'content' : 'say', rel.includes('calls') ? { fx: 'phone' } : {});
      else if (who && prop(n, 'text')) add(rel, n, who, str(prop(n, 'text')), 'talk');
      if (from && prop(n, 'chat')?.type === 'ArrayExpression')
        for (const el of prop(n, 'chat').elements) if (el?.type === 'ArrayExpression' && el.elements[0]?.value === 'them') add(rel, el, from, str(el.elements[1]), 'homechat', { fx: 'chat' });
      if (from && prop(n, 'body')) { add(rel, n, from, str(prop(n, 'subject')), 'inbox-subject', { fx: 'mail' }); add(rel, n, from, str(prop(n, 'body')), 'inbox-body', { fx: 'mail' }); }
      if (rel.endsWith('intro.js') && prop(n, 'text') && !who) add(rel, n, 'Narrator', str(prop(n, 'text')), 'intro');
      if (rel.endsWith('homejobs.js') && prop(n, 'next')) add(rel, n, 'Narrator', str(prop(n, 'next')), 'homejob-outcome');
    }
  });
}

// Stable ids: group + hash of the text (same text → same audio, shared across places)
const seen = new Map();
for (const l of lines) { const h = crypto.createHash('sha1').update(l.who + '|' + l.spoken).digest('hex').slice(0, 8); l.id = `${l.group.replace('/', '_')}_${h}`; }
const uniq = []; for (const l of lines) { const k = l.who + '|' + l.spoken; if (seen.has(k)) { seen.get(k).uses++; continue; } l.uses = 1; seen.set(k, l); uniq.push(l); }

fs.mkdirSync('voice', { recursive: true });
fs.writeFileSync('voice/lines.json', JSON.stringify(uniq, null, 1));

// Summary: minutes at ~150 spoken words per minute plus a 0.5 s gap per line
const mins = ls => (ls.reduce((s, l) => s + l.words, 0) / 150 + ls.length * 0.5 / 60);
const by = (k) => { const m = {}; for (const l of uniq) (m[l[k]] ??= []).push(l); return Object.entries(m).sort((a, b) => mins(b[1]) - mins(a[1])); };
let out = `Lines: ${uniq.length} unique (${lines.length} incl. repeats), ~${mins(uniq).toFixed(1)} min audio, dynamic: ${uniq.filter(l => l.dynamic).length}\n\n`;
out += 'By group:\n' + by('group').map(([g, ls]) => `  ${g.padEnd(28)} ${String(ls.length).padStart(4)} lines  ${mins(ls).toFixed(1).padStart(5)} min`).join('\n');
out += '\n\nBy language:\n' + by('lang').map(([g, ls]) => `  ${g.padEnd(8)} ${String(ls.length).padStart(4)} lines  ${mins(ls).toFixed(1)} min`).join('\n');
out += '\n\nBy source:\n' + by('source').map(([g, ls]) => `  ${g.padEnd(16)} ${String(ls.length).padStart(4)} lines  ${mins(ls).toFixed(1)} min`).join('\n');
out += '\n\nTop characters:\n' + by('who').slice(0, 60).map(([g, ls]) => `  ${g.slice(0, 40).padEnd(42)} ${String(ls.length).padStart(4)} lines  ${mins(ls).toFixed(1)} min  [${[...new Set(ls.map(l => l.group))].join(', ').slice(0, 60)}]`).join('\n');
fs.writeFileSync('voice/summary.txt', out); console.log(out);
