import { convert, ToolError } from '../../templates/convert.js';

const DAY = { '-2': '2 days earlier', '-1': 'previous day', 0: 'same day', 1: 'next day', 2: '2 days later' };
const pad = (n) => String(n).padStart(2, '0');

// An offset "+HH:MM" / "-HH:MM" in minutes.
function offset(s, label) {
  const m = /^([+-])(\d{2}):(\d{2})$/.exec(s);
  const v = m ? (m[1] === '-' ? -1 : 1) * (+m[2] * 60 + +m[3]) : NaN;
  if (!m || !['00', '15', '30', '45'].includes(m[3]) || v < -720 || v > 840) throw new ToolError(`${label}: type an offset as +HH:MM or -HH:MM, from -12:00 to +14:00.`);
  return v;
}

export default convert({
  id: 'dt-05',
  title: 'Time in another zone (fixed offset)',
  inputs: [
    { name: 'time', type: 'text', label: 'Time' },
    { name: 'zone_a', type: 'text', label: 'Zone A' },
    { name: 'zone_b', type: 'text', label: 'Zone B' },
    { name: 'direction', type: 'choice', label: 'Direction', default: 'a_to_b', options: [{ value: 'a_to_b', label: 'A → B' }, { value: 'b_to_a', label: 'B → A' }] },
  ],
  run({ time, zone_a, zone_b, direction }) {
    const m = /^(\d{1,2}):(\d{2})$/.exec(time);
    if (!m || +m[1] > 23 || +m[2] > 59) throw new ToolError('Time: type a time as HH:MM, from 00:00 to 23:59.');
    const a = offset(zone_a, 'Zone A');
    const b = offset(zone_b, 'Zone B');
    const [from, to] = direction === 'a_to_b' ? [a, b] : [b, a];
    const t = +m[1] * 60 + +m[2] - from + to;
    const days = Math.floor(t / 1440);
    const mins = t - days * 1440;
    return { time: `${pad(Math.floor(mins / 60))}:${pad(mins % 60)}`, day: DAY[days] };
  },
});
