import { resposta, normalizar } from '../../templates/resposta.js';
import { sha256Hex } from '../../lib/hash.js';

const PASSWORDS = { ana: 'summer2026', tom: 'blue-cat-77', eva: 'summer2026' };
const HASHES = Object.fromEntries(Object.entries(PASSWORDS).map(([u, p]) => [u, sha256Hex(p)]));
const REPEATED = Object.keys(HASHES).filter((u) => Object.values(HASHES).filter((x) => x === HASHES[u]).length > 1);

export default resposta({
  id: 'cr-04',
  title: 'Repeated hashes in the breach',
  category: 'criptografia',
  difficulty: 2,
  concept: 'Without a salt, identical passwords give identical hashes and stand out in a breach.',
  prompt: 'In a breach, the passwords were stored with SHA-256 and no salt. Which two users have the same password?',
  scenario: {
    kind: 'texto',
    label: 'Stolen table',
    lines: [
      'ana: 6a0436eecdad379345d804a9e4861a46e2135054879760acaf8d88534f871b26',
      'tom: e44771109f62417cd312797e9fce2b3529ef53341414a6574aace379e4035de7',
      'eva: 6a0436eecdad379345d804a9e4861a46e2135054879760acaf8d88534f871b26',
    ],
  },
  placeholder: 'Two names',
  check: (n) => {
    const named = new Set((n.match(/[a-z]+/g) || []).filter((w) => Object.hasOwn(PASSWORDS, w)));
    return named.size === REPEATED.length && REPEATED.every((u) => named.has(u));
  },
  explanation: 'Without a salt, the same password always gives the same hash. With a random salt per user and a slow algorithm like Argon2id, the hashes all come out different.',
});
