// Totais de custo de um projeto, a partir de .workshop/usage.jsonl.
// - "principal": ultima fotografia (cumulativa) de cada sessao principal.
// - "subagente": um registo por subagente terminado.
import { join } from 'node:path';
import { readJsonl } from './transcript.mjs';

export function readUsage(wsDir) {
  return readJsonl(join(wsDir, 'usage.jsonl'));
}

export function totals(records) {
  const lastMain = new Map();
  const subsPorAgente = new Map();
  for (const r of records) {
    if (!r || typeof r !== 'object') continue; // uma linha `null` no usage.jsonl
    if (r.tipo === 'principal') lastMain.set(r.sessao, r);
    else if (r.tipo === 'subagente') subsPorAgente.set(r.agent_id || `${r.ts}-${r.tarefa}`, r);
  }
  const subs = [...subsPorAgente.values()];
  const porModelo = {};
  const add = (model, usd) => {
    const k = model || '?';
    porModelo[k] = (porModelo[k] || 0) + (usd || 0);
  };
  let principal = 0;
  for (const r of lastMain.values()) {
    principal += r.custo_usd || 0;
    if (r.por_modelo) for (const [m, v] of Object.entries(r.por_modelo)) add(m, v);
    else add(r.modelo, r.custo_usd);
  }
  let subagentes = 0;
  for (const r of subs) {
    subagentes += r.custo_usd || 0;
    add(r.modelo, r.custo_usd);
  }
  return {
    total: principal + subagentes,
    principal,
    subagentes,
    nSubagentes: subs.length,
    porModelo,
    sessoes: [...lastMain.values()],
    registosSubagentes: subs,
  };
}
