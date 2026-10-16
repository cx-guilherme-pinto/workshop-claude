// Modelo "escolha": escolha multipla visual. A resposta e o id de uma opcao (ex.: "b").
//
// escolha({
//   id, title, category, difficulty, concept, prompt, explanation,
//   scenario?: { kind: 'email'|'url'|'texto'|'conversa', label?, lines: [...] },
//   options: [{ id: 'a', text: '...', detail?: '...' }, ...],
//   answer: 'b',
// })
import { h, criarCartao, verificarDefinicao, cabecalho, cenario, botaoConfirmar, bloquear } from './common.js';

export function escolha(def) {
  verificarDefinicao(def, 'escolha', ['options', 'answer']);
  const ids = def.options.map((o) => o.id);
  if (new Set(ids).size !== ids.length) throw new Error(`${def.id}: ids de opcao repetidos`);
  if (!ids.includes(def.answer)) throw new Error(`${def.id}: a resposta "${def.answer}" nao e uma opcao`);

  return criarCartao('escolha', def, {
    validate: (answer) => answer === def.answer,
    render(container, api) {
      const doc = container.ownerDocument;
      let escolhida = null;
      const botoes = def.options.map((o) =>
        h(doc, 'button', {
          class: 'opcao', type: 'button', role: 'radio', 'data-opcao': o.id,
          attrs: { 'aria-checked': 'false' },
          on: {
            click: () => {
              escolhida = o.id;
              for (const b of botoes) b.setAttribute('aria-checked', b.dataset.opcao === o.id ? 'true' : 'false');
            },
          },
        },
        h(doc, 'span', { class: 'opcao-texto', text: o.text }),
        o.detail ? h(doc, 'span', { class: 'opcao-detalhe', text: o.detail }) : null),
      );
      const confirmar = botaoConfirmar(doc, () => {
        if (escolhida === null) return;
        bloquear(container);
        api.responder(escolhida);
      });
      container.replaceChildren(
        h(doc, 'article', { class: 'cartao cartao-escolha', 'data-cartao': def.id },
          cabecalho(doc, def),
          cenario(doc, def.scenario),
          h(doc, 'div', { class: 'opcoes', role: 'radiogroup', attrs: { 'aria-label': 'Opcoes' } }, ...botoes),
          h(doc, 'div', { class: 'cartao-acoes' }, confirmar),
        ),
      );
    },
  });
}
