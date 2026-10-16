import { clicaErro } from '../../templates/clica-erro.js';

export default clicaErro({
  id: 'sc-01',
  title: 'A chave no código',
  category: 'segredos-cloud',
  difficulty: 1,
  concept: 'Segredos escritos no código acabam no git e em todas as cópias do repositório.',
  prompt: 'Este ficheiro de configuração vai para o repositório. Que linha expõe um segredo?',
  language: 'js',
  segments: [
    'const config = {',
    '  porta: process.env.PORT || 3000,',
    '  dbUrl: process.env.DATABASE_URL,',
    "  apiKey: 'atlas_prod_9f2c7e1b44d0',",
    "  regiao: 'eu-west-1',",
    '};',
  ],
  answer: [3],
  explanation: 'Quem tiver acesso ao repositório, ou a uma cópia antiga dele, fica com a chave. Lê-a de uma variável de ambiente ou de um cofre de segredos, como em process.env.API_KEY.',
});
