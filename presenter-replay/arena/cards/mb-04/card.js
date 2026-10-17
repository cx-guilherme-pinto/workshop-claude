import { choice } from '../../templates/choice.js';

export default choice({
  id: 'mb-04',
  title: 'A atualização pendente',
  category: 'mobile',
  difficulty: 1,
  concept: 'As atualizações de segurança corrigem falhas que os atacantes já conhecem.',
  prompt: 'O telemóvel tem uma atualização de segurança pendente há três semanas. O que fazes?',
  options: [
    { id: 'a', text: 'Espero pela próxima versão grande' },
    { id: 'b', text: 'Instalo assim que puder' },
    { id: 'c', text: 'Só atualizo se notar problemas' },
    { id: 'd', text: 'Desligo as atualizações' },
  ],
  answer: 'b',
  explanation: 'Quando a correção sai, a falha fica pública e os ataques aumentam. Ativa as atualizações automáticas e troca de telemóvel quando deixar de as receber.',
});
