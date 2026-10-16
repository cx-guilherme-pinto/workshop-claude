// /estado: um quadrado por tarefa do enxame, ao vivo por SSE (/api/events), com consulta
// a /api/status quando o SSE falha. Com ?replay=<nome> reconstroi uma execucao gravada em
// replays/<nome>/ (events.jsonl + snapshot.json), sem chamar a API do Claude.
import { el, reanimar, ID_VALIDO } from './dom.js';
import { usd, usdTotal, tempo, relogio, nomeModelo, NOME_ESTADO, plural } from './formatos.js';
import { carregarCartao, montarJogo } from './jogo.js';

const $ = (id) => document.getElementById(id);
const ui = {
  sub: $('estado-sub'),
  repeticao: $('repeticao'),
  n: { verde: $('n-verde'), em_curso: $('n-em_curso'), vermelho: $('n-vermelho'), por_fazer: $('n-por_fazer') },
  tempo: $('tempo'),
  tempoNota: $('tempo-nota'),
  custo: $('custo'),
  custoNota: $('custo-nota'),
  custoRotulo: $('custo-rotulo'),
  barra: $('barra-custo'),
  barraValor: $('barra-custo-valor'),
  quadrados: $('quadrados'),
  vazio: $('quadro-vazio'),
  verExemplo: $('ver-exemplo'),
  painel: $('painel'),
};

const estado = {
  f: null,
  ids: '',
  densidade: 'grande',
  quadrados: new Map(),
  agora: () => Date.now(),
  ligacao: 'a ligar',
  repeticao: null,
  cartoes: new Map(), // id -> { existe, versao } de /api/cards
  painel: null, // { id, info, palco }
};

const ESTADO_LONGO = {
  por_fazer: 'Por fazer: à espera das dependências ou de vaga no lote.',
  em_curso: 'A trabalhar: o agente está a fazer a tarefa.',
  verde: 'Passou: o teste ficou verde.',
  vermelho: 'Falhou: o orquestrador volta a tentar.',
  falhou: 'Falhou de vez: esgotou as tentativas.',
};

// ---------- desenhar uma fotografia ----------

function definir(no, texto) {
  if (no && no.textContent !== texto) no.textContent = texto;
}

function subtitulo(f) {
  if (estado.repeticao) {
    const r = estado.repeticao;
    return `Repetição de "${r.nome}" · ${plural(f.total, 'tarefa', 'tarefas')} · ${r.terminou ? 'terminada' : r.aTocar ? `a ${r.velocidade}×` : 'em pausa'}`;
  }
  if (f.vazio) return f.motivo === 'sem_motor' ? 'O motor do workshop (tools/workshop/) não está nesta pasta.' : 'Sem plano. Corre /demo-plan e depois /demo-swarm.';
  const fase = f.fim ? 'terminado' : f.inicio ? 'a correr' : 'à espera do primeiro lote';
  return `Modo ${f.modo || '—'} · ${plural(f.total, 'tarefa', 'tarefas')} · ${fase} · ${estado.ligacao}`;
}

function desenhar(f) {
  estado.f = f;
  const tarefas = Array.isArray(f.tarefas) ? f.tarefas : [];
  const c = f.contagem || {};
  definir(ui.n.verde, String(c.verde || 0));
  definir(ui.n.em_curso, String(c.em_curso || 0));
  definir(ui.n.vermelho, String((c.vermelho || 0) + (c.falhou || 0)));
  definir(ui.n.por_fazer, String(c.por_fazer || 0));
  definir(ui.sub, subtitulo(f));

  const ids = tarefas.map((t) => t.id).join('|');
  if (ids !== estado.ids) construirQuadrados(tarefas);
  for (const t of tarefas) atualizarQuadrado(t);
  ui.vazio.hidden = tarefas.length > 0;
  ui.quadrados.hidden = tarefas.length === 0;
  medidores();
  if (estado.painel) atualizarPainel();
}

function medidores() {
  const f = estado.f;
  if (!f) return;
  const agora = estado.agora();
  const ini = f.inicio ? Date.parse(f.inicio) : null;
  const fim = f.fim ? Date.parse(f.fim) : null;
  const s = ini ? ((fim ?? agora) - ini) / 1000 : 0;
  definir(ui.tempo, relogio(s));
  const r = estado.repeticao;
  definir(ui.tempoNota, r ? `de ${relogio(r.dados.duracao)}` : f.fim ? 'terminado' : '');

  const total = f.custo?.total || 0;
  const alvo = f.orcamento?.alvo_usd ?? 5;
  definir(ui.custo, usdTotal(total));
  definir(ui.custoRotulo, `custo total, alvo ${usdTotal(alvo)}`);
  definir(ui.custoNota, total > alvo ? 'acima do alvo' : '');
  const p = Math.max(0, Math.min(1, total / alvo));
  ui.barraValor.style.transform = `scaleX(${p.toFixed(4)})`;
  ui.barra.dataset.nivel = total > alvo ? 'acima' : total > alvo * 0.8 ? 'perto' : 'dentro';
  ui.barra.setAttribute('aria-valuemax', String(alvo));
  ui.barra.setAttribute('aria-valuenow', total.toFixed(2));

  for (const t of f.tarefas || []) if (t.estado === 'em_curso') atualizarMedidas(t);
}

// ---------- quadrados ----------

function densidadePara(n) {
  return n <= 24 ? 'grande' : n <= 60 ? 'media' : 'pequena';
}

function construirQuadrados(tarefas) {
  estado.quadrados.clear();
  estado.densidade = densidadePara(tarefas.length);
  ui.quadrados.dataset.densidade = estado.densidade;
  const itens = tarefas.map((t) => {
    const id = el('span', { class: 'quadrado-id', text: t.id });
    const vez = el('span', { class: 'quadrado-vez numero' });
    const linhas = [0, 1, 2].map(() => el('span', { class: 'quadrado-linha numero' }));
    const botao = el('button', { class: 'quadrado', type: 'button', on: { click: () => abrirPainel(t.id) } },
      el('span', { class: 'quadrado-topo' }, id, vez),
      el('span', { class: 'quadrado-rodape' }, ...linhas));
    const li = el('li', { class: 'quadrado-item', 'data-tarefa': t.id });
    li.append(botao);
    estado.quadrados.set(t.id, { li, botao, vez, linhas, estado: null });
    return li;
  });
  ui.quadrados.replaceChildren(...itens);
  estado.ids = tarefas.map((t) => t.id).join('|');
}

function segundosDe(t) {
  if (t.estado === 'em_curso') return t.inicio ? (estado.agora() - Date.parse(t.inicio)) / 1000 : null;
  return t.tempo_s ?? null;
}

// Com muitos quadrados as linhas ficam curtas: "6 min" em vez de "6 min 11 s".
function tempoCurto(s) {
  if (s === null || s === undefined || Number.isNaN(s)) return '—';
  return s < 60 ? `${Math.round(s)} s` : `${Math.round(s / 60)} min`;
}

// Tres linhas por baixo do id: quem, modelo e medidas. Arrumadas conforme o espaco.
function linhasDe(t) {
  const s = segundosDe(t);
  const custo = t.custo_usd == null ? null : usd(t.custo_usd);
  if (!t.agente) {
    const nome = NOME_ESTADO[t.estado] || t.estado;
    return [nome, t.onda ? `onda ${t.onda}` : '', ''];
  }
  const modelo = nomeModelo(t.modelo);
  if (estado.densidade === 'pequena') {
    return [t.agente, `${modelo} · ${s === null ? 'a começar' : tempoCurto(s)}`, custo ?? ''];
  }
  const medidas = s === null ? 'a começar' : custo ? `${tempo(s)} · ${custo}` : tempo(s);
  return [t.agente, modelo, medidas];
}

function atualizarMedidas(t) {
  const q = estado.quadrados.get(t.id);
  if (!q) return;
  const l = linhasDe(t);
  for (let i = 0; i < 3; i++) definir(q.linhas[i], l[i]);
}

function atualizarQuadrado(t) {
  const q = estado.quadrados.get(t.id);
  if (!q) return;
  if (q.estado !== t.estado) {
    const tinha = q.estado;
    q.estado = t.estado;
    q.li.dataset.estado = t.estado;
    if (tinha) reanimar(q.botao, 'mudou');
  }
  definir(q.vez, t.tentativa > 1 ? (estado.densidade === 'pequena' ? `${t.tentativa}.ª` : `${t.tentativa}.ª vez`) : '');
  const l = linhasDe(t);
  for (let i = 0; i < 3; i++) definir(q.linhas[i], l[i]);
  const vez = t.tentativa > 1 ? `, ${t.tentativa}.ª tentativa` : '';
  q.botao.setAttribute('aria-label', `${t.id}: ${NOME_ESTADO[t.estado] || t.estado}${vez}. ${l.filter(Boolean).join(', ')}`);
}

// ---------- painel de uma tarefa ----------

const tarefa = (id) => (estado.f?.tarefas || []).find((t) => t.id === id) || null;

function par(rotulo, valor) {
  return [el('dt', { text: rotulo }), el('dd', { text: String(valor) })];
}

function seccaoTeste(t) {
  const te = t.teste;
  const titulo = el('h3', { text: 'Resultado do teste' });
  if (!te) {
    const msg = t.estado === 'em_curso' ? 'O teste corre quando o agente terminar.' : estado.repeticao ? 'Sem resultado gravado para esta tentativa.' : 'Ainda sem resultado.';
    return el('section', { class: 'painel-seccao' }, titulo, el('p', { class: 'nota', text: msg }));
  }
  const linhas = [];
  if (te.comando) linhas.push(el('p', { class: 'nota', text: te.comando }));
  if (te.ficheiro) linhas.push(el('p', { class: 'nota', text: te.ficheiro }));
  if (Number.isFinite(te.passados) || Number.isFinite(te.falhados)) {
    linhas.push(el('p', { class: 'numero', text: `${plural(te.passados || 0, 'teste passa', 'testes passam')}, ${plural(te.falhados || 0, 'falha', 'falham')}` }));
  }
  if (te.valor) linhas.push(el('p', { text: `Veredito: ${te.valor}` }));
  const excerto = String(te.excerto || '').trim();
  linhas.push(excerto ? el('pre', { class: 'painel-excerto', text: excerto }) : el('p', { class: 'nota', text: 'Sem erros no excerto.' }));
  return el('section', { class: 'painel-seccao' }, titulo, ...linhas);
}

function cartaoExiste(t) {
  return t.grupo_tipo === 'cartao' && (estado.cartoes.get(t.id)?.existe ?? t.existe === true);
}

function seccaoAcoes(t) {
  const acoes = [];
  if (t.grupo_tipo === 'cartao') {
    if (cartaoExiste(t)) {
      acoes.push(el('button', { class: 'botao botao-principal', type: 'button', on: { click: () => jogarNoPainel(t.id) } }, 'Jogar este cartão'));
      acoes.push(el('a', { class: 'botao', href: `/#/cartao/${t.id}` }, 'Abrir na galeria'));
    } else {
      return el('p', { class: 'nota', text: `O ficheiro cards/${t.id}/card.js ainda não existe nesta pasta.` });
    }
  } else if (t.id === 'tabela-pontuacao') {
    acoes.push(el('a', { class: 'botao', href: '/#/pontuacao' }, 'Ver a pontuação'));
  } else if (t.id === 'pagina-categoria') {
    acoes.push(el('a', { class: 'botao', href: '/' }, 'Ver as categorias'));
  }
  return acoes.length ? el('div', { class: 'painel-acoes' }, ...acoes) : null;
}

function infoPainel(t) {
  return [
    el('div', { class: 'painel-topo' },
      el('div', {},
        el('h2', { class: 'titulo-secao', id: 'painel-titulo', tabindex: '-1', text: t.id }),
        t.titulo ? el('p', { text: t.titulo }) : null),
      el('button', { class: 'botao botao-pequeno', type: 'button', on: { click: fecharPainel } }, 'Fechar')),
    el('p', { class: 'painel-estado', 'data-estado': t.estado, text: ESTADO_LONGO[t.estado] || t.estado }),
    el('dl', { class: 'painel-dados' },
      ...par('agente', t.agente || '—'),
      ...par('modelo', nomeModelo(t.modelo)),
      ...par('tentativa', t.tentativa || '—'),
      ...par('tempo', t.estado === 'em_curso' && t.inicio ? tempo((estado.agora() - Date.parse(t.inicio)) / 1000) : tempo(t.tempo_s)),
      ...par('custo', usd(t.custo_usd)),
      ...par('onda', t.onda ?? '—')),
    seccaoTeste(t),
    seccaoAcoes(t),
  ];
}

function abrirPainel(id) {
  const t = tarefa(id);
  if (!t) return;
  const info = el('div', { class: 'painel-info' });
  const palco = el('div', { class: 'palco-painel' });
  estado.painel = { id, info, palco, assinatura: '' };
  ui.painel.replaceChildren(el('div', { class: 'painel-conteudo' }, info, palco));
  atualizarPainel();
  if (!ui.painel.open) ui.painel.showModal();
  ui.painel.querySelector('#painel-titulo')?.focus();
  atualizarCartoes();
}

function atualizarPainel() {
  const p = estado.painel;
  const t = p && tarefa(p.id);
  if (!t) return;
  const assinatura = JSON.stringify([t.estado, t.tentativa, t.agente, t.modelo, t.custo_usd, t.tempo_s, t.teste, cartaoExiste(t), t.estado === 'em_curso' ? Math.floor(estado.agora() / 1000) : 0]);
  if (assinatura === p.assinatura) return;
  p.assinatura = assinatura;
  p.info.replaceChildren(...infoPainel(t).filter(Boolean));
}

function fecharPainel() {
  if (ui.painel.open) ui.painel.close();
}

async function jogarNoPainel(id) {
  const p = estado.painel;
  if (!p) return;
  p.palco.replaceChildren(el('p', { class: 'nota', text: 'A carregar o cartão…' }));
  try {
    const cartao = await carregarCartao(id, estado.cartoes.get(id)?.versao);
    if (estado.painel !== p) return;
    montarJogo(p.palco, cartao, {
      acoes: ({ certo, repetir }) => [
        certo ? null : el('button', { class: 'botao botao-principal', type: 'button', on: { click: () => repetir() } }, 'Tentar outra vez'),
        el('a', { class: 'botao', href: `/#/cartao/${id}` }, 'Abrir na galeria'),
      ].filter(Boolean),
    });
    p.palco.querySelector('.cartao')?.scrollIntoView({ block: 'start' });
  } catch (e) {
    p.palco.replaceChildren(el('p', { class: 'aviso-erro', text: `Este cartão não carregou: ${e?.message || e}` }));
  }
}

ui.painel.addEventListener('close', () => {
  estado.painel = null;
  ui.painel.replaceChildren();
});
ui.painel.addEventListener('click', (ev) => {
  if (ev.target === ui.painel) fecharPainel();
});

// ---------- cartoes que existem nesta pasta (para "Jogar") ----------

let cartoesAgendado = null;
function atualizarCartoes() {
  clearTimeout(cartoesAgendado);
  cartoesAgendado = setTimeout(async () => {
    try {
      const r = await fetch('/api/cards', { cache: 'no-store' });
      if (!r.ok) return;
      const d = await r.json();
      estado.cartoes = new Map((d.cartoes || []).filter((c) => ID_VALIDO.test(String(c.id))).map((c) => [c.id, { existe: !!c.existe, versao: c.versao }]));
      if (estado.painel) atualizarPainel();
    } catch {
      /* sem servidor: o painel usa o que a fotografia diz */
    }
  }, 200);
}

// ---------- ao vivo ----------

function iniciarAoVivo() {
  let ultimoSse = 0;
  const aplicar = (f, via) => {
    estado.ligacao = via;
    desenhar(f);
  };
  if ('EventSource' in window) {
    const es = new EventSource('/api/events');
    es.addEventListener('estado', (ev) => {
      ultimoSse = Date.now();
      try {
        aplicar(JSON.parse(ev.data), 'ao vivo');
        atualizarCartoes();
      } catch {
        /* mensagem invalida: ignorar */
      }
    });
    es.addEventListener('ping', () => {
      ultimoSse = Date.now();
      if (estado.ligacao !== 'ao vivo' && estado.f) aplicar(estado.f, 'ao vivo');
    });
    es.addEventListener('error', () => {
      if (estado.f) aplicar(estado.f, 'a religar…');
    });
  }
  const consultar = async () => {
    try {
      const r = await fetch('/api/status', { cache: 'no-store' });
      if (r.ok) aplicar(await r.json(), Date.now() - ultimoSse > 5000 ? 'por consulta a cada 2 s' : 'ao vivo');
    } catch {
      estado.ligacao = 'sem ligação ao servidor';
      if (estado.f) desenhar(estado.f);
      else definir(ui.sub, 'Sem ligação ao servidor. Arranca-o com node server.js.');
    }
  };
  consultar();
  setInterval(() => {
    if (Date.now() - ultimoSse > 5000) consultar();
  }, 2000);
  setInterval(medidores, 1000);
  atualizarCartoes();
  fetch('/api/replay', { cache: 'no-store' })
    .then((r) => (r.ok ? r.json() : null))
    .then((d) => {
      if (d?.repeticoes?.some((x) => x.nome === 'exemplo')) ui.verExemplo.hidden = false;
    })
    .catch(() => {});
}

// ---------- repeticao ----------

const VELOCIDADES = [1, 10, 20, 30];
const TERMINAIS = new Set(['verde', 'vermelho', 'falhou']);

function prepararRepeticao(nome, { snapshot, eventos }) {
  const snap = snapshot && typeof snapshot === 'object' ? snapshot : {};
  const evs = (Array.isArray(eventos) ? eventos : [])
    .filter((e) => e && typeof e.ts === 'string' && !Number.isNaN(Date.parse(e.ts)))
    .map((e, i) => ({ ...e, t: Date.parse(e.ts), i }))
    .sort((a, b) => a.t - b.t || a.i - b.i);
  const doSnap = Array.isArray(snap.tarefas) ? snap.tarefas.filter((t) => t && ID_VALIDO.test(String(t.id))) : [];
  const ordem = doSnap.map((t) => t.id);
  for (const e of evs) if (e.tarefa && ID_VALIDO.test(String(e.tarefa)) && !ordem.includes(e.tarefa)) ordem.push(e.tarefa);
  const inicio = evs.find((e) => e.tipo === 'inicio')?.t ?? (snap.inicio ? Date.parse(snap.inicio) : evs[0]?.t ?? Date.now());
  const fimEv = [...evs].reverse().find((e) => e.tipo === 'fim');
  const fim = fimEv?.t ?? (snap.fim ? Date.parse(snap.fim) : evs[evs.length - 1]?.t ?? inicio);
  return { nome, snap, evs, ordem, porId: new Map(doSnap.map((t) => [t.id, t])), inicio, duracao: Math.max(1, (fim - inicio) / 1000) };
}

class Reprodutor {
  constructor(dados) {
    this.dados = dados;
    this.nome = dados.nome;
    this.velocidade = 20;
    this.aTocar = true;
    this.reiniciar();
  }

  reiniciar() {
    this.pos = 0;
    this.i = 0;
    this.terminou = false;
    this.fim = null;
    this.custo = { principal: 0, subagentes: 0 };
    this.tarefas = this.dados.ordem.map((id) => {
      const s = this.dados.porId.get(id) || {};
      return {
        id, titulo: s.titulo ?? null, grupo: s.grupo ?? null, grupo_tipo: s.grupo_tipo ?? null, onda: s.onda ?? null,
        estado: 'por_fazer', tentativa: 0, agente: null, modelo: null, tempo_s: null, custo_usd: null, teste: null,
        inicio: null, fim: null, existe: s.existe,
      };
    });
    this.porId = new Map(this.tarefas.map((t) => [t.id, t]));
  }

  agora() {
    return this.dados.inicio + this.pos * 1000;
  }

  avancar(segundos) {
    this.pos = Math.min(this.dados.duracao, this.pos + segundos);
    const limite = this.agora();
    const evs = this.dados.evs;
    while (this.i < evs.length && evs[this.i].t <= limite) this.aplicar(evs[this.i++]);
    if (this.pos >= this.dados.duracao && this.i >= evs.length) this.terminou = true;
  }

  aplicar(e) {
    const t = e.tarefa ? this.porId.get(e.tarefa) : null;
    if (e.tipo === 'estado' && t && typeof e.estado === 'string') {
      t.estado = e.estado;
      if (Number.isInteger(e.tentativa)) t.tentativa = e.tentativa;
      if (e.agente) t.agente = String(e.agente);
      if (e.modelo) t.modelo = String(e.modelo);
      if (e.estado === 'em_curso') {
        t.inicio = e.ts;
        t.fim = null;
        t.teste = null;
      } else if (TERMINAIS.has(e.estado)) {
        t.fim = e.ts;
        const s = this.dados.porId.get(t.id);
        if (s && s.estado === e.estado && (s.tentativa ?? t.tentativa) === t.tentativa) t.teste = s.teste ?? null;
        if (t.tempo_s == null && t.inicio) t.tempo_s = (e.t - Date.parse(t.inicio)) / 1000;
      }
    } else if (e.tipo === 'custo') {
      const v = Number(e.custo_usd) || 0;
      if (t) {
        t.custo_usd = (t.custo_usd || 0) + v;
        if (Number.isFinite(e.duracao_s)) t.tempo_s = e.duracao_s;
        if (e.modelo) t.modelo = String(e.modelo);
        if (!t.agente && e.agente) t.agente = String(e.agente);
        this.custo.subagentes += v;
      } else {
        this.custo.principal += v;
      }
    } else if (e.tipo === 'fim') {
      this.fim = e.ts;
      const real = Number(this.dados.snap.custo?.total);
      const agora = this.custo.principal + this.custo.subagentes;
      if (Number.isFinite(real) && real > agora) this.custo.principal += real - agora;
    }
  }

  fotografia() {
    const contagem = { por_fazer: 0, em_curso: 0, verde: 0, vermelho: 0, falhou: 0 };
    for (const t of this.tarefas) if (t.estado in contagem) contagem[t.estado]++;
    return {
      modo: this.dados.snap.modo ?? null,
      inicio: new Date(this.dados.inicio).toISOString(),
      fim: this.fim,
      total: this.tarefas.length,
      contagem,
      custo: { total: this.custo.principal + this.custo.subagentes, ...this.custo },
      tarefas: this.tarefas.map((t) => ({ ...t })),
      orcamento: this.dados.snap.orcamento ?? { alvo_usd: 5, teto_usd: 10 },
    };
  }
}

function controlosRepeticao(r) {
  const velocidades = VELOCIDADES.map((v) =>
    el('button', { class: 'segmento-vista numero', type: 'button', 'data-velocidade': v, attrs: { 'aria-pressed': v === r.velocidade ? 'true' : 'false' }, on: { click: () => mudarVelocidade(v) } }, `${v}×`));
  const pausa = el('button', { class: 'botao botao-pequeno', type: 'button', id: 'repeticao-pausa', on: { click: alternarPausa } }, 'Pausa');
  const botaoRecomecar = el('button', { class: 'botao botao-pequeno', type: 'button', on: { click: recomecar } }, 'Recomeçar');
  const real = r.dados.snap.custo?.total;
  ui.repeticao.replaceChildren(
    el('div', { class: 'segmentos', role: 'group', attrs: { 'aria-label': 'Velocidade da repetição' } }, ...velocidades),
    pausa,
    botaoRecomecar,
    el('p', { class: 'nota numero repeticao-real', text: `Execução real: ${tempo(r.dados.duracao)} · ${Number.isFinite(real) ? usdTotal(real) : 'custo desconhecido'} · sem chamadas à API` }),
  );
  ui.repeticao.hidden = false;
}

function atualizarControlos() {
  const r = estado.repeticao;
  for (const b of ui.repeticao.querySelectorAll('[data-velocidade]')) b.setAttribute('aria-pressed', Number(b.dataset.velocidade) === r.velocidade ? 'true' : 'false');
  const p = $('repeticao-pausa');
  if (p) p.textContent = r.terminou ? 'Terminada' : r.aTocar ? 'Pausa' : 'Continuar';
  if (p) p.disabled = r.terminou;
}

function mudarVelocidade(v) {
  estado.repeticao.velocidade = v;
  atualizarControlos();
  desenhar(estado.repeticao.fotografia());
}

function alternarPausa() {
  const r = estado.repeticao;
  if (r.terminou) return;
  r.aTocar = !r.aTocar;
  atualizarControlos();
  desenhar(r.fotografia());
}

function recomecar() {
  const r = estado.repeticao;
  r.reiniciar();
  r.aTocar = true;
  atualizarControlos();
  desenhar(r.fotografia());
}

async function iniciarRepeticao(nome) {
  definir(ui.sub, 'A carregar a repetição…');
  let dados;
  try {
    const r = await fetch(`/api/replay/${encodeURIComponent(nome)}`, { cache: 'no-store' });
    if (!r.ok) throw new Error(String(r.status));
    dados = prepararRepeticao(nome, await r.json());
  } catch {
    definir(ui.sub, `Não encontrei a repetição "${nome}" em replays/.`);
    ui.vazio.hidden = false;
    return;
  }
  const rep = new Reprodutor(dados);
  estado.repeticao = rep;
  estado.agora = () => rep.agora();
  controlosRepeticao(rep);
  atualizarCartoes();
  rep.avancar(0);
  desenhar(rep.fotografia());
  let antes = performance.now();
  setInterval(() => {
    const agora = performance.now();
    const dt = Math.min(1, (agora - antes) / 1000);
    antes = agora;
    if (rep.aTocar && !rep.terminou) {
      rep.avancar(dt * rep.velocidade);
      if (rep.terminou) atualizarControlos();
      desenhar(rep.fotografia());
    }
  }, 100);
  document.addEventListener('keydown', (ev) => {
    if (ui.painel.open || ev.target !== document.body || ev.metaKey || ev.ctrlKey || ev.altKey) return;
    if (ev.key === ' ') {
      ev.preventDefault();
      alternarPausa();
    } else if (ev.key === 'r' || ev.key === 'R') {
      recomecar();
    } else if (['1', '2', '3', '4'].includes(ev.key)) {
      mudarVelocidade(VELOCIDADES[Number(ev.key) - 1]);
    }
  });
}

// ---------- arranque ----------

const pedido = new URLSearchParams(location.search).get('replay');
if (pedido !== null) {
  if (ID_VALIDO.test(pedido)) iniciarRepeticao(pedido);
  else definir(ui.sub, 'Nome de repetição inválido: só letras minúsculas, números e hífens.');
} else {
  iniciarAoVivo();
}
