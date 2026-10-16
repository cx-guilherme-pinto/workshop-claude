import { clicaErro } from '../../templates/clica-erro.js';

export default clicaErro({
  id: 'ph-04',
  title: 'O nome não prova nada',
  category: 'phishing',
  difficulty: 2,
  concept: 'O nome do remetente é texto livre; o que conta é o domínio depois do @.',
  prompt: 'O Banco Luz só envia emails de @bancoluz.example. Que remetentes são falsos?',
  explanation: 'Qualquer pessoa pode pôr \'Banco Luz\' como nome. Olha para o que vem depois do @: só bancoluz.example é do banco.',
  language: 'texto',
  segments: [
    'Banco Luz <avisos@bancoluz.example>',
    'Banco Luz <extratos@bancoluz.example>',
    'Banco Luz <seguranca@bancoluz-example.test>',
    'Banco Luz <ajuda@bancoluz.example>',
    'Banco Luz <bancoluz.example@correio-gratis.test>',
  ],
  answer: [2, 4],
});
