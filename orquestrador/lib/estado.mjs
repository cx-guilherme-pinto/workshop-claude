// Estado do enxame: plano, estado por tarefa (.workshop/status/<id>.json), eventos e custos.
// Um escritor por ficheiro de estado; os hooks so fazem append a usage.jsonl / events.jsonl.
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync, renameSync, appendFileSync } from 'node:fs';
import { join, resolve, isAbsolute } from 'node:path';

export const ESTADOS = ['por_fazer', 'em_curso', 'verde', 'vermelho', 'falhou'];

export function caminhos(projeto) {
  const ws = join(projeto, '.workshop');
  return {
    projeto,
    ws,
    status: join(ws, 'status'),
    eventos: join(ws, 'events.jsonl'),
    usage: join(ws, 'usage.jsonl'),
    run: join(ws, 'run.json'),
    ponteiro: join(ws, 'orquestrador.json'),
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
      /* ignorar linha parcial */
    }
  }
  return out;
}

export function evento(c, ev) {
  appendFileSync(c.eventos, JSON.stringify({ ts: new Date().toISOString(), ...ev }) + '\n', 'utf8');
}

export function lerPlano(caminho) {
  const p = lerJson(caminho);
  if (!p) throw new Error(`Plano nao encontrado em ${caminho}. Corre primeiro o planeamento (/demo-plan ou /task-plan).`);
  if (p.v !== 1 || !Array.isArray(p.tarefas)) throw new Error(`Plano invalido: ${caminho}`);
  // Expandir "*cartoes" e "*todas" nas dependencias.
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

// Fotografia completa para o painel, o /estado e os relatorios.
export function fotografia(c, plano) {
  const usage = lerJsonl(c.usage);
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
