import { answer } from '../../templates/answer.js';

export default answer({
  id: 'es-03',
  title: 'The bank on the phone',
  category: 'social-engineering',
  difficulty: 1,
  concept: 'Vishing: a voice-call scam where the scammer pretends to be from the bank or tech support.',
  prompt: "Someone from 'Lumen Bank support' calls and asks for the code you just received by SMS. How often does a real bank ask you for that code over the phone?",
  placeholder: 'One word',
  accept: ['never', '0', 'zero', 'none', 'not once', 'never ever'],
  explanation: 'The code is for you to approve an operation; whoever asks for it wants to approve it for you. Hang up and call the number on the back of your card.',
});
