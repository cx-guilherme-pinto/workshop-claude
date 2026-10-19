import { text, ToolError } from '../../templates/text.js';

export default text({
  id: 'dv-01',
  title: 'Format JSON',
  inputs: [
    { name: 'json', type: 'multiline', label: 'JSON' },
    {
      name: 'indent',
      type: 'choice',
      label: 'Indentation',
      default: '2',
      options: [
        { value: '2', label: '2 spaces' },
        { value: '4', label: '4 spaces' },
        { value: '0', label: 'Compact (one line)' },
      ],
    },
  ],
  run({ json, indent }) {
    let value;
    try {
      value = JSON.parse(json);
    } catch {
      throw new ToolError('The JSON is not valid.');
    }
    return JSON.stringify(value, null, Number(indent));
  },
});
