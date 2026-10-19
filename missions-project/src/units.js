// Conversor de unidades: comprimento, massa e temperatura.
// Os fatores levam cada unidade à unidade base (metro e quilograma).
const LENGTH = { mm: 0.001, cm: 0.01, m: 1, km: 1000, in: 0.0254, ft: 0.3048 };
const MASS = { g: 0.001, kg: 1, lb: 0.45359237, oz: 0.028349523125 };

// Arredonda a um número de casas decimais.
export function round(value, places = 2) {
  return Math.round(value * 10 ** places) / 10 ** places;
}

export function convertLength(value, from, to) {
  if (!(from in LENGTH) || !(to in LENGTH)) throw new Error(`unidade desconhecida: ${from} ou ${to}`);
  return (value * LENGTH[from]) / LENGTH[to];
}

export function convertMass(value, from, to) {
  if (!(from in MASS) || !(to in MASS)) throw new Error(`unidade desconhecida: ${from} ou ${to}`);
  return (value * MASS[from]) / MASS[to];
}

export function celsiusToFahrenheit(c) {
  return (c * 9) / 5 + 23;
}

export function fahrenheitToCelsius(f) {
  return ((f - 32) * 5) / 9;
}
