import { calc } from '../../templates/calc.js';

export default calc({
  id: 'dn-02',
  title: 'VAT: with and without',
  inputs: [
    { name: 'amount', type: 'number', label: 'Amount', min: 0 },
    {
      name: 'rate',
      type: 'choice',
      label: 'VAT rate',
      default: '23',
      options: [
        { value: '23', label: '23 % (standard, Portugal)' },
        { value: '13', label: '13 % (intermediate, Portugal)' },
        { value: '6', label: '6 % (reduced, Portugal)' },
      ],
    },
    {
      name: 'mode',
      type: 'choice',
      label: 'The amount is',
      default: 'net',
      options: [
        { value: 'net', label: 'before VAT' },
        { value: 'gross', label: 'with VAT included' },
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
