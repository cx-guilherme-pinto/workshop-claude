import { spotTheFlaw } from '../../templates/spot-the-flaw.js';

export default spotTheFlaw({
  id: 'rd-09',
  title: 'The badly configured router',
  category: 'networks',
  difficulty: 2,
  concept: 'A home router has several doors: the Wi-Fi itself, the admin page and the devices connected to it.',
  prompt: 'These are the settings of the Smiths\' router. Which lines let a neighbor who does not know the Wi-Fi password get onto the network?',
  language: 'text',
  segments: [
    'Network name: SmithHome',
    'Wi-Fi security: WEP',
    'Admin page password: admin (the factory one)',
    'WPS: on, with an 8-digit PIN',
    'UPnP: on',
    'Remote administration: off',
  ],
  answer: [1, 3],
  explanation: 'A neighbor within range can attack the Wi-Fi itself for days without anyone noticing. Use WPA3 (or WPA2) with a long password, turn WPS off, change the factory admin password and turn UPnP off if you do not need it.',
});
