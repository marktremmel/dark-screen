// Builds voice_test/cast.json: 3 candidate voices per character, with real lines from the game.
const L = require('../../voice/lines.json');
const pick = (whos, n = 2, fx) => L.filter(l => whos.includes(l.who) && !l.dynamic && l.words >= 6).sort((a, b) => b.words - a.words).slice(0, n).map(l => ({ text: l.spoken, fx: fx ?? l.fx ?? null }));
// candidate: [voice, speed, semitones]
const C = [
 { id: 'narrator', role: 'Narrator (26 min, the whole game)', who: ['Narrator'], cands: [['af_nicole', 1, 0], ['af_heart', 1, 0], ['af_bella', 1, 0]], n: 3 },
 { id: 'tip', role: 'Tips / instructions (ep3-6, 7 min)', who: ['Tip'], cands: [['af_heart', 1, 0], ['af_nicole', 1.05, 0], ['af_sarah', 1, 0]] },
 { id: 'nagyi', role: 'Nagyi (grandma)', who: ['Nagyi'], cands: [['bf_alice', 0.9, -1.5], ['bf_isabella', 0.88, -2], ['af_bella', 0.88, -2.5]] },
 { id: 'mum', role: 'Mum', who: ['Mum', 'Mum (the real one)'], cands: [['af_heart', 1, 0], ['af_sarah', 1, 0], ['bf_isabella', 1, 0]] },
 { id: 'varga', role: 'Ms Varga (teacher)', who: ['Ms Varga', 'Ms Varga (out of breath, Feri bácsi behind her)'], cands: [['bf_isabella', 1, 0], ['af_sarah', 1, 0], ['af_heart', 0.97, -0.5]] },
 { id: 'vela', role: 'VELA smart speaker', who: ['VELA (smart speaker)'], fx: 'speaker', cands: [['bf_emma', 0.95, 0], ['af_heart', 0.95, 0], ['af_nicole', 0.95, 0]] },
 { id: 'bence', role: 'Bence and other boys in chats', who: ['Bence', 'bence', 'Dani', 'Bence (voice message)', 'Bence, after a bad post'], fx: 'chat', cands: [['am_puck', 1.05, 2], ['am_michael', 1.05, 2.5], ['am_fenrir', 1.05, 2]] },
 { id: 'girls', role: 'Dóri, Lili, Réka, Zsófi (girls in chats)', who: ['dori', 'Lili', 'Réka', 'Zsófi_2011 (from the game)', 'Zsófi, late in a Discord server', 'Réka in a fan forum'], fx: 'chat', cands: [['af_nicole', 1.1, 1], ['af_bella', 1.1, 1.5], ['af_sky', 1.1, 1.5]] },
 { id: 'ghost', role: 'szellem_7b (anonymous bully, ep4)', who: ['szellem_7b'], fx: 'chat', cands: [['am_puck', 1, 0], ['af_bella', 1, -1], ['am_fenrir', 1.05, 1]] },
 { id: 'laci', role: 'Laci (ep7)', who: ['Laci'], cands: [['am_fenrir', 1, 0], ['am_michael', 1, 0], ['bm_lewis', 1, 0]] },
 { id: 'feri', role: 'Feri bácsi (old caretaker)', who: ['Feri bácsi'], cands: [['bm_lewis', 0.92, -1], ['bm_george', 0.92, -1], ['bm_fable', 0.9, -1.5]] },
 { id: 'scammer', role: 'Scam calls (Lépcsőház calls, "The voice" in ep9)', who: ['Dad', 'Your bank (security team)', 'Someone saying they are the police', 'The voice', 'Your cousin Ádám'], fx: 'phone', cands: [['af_bella', 1, 0], ['am_michael', 1, 0], ['af_heart', 1.05, 0]] },
 { id: 'system', role: 'Apps, brands, official voices (inbox, 112, nurse, VárosVill)', who: ['112', 'Nurse (Ward 3)', 'VárosVill', 'GameHub Security', 'Fürkész · data protection officer'], cands: [['bf_emma', 1, 0], ['bm_fable', 1, 0], ['am_michael', 1, 0]] },
 { id: 'man', role: 'Adult men (police officer, the man behind the door, coach)', who: ['A police officer (through the door)', 'A man (behind the door)', 'Your football coach'], cands: [['am_fenrir', 0.95, -1], ['bm_lewis', 1, 0], ['am_michael', 0.95, -1]] },
 { id: 'thought', role: 'Thoughts and temptations on the walks', who: ['A worried thought', 'Your own thought', 'The feed', 'Your feed', 'Your AI friend'], cands: [['af_nicole', 0.95, 0], ['af_heart', 0.95, -1], ['af_bella', 0.95, 0]] },
];
const out = C.map(c => ({ id: c.id, role: c.role, cands: c.cands, lines: pick(c.who, c.n || 2, c.fx) }));
for (const c of out) if (!c.lines.length) console.error('NO LINES', c.id);
require('fs').writeFileSync(process.argv[2] || 'cast.json', JSON.stringify(out, null, 1));
console.log(out.map(c => c.id + ': ' + c.lines.map(l => l.text.slice(0, 50)).join(' || ')).join('\n'));
