import { escolha } from '../../templates/escolha.js';

export default escolha({
  id: 'sc-10',
  title: 'Como a app chega à base de dados',
  category: 'segredos-cloud',
  difficulty: 2,
  concept: 'Credenciais temporárias, dadas pela cloud a um serviço, evitam chaves fixas que podem vazar.',
  prompt: 'Uma app na cloud precisa de ler uma base de dados. Que credencial é mais segura?',
  options: [
    { id: 'a', text: 'Uma chave de acesso fixa no código' },
    { id: 'b', text: 'Uma função (role) com credenciais temporárias geridas pela cloud' },
    { id: 'c', text: 'A password do administrador partilhada pela equipa' },
    { id: 'd', text: 'Uma chave num ficheiro no ambiente de trabalho' },
  ],
  answer: 'b',
  explanation: 'As credenciais temporárias expiram sozinhas e não há nada fixo para roubar do código. Dá à função só as permissões de leitura de que a app precisa.',
});
