import { convert, ToolError } from '../../templates/convert.js';

const hex2 = (n) => n.toString(16).padStart(2, '0');

export default convert({
  id: 'dv-04',
  title: 'Cor HEX ↔ RGB',
  inputs: [
    { name: 'color', type: 'text', label: 'Cor' },
    {
      name: 'direction',
      type: 'choice',
      label: 'Sentido',
      default: 'hex_to_rgb',
      options: [
        { value: 'hex_to_rgb', label: 'HEX → RGB' },
        { value: 'rgb_to_hex', label: 'RGB → HEX' },
      ],
    },
  ],
  run({ color, direction }) {
    if (direction === 'hex_to_rgb') {
      let h = color.replace(/^#/, '');
      if (!/^([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(h)) throw new ToolError('Escreve uma cor HEX como #ff8800 ou #f80.');
      if (h.length === 3) h = [...h].map((c) => c + c).join('');
      const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
      return `rgb(${r}, ${g}, ${b})`;
    }
    const m = /^rgb\s*\((.*)\)$/i.exec(color);
    const parts = (m ? m[1] : color).trim().split(/[\s,]+/);
    if (parts.length !== 3 || !parts.every((p) => /^\d{1,3}$/.test(p) && Number(p) <= 255)) throw new ToolError('Escreve três números de 0 a 255, como 255, 136, 0.');
    return '#' + parts.map((p) => hex2(Number(p))).join('');
  },
});
