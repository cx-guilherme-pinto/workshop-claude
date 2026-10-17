import { choice } from '../../templates/choice.js';

export default choice({
  id: 'cr-10',
  title: 'Números ao acaso a sério',
  category: 'cryptography',
  difficulty: 2,
  concept: 'Tokens de segurança precisam de um gerador aleatório criptográfico, não de Math.random().',
  prompt: 'Vais gerar o token de um link de recuperação de password. Qual usas?',
  options: [
    { id: 'a', text: 'Math.random()' },
    { id: 'b', text: 'Date.now()' },
    { id: 'c', text: 'crypto.getRandomValues()' },
    { id: 'd', text: 'O email do utilizador em Base64' },
  ],
  answer: 'c',
  explanation: 'Math.random() e a hora são previsíveis e o Base64 do email adivinha-se. Usa crypto.getRandomValues() ou crypto.randomBytes() com pelo menos 128 bits.',
});
