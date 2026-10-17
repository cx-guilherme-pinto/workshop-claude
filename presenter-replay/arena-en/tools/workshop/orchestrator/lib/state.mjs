// Swarm state: plan, state per task (.workshop/status/<id>.json), events and costs.
// One writer per state file; the hooks only append to usage.jsonl / events.jsonl.
//
// The plan (plan.json) is read in either schema: the English one (tasks, depends_on, group_type, wave...,
// written by validate-plan) or the older Portuguese one (tarefas, depende, grupo_tipo, onda...).
// readPlan() turns both into the same internal shape, so the rest of the orchestrator, the hooks and
// the Arena (/api/status, /status) keep reading the same snapshot.
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync, renameSync, appendFileSync } from 'node:fs';
import { join, resolve, isAbsolute } from 'node:path';
import { lingua, textos } from '../../hooks/lib/language.mjs';

export const ESTADOS = ['por_fazer', 'em_curso', 'verde', 'vermelho', 'falhou'];

// Files the orchestrator keeps in .workshop/ (the pointer had a Portuguese name until v1.0.0-rc.1).
export const POINTER_FILE = 'orchestrator.json';
export const LEGACY_POINTER_FILE = 'orquestrador.json';

export function caminhos(projeto) {
  const ws = join(projeto, '.workshop');
  return {
    projeto,
    ws,
    status: join(ws, 'status'),
    eventos: join(ws, 'events.jsonl'),
    usage: join(ws, 'usage.jsonl'),
    run: join(ws, 'run.json'),
    ponteiro: join(ws, POINTER_FILE),
    ponteiroAntigo: join(ws, LEGACY_POINTER_FILE),
  };
}

export function garantirPastas(c) {
  mkdirSync(c.status, { recursive: true });
}

export function lerJson(f, fallback = null) {
  try {
    return JSON.parse(readFileSync(f, 'utf8'));
  } catch {
    return fallback;
  }
}

// The first of several files that exists and parses (new name first, then the legacy one).
export function lerJsonDe(ficheiros, fallback = null) {
  for (const f of ficheiros) {
    const j = lerJson(f, undefined);
    if (j !== undefined && j !== null) return j;
  }
  return fallback;
}

// The pointer written by next-wave (plan path, grade path, node), new name or legacy name.
export function lerPonteiro(c) {
  return lerJsonDe([c.ponteiro, c.ponteiroAntigo], {});
}

// The first path that exists (new name first, then the legacy one); the first one if none exists.
export function primeiroQueExiste(...ficheiros) {
  return ficheiros.find((f) => existsSync(f)) ?? ficheiros[0];
}

export function escreverJson(f, obj) {
  const tmp = `${f}.${process.pid}.tmp`;
  writeFileSync(tmp, JSON.stringify(obj, null, 2) + '\n', 'utf8');
  try {
    renameSync(tmp, f);
  } catch {
    writeFileSync(f, JSON.stringify(obj, null, 2) + '\n', 'utf8');
  }
}

export function lerJsonl(f) {
  if (!existsSync(f)) return [];
  const out = [];
  for (const l of readFileSync(f, 'utf8').split('\n')) {
    if (!l.trim()) continue;
    try {
      out.push(JSON.parse(l));
    } catch {
      /* ignore a partial line */
    }
  }
  return out;
}

export function evento(c, ev) {
  appendFileSync(c.eventos, JSON.stringify({ ts: new Date().toISOString(), ...ev }) + '\n', 'utf8');
}

// ---------- plan schema (English keys or the older Portuguese ones) ----------

const MODO = { participant: 'participante', presenter: 'apresentador', production: 'producao', test: 'teste' };
const GRUPO_TIPO = { card: 'cartao', page: 'pagina', integration: 'integracao', review: 'revisao', task: 'tarefa' };
const CURINGA = { '*cards': '*cartoes', '*all': '*todas' };
// Project names that changed: the Arena is "security-arena" in both languages (the memory app files
// its notes under this name, and /demo-plan and /demo-cost use it).
const PROJETO = { 'arena-de-seguranca': 'security-arena' };
const pick = (o, ...ks) => {
  for (const k of ks) if (o && o[k] !== undefined) return o[k];
  return undefined;
};
const semIndefinidos = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined));

function normalizarTeste(t) {
  if (!t || Array.isArray(t) || typeof t !== 'object') return t ?? null;
  const ficheiro = pick(t, 'ficheiro_json', 'json_file', 'file');
  const campo = pick(t, 'campo', 'field');
  return ficheiro ? semIndefinidos({ ...t, ficheiro_json: ficheiro, campo, json_file: undefined, field: undefined, file: undefined }) : t;
}

function normalizarTarefa(t) {
  const tipo = pick(t, 'grupo_tipo', 'group_type');
  const dep = pick(t, 'depende', 'depends_on', 'depends');
  return semIndefinidos({
    ...t,
    titulo: pick(t, 'titulo', 'title'),
    grupo: pick(t, 'grupo', 'group'),
    grupo_nome: pick(t, 'grupo_nome', 'group_name'),
    grupo_tipo: GRUPO_TIPO[tipo] ?? tipo,
    onda: pick(t, 'onda', 'wave'),
    agente: pick(t, 'agente', 'agent'),
    depende: Array.isArray(dep) ? dep.map((d) => CURINGA[d] ?? d) : dep,
    ficheiros: pick(t, 'ficheiros', 'files'),
    teste: normalizarTeste(pick(t, 'teste', 'test')),
    instrucoes: pick(t, 'instrucoes', 'instructions'),
    preparar: pick(t, 'preparar', 'prepare'),
    // English keys that were just mapped
    title: undefined, group: undefined, group_name: undefined, group_type: undefined, wave: undefined, agent: undefined,
    depends_on: undefined, depends: undefined, files: undefined, test: undefined, instructions: undefined, prepare: undefined,
  });
}

// Any plan (English or Portuguese keys) -> the internal shape. Idempotent; does not change its argument.
export function normalizarPlano(p) {
  if (!p || typeof p !== 'object') return p;
  const cfg = pick(p, 'config') || {};
  const agentes = pick(p, 'agentes', 'agents');
  const aj = pick(p, 'ajustes', 'adjustments');
  const tarefas = pick(p, 'tarefas', 'tasks');
  const modo = pick(p, 'modo', 'mode');
  const projeto = pick(p, 'projeto', 'project');
  return semIndefinidos({
    ...p,
    projeto: PROJETO[projeto] ?? projeto,
    tarefa_id: pick(p, 'tarefa_id', 'task_id'),
    modo: MODO[modo] ?? modo,
    criado_em: pick(p, 'criado_em', 'created_at'),
    modelo_principal: pick(p, 'modelo_principal', 'main_model'),
    config: semIndefinidos({
      ...cfg,
      max_paralelo: pick(cfg, 'max_paralelo', 'max_parallel'),
      max_tentativas: pick(cfg, 'max_tentativas', 'max_attempts'),
      escalar_para: pick(cfg, 'escalar_para', 'escalate_to'),
      teste_global: pick(cfg, 'teste_global', 'global_test'),
      max_parallel: undefined, max_attempts: undefined, escalate_to: undefined, global_test: undefined,
    }),
    agentes: agentes && Object.fromEntries(Object.entries(agentes).map(([k, v]) => [k, semIndefinidos({ ...v, modelo: pick(v, 'modelo', 'model'), model: undefined })])),
    ajustes: aj && semIndefinidos({
      ...aj,
      justificacao: pick(aj, 'justificacao', 'justification'),
      riscos: pick(aj, 'riscos', 'risks'),
      aplicados: pick(aj, 'aplicados', 'applied'),
      justification: undefined, risks: undefined, applied: undefined,
    }),
    apoio_estimativa: pick(p, 'apoio_estimativa', 'support_estimate'),
    tarefas: Array.isArray(tarefas) ? tarefas.map(normalizarTarefa) : tarefas,
    project: undefined, task_id: undefined, mode: undefined, created_at: undefined, main_model: undefined,
    agents: undefined, adjustments: undefined, support_estimate: undefined, tasks: undefined,
  });
}

// "ERROR: plan not found" is a marker (the skills look for it): the same in both languages.
const ERROS_PLANO = {
  pt: {
    falta: (c) => `plan not found — não há plano em ${c}. Corre primeiro o planeamento (/demo-plan ou /task-plan).`,
    invalido: (c) => `Plano inválido: ${c}`,
  },
  en: {
    falta: (c) => `plan not found — no plan at ${c}. Run the planning step first (/demo-plan or /task-plan).`,
    invalido: (c) => `Invalid plan: ${c}`,
  },
};

export function lerPlano(caminho, l = lingua()) {
  const bruto = lerJson(caminho);
  if (!bruto) throw new Error(textos(ERROS_PLANO, l).falta(caminho));
  const p = normalizarPlano(bruto);
  if (p.v !== 1 || !Array.isArray(p.tarefas)) throw new Error(textos(ERROS_PLANO, l).invalido(caminho));
  // Expand "*cartoes" ("*cards") and "*todas" ("*all") in the dependencies.
  const ids = p.tarefas.map((t) => t.id);
  const doGrupo = (g) => p.tarefas.filter((t) => t.grupo_tipo === g).map((t) => t.id);
  for (const t of p.tarefas) {
    const dep = [];
    for (const d of t.depende || []) {
      if (d === '*cartoes') dep.push(...doGrupo('cartao'), ...doGrupo('lib'));
      else if (d === '*todas') dep.push(...ids.filter((x) => x !== t.id));
      else dep.push(d);
    }
    t.depende = [...new Set(dep)].filter((x) => x !== t.id);
  }
  return p;
}

export function lerEstado(c, id) {
  return lerJson(join(c.status, `${id}.json`), { tarefa: id, estado: 'por_fazer', tentativa: 0 });
}

export function gravarEstado(c, st) {
  st.atualizado = new Date().toISOString();
  escreverJson(join(c.status, `${st.tarefa}.json`), st);
  evento(c, { tipo: 'estado', tarefa: st.tarefa, estado: st.estado, tentativa: st.tentativa, agente: st.agente, modelo: st.modelo });
}

export function todosEstados(c, plano) {
  const m = new Map();
  for (const t of plano.tarefas) m.set(t.id, lerEstado(c, t.id));
  return m;
}

// Full snapshot for the dashboard, the /status page and the reports.
// One record per subagent (the last one per agent_id) and per main session (the last one per session).
export function usageUnico(registos) {
  const subs = new Map();
  const out = [];
  for (const r of registos) {
    if (r.tipo === 'subagente') subs.set(r.agent_id || `${r.ts}-${r.tarefa}`, r);
    else out.push(r);
  }
  return [...out, ...subs.values()];
}

export function fotografia(c, plano) {
  const usage = usageUnico(lerJsonl(c.usage));
  const porTarefa = new Map();
  let custoPrincipal = new Map();
  for (const r of usage) {
    if (r.tipo === 'subagente' && r.tarefa) {
      const a = porTarefa.get(r.tarefa) || { custo: 0, tentativas: [] };
      a.custo += r.custo_usd || 0;
      a.tentativas.push(r);
      porTarefa.set(r.tarefa, a);
    } else if (r.tipo === 'principal') {
      custoPrincipal.set(r.sessao, r.custo_usd || 0);
    }
  }
  const semTarefa = usage.filter((r) => r.tipo === 'subagente' && !r.tarefa).reduce((s, r) => s + (r.custo_usd || 0), 0);
  const tarefas = plano.tarefas.map((t) => {
    const st = lerEstado(c, t.id);
    const u = porTarefa.get(t.id);
    const ultima = u?.tentativas[u.tentativas.length - 1];
    return {
      id: t.id,
      titulo: t.titulo,
      grupo: t.grupo,
      grupo_tipo: t.grupo_tipo,
      onda: st.onda ?? t.onda,
      estado: st.estado,
      tentativa: st.tentativa || 0,
      agente: st.agente || ultima?.agente || null,
      modelo: ultima?.modelo || st.modelo || null,
      tempo_s: ultima?.duracao_s ?? (st.inicio && st.fim ? (Date.parse(st.fim) - Date.parse(st.inicio)) / 1000 : null),
      custo_usd: u ? u.custo : null,
      teste: st.teste || null,
    };
  });
  const contagem = Object.fromEntries(ESTADOS.map((e) => [e, tarefas.filter((t) => t.estado === e).length]));
  const subagentes = [...porTarefa.values()].reduce((s, a) => s + a.custo, 0) + semTarefa;
  const principal = [...custoPrincipal.values()].reduce((s, v) => s + v, 0);
  const run = lerJson(c.run, {});
  return {
    gerado_em: new Date().toISOString(),
    modo: plano.modo,
    inicio: run.inicio || null,
    fim: run.fim || null,
    total: tarefas.length,
    contagem,
    custo: { total: principal + subagentes, principal, subagentes },
    tarefas,
  };
}

export function resolverNoProjeto(projeto, p) {
  return isAbsolute(p) ? p : resolve(projeto, p);
}

export function listarStatus(c) {
  if (!existsSync(c.status)) return [];
  return readdirSync(c.status).filter((f) => f.endsWith('.json')).map((f) => f.slice(0, -5));
}

// English names for the same functions.
export const STATES = ESTADOS;
export const paths = caminhos;
export const ensureDirs = garantirPastas;
export const readJson = lerJson;
export const readPointer = lerPonteiro;
export const writeJson = escreverJson;
export const readJsonl = lerJsonl;
export const logEvent = evento;
export const normalizePlan = normalizarPlano;
export const readPlan = lerPlano;
export const readState = lerEstado;
export const writeState = gravarEstado;
export const allStates = todosEstados;
export const uniqueUsage = usageUnico;
export const snapshot = fotografia;
export const resolveInProject = resolverNoProjeto;
export const listStatus = listarStatus;
