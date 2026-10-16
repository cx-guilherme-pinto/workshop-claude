// Modelo "resposta": resposta livre validada. A resposta e texto.
//
// resposta({
//   id, title, category, difficulty, concept, prompt, explanation,
//   scenario?: { kind, label?, lines: [...] },
//   placeholder?: '...',
//   accept: ['resposta certa', 'variante'],     // comparadas depois de normalizar()
//   check?: (normalizada, original) => boolean,  // em vez de accept, para logica propria
// })
import { h, criarCartao, verificarDefinicao, cabecalho, cenario, botaoConfirmar, bloquear, normalizar, TEXTOS } from './common.js';

export { normalizar };

export function resposta(def) {
  verificarDefinicao(def, 'resposta');
  if (!def.check && !(Array.isArray(def.accept) && def.accept.length > 0)) {
    throw new Error(TEXTOS.semAcceptNemCheck(def.id));
  }
  const aceites = new Set((def.accept || []).map(normalizar));

  return criarCartao('resposta', def, {
    validate: (answer) => {
      if (typeof answer !== 'string' || answer.trim() === '') return false;
      const n = normalizar(answer);
      return def.check ? def.check(n, answer) === true : aceites.has(n);
    },
    render(container, api) {
      const doc = container.ownerDocument;
      const campo = h(doc, 'input', {
        class: 'resposta-campo', type: 'text', name: `resposta-${def.id}`,
        autocomplete: 'off', spellcheck: 'false', maxlength: 200,
        placeholder: def.placeholder || TEXTOS.placeholder,
        attrs: { 'aria-label': TEXTOS.resposta },
      });
      const confirmar = botaoConfirmar(doc, () => {
        if (!campo.value || !String(campo.value).trim()) return;
        bloquear(container);
        api.responder(String(campo.value));
      });
      campo.addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter') confirmar.click();
      });
      container.replaceChildren(
        h(doc, 'article', { class: 'cartao cartao-resposta', 'data-cartao': def.id },
          cabecalho(doc, def),
          cenario(doc, def.scenario),
          h(doc, 'div', { class: 'resposta-linha' }, campo),
          h(doc, 'div', { class: 'cartao-acoes' }, confirmar),
        ),
      );
    },
  });
}
