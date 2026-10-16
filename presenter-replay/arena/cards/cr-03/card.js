import { resposta } from '../../templates/resposta.js';
import { sha256Hex } from '../../lib/hash.js';

const FICHEIROS = {
  a: 'Atlas App 2.4.1 (alterado)',
  b: 'Atlas App 2.4.1 (oficial)',
  c: 'Atlas App 2.4.0 (oficial)',
};

const PUBLICADO = 'aead3ef36683a19ac4daef563b4c4c88076a8e63d039cc71cce386bd856aa07a';

export default resposta({
  id: 'cr-03',
  title: 'Qual é o ficheiro verdadeiro?',
  category: 'criptografia',
  difficulty: 2,
  concept: 'Um hash SHA-256 muda por completo se o ficheiro mudar, por isso serve para confirmar downloads.',
  prompt: 'Descarregaste o instalador da Empresa Atlas de três sítios. Qual ficheiro (A, B ou C) tem o SHA-256 publicado no site oficial?',
  scenario: {
    kind: 'texto',
    label: 'Hashes SHA-256',
    lines: [
      'Publicado: aead3ef36683a19ac4daef563b4c4c88076a8e63d039cc71cce386bd856aa07a',
      'A: ad6973aa9c3038822a7d97182035090e3fd17bd077015dd313aa6f0c0afe36d0',
      'B: aead3ef36683a19ac4daef563b4c4c88076a8e63d039cc71cce386bd856aa07a',
      'C: af402ffc51b958773a597f51605df39c11553f8a02f1c87575e22a3501c1a3b6',
    ],
  },
  placeholder: 'A, B ou C',
  check(normalizada) {
    const chave = normalizada.replace(/^ficheiro\s+/, '').trim();
    if (!Object.prototype.hasOwnProperty.call(FICHEIROS, chave)) return false;
    return sha256Hex(FICHEIROS[chave]) === PUBLICADO;
  },
  explanation: 'Basta um byte diferente para o hash mudar todo: compara o hash completo, não só o início. E confirma que o hash vem do site oficial, por HTTPS.',
});
