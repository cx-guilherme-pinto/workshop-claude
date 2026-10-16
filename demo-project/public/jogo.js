// Montar um cartao para jogar: carrega cards/<id>/card.js, chama render(contentor, api)
// e, quando o cartao chama api.responder(resposta), valida, regista o progresso e mostra
// a faixa do resultado com a explicacao. Usado pela galeria e pelo painel do /estado.
import { el, ID_VALIDO } from './dom.js';
import { registarResposta, pontosDe } from './progresso.js';

export async function carregarCartao(id, versao) {
  if (!ID_VALIDO.test(String(id))) throw new Error('id de cartão inválido');
  const sufixo = Number.isFinite(versao) ? `?v=${versao}` : '';
  const m = await import(`/cards/${id}/card.js${sufixo}`);
  const c = m.default;
  if (!c || typeof c.render !== 'function' || typeof c.validate !== 'function') {
    throw new Error('o card.js não tem um export default com render() e validate()');
  }
  return c;
}

function semMovimento() {
  try {
    return matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return true;
  }
}

function faixaResultado(cartao, certo, acoes) {
  const pts = pontosDe(cartao.difficulty);
  return el('section', { class: 'resultado', 'data-certo': certo ? 'sim' : 'nao', tabindex: '-1', attrs: { 'aria-label': 'Resultado' } },
    el('p', { class: 'resultado-veredito' },
      el('span', { text: certo ? 'Certo.' : 'Ainda não.' }),
      el('span', { class: 'resultado-pontos', text: certo ? (pts ? `Mais ${pts} pontos` : 'Resolvido') : 'Lê a explicação e tenta outra vez' }),
    ),
    el('div', { class: 'resultado-corpo' },
      el('p', { class: 'resultado-explicacao', text: String(cartao.explanation ?? '') }),
      cartao.concept ? el('p', { class: 'resultado-conceito' }, el('strong', { text: 'A ideia: ' }), String(cartao.concept)) : null,
      acoes.length ? el('div', { class: 'resultado-acoes' }, ...acoes) : null,
    ),
  );
}

// acoes({ certo, repetir }) devolve os botoes/ligacoes da faixa do resultado.
export function montarJogo(destino, cartao, { acoes = () => [], aoResponder = null } = {}) {
  const palco = el('div', { class: 'palco' });
  const zona = el('div', { class: 'resultado-zona', attrs: { 'aria-live': 'polite' } });
  destino.replaceChildren(palco, zona);
  let respondido = false;

  const api = {
    responder(resposta) {
      if (respondido) return { certo: null };
      respondido = true;
      let certo = false;
      try {
        certo = cartao.validate(resposta) === true;
      } catch {
        certo = false;
      }
      const registo = registarResposta(cartao.id, certo);
      const faixa = faixaResultado(cartao, certo, acoes({ certo, repetir: desenhar }));
      zona.replaceChildren(faixa);
      faixa.focus({ preventScroll: true });
      faixa.scrollIntoView({ block: 'nearest', behavior: semMovimento() ? 'auto' : 'smooth' });
      if (aoResponder) aoResponder({ certo, registo });
      return { certo, explicacao: cartao.explanation };
    },
  };

  function desenhar() {
    respondido = false;
    zona.replaceChildren();
    try {
      cartao.render(palco, api);
    } catch (e) {
      palco.replaceChildren(el('p', { class: 'aviso-erro', text: `Este cartão não conseguiu desenhar-se: ${e?.message || e}` }));
    }
  }

  desenhar();
  return { repetir: desenhar };
}
