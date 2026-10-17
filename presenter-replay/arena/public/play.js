// Mounting a card to play: loads cards/<id>/card.js, calls render(container, api) and, when the
// card calls api.submit(answer), validates it, records the progress and shows the result band
// with the explanation. Used by the gallery and by the panel of /status.
import { el, VALID_ID } from './dom.js';
import { recordAnswer, pointsFor } from './progress.js';
import { T } from '/lib/texts.js';

const P = T.play;

export async function loadCard(id, version) {
  if (!VALID_ID.test(String(id))) throw new Error(P.invalidId);
  const suffix = Number.isFinite(version) ? `?v=${version}` : '';
  const m = await import(`/cards/${id}/card.js${suffix}`);
  const c = m.default;
  if (!c || typeof c.render !== 'function' || typeof c.validate !== 'function') {
    throw new Error(P.noExport);
  }
  return c;
}

function noMotion() {
  try {
    return matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return true;
  }
}

function resultBand(card, correct, actions) {
  const pts = pointsFor(card.difficulty);
  return el('section', { class: 'result', 'data-correct': correct ? 'yes' : 'no', tabindex: '-1', attrs: { 'aria-label': P.result } },
    el('p', { class: 'result-verdict' },
      el('span', { text: correct ? P.correct : P.wrong }),
      el('span', { class: 'result-points', text: correct ? (pts ? P.morePoints(pts) : P.solved) : P.readAndRetry }),
    ),
    el('div', { class: 'result-body' },
      el('p', { class: 'result-explanation', text: String(card.explanation ?? '') }),
      card.concept ? el('p', { class: 'result-concept' }, el('strong', { text: P.theIdea }), String(card.concept)) : null,
      actions.length ? el('div', { class: 'result-actions' }, ...actions) : null,
    ),
  );
}

// actions({ correct, retry }) returns the buttons/links of the result band.
export function mountGame(target, card, { actions = () => [], onAnswer = null } = {}) {
  const stage = el('div', { class: 'stage' });
  const area = el('div', { class: 'result-area', attrs: { 'aria-live': 'polite' } });
  target.replaceChildren(stage, area);
  let answered = false;

  const api = {
    submit(answer) {
      if (answered) return { correct: null };
      answered = true;
      let correct = false;
      try {
        correct = card.validate(answer) === true;
      } catch {
        correct = false;
      }
      const record = recordAnswer(card.id, correct);
      const band = resultBand(card, correct, actions({ correct, retry: draw }));
      area.replaceChildren(band);
      band.focus({ preventScroll: true });
      band.scrollIntoView({ block: 'nearest', behavior: noMotion() ? 'auto' : 'smooth' });
      if (onAnswer) onAnswer({ correct, record });
      return { correct, explanation: card.explanation };
    },
  };

  function draw() {
    answered = false;
    area.replaceChildren();
    try {
      card.render(stage, api);
    } catch (e) {
      stage.replaceChildren(el('p', { class: 'notice-error', text: P.couldNotDraw(e?.message || e) }));
    }
  }

  draw();
  return { retry: draw };
}
