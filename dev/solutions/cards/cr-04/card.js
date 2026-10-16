import { resposta } from '../../templates/resposta.js';
import { sha256Hex } from '../../lib/hash.js';

const PASSWORDS = { ana: 'verao2026', rui: 'gato-azul-77', eva: 'verao2026' };
const HASHES = Object.fromEntries(Object.entries(PASSWORDS).map(([u, p]) => [u, sha256Hex(p)]));
const REPETIDOS = Object.keys(HASHES).filter((u) => Object.values(HASHES).filter((x) => x === HASHES[u]).length > 1);

export default resposta({
  id: 'cr-04',
  title: 'Hashes repetidos na fuga',
  category: 'criptografia',
  difficulty: 2,
  concept: 'Sem salt, passwords iguais dão hashes iguais e saltam à vista numa fuga.',
  prompt: 'Numa fuga, as passwords estavam guardadas com SHA-256 sem salt. Que dois utilizadores têm a mesma password?',
  scenario: {
    kind: 'texto',
    label: 'Tabela roubada',
    lines: [
      'ana: 1e3d55f96ef8725c64a70777ef8c59e3d6d5f401bd19aa2652667ab1520e377c',
      'rui: ebc177dd3e4cc895830bec79e5849fe1e98ab462cd07101d75376612bc997c8b',
      'eva: 1e3d55f96ef8725c64a70777ef8c59e3d6d5f401bd19aa2652667ab1520e377c',
    ],
  },
  placeholder: 'Dois nomes',
  check: (n) => {
    const ditos = new Set((n.match(/[a-z]+/g) || []).filter((w) => Object.hasOwn(PASSWORDS, w)));
    return ditos.size === REPETIDOS.length && REPETIDOS.every((u) => ditos.has(u));
  },
  explanation: 'Sem salt, a mesma password dá sempre o mesmo hash. Com um salt aleatório por utilizador e um algoritmo lento como Argon2id, os hashes ficam todos diferentes.',
});
