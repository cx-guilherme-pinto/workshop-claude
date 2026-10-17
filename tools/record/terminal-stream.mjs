#!/usr/bin/env node
// Le o `claude -p --output-format stream-json --verbose` no stdin e mostra no terminal,
// de forma legivel, o que o Claude Code esta a fazer: lotes, agentes lancados e terminados.
// Usado na gravacao do modo apresentador (asciinema). Ferramenta do organizador.
import { createInterface } from 'node:readline';

const rl = createInterface({ input: process.stdin });
const t0 = Date.now();
const relogio = () => {
  const s = Math.floor((Date.now() - t0) / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};
const C = { dim: '\x1b[90m', verde: '\x1b[32m', amarelo: '\x1b[33m', azul: '\x1b[34m', vermelho: '\x1b[31m', negrito: '\x1b[1m', reset: '\x1b[0m' };
const out = (cor, txt) => process.stdout.write(`${C.dim}${relogio()}${C.reset}  ${cor}${txt}${C.reset}\n`);
const pendentes = new Map();
// Textos do terminal gravado na lingua da gravacao (GRAVAR_LINGUA=en grava em ingles, D-20/D-25).
const EN = /^en/i.test(process.env.GRAVAR_LINGUA || process.env.WORKSHOP_LANG || '');
const T = EN ? { modelo: 'model', lote: 'orchestrator: next batch', fim: 'Done' } : { modelo: 'modelo', lote: 'orquestrador: próximo lote', fim: 'Fim' };
const FALHOU = /FAILED|FALHOU/;
let inicioMostrado = false;

rl.on('line', (l) => {
  let ev;
  try {
    ev = JSON.parse(l);
  } catch {
    return;
  }
  if (ev.type === 'system' && ev.subtype === 'init' && !inicioMostrado) {
    inicioMostrado = true;
    out(C.dim, `Claude Code ${ev.claude_code_version || ''} · ${T.modelo} ${ev.model || ''}`);
  }
  // Em -p os subagentes correm em segundo plano: o resultado real chega como task_notification.
  if (ev.type === 'system' && ev.subtype === 'task_notification') {
    const p = pendentes.get(ev.tool_use_id);
    const desc = p?.desc || ev.description || ev.task_id;
    const s = Math.round((ev.usage?.duration_ms ?? (p ? Date.now() - p.inicio : 0)) / 1000);
    const ok = ev.status === 'completed' && /\bOK\b/.test(ev.summary || '') && !FALHOU.test(ev.summary || '');
    out(ok ? C.verde : C.vermelho, `${ok ? '✓' : '✗'} ${desc}  ${C.dim}${s} s`);
    pendentes.delete(ev.tool_use_id);
    return;
  }
  if (ev.parent_tool_use_id) return; // mensagens de dentro dos subagentes
  if (ev.type === 'result') return out(C.negrito, `${T.fim} · ${Math.round((ev.duration_ms || 0) / 1000)} s`);
  const blocos = ev.message?.content;
  if (!Array.isArray(blocos)) return;
  for (const b of blocos) {
    if (ev.type === 'assistant' && b.type === 'tool_use') {
      if (b.name === 'Agent' || b.name === 'Task') {
        const desc = b.input?.description || '';
        pendentes.set(b.id, { desc, inicio: Date.now(), tipo: b.input?.subagent_type });
        out(C.amarelo, `▶ ${desc}  ${C.dim}(${b.input?.subagent_type})`);
      } else if (b.name === 'Bash' && /next-wave/.test(b.input?.command || '')) {
        out(C.azul + C.negrito, `◆ ${T.lote}`);
      }
    }
    if (ev.type === 'user' && b.type === 'tool_result') {
      const p = pendentes.get(b.tool_use_id);
      const texto = Array.isArray(b.content) ? b.content.map((c) => c.text || '').join(' ') : String(b.content || '');
      // Lancamento em segundo plano: o resultado vem depois, na task_notification.
      if (p && /^Async agent launched/.test(texto.trim())) continue;
      if (p) {
        const s = Math.round((Date.now() - p.inicio) / 1000);
        const ok = /\bOK\b/.test(texto) && !FALHOU.test(texto);
        out(ok ? C.verde : C.vermelho, `${ok ? '✓' : '✗'} ${p.desc}  ${C.dim}${s} s`);
        pendentes.delete(b.tool_use_id);
      } else {
        const m = /(?:STATE|ESTADO): ((?:BATCH|LOTE) \d+[^\n]*|(?:DONE|FIM)[^\n]*|(?:BLOCKED|BLOQUEADO)[^\n]*)/.exec(texto);
        if (m) out(C.azul + C.negrito, m[1]);
        const prog = /(?:Progresso|Progress): ([^\n]*)/.exec(texto); // pt ou en (D-20)
        if (prog) out(C.dim, prog[1]);
      }
    }
  }
});
