import { resposta, normalizar } from '../../templates/resposta.js';
import { cesar } from '../../lib/hash.js';

const CIFRA = 'DWDTXH DR PHLR-GLD';

export default resposta({
  id: 'cr-01',
  title: 'Decifra a mensagem de César',
  category: 'criptografia',
  difficulty: 1,
  concept: 'A cifra de César troca cada letra por outra a uma distância fixa. Com só 25 chaves, parte-se em segundos.',
  prompt: 'Intercetaste uma mensagem cifrada com a cifra de César, com deslocamento 3. O que diz?',
  scenario: { kind: 'texto', label: 'Mensagem intercetada', lines: [CIFRA] },
  check: (n) => n === normalizar(cesar(CIFRA, -3)),
  explanation: 'Cada letra recua 3 posições: D passa a A, W passa a T. Um atacante experimenta as 25 chaves em segundos. Serve para aprender, não para proteger.',
});
