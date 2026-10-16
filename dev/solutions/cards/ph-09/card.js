import { clicaErro } from '../../templates/clica-erro.js';

export default clicaErro({
  id: 'ph-09',
  title: 'Phishing por SMS',
  category: 'phishing',
  difficulty: 1,
  concept: 'Smishing: o mesmo truque do phishing, mas por SMS, onde é mais difícil ver o link.',
  prompt: 'Este SMS chegou ao teu telemóvel. Que trechos são sinais de smishing?',
  language: 'texto',
  segments: [
    'Correios Rápidos:',
    'A encomenda CR-4471 não foi entregue.',
    'Motivo: morada incompleta.',
    'Atualize em http://cr-morada.test/pt',
    'Sem resposta em 12h, será devolvida.',
  ],
  answer: [3, 4],
  explanation: 'O link aponta para um domínio estranho e o prazo curto serve para agires sem pensar. Abre a app ou o site oficial e procura lá o número da encomenda.',
});
