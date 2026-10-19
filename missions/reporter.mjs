// A test reporter for node --test (docs/pt/WORKSHOP-V2-SPEC.md, section 4.1): at the end of each run it records
// tests_run with the number of green and red tests in the local mission book (it validates M6 without hooks).
// It prints nothing; npm test in the missions project uses it next to the normal "spec" reporter.
// tests_run is local_only: it never leaves the machine, with participation on or off.
import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { record } from '../telemetry/lib.mjs';

const MISSIONS = join(dirname(fileURLToPath(import.meta.url)), 'missions.mjs');

export default async function* reporter(source) {
  let green = 0;
  let red = 0;
  let summary = null;
  for await (const e of source) {
    const d = e?.data || {};
    if (e.type === 'test:summary' && d.file === undefined && d.counts) summary = d.counts;
    else if (e.type === 'test:summary' && d.file === false && d.counts) summary = d.counts;
    else if ((e.type === 'test:pass' || e.type === 'test:fail') && d.details?.type !== 'suite') {
      if (e.type === 'test:pass' && !d.skip && !d.todo) green++;
      if (e.type === 'test:fail') red++;
    }
  }
  if (summary) {
    green = summary.passed ?? green;
    red = (summary.failed ?? red) + (summary.cancelled ?? 0);
  }
  try {
    if (green + red > 0 && record('tests_run', { green, red }).recorded && process.env.WORKSHOP_TELEMETRY_NO_CHECK !== '1') {
      spawn(process.execPath, [MISSIONS, 'check', '--quiet'], { detached: true, stdio: 'ignore', windowsHide: true }).unref();
    }
  } catch {
    /* the mission book must never break npm test */
  }
}
