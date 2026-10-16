// Formatos na lingua da Arena (lib/textos.js), iguais aos de tools/workshop/orquestrador/lib/tabela.mjs.
import { T } from '/lib/textos.js';

// Virgula decimal em portugues, ponto em ingles.
export function decimal(texto) {
  return String(texto).replace('.', T.decimal);
}

// "US$ 0,0042" abaixo de 10 centimos, "US$ 1,23" acima.
export function usd(v) {
  if (v === null || v === undefined || Number.isNaN(v)) return '—';
  return 'US$ ' + decimal(v.toFixed(v < 0.1 ? 4 : 2));
}

// Totais: sempre com 2 casas ("US$ 0,00").
export function usdTotal(v) {
  return 'US$ ' + decimal((Number(v) || 0).toFixed(2));
}

// "42 s", "3 min 05 s".
export function tempo(s) {
  if (s === null || s === undefined || Number.isNaN(s)) return '—';
  if (s < 60) return `${Math.round(s)} s`;
  const m = Math.floor(s / 60);
  return `${m} min ${String(Math.round(s % 60)).padStart(2, '0')} s`;
}

// Relogio para o cabecalho: "4:07", "1:02:30".
export function relogio(s) {
  const t = Math.max(0, Math.floor(Number(s) || 0));
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const ss = String(t % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}

export function nomeModelo(m) {
  if (!m) return '—';
  const x = String(m).toLowerCase();
  if (x.includes('haiku')) return 'Haiku';
  if (x.includes('sonnet')) return 'Sonnet';
  if (x.includes('opus')) return 'Opus';
  if (x.includes('fable')) return 'Fable';
  return String(m);
}

export const NOME_ESTADO = T.estados;

export const NOME_MODELO_CARTAO = T.modelos;
