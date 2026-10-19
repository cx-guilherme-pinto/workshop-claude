import { answer } from '../../templates/answer.js';

export default answer({
  id: 'sc-08',
  title: 'O segredo de produção',
  category: 'cloud-secrets',
  difficulty: 2,
  concept: 'Autorização: ter sessão iniciada não quer dizer que possas ler todos os segredos.',
  prompt: 'Uma programadora com sessão iniciada pede à API de segredos da Empresa Atlas GET /secrets/prod-db-password, mas não tem permissão para os segredos de produção. Que código HTTP deve a API devolver?',
  placeholder: 'Código HTTP de 3 algarismos',
  accept: ['404', '404 Not Found', 'Not Found', 'HTTP 404'],
  explanation: 'O nome de um segredo já diz muito (prod-db-password, stripe-live-key). Se a API responder de forma diferente a \'não tens permissão\' e a \'não existe\', qualquer pessoa com conta pode experimentar nomes e descobrir que segredos existem. Regista a tentativa para a equipa de segurança a ver.',
});
