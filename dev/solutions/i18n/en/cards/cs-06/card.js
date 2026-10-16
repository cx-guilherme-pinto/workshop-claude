import { resposta } from '../../templates/resposta.js';

export default resposta({
  id: 'cs-06',
  title: 'Values kept apart from the SQL',
  category: 'codigo-seguro',
  difficulty: 2,
  concept: 'Parameterized queries send the SQL and the values separately, and the database never mixes them.',
  prompt: 'What is the technique called where you write the SQL with placeholders (like ?) and send the values separately?',
  placeholder: 'Name of the technique',
  accept: ['parameterized queries', 'parameterized query', 'parametrized queries', 'parametrized query', 'parameterised queries', 'parameterised query', 'prepared statements', 'prepared statement', 'parameterization', 'query parameterization', 'bind parameters'],
  explanation: "The value is never read as SQL, so ' OR '1'='1 stays plain text. Use them in every query, even the ones that look safe.",
});
