#!/usr/bin/env node
// Realistic panel events for the whole 90-minute agenda (docs/pt/WORKSHOP-V2-SPEC.md, sections 3 and 6.5), for the
// tests, the rehearsal and the replays. Deterministic: the same --seed gives the same events.
//
//   node panel/simulate.mjs --people 100 --rooms 2 --out panel/replays/rehearsal.jsonl
//   node panel/simulate.mjs --people 250 --rooms 2 --speed 10 --url http://127.0.0.1:8787 [--ws <code>]
//
// --out writes every event (timestamps from --start, default now) as JSON lines: a replay file for the page
// (?replay=<name>). --url sends them in real time divided by --speed, each person in batches like send.mjs.
// With PANEL_ADMIN_TOKEN in the environment it also moves the panel phase at each block of the agenda.
import { writeFileSync } from 'node:fs';
import { isMain } from '../orchestrator/lib/is-main.mjs';

import { AGENDA } from './aggregate.mjs';

export { AGENDA };
const GUIDED = ['M1', 'M2', 'M3', 'M4', 'M5', 'M6'];
const FEATURE = { M1: 'plan_mode', M2: 'model_switch', M3: 'subagent', M4: 'skill_user', M5: 'hook_user', M6: 'loop', M8: 'statusline_user', M9: 'headless', M10: 'memory_write' };
const NICKS = ['Ana', 'Rui', 'Marta', 'Joao', 'Ines', 'Pedro', 'Sara', 'Tiago', 'Rita', 'Nuno', 'Lara', 'Hugo'];

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// The events of one person, as [minute, event-without-envelope].
function personEvents(r, i) {
  const out = [];
  const at = (min, ev, f = {}) => out.push([min, { ev, ...f }]);
  const between = (a, b) => a + r() * (b - a);
  const chance = (p) => r() < p;
  const joinAt = between(0, 6);
  at(joinAt, 'join', { lang: chance(0.8) ? 'pt' : 'en', os: chance(0.75) ? 'mac' : 'win', ...(chance(0.25) ? { nickname: `${NICKS[i % NICKS.length]}${i}` } : {}) });
  if (chance(0.92)) at(joinAt + between(1, 4), 'check_ok');
  // Missions: 2 min each, a little late for some; the slower ones finish in the waits of Project 1.
  const skill = 0.55 + r() * 0.45;
  GUIDED.forEach((m, k) => {
    if (!chance(skill)) return;
    const t = 9 + k * 2 + between(0.4, 2.2) + (chance(0.2) ? between(4, 40) : 0);
    at(t, 'feature', { name: FEATURE[m] });
    at(t + 0.05, 'mission_done', { mission: m });
  });
  for (const m of ['M8', 'M9', 'M10']) {
    if (!chance(0.25 + skill * 0.35)) continue;
    const t = between(33, 85);
    at(t, 'feature', { name: FEATURE[m] });
    at(t + 0.05, 'mission_done', { mission: m });
  }
  at(23, 'cost', { cost_usd: +(0.3 + r() * 0.35).toFixed(4), model: 'sonnet', block: 'missions' });
  at(21, 'cost', { cost_usd: +(0.01 + r() * 0.04).toFixed(4), model: 'haiku', block: 'missions' });
  // Project 1: the room splits by rows (4, 8, 12 agents), Haiku by default.
  const parallel = [4, 8, 12][i % 3];
  const model = chance(0.8) ? 'haiku' : 'sonnet';
  if (chance(0.82)) at(between(25.5, 29), 'p1_tool_created', { tool_template: ['calc', 'convert', 'text', 'generate'][Math.floor(r() * 4)] });
  if (chance(0.95)) {
    const planAt = between(31, 32.5);
    const forecast = chance(0.85) ? Math.round(between(2, 12)) : null;
    at(planAt, 'p1_plan', { parallel, model, forecast_min: forecast, tasks: 34 });
    const minutes = { 4: 6.5, 8: 4.2, 12: 3.3 }[parallel] * between(0.85, 1.25) * (model === 'sonnet' ? 1.15 : 1);
    const red = Math.min(3, Math.floor(r() * 4));
    const green = 34 - red;
    const costP1 = (model === 'sonnet' ? 1.55 : 1.05) * (1 + (parallel - 8) * 0.03) * between(0.9, 1.15);
    at(planAt + minutes * 0.5, 'cost', { cost_usd: +(costP1 * 0.45).toFixed(4), model, block: 'p1' });
    at(planAt + minutes, 'cost', { cost_usd: +(costP1 * 0.35).toFixed(4), model: 'sonnet', block: 'p1' });
    at(planAt + minutes, 'p1_swarm_done', { duration_s: Math.round(minutes * 60), green, red, green_first: Math.max(0, green - Math.floor(r() * 3)) });
    if (red && chance(0.75)) at(planAt + minutes + between(3, 9), 'p1_retry_green', { tool: ['nm-03', 'dn-01', 'tx-02'][Math.floor(r() * 3)] });
    at(between(43, 46), 'cost', { cost_usd: +(costP1 * 0.2).toFixed(4), model: 'opus', block: 'p1' });
    if (chance(0.9)) at(between(43.5, 46.5), 'p1_gate', { verdict: chance(0.88) ? 'APPROVED' : 'REJECTED' });
  }
  // Project 2: the funnel, a few drop at each step.
  let t = between(49, 53);
  at(t, 'p2_intake', { origin: chance(0.9) ? 'practice' : 'own', issue: chance(0.9) ? 'EX-1' : 'own' });
  if (chance(0.95)) {
    t = between(54, 59);
    at(t, 'p2_plan', { n_agents: 2 + Math.floor(r() * 5) });
    if (chance(0.92)) {
      t = between(62, 72);
      const red = chance(0.3) ? 1 : 0;
      at(t, 'p2_swarm_done', { duration_s: Math.round(between(110, 300)), green: 4 - red, red, green_first: 3 - red });
      at(t, 'cost', { cost_usd: +(0.55 + r() * 0.4).toFixed(4), model: 'sonnet', block: 'p2' });
      at(t, 'cost', { cost_usd: +(0.03 + r() * 0.05).toFixed(4), model: 'haiku', block: 'p2' });
      if (chance(0.9)) {
        t = between(72, 77);
        at(t, 'p2_gate', { verdict: chance(0.85) ? 'APPROVED' : 'REJECTED' });
        at(t, 'cost', { cost_usd: +(0.15 + r() * 0.1).toFixed(4), model: 'opus', block: 'p2' });
        if (chance(0.85)) at(between(77, 81), 'p2_report', { destination: chance(0.9) ? 'file' : 'jira' });
      }
    }
  }
  return out;
}

// All the events of the workshop, sorted by time, already in the envelope.
export function simulate({ people = 100, rooms = 2, seed = 7, start = Date.now(), ws = 'dev', kit = 'v2-sim' } = {}) {
  const r = rng(seed);
  const all = [];
  for (let i = 0; i < people; i++) {
    const p = Array.from({ length: 32 }, () => '0123456789abcdef'[Math.floor(r() * 16)]).join('');
    const room = rooms > 1 && i % 2 ? 'B' : 'A';
    for (const [min, e] of personEvents(r, i)) all.push({ v: 1, ws, room, p, ev: e.ev, t: new Date(start + Math.round(min * 60000)).toISOString(), kit, ...Object.fromEntries(Object.entries(e).filter(([k]) => k !== 'ev')) });
  }
  return all.sort((a, b) => (a.t < b.t ? -1 : a.t > b.t ? 1 : 0));
}

// Sends the events in real time divided by speed, grouped per person every ~2 s of simulated time.
export async function send({ events, url, ws, speed = 10, adminToken = '', log = () => {} }) {
  const t0 = Date.parse(events[0]?.t || new Date().toISOString());
  const wall = Date.now();
  const phases = AGENDA.map(([phase, min]) => ({ phase, t: t0 + min * 60000 }));
  let i = 0;
  let sent = 0;
  let errors = 0;
  while (i < events.length) {
    const due = t0 + (Date.now() - wall) * speed;
    const batch = new Map();
    while (i < events.length && Date.parse(events[i].t) <= due) {
      const e = events[i++];
      if (!batch.has(e.p)) batch.set(e.p, []);
      batch.get(e.p).push(e);
    }
    while (adminToken && phases.length && phases[0].t <= due) {
      const { phase } = phases.shift();
      await fetch(`${url}/admin/phase`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Admin-Token': adminToken }, body: JSON.stringify({ phase }) }).catch(() => errors++);
      log(`phase ${phase}`);
    }
    await Promise.all(
      [...batch.values()].map(async (list) => {
        for (let k = 0; k < list.length; k += 50) {
          const r = await fetch(`${url}/e`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Workshop-Code': ws }, body: JSON.stringify(list.slice(k, k + 50)) }).catch(() => null);
          if (r && r.status === 204) sent += Math.min(50, list.length - k);
          else errors++;
        }
      }),
    );
    if (i < events.length) await new Promise((ok) => setTimeout(ok, 200));
  }
  return { sent, errors };
}

if (isMain(import.meta.url)) {
  const a = process.argv.slice(2);
  const opt = (k, d) => (a.includes(k) ? a[a.indexOf(k) + 1] : d);
  const ws = opt('--ws', process.env.WORKSHOP_CODE || 'dev');
  const events = simulate({ people: Number(opt('--people', 100)), rooms: Number(opt('--rooms', 2)), seed: Number(opt('--seed', 7)), ws, start: opt('--start') ? Date.parse(opt('--start')) : Date.now() });
  if (opt('--out')) {
    writeFileSync(opt('--out'), events.map((e) => JSON.stringify(e)).join('\n') + '\n');
    console.log(`${events.length} events → ${opt('--out')}`);
  }
  if (opt('--url')) {
    const r = await send({ events, url: opt('--url').replace(/\/+$/, ''), ws, speed: Number(opt('--speed', 10)), adminToken: process.env.PANEL_ADMIN_TOKEN || '', log: (m) => console.log(m) });
    console.log(`sent ${r.sent} events, ${r.errors} errors`);
  }
}
