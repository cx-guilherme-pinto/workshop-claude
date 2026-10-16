import { clicaErro } from '../../templates/clica-erro.js';

export default clicaErro({
  id: 'rd-06',
  title: 'Portas a mais na firewall',
  category: 'redes',
  difficulty: 2,
  concept: 'Um servidor web só deve expor à internet as portas de que precisa.',
  prompt: 'Estas são as regras da firewall de um servidor web público. Que regras expõem demasiado?',
  language: 'texto',
  segments: [
    'allow tcp 443 from any',
    'allow tcp 80 from any (redireciona para 443)',
    'allow tcp 22 from any',
    'allow tcp 3306 from any',
    'deny all',
  ],
  answer: [2, 3],
  explanation: 'A base de dados (3306) nunca deve estar aberta à internet e o SSH (22) deve aceitar só a VPN ou os IPs da equipa. Deixa abertas só as portas 80 e 443.',
});
