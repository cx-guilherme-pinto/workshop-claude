import { spotTheFlaw } from '../../templates/spot-the-flaw.js';

export default spotTheFlaw({
  id: 'cs-09',
  title: 'Encontra a injeção de comandos',
  category: 'secure-code',
  difficulty: 2,
  concept: 'Juntar texto do utilizador a um comando da shell deixa correr outros comandos.',
  prompt: 'Este endpoint faz ping a um servidor. Que linha permite injetar comandos?',
  language: 'js',
  segments: [
    'const host = req.query.host;',
    "exec('ping -c 1 ' + host, (err, saida) => {",
    '  res.send(saida);',
    '});',
  ],
  answer: [1],
  explanation: "Com host=exemplo.pt; ls, a shell corre um segundo comando. Usa execFile('ping', ['-c', '1', host]), que não passa pela shell, e valida o host.",
});
