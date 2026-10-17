// The workshop engine (tools/workshop/, copied by the installer) as the Arena tools see it.
// The engine moved from tools/workshop/orquestrador/ to tools/workshop/orchestrator/ and its modules got
// English names; this module finds whichever is there, so the Arena works with both.
// It also reads plan.json in both schemas: the English one (tasks, depends_on, group_type...) and the older
// Portuguese one (tarefas, depende, grupo_tipo...).
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const ARENA = join(dirname(fileURLToPath(import.meta.url)), '..');

const CANDIDATES = {
  state: ['orchestrator/lib/state.mjs', 'orquestrador/lib/estado.mjs'],
  table: ['orchestrator/lib/table.mjs', 'orquestrador/lib/tabela.mjs'],
  estimate: ['orchestrator/estimate.mjs', 'orquestrador/estimate.mjs'],
  language: ['hooks/lib/language.mjs', 'hooks/lib/lingua.mjs'],
};

// Path of an engine module inside an Arena, or null.
export function enginePath(root, name) {
  for (const rel of CANDIDATES[name]) {
    const f = join(root, 'tools', 'workshop', rel);
    if (existsSync(f)) return f;
  }
  return null;
}

const pick = (m, ...names) => {
  for (const n of names) if (m && typeof m[n] === 'function') return m[n];
  return null;
};

async function load(root, name) {
  const f = enginePath(root, name);
  if (!f) return null;
  try {
    return await import(pathToFileURL(f).href);
  } catch {
    return null;
  }
}

// { state, table, estimate, texts } with English names, or null where the module is missing.
export async function loadEngine(root = ARENA) {
  const [state, table, estimate, language] = await Promise.all(['state', 'table', 'estimate', 'language'].map((n) => load(root, n)));
  return {
    state: state && {
      paths: pick(state, 'paths', 'caminhos'),
      readPlan: pick(state, 'readPlan', 'lerPlano'),
      readState: pick(state, 'readState', 'lerEstado'),
      snapshot: pick(state, 'snapshot', 'fotografia'),
      // Only the newer engine normalizes plans; with an older one the Arena writes the older schema.
      normalizePlan: pick(state, 'normalizePlan', 'normalizarPlano'),
    },
    table: table && { markdownTable: pick(table, 'markdownTable', 'tabelaMarkdown') },
    estimate: estimate && { estimate: pick(estimate, 'estimate', 'estimar'), estimateTable: pick(estimate, 'estimateTable', 'tabelaEstimativa') },
    texts: pick(language, 'texts', 'textos'),
  };
}

// Texts in the Arena's language (tools/workshop/language.json); outside an assembled Arena, Portuguese.
export async function arenaTexts(dic, root = ARENA) {
  const m = await load(root, 'language');
  const texts = pick(m, 'texts', 'textos');
  try {
    return texts ? texts(dic) : dic.pt;
  } catch {
    return dic.pt;
  }
}

// ---------- plan.json in both schemas ----------

const GROUP_TYPE = { cartao: 'card', pagina: 'page', integracao: 'integration', revisao: 'review', tarefa: 'task' };
const MODE = { participante: 'participant', apresentador: 'presenter', producao: 'production', teste: 'test' };

export const planTasks = (p) => (Array.isArray(p?.tasks) ? p.tasks : Array.isArray(p?.tarefas) ? p.tarefas : []);
export const planMode = (p) => {
  const m = p?.mode ?? p?.modo ?? null;
  return MODE[m] ?? m;
};
export const taskType = (t) => {
  const g = t?.group_type ?? t?.grupo_tipo ?? null;
  return GROUP_TYPE[g] ?? g;
};
export const taskTest = (t) => t?.test ?? t?.teste ?? null;

// The English plan (written by tools/plan.mjs) in the older Portuguese schema, for an older engine.
export function legacyPlan(p) {
  const LEGACY_TYPE = { card: 'cartao', page: 'pagina', integration: 'integracao', review: 'revisao' };
  const LEGACY_MODE = { participant: 'participante', presenter: 'apresentador' };
  const LEGACY_DEP = { '*cards': '*cartoes', '*all': '*todas' };
  const test = (t) => (t && !Array.isArray(t) && t.json_file ? { ficheiro_json: t.json_file, campo: t.field } : t);
  const adj = p.adjustments && { justificacao: p.adjustments.justification, riscos: p.adjustments.risks, aplicados: p.adjustments.applied };
  return {
    v: p.v,
    projeto: p.project,
    modo: LEGACY_MODE[p.mode] ?? p.mode,
    criado_em: p.created_at,
    modelo_principal: p.main_model,
    config: { max_paralelo: p.config.max_parallel, max_tentativas: p.config.max_attempts, escalar_para: p.config.escalate_to },
    agentes: Object.fromEntries(Object.entries(p.agents).map(([k, v]) => [k, { modelo: v.model }])),
    ajustes: adj || null,
    apoio_estimativa: p.support_estimate,
    tarefas: p.tasks.map((t) => {
      const o = {
        id: t.id,
        titulo: t.title,
        grupo: t.group,
        ...(t.group_name !== undefined ? { grupo_nome: t.group_name } : {}),
        grupo_tipo: LEGACY_TYPE[t.group_type] ?? t.group_type,
        onda: t.wave,
        agente: t.agent,
        spec: t.spec,
        depende: (t.depends_on || []).map((d) => LEGACY_DEP[d] ?? d),
        teste: test(t.test),
        ficheiros: t.files,
        instrucoes: t.instructions,
      };
      if (t.prepare) o.preparar = t.prepare;
      if (o.spec === undefined) delete o.spec;
      return o;
    }),
  };
}
