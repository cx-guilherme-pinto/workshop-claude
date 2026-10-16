// Aviso de orcamento: SO INFORMA, nunca interrompe.
// Mostra uma mensagem uma unica vez ao passar o alvo (US$ 5) e outra ao passar o teto (US$ 10).
import { join } from 'node:path';
import { readJsonSafe, writeJsonAtomic } from './lib/workshop.mjs';
import { readUsage, totals } from './lib/totals.mjs';
import { fmtUsd } from './lib/cost.mjs';

export function budgetMessage(wsDir, pricing) {
  const t = totals(readUsage(wsDir));
  const alvo = pricing.orcamento?.alvo_usd ?? 5;
  const teto = pricing.orcamento?.teto_usd ?? 10;
  const flagFile = join(wsDir, 'avisos.json');
  const flags = readJsonSafe(flagFile, {});
  let msg = null;
  if (t.total >= teto && !flags.teto) {
    flags.teto = new Date().toISOString();
    msg = `Aviso: o custo acumulado deste projeto chegou a ${fmtUsd(t.total)}, acima do teto de ${fmtUsd(teto)}. A execucao continua; nada foi interrompido.`;
  } else if (t.total >= alvo && !flags.alvo) {
    flags.alvo = new Date().toISOString();
    msg = `Aviso: o custo acumulado deste projeto chegou a ${fmtUsd(t.total)}, acima do alvo de ${fmtUsd(alvo)}. A execucao continua normalmente.`;
  }
  if (msg) {
    writeJsonAtomic(flagFile, flags);
    return { systemMessage: msg };
  }
  return null;
}
