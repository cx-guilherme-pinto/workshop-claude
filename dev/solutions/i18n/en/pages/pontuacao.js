// Reference solution for the tabela-pontuacao task, English Arena (dev/solutions: NOT part of the kit).
import { h } from '../templates/common.js';

const pontosDe = (c) => ([1, 2, 3].includes(c.difficulty) ? c.difficulty * 10 : 0);

export function renderPontuacao(container, { categorias = [], cartoes = [], progresso = {} }) {
  const doc = container.ownerDocument;
  const certo = (c) => progresso?.[c.id]?.certo === true;

  const linhas = categorias.map((cat) => {
    const cs = cartoes.filter((c) => c.category === cat.id);
    const ok = cs.filter(certo);
    return {
      cat,
      cartoes: cs.length,
      resolvidos: ok.length,
      pontos: ok.reduce((s, c) => s + pontosDe(c), 0),
      maximo: cs.reduce((s, c) => s + pontosDe(c), 0),
    };
  });
  const soma = (k) => linhas.reduce((s, l) => s + l[k], 0);
  const total = { cartoes: soma('cartoes'), resolvidos: soma('resolvidos'), pontos: soma('pontos'), maximo: soma('maximo') };

  const numeros = (l) => [
    h(doc, 'td', { class: 'numero', 'data-resolvidos': '', text: `${l.resolvidos} of ${l.cartoes}` }),
    h(doc, 'td', { class: 'numero', 'data-pontos': '', text: String(l.pontos) }),
  ];

  container.replaceChildren(
    h(doc, 'section', { class: 'pontuacao' },
      h(doc, 'header', { class: 'pagina-cabecalho' },
        h(doc, 'h1', { class: 'pagina-titulo', text: 'Score' }),
        h(doc, 'p', { class: 'pagina-resumo', 'data-resumo': '', text: `You have ${total.pontos} points out of ${total.maximo} possible.` }),
      ),
      h(doc, 'table', { class: 'tabela-pontos' },
        h(doc, 'thead', {},
          h(doc, 'tr', {},
            h(doc, 'th', { text: 'Category' }),
            h(doc, 'th', { class: 'numero', text: 'Solved' }),
            h(doc, 'th', { class: 'numero', text: 'Points' }),
          ),
        ),
        h(doc, 'tbody', {}, ...linhas.map((l) => h(doc, 'tr', { 'data-categoria': l.cat.id }, h(doc, 'th', { text: l.cat.nome }), ...numeros(l)))),
        h(doc, 'tfoot', {}, h(doc, 'tr', { class: 'total', 'data-total': '' }, h(doc, 'th', { text: 'Total' }), ...numeros(total))),
      ),
    ),
  );
}
