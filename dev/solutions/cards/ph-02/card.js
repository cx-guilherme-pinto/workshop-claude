import { escolha } from '../../templates/escolha.js';

export default escolha({
  id: 'ph-02',
  title: 'O que denuncia este email?',
  category: 'phishing',
  difficulty: 1,
  concept: 'Pressa e links para outro domínio são os sinais mais comuns de phishing.',
  prompt: 'Este email chegou hoje. Qual é o sinal mais forte de que é phishing?',
  scenario: {
    kind: 'email',
    label: 'Caixa de entrada',
    lines: [
      'De: Correios Rápidos <avisos@correios-rapidos.example>',
      'Assunto: A sua encomenda foi retida',
      'Pague 1,99 € nas próximas 2 horas ou a encomenda é devolvida.',
      'Pagar agora: http://cr-pagamentos.test/pt',
    ],
  },
  options: [
    { id: 'a', text: 'O valor é baixo' },
    { id: 'b', text: 'O prazo de 2 horas e o link para outro domínio' },
    { id: 'c', text: 'O email tem assunto' },
    { id: 'd', text: 'Fala de uma encomenda' },
  ],
  answer: 'b',
  explanation: 'A pressa serve para não pensares, e o link leva a cr-pagamentos.test, que não é dos Correios Rápidos. Abre o site oficial à mão e confirma lá a encomenda.',
});
