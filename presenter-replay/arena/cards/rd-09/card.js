import { clicaErro } from '../../templates/clica-erro.js';

export default clicaErro({
  id: 'rd-09',
  title: 'O router mal configurado',
  category: 'redes',
  difficulty: 2,
  concept: 'WEP e WPS são pontos fracos conhecidos no Wi-Fi de casa.',
  prompt: 'Estas são as definições do router. Que linhas enfraquecem a rede?',
  explanation: 'O WEP parte-se em minutos e o PIN do WPS adivinha-se por força bruta. Usa WPA3 (ou WPA2) e desliga o WPS.',
  language: 'texto',
  segments: [
    'Nome da rede: CasaSilva',
    'Segurança: WEP',
    'Password: 20 caracteres ao acaso',
    'WPS: ligado',
    'Firmware: atualizado',
  ],
  answer: [1, 3],
});
