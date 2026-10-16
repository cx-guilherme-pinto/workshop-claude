// Aviso de orcamento: SO INFORMA, nunca interrompe.
// Mostra uma mensagem uma unica vez ao passar o alvo (US$ 5) e outra ao passar o teto (US$ 10).
// O texto sai na lingua do kit (pt ou en); `l` e opcional (testes).
import { join } from 'node:path';
import { readJsonSafe, writeJsonAtomic } from './lib/workshop.mjs';
import { readUsage, totals } from './lib/totals.mjs';
import { fmtUsd } from './lib/cost.mjs';
import { lingua, textos } from './lib/lingua.mjs';

const TEXTOS = {
  pt: {
    teto: (total, teto) => `Aviso: o custo acumulado deste projeto chegou a ${total}, acima do teto de ${teto}. A execucao continua; nada foi interrompido.`,
    alvo: (total, alvo) => `Aviso: o custo acumulado deste projeto chegou a ${total}, acima do alvo de ${alvo}. A execucao continua normalmente.`,
  },
  en: {
    teto: (total, teto) => `Warning: this project's total cost has reached ${total}, above the ${teto} cap. The run continues; nothing was stopped.`,
    alvo: (total, alvo) => `Warning: this project's total cost has reached ${total}, above the ${alvo} target. The run continues as normal.`,
  },
};

export function budgetMessage(wsDir, pricing, l = lingua()) {
  const T = textos(TEXTOS, l);
  const t = totals(readUsage(wsDir));
  const alvo = pricing.orcamento?.alvo_usd ?? 5;
  const teto = pricing.orcamento?.teto_usd ?? 10;
  const flagFile = join(wsDir, 'avisos.json');
  const flags = readJsonSafe(flagFile, {});
  let msg = null;
  if (t.total >= teto && !flags.teto) {
    flags.teto = new Date().toISOString();
    msg = T.teto(fmtUsd(t.total, l), fmtUsd(teto, l));
  } else if (t.total >= alvo && !flags.alvo) {
    flags.alvo = new Date().toISOString();
    msg = T.alvo(fmtUsd(t.total, l), fmtUsd(alvo, l));
  }
  if (msg) {
    writeJsonAtomic(flagFile, flags);
    return { systemMessage: msg };
  }
  return null;
}
