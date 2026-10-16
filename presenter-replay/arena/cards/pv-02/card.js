import { resposta } from '../../templates/resposta.js';

export default resposta({
  id: 'pv-02',
  title: 'A foto diz onde estás',
  category: 'privacidade',
  difficulty: 2,
  concept: 'Os metadados EXIF de uma foto podem guardar as coordenadas GPS de onde foi tirada.',
  prompt: 'Como se chamam os metadados de uma foto que podem guardar a data, o modelo do telemóvel e as coordenadas GPS?',
  explanation: 'Uma foto partilhada como ficheiro pode revelar a tua morada. Desliga a localização na câmara ou remove os metadados antes de enviar.',
  placeholder: 'Sigla',
  accept: ['EXIF', 'metadados EXIF', 'dados EXIF'],
});
