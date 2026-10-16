import { resposta } from '../../templates/resposta.js';

export default resposta({
  id: 'mb-09',
  title: 'Gerir os telemóveis da empresa',
  category: 'mobile',
  difficulty: 3,
  concept: 'A gestão de dispositivos móveis aplica regras de segurança e permite apagar dados à distância.',
  prompt: 'Que sigla designa o sistema que a empresa usa para exigir bloqueio de ecrã e apagar à distância os telemóveis de trabalho?',
  placeholder: 'Sigla',
  accept: ['MDM', 'mobile device management', 'gestão de dispositivos móveis'],
  explanation: 'Com MDM, a empresa exige bloqueio e cifra e pode apagar só os dados de trabalho se o telemóvel se perder. Num telemóvel pessoal, usa um perfil de trabalho separado.',
});
