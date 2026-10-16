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

rl.on('line', (l) => {
  let ev;
  try {
    ev = JSON.parse(l);
  } catch {
    return;
  }
  if (ev.type === 'system' && ev.subtype === 'init') out(C.dim, `Claude Code ${ev.claude_code_version || ''} · modelo ${ev.model || ''}`);
  const blocos = ev.message?.content;
  if (!Array.isArray(blocos)) return;
  for (const b of blocos) {
    if (ev.type === 'assistant' && b.type === 'tool_use') {
      if (b.name === 'Agent' || b.name === 'Task') {
        const desc = b.input?.description || '';
        pendentes.set(b.id, { desc, inicio: Date.now(), tipo: b.input?.subagent_type });
        out(C.amarelo, `▶ ${desc}  ${C.dim}(${b.input?.subagent_type})`);
      } else if (b.name === 'Bash' && /next-wave/.test(b.input?.command || '')) {
        out(C.azul + C.negrito, '◆ orquestrador: próximo lote');
      }
    }
    if (ev.type === 'user' && b.type === 'tool_result') {
      const p = pendentes.get(b.tool_use_id);
      const texto = Array.isArray(b.content) ? b.content.map((c) => c.text || '').join(' ') : String(b.content || '');
      if (p) {
        const s = Math.round((Date.now() - p.inicio) / 1000);
        const ok = /\bOK\b/.test(texto) && !/FALHOU/.test(texto);
        out(ok ? C.verde : C.vermelho, `${ok ? '✓' : '✗'} ${p.desc}  ${C.dim}${s} s`);
        pendentes.delete(b.tool_use_id);
      } else {
        const m = /ESTADO: (LOTE \d+[^\n]*|FIM[^\n]*|BLOQUEADO[^\n]*)/.exec(texto);
        if (m) out(C.azul + C.negrito, m[1]);
        const prog = /Progresso: ([^\n]*)/.exec(texto);
        if (prog) out(C.dim, prog[1]);
      }
    }
  }
  if (ev.type === 'result') out(C.negrito, `Fim · ${Math.round((ev.duration_ms || 0) / 1000)} s`);
});
