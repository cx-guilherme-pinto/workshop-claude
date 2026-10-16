import { clicaErro } from '../../templates/clica-erro.js';

export default clicaErro({
  id: 'pv-05',
  title: 'Dados a mais na newsletter',
  category: 'privacidade',
  difficulty: 1,
  concept: 'Minimização: recolhe só os dados de que precisas para o fim anunciado.',
  prompt: 'Este formulário serve só para receber a newsletter. Que campos pedem dados a mais?',
  language: 'texto',
  segments: [
    'Email',
    'Nome (opcional)',
    'Número do cartão de cidadão',
    'Data de nascimento completa',
    'Aceito receber a newsletter',
  ],
  answer: [2, 3],
  explanation: 'Para enviar uma newsletter basta o email. Dados que não recolhes não podem ser roubados numa fuga.',
});
