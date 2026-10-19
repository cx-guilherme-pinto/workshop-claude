import { test } from 'node:test';
import assert from 'node:assert/strict';
import { round, convertLength, convertMass, celsiusToFahrenheit, fahrenheitToCelsius } from '../src/units.js';

test('2 km são 2000 m', () => assert.equal(convertLength(2, 'km', 'm'), 2000));
test('1 polegada são 2,54 cm', () => assert.equal(round(convertLength(1, 'in', 'cm')), 2.54));
test('1 libra são 0,454 kg', () => assert.equal(round(convertMass(1, 'lb', 'kg'), 3), 0.454));
test('500 g são 0,5 kg', () => assert.equal(convertMass(500, 'g', 'kg'), 0.5));
test('uma unidade desconhecida dá erro', () => assert.throws(() => convertLength(1, 'mi', 'm')));
test('0 °C são 32 °F', () => assert.equal(celsiusToFahrenheit(0), 32));
test('212 °F são 100 °C', () => assert.equal(fahrenheitToCelsius(212), 100));
test('1,005 arredondado a 2 casas é 1,01', () => assert.equal(round(1.005, 2), 1.01));
