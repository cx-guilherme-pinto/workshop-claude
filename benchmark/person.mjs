#!/usr/bin/env node
// The benchmark's "person" for the cards broken on purpose (D-28): a card whose spec.md is missing a detail fails
// with `motivo: spec`; a participant reads the failing test, works out the missing line and adds it to
// cards/<id>/spec.md before /demo-swarm --retry <id>. The benchmark cannot read the test (it only keeps a hash of
// the answer) and must not guess, so it takes the line from the same source a participant reasons from: the
// complete spec that `node tools/gen.mjs --no-gaps` writes in a temporary copy of the Arena. Only the lines the
// real spec.md is missing are inserted, at their place, so gen keeps the completed spec (and --check passes).
//
//   node benchmark/person.mjs failed   --arena <dir>              ids that failed with motivo spec (one per line)
//   node benchmark/person.mjs expected --arena <dir>              ids with spec_gaps in specs/cards.json (dry-run)
//   node benchmark/person.mjs fix      --arena <dir> --id <id>    writes the missing line(s); prints them
//
// Exit codes: 0 ok · 1 nothing to fix or gen failed · 2 usage error.
import { cpSync, existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { isMain } from '../orchestrator/lib/is-main.mjs';

// Lines of the complete spec that the real one lacks, merged in order (longest common subsequence): the real
// spec's own lines stay where they are (a participant's note is kept), the missing ones are inserted.
export function mergeMissing(real, complete) {
  const R = real.replace(/\r\n/g, '\n').split('\n');
  const C = complete.replace(/\r\n/g, '\n').split('\n');
  const n = R.length;
  const m = C.length;
  const L = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i][j] = R[i] === C[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const out = [];
  const added = [];
  let i = 0;
  let j = 0;
  while (i < n || j < m) {
    if (i < n && j < m && R[i] === C[j]) {
      out.push(R[i++]);
      j++;
    } else if (j < m && (i === n || L[i][j + 1] >= L[i + 1][j])) {
      out.push(C[j]);
      added.push(C[j++]);
    } else {
      out.push(R[i++]);
    }
  }
  return { text: out.join('\n'), added: added.filter((l) => l.trim() !== '') };
}

// The state of a task (.workshop/status/<id>.json), with the Portuguese keys or English ones.
function statusOf(arena) {
  const dir = join(arena, '.workshop', 'status');
  if (!existsSync(dir)) return [];
  const out = [];
  for (const f of readdirSync(dir).filter((x) => x.endsWith('.json'))) {
    try {
      const j = JSON.parse(readFileSync(join(dir, f), 'utf8'));
      out.push({ id: j.tarefa ?? j.task ?? f.replace(/\.json$/, ''), state: j.estado ?? j.state, reason: j.motivo ?? j.reason });
    } catch {
      /* a file cut off mid-write: ignored */
    }
  }
  return out;
}

export function failedForSpec(arena) {
  return statusOf(arena)
    .filter((s) => ['falhou', 'failed'].includes(s.state) && s.reason === 'spec')
    .map((s) => s.id)
    .sort();
}

export function expectedBroken(arena) {
  const specs = JSON.parse(readFileSync(join(arena, 'specs', 'cards.json'), 'utf8'));
  return specs.cards.filter((c) => (c.spec_gaps || []).length).map((c) => c.id).sort();
}

// The complete spec.md of one card: gen --no-gaps in a temporary copy (only tools/ and specs/: gen writes the rest).
export function completeSpec(arena, id) {
  const tmp = mkdtempSync(join(resolve(arena, '..'), '.person-'));
  try {
    for (const d of ['tools', 'specs']) cpSync(join(arena, d), join(tmp, d), { recursive: true });
    const r = spawnSync(process.execPath, [join(tmp, 'tools', 'gen.mjs'), '--no-gaps'], { cwd: tmp, encoding: 'utf8' });
    const f = join(tmp, 'cards', id, 'spec.md');
    if (r.status !== 0 || !existsSync(f)) throw new Error(`gen --no-gaps failed for ${id}: ${(r.stderr || r.stdout || '').trim().slice(0, 300)}`);
    return readFileSync(f, 'utf8');
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

export function fix(arena, id) {
  const f = join(arena, 'cards', id, 'spec.md');
  if (!existsSync(f)) throw new Error(`no ${f}`);
  const { text, added } = mergeMissing(readFileSync(f, 'utf8'), completeSpec(arena, id));
  if (added.length) writeFileSync(f, text, 'utf8');
  return added;
}

if (isMain(import.meta.url)) {
  const [cmd, ...a] = process.argv.slice(2);
  const opt = (k) => (a.includes(k) ? a[a.indexOf(k) + 1] : undefined);
  const arena = opt('--arena') && resolve(opt('--arena'));
  if (!arena || !['failed', 'expected', 'fix'].includes(cmd) || (cmd === 'fix' && !opt('--id'))) {
    console.error('usage: person.mjs failed|expected --arena <dir> | fix --arena <dir> --id <id>');
    process.exit(2);
  }
  try {
    if (cmd === 'failed') console.log(failedForSpec(arena).join('\n'));
    else if (cmd === 'expected') console.log(expectedBroken(arena).join('\n'));
    else {
      const added = fix(arena, opt('--id'));
      if (!added.length) {
        console.error(`${opt('--id')}: spec.md is not missing any line of the complete spec`);
        process.exit(1);
      }
      for (const l of added) console.log(l);
    }
  } catch (e) {
    console.error(String(e.message || e));
    process.exit(1);
  }
}
