// The workshop engine (tools/workshop/, copied by the installer) as the Pocketknife tools see it (adapted from the
// Security Arena). The engine moved from tools/workshop/orquestrador/ to tools/workshop/orchestrator/ and its modules
// got English names; this module finds whichever is there.
// It also reads plan.json in both schemas: the English one (tasks, depends_on, group_type...) and the older
// Portuguese one (tarefas, depende, grupo_tipo...).
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const PROJECT = join(dirname(fileURLToPath(import.meta.url)), '..');

const CANDIDATES = {
  state: ['orchestrator/lib/state.mjs', 'orquestrador/lib/estado.mjs'],
  table: ['orchestrator/lib/table.mjs', 'orquestrador/lib/tabela.mjs'],
  estimate: ['orchestrator/estimate.mjs', 'orquestrador/estimate.mjs'],
  language: ['hooks/lib/language.mjs', 'hooks/lib/lingua.mjs'],
};

// Path of an engine module inside the project, or null.
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
export async function loadEngine(root = PROJECT) {
  const [state, table, estimate, language] = await Promise.all(['state', 'table', 'estimate', 'language'].map((n) => load(root, n)));
  return {
    state: state && {
      paths: pick(state, 'paths', 'caminhos'),
      readPlan: pick(state, 'readPlan', 'lerPlano'),
      readState: pick(state, 'readState', 'lerEstado'),
      snapshot: pick(state, 'snapshot', 'fotografia'),
      normalizePlan: pick(state, 'normalizePlan', 'normalizarPlano'),
    },
    table: table && { markdownTable: pick(table, 'markdownTable', 'tabelaMarkdown') },
    estimate: estimate && { estimate: pick(estimate, 'estimate', 'estimar'), estimateTable: pick(estimate, 'estimateTable', 'tabelaEstimativa') },
    texts: pick(language, 'texts', 'textos'),
  };
}

// The project's language: the "lang" of specs/tools.json (the installer assembles one language per copy);
// with no field, Portuguese.
export function projectLanguage(root = PROJECT) {
  try {
    return JSON.parse(readFileSync(join(root, 'specs', 'tools.json'), 'utf8')).lang === 'en' ? 'en' : 'pt';
  } catch {
    return 'pt';
  }
}

// Texts in the project's language.
export function projectTexts(dic, root = PROJECT) {
  return dic[projectLanguage(root)] ?? dic.pt;
}

// ---------- plan.json in both schemas ----------

const GROUP_TYPE = { cartao: 'card', ferramenta: 'tool', pagina: 'page', integracao: 'integration', revisao: 'review', tarefa: 'task' };
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

// A tool id (tools/<id>/): two letters, a hyphen and two digits (tx-01 … dd-05, and my-01 for your tool).
export const TOOL_ID = /^[a-z]{2}-\d{2}$/;
