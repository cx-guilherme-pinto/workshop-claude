import { text, ToolError } from '../../templates/text.js';

export default text({
  id: 'tx-03',
  title: 'URL slug',
  inputs: [{ name: 'text', type: 'text', label: 'Text' }],
  run({ text: t }) {
    const slug = t
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    if (!slug) throw new ToolError('The text has no letters or digits for the slug.');
    return slug;
  },
});
