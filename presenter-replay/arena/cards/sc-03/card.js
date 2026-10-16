import { resposta } from '../../templates/resposta.js';

export default resposta({
  id: 'sc-03',
  title: 'O .env fica de fora',
  category: 'segredos-cloud',
  difficulty: 1,
  concept: 'O ficheiro .env com segredos nunca entra no repositório; partilha-se só um .env.example sem valores.',
  prompt: 'Que ficheiro do git diz que ficheiros, como o .env, nunca devem entrar no repositório?',
  placeholder: 'Nome do ficheiro',
  accept: ['.gitignore'],
  explanation: 'Põe .env no .gitignore antes do primeiro commit e mantém um .env.example só com os nomes das variáveis. Assim a equipa sabe o que configurar sem ver os valores.',
});
