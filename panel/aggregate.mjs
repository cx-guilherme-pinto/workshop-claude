// The live panel's aggregate (docs/pt/WORKSHOP-V2-SPEC.md, sections 6.2 and 6.3): events → the state the page shows.
// Pure JavaScript without Node or browser APIs: the Cloudflare Worker (Durable Object), the local server, the
// simulator, the tests and the page's replay mode all use this file. Events are already validated by
// telemetry/schema.mjs (checkIncoming); anything unexpected here is ignored, never thrown.
//
// It measures coverage and quality, never volume (principle 2.3.2): each person counts once per mission or
// decision. The leaderboard (D-34, the organizer's decision: one board of people, not of rooms) ranks the registered
// people by points for coverage and quality — never by spend — with the name the Worker took from their GitHub
// account at registration (names never come from the laptops' events). The Project 1 scatter stays anonymous.

// The missions shown in the grid: M7 (/btw) is not observable (docs/OBSERVABILITY.md). tools/test/panel.test.mjs
// checks this list against missions/rules.json.
export const MISSIONS = ['M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M8', 'M9', 'M10'];
export const PHASES = ['opening', 'missions', 'p1', 'p2', 'closing'];
// The agenda (spec 3): the minute each block starts. A replay moves the view by it.
export const AGENDA = [
  ['opening', 0],
  ['missions', 8],
  ['p1', 23],
  ['p2', 47],
  ['closing', 87],
];
export const ROOMS = ['A', 'B'];
export const ACTIVE_MS = 10 * 60 * 1000;
export const BUDGET_USD = 5;
const FUNNEL = ['intake', 'plan', 'swarm', 'gate', 'report'];
const FEED_MAX = 5;
const BOARD_MAX = 30;
// Points of the leaderboard: coverage and quality, never volume or spend.
export const POINTS = { mission: 1, p1_swarm: 1, p1_retry_green: 1, p1_gate: 2, p2_swarm: 1, p2_gate: 2, p2_report: 1 };

const median = (xs) => {
  const v = xs.filter((x) => typeof x === 'number' && Number.isFinite(x)).sort((a, b) => a - b);
  if (!v.length) return null;
  const m = Math.floor(v.length / 2);
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
};
const round = (x, d = 4) => (x === null || x === undefined || !Number.isFinite(x) ? null : Math.round(x * 10 ** d) / 10 ** d);
const pct = (a, b) => (b > 0 ? Math.min(100, Math.round((100 * a) / b)) : 0);

function person(room) {
  return {
    room,
    name: null,
    points: 0,
    pointsT: null,
    first: null,
    last: null,
    ready: false,
    missions: new Set(),
    cost: { total: 0, haiku: 0, missions: 0, p1: 0, p2: 0 },
    p1: { plan: null, swarm: null, retryGreen: false, tool: null, gate: null },
    p2: { stage: -1, nAgents: null, swarm: null, gate: null },
  };
}

const pointsOf = (p) =>
  p.missions.size * POINTS.mission +
  (p.p1.swarm ? POINTS.p1_swarm : 0) +
  (p.p1.retryGreen ? POINTS.p1_retry_green : 0) +
  (p.p1.gate === 'APPROVED' ? POINTS.p1_gate : 0) +
  (p.p2.swarm ? POINTS.p2_swarm : 0) +
  (p.p2.gate === 'APPROVED' ? POINTS.p2_gate : 0) +
  (p.p2.stage === FUNNEL.length - 1 ? POINTS.p2_report : 0);
export const MAX_POINTS = MISSIONS.length * POINTS.mission + POINTS.p1_swarm + POINTS.p1_retry_green + POINTS.p1_gate + POINTS.p2_swarm + POINTS.p2_gate + POINTS.p2_report;

export class Aggregate {
  constructor({ ws = null } = {}) {
    this.ws = ws;
    this.phase = 'opening';
    this.people = new Map();
    this.feed = [];
    this.hidden = new Set();
    this.firsts = new Set();
    this.ids = new Map();
    this.count = 0;
    this.lastT = null;
  }

  // One event (an object as checkIncoming returns it). Returns true if it changed the state.
  apply(e) {
    if (!e || typeof e !== 'object' || typeof e.p !== 'string' || !ROOMS.includes(e.room)) return false;
    let p = this.people.get(e.p);
    if (!p) {
      p = person(e.room);
      this.people.set(e.p, p);
    }
    p.room = e.room;
    const t = Date.parse(e.t);
    if (Number.isFinite(t)) {
      p.first = p.first === null ? t : Math.min(p.first, t);
      p.last = p.last === null ? t : Math.max(p.last, t);
      this.lastT = this.lastT === null ? t : Math.max(this.lastT, t);
    }
    this.count++;
    switch (e.ev) {
      case 'join':
        break;
      // the Worker's registration (D-34): the name from the GitHub account; never accepted from a laptop
      case 'register':
        if (typeof e.name === 'string') this.setName(e.p, e.name, e.room);
        break;
      case 'check_ok':
        p.ready = true;
        break;
      case 'mission_done':
        if (MISSIONS.includes(e.mission) && !p.missions.has(e.mission)) {
          p.missions.add(e.mission);
          this.first(`mission:${e.mission}`, e, p, { kind: 'mission', mission: e.mission });
        }
        break;
      case 'cost': {
        const v = typeof e.cost_usd === 'number' ? e.cost_usd : 0;
        p.cost.total += v;
        if (e.model === 'haiku') p.cost.haiku += v;
        if (e.block in p.cost) p.cost[e.block] += v;
        break;
      }
      case 'p1_tool_created':
        p.p1.tool = e.tool_template || 'other';
        this.first('p1_tool', e, p, { kind: 'tool', template: p.p1.tool });
        break;
      case 'p1_plan':
        p.p1.plan = { parallel: e.parallel ?? null, model: e.model ?? null, forecast: e.forecast_min ?? null, tasks: e.tasks ?? 0 };
        break;
      case 'p1_swarm_done':
        p.p1.swarm = { duration: e.duration_s ?? null, green: e.green ?? 0, red: e.red ?? 0, greenFirst: e.green_first ?? 0 };
        this.first('p1_swarm', e, p, { kind: 'swarm', project: 'p1' });
        break;
      case 'p1_retry_green':
        p.p1.retryGreen = true;
        break;
      case 'p1_gate':
        p.p1.gate = e.verdict || 'OTHER';
        break;
      case 'p2_intake':
      case 'p2_plan':
      case 'p2_swarm_done':
      case 'p2_gate':
      case 'p2_report': {
        const stage = FUNNEL.indexOf(e.ev.slice(3).replace('_done', ''));
        p.p2.stage = Math.max(p.p2.stage, stage);
        if (e.ev === 'p2_plan') p.p2.nAgents = e.n_agents ?? null;
        if (e.ev === 'p2_swarm_done') p.p2.swarm = { duration: e.duration_s ?? null, green: e.green ?? 0, red: e.red ?? 0, greenFirst: e.green_first ?? 0 };
        if (e.ev === 'p2_gate') p.p2.gate = e.verdict || 'OTHER';
        if (e.ev === 'p2_report') this.first('p2_report', e, p, { kind: 'report' });
        break;
      }
      default:
        break;
    }
    const pts = pointsOf(p);
    if (pts > p.points) {
      p.points = pts;
      p.pointsT = Number.isFinite(t) ? t : p.pointsT;
    }
    return true;
  }

  // The name of a registered person (from the Worker's registration, never from an event).
  setName(id, name, room) {
    if (typeof id !== 'string' || typeof name !== 'string') return false;
    let p = this.people.get(id);
    if (!p) {
      if (!ROOMS.includes(room)) return false;
      p = person(room);
      this.people.set(id, p);
    }
    p.name = name.slice(0, 60);
    if (ROOMS.includes(room)) p.room = room;
    this.ids.set(p, id);
    return true;
  }

  // The first person of a room to reach a milestone goes to the feed ("first" milestones, never a ranking).
  first(key, e, p, item) {
    const k = `${p.room}:${key}`;
    if (this.firsts.has(k)) return;
    this.firsts.add(k);
    this.feed.push({ t: e.t, room: p.room, id: e.p, ...item });
    if (this.feed.length > 50) this.feed.splice(0, this.feed.length - 50);
  }

  setPhase(phase) {
    if (!PHASES.includes(phase) || phase === this.phase) return false;
    this.phase = phase;
    return true;
  }

  // Hides a name on the panel (key H on the page): the person stays in the board, as "—".
  hide(name, on = true) {
    if (typeof name !== 'string') return false;
    if (on) this.hidden.add(name);
    else this.hidden.delete(name);
    return true;
  }

  // The leaderboard: registered people by points, ties broken by who got there first. room = null for both rooms.
  board(room = null) {
    const rows = [...this.people.values()]
      .filter((p) => p.name && (room === null || p.room === room))
      .sort((a, b) => b.points - a.points || (a.pointsT ?? Infinity) - (b.pointsT ?? Infinity) || a.name.localeCompare(b.name));
    return {
      people: rows.length,
      top: rows.slice(0, BOARD_MAX).map((p, i) => ({
        rank: i + 1,
        name: this.hidden.has(p.name) ? null : p.name,
        room: p.room,
        points: p.points,
        missions: MISSIONS.filter((m) => p.missions.has(m)),
        p1: p.p1.gate ? (p.p1.gate === 'APPROVED' ? 'approved' : 'gate') : p.p1.swarm ? 'swarm' : p.p1.plan ? 'plan' : null,
        p2: p.p2.gate === 'APPROVED' ? 'approved' : p.p2.stage >= 0 ? FUNNEL[p.p2.stage] : null,
      })),
    };
  }

  // The summary of one room (or of both, room = null).
  room(room, now) {
    const ps = [...this.people.values()].filter((p) => room === null || p.room === room);
    const active = ps.filter((p) => p.last !== null && now - p.last <= ACTIVE_MS);
    const withCost = ps.filter((p) => p.cost.total > 0);
    const costTotal = withCost.reduce((a, p) => a + p.cost.total, 0);
    // Coverage of a mission: who did it, out of the people present (active now, or who did it earlier).
    const isActive = new Set(active);
    const missions = {};
    for (const m of MISSIONS) {
      const n = ps.filter((p) => p.missions.has(m)).length;
      const present = ps.filter((p) => isActive.has(p) || p.missions.has(m)).length;
      missions[m] = { done: n, pct: pct(n, present) };
    }
    const started = ps.filter((p) => p.missions.size);
    const least = active.length ? MISSIONS.reduce((a, m) => (missions[m].done < missions[a].done ? m : a), MISSIONS[0]) : null;
    const coverage = ps.length ? round(ps.reduce((a, p) => a + p.missions.size / MISSIONS.length, 0) / ps.length, 3) : 0;

    const points = ps
      .filter((p) => p.p1.swarm && p.p1.swarm.duration !== null)
      .map((p) => ({ duration_s: p.p1.swarm.duration, cost_usd: round(p.cost.p1, 3), parallel: p.p1.plan?.parallel ?? null, model: p.p1.plan?.model ?? null }));
    const swarmDone = ps.filter((p) => p.p1.swarm);
    const swarms = [...ps.map((p) => p.p1.swarm), ...ps.map((p) => p.p2.swarm)].filter(Boolean);
    const tasks = swarms.reduce((a, s) => a + s.green + s.red, 0);
    const green = swarms.reduce((a, s) => a + s.green, 0);
    const greenFirst = swarms.reduce((a, s) => a + s.greenFirst, 0);
    const swarmCost = ps.reduce((a, p) => a + p.cost.p1 + p.cost.p2, 0);
    const funnel = Object.fromEntries(FUNNEL.map((f, i) => [f, ps.filter((p) => p.p2.stage === i).length]));
    const hist = {};
    for (const p of ps) if (Number.isInteger(p.p2.nAgents)) hist[p.p2.nAgents] = (hist[p.p2.nAgents] || 0) + 1;
    const agents = ps.reduce((a, p) => a + (p.p1.plan?.tasks || 0) + (p.p2.nAgents || 0), 0);

    return {
      people: ps.length,
      active: active.length,
      ready: ps.filter((p) => p.ready).length,
      cost_avg_usd: withCost.length ? round(costTotal / withCost.length, 3) : null,
      missions,
      least_done: least,
      started_missions: started.length,
      coverage_avg: coverage,
      p1: {
        points,
        forecast_median_min: median(ps.map((p) => p.p1.plan?.forecast)),
        actual_median_min: round(median(swarmDone.map((p) => (p.p1.swarm.duration ?? NaN) / 60)), 1),
        specs_fixed: ps.filter((p) => p.p1.retryGreen).length,
        swarm_done: swarmDone.length,
        tools_invented: ps.filter((p) => p.p1.tool).length,
        gates_approved: ps.filter((p) => p.p1.gate === 'APPROVED').length,
      },
      p2: {
        funnel,
        agents_hist: hist,
        closed: ps.filter((p) => p.p2.stage === FUNNEL.length - 1).length,
        gates_approved: ps.filter((p) => p.p2.gate === 'APPROVED').length,
      },
      closing: {
        cost_per_green_usd: green ? round(swarmCost / green, 4) : null,
        green_first_pct: tasks ? pct(greenFirst, tasks) : null,
        haiku_pct: costTotal > 0 ? pct(ps.reduce((a, p) => a + p.cost.haiku, 0), costTotal) : null,
        agents_launched: agents,
      },
    };
  }

  // What the page receives (GET /state and each SSE message).
  state(now = Date.now()) {
    return {
      v: 1,
      ws: this.ws,
      phase: this.phase,
      now: new Date(now).toISOString(),
      events: this.count,
      budget_usd: BUDGET_USD,
      missions: MISSIONS,
      rooms: { A: this.room('A', now), B: this.room('B', now), all: this.room(null, now) },
      // hidden nicknames are not listed: /state is public, and a hidden nickname must not be readable there
      feed: this.feed.slice(-FEED_MAX).map(({ id, ...f }) => {
        const name = id ? this.people.get(id)?.name : null;
        return { ...f, name: name && !this.hidden.has(name) ? name : null };
      }),
      board: { all: this.board(null), A: this.board('A'), B: this.board('B') },
      max_points: MAX_POINTS,
    };
  }

  // A snapshot for the Durable Object storage (the Worker does not replay every event on a cold start).
  toJSON() {
    return {
      v: 1,
      ws: this.ws,
      phase: this.phase,
      count: this.count,
      lastT: this.lastT,
      feed: this.feed,
      hidden: [...this.hidden],
      firsts: [...this.firsts],
      people: [...this.people].map(([id, p]) => [id, { ...p, missions: [...p.missions] }]),
    };
  }

  static fromJSON(j) {
    const a = new Aggregate({ ws: j?.ws ?? null });
    if (!j || j.v !== 1) return a;
    a.phase = PHASES.includes(j.phase) ? j.phase : 'opening';
    a.count = j.count || 0;
    a.lastT = j.lastT ?? null;
    a.feed = Array.isArray(j.feed) ? j.feed : [];
    a.hidden = new Set(j.hidden || []);
    a.firsts = new Set(j.firsts || []);
    for (const [id, p] of j.people || []) {
      const q = { ...person(p.room), ...p, missions: new Set(p.missions || []) };
      a.people.set(id, q);
      a.ids.set(q, id);
    }
    return a;
  }
}
