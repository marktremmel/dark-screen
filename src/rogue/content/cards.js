// Notebook cards from every source, by id. Anomaly cards use the anomaly id; walk lines use 'w:<id>'. DATA ONLY.
import { ANOMALIES } from './anomalies.js';
import { WALK_LINE } from './walks.js';

export const CARDS = {
  ...Object.fromEntries(ANOMALIES.map(a => [a.id, { title: a.card.title, text: a.card.text, theme: a.theme, from: 'stairwell' }])),
  ...Object.fromEntries(Object.values(WALK_LINE).map(l => ['w:' + l.id, { title: '"' + l.type + '"', text: l.lesson, theme: l.theme, from: 'walk' }])),
};
export const CARD_COUNT = Object.keys(CARDS).length;
