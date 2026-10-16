import { h } from '../templates/common.js';

export function renderPontuacao(container, { categorias = [], cartoes = [], progresso = {} } = {}) {
  const doc = container.ownerDocument;
  let totalPontos = 0;
  let totalResolvidos = 0;
  let totalCartoes = 0;
  let maximo = 0;

  const linhas = categorias.map((cat) => {
    const dela = cartoes.filter((c) => c.category === cat.id);
    let resolvidos = 0;
    let pontos = 0;
    for (const c of dela) {
      const valor = Number(c.difficulty) * 10;
      maximo += valor;
      if (progresso && progresso[c.id] && progresso[c.id].certo === true) {
        resolvidos += 1;
        pontos += valor;
      }
    }
    totalPontos += pontos;
    totalResolvidos += resolvidos;
    totalCartoes += dela.length;
    return h(doc, 'tr', { 'data-categoria': cat.id },
      h(doc, 'th', { text: cat.nome }),
      h(doc, 'td', { class: 'numero', 'data-resolvidos': '', text: `${resolvidos} de ${dela.length}` }),
      h(doc, 'td', { class: 'numero', 'data-pontos': '', text: String(pontos) }),
    );
  });

  container.replaceChildren(
    h(doc, 'section', { class: 'pontuacao' },
      h(doc, 'header', { class: 'pagina-cabecalho' },
        h(doc, 'h1', { class: 'pagina-titulo', text: 'Pontuação' }),
        h(doc, 'p', { class: 'pagina-resumo', 'data-resumo': '', text: `Tens ${totalPontos} pontos de ${maximo} possíveis.` }),
      ),
      h(doc, 'table', { class: 'tabela-pontos' },
        h(doc, 'thead', {},
          h(doc, 'tr', {},
            h(doc, 'th', { text: 'Categoria' }),
            h(doc, 'th', { class: 'numero', text: 'Resolvidos' }),
            h(doc, 'th', { class: 'numero', text: 'Pontos' }),
          ),
        ),
        h(doc, 'tbody', {}, ...linhas),
        h(doc, 'tfoot', {},
          h(doc, 'tr', { class: 'total', 'data-total': '' },
            h(doc, 'th', { text: 'Total' }),
            h(doc, 'td', { class: 'numero', 'data-resolvidos': '', text: `${totalResolvidos} de ${totalCartoes}` }),
            h(doc, 'td', { class: 'numero', 'data-pontos': '', text: String(totalPontos) }),
          ),
        ),
      ),
    ),
  );
}
