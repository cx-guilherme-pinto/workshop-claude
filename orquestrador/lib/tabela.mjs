// Tabelas para o terminal e para o Markdown das skills, na lingua do kit (pt ou en).
// Em todas as funcoes, `l` ('pt'|'en') e opcional: por omissao usa lingua() (os testes passam-no explicito).
import { lingua, textos } from '../../hooks/lib/lingua.mjs';

const SIMBOLO = { por_fazer: '·', em_curso: '…', verde: '✓', vermelho: '✗', falhou: '✗✗' };

const TEXTOS = {
  pt: {
    nome: { por_fazer: 'por fazer', em_curso: 'a trabalhar', verde: 'passou', vermelho: 'falhou', falhou: 'falhou (final)' },
    colunas: ['agente', 'modelo', 'tarefa', 'estado', 'tempo', 'custo'],
    tentativa: (n) => ` (tent. ${n})`,
    resumo: (c, total, custo) => `${c.verde}/${total} verdes · ${c.em_curso} a trabalhar · ${c.vermelho + c.falhou} vermelhos · ${c.por_fazer} por fazer · custo ${custo}`,
  },
  en: {
    nome: { por_fazer: 'to do', em_curso: 'working', verde: 'passed', vermelho: 'failed', falhou: 'failed (final)' },
    colunas: ['agent', 'model', 'task', 'status', 'time', 'cost'],
    tentativa: (n) => ` (try ${n})`,
    resumo: (c, total, custo) => `${c.verde}/${total} green · ${c.em_curso} working · ${c.vermelho + c.falhou} red · ${c.por_fazer} to do · cost ${custo}`,
  },
};

// Nome de um estado ('verde' -> 'passou' / 'passed').
export function nomeEstado(estado, l = lingua()) {
  return textos(TEXTOS, l).nome[estado] ?? estado;
}

// "US$ 1,23" em portugues, "US$ 1.23" em ingles (4 casas abaixo de 0,1).
export function usd(v, l = lingua()) {
  if (v === null || v === undefined) return '—';
  const s = v.toFixed(v < 0.1 ? 4 : 2);
  return 'US$ ' + (l === 'pt' ? s.replace('.', ',') : s);
}

// Igual nas duas linguas: "42 s", "3 min 05 s".
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

export function linhaResumo(f, l = lingua()) {
  return textos(TEXTOS, l).resumo(f.contagem, f.total, usd(f.custo.total, l));
}

// Tabela Markdown (as skills mostram-na ao participante).
export function tabelaMarkdown(f, filtro = () => true, l = lingua()) {
  const T = textos(TEXTOS, l);
  const linhas = [`| ${T.colunas.join(' | ')} |`, '|---|---|---|---|---|---|'];
  for (const t of f.tarefas.filter(filtro)) {
    linhas.push(`| ${t.agente || '—'} | ${nomeModelo(t.modelo)} | ${t.id} | ${SIMBOLO[t.estado]} ${T.nome[t.estado]}${t.tentativa > 1 ? T.tentativa(t.tentativa) : ''} | ${tempo(t.tempo_s)} | ${usd(t.custo_usd, l)} |`);
  }
  return linhas.join('\n');
}

// Tabela de texto alinhada (para o terminal).
export function tabelaTexto(f, filtro = () => true, l = lingua()) {
  const T = textos(TEXTOS, l);
  const rows = [[...T.colunas]];
  for (const t of f.tarefas.filter(filtro)) {
    rows.push([t.agente || '—', nomeModelo(t.modelo), t.id, `${SIMBOLO[t.estado]} ${T.nome[t.estado]}`, tempo(t.tempo_s), usd(t.custo_usd, l)]);
  }
  const w = rows[0].map((_, i) => Math.max(...rows.map((r) => [...r[i]].length)));
  const fmt = (r) => r.map((x, i) => x + ' '.repeat(w[i] - [...x].length)).join('  ');
  return [fmt(rows[0]), w.map((n) => '─'.repeat(n)).join('  '), ...rows.slice(1).map(fmt), '', linhaResumo(f, l)].join('\n');
}
