// Modelo "ordenar": o jogador poe os itens pela ordem certa (setas ou arrastar).
// A resposta e a lista de ids pela ordem escolhida.
//
// ordenar({
//   id, title, category, difficulty, concept, prompt, explanation,
//   items: [{ id: 'x', text: '...' }, ...],   // ordem em que aparecem (baralhada)
//   answer: ['y', 'x', 'z'],                  // ordem certa
// })
import { h, criarCartao, verificarDefinicao, cabecalho, botaoConfirmar, bloquear } from './common.js';

export function ordenar(def) {
  verificarDefinicao(def, 'ordenar', ['items', 'answer']);
  const ids = def.items.map((i) => i.id);
  if (ids.length < 3) throw new Error(`${def.id}: ordenar precisa de pelo menos 3 itens`);
  if (def.answer.length !== ids.length || !def.answer.every((x) => ids.includes(x))) {
    throw new Error(`${def.id}: answer tem de conter exatamente os ids dos itens`);
  }
  if (def.answer.every((x, i) => x === ids[i])) throw new Error(`${def.id}: os itens nao podem comecar ja na ordem certa`);

  return criarCartao('ordenar', def, {
    validate: (answer) => Array.isArray(answer) && answer.length === def.answer.length && answer.every((x, i) => x === def.answer[i]),
    render(container, api) {
      const doc = container.ownerDocument;
      let ordem = [...ids];
      const porId = new Map(def.items.map((i) => [i.id, i]));
      const lista = h(doc, 'ol', { class: 'ordenar-lista' });
      let arrastado = null;

      const mover = (id, delta) => {
        const i = ordem.indexOf(id);
        const j = i + delta;
        if (j < 0 || j >= ordem.length) return;
        [ordem[i], ordem[j]] = [ordem[j], ordem[i]];
        desenhar();
      };

      function desenhar() {
        lista.replaceChildren(
          ...ordem.map((id, pos) =>
            h(doc, 'li', {
              class: 'ordenar-item', draggable: 'true', 'data-item': id,
              on: {
                dragstart: () => (arrastado = id),
                dragover: (ev) => ev.preventDefault(),
                drop: (ev) => {
                  ev.preventDefault();
                  if (arrastado && arrastado !== id) {
                    ordem = ordem.filter((x) => x !== arrastado);
                    ordem.splice(ordem.indexOf(id), 0, arrastado);
                    arrastado = null;
                    desenhar();
                  }
                },
              },
            },
            h(doc, 'span', { class: 'ordenar-texto', text: porId.get(id).text }),
            h(doc, 'span', { class: 'ordenar-setas' },
              h(doc, 'button', { class: 'seta', type: 'button', disabled: pos === 0, 'data-mover': 'cima', attrs: { 'aria-label': 'Subir' }, on: { click: () => mover(id, -1) } }, '↑'),
              h(doc, 'button', { class: 'seta', type: 'button', disabled: pos === ordem.length - 1, 'data-mover': 'baixo', attrs: { 'aria-label': 'Descer' }, on: { click: () => mover(id, 1) } }, '↓'),
            )),
          ),
        );
      }

      desenhar();
      const confirmar = botaoConfirmar(doc, () => {
        bloquear(container);
        api.responder([...ordem]);
      });
      container.replaceChildren(
        h(doc, 'article', { class: 'cartao cartao-ordenar', 'data-cartao': def.id },
          cabecalho(doc, def),
          lista,
          h(doc, 'div', { class: 'cartao-acoes' }, confirmar),
        ),
      );
    },
  });
}
