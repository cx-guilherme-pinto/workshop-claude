import { clicaErro } from '../../templates/clica-erro.js';

export default clicaErro({
  id: 'es-09',
  title: 'O fornecedor mudou de banco',
  category: 'engenharia-social',
  difficulty: 2,
  concept: 'Uma mudança de IBAN com pressa e sem confirmação é um sinal de fraude.',
  prompt: 'Este email parece vir de um fornecedor habitual. Que linhas são sinais de fraude?',
  language: 'texto',
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
