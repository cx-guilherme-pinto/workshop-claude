import { escolha } from '../../templates/escolha.js';

export default escolha({
  id: 'ph-08',
  title: 'Ativar o conteúdo?',
  category: 'phishing',
  difficulty: 2,
  concept: 'As macros de um documento são código; ativá-las pode instalar malware.',
  prompt: 'Um documento recebido por email diz: \'Ative o conteúdo para ver a fatura.\' O que fazes?',
  explanation: 'Uma fatura verdadeira não precisa de macros para ser lida. Fecha o ficheiro e confirma com o remetente por telefone ou pelo portal oficial.',
  options: [
    { id: 'a', text: 'Ativo, senão não vejo a fatura' },
    { id: 'b', text: 'Fecho e confirmo com o remetente por outro canal' },
    { id: 'c', text: 'Reencaminho para um colega abrir' },
    { id: 'd', text: 'Guardo e abro mais tarde' },
  ],
  answer: 'b',
});
