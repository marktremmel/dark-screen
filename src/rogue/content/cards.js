// Notebook cards from every source, by id. Anomaly cards use the anomaly id; walk lines use 'w:<id>'. DATA ONLY.
import { ANOMALIES } from './anomalies.js';
import { WALK_LINE } from './walks.js';
import { POSTS } from './posts.js';

export const CARDS = {
  ...Object.fromEntries(ANOMALIES.map(a => [a.id, { title: a.card.title, text: a.card.text, theme: a.theme, from: 'stairwell' }])),
  ...Object.fromEntries(POSTS.filter(p => p.reveals).map(p => ['p:' + p.id, { title: `Not public: "${p.caption}"`, text: p.why, theme: 'T9', from: 'metro' }])),
  ...Object.fromEntries(Object.values(WALK_LINE).map(l => ['w:' + l.id, { title: '"' + l.type + '"', text: l.lesson, theme: l.theme, from: 'walk' }])),
};
// cards from living in the flat
CARDS['h:leds'] = { title: 'Smart devices need care too', text: 'Update the software, change the default password, and switch off control from the internet if you do not need it. Attackers look for devices that still say "admin".', theme: 'T3', from: 'home' };
export const CARD_COUNT = Object.keys(CARDS).length;
