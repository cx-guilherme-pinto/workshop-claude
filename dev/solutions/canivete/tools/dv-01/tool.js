import { text, ToolError } from '../../templates/text.js';

export default text({
  id: 'dv-01',
  title: 'Formatar JSON',
  inputs: [
    { name: 'json', type: 'multiline', label: 'JSON' },
    {
      name: 'indent',
      type: 'choice',
      label: 'Indentação',
      default: '2',
      options: [
        { value: '2', label: '2 espaços' },
        { value: '4', label: '4 espaços' },
        { value: '0', label: 'Compacto (uma linha)' },
      ],
    },
  ],
  run({ json, indent }) {
    let value;
    try {
      value = JSON.parse(json);
    } catch {
      throw new ToolError('O JSON não é válido.');
    }
    return JSON.stringify(value, null, Number(indent));
  },
});
