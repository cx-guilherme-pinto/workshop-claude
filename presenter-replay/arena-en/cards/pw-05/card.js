import { answer } from '../../templates/answer.js';

export default answer({
  id: 'pw-05',
  title: 'The three types of factor',
  category: 'passwords',
  difficulty: 1,
  concept: 'MFA combines factors of different types: something you know, something you have and something you are.',
  prompt: 'A password is something you know. A fingerprint is something you are. And a physical key or your phone is something you…?',
  placeholder: 'One word',
  accept: ['have', 'something you have', 'possess', 'something you possess', 'possession', 'own'],
  explanation: 'Combining different types of factor forces the attacker to steal two different things. Two passwords in a row are still just one type of factor.',
});
