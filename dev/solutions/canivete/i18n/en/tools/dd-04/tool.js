import { convert, ToolError } from '../../templates/convert.js';

export default convert({
  id: 'dd-04',
  title: 'Celsius ↔ Fahrenheit',
  inputs: [
    { name: 'value', type: 'number', label: 'Temperature' },
    {
      name: 'direction',
      type: 'choice',
      label: 'Direction',
      default: 'c_to_f',
      options: [
        { value: 'c_to_f', label: '°C → °F' },
        { value: 'f_to_c', label: '°F → °C' },
      ],
    },
  ],
  run({ value, direction }) {
    if (direction === 'c_to_f' ? value < -273.15 : value < -459.67) throw new ToolError('Below absolute zero (-273.15 °C or -459.67 °F).');
    const r = direction === 'c_to_f' ? (value * 9) / 5 + 32 : ((value - 32) * 5) / 9;
    return Math.round(r * 10) / 10;
  },
});
