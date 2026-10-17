import { choice } from '../../templates/choice.js';

export default choice({
  id: 'cs-02',
  title: 'Validar a idade',
  category: 'secure-code',
  difficulty: 1,
  concept: 'Validar com uma lista do que é permitido é mais seguro do que tentar bloquear o que é perigoso.',
  prompt: 'Um formulário pede a idade. Qual é a melhor validação no servidor?',
  options: [
    { id: 'a', text: 'Remover os caracteres < e >' },
    { id: 'b', text: 'Aceitar só números inteiros entre 0 e 130' },
    { id: 'c', text: 'Validar só no browser, com JavaScript' },
    { id: 'd', text: 'Aceitar tudo e tratar depois' },
  ],
  answer: 'b',
  explanation: 'Definir o que é válido fecha a porta a tudo o resto, incluindo truques que não previste. A validação no browser ajuda o utilizador, mas o servidor tem de repetir tudo.',
});
