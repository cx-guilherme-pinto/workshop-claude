// Galeria da Arena de Seguranca: inicio, categoria, cartao, pontuacao e "Correr testes".
// Rotas por hash: #/  #/categoria/<id>  #/cartao/<id>  #/pontuacao
// As paginas de categoria e de pontuacao (pages/*.js) sao feitas pelo enxame na onda 2:
// importam-se dinamicamente e, enquanto nao existem, aparece um aviso.
import { el, reanimar, ID_VALIDO } from './dom.js';
import { NOME_MODELO_CARTAO, plural } from './formatos.js';
import { lerProgresso, apagarProgresso, pontosDe } from './progresso.js';
import { carregarCartao, montarJogo } from './jogo.js';

const TITULO = 'Arena de Segurança';
const main = document.getElementById('conteudo');

const estado = {
  dados: { modo: null, categorias: [], cartoes: [], paginas: {}, assinatura: null },
  carregado: false,
  erro: null,
  rota: null,
  passo: 0, // muda a cada desenho, para ignorar respostas antigas de import()
  vista: 'progresso', // cor dos cartoes no inicio: 'progresso' ou 'testes'
  testes: new Map(), // id -> { estado, passados, total, falhas, ms }
  aCorrer: false,
  resumo: null, // ultimo resumo dos testes
  assinaturaTestada: null,
  execucao: 0,
  tiles: new Map(), // id -> <li> no inicio
};

// ---------- dados ----------

async function obterCartoes() {
  const r = await fetch('/api/cards', { cache: 'no-store' });
  if (!r.ok) throw new Error(`/api/cards respondeu ${r.status}`);
  const d = await r.json();
  return {
    modo: d.modo ?? null,
    categorias: Array.isArray(d.categorias) ? d.categorias : [],
    cartoes: Array.isArray(d.cartoes) ? d.cartoes.filter((c) => ID_VALIDO.test(String(c.id))) : [],
    paginas: d.paginas || {},
    assinatura: d.assinatura ?? null,
  };
}

// Com plano, mostra os cartoes do plano; sem plano, os do modo participante. Os que existem aparecem sempre.
function visiveis() {
  const { modo, cartoes } = estado.dados;
  return cartoes.filter((c) => c.existe || (modo ? c.no_plano : c.modo === 'participante'));
}

function agrupar(lista) {
  const cats = estado.dados.categorias.map((c) => ({ id: c.id, nome: c.nome, cartoes: lista.filter((x) => x.category === c.id) }));
  const conhecidas = new Set(cats.map((c) => c.id));
  const outros = lista.filter((x) => !conhecidas.has(x.category));
  if (outros.length) cats.push({ id: 'outros', nome: 'Outros', cartoes: outros, extra: true });
  return cats.filter((c) => c.cartoes.length);
}

function estadoProgresso(c, progresso) {
  if (!c.existe) return 'por_construir';
  const p = progresso[c.id];
  if (!p) return 'por_jogar';
  return p.certo ? 'certo' : 'errado';
}

const TEXTO_ESTADO = {
  por_construir: 'Por construir',
  por_jogar: 'Por jogar',
  certo: 'Resolvido',
  errado: 'Errado, tenta outra vez',
};

// ---------- rotas ----------

function rotaAtual() {
  const h = location.hash;
  if (!h.startsWith('#/')) return { nome: 'inicio' };
  const partes = h.slice(2).split('/').filter(Boolean);
  if (!partes.length) return { nome: 'inicio' };
  if (partes.length === 1 && partes[0] === 'pontuacao') return { nome: 'pontuacao' };
  if (partes.length === 2 && partes[0] === 'categoria' && ID_VALIDO.test(partes[1])) return { nome: 'categoria', id: partes[1] };
  if (partes.length === 2 && partes[0] === 'cartao' && ID_VALIDO.test(partes[1])) return { nome: 'cartao', id: partes[1] };
  return { nome: 'nao_encontrado' };
}

function marcarNavegacao(rota) {
  const atual = rota.nome === 'pontuacao' ? 'pontuacao' : 'inicio';
  for (const a of document.querySelectorAll('[data-nav]')) {
    if (a.dataset.nav === atual) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  }
}

function titulo(t) {
  document.title = t ? `${t} · ${TITULO}` : TITULO;
}

async function desenhar({ aoVivo = false } = {}) {
  const rota = rotaAtual();
  const mudouRota = !aoVivo;
  estado.rota = rota;
  const passo = ++estado.passo;
  marcarNavegacao(rota);
  if (!estado.carregado) {
    main.replaceChildren(vistaSemServidor());
    return;
  }
  const y = window.scrollY;
  if (rota.nome === 'inicio') vistaInicio();
  else if (rota.nome === 'categoria') await vistaCategoria(rota.id, passo);
  else if (rota.nome === 'cartao') await vistaCartao(rota.id, passo);
  else if (rota.nome === 'pontuacao') await vistaPontuacao(passo);
  else vistaNaoEncontrado();
  if (mudouRota) {
    window.scrollTo(0, 0);
    main.focus({ preventScroll: true });
  } else {
    window.scrollTo(0, y);
  }
}

const desatualizado = (passo) => passo !== estado.passo;

// ---------- inicio ----------

function itemPlacar(rotulo, valor) {
  return el('div', { class: 'placar-item' }, el('dt', { text: rotulo }), el('dd', { class: 'numero', text: String(valor) }));
}

function vistaInicio() {
  titulo(null);
  const lista = visiveis();
  const progresso = lerProgresso();
  const construidos = lista.filter((c) => c.existe);
  const resolvidos = construidos.filter((c) => progresso[c.id]?.certo);
  const pontos = resolvidos.reduce((s, c) => s + pontosDe(c.difficulty), 0);
  estado.tiles.clear();

  const abertura = el('section', { class: 'abertura' },
    el('h1', { class: 'abertura-titulo', text: TITULO }),
    el('p', { class: 'abertura-texto', text: 'Desafios curtos sobre segurança, feitos e testados por um enxame de agentes Claude. Escolhe um e joga.' }),
    el('dl', { class: 'placar' },
      itemPlacar('pontos', pontos),
      itemPlacar('resolvidos', `${resolvidos.length} de ${construidos.length}`),
      itemPlacar('construídos', `${construidos.length} de ${lista.length}`),
    ),
    el('div', { class: 'abertura-acoes' },
      el('button', { class: 'botao botao-principal', type: 'button', id: 'correr-testes', on: { click: () => correrTestes() } }, estado.aCorrer ? textoBotaoACorrer() : 'Correr testes'),
      el('a', { class: 'botao', href: '#/pontuacao' }, 'Ver pontuação'),
    ),
    el('div', { class: 'testes-zona', id: 'testes-zona', attrs: { 'aria-live': 'polite' } }, faixaTestes()),
  );
  if (estado.aCorrer) abertura.querySelector('#correr-testes').disabled = true;

  const grupos = agrupar(lista);
  const blocos = grupos.map((cat) => {
    const feitos = cat.cartoes.filter((c) => c.existe).length;
    const ok = cat.cartoes.filter((c) => progresso[c.id]?.certo).length;
    return el('section', { class: 'categoria-bloco', attrs: { 'aria-labelledby': `cat-${cat.id}` } },
      el('header', { class: 'categoria-bloco-cabecalho' },
        el('h2', { class: 'titulo-secao', id: `cat-${cat.id}`, text: cat.nome }),
        el('p', { class: 'nota', text: `${feitos} de ${cat.cartoes.length} construídos · ${plural(ok, 'resolvido', 'resolvidos')}` }),
        cat.extra ? null : el('a', { class: 'ligacao', href: `#/categoria/${cat.id}` }, 'Abrir a categoria'),
      ),
      el('ul', { class: 'tiles', role: 'list' }, ...cat.cartoes.map((c) => tile(c, progresso))),
    );
  });

  const corpo = grupos.length
    ? el('div', { class: 'galeria', 'data-vista': estado.vista }, ...blocos)
    : el('section', { class: 'vazio' },
      el('h2', { class: 'titulo-secao', text: 'Ainda não há cartões' }),
      el('p', { text: 'Os desafios vêm de specs/cards.json. Planeia o enxame com /demo-plan e corre-o com /demo-swarm.' }));

  main.replaceChildren(abertura, corpo);
}

function textoTile(c, est, teste) {
  if (estado.vista === 'testes' && teste) {
    if (teste.estado === 'a_correr') return 'A correr os testes…';
    if (teste.estado === 'na_fila') return 'Na fila';
    return `${teste.passados} de ${plural(teste.total, 'teste passa', 'testes passam')}`;
  }
  return TEXTO_ESTADO[est];
}

function textoFalha(id, teste) {
  const f = estado.vista === 'testes' ? teste?.falhas?.[0] : null;
  if (!f) return '';
  return semCartao(f) ? 'Ainda não há card.js.' : resumirFalha(f, id);
}

function tile(c, progresso) {
  const est = estadoProgresso(c, progresso);
  const meta = [c.difficulty ? `Nível ${c.difficulty}` : null, NOME_MODELO_CARTAO[c.model] ?? null].filter(Boolean).join(' · ');
  const teste = estado.testes.get(c.id);
  const li = el('li', { class: 'tile-item', 'data-cartao': c.id, 'data-estado': est, 'data-teste': teste?.estado });
  const partes = [
    el('span', { class: 'tile-titulo', text: c.title }),
    el('span', { class: 'tile-meta', text: meta || c.id }),
    el('span', { class: 'tile-estado', text: textoTile(c, est, teste) }),
    el('span', { class: 'tile-falha', text: textoFalha(c.id, teste) }),
  ];
  li.append(c.existe ? el('a', { class: 'tile', href: `#/cartao/${c.id}` }, ...partes) : el('div', { class: 'tile' }, ...partes));
  estado.tiles.set(c.id, { li, cartao: c, est });
  return li;
}

function pintarTile(id) {
  const t = estado.tiles.get(id);
  if (!t || !t.li.isConnected) return;
  const teste = estado.testes.get(id);
  const antes = t.li.dataset.teste;
  if (teste) t.li.dataset.teste = teste.estado;
  else delete t.li.dataset.teste;
  if (estado.vista === 'testes' && antes !== t.li.dataset.teste) reanimar(t.li.querySelector('.tile'), 'mudou');
  t.li.querySelector('.tile-estado').textContent = textoTile(t.cartao, t.est, teste);
  t.li.querySelector('.tile-falha').textContent = textoFalha(id, teste);
}

function mudarVista(v) {
  if (estado.vista === v) return;
  estado.vista = v;
  const g = main.querySelector('.galeria');
  if (g) g.dataset.vista = v;
  for (const id of estado.tiles.keys()) pintarTile(id);
  const zona = document.getElementById('testes-zona');
  if (zona) zona.replaceChildren(faixaTestes());
}

// ---------- correr testes no browser ----------

// "pw-01: card.js existe e carrega: cards/pw-01/card.js nao existe..." fica "card.js existe e carrega: ...".
function resumirFalha(f, id) {
  const nome = id && String(f.nome).startsWith(`${id}: `) ? String(f.nome).slice(id.length + 2) : String(f.nome);
  const msg = String(f.erro || '').replace(/\s+/g, ' ').trim();
  const curta = msg.length > 140 ? `${msg.slice(0, 139)}…` : msg;
  return curta ? `${nome}: ${curta}` : nome;
}

const semCartao = (f) => /existe e carrega/.test(f.nome) && /nao existe|Failed to fetch|Cannot find/.test(f.erro || '');

function listaFalhas(falhados) {
  const faltam = falhados.filter((x) => x.falhas[0] && semCartao(x.falhas[0])).map((x) => x.id);
  const outros = falhados.filter((x) => !faltam.includes(x.id));
  const linhas = [];
  if (faltam.length) {
    const ids = faltam.slice(0, 8).join(', ') + (faltam.length > 8 ? ` e mais ${faltam.length - 8}` : '');
    linhas.push(`${plural(faltam.length, 'cartão ainda não tem', 'cartões ainda não têm')} card.js: ${ids}.`);
  }
  for (const x of outros.slice(0, 5)) linhas.push(`${x.id}: ${x.falhas[0] ? resumirFalha(x.falhas[0], x.id) : 'falhou'}`);
  if (outros.length > 5) linhas.push(`E mais ${outros.length - 5} com falhas.`);
  return linhas;
}

function duracao(ms) {
  return ms < 1000 ? `${Math.max(1, Math.round(ms))} ms` : `${(ms / 1000).toFixed(1).replace('.', ',')} s`;
}

function textoBotaoACorrer() {
  const r = estado.resumo;
  return r ? `A correr… ${r.feitos} de ${r.total}` : 'A correr…';
}

function faixaTestes() {
  const r = estado.resumo;
  if (!r) return null;
  const aCorrer = r.estado === 'a_correr';
  const veredito = aCorrer
    ? `A correr os testes: ${r.feitos} de ${r.total}`
    : r.total === 0
      ? 'Não há testes de cartões'
      : `${r.passaram} de ${r.total} cartões passam os testes`;
  const detalhe = aCorrer
    ? 'Cada cartão corre o seu card.test.js aqui no browser, um de cada vez.'
    : `${plural(r.testes, 'teste', 'testes')} em ${duracao(r.ms)}, no browser.`;
  const falhas = aCorrer ? [] : listaFalhas(r.falhados);
  const botoesVista = ['progresso', 'testes'].map((v) =>
    el('button', { class: 'segmento-vista', type: 'button', attrs: { 'aria-pressed': estado.vista === v ? 'true' : 'false' }, on: { click: () => mudarVista(v) } },
      v === 'testes' ? 'Testes' : 'O meu progresso'));
  return el('div', { class: 'faixa', 'data-estado': aCorrer ? 'a_correr' : r.passaram === r.total && r.total ? 'passou' : 'falhou' },
    el('p', { class: 'faixa-veredito numero', text: veredito }),
    el('div', { class: 'faixa-corpo' },
      el('p', { class: 'numero', text: detalhe }),
      falhas.length ? el('ul', { class: 'faixa-lista', role: 'list' }, ...falhas.map((linha) => el('li', { text: linha }))) : null,
      r.aviso ? el('p', { class: 'nota', text: r.aviso }) : null,
      el('div', { class: 'segmentos', role: 'group', attrs: { 'aria-label': 'Cor dos cartões' } },
        el('span', { class: 'nota', text: 'Cor dos cartões:' }), ...botoesVista),
    ),
  );
}

function atualizarFaixa() {
  const zona = document.getElementById('testes-zona');
  if (zona) zona.replaceChildren(faixaTestes());
  const b = document.getElementById('correr-testes');
  if (b) {
    b.disabled = estado.aCorrer;
    b.textContent = estado.aCorrer ? textoBotaoACorrer() : 'Correr testes';
  }
}

function comLimite(p, ms, msg) {
  let t;
  return Promise.race([p, new Promise((_, rej) => (t = setTimeout(() => rej(new Error(msg)), ms)))]).finally(() => clearTimeout(t));
}

// Corre um card.test.js: o testkit do browser (lib/testkit-browser.js) junta os resultados
// em globalThis.__arenaResultados e as promessas em __arenaPendentes. Esvaziam-se no proprio
// array (o testkit guarda a referencia) antes de cada ficheiro.
async function correrFicheiro(c) {
  const resultados = (globalThis.__arenaResultados ||= []);
  const pendentes = (globalThis.__arenaPendentes ||= []);
  resultados.length = 0;
  pendentes.length = 0;
  const antes = new Set(document.body.children);
  const inicio = performance.now();
  try {
    await comLimite(import(`/cards/${c.id}/card.test.js?execucao=${++estado.execucao}`), 15000, 'o teste demorou mais de 15 s a carregar');
    let n = -1;
    while (n !== pendentes.length) {
      n = pendentes.length;
      await comLimite(Promise.allSettled([...pendentes]), 15000, 'os testes demoraram mais de 15 s');
    }
  } catch (e) {
    resultados.push({ nome: 'carregar card.test.js', ok: false, erro: String(e?.message || e) });
  } finally {
    for (const filho of [...document.body.children]) if (!antes.has(filho)) filho.remove();
  }
  const lista = resultados.slice();
  const falhas = lista.filter((x) => !x.ok);
  return {
    estado: lista.length && !falhas.length ? 'passou' : 'falhou',
    passados: lista.length - falhas.length,
    total: lista.length,
    falhas,
    ms: performance.now() - inicio,
  };
}

function podeRecarregarParaTestar() {
  try {
    sessionStorage.setItem('arena:correr-testes', '1');
    return true;
  } catch {
    return false;
  }
}

async function correrTestes() {
  if (estado.aCorrer) return;
  if (estado.rota?.nome !== 'inicio') location.hash = '#/';
  estado.aCorrer = true;
  try {
    estado.dados = await obterCartoes();
  } catch {
    /* fica a lista que ja havia */
  }
  // O browser guarda os modulos ja importados: se algum cartao mudou desde o ultimo teste,
  // so uma pagina nova testa a versao nova.
  if (estado.assinaturaTestada && estado.assinaturaTestada !== estado.dados.assinatura && podeRecarregarParaTestar()) {
    location.reload();
    return;
  }
  const mudou = estado.assinaturaTestada && estado.assinaturaTestada !== estado.dados.assinatura;
  estado.assinaturaTestada ??= estado.dados.assinatura;
  const alvo = visiveis().filter((c) => c.teste);
  estado.testes = new Map(alvo.map((c) => [c.id, { estado: 'na_fila', passados: 0, total: 0, falhas: [] }]));
  estado.resumo = { estado: 'a_correr', feitos: 0, total: alvo.length, passaram: 0, testes: 0, ms: 0, falhados: [], aviso: mudou ? 'Há cartões novos desde o último teste: recarrega a página para testar a versão nova.' : null };
  estado.vista = 'testes';
  desenhar({ aoVivo: true });
  const inicio = performance.now();
  for (const c of alvo) {
    estado.testes.set(c.id, { estado: 'a_correr', passados: 0, total: 0, falhas: [] });
    pintarTile(c.id);
    const r = await correrFicheiro(c);
    estado.testes.set(c.id, r);
    estado.resumo.feitos++;
    estado.resumo.testes += r.total;
    if (r.estado === 'passou') estado.resumo.passaram++;
    else estado.resumo.falhados.push({ id: c.id, falhas: r.falhas });
    estado.resumo.ms = performance.now() - inicio;
    pintarTile(c.id);
    atualizarFaixa();
  }
  estado.resumo.estado = 'fim';
  estado.aCorrer = false;
  atualizarFaixa();
}

// ---------- paginas da onda 2 ----------

const PAGINA = {
  categoria: { nome: 'A página de categoria', ficheiro: 'pages/categoria.js', spec: 'specs/pagina-categoria.md' },
  pontuacao: { nome: 'A tabela de pontuação', ficheiro: 'pages/pontuacao.js', spec: 'specs/tabela-pontuacao.md' },
};

async function importarPagina(nome) {
  const v = estado.dados.paginas?.[nome];
  if (!v) return null;
  try {
    return await import(`/pages/${nome}.js?v=${encodeURIComponent(v)}`);
  } catch (e) {
    return { erroImport: e };
  }
}

function porConstruir(contentor, nome, erro) {
  const p = PAGINA[nome];
  document.title = `Ainda por construir — onda 2 do enxame · ${TITULO}`;
  contentor.replaceChildren(
    el('div', { class: 'por-construir' },
      el('h1', { class: 'por-construir-titulo', text: 'Ainda por construir' }),
      el('p', { class: 'por-construir-onda', text: 'Onda 2 do enxame' }),
      el('p', { class: 'por-construir-texto', text: `${p.nome} é escrita por um agente Sonnet em ${p.ficheiro}, a partir de ${p.spec}. Aparece aqui quando o teste dela passar.` }),
      erro ? el('p', { class: 'nota', text: `O ficheiro existe mas deu erro: ${String(erro?.message || erro).slice(0, 300)}` }) : null,
      el('a', { class: 'botao', href: '#/' }, 'Voltar aos desafios'),
    ),
  );
}

async function vistaCategoria(id, passo) {
  const grupos = agrupar(visiveis());
  const cat = grupos.find((c) => c.id === id) || estado.dados.categorias.find((c) => c.id === id);
  if (!cat) return vistaNaoEncontrado();
  titulo(cat.nome);
  const contentor = el('section', { class: 'pagina' });
  main.replaceChildren(contentor);
  const mod = await importarPagina('categoria');
  if (desatualizado(passo)) return;
  if (typeof mod?.renderCategoria !== 'function') return porConstruir(contentor, 'categoria', mod?.erroImport);
  const cartoes = (cat.cartoes || []).map((c) => ({
    id: c.id,
    title: c.title,
    difficulty: c.difficulty,
    template: c.model,
    estado: c.existe ? 'jogavel' : 'por_construir',
  }));
  try {
    mod.renderCategoria(contentor, {
      categoria: { id: cat.id, nome: cat.nome },
      cartoes,
      progresso: lerProgresso(),
      abrir: (cid) => {
        if (ID_VALIDO.test(String(cid))) location.hash = `#/cartao/${cid}`;
      },
    });
  } catch (e) {
    porConstruir(contentor, 'categoria', e);
  }
}

async function vistaPontuacao(passo) {
  titulo('Pontuação');
  const lista = visiveis();
  const contentor = el('section', { class: 'pagina' });
  main.replaceChildren(contentor);
  const mod = await importarPagina('pontuacao');
  if (desatualizado(passo)) return;
  if (typeof mod?.renderPontuacao !== 'function') return porConstruir(contentor, 'pontuacao', mod?.erroImport);
  try {
    mod.renderPontuacao(contentor, {
      categorias: agrupar(lista).map((c) => ({ id: c.id, nome: c.nome })),
      cartoes: lista.filter((c) => c.existe).map((c) => ({ id: c.id, category: c.category ?? 'outros', difficulty: c.difficulty })),
      progresso: lerProgresso(),
    });
  } catch (e) {
    porConstruir(contentor, 'pontuacao', e);
  }
}

// ---------- jogar um cartao ----------

function proximoPorResolver(id) {
  const lista = visiveis().filter((c) => c.existe);
  const prog = lerProgresso();
  const i = lista.findIndex((c) => c.id === id);
  const depois = [...lista.slice(i + 1), ...lista.slice(0, Math.max(i, 0))];
  return depois.find((c) => !prog[c.id]?.certo) || null;
}

function aviso(tituloTexto, texto) {
  return el('div', { class: 'aviso' },
    el('h1', { class: 'titulo-secao', text: tituloTexto }),
    texto ? el('p', { text: texto }) : null,
    el('a', { class: 'botao', href: '#/' }, 'Voltar aos desafios'));
}

async function vistaCartao(id, passo) {
  const meta = estado.dados.cartoes.find((c) => c.id === id);
  if (!meta) return vistaNaoEncontrado();
  const cat = estado.dados.categorias.find((c) => c.id === meta.category);
  titulo(meta.title);
  const info = [cat?.nome, meta.difficulty ? `Nível ${meta.difficulty}` : null, meta.difficulty ? `${pontosDe(meta.difficulty)} pontos` : null].filter(Boolean).join(' · ');
  const area = el('div', { class: 'jogo-area' });
  main.replaceChildren(
    el('section', { class: 'jogo' },
      area,
      el('div', { class: 'jogo-rodape' }, el('p', { class: 'nota', text: info }), el('a', { class: 'ligacao', href: '#/' }, 'Todos os desafios'))),
  );
  if (!meta.existe) {
    area.replaceChildren(aviso('Este cartão ainda está por construir', 'Um agente do enxame escreve-o na onda 1. Volta daqui a pouco.'));
    return;
  }
  let cartao;
  try {
    cartao = await carregarCartao(id, meta.versao);
  } catch (e) {
    if (!desatualizado(passo)) area.replaceChildren(aviso('Este cartão não carregou', String(e?.message || e)));
    return;
  }
  if (desatualizado(passo)) return;
  titulo(cartao.title);
  montarJogo(area, cartao, {
    acoes: ({ certo, repetir }) => {
      const prox = proximoPorResolver(id);
      const irProximo = (principal) => (prox
        ? el('a', { class: principal ? 'botao botao-principal' : 'botao', href: `#/cartao/${prox.id}` }, 'Próximo desafio')
        : el('a', { class: principal ? 'botao botao-principal' : 'botao', href: '#/pontuacao' }, 'Ver pontuação'));
      if (certo) return [irProximo(true), el('a', { class: 'botao', href: '#/' }, 'Todos os desafios')];
      return [el('button', { class: 'botao botao-principal', type: 'button', on: { click: () => repetir() } }, 'Tentar outra vez'), irProximo(false)];
    },
  });
}

// ---------- outras vistas ----------

function vistaNaoEncontrado() {
  titulo('Não encontrado');
  main.replaceChildren(aviso('Não encontrámos esta página', 'A ligação pode estar errada ou o cartão já não existe.'));
}

function vistaSemServidor() {
  titulo(null);
  return el('section', { class: 'aviso' },
    el('h1', { class: 'titulo-secao', text: 'Não consegui falar com o servidor' }),
    el('p', { text: 'Arranca-o na pasta do projeto com node server.js e recarrega esta página.' }),
    estado.erro ? el('p', { class: 'nota', text: String(estado.erro.message || estado.erro) }) : null);
}

// ---------- rodape ----------

function ligarRodape() {
  const b = document.getElementById('apagar-progresso');
  if (!b) return;
  let armado = null;
  b.addEventListener('click', () => {
    if (!armado) {
      b.textContent = 'Carrega outra vez para apagar';
      armado = setTimeout(() => {
        armado = null;
        b.textContent = 'Apagar o meu progresso';
      }, 4000);
      return;
    }
    clearTimeout(armado);
    armado = null;
    apagarProgresso();
    b.textContent = 'Progresso apagado';
    setTimeout(() => (b.textContent = 'Apagar o meu progresso'), 2500);
    if (estado.rota?.nome !== 'cartao') desenhar({ aoVivo: true });
  });
}

// ---------- ao vivo: a galeria enche-se enquanto o enxame trabalha ----------

function assinaturaVisivel(d) {
  return JSON.stringify([d.modo, d.paginas, d.cartoes.map((c) => [c.id, c.existe, c.versao, c.no_plano])]);
}

let agendado = null;
async function atualizar() {
  try {
    const novo = await obterCartoes();
    const antes = assinaturaVisivel(estado.dados);
    estado.dados = novo;
    const r = estado.rota?.nome;
    if (assinaturaVisivel(novo) !== antes && !estado.aCorrer && (r === 'inicio' || r === 'categoria' || r === 'pontuacao')) desenhar({ aoVivo: true });
  } catch {
    /* servidor em baixo: tenta-se no proximo aviso */
  }
}
function agendarAtualizacao() {
  clearTimeout(agendado);
  agendado = setTimeout(atualizar, 400);
}

function ligarAoVivo() {
  if ('EventSource' in window) {
    const es = new EventSource('/api/events');
    es.addEventListener('estado', agendarAtualizacao);
  }
  setInterval(atualizar, 15000);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') agendarAtualizacao();
  });
}

// ---------- arranque ----------

async function arrancar() {
  let correrAoAbrir = false;
  try {
    correrAoAbrir = sessionStorage.getItem('arena:correr-testes') === '1';
    sessionStorage.removeItem('arena:correr-testes');
  } catch {
    correrAoAbrir = false;
  }
  window.addEventListener('hashchange', () => {
    if (!location.hash || location.hash.startsWith('#/')) desenhar();
  });
  ligarRodape();
  try {
    estado.dados = await obterCartoes();
    estado.carregado = true;
  } catch (e) {
    estado.erro = e;
  }
  await desenhar({ aoVivo: true });
  if (!estado.carregado) return;
  ligarAoVivo();
  if (correrAoAbrir && estado.rota?.nome === 'inicio') correrTestes();
}

arrancar();
