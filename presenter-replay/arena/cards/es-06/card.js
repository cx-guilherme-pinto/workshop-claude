import { ordenar } from '../../templates/ordenar.js';

export default ordenar({
  id: 'es-06',
  title: 'As fases de um ataque de engenharia social',
  category: 'engenharia-social',
  difficulty: 2,
  concept: 'Um ataque de engenharia social começa muito antes do contacto: com pesquisa sobre o alvo.',
  prompt: 'Ordena as fases do ataque, da primeira à última.',
  explanation: 'Quanto mais o atacante sabe sobre ti, mais credível é a história. Partilha menos detalhes do trabalho em público.',
  items: [
    { id: 'a', text: 'Pesquisar o alvo nas redes sociais e no site da empresa' },
    { id: 'b', text: 'Pedir o acesso, os dados ou o dinheiro' },
    { id: 'c', text: 'Sair sem deixar rasto' },
    { id: 'd', text: 'Criar confiança com uma história credível' },
  ],
  answer: ['a', 'd', 'b', 'c'],
});
