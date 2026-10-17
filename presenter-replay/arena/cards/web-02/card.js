import { spotTheFlaw } from '../../templates/spot-the-flaw.js';

export default spotTheFlaw({
  id: 'web-02',
  title: 'Encontra o XSS',
  category: 'web',
  difficulty: 1,
  concept: 'Pôr texto do utilizador em innerHTML deixa o browser executar código escondido nesse texto.',
  prompt: 'Este código mostra comentários numa página. Que linha permite XSS?',
  language: 'js',
  segments: [
    "const comentario = params.get('texto');",
    "const p = document.createElement('p');",
    "p.innerHTML = 'Comentário: ' + comentario;",
    'lista.appendChild(p);',
    'contador.textContent = String(total);',
  ],
  answer: [2],
  explanation: 'Um comentário como <img src=x onerror=alert(1)> corre código no browser de quem o lê. Usa textContent, que mostra o texto sem o interpretar como HTML.',
});
