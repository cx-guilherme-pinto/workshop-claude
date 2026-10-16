import { ordenar } from '../../templates/ordenar.js';

export default ordenar({
  id: 'sc-04',
  title: 'Do acesso mínimo ao total',
  category: 'segredos-cloud',
  difficulty: 1,
  concept: 'Menor privilégio: cada conta ou serviço recebe só o acesso de que precisa.',
  prompt: 'Ordena estas permissões sobre um bucket, da mais restrita à mais ampla.',
  items: [
    { id: 'a', text: 'Administrar toda a conta da cloud' },
    { id: 'b', text: 'Ler e escrever em todo o bucket' },
    { id: 'c', text: 'Ler um só ficheiro' },
    { id: 'd', text: 'Ler todo o bucket' },
  ],
  answer: ['c', 'd', 'b', 'a'],
  explanation: 'Se um serviço for comprometido, o atacante fica só com o que esse serviço podia fazer. Começa pelo acesso mínimo e alarga só quando for preciso.',
});
