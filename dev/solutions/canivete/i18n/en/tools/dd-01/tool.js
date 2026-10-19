import { convert } from '../../templates/convert.js';

const ML = { cup: 240, tbsp: 15, tsp: 5 };
const GRAMS_PER_CUP = { water: 240, flour: 120, sugar: 200, butter: 225 };

export default convert({
  id: 'dd-01',
  title: 'Kitchen measures (cup, spoon, g)',
  inputs: [
    { name: 'amount', type: 'number', label: 'Amount', min: 0 },
    {
      name: 'unit',
      type: 'choice',
      label: 'Measure',
      default: 'cup',
      options: [
        { value: 'cup', label: 'Cup (240 ml)' },
        { value: 'tbsp', label: 'Tablespoon (15 ml)' },
        { value: 'tsp', label: 'Teaspoon (5 ml)' },
      ],
    },
    {
      name: 'ingredient',
      type: 'choice',
      label: 'Ingredient',
      default: 'flour',
      options: [
        { value: 'water', label: 'Water or milk' },
        { value: 'flour', label: 'Flour' },
        { value: 'sugar', label: 'Sugar' },
        { value: 'butter', label: 'Butter' },
      ],
    },
    {
      name: 'direction',
      type: 'choice',
      label: 'Direction',
      default: 'to_grams',
      options: [
        { value: 'to_grams', label: 'Measure → grams' },
        { value: 'to_measure', label: 'Grams → measure' },
      ],
    },
  ],
  run({ amount, unit, ingredient, direction }) {
    const gramsPerUnit = (ML[unit] * GRAMS_PER_CUP[ingredient]) / 240;
    return direction === 'to_grams' ? Math.round(amount * gramsPerUnit * 10) / 10 : Math.round((amount / gramsPerUnit) * 100) / 100;
  },
});
