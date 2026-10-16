import { resposta } from '../../templates/resposta.js';

export default resposta({
  id: 'cs-06',
  title: 'Valores separados do SQL',
  category: 'codigo-seguro',
  difficulty: 2,
  concept: 'Consultas parametrizadas enviam o SQL e os valores em separado, e a base de dados nunca os mistura.',
  prompt: 'Como se chama a técnica de escrever o SQL com marcadores (como ?) e enviar os valores à parte?',
  placeholder: 'Nome da técnica',
  accept: ['consultas parametrizadas', 'consulta parametrizada', 'queries parametrizadas', 'query parametrizada', 'prepared statements', 'prepared statement', 'instruções preparadas', 'parametrização'],
  explanation: "O valor nunca é lido como SQL, por isso ' OR '1'='1 fica só texto. Usa-as em todas as consultas, mesmo nas que parecem seguras.",
});
