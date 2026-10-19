import { generate } from '../../templates/generate.js';

const HEX = '0123456789abcdef';

export default generate({
  id: 'dv-03',
  title: 'Gerar UUID v4',
  inputs: [{ name: 'count', type: 'integer', label: 'Quantos', default: '1', min: 1, max: 20 }],
  run({ count }, { randomInt }) {
    const one = () => {
      const d = Array.from({ length: 32 }, () => HEX[randomInt(16)]);
      d[12] = '4';
      d[16] = HEX[8 + randomInt(4)];
      const s = d.join('');
      return `${s.slice(0, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}-${s.slice(16, 20)}-${s.slice(20)}`;
    };
    return Array.from({ length: count }, one);
  },
});
