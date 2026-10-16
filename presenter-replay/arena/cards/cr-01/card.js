import { resposta, normalizar } from '../../templates/resposta.js';
import { cesar } from '../../lib/hash.js';

const CIFRADA = 'DWDTXH DR PHLR-GLD';
const CERTA = cesar(CIFRADA, -3);

export default resposta({
  id: 'cr-01',
  title: 'Decifra a mensagem de César',
  category: 'criptografia',
  difficulty: 1,
  concept: 'A cifra de César troca cada letra por outra a uma distância fixa. Com só 25 chaves, parte-se em segundos.',
  prompt: 'Intercetaste uma mensagem cifrada com a cifra de César, com deslocamento 3. O que diz?',
  scenario: {
    kind: 'texto',
    label: 'Mensagem intercetada',
    lines: [CIFRADA],
  },
  placeholder: 'Escreve a mensagem decifrada',
  check: (normalizada) => normalizada === normalizar(CERTA),
  explanation: 'Cada letra recua 3 posições: D passa a A, W passa a T. Um atacante experimenta as 25 chaves em segundos. Serve para aprender, não para proteger.',
});
