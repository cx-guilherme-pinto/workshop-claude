import { escolha } from '../../templates/escolha.js';

export default escolha({
  id: 'pw-04',
  title: 'Como guardar 80 passwords?',
  category: 'passwords',
  difficulty: 1,
  concept: 'Um gestor de passwords cria e guarda uma password única e forte para cada site.',
  prompt: 'Tens 80 contas online. Qual é a forma mais segura de ter uma password diferente em cada uma?',
  options: [
    { id: 'a', text: 'Um caderno na secretária do escritório' },
    { id: 'b', text: 'Uma folha de cálculo chamada passwords.xlsx' },
    { id: 'c', text: 'Um gestor de passwords protegido por uma frase-passe e MFA' },
    { id: 'd', text: 'Uma password base com o nome do site no fim' },
  ],
  answer: 'c',
  explanation: 'O gestor gera passwords longas e aleatórias e só tens de decorar uma frase-passe. Protege-a com MFA, porque passa a ser a chave de tudo.',
});
