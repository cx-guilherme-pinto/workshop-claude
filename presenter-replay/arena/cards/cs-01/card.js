import { clicaErro } from '../../templates/clica-erro.js';

export default clicaErro({
  id: 'cs-01',
  title: 'Encontra o path traversal',
  category: 'codigo-seguro',
  difficulty: 2,
  concept: 'Juntar ao caminho o nome de um ficheiro vindo do utilizador deixa sair da pasta prevista.',
  prompt: 'Este endpoint serve ficheiros da pasta de uploads. Que linha deixa ler ficheiros de fora dessa pasta?',
  explanation: 'Com ficheiro=../../etc/passwd, o caminho sai da pasta de uploads. Usa path.basename(nome) ou confirma que o caminho resolvido começa por /srv/uploads/.',
  language: 'js',
  segments: [
    "app.get('/download', (req, res) => {",
    '  const nome = req.query.ficheiro;',
    "  const caminho = path.join('/srv/uploads', nome);",
    '  res.sendFile(caminho);',
    '});',
  ],
  answer: [2],
});
