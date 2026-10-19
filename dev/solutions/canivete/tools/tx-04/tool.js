import { text } from '../../templates/text.js';

export default text({
  id: 'tx-04',
  title: 'Remover acentos',
  inputs: [{ name: 'text', type: 'multiline', label: 'Texto' }],
  run({ text: t }) {
    return t.normalize('NFD').replace(/[̀-ͯ]/g, '').normalize('NFC');
  },
});
