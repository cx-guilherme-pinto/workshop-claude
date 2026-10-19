import { answer } from '../../templates/answer.js';

export default answer({
  id: 'sc-08',
  title: 'The production secret',
  category: 'cloud-secrets',
  difficulty: 2,
  concept: 'Authorization: being signed in does not mean you may read every secret.',
  prompt: 'A signed-in developer asks Atlas Corp\'s secrets API for GET /secrets/prod-db-password, but has no permission for production secrets. Which HTTP status code should the API return?',
  placeholder: '3-digit HTTP code',
  accept: ['404', '404 Not Found', 'Not Found', 'HTTP 404'],
  explanation: 'A secret\'s name already says a lot (prod-db-password, stripe-live-key). If the API answers \'not allowed\' differently from \'does not exist\', anyone with an account can try names and find out which secrets exist. Log the attempt so the security team sees it.',
});
