// Typed answers in English, Hungarian or both mixed: normalising and rubric scoring.
// A rubric is a list of groups; each group is a list of synonyms (EN and HU, written without accents).
// A group scores when any synonym appears as a word or the start of a word ("engedely" matches "engedelyt").

/** Lower case, accents off (á→a, ő→o), punctuation to spaces, single spaces. @param {string} s */
export function normalise(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ').trim();
}

/** Does the normalised text contain this synonym (word start, multi-word allowed)? */
function hit(text, syn) {
  const n = normalise(syn); if (!n) return false;
  return (' ' + text).includes(' ' + n);
}

/**
 * Score an answer against a rubric.
 * @param {string} answer
 * @param {{rubric: string[][], need: number, question?: string}} spec
 * @returns {{score: number, hits: number, groups: boolean[]}} score in 0..1
 */
export function scoreAnswer(answer, spec) {
  const text = normalise(answer);
  const groups = spec.rubric.map(g => g.some(s => hit(text, s)));
  const hits = groups.filter(Boolean).length;
  let score = Math.min(1, hits / Math.max(1, spec.need));
  // answers that only repeat the question, or are a pile of single words, are worth at most half
  const words = text.split(' ').filter(Boolean);
  if (spec.question) {
    const q = new Set(normalise(spec.question).split(' '));
    const own = words.filter(w => !q.has(w));
    if (own.length < 2) score = Math.min(score, 0.5);
  }
  if (words.length < 3) score = Math.min(score, 0.5);
  return { score, hits, groups };
}
