import { convert } from '../../templates/convert.js';

const ML = { cup: 240, tbsp: 15, tsp: 5 };
const GRAMS_PER_CUP = { water: 240, flour: 120, sugar: 200, butter: 225 };

export default convert({
  id: 'dd-01',
  title: 'Medidas de cozinha (chávena, colher, g)',
  inputs: [
    { name: 'amount', type: 'number', label: 'Quantidade', min: 0 },
    {
      name: 'unit',
      type: 'choice',
      label: 'Medida',
      default: 'cup',
      options: [
        { value: 'cup', label: 'Chávena (240 ml)' },
        { value: 'tbsp', label: 'Colher de sopa (15 ml)' },
        { value: 'tsp', label: 'Colher de chá (5 ml)' },
      ],
    },
    {
      name: 'ingredient',
      type: 'choice',
      label: 'Ingrediente',
      default: 'flour',
      options: [
        { value: 'water', label: 'Água ou leite' },
        { value: 'flour', label: 'Farinha' },
        { value: 'sugar', label: 'Açúcar' },
        { value: 'butter', label: 'Manteiga' },
      ],
    },
    {
      name: 'direction',
      type: 'choice',
      label: 'Sentido',
      default: 'to_grams',
      options: [
        { value: 'to_grams', label: 'Medida → gramas' },
        { value: 'to_measure', label: 'Gramas → medida' },
      ],
    },
  ],
  run({ amount, unit, ingredient, direction }) {
    const gramsPerUnit = (ML[unit] * GRAMS_PER_CUP[ingredient]) / 240;
    return direction === 'to_grams' ? Math.round(amount * gramsPerUnit * 10) / 10 : Math.round((amount / gramsPerUnit) * 100) / 100;
  },
});
