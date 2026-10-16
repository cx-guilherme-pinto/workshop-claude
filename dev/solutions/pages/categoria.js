// Solucao de referencia da tarefa pagina-categoria (dev/solutions: NAO entra no kit).
import { h } from '../templates/common.js';

const TEXTO = {
  por_construir: 'Por construir',
  por_jogar: 'Por jogar',
  certo: 'Resolvido',
  errado: 'Errado, tenta outra vez',
};

function estadoDe(cartao, progresso) {
  if (cartao.estado === 'por_construir') return 'por_construir';
  const p = progresso[cartao.id];
  if (!p) return 'por_jogar';
  return p.certo === true ? 'certo' : 'errado';
}

export function renderCategoria(container, { categoria, cartoes = [], progresso = {}, abrir = () => {} }) {
  const doc = container.ownerDocument;
  const estados = cartoes.map((c) => estadoDe(c, progresso || {}));
  const resolvidos = cartoes.filter((_, i) => estados[i] === 'certo');
  const pontos = resolvidos.reduce((s, c) => s + c.difficulty * 10, 0);

  const itens = cartoes.map((c, i) => {
    const est = estados[i];
    const jogavel = est !== 'por_construir';
    return h(doc, 'li', { class: 'tile-item', 'data-cartao': c.id, 'data-estado': est },
      h(doc, 'button', {
        class: 'tile', type: 'button', 'data-abrir': c.id, disabled: !jogavel,
        on: { click: () => { if (jogavel) abrir(c.id); } },
      },
      h(doc, 'span', { class: 'tile-titulo', text: c.title }),
      h(doc, 'span', { class: 'tile-meta', text: `Nível ${c.difficulty} · ${c.difficulty * 10} pontos` }),
      h(doc, 'span', { class: 'tile-estado', text: TEXTO[est] })),
    );
  });

  container.replaceChildren(
    h(doc, 'section', { class: 'categoria', 'data-categoria': categoria.id },
      h(doc, 'header', { class: 'pagina-cabecalho' },
        h(doc, 'h1', { class: 'pagina-titulo', text: categoria.nome }),
        h(doc, 'p', { class: 'pagina-resumo', 'data-resumo': '', text: `${resolvidos.length} de ${cartoes.length} resolvidos · ${pontos} pontos` }),
      ),
      itens.length
        ? h(doc, 'ul', { class: 'tiles' }, ...itens)
        : h(doc, 'p', { class: 'pagina-vazia', text: 'Ainda não há cartões nesta categoria.' }),
    ),
  );
}
