// Modelo "clica-erro": mostra um excerto (codigo, URL, mensagem) dividido em segmentos;
// o jogador clica no(s) segmento(s) inseguro(s). A resposta e uma lista de indices (ex.: [2]).
//
// clicaErro({
//   id, title, category, difficulty, concept, prompt, explanation,
//   language?: 'html'|'js'|'sql'|'texto'|'url',
//   segments: ['linha 0', 'linha 1', ...],
//   answer: [1],            // indices dos segmentos inseguros
// })
import { h, criarCartao, verificarDefinicao, cabecalho, botaoConfirmar, bloquear } from './common.js';

function normalizarIndices(v) {
  const arr = Array.isArray(v) ? v : [v];
  if (!arr.every((x) => Number.isInteger(x))) return null;
  return [...new Set(arr)].sort((a, b) => a - b);
}

export function clicaErro(def) {
  verificarDefinicao(def, 'clica-erro', ['segments', 'answer']);
  const certa = normalizarIndices(def.answer);
  if (!certa || certa.length === 0) throw new Error(`${def.id}: answer tem de ter pelo menos um indice`);
  if (certa.some((i) => i < 0 || i >= def.segments.length)) throw new Error(`${def.id}: indice fora dos segmentos`);

  return criarCartao('clica-erro', def, {
    validate: (answer) => {
      const a = normalizarIndices(answer);
      return !!a && a.length === certa.length && a.every((x, i) => x === certa[i]);
    },
    render(container, api) {
      const doc = container.ownerDocument;
      const marcados = new Set();
      const segmentos = def.segments.map((texto, i) =>
        h(doc, 'button', {
          class: 'segmento', type: 'button', 'data-indice': i,
          attrs: { 'aria-pressed': 'false' },
          on: {
            click: (ev) => {
              const b = ev.currentTarget;
              if (marcados.has(i)) marcados.delete(i);
              else marcados.add(i);
              b.setAttribute('aria-pressed', marcados.has(i) ? 'true' : 'false');
            },
          },
        },
        h(doc, 'span', { class: 'segmento-numero', text: String(i + 1) }),
        h(doc, 'code', { class: 'segmento-texto', text: texto })),
      );
      const confirmar = botaoConfirmar(doc, () => {
        if (marcados.size === 0) return;
        bloquear(container);
        api.responder([...marcados].sort((a, b) => a - b));
      });
      container.replaceChildren(
        h(doc, 'article', { class: 'cartao cartao-clica-erro', 'data-cartao': def.id },
          cabecalho(doc, def),
          h(doc, 'div', { class: `excerto excerto-${def.language || 'texto'}`, role: 'group', attrs: { 'aria-label': 'Excerto' } }, ...segmentos),
          h(doc, 'p', { class: 'cartao-ajuda', text: 'Clica no(s) trecho(s) inseguro(s) e confirma.' }),
          h(doc, 'div', { class: 'cartao-acoes' }, confirmar),
        ),
      );
    },
  });
}
