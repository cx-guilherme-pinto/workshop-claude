import { answer } from '../../templates/answer.js';

export default answer({
  id: 'es-08',
  title: 'Phishing feito à medida',
  category: 'social-engineering',
  difficulty: 2,
  concept: 'Spear phishing: phishing dirigido a uma pessoa, com detalhes reais para parecer legítimo.',
  prompt: 'Um email usa o teu nome, o nome do teu chefe e o projeto em que trabalhas. Como se chama este tipo de phishing dirigido?',
  placeholder: 'Nome do ataque',
  accept: ['spear phishing', 'spear-phishing', 'spearphishing'],
  explanation: 'Os detalhes vêm de redes sociais e de fugas de dados, por isso parecer pessoal não prova nada. Confirma pedidos invulgares por outro canal.',
});
