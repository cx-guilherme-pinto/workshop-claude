// Budget warning: it ONLY INFORMS, it never stops anything.
// Shows a message once when the cost passes the target (US$ 5) and another when it passes the cap (US$ 10).
// The text is in the kit language (pt or en); `l` is optional (tests).
import { join } from 'node:path';
import { readJsonSafe, writeJsonAtomic } from './lib/workshop.mjs';
import { readUsage, totals } from './lib/totals.mjs';
import { fmtUsd, normalizePricing } from './lib/cost.mjs';
import { lingua, textos } from './lib/language.mjs';

const TEXTOS = {
  pt: {
    teto: (total, teto) => `Aviso: o custo acumulado deste projeto chegou a ${total}, acima do teto de ${teto}. A execução continua; nada foi interrompido.`,
    alvo: (total, alvo) => `Aviso: o custo acumulado deste projeto chegou a ${total}, acima do alvo de ${alvo}. A execução continua normalmente.`,
  },
  en: {
    teto: (total, teto) => `Warning: this project's total cost has reached ${total}, above the ${teto} cap. The run continues; nothing was stopped.`,
    alvo: (total, alvo) => `Warning: this project's total cost has reached ${total}, above the ${alvo} target. The run continues as normal.`,
  },
};

export function budgetMessage(wsDir, pricing, l = lingua()) {
  const T = textos(TEXTOS, l);
  const t = totals(readUsage(wsDir));
  pricing = normalizePricing(pricing);
  const alvo = pricing.budget?.target_usd ?? 5;
  const teto = pricing.budget?.cap_usd ?? 10;
  // Which warnings were already shown (warnings.json; older versions wrote avisos.json with pt keys).
  const flagFile = join(wsDir, 'warnings.json');
  const old = readJsonSafe(join(wsDir, 'avisos.json'), {});
  const flags = { cap: old.teto, target: old.alvo, ...readJsonSafe(flagFile, {}) };
  for (const k of Object.keys(flags)) if (flags[k] === undefined) delete flags[k];
  let msg = null;
  if (t.total >= teto && !flags.cap) {
    flags.cap = new Date().toISOString();
    msg = T.teto(fmtUsd(t.total, l), fmtUsd(teto, l));
  } else if (t.total >= alvo && !flags.target) {
    flags.target = new Date().toISOString();
    msg = T.alvo(fmtUsd(t.total, l), fmtUsd(alvo, l));
  }
  if (msg) {
    writeJsonAtomic(flagFile, flags);
    return { systemMessage: msg };
  }
  return null;
}
