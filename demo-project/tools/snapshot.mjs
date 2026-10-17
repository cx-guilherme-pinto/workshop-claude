// The swarm snapshot and events in one shape, whatever the engine wrote.
// The orchestrator (tools/workshop/) writes them with Portuguese keys and values (tarefas, estado: 'verde'...)
// or English ones (tasks, state: 'green'...). server.js turns both into the English shape below before
// sending them to /status, and the recordings in replays/ go through the same functions.

export const STATES = ['todo', 'working', 'green', 'red', 'failed'];

const STATE = { por_fazer: 'todo', em_curso: 'working', verde: 'green', vermelho: 'red', falhou: 'failed' };
const GROUP_TYPE = { cartao: 'card', pagina: 'page', integracao: 'integration', revisao: 'review', tarefa: 'task' };
const MODE = { participante: 'participant', apresentador: 'presenter', producao: 'production', teste: 'test' };
const EVENT = { inicio: 'start', estado: 'state', custo: 'cost', fim: 'end' };
const REASON = { sem_motor: 'no_engine', sem_plano: 'no_plan', plano_invalido: 'invalid_plan' };
const VERDICT = { aprovado: 'approved', aprovado_com_reservas: 'approved_with_reservations', reprovado: 'rejected' };

const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);
const first = (o, ...ks) => {
  for (const k of ks) if (o && o[k] !== undefined) return o[k];
  return undefined;
};
const map = (table, v) => (v === undefined || v === null ? v ?? null : table[v] ?? v);

export const normalizeState = (s) => map(STATE, s);
export const normalizeMode = (m) => map(MODE, m);
export const normalizeVerdict = (v) => map(VERDICT, v);

function test(t) {
  if (!isObj(t)) return t ?? null;
  const out = {};
  const put = (k, v) => {
    if (v !== undefined) out[k] = v;
  };
  put('command', first(t, 'command', 'comando'));
  put('code', first(t, 'code', 'codigo'));
  put('file', first(t, 'file', 'ficheiro'));
  put('passed', first(t, 'passed', 'passados'));
  put('failed', first(t, 'failed', 'falhados'));
  const value = first(t, 'value', 'valor');
  if (value !== undefined) out.value = normalizeVerdict(value);
  put('excerpt', first(t, 'excerpt', 'excerto'));
  put('ms', t.ms);
  return out;
}

export function normalizeTask(t) {
  if (!isObj(t)) return null;
  return {
    id: t.id,
    title: first(t, 'title', 'titulo') ?? null,
    group: first(t, 'group', 'grupo') ?? null,
    group_type: map(GROUP_TYPE, first(t, 'group_type', 'grupo_tipo')),
    wave: first(t, 'wave', 'onda') ?? null,
    state: normalizeState(first(t, 'state', 'estado')) ?? 'todo',
    attempt: first(t, 'attempt', 'tentativa') ?? 0,
    agent: first(t, 'agent', 'agente') ?? null,
    model: first(t, 'model', 'modelo') ?? null,
    seconds: first(t, 'seconds', 'tempo_s') ?? null,
    cost_usd: first(t, 'cost_usd', 'custo_usd') ?? null,
    test: test(first(t, 'test', 'teste')),
    start: first(t, 'start', 'inicio') ?? null,
    end: first(t, 'end', 'fim') ?? null,
    ...(first(t, 'exists', 'existe') !== undefined ? { exists: first(t, 'exists', 'existe') } : {}),
  };
}

function counts(c, tasks) {
  const out = Object.fromEntries(STATES.map((s) => [s, 0]));
  if (isObj(c)) {
    for (const [k, v] of Object.entries(c)) {
      const s = normalizeState(k);
      if (s in out) out[s] = Number(v) || 0;
    }
  } else {
    for (const t of tasks) if (t.state in out) out[t.state]++;
  }
  return out;
}

export function normalizeSnapshot(f) {
  if (!isObj(f)) return null;
  const tasks = (first(f, 'tasks', 'tarefas') || []).map(normalizeTask).filter(Boolean);
  const cost = first(f, 'cost', 'custo');
  const budget = first(f, 'budget', 'orcamento');
  const out = {
    generated_at: first(f, 'generated_at', 'gerado_em') ?? null,
    mode: normalizeMode(first(f, 'mode', 'modo')),
    start: first(f, 'start', 'inicio') ?? null,
    end: first(f, 'end', 'fim') ?? null,
    total: f.total ?? tasks.length,
    counts: counts(first(f, 'counts', 'contagem'), tasks),
    cost: {
      total: Number(cost?.total) || 0,
      main: Number(first(cost, 'main', 'principal')) || 0,
      subagents: Number(first(cost, 'subagents', 'subagentes')) || 0,
    },
    tasks,
  };
  if (isObj(budget)) out.budget = { target_usd: first(budget, 'target_usd', 'alvo_usd') ?? 5, cap_usd: first(budget, 'cap_usd', 'teto_usd') ?? 10 };
  const empty = first(f, 'empty', 'vazio');
  if (empty !== undefined) out.empty = !!empty;
  const reason = first(f, 'reason', 'motivo');
  if (reason !== undefined) out.reason = map(REASON, reason);
  const description = first(f, 'description', 'descricao');
  if (description !== undefined) out.description = description;
  const synthetic = first(f, 'synthetic', 'sintetico');
  if (synthetic !== undefined) out.synthetic = !!synthetic;
  return out;
}

export function normalizeEvent(e) {
  if (!isObj(e)) return null;
  const out = { ts: e.ts, type: map(EVENT, first(e, 'type', 'tipo')) };
  const put = (k, v) => {
    if (v !== undefined) out[k] = v;
  };
  put('task', first(e, 'task', 'tarefa'));
  const state = first(e, 'state', 'estado');
  if (state !== undefined) out.state = normalizeState(state);
  put('attempt', first(e, 'attempt', 'tentativa'));
  put('agent', first(e, 'agent', 'agente'));
  put('model', first(e, 'model', 'modelo'));
  put('cost_usd', first(e, 'cost_usd', 'custo_usd'));
  put('duration_s', first(e, 'duration_s', 'duracao_s'));
  const mode = first(e, 'mode', 'modo');
  if (mode !== undefined) out.mode = normalizeMode(mode);
  put('total', e.total);
  return out;
}
