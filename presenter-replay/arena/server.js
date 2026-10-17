#!/usr/bin/env node
// Servidor da Arena de Seguranca. So Node, sem dependencias, so em 127.0.0.1.
//
//   node server.js [--porta 3000]
//
// Serve apenas pastas de uma lista (public/ na raiz, cards/, templates/, lib/, pages/, replays/),
// com cabecalhos estritos (CSP sem inline) em todas as respostas, e a API do /estado:
//   /api/cards            cartoes que existem + metadados de specs/cards.json
//   /api/status           fotografia do enxame (tools/workshop/orquestrador/lib/estado.mjs)
//   /api/events           o mesmo, em SSE, sempre que .workshop/ muda (consulta a cada 1 s)
//   /api/replay/<nome>    replays/<nome>/events.jsonl + snapshot.json para o modo repeticao
import { createServer } from 'node:http';
import { createConnection } from 'node:net';
import { createReadStream, existsSync, readFileSync, readdirSync, realpathSync, statSync } from 'node:fs';
import { dirname, extname, join, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const RAIZ = dirname(fileURLToPath(import.meta.url));

export const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "frame-ancestors 'none'",
  "require-trusted-types-for 'script'",
].join('; ');

export const CABECALHOS = Object.freeze({
  'Content-Security-Policy': CSP,
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin',
  'X-Frame-Options': 'DENY',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  'Cache-Control': 'no-store',
});

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.jsonl': 'application/x-ndjson; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};

// Pastas servidas pelo nome; tudo o resto vem de public/.
const PASTAS = new Set(['cards', 'templates', 'lib', 'pages', 'replays']);
const PAGINAS = new Map([
  ['/', 'index.html'],
  ['/estado', 'estado.html'],
  ['/estado/', 'estado.html'],
]);
const ID = /^[a-z0-9][a-z0-9-]{0,63}$/;

function lerJson(f, fallback = null) {
  try {
    return JSON.parse(readFileSync(f, 'utf8'));
  } catch {
    return fallback;
  }
}

function lerJsonl(f) {
  const out = [];
  let texto = '';
  try {
    texto = readFileSync(f, 'utf8');
  } catch {
    return out;
  }
  for (const linha of texto.split('\n')) {
    if (!linha.trim()) continue;
    try {
      const v = JSON.parse(linha);
      if (v && typeof v === 'object' && !Array.isArray(v)) out.push(v);
    } catch {
      /* linha parcial: ignorar */
    }
  }
  return out;
}

function listar(dir) {
  try {
    return readdirSync(dir);
  } catch {
    return [];
  }
}

function versao(f) {
  try {
    return Math.round(statSync(f).mtimeMs);
  } catch {
    return null;
  }
}

function carimbo(f) {
  try {
    const s = statSync(f);
    return `${Math.round(s.mtimeMs)}:${s.size}`;
  } catch {
    return '-';
  }
}

function dentroDe(base, alvo) {
  return alvo === base || alvo.startsWith(base + sep);
}

// Converte o caminho pedido num ficheiro dentro de uma pasta permitida, ou devolve null.
// Recusa: codificacao invalida, NUL, barras invertidas, ':' e qualquer segmento comecado por '.'
// (isto apanha '..', '%2e%2e', '.workshop', '.claude', '.git' e dotfiles), extensoes fora da lista
// e ligacoes simbolicas que apontem para fora da pasta.
export function resolverSeguro(raiz, caminhoBruto) {
  if (typeof caminhoBruto !== 'string' || !caminhoBruto.startsWith('/')) return null;
  let texto;
  try {
    texto = decodeURIComponent(caminhoBruto);
  } catch {
    return null;
  }
  if (texto.includes('\0') || texto.includes('\\')) return null;
  const partes = texto.split('/').filter((p) => p !== '');
  if (!partes.length) return null;
  for (const p of partes) if (p.startsWith('.') || p.includes(':')) return null;
  let pasta = 'public';
  if (PASTAS.has(partes[0])) pasta = partes.shift();
  if (!partes.length) return null;
  const tipo = MIME[extname(partes[partes.length - 1]).toLowerCase()];
  if (!tipo) return null;
  if (pasta === 'replays' && !/\.(json|jsonl)$/.test(partes[partes.length - 1])) return null;
  const base = resolve(raiz, pasta);
  const alvo = resolve(base, ...partes);
  if (!dentroDe(base, alvo) || alvo === base) return null;
  let real;
  let baseReal;
  try {
    real = realpathSync(alvo);
    baseReal = realpathSync(base);
  } catch {
    return null;
  }
  if (!dentroDe(baseReal, real) || real === baseReal) return null;
  let st;
  try {
    st = statSync(real);
  } catch {
    return null;
  }
  if (!st.isFile()) return null;
  return { caminho: real, tamanho: st.size, tipo };
}

function cabecalhos(extra = {}) {
  return { ...CABECALHOS, ...extra };
}

function enviarTexto(res, status, texto, extra = {}) {
  const corpo = Buffer.from(texto, 'utf8');
  res.writeHead(status, cabecalhos({ 'Content-Type': 'text/plain; charset=utf-8', 'Content-Length': corpo.length, ...extra }));
  res.end(res.req.method === 'HEAD' ? undefined : corpo);
}

function enviarJson(res, status, obj) {
  const corpo = Buffer.from(JSON.stringify(obj), 'utf8');
  res.writeHead(status, cabecalhos({ 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': corpo.length }));
  res.end(res.req.method === 'HEAD' ? undefined : corpo);
}

function enviarFicheiro(res, f) {
  res.writeHead(200, cabecalhos({ 'Content-Type': f.tipo, 'Content-Length': f.tamanho }));
  if (res.req.method === 'HEAD') return res.end();
  const s = createReadStream(f.caminho);
  s.on('error', () => res.destroy());
  s.pipe(res);
}

const naoEncontrado = (res) => enviarTexto(res, 404, 'Não encontrado.\n');

// ---------- /api/cards ----------

// Assinatura do codigo que os testes no browser carregam (muda quando um agente escreve um ficheiro).
function assinaturaCodigo(raiz) {
  const partes = [];
  for (const d of ['lib', 'templates', 'pages']) {
    for (const n of listar(join(raiz, d)).sort()) if (n.endsWith('.js')) partes.push(`${d}/${n}:${versao(join(raiz, d, n))}`);
  }
  for (const n of listar(join(raiz, 'cards')).sort()) {
    if (ID.test(n)) partes.push(`cards/${n}:${versao(join(raiz, 'cards', n, 'card.js'))}`);
  }
  let h = 5381;
  const s = partes.join('|');
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

export function listarCartoes(raiz = RAIZ) {
  const specs = lerJson(join(raiz, 'specs', 'cards.json'), {}) || {};
  const plano = lerJson(join(raiz, 'plan.json'));
  const noPlano = new Set(Array.isArray(plano?.tarefas) ? plano.tarefas.map((t) => t.id) : []);
  const categorias = (Array.isArray(specs.categorias) ? specs.categorias : [])
    .filter((c) => c && ID.test(String(c.id)))
    .map((c) => ({ id: String(c.id), nome: String(c.nome ?? c.id) }));
  const ficheiros = (id) => {
    const v = versao(join(raiz, 'cards', id, 'card.js'));
    return { existe: v !== null, versao: v, teste: existsSync(join(raiz, 'cards', id, 'card.test.js')) };
  };
  const vistos = new Set();
  const cartoes = [];
  for (const c of Array.isArray(specs.cartoes) ? specs.cartoes : []) {
    if (!c || !ID.test(String(c.id)) || vistos.has(c.id)) continue;
    vistos.add(c.id);
    cartoes.push({
      id: c.id,
      title: String(c.titulo ?? c.id),
      category: c.categoria ?? null,
      difficulty: Number.isInteger(c.dificuldade) ? c.dificuldade : null,
      modo: c.modo ?? null,
      model: c.modelo ?? null,
      no_plano: noPlano.has(c.id),
      spec: true,
      ...ficheiros(c.id),
    });
  }
  // Cartoes no disco que nao estao nas specs (raro): aparecem sem metadados.
  for (const n of listar(join(raiz, 'cards')).sort()) {
    if (!ID.test(n) || vistos.has(n)) continue;
    const f = ficheiros(n);
    if (!f.existe) continue;
    cartoes.push({ id: n, title: n, category: null, difficulty: null, modo: null, model: null, no_plano: noPlano.has(n), spec: false, ...f });
  }
  return {
    modo: plano?.modo ?? null,
    categorias,
    cartoes,
    paginas: {
      categoria: versao(join(raiz, 'pages', 'categoria.js')),
      pontuacao: versao(join(raiz, 'pages', 'pontuacao.js')),
    },
    assinatura: assinaturaCodigo(raiz),
  };
}

// ---------- /api/status ----------

function orcamento(raiz) {
  const p = lerJson(join(raiz, 'tools', 'workshop', 'pricing.json'));
  return { alvo_usd: p?.orcamento?.alvo_usd ?? 5, teto_usd: p?.orcamento?.teto_usd ?? 10 };
}

function fotografiaVazia(raiz, motivo) {
  return {
    gerado_em: new Date().toISOString(),
    vazio: true,
    motivo,
    modo: null,
    inicio: null,
    fim: null,
    total: 0,
    contagem: { por_fazer: 0, em_curso: 0, verde: 0, vermelho: 0, falhou: 0 },
    custo: { total: 0, principal: 0, subagentes: 0 },
    tarefas: [],
    orcamento: orcamento(raiz),
  };
}

const motores = new Map();
async function motor(raiz) {
  const f = join(raiz, 'tools', 'workshop', 'orquestrador', 'lib', 'estado.mjs');
  if (!existsSync(f)) return null;
  if (!motores.has(f)) motores.set(f, import(pathToFileURL(f).href).catch(() => null));
  return motores.get(f);
}

export async function fotografiaAtual(raiz = RAIZ) {
  const m = await motor(raiz);
  if (!m) return fotografiaVazia(raiz, 'sem_motor');
  const fPlano = join(raiz, 'plan.json');
  if (!existsSync(fPlano)) return fotografiaVazia(raiz, 'sem_plano');
  let plano;
  try {
    plano = m.lerPlano(fPlano);
  } catch {
    return fotografiaVazia(raiz, 'plano_invalido');
  }
  const c = m.caminhos(raiz);
  const f = m.fotografia(c, plano);
  for (const t of f.tarefas) {
    const st = m.lerEstado(c, t.id);
    t.inicio = st.inicio || null;
    t.fim = st.fim || null;
    if (t.grupo_tipo === 'cartao') t.existe = existsSync(join(raiz, 'cards', t.id, 'card.js'));
  }
  f.orcamento = orcamento(raiz);
  return f;
}

// Muda sempre que o estado do enxame muda (ficheiros de estado, custos, plano, cartoes escritos).
function assinaturaEstado(raiz) {
  const ws = join(raiz, '.workshop');
  const partes = [carimbo(join(raiz, 'plan.json')), carimbo(join(ws, 'usage.jsonl')), carimbo(join(ws, 'run.json'))];
  for (const n of listar(join(ws, 'status')).sort()) if (n.endsWith('.json')) partes.push(n + carimbo(join(ws, 'status', n)));
  for (const n of listar(join(raiz, 'cards')).sort()) if (ID.test(n)) partes.push(n + carimbo(join(raiz, 'cards', n, 'card.js')));
  return partes.join('|');
}

// ---------- /api/events (SSE) ----------

function criarDifusor(raiz) {
  const clientes = new Set();
  let relogio = null;
  let assinatura = null;
  let ultimoPing = 0;
  let ocupado = false;

  const enviar = (res, evento, dados) => {
    if (!res.writableEnded && !res.destroyed) res.write(`event: ${evento}\ndata: ${JSON.stringify(dados)}\n\n`);
  };

  async function tique() {
    if (ocupado) return;
    ocupado = true;
    try {
      const a = assinaturaEstado(raiz);
      if (a !== assinatura) {
        assinatura = a;
        const f = await fotografiaAtual(raiz);
        for (const res of clientes) enviar(res, 'estado', f);
      } else if (Date.now() - ultimoPing > 10000) {
        ultimoPing = Date.now();
        for (const res of clientes) enviar(res, 'ping', { t: ultimoPing });
      }
    } catch {
      /* tentar no proximo tique */
    } finally {
      ocupado = false;
    }
  }

  return {
    async ligar(req, res) {
      res.writeHead(200, cabecalhos({ 'Content-Type': 'text/event-stream; charset=utf-8', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' }));
      res.write('retry: 2000\n\n');
      clientes.add(res);
      req.on('close', () => {
        clientes.delete(res);
        if (!clientes.size && relogio) {
          clearInterval(relogio);
          relogio = null;
        }
      });
      try {
        enviar(res, 'estado', await fotografiaAtual(raiz));
      } catch {
        /* o proximo tique envia */
      }
      if (!relogio) {
        assinatura = assinaturaEstado(raiz);
        relogio = setInterval(tique, 1000);
        relogio.unref?.();
      }
    },
    fechar() {
      if (relogio) clearInterval(relogio);
      relogio = null;
      for (const res of clientes) res.end();
      clientes.clear();
    },
  };
}

// ---------- /api/replay ----------

function pastaRepeticao(raiz, nome) {
  if (!ID.test(nome)) return null;
  const base = resolve(raiz, 'replays');
  try {
    const real = realpathSync(join(base, nome));
    if (!dentroDe(realpathSync(base), real) || !statSync(real).isDirectory()) return null;
    return real;
  } catch {
    return null;
  }
}

function listarRepeticoes(raiz) {
  const out = [];
  for (const n of listar(join(raiz, 'replays')).sort()) {
    const d = pastaRepeticao(raiz, n);
    if (!d || !existsSync(join(d, 'events.jsonl'))) continue;
    const s = lerJson(join(d, 'snapshot.json'), {});
    out.push({ nome: n, descricao: typeof s?.descricao === 'string' ? s.descricao : null, total: s?.total ?? null, sintetico: !!s?.sintetico });
  }
  return out;
}

function responderRepeticao(raiz, res, resto) {
  if (!resto.length) return enviarJson(res, 200, { repeticoes: listarRepeticoes(raiz) });
  const d = pastaRepeticao(raiz, resto[0]);
  if (!d || resto.length > 2) return naoEncontrado(res);
  if (resto.length === 2) {
    if (resto[1] !== 'events.jsonl' && resto[1] !== 'snapshot.json') return naoEncontrado(res);
    const f = resolverSeguro(raiz, `/replays/${resto[0]}/${resto[1]}`);
    return f ? enviarFicheiro(res, f) : naoEncontrado(res);
  }
  if (!existsSync(join(d, 'events.jsonl'))) return naoEncontrado(res);
  return enviarJson(res, 200, {
    nome: resto[0],
    snapshot: lerJson(join(d, 'snapshot.json'), null),
    eventos: lerJsonl(join(d, 'events.jsonl')),
  });
}

// ---------- servidor ----------

export function criarServidor({ raiz = RAIZ } = {}) {
  const difusor = criarDifusor(raiz);
  const srv = createServer(async (req, res) => {
    try {
      if (req.method !== 'GET' && req.method !== 'HEAD') return enviarTexto(res, 405, 'Método não permitido.\n', { Allow: 'GET, HEAD' });
      const bruto = String(req.url || '');
      const caminho = bruto.split('?')[0].split('#')[0];
      if (!caminho.startsWith('/')) return enviarTexto(res, 400, 'Pedido inválido.\n');

      if (PAGINAS.has(caminho)) {
        const f = resolverSeguro(raiz, `/${PAGINAS.get(caminho)}`);
        return f ? enviarFicheiro(res, f) : naoEncontrado(res);
      }
      if (caminho === '/api/cards') return enviarJson(res, 200, listarCartoes(raiz));
      if (caminho === '/api/status') return enviarJson(res, 200, await fotografiaAtual(raiz));
      if (caminho === '/api/events') return difusor.ligar(req, res);
      if (caminho === '/api/replay' || caminho.startsWith('/api/replay/')) {
        const resto = caminho.slice('/api/replay'.length).split('/').filter(Boolean);
        return responderRepeticao(raiz, res, resto);
      }
      if (caminho.startsWith('/api/')) return naoEncontrado(res);

      const f = resolverSeguro(raiz, caminho);
      return f ? enviarFicheiro(res, f) : naoEncontrado(res);
    } catch {
      if (!res.headersSent) enviarTexto(res, 500, 'Erro interno.\n');
      else res.destroy();
    }
  });
  srv.on('close', () => difusor.fechar());
  srv.fecharTudo = () => {
    difusor.fechar();
    srv.closeAllConnections?.();
  };
  return srv;
}

// Alguem responde em host:porta? Uma ligacao, nao um bind de teste: no macOS outro servidor em [::] (Next.js,
// Express) ou em ::1 (Vite) nao faz falhar o bind em 127.0.0.1, e o browser, que tenta ::1 primeiro para
// "localhost", abria a outra app (o mesmo que demo-project/server.js).
function responde(porta, host, ms = 300) {
  return new Promise((ok) => {
    const c = createConnection({ port: porta, host });
    const fim = (v) => {
      c.destroy();
      ok(v);
    };
    c.setTimeout(ms, () => fim(false));
    c.once('connect', () => fim(true));
    c.once('error', () => fim(false));
  });
}

const portaUsada = async (p) => (await Promise.all([responde(p, '127.0.0.1'), responde(p, '::1')])).some(Boolean);

// Liga so em 127.0.0.1. Se a porta estiver ocupada (ou outro programa responder em 127.0.0.1 ou ::1), tenta as seguintes.
export function iniciar({ porta = 3000, raiz = RAIZ, tentativas = 20 } = {}) {
  return new Promise((ok, falha) => {
    const srv = criarServidor({ raiz });
    let atual = porta;
    let n = 0;
    const ligar = async () => {
      while (porta !== 0 && n < tentativas && (await portaUsada(atual))) {
        n++;
        atual++;
      }
      srv.listen(atual, '127.0.0.1');
    };
    const parar = (e) => {
      srv.off('error', aoErro);
      falha(e);
    };
    const aoErro = (e) => {
      if (e.code === 'EADDRINUSE' && porta !== 0 && n < tentativas) {
        n++;
        atual++;
        ligar().catch(parar);
      } else parar(e);
    };
    srv.on('error', aoErro);
    srv.once('listening', () => {
      srv.off('error', aoErro);
      ok(srv);
    });
    ligar().catch(parar);
  });
}

function portaPedida(argv) {
  const i = argv.findIndex((a) => a === '--porta' || a === '--port');
  const v = i >= 0 ? argv[i + 1] : process.env.PORT || '3000';
  const n = Number(v);
  if (!Number.isInteger(n) || n < 0 || n > 65535) {
    console.error(`Porta inválida: ${v}`);
    process.exit(2);
  }
  return n;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const pedida = portaPedida(process.argv.slice(2));
  try {
    const srv = await iniciar({ porta: pedida });
    const { port } = srv.address();
    if (pedida && port !== pedida) console.log(`A porta ${pedida} estava ocupada; uso a ${port}.`);
    console.log(`Arena de Segurança:  http://localhost:${port}/`);
    console.log(`Estado do enxame:    http://localhost:${port}/estado`);
    console.log(`Repetição de exemplo: http://localhost:${port}/estado?replay=exemplo`);
    console.log('Só aceita ligações deste computador (127.0.0.1). Ctrl+C para parar.');
    const parar = () => {
      srv.fecharTudo();
      srv.close(() => process.exit(0));
      setTimeout(() => process.exit(0), 500).unref();
    };
    process.on('SIGINT', parar);
    process.on('SIGTERM', parar);
  } catch (e) {
    console.error(`Não consegui arrancar o servidor: ${e.message}`);
    process.exit(1);
  }
}
