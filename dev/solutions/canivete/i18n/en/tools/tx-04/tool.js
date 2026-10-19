import { text } from '../../templates/text.js';

export default text({
  id: 'tx-04',
  title: 'Remove accents',
  inputs: [{ name: 'text', type: 'multiline', label: 'Text' }],
  run({ text: t }) {
    return t.normalize('NFD').replace(/[̀-ͯ]/g, '').normalize('NFC');
  },
});
