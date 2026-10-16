// Tabelas para o terminal e para o Markdown das skills.

const SIMBOLO = { por_fazer: '·', em_curso: '…', verde: '✓', vermelho: '✗', falhou: '✗✗' };
const NOME = { por_fazer: 'por fazer', em_curso: 'a trabalhar', verde: 'passou', vermelho: 'falhou', falhou: 'falhou (final)' };

export function usd(v) {
  if (v === null || v === undefined) return '—';
  return 'US$ ' + v.toFixed(v < 0.1 ? 4 : 2).replace('.', ',');
}

export function tempo(s) {
  if (s === null || s === undefined || Number.isNaN(s)) return '—';
  if (s < 60) return `${Math.round(s)} s`;
  return `${Math.floor(s / 60)} min ${String(Math.round(s % 60)).padStart(2, '0')} s`;
}

export function nomeModelo(m) {
  if (!m) return '—';
  const x = String(m).toLowerCase();
  if (x.includes('haiku')) return 'Haiku';
  if (x.includes('sonnet')) return 'Sonnet';
  if (x.includes('opus')) return 'Opus';
  if (x.includes('fable')) return 'Fable';
  return m;
}

export function linhaResumo(f) {
  const c = f.contagem;
  return `${c.verde}/${f.total} verdes · ${c.em_curso} a trabalhar · ${c.vermelho + c.falhou} vermelhos · ${c.por_fazer} por fazer · custo ${usd(f.custo.total)}`;
}

// Tabela Markdown (as skills mostram-na ao participante).
export function tabelaMarkdown(f, filtro = () => true) {
  const linhas = ['| agente | modelo | tarefa | estado | tempo | custo |', '|---|---|---|---|---|---|'];
  for (const t of f.tarefas.filter(filtro)) {
    linhas.push(`| ${t.agente || '—'} | ${nomeModelo(t.modelo)} | ${t.id} | ${SIMBOLO[t.estado]} ${NOME[t.estado]}${t.tentativa > 1 ? ` (tent. ${t.tentativa})` : ''} | ${tempo(t.tempo_s)} | ${usd(t.custo_usd)} |`);
  }
  return linhas.join('\n');
}

// Tabela de texto alinhada (para o terminal).
export function tabelaTexto(f, filtro = () => true) {
  const rows = [['agente', 'modelo', 'tarefa', 'estado', 'tempo', 'custo']];
  for (const t of f.tarefas.filter(filtro)) {
    rows.push([t.agente || '—', nomeModelo(t.modelo), t.id, `${SIMBOLO[t.estado]} ${NOME[t.estado]}`, tempo(t.tempo_s), usd(t.custo_usd)]);
  }
  const w = rows[0].map((_, i) => Math.max(...rows.map((r) => [...r[i]].length)));
  const fmt = (r) => r.map((x, i) => x + ' '.repeat(w[i] - [...x].length)).join('  ');
  return [fmt(rows[0]), w.map((n) => '─'.repeat(n)).join('  '), ...rows.slice(1).map(fmt), '', linhaResumo(f)].join('\n');
}
