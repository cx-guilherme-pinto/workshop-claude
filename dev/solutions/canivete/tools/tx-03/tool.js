import { text, ToolError } from '../../templates/text.js';

export default text({
  id: 'tx-03',
  title: 'Slug para URL',
  inputs: [{ name: 'text', type: 'text', label: 'Texto' }],
  run({ text: t }) {
    const slug = t
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    if (!slug) throw new ToolError('O texto não tem letras nem números para o slug.');
    return slug;
  },
});
