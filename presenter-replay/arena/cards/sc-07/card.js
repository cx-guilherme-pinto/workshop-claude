import { spotTheFlaw } from '../../templates/spot-the-flaw.js';

export default spotTheFlaw({
  id: 'sc-07',
  title: 'O segredo no registo do CI',
  category: 'cloud-secrets',
  difficulty: 2,
  concept: 'Tudo o que um pipeline escreve fica nos registos, que muita gente pode ler.',
  prompt: 'Este pipeline de CI corre em cada push. Que passo expõe um segredo?',
  language: 'text',
  segments: [
    'steps:',
    '  - run: npm ci',
    '  - run: echo "A usar o token $DEPLOY_TOKEN"',
    '  - run: npm test',
    '  - run: ./deploy.sh',
  ],
  answer: [2],
  explanation: 'O echo escreve o token nos registos, onde fica guardado. Passa-o como segredo do CI à ferramenta que precisa dele e nunca o imprimas.',
});
