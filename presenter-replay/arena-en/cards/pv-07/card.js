import { choice } from '../../templates/choice.js';

export default choice({
  id: 'pv-07',
  title: 'No cookies and they still recognize you',
  category: 'privacy',
  difficulty: 2,
  concept: 'A site can recognize you without cookies, through details that do not change when you delete them.',
  prompt: 'At home, you deleted all your cookies and opened the site in another browser, on the same laptop. The site still recognizes you. What is the most likely explanation?',
  options: [
    { id: 'a', text: 'Browser fingerprinting: version, extensions, settings and other browser details' },
    { id: 'b', text: 'The public IP address of your home connection' },
    { id: 'c', text: 'The site read your browser history' },
    { id: 'd', text: 'It was a coincidence' },
  ],
  answer: 'b',
  explanation: 'Deleting cookies only clears what the browser stored. What the site sees from the outside depends on the browser you use and the network you connect from. For visits you do not want linked to each other, use a VPN or Tor.',
});
