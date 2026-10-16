// Progresso do jogador no browser. O localStorage pode nao existir (janela privada,
// dados bloqueados): todos os acessos estao em try/catch e ha uma copia em memoria.

const CHAVE = 'arena:progresso:v1';
let memoria = {};

function valido(v) {
  return v && typeof v === 'object' && !Array.isArray(v);
}

export function lerProgresso() {
  try {
    const bruto = globalThis.localStorage?.getItem(CHAVE);
    if (bruto) {
      const v = JSON.parse(bruto);
      if (valido(v)) memoria = v;
    }
  } catch {
    /* sem armazenamento: fica a memoria */
  }
  const copia = {};
  for (const [id, r] of Object.entries(memoria)) {
    if (valido(r)) copia[id] = { certo: r.certo === true, tentativas: Number(r.tentativas) || 0, ultima: r.ultima === 'certo' ? 'certo' : 'errado' };
  }
  return copia;
}

function gravar() {
  try {
    globalThis.localStorage?.setItem(CHAVE, JSON.stringify(memoria));
  } catch {
    /* sem armazenamento: fica a memoria */
  }
}

// Uma vez resolvido, o cartao fica resolvido; "ultima" guarda a ultima tentativa.
export function registarResposta(id, certo) {
  lerProgresso();
  const antes = valido(memoria[id]) ? memoria[id] : {};
  memoria[id] = {
    certo: antes.certo === true || certo === true,
    tentativas: (Number(antes.tentativas) || 0) + 1,
    ultima: certo ? 'certo' : 'errado',
    em: new Date().toISOString(),
  };
  gravar();
  return memoria[id];
}

export function apagarProgresso() {
  memoria = {};
  try {
    globalThis.localStorage?.removeItem(CHAVE);
  } catch {
    /* nada a apagar */
  }
}

export function pontosDe(dificuldade) {
  return Number.isInteger(dificuldade) && dificuldade > 0 ? dificuldade * 10 : 0;
}
