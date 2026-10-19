import { convert, ToolError } from '../../templates/convert.js';

const DAY = { '-2': '2 dias antes', '-1': 'dia anterior', 0: 'mesmo dia', 1: 'dia seguinte', 2: '2 dias depois' };
const pad = (n) => String(n).padStart(2, '0');

// An offset "+HH:MM" / "-HH:MM" in minutes.
function offset(s, label) {
  const m = /^([+-])(\d{2}):(\d{2})$/.exec(s);
  const v = m ? (m[1] === '-' ? -1 : 1) * (+m[2] * 60 + +m[3]) : NaN;
  if (!m || !['00', '15', '30', '45'].includes(m[3]) || v < -720 || v > 840) throw new ToolError(`${label}: escreve um fuso no formato +HH:MM ou -HH:MM, de -12:00 a +14:00.`);
  return v;
}

export default convert({
  id: 'dt-05',
  title: 'Hora noutro fuso (offset fixo)',
  inputs: [
    { name: 'time', type: 'text', label: 'Hora' },
    { name: 'zone_a', type: 'text', label: 'Fuso A' },
    { name: 'zone_b', type: 'text', label: 'Fuso B' },
    { name: 'direction', type: 'choice', label: 'Sentido', default: 'a_to_b', options: [{ value: 'a_to_b', label: 'A → B' }, { value: 'b_to_a', label: 'B → A' }] },
  ],
  run({ time, zone_a, zone_b, direction }) {
    const m = /^(\d{1,2}):(\d{2})$/.exec(time);
    if (!m || +m[1] > 23 || +m[2] > 59) throw new ToolError('Hora: escreve uma hora no formato HH:MM, de 00:00 a 23:59.');
    const a = offset(zone_a, 'Fuso A');
    const b = offset(zone_b, 'Fuso B');
    const [from, to] = direction === 'a_to_b' ? [a, b] : [b, a];
    const t = +m[1] * 60 + +m[2] - from + to;
    const days = Math.floor(t / 1440);
    const mins = t - days * 1440;
    return { time: `${pad(Math.floor(mins / 60))}:${pad(mins % 60)}`, day: DAY[days] };
  },
});
