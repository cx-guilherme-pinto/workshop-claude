import { escolha } from '../../templates/escolha.js';

export default escolha({
  id: 'es-01',
  title: 'O pedido urgente do diretor',
  category: 'engenharia-social',
  difficulty: 1,
  concept: 'Fraude do CEO: alguém finge ser um chefe para pedir uma transferência urgente e secreta.',
  prompt: 'Este email chegou à contabilidade da Empresa Atlas. O que fazes?',
  scenario: {
    kind: 'email',
    label: 'Email recebido',
    lines: [
      'De: Diretor-geral <dg.atlas@correio-rapido.test>',
      'Preciso de uma transferência urgente de 18 000 € para um fornecedor novo.',
      'Estou numa reunião, não me ligues. Responde só por email.',
    ],
  },
  options: [
    { id: 'a', text: 'Faço a transferência, é o diretor' },
    { id: 'b', text: 'Confirmo por telefone, para o número interno que já conheço' },
    { id: 'c', text: 'Respondo ao email a pedir mais detalhes' },
    { id: 'd', text: 'Peço a um colega para fazer a transferência' },
  ],
  answer: 'b',
  explanation: 'Urgência, segredo e um endereço de fora da empresa são os sinais clássicos. Confirma sempre por um canal que já conheces, nunca pelo que vem na mensagem.',
});
