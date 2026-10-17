// The player's progress in the browser. localStorage may not exist (private window,
// blocked data): every access is inside try/catch and there is a copy in memory.

const KEY = 'arena:progress:v2';
// Progress saved by an older Arena ({ certo, tentativas, ultima }): read once and moved to KEY.
const OLD_KEY = 'arena:progresso:v1';
let memory = {};

function valid(v) {
  return v && typeof v === 'object' && !Array.isArray(v);
}

function fromOld(old) {
  const out = {};
  for (const [id, r] of Object.entries(old)) {
    if (valid(r)) out[id] = { correct: r.certo === true, attempts: Number(r.tentativas) || 0, last: r.ultima === 'certo' ? 'correct' : 'wrong', at: r.em };
  }
  return out;
}

export function readProgress() {
  try {
    const raw = globalThis.localStorage?.getItem(KEY);
    if (raw) {
      const v = JSON.parse(raw);
      if (valid(v)) memory = v;
    } else {
      const old = globalThis.localStorage?.getItem(OLD_KEY);
      if (old) {
        const v = JSON.parse(old);
        if (valid(v)) {
          memory = fromOld(v);
          save();
        }
      }
    }
  } catch {
    /* no storage: the memory copy stays */
  }
  const copy = {};
  for (const [id, r] of Object.entries(memory)) {
    if (valid(r)) copy[id] = { correct: r.correct === true, attempts: Number(r.attempts) || 0, last: r.last === 'correct' ? 'correct' : 'wrong' };
  }
  return copy;
}

function save() {
  try {
    globalThis.localStorage?.setItem(KEY, JSON.stringify(memory));
  } catch {
    /* no storage: the memory copy stays */
  }
}

// Once solved, a card stays solved; "last" keeps the last attempt.
export function recordAnswer(id, correct) {
  readProgress();
  const before = valid(memory[id]) ? memory[id] : {};
  memory[id] = {
    correct: before.correct === true || correct === true,
    attempts: (Number(before.attempts) || 0) + 1,
    last: correct ? 'correct' : 'wrong',
    at: new Date().toISOString(),
  };
  save();
  return memory[id];
}

export function deleteProgress() {
  memory = {};
  try {
    globalThis.localStorage?.removeItem(KEY);
    globalThis.localStorage?.removeItem(OLD_KEY);
  } catch {
    /* nothing to delete */
  }
}

export function pointsFor(difficulty) {
  return Number.isInteger(difficulty) && difficulty > 0 ? difficulty * 10 : 0;
}
