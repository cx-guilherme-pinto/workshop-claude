import { clicaErro } from '../../templates/clica-erro.js';

export default clicaErro({
  id: 'web-10',
  title: 'O CORS demasiado aberto',
  category: 'web',
  difficulty: 3,
  concept: 'Refletir qualquer origem com credenciais deixa qualquer site ler respostas em nome do utilizador.',
  prompt: 'Esta API serve só a app loja.example. Que linha a deixa exposta a qualquer site?',
  explanation: 'Aceitar a origem que vier, com credentials, deixa qualquer site ler as respostas com os cookies da vítima. Usa uma lista fixa: origin: [\'https://loja.example\'].',
  language: 'js',
  segments: [
    'app.use(cors({',
    '  origin: (origem, cb) => cb(null, origem),',
    '  credentials: true,',
    "  methods: ['GET', 'POST'],",
    '}));',
  ],
  answer: [1],
});
