// /status (the same page as the Security Arena's): one square per swarm task, live by SSE (/api/events), polling
// /api/status when SSE fails. With ?replay=<name> it rebuilds a recorded run from replays/<name>/ (events.jsonl +
// snapshot.json), without calling the Claude API. The server sends everything in the shape of
// tools/snapshot.mjs (English keys and states). The panel of a tool square opens that tool in the shell.
import { el, replay as restartAnimation, VALID_ID, TOOL_ID } from './dom.js';
import { usd, usdTotal, duration, clock, modelName, STATE_NAME } from './formats.js';
import { T } from '/lib/texts.js';

const S = T.status;

const $ = (id) => document.getElementById(id);
const ui = {
  sub: $('status-sub'),
  replay: $('replay'),
  n: { green: $('n-green'), working: $('n-working'), red: $('n-red'), todo: $('n-todo') },
  time: $('time'),
  timeNote: $('time-note'),
  cost: $('cost'),
  costNote: $('cost-note'),
  costLabel: $('cost-label'),
  bar: $('cost-bar'),
  barValue: $('cost-bar-value'),
  squares: $('squares'),
  empty: $('board-empty'),
  seeExample: $('see-example'),
  panel: $('panel'),
};

const state = {
  f: null,
  ids: '',
  density: 'large',
  squares: new Map(),
  now: () => Date.now(),
  connection: S.connecting,
  replay: null,
  tools: new Map(), // id -> { exists } from /api/tools
  panel: null, // { id, info }
};

const STATE_LONG = S.stateLong;
const verdictName = (v) => S.verdicts[v] ?? v;

// ---------- drawing a snapshot ----------

function setText(node, text) {
  if (node && node.textContent !== text) node.textContent = text;
}

function subtitle(f) {
  if (state.replay) {
    const r = state.replay;
    return S.replay(r.name, S.nTasks(f.total), r.finished ? S.replayFinished : r.playing ? S.atSpeed(r.speed) : S.paused);
  }
  if (f.empty) return f.reason === 'no_engine' ? S.noEngine : S.noPlan;
  const phase = f.end ? S.finished : f.start ? S.running : S.waiting;
  return S.mode(T.modes[f.mode] ?? (f.mode || '—'), S.nTasks(f.total), phase, state.connection);
}

function draw(f) {
  state.f = f;
  const tasks = Array.isArray(f.tasks) ? f.tasks : [];
  const c = f.counts || {};
  setText(ui.n.green, String(c.green || 0));
  setText(ui.n.working, String(c.working || 0));
  setText(ui.n.red, String((c.red || 0) + (c.failed || 0)));
  setText(ui.n.todo, String(c.todo || 0));
  setText(ui.sub, subtitle(f));

  const ids = tasks.map((t) => t.id).join('|');
  if (ids !== state.ids) buildSquares(tasks);
  for (const t of tasks) updateSquare(t);
  ui.empty.hidden = tasks.length > 0;
  ui.squares.hidden = tasks.length === 0;
  meters();
  if (state.panel) updatePanel();
}

function meters() {
  const f = state.f;
  if (!f) return;
  const now = state.now();
  const start = f.start ? Date.parse(f.start) : null;
  const end = f.end ? Date.parse(f.end) : null;
  const s = start ? ((end ?? now) - start) / 1000 : 0;
  setText(ui.time, clock(s));
  const r = state.replay;
  setText(ui.timeNote, r ? S.ofDuration(clock(r.data.duration)) : f.end ? S.finished : '');

  const total = f.cost?.total || 0;
  const target = f.budget?.target_usd ?? 5;
  setText(ui.cost, usdTotal(total));
  setText(ui.costLabel, S.costLabel(usdTotal(target)));
  setText(ui.costNote, total > target ? S.overTarget : '');
  const p = Math.max(0, Math.min(1, total / target));
  ui.barValue.style.transform = `scaleX(${p.toFixed(4)})`;
  ui.bar.dataset.level = total > target ? 'over' : total > target * 0.8 ? 'near' : 'within';
  ui.bar.setAttribute('aria-valuemax', String(target));
  ui.bar.setAttribute('aria-valuenow', total.toFixed(2));

  for (const t of f.tasks || []) if (t.state === 'working') updateMeasures(t);
}

// ---------- squares ----------

function densityFor(n) {
  return n <= 24 ? 'large' : n <= 60 ? 'medium' : 'small';
}

function buildSquares(tasks) {
  state.squares.clear();
  state.density = densityFor(tasks.length);
  ui.squares.dataset.density = state.density;
  const items = tasks.map((t) => {
    const id = el('span', { class: 'square-id', text: t.id });
    const attempt = el('span', { class: 'square-try number' });
    const lines = [0, 1, 2].map(() => el('span', { class: 'square-line number' }));
    const button = el('button', { class: 'square', type: 'button', on: { click: () => openPanel(t.id) } },
      el('span', { class: 'square-top' }, id, attempt),
      el('span', { class: 'square-footer' }, ...lines));
    const li = el('li', { class: 'square-item', 'data-task': t.id });
    li.append(button);
    state.squares.set(t.id, { li, button, attempt, lines, state: null });
    return li;
  });
  ui.squares.replaceChildren(...items);
  state.ids = tasks.map((t) => t.id).join('|');
}

function secondsOf(t) {
  if (t.state === 'working') return t.start ? (state.now() - Date.parse(t.start)) / 1000 : null;
  return t.seconds ?? null;
}

// With many squares the lines are short: "6 min" instead of "6 min 11 s".
function shortDuration(s) {
  if (s === null || s === undefined || Number.isNaN(s)) return '—';
  return s < 60 ? `${Math.round(s)} s` : `${Math.round(s / 60)} min`;
}

// Three lines below the id: who, model and measures. Arranged according to the space.
function linesOf(t) {
  const s = secondsOf(t);
  const cost = t.cost_usd == null ? null : usd(t.cost_usd);
  if (!t.agent) {
    const name = STATE_NAME[t.state] || t.state;
    return [name, t.wave ? S.wave(t.wave) : '', ''];
  }
  const model = modelName(t.model);
  if (state.density === 'small') {
    return [t.agent, `${model} · ${s === null ? S.starting : shortDuration(s)}`, cost ?? ''];
  }
  const measures = s === null ? S.starting : cost ? `${duration(s)} · ${cost}` : duration(s);
  return [t.agent, model, measures];
}

function updateMeasures(t) {
  const q = state.squares.get(t.id);
  if (!q) return;
  const l = linesOf(t);
  for (let i = 0; i < 3; i++) setText(q.lines[i], l[i]);
}

function updateSquare(t) {
  const q = state.squares.get(t.id);
  if (!q) return;
  if (q.state !== t.state) {
    const had = q.state;
    q.state = t.state;
    q.li.dataset.state = t.state;
    if (had) restartAnimation(q.button, 'changed');
  }
  setText(q.attempt, t.attempt > 1 ? (state.density === 'small' ? S.tryShort(t.attempt) : S.tryLong(t.attempt)) : '');
  const l = linesOf(t);
  for (let i = 0; i < 3; i++) setText(q.lines[i], l[i]);
  const attempt = t.attempt > 1 ? S.attemptAria(t.attempt) : '';
  q.button.setAttribute('aria-label', `${t.id}: ${STATE_NAME[t.state] || t.state}${attempt}. ${l.filter(Boolean).join(', ')}`);
}

// ---------- panel of one task ----------

const task = (id) => (state.f?.tasks || []).find((t) => t.id === id) || null;

function pair(label, value) {
  return [el('dt', { text: label }), el('dd', { text: String(value) })];
}

function testSection(t) {
  const te = t.test;
  const heading = el('h3', { text: S.testResult });
  if (!te) {
    const msg = t.state === 'working' ? S.testWhenDone : state.replay ? S.noRecordedResult : S.noResult;
    return el('section', { class: 'panel-section' }, heading, el('p', { class: 'note', text: msg }));
  }
  const lines = [];
  if (te.command) lines.push(el('p', { class: 'note', text: te.command }));
  if (te.file) lines.push(el('p', { class: 'note', text: te.file }));
  if (Number.isFinite(te.passed) || Number.isFinite(te.failed)) {
    lines.push(el('p', { class: 'number', text: S.passFail(te.passed || 0, te.failed || 0) }));
  }
  if (te.value) lines.push(el('p', { text: S.verdict(verdictName(te.value)) }));
  const excerpt = String(te.excerpt || '').trim();
  lines.push(excerpt ? el('pre', { class: 'panel-excerpt', text: excerpt }) : el('p', { class: 'note', text: S.noErrors }));
  return el('section', { class: 'panel-section' }, heading, ...lines);
}

// A tool task: its id is a tool id (tx-01 … dd-05, my-01) and it is in the catalogue (or has a tool.js).
const isTool = (t) => TOOL_ID.test(String(t.id)) && (state.tools.has(t.id) || t.group_type === 'tool' || t.exists !== undefined);

function toolExists(t) {
  return isTool(t) && (state.tools.get(t.id)?.exists ?? t.exists === true);
}

function actionsSection(t) {
  const actions = [];
  if (isTool(t)) {
    if (!toolExists(t)) return el('p', { class: 'note', text: S.noToolJs(t.id) });
    actions.push(el('a', { class: 'button button-primary', href: `/#/tool/${t.id}` }, S.openTool));
  } else if (t.id === 'index-page') {
    actions.push(el('a', { class: 'button', href: '/' }, S.seeSearch));
  }
  return actions.length ? el('div', { class: 'panel-actions' }, ...actions) : null;
}

function panelInfo(t) {
  return [
    el('div', { class: 'panel-top' },
      el('div', {},
        el('h2', { class: 'section-title', id: 'panel-title', tabindex: '-1', text: t.id }),
        t.title ? el('p', { text: t.title }) : null),
      el('button', { class: 'button button-small', type: 'button', on: { click: closePanel } }, S.close)),
    el('p', { class: 'panel-state', 'data-state': t.state, text: STATE_LONG[t.state] || t.state }),
    el('dl', { class: 'panel-data' },
      ...pair(S.agent, t.agent || '—'),
      ...pair(S.model, modelName(t.model)),
      ...pair(S.attempt, t.attempt || '—'),
      ...pair(S.time, t.state === 'working' && t.start ? duration((state.now() - Date.parse(t.start)) / 1000) : duration(t.seconds)),
      ...pair(S.cost, usd(t.cost_usd)),
      ...pair(S.waveLabel, t.wave ?? '—')),
    testSection(t),
    actionsSection(t),
  ];
}

function openPanel(id) {
  const t = task(id);
  if (!t) return;
  const info = el('div', { class: 'panel-info' });
  state.panel = { id, info, signature: '' };
  ui.panel.replaceChildren(el('div', { class: 'panel-content' }, info));
  updatePanel();
  if (!ui.panel.open) ui.panel.showModal();
  ui.panel.querySelector('#panel-title')?.focus();
  refreshTools();
}

function updatePanel() {
  const p = state.panel;
  const t = p && task(p.id);
  if (!t) return;
  const signature = JSON.stringify([t.state, t.attempt, t.agent, t.model, t.cost_usd, t.seconds, t.test, toolExists(t), t.state === 'working' ? Math.floor(state.now() / 1000) : 0]);
  if (signature === p.signature) return;
  p.signature = signature;
  p.info.replaceChildren(...panelInfo(t).filter(Boolean));
}

function closePanel() {
  if (ui.panel.open) ui.panel.close();
}

ui.panel.addEventListener('close', () => {
  state.panel = null;
  ui.panel.replaceChildren();
});
ui.panel.addEventListener('click', (ev) => {
  if (ev.target === ui.panel) closePanel();
});

// ---------- tools that exist in this folder (for "Open in the Pocketknife") ----------

let toolsScheduled = null;
function refreshTools() {
  clearTimeout(toolsScheduled);
  toolsScheduled = setTimeout(async () => {
    try {
      const r = await fetch('/api/tools', { cache: 'no-store' });
      if (!r.ok) return;
      const d = await r.json();
      state.tools = new Map((d.tools || []).filter((t) => TOOL_ID.test(String(t.id))).map((t) => [t.id, { exists: !!t.built }]));
      if (state.panel) updatePanel();
    } catch {
      /* no server: the panel uses what the snapshot says */
    }
  }, 200);
}

// ---------- live ----------

function startLive() {
  let lastSse = 0;
  const apply = (f, via) => {
    state.connection = via;
    draw(f);
  };
  if ('EventSource' in window) {
    const es = new EventSource('/api/events');
    es.addEventListener('snapshot', (ev) => {
      lastSse = Date.now();
      try {
        apply(JSON.parse(ev.data), S.live);
        refreshTools();
      } catch {
        /* invalid message: ignore */
      }
    });
    es.addEventListener('ping', () => {
      lastSse = Date.now();
      if (state.connection !== S.live && state.f) apply(state.f, S.live);
    });
    es.addEventListener('error', () => {
      if (state.f) apply(state.f, S.reconnecting);
    });
  }
  const poll = async () => {
    try {
      const r = await fetch('/api/status', { cache: 'no-store' });
      if (r.ok) apply(await r.json(), Date.now() - lastSse > 5000 ? S.polling : S.live);
    } catch {
      state.connection = S.offline;
      if (state.f) draw(state.f);
      else setText(ui.sub, S.offlineText);
    }
  };
  poll();
  setInterval(() => {
    if (Date.now() - lastSse > 5000) poll();
  }, 2000);
  setInterval(meters, 1000);
  refreshTools();
  fetch('/api/replay', { cache: 'no-store' })
    .then((r) => (r.ok ? r.json() : null))
    .then((d) => {
      const example = (d?.replays || []).find((x) => x.name === 'example' || x.name === 'exemplo');
      if (example) {
        ui.seeExample.setAttribute('href', `/status?replay=${example.name}`);
        ui.seeExample.hidden = false;
      }
    })
    .catch(() => {});
}

// ---------- replay ----------

const SPEEDS = [1, 10, 20, 30];
const TERMINAL = new Set(['green', 'red', 'failed']);

function prepareReplay(name, { snapshot, events }) {
  const snap = snapshot && typeof snapshot === 'object' ? snapshot : {};
  const evs = (Array.isArray(events) ? events : [])
    .filter((e) => e && typeof e.ts === 'string' && !Number.isNaN(Date.parse(e.ts)))
    .map((e, i) => ({ ...e, t: Date.parse(e.ts), i }))
    .sort((a, b) => a.t - b.t || a.i - b.i);
  const fromSnap = Array.isArray(snap.tasks) ? snap.tasks.filter((t) => t && VALID_ID.test(String(t.id))) : [];
  const order = fromSnap.map((t) => t.id);
  for (const e of evs) if (e.task && VALID_ID.test(String(e.task)) && !order.includes(e.task)) order.push(e.task);
  const start = evs.find((e) => e.type === 'start')?.t ?? (snap.start ? Date.parse(snap.start) : evs[0]?.t ?? Date.now());
  const endEv = [...evs].reverse().find((e) => e.type === 'end');
  const end = endEv?.t ?? (snap.end ? Date.parse(snap.end) : evs[evs.length - 1]?.t ?? start);
  return { name, snap, evs, order, byId: new Map(fromSnap.map((t) => [t.id, t])), start, duration: Math.max(1, (end - start) / 1000) };
}

class Player {
  constructor(data) {
    this.data = data;
    this.name = data.name;
    this.speed = 20;
    this.playing = true;
    this.reset();
  }

  reset() {
    this.pos = 0;
    this.i = 0;
    this.finished = false;
    this.end = null;
    this.cost = { main: 0, subagents: 0 };
    this.tasks = this.data.order.map((id) => {
      const s = this.data.byId.get(id) || {};
      return {
        id, title: s.title ?? null, group: s.group ?? null, group_type: s.group_type ?? null, wave: s.wave ?? null,
        state: 'todo', attempt: 0, agent: null, model: null, seconds: null, cost_usd: null, test: null,
        start: null, end: null, exists: s.exists,
      };
    });
    this.byId = new Map(this.tasks.map((t) => [t.id, t]));
  }

  now() {
    return this.data.start + this.pos * 1000;
  }

  advance(seconds) {
    this.pos = Math.min(this.data.duration, this.pos + seconds);
    const limit = this.now();
    const evs = this.data.evs;
    while (this.i < evs.length && evs[this.i].t <= limit) this.apply(evs[this.i++]);
    if (this.pos >= this.data.duration && this.i >= evs.length) this.finished = true;
  }

  apply(e) {
    const t = e.task ? this.byId.get(e.task) : null;
    if (e.type === 'state' && t && typeof e.state === 'string') {
      t.state = e.state;
      if (Number.isInteger(e.attempt)) t.attempt = e.attempt;
      if (e.agent) t.agent = String(e.agent);
      if (e.model) t.model = String(e.model);
      if (e.state === 'working') {
        t.start = e.ts;
        t.end = null;
        t.test = null;
      } else if (TERMINAL.has(e.state)) {
        t.end = e.ts;
        const s = this.data.byId.get(t.id);
        if (s && s.state === e.state && (s.attempt ?? t.attempt) === t.attempt) t.test = s.test ?? null;
        if (t.seconds == null && t.start) t.seconds = (e.t - Date.parse(t.start)) / 1000;
      }
    } else if (e.type === 'cost') {
      const v = Number(e.cost_usd) || 0;
      if (t) {
        t.cost_usd = (t.cost_usd || 0) + v;
        if (Number.isFinite(e.duration_s)) t.seconds = e.duration_s;
        if (e.model) t.model = String(e.model);
        if (!t.agent && e.agent) t.agent = String(e.agent);
        this.cost.subagents += v;
      } else {
        this.cost.main += v;
      }
    } else if (e.type === 'end') {
      this.end = e.ts;
      const real = Number(this.data.snap.cost?.total);
      const now = this.cost.main + this.cost.subagents;
      if (Number.isFinite(real) && real > now) this.cost.main += real - now;
    }
  }

  snapshot() {
    const counts = { todo: 0, working: 0, green: 0, red: 0, failed: 0 };
    for (const t of this.tasks) if (t.state in counts) counts[t.state]++;
    return {
      mode: this.data.snap.mode ?? null,
      start: new Date(this.data.start).toISOString(),
      end: this.end,
      total: this.tasks.length,
      counts,
      cost: { total: this.cost.main + this.cost.subagents, ...this.cost },
      tasks: this.tasks.map((t) => ({ ...t })),
      budget: this.data.snap.budget ?? { target_usd: 5, cap_usd: 10 },
    };
  }
}

function replayControls(r) {
  const speeds = SPEEDS.map((v) =>
    el('button', { class: 'segmented-option number', type: 'button', 'data-speed': v, attrs: { 'aria-pressed': v === r.speed ? 'true' : 'false' }, on: { click: () => setSpeed(v) } }, `${v}×`));
  const pause = el('button', { class: 'button button-small', type: 'button', id: 'replay-pause', on: { click: togglePause } }, S.pause);
  const restart = el('button', { class: 'button button-small', type: 'button', on: { click: restartReplay } }, S.restart);
  const real = r.data.snap.cost?.total;
  ui.replay.replaceChildren(
    el('div', { class: 'segmented', role: 'group', attrs: { 'aria-label': S.speed } }, ...speeds),
    pause,
    restart,
    el('p', { class: 'note number replay-real', text: S.realRun(duration(r.data.duration), Number.isFinite(real) ? usdTotal(real) : S.unknownCost) }),
  );
  ui.replay.hidden = false;
}

function updateControls() {
  const r = state.replay;
  for (const b of ui.replay.querySelectorAll('[data-speed]')) b.setAttribute('aria-pressed', Number(b.dataset.speed) === r.speed ? 'true' : 'false');
  const p = $('replay-pause');
  if (p) p.textContent = r.finished ? S.finishedButton : r.playing ? S.pause : S.resume;
  if (p) p.disabled = r.finished;
}

function setSpeed(v) {
  state.replay.speed = v;
  updateControls();
  draw(state.replay.snapshot());
}

function togglePause() {
  const r = state.replay;
  if (r.finished) return;
  r.playing = !r.playing;
  updateControls();
  draw(r.snapshot());
}

function restartReplay() {
  const r = state.replay;
  r.reset();
  r.playing = true;
  updateControls();
  draw(r.snapshot());
}

async function startReplay(name) {
  setText(ui.sub, S.loadingReplay);
  let data;
  try {
    const r = await fetch(`/api/replay/${encodeURIComponent(name)}`, { cache: 'no-store' });
    if (!r.ok) throw new Error(String(r.status));
    const d = await r.json();
    data = prepareReplay(typeof d?.name === 'string' ? d.name : name, d);
  } catch {
    setText(ui.sub, S.replayNotFound(name));
    ui.empty.hidden = false;
    return;
  }
  const player = new Player(data);
  state.replay = player;
  state.now = () => player.now();
  // For the organizer's recorder (tools/record/record-replay.mjs): it steps the replay frame by frame.
  // The same name as in the Security Arena, so the recorder works with both.
  globalThis.__arenaReplay = { player, draw: () => draw(player.snapshot()) };
  replayControls(player);
  refreshTools();
  player.advance(0);
  draw(player.snapshot());
  let before = performance.now();
  setInterval(() => {
    const now = performance.now();
    const dt = Math.min(1, (now - before) / 1000);
    before = now;
    if (player.playing && !player.finished) {
      player.advance(dt * player.speed);
      if (player.finished) updateControls();
      draw(player.snapshot());
    }
  }, 100);
  document.addEventListener('keydown', (ev) => {
    if (ui.panel.open || ev.target !== document.body || ev.metaKey || ev.ctrlKey || ev.altKey) return;
    if (ev.key === ' ') {
      ev.preventDefault();
      togglePause();
    } else if (ev.key === 'r' || ev.key === 'R') {
      restartReplay();
    } else if (['1', '2', '3', '4'].includes(ev.key)) {
      setSpeed(SPEEDS[Number(ev.key) - 1]);
    }
  });
}

// ---------- start ----------

const asked = new URLSearchParams(location.search).get('replay');
if (asked !== null) {
  if (VALID_ID.test(asked)) startReplay(asked);
  else setText(ui.sub, S.invalidReplay);
} else {
  startLive();
}
