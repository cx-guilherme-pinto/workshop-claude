import { calc } from '../../templates/calc.js';

export default calc({
  id: 'dn-02',
  title: 'IVA: com e sem (23 %, 13 %, 6 %)',
  inputs: [
    { name: 'amount', type: 'number', label: 'Valor (€)', min: 0 },
    {
      name: 'rate',
      type: 'choice',
      label: 'Taxa de IVA',
      default: '23',
      options: [
        { value: '23', label: '23 % (normal)' },
        { value: '13', label: '13 % (intermédia)' },
        { value: '6', label: '6 % (reduzida)' },
      ],
    },
    {
      name: 'mode',
      type: 'choice',
      label: 'O valor é',
      default: 'net',
      options: [
        { value: 'net', label: 'sem IVA' },
        { value: 'gross', label: 'com IVA' },
      ],
    },
  ],
  run({ amount, rate, mode }) {
    const r = Number(rate);
    const c = Math.round(amount * 100);
    if (mode === 'net') {
      const vat = Math.round((c * r) / 100);
      return { net: c / 100, vat: vat / 100, gross: (c + vat) / 100 };
    }
    const net = Math.round(c / (1 + r / 100));
    return { net: net / 100, vat: (c - net) / 100, gross: c / 100 };
  },
});
