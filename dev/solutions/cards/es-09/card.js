import { spotTheFlaw } from '../../templates/spot-the-flaw.js';

export default spotTheFlaw({
  id: 'es-09',
  title: 'O fornecedor mudou de banco',
  category: 'social-engineering',
  difficulty: 2,
  concept: 'Fraude do IBAN: um email pede para pagar a uma conta nova e evita qualquer confirmação.',
  prompt: 'Este email parece vir de um fornecedor habitual. Que linhas são sinais de fraude?',
  language: 'text',
  segments: [
    'De: Fornecedor Atlas <contas@atlas-fornecimentos.test>',
    'Bom dia, segue a fatura de outubro.',
    'Mudámos de banco: paguem já para o novo IBAN em anexo.',
    'Não liguem, a linha está em manutenção.',
    'Cumprimentos, Departamento Financeiro',
  ],
  answer: [2, 3],
  explanation: 'Uma mudança de IBAN com um pedido para não ligarem é o padrão desta fraude. Confirma sempre por telefone, para um número que já tinhas.',
});
