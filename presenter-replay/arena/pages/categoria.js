import { h } from '../templates/common.js';

function estadoDe(cartao, progresso) {
  if (cartao.estado === 'por_construir') return 'por_construir';
  const p = progresso[cartao.id];
  if (p && p.certo === true) return 'certo';
  if (p) return 'errado';
  return 'por_jogar';
}

const TEXTOS = {
  por_construir: 'Por construir',
  certo: 'Resolvido',
  errado: 'Errado, tenta outra vez',
  por_jogar: 'Por jogar',
};

export function renderCategoria(container, { categoria, cartoes = [], progresso = {}, abrir = () => {} }) {
  const doc = container.ownerDocument;
  const prog = progresso || {};
  let resolvidos = 0;
  let pontos = 0;

  const itens = cartoes.map((cartao) => {
    const estado = estadoDe(cartao, prog);
    const p = cartao.difficulty * 10;
    if (estado === 'certo') {
      resolvidos += 1;
      pontos += p;
    }
    const porConstruir = estado === 'por_construir';
    return h(doc, 'li', { class: 'tile-item', 'data-cartao': cartao.id, 'data-estado': estado },
      h(doc, 'button', {
        class: 'tile',
        type: 'button',
        'data-abrir': cartao.id,
        disabled: porConstruir,
        on: { click: () => { if (!porConstruir) abrir(cartao.id); } },
      },
      h(doc, 'span', { class: 'tile-titulo', text: cartao.title }),
      h(doc, 'span', { class: 'tile-meta', text: `Nível ${cartao.difficulty} · ${p} pontos` }),
      h(doc, 'span', { class: 'tile-estado', text: TEXTOS[estado] })));
  });

  const corpo = itens.length
    ? h(doc, 'ul', { class: 'tiles' }, ...itens)
    : h(doc, 'p', { class: 'pagina-vazia', text: 'Ainda não há cartões nesta categoria.' });

  container.replaceChildren(
    h(doc, 'section', { class: 'categoria', 'data-categoria': categoria.id },
      h(doc, 'header', { class: 'pagina-cabecalho' },
        h(doc, 'h1', { class: 'pagina-titulo', text: categoria.nome }),
        h(doc, 'p', {
          class: 'pagina-resumo',
          'data-resumo': '',
          text: `${resolvidos} de ${cartoes.length} resolvidos · ${pontos} pontos`,
        })),
      corpo));
}
