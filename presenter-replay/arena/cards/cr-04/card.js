import { resposta } from '../../templates/resposta.js';
import { sha256Hex } from '../../lib/hash.js';

const PASSWORDS = { ana: 'verao2026', rui: 'gato-azul-77', eva: 'verao2026' };

// Nomes cujo hash se repete (ou seja, que partilham password).
const HASHES = Object.fromEntries(
  Object.entries(PASSWORDS).map(([nome, password]) => [nome, sha256Hex(password)]),
);
const CONTAGEM = {};
for (const hash of Object.values(HASHES)) CONTAGEM[hash] = (CONTAGEM[hash] || 0) + 1;
const REPETIDOS = Object.keys(HASHES)
  .filter((nome) => CONTAGEM[HASHES[nome]] > 1)
  .sort();

export default resposta({
  id: 'cr-04',
  title: 'Hashes repetidos na fuga',
  category: 'criptografia',
  difficulty: 2,
  concept: 'Sem salt, passwords iguais dão hashes iguais e saltam à vista numa fuga.',
  prompt: 'Numa fuga, as passwords estavam guardadas com SHA-256 sem salt. Que dois utilizadores têm a mesma password?',
  explanation:
    'Sem salt, a mesma password dá sempre o mesmo hash. Com um salt aleatório por utilizador e um algoritmo lento como Argon2id, os hashes ficam todos diferentes.',
  placeholder: 'Dois nomes',
  scenario: {
    kind: 'texto',
    label: 'Tabela roubada',
    lines: [
      'ana: 1e3d55f96ef8725c64a70777ef8c59e3d6d5f401bd19aa2652667ab1520e377c',
      'rui: ebc177dd3e4cc895830bec79e5849fe1e98ab462cd07101d75376612bc997c8b',
      'eva: 1e3d55f96ef8725c64a70777ef8c59e3d6d5f401bd19aa2652667ab1520e377c',
    ],
  },
  check: (normalizada) => {
    const palavras = normalizada.split(/[^a-z]+/).filter(Boolean);
    const nomes = [...new Set(palavras.filter((p) => Object.prototype.hasOwnProperty.call(PASSWORDS, p)))].sort();
    return nomes.length === REPETIDOS.length && nomes.every((n, i) => n === REPETIDOS[i]);
  },
});
