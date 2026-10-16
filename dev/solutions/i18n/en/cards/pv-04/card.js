import { resposta } from '../../templates/resposta.js';

export default resposta({
  id: 'pv-04',
  title: 'Taking your data with you',
  category: 'privacidade',
  difficulty: 2,
  concept: 'The GDPR gives you the right to receive your data in a format another service can read.',
  prompt: 'Which GDPR right lets you take your data to another service, in a machine-readable format?',
  placeholder: 'Name of the right',
  accept: ['portability', 'data portability', 'right to portability', 'right to data portability', 'the right to data portability'],
  explanation: 'The right to data portability (Article 20) applies to the data you provided. Ask the service for it and import it into the new one.',
});
