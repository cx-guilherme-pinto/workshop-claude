import { resposta, normalizar } from '../../templates/resposta.js';
import { sha256Hex } from '../../lib/hash.js';

const FILES = { a: 'Atlas App 2.9.3 (modified)', b: 'Atlas App 2.9.3 (official)', c: 'Atlas App 2.9.2 (official)' };
const PUBLISHED = '87131d4981f502852ee8408055118dda6716bd9566f320f67ca2483a787985ad';

export default resposta({
  id: 'cr-03',
  title: 'Which is the real file?',
  category: 'criptografia',
  difficulty: 2,
  concept: 'A SHA-256 hash changes completely if the file changes, so it is used to check downloads.',
  prompt: 'You downloaded the Atlas Corp installer from three places. Which file (A, B or C) has the SHA-256 published on the official site?',
  scenario: {
    kind: 'texto',
    label: 'SHA-256 hashes',
    lines: [
      'Published: 87131d4981f502852ee8408055118dda6716bd9566f320f67ca2483a787985ad',
      'A: 898bfd72ebe318770a748e1d72d5e99b8427672b7267a573f3dfd0cbb2b01fb8',
      'B: 87131d4981f502852ee8408055118dda6716bd9566f320f67ca2483a787985ad',
      'C: 877552cce26c4a37deefb8facb70690b7655ec641c43df3b13b3fac859cb996f',
    ],
  },
  placeholder: 'A, B or C',
  check: (n) => {
    const k = n.replace(/^file /, '');
    return Object.hasOwn(FILES, k) && sha256Hex(FILES[k]) === PUBLISHED;
  },
  explanation: 'A single different byte changes the whole hash: compare the full hash, not just the start. And make sure the hash comes from the official site, over HTTPS.',
});
