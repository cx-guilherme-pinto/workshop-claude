import { spotTheFlaw } from '../../templates/spot-the-flaw.js';

export default spotTheFlaw({
  id: 'sc-09',
  title: 'O segredo na imagem',
  category: 'cloud-secrets',
  difficulty: 2,
  concept: 'Um segredo escrito no Dockerfile fica gravado na imagem, ao alcance de quem a descarregar.',
  prompt: 'Esta imagem vai para um registo partilhado. Que linha deixa lá um segredo?',
  language: 'text',
  segments: [
    'FROM node:22-alpine',
    'WORKDIR /app',
    'COPY package*.json ./',
    'RUN npm ci --omit=dev',
    'COPY src ./src',
    'ENV DB_PASSWORD=atlas-2026-prod',
    'CMD ["node", "src/server.js"]',
  ],
  answer: [5],
  explanation: 'Qualquer pessoa com a imagem vê o valor com docker history ou docker inspect. Passa o segredo só quando o contentor arranca, a partir de um cofre de segredos.',
});
