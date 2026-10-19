// The live panel page (docs/pt/WORKSHOP-V2-SPEC.md, sections 6.1 to 6.3 and 6.8), projected next to the slides.
//
//   /?room=A|B|all           filters the leaderboard and the numbers to one room (default all: both rooms together)
//   /?lang=pt|en             the language (default: the browser's; pt for any pt*)
//   /?lite=1                 a slow projector: no animations, one update per second
//   /?replay=<name>&x=<n>    plays replays/<name>.jsonl in the browser at n times real speed (plan B: no API)
//                            &at=<min> starts at that minute of the agenda (rehearsals, screenshots)
//   /#admin=<token>          the presenter's admin token (moved to sessionStorage, removed from the address bar)
//
// Keys: 1-5 = Opening, Missions, Project 1, Project 2, Closing (with the admin token the shared view of both rooms,
// without it this page only); 0 = follow the shared view again; H then a click on a name (in the leaderboard, the
// list of names or the feed) hides it, for everyone with the admin token.
//
// Every view has the leaderboard (D-34: one board of people, ranked by points for coverage and quality, never by
// spend) as its main element, at most 4 elements with the top strip. The leaderboard shows the names the Worker took
// from the GitHub accounts; hidden ones are "—". The Project 1 scatter stays anonymous. There is no room-vs-room
// comparison: ?room only filters.
//
// Rules: the DOM is built with createElement/textContent (strict CSP: no inline scripts or styles, no HTML from
// strings). Every text is in TEXT below, with the same keys in pt and en.

export const VIEWS = ['opening', 'missions', 'p1', 'p2', 'closing'];
const ROOMS = ['A', 'B'];
const BUDGET = 5;
// The stages of each project on the leaderboard, in order (what board().top[].p1 and .p2 hold).
export const P1_STAGES = ['plan', 'swarm', 'gate', 'approved'];
export const P2_STAGES = ['intake', 'plan', 'swarm', 'gate', 'approved', 'report'];
const FUNNEL = ['intake', 'plan', 'swarm', 'gate', 'report'];
const WIDE = 1100;

export const TEXT = {
  pt: {
    title: 'Painel do workshop',
    room: 'Sala {r}',
    rooms: 'Salas A e B',
    boardPeople: 'Na classificação',
    costHead: 'Custo médio por pessoa',
    costTarget: 'alvo US$ {n}',
    views: { opening: 'Abertura', missions: 'Missões', p1: 'Projeto 1', p2: 'Projeto 2', closing: 'Fecho' },
    registeredHead: 'Inscritas',
    registeredOf: 'com conta GitHub',
    readyHead: 'Prontas',
    readyOf: 'de {n} ligadas',
    namesHead: 'Já na classificação',
    namesEmpty: 'Ainda ninguém se inscreveu.',
    boardHead: 'Classificação',
    boardNote: '{n} pessoas · máx. {max} pontos',
    boardEmpty: 'Ainda ninguém na classificação.',
    noStage: 'ainda não',
    missionsHead: 'O que a sala já fez',
    tryNow: 'Experimenta agora',
    feedHead: 'Os primeiros de cada sala',
    feedEmpty: 'Ainda sem marcos.',
    someone: 'Alguém da sala {r}',
    feed: {
      mission: 'estreou a {m} · {label}',
      tool: 'inventou a primeira ferramenta ({tpl})',
      swarm: 'acabou o primeiro swarm',
      report: 'fechou a primeira issue',
    },
    missionNames: { M1: 'plan mode', M2: '/model haiku', M3: 'subagente', M4: 'skill', M5: 'hook', M6: '/loop', M7: '/btw', M8: 'statusline', M9: 'claude -p', M10: 'memória' },
    p1Stages: { plan: 'plan', swarm: 'swarm', gate: 'gate', approved: 'aprovado' },
    p2Stages: { intake: 'intake', plan: 'plan', swarm: 'swarm', gate: 'gate', report: 'report', approved: 'aprovado' },
    scatterHead: 'Tempo do swarm × custo do Projeto 1',
    scatterEmpty: 'À espera do primeiro swarm.',
    axisMin: 'min',
    axisUsd: 'US$',
    parallel: 'em paralelo',
    funnelHead: 'Pessoas que já chegaram a cada passo',
    stages: { intake: 'intake', plan: 'plan', swarm: 'swarm', gate: 'gate', report: 'report' },
    betterHead: 'Fazer melhor',
    perGreen: 'US$ por tarefa verde',
    greenFirst: 'verdes à primeira',
    haiku: 'do custo em Haiku',
    replay: 'replay ×{x}',
    replayEnd: 'replay acabou',
    offline: 'sem ligação, a tentar',
    waiting: 'À espera de dados…',
    replayError: 'Não consegui abrir o replay {name}.',
    viewShared: 'Vista {v} nas duas salas',
    viewLocal: 'Vista {v} só nesta página (0 volta à partilhada)',
    viewFollow: 'A seguir a vista partilhada',
    adminRefused: 'Token de admin recusado: a vista mudou só aqui',
    hideMode: 'Clica num nome para o esconder (Esc cancela)',
    hidden: 'Nome escondido',
    noName: 'Não há nomes à vista para esconder',
  },
  en: {
    title: 'Workshop panel',
    room: 'Room {r}',
    rooms: 'Rooms A and B',
    boardPeople: 'On the leaderboard',
    costHead: 'Average cost per person',
    costTarget: 'target US$ {n}',
    views: { opening: 'Opening', missions: 'Missions', p1: 'Project 1', p2: 'Project 2', closing: 'Closing' },
    registeredHead: 'Registered',
    registeredOf: 'with a GitHub account',
    readyHead: 'Ready',
    readyOf: 'of {n} connected',
    namesHead: 'Already on the leaderboard',
    namesEmpty: 'Nobody has registered yet.',
    boardHead: 'Leaderboard',
    boardNote: '{n} people · max {max} points',
    boardEmpty: 'Nobody on the leaderboard yet.',
    noStage: 'not yet',
    missionsHead: 'What the room can already do',
    tryNow: 'Try it now',
    feedHead: 'Firsts in each room',
    feedEmpty: 'No milestones yet.',
    someone: 'Someone in room {r}',
    feed: {
      mission: 'was first to finish {m} · {label}',
      tool: 'invented the first tool ({tpl})',
      swarm: 'finished the first swarm',
      report: 'closed the first issue',
    },
    missionNames: { M1: 'plan mode', M2: '/model haiku', M3: 'subagent', M4: 'skill', M5: 'hook', M6: '/loop', M7: '/btw', M8: 'statusline', M9: 'claude -p', M10: 'memory' },
    p1Stages: { plan: 'plan', swarm: 'swarm', gate: 'gate', approved: 'approved' },
    p2Stages: { intake: 'intake', plan: 'plan', swarm: 'swarm', gate: 'gate', report: 'report', approved: 'approved' },
    scatterHead: 'Swarm time × Project 1 cost',
    scatterEmpty: 'Waiting for the first swarm.',
    axisMin: 'min',
    axisUsd: 'US$',
    parallel: 'in parallel',
    funnelHead: 'People who reached each step',
    stages: { intake: 'intake', plan: 'plan', swarm: 'swarm', gate: 'gate', report: 'report' },
    betterHead: 'Doing better',
    perGreen: 'US$ per green task',
    greenFirst: 'green at the first try',
    haiku: 'of the cost in Haiku',
    replay: 'replay ×{x}',
    replayEnd: 'replay finished',
    offline: 'offline, retrying',
    waiting: 'Waiting for data…',
    replayError: 'Could not open the replay {name}.',
    viewShared: '{v} view in both rooms',
    viewLocal: '{v} view on this page only (0 goes back to the shared one)',
    viewFollow: 'Following the shared view',
    adminRefused: 'Admin token refused: the view changed here only',
    hideMode: 'Click a name to hide it (Esc cancels)',
    hidden: 'Name hidden',
    noName: 'There are no names on screen to hide',
  },
};

const SVGNS = 'http://www.w3.org/2000/svg';
const ADMIN_KEY = 'workshop-panel-admin';

// ---------- options ----------

export function readOptions(search, language) {
  const q = new URLSearchParams(search);
  const lang0 = (q.get('lang') || q.get('lingua') || language || '').toLowerCase();
  const lang = lang0.startsWith('pt') ? 'pt' : lang0 && TEXT[lang0.slice(0, 2)] ? lang0.slice(0, 2) : 'en';
  const room0 = (q.get('room') || q.get('sala') || 'all').toUpperCase();
  const room = ROOMS.includes(room0) ? room0 : null;
  const replay = q.get('replay');
  const x = Number(q.get('x'));
  const at = Number(q.get('at'));
  return {
    lang,
    room,
    lite: q.get('lite') === '1',
    replay: replay && /^[A-Za-z0-9_-]{1,64}$/.test(replay) ? replay : replay ? '' : null,
    x: Number.isFinite(x) && x > 0 ? Math.min(x, 1000) : 1,
    at: Number.isFinite(at) && at > 0 ? Math.min(at, 600) : 0,
  };
}

// How many segments of a stage track are filled: the stage's position in its list (0 = not started).
export function stageStep(stages, stage) {
  return stages.indexOf(stage) + 1;
}

// The names to list at the Opening, newest first. seen: Map name -> {seq, room}, kept by the page across states.
// The first state's names keep the leaderboard's order; a name that appears later goes on top.
export function trackNames(seen, state, counter) {
  const boards = state?.board && typeof state.board === 'object' ? state.board : {};
  const first = seen.size === 0;
  let n = counter;
  let i = 0;
  for (const k of ['all', 'A', 'B']) {
    for (const row of Array.isArray(boards[k]?.top) ? boards[k].top : []) {
      if (typeof row?.name !== 'string' || seen.has(row.name)) continue;
      seen.set(row.name, { seq: first ? -i++ : ++n, room: ROOMS.includes(row.room) ? row.room : '?' });
    }
  }
  return n;
}

// ---------- texts and numbers ----------

let L = TEXT.en;
let LOCALE = 'en';

function t(path, vars = {}) {
  let v = path.split('.').reduce((o, k) => (o && typeof o === 'object' ? o[k] : undefined), L);
  if (typeof v !== 'string') v = path;
  return v.replace(/\{(\w+)\}/g, (_, k) => (vars[k] === undefined || vars[k] === null ? '' : String(vars[k])));
}
const num = (v, d = 0) => (typeof v === 'number' && Number.isFinite(v) ? new Intl.NumberFormat(LOCALE, { minimumFractionDigits: d, maximumFractionDigits: d }).format(v) : '—');
const usd = (v) => (typeof v !== 'number' || !Number.isFinite(v) ? '—' : num(v, v < 0.1 ? 3 : 2));
const pctText = (v) => (typeof v === 'number' && Number.isFinite(v) ? `${num(v)}%` : '—');
const frac = (a, b) => (b > 0 && Number.isFinite(a) ? Math.max(0, Math.min(1, a / b)) : 0);
const roomName = (r) => (r ? t('room', { r }) : t('rooms'));

// ---------- DOM helpers (no HTML strings) ----------

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined && text !== null) e.textContent = text;
  return e;
}
function svg(tag, attrs = {}, cls) {
  const e = document.createElementNS(SVGNS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
  if (cls) e.setAttribute('class', cls);
  return e;
}
function setText(e, text) {
  if (e.textContent !== text) e.textContent = text;
}
function setFill(e, v) {
  e.style.setProperty('--v', String(Math.round(v * 1000) / 1000));
}
function clear(e) {
  while (e.firstChild) e.removeChild(e.firstChild);
}
function section(parent, head, cls = '') {
  const s = el('section', `block ${cls}`);
  if (head) s.append(el('h3', 'head', head));
  parent.append(s);
  return s;
}
function bar(cls = '') {
  const b = el('div', `bar ${cls}`);
  const fill = el('span', 'fill');
  b.append(fill);
  return { bar: b, fill };
}

// A person's name: "—" when hidden; a button while the presenter is hiding names (key H).
function nameEl(name, ctx, cls = 'name') {
  if (typeof name !== 'string' || ctx.hidden.has(name)) return el('span', `${cls} anon`, '—');
  if (!ctx.hiding) return el('span', cls, name);
  const b = el('button', `${cls} nick`, name);
  b.type = 'button';
  b.addEventListener('click', () => ctx.hide(name));
  return b;
}

// Shows only the rows of a list that fit in its height (the list is position: relative and overflow: hidden).
function fitRows(list) {
  const h = list.clientHeight;
  const rows = [...list.children];
  for (const r of rows) r.hidden = false;
  const over = rows.map((r) => r.offsetTop + r.offsetHeight > h + 1);
  rows.forEach((r, i) => {
    r.hidden = over[i];
  });
}

// ---------- the top strip (always visible): people on the leaderboard, average cost per person vs US$ 5 ----------

function buildStrip(root) {
  clear(root);
  const a = el('div', 'strip-cell');
  const people = el('span', 'num');
  a.append(el('span', 'label', t('boardPeople')), people);
  const b = el('div', 'strip-cell cost');
  const cost = el('span', 'num');
  const meter = el('div', 'meter');
  const { bar: track, fill } = bar();
  meter.append(track, el('span', 'note', t('costTarget', { n: num(BUDGET) })));
  const line = el('div', 'cost-line');
  line.append(cost, meter);
  b.append(el('span', 'label', t('costHead')), line);
  root.append(a, b);
  return (state, ctx) => {
    const room = ctx.focus || 'all';
    setText(people, num(state.board?.[room]?.people ?? 0));
    const c = state.rooms?.[room]?.cost_avg_usd;
    const budget = state.budget_usd || BUDGET;
    setText(cost, typeof c === 'number' ? num(c, 2) : '—');
    setFill(fill, frac(c || 0, budget));
    b.dataset.tone = c > 2 * budget ? 'red' : c > budget ? 'yellow' : 'green';
  };
}

// ---------- the leaderboard ----------
// mode: 'missions' (each person's missions as squares), 'p1' / 'p2' (the stage reached), 'points' (a points bar).
// The aggregate sorts it (points, then who got there first); the page never ranks by anything else.

function stageTrack(stages, stage, key) {
  const box = el('span', 'stage');
  const segs = el('span', 'segs');
  const step = stageStep(stages, stage);
  stages.forEach((_, i) => segs.append(el('i', `seg${i < step ? ' on' : ''}${i === step - 1 && stage === 'gate' ? ' warn' : ''}${stage === 'approved' ? ' ok' : ''}`)));
  box.append(segs, el('span', `stage-name${step ? '' : ' none'}`, step ? t(`${key}.${stage}`) : t('noStage')));
  return box;
}

function boardBlock(parent, ctx, { mode, max = 30 }) {
  const s = section(parent, null, `main board mode-${mode}`);
  const head = el('div', 'board-head');
  const note = el('span', 'note');
  head.append(el('h3', 'head', t('boardHead')), note);
  const list = el('ol', 'board-list');
  s.append(head, list);
  let key = '';
  return (state) => {
    const b = state.board?.[ctx.focus || 'all'] || {};
    const maxPts = Number(state.max_points) || 0;
    setText(note, t('boardNote', { n: num(b.people ?? 0), max: num(maxPts) }));
    const top = (Array.isArray(b.top) ? b.top : []).slice(0, max);
    const missions = Array.isArray(state.missions) ? state.missions : [];
    const k = JSON.stringify([top, missions, maxPts, ctx.hiding, [...ctx.hidden]]);
    if (k !== key) {
      key = k;
      clear(list);
      if (!top.length) list.append(el('li', 'empty', t('boardEmpty')));
      for (const row of top) {
        const li = el('li', `brow${row.rank <= 3 ? ' podium' : ''}`);
        li.append(el('span', 'rank', num(row.rank)), nameEl(row.name, ctx), el('span', 'room-tag', ROOMS.includes(row.room) ? row.room : '?'));
        if (mode === 'missions') {
          const sq = el('span', 'squares');
          const done = new Set(Array.isArray(row.missions) ? row.missions : []);
          for (const m of missions) sq.append(el('i', `sq${done.has(m) ? ' on' : ''}`));
          li.append(sq);
        } else if (mode === 'p1') li.append(stageTrack(P1_STAGES, row.p1, 'p1Stages'));
        else if (mode === 'p2') li.append(stageTrack(P2_STAGES, row.p2, 'p2Stages'));
        else {
          const { bar: track, fill } = bar('pbar');
          setFill(fill, frac(row.points, maxPts));
          li.append(track);
        }
        li.append(el('span', 'pts', num(row.points)));
        list.append(li);
      }
    }
    fitRows(list);
  };
}

// The milestone feed ("the first of each room"), newest first.
function feedBlock(parent, ctx, n) {
  const f = section(parent, t('feedHead'), 'feed-block');
  const feed = el('ol', 'feed');
  f.append(feed);
  let key = '';
  return (state) => {
    // ?room shows that room's own feed (the aggregate keeps the last few of each room).
    const src = ctx.focus ? state.feed_rooms?.[ctx.focus] : state.feed;
    const items = (Array.isArray(src) ? src : [])
      .filter((it) => !ctx.focus || it.room === ctx.focus)
      .slice(-n)
      .reverse();
    const k = JSON.stringify([items, ctx.hiding, [...ctx.hidden]]);
    if (k === key) return;
    key = k;
    clear(feed);
    if (!items.length) feed.append(el('li', 'empty', t('feedEmpty')));
    for (const it of items) {
      const li = el('li');
      const r = ROOMS.includes(it.room) ? it.room : '?';
      if (typeof it.name === 'string' && !ctx.hidden.has(it.name)) li.append(nameEl(it.name, ctx, 'who'), document.createTextNode(' '), el('span', 'room-tag', r));
      else li.append(el('span', 'who', t('someone', { r })));
      li.append(document.createTextNode(' '), el('span', 'what', feedText(it)));
      feed.append(li);
    }
  };
}

function feedText(it) {
  if (it.kind === 'mission') return t('feed.mission', { m: it.mission, label: t(`missionNames.${it.mission}`) });
  if (it.kind === 'tool') return t('feed.tool', { tpl: it.template || '' });
  if (it.kind === 'swarm') return t('feed.swarm');
  if (it.kind === 'report') return t('feed.report');
  return '';
}

// ---------- the views ----------

function viewHeader(root, v, ctx) {
  const h = el('div', 'view-head');
  h.append(el('h2', 'view-title', `${t(`views.${v}`)} · ${roomName(ctx.focus)}`));
  const status = el('span', 'status');
  h.append(status);
  root.append(h);
  return status;
}

const view = {};

// Opening: how many registered and ready; the names already on the leaderboard (newest first).
view.opening = (root, ctx) => {
  const s = section(root, null, 'counts');
  const row = el('div', 'pair-row');
  const reg = el('div', 'stat');
  const regNum = el('span', 'num huge');
  reg.append(el('span', 'label', t('registeredHead')), regNum, el('span', 'note', t('registeredOf')));
  const ready = el('div', 'stat');
  const readyNum = el('span', 'num huge');
  const readyOf = el('span', 'note');
  ready.append(el('span', 'label', t('readyHead')), readyNum, readyOf);
  row.append(reg, ready);
  s.append(row);
  const n = section(root, null, 'main names');
  const head = el('div', 'board-head');
  head.append(el('h3', 'head', t('namesHead')));
  const list = el('ol', 'board-list names-list');
  n.append(head, list);
  let key = '';
  return (state) => {
    const room = ctx.focus || 'all';
    const r = state.registrations?.[room] || { people: 0, ready: 0, recent: [] };
    setText(regNum, num(r.people ?? 0));
    setText(readyNum, num(r.ready ?? 0));
    setText(readyOf, t('readyOf', { n: num(r.people ?? 0) }));
    // the most recent registrations, newest first (a hidden name comes as null and shows as "—")
    const names = (r.recent || []).map((x) => [x.name, { room: x.room }]);
    const k = JSON.stringify([names, ctx.hiding, [...ctx.hidden]]);
    if (k !== key) {
      key = k;
      clear(list);
      if (!names.length) list.append(el('li', 'empty', t('namesEmpty')));
      for (const [name, v] of names) {
        const li = el('li', 'brow');
        li.append(nameEl(name, ctx), el('span', 'room-tag', v.room));
        list.append(li);
      }
    }
    fitRows(list);
  };
};

// Missions: the room's % per mission and "try it now" (one block); the leaderboard with each person's missions; the feed.
view.missions = (root, ctx) => {
  const s = section(root, t('missionsHead'), 'missions');
  const grid = el('div', 'mgrid');
  s.append(grid);
  const cells = new Map();
  const tryBox = el('div', 'try');
  const tryWhat = el('span', 'try-what');
  tryBox.append(el('span', 'try-label', t('tryNow')), tryWhat);
  s.append(tryBox);
  const board = boardBlock(root, ctx, { mode: 'missions' });
  const feed = feedBlock(root, ctx, ctx.width >= WIDE ? 5 : 3);
  return (state) => {
    const room = state.rooms?.[ctx.focus || 'all'] || {};
    const list = Array.isArray(state.missions) ? state.missions : [];
    if ([...cells.keys()].join() !== list.join()) {
      clear(grid);
      cells.clear();
      for (const m of list) {
        const c = el('div', 'mcell');
        const fill = el('span', 'fill');
        const pct = el('span', 'pct');
        c.append(fill, el('span', 'id', m), pct);
        grid.append(c);
        cells.set(m, { c, fill, pct });
      }
    }
    for (const [m, x] of cells) {
      const p = room.missions?.[m]?.pct ?? 0;
      setFill(x.fill, p / 100);
      setText(x.pct, pctText(p));
      x.c.classList.toggle('least', room.least_done === m);
    }
    const least = room.least_done;
    tryBox.hidden = !least;
    setText(tryWhat, least ? `${least} · ${t(`missionNames.${least}`)}` : '');
    board(state);
    feed(state);
  };
};

const decimals = (step) => (step >= 1 ? 0 : Math.min(3, Math.ceil(-Math.log10(step) - 1e-9)));

// Nice ticks from 0 to at least max.
function ticks(max, target = 4) {
  const raw = Math.max(max, 1e-9) / target;
  const p = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 5, 10].map((k) => k * p).find((s) => s >= raw) || 10 * p;
  const top = Math.max(step, Math.ceil(max / step) * step);
  const out = [];
  for (let v = 0; v <= top + step / 2; v += step) out.push(Math.round(v * 1e6) / 1e6);
  return { top, step, list: out };
}

// Project 1: the anonymous scatter (compact); the leaderboard with each person's stage; the feed on a wide screen.
view.p1 = (root, ctx) => {
  const s = section(root, t('scatterHead'), 'scatter-block');
  const fig = el('figure', 'chart scatter');
  s.append(fig);
  const legend = el('div', 'legend');
  for (const n of [4, 8, 12]) {
    const k = el('span', 'key');
    const g = svg('svg', { viewBox: '0 0 20 20', width: 20, height: 20, 'aria-hidden': 'true' });
    g.append(svg('circle', { cx: 10, cy: 10, r: 9 }, `dot par-${n}`));
    k.append(g, document.createTextNode(String(n)));
    legend.append(k);
  }
  legend.append(el('span', 'key text', t('parallel')));
  for (const [m, shape] of [
    ['Haiku', 'circle'],
    ['Sonnet', 'rect'],
  ]) {
    const k = el('span', 'key');
    const g = svg('svg', { viewBox: '0 0 20 20', width: 20, height: 20, 'aria-hidden': 'true' });
    g.append(shape === 'circle' ? svg('circle', { cx: 10, cy: 10, r: 9 }, 'dot shape') : svg('rect', { x: 2, y: 2, width: 16, height: 16 }, 'dot shape'));
    k.append(g, document.createTextNode(m));
    legend.append(k);
  }
  s.append(legend);
  const board = boardBlock(root, ctx, { mode: 'p1' });
  const feed = ctx.width >= WIDE ? feedBlock(root, ctx, 5) : () => {};
  let chartKey = '';
  return (state) => {
    const points = state.rooms?.[ctx.focus || 'all']?.p1?.points || [];
    const key = JSON.stringify([points, ctx.width]);
    if (key !== chartKey) {
      chartKey = key;
      drawScatter(fig, points, fig.clientWidth || ctx.width, ctx.width >= WIDE);
    }
    board(state);
    feed(state);
  };
};

function drawScatter(fig, points, width, wide) {
  clear(fig);
  const all = points.filter((p) => Number.isFinite(p?.duration_s) && Number.isFinite(p?.cost_usd));
  const w = Math.max(280, Math.round(width));
  const h = wide ? Math.round(Math.min(440, Math.max(300, w * 0.5))) : Math.round(Math.min(260, Math.max(200, w * 0.38)));
  const g = svg('svg', { viewBox: `0 0 ${w} ${h}`, width: w, height: h, role: 'img', 'aria-label': t('scatterHead') });
  fig.append(g);
  const left = 64;
  const right = 16;
  const top = 40;
  const bottom = 40;
  // Without points the axes still show a plausible range (10 min, US$ 2).
  const xs = ticks(all.length ? Math.max(...all.map((p) => p.duration_s / 60), 1) : 10, w > 700 ? 6 : 5);
  const ys = ticks(all.length ? Math.max(...all.map((p) => p.cost_usd), 0.5) : 2, wide ? 4 : 3);
  const X = (min) => left + (min / xs.top) * (w - left - right);
  const Y = (usdV) => h - bottom - (usdV / ys.top) * (h - top - bottom);
  for (const v of ys.list) {
    g.append(svg('line', { x1: left, x2: w - right, y1: Y(v), y2: Y(v) }, v === 0 ? 'axisline' : 'gridline'));
    g.append(Object.assign(svg('text', { x: left - 10, y: Y(v) + 8, 'text-anchor': 'end' }, 'tick'), { textContent: num(v, decimals(ys.step)) }));
  }
  g.append(Object.assign(svg('text', { x: left - 10, y: 18, 'text-anchor': 'end' }, 'tick unit'), { textContent: t('axisUsd') }));
  for (const v of xs.list) {
    if (v === 0) continue;
    g.append(svg('line', { x1: X(v), x2: X(v), y1: h - bottom, y2: h - bottom + 8 }, 'axisline'));
    g.append(Object.assign(svg('text', { x: X(v), y: h - 8, 'text-anchor': v === xs.top ? 'end' : 'middle' }, 'tick'), { textContent: v === xs.top ? `${num(v, decimals(xs.step))} ${t('axisMin')}` : num(v, decimals(xs.step)) }));
  }
  if (!all.length) {
    g.append(Object.assign(svg('text', { x: (left + w - right) / 2, y: (top + h - bottom) / 2, 'text-anchor': 'middle' }, 'empty'), { textContent: t('scatterEmpty') }));
    return;
  }
  for (const p of all) {
    const cx = X(p.duration_s / 60);
    const cy = Y(p.cost_usd);
    const cls = `dot par-${[4, 8, 12].includes(p.parallel) ? p.parallel : 'x'}`;
    g.append(p.model === 'sonnet' ? svg('rect', { x: cx - 8, y: cy - 8, width: 16, height: 16 }, cls) : svg('circle', { cx, cy, r: 9 }, cls));
  }
}

// Project 2: the funnel (compact: who reached each step); the leaderboard with each person's stage; the feed.
view.p2 = (root, ctx) => {
  const f = section(root, t('funnelHead'), 'funnel-block');
  const steps = el('div', 'steps');
  const cells = FUNNEL.map((st) => {
    const c = el('div', 'step');
    const fill = el('span', 'fill');
    const n = el('span', 'n');
    c.append(fill, el('span', 'stage', t(`stages.${st}`)), n);
    steps.append(c);
    return { fill, n };
  });
  f.append(steps);
  const board = boardBlock(root, ctx, { mode: 'p2' });
  const feed = feedBlock(root, ctx, ctx.width >= WIDE ? 5 : 3);
  return (state) => {
    const room = state.rooms?.[ctx.focus || 'all'] || {};
    const fun = room.p2?.funnel || {};
    // The aggregate counts the last step each person reached; a funnel shows who reached at least that step.
    const reached = FUNNEL.map((_, i) => FUNNEL.slice(i).reduce((a, st) => a + (Number(fun[st]) || 0), 0));
    const base = Math.max(room.people || 0, reached[0], 1);
    cells.forEach((x, i) => {
      setFill(x.fill, frac(reached[i], base));
      setText(x.n, num(reached[i]));
    });
    board(state);
    feed(state);
  };
};

// Closing: the 3 "doing better" numbers; the full leaderboard (top 20) with points.
view.closing = (root, ctx) => {
  const b = section(root, t('betterHead'), 'better');
  const row = el('div', 'better-row');
  b.append(row);
  const mk = (label) => {
    const s = el('div', 'stat');
    const n = el('span', 'num');
    s.append(n, el('span', 'label', label));
    row.append(s);
    return n;
  };
  const perGreen = mk(t('perGreen'));
  const greenFirst = mk(t('greenFirst'));
  const haiku = mk(t('haiku'));
  const board = boardBlock(root, ctx, { mode: 'points', max: 20 });
  return (state) => {
    const c = state.rooms?.[ctx.focus || 'all']?.closing || {};
    setText(perGreen, usd(c.cost_per_green_usd));
    setText(greenFirst, pctText(c.green_first_pct));
    setText(haiku, pctText(c.haiku_pct));
    board(state);
  };
};

// ---------- the page ----------

function boot() {
  const opt = readOptions(location.search, navigator.language);
  L = TEXT[opt.lang];
  LOCALE = opt.lang === 'pt' ? 'pt-PT' : 'en';
  document.documentElement.lang = LOCALE;
  document.title = t('title');
  if (opt.lite) document.documentElement.classList.add('lite');
  const strip = document.getElementById('strip');
  const viewRoot = document.getElementById('view');
  const toastEl = document.getElementById('toast');

  let admin = readAdmin();
  const S = { state: null, override: null, hiding: false, hidden: new Set(), seen: new Map(), seq: 0, conn: opt.replay !== null ? 'replay' : 'connecting', replayDone: false, agg: null };
  let built = '';
  let updateStrip = null;
  let updateView = null;
  let statusEl = null;
  let toastTimer = null;

  const ctx = () => ({ focus: opt.room, hiding: S.hiding, hidden: S.hidden, seen: S.seen, hide, width: viewRoot.clientWidth || 600 });

  function toast(text) {
    setText(toastEl, text);
    toastEl.classList.add('on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('on'), 2600);
  }

  function currentView() {
    const p = S.override || S.state?.phase;
    return VIEWS.includes(p) ? p : 'opening';
  }

  function render() {
    const v = currentView();
    const c = ctx();
    const key = `${v}|${Math.round(c.width / 40)}`;
    if (key !== built) {
      built = key;
      updateStrip = buildStrip(strip);
      clear(viewRoot);
      viewRoot.dataset.view = v;
      statusEl = viewHeader(viewRoot, v, c);
      updateView = view[v](viewRoot, c);
    }
    setText(statusEl, S.conn === 'replay' ? (S.replayDone ? t('replayEnd') : t('replay', { x: num(opt.x, opt.x % 1 ? 1 : 0) })) : S.conn === 'offline' ? t('offline') : '');
    statusEl.dataset.tone = S.conn === 'offline' ? 'yellow' : '';
    if (!S.state) {
      if (!viewRoot.querySelector('.waiting')) viewRoot.append(el('p', 'waiting', t('waiting')));
      return;
    }
    viewRoot.querySelector('.waiting')?.remove();
    updateStrip(S.state, c);
    updateView(S.state, c);
  }

  function onState(s) {
    if (!s || typeof s !== 'object' || s.v !== 1 || !s.rooms) return;
    S.state = s;
    S.seq = trackNames(S.seen, s, S.seq);
    render();
  }

  // ----- presenter keys -----
  async function post(path, body) {
    const r = await fetch(`${S.api}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Admin-Token': admin }, body: JSON.stringify(body), cache: 'no-store', referrerPolicy: 'no-referrer' });
    return r.status;
  }

  async function choose(v) {
    const name = t(`views.${v}`);
    if (S.conn === 'replay' || !admin) {
      S.override = v;
      render();
      return toast(t('viewLocal', { v: name }));
    }
    S.override = null;
    if (S.state) S.state = { ...S.state, phase: v };
    render();
    let status = 0;
    try {
      status = await post('/admin/phase', { phase: v });
    } catch {
      status = 0;
    }
    if (status === 200) return toast(t('viewShared', { v: name }));
    if (status === 403) {
      admin = null;
      forgetAdmin();
    }
    S.override = v;
    render();
    toast(status === 403 ? t('adminRefused') : t('viewLocal', { v: name }));
  }

  // The names on screen now: the leaderboard of this page's filter, the Opening's list and the feed.
  function namesOnScreen() {
    const s = S.state || {};
    const names = [...(s.board?.[opt.room || 'all']?.top || []).map((r) => r.name), ...(s.feed || []).map((f) => f.name)];
    if (currentView() === 'opening') names.push(...S.seen.keys());
    return names.filter((n) => typeof n === 'string' && !S.hidden.has(n));
  }

  function setHiding(on) {
    if (S.hiding === on) return;
    if (on && !namesOnScreen().length) return toast(t('noName'));
    S.hiding = on;
    document.documentElement.classList.toggle('hiding', on);
    built = '';
    render();
    if (on) toast(t('hideMode'));
  }

  async function hide(name) {
    S.hidden.add(name);
    if (S.agg) S.agg.hide(name, true);
    S.hiding = false;
    document.documentElement.classList.remove('hiding');
    built = '';
    render();
    toast(t('hidden'));
    if (S.conn !== 'replay' && admin) {
      try {
        await post('/admin/hide', { name, on: true });
      } catch {
        /* hidden on this page anyway */
      }
    }
  }

  addEventListener('keydown', (ev) => {
    if (ev.ctrlKey || ev.metaKey || ev.altKey || ev.repeat) return;
    if (/^[1-5]$/.test(ev.key)) choose(VIEWS[Number(ev.key) - 1]);
    else if (ev.key === '0') {
      S.override = null;
      render();
      toast(t('viewFollow'));
    } else if (ev.key === 'h' || ev.key === 'H') setHiding(!S.hiding);
    else if (ev.key === 'Escape') setHiding(false);
  });
  let resizeTimer = null;
  addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(render, 150);
  });

  render();
  if (opt.replay !== null) startReplay();
  else startLive();

  // ----- live: SSE, falling back to polling /state every 2 s -----
  async function startLive() {
    S.api = await loadApi();
    const streamUrl = `${S.api}/stream${opt.lite ? '?lite=1' : ''}`;
    let es = null;
    let poll = null;
    let retry = null;
    let fallback = null;
    const setConn = (c) => {
      if (S.conn === c) return;
      S.conn = c;
      render();
    };
    const pollOnce = async () => {
      try {
        const r = await fetch(`${S.api}/state`, { cache: 'no-store' });
        if (!r.ok) throw new Error(String(r.status));
        onState(await r.json());
        setConn('poll');
      } catch {
        setConn('offline');
      }
    };
    const startPoll = () => {
      if (poll) return;
      pollOnce();
      poll = setInterval(pollOnce, 2000);
      retry = setInterval(openSSE, 30000);
    };
    const stopPoll = () => {
      clearInterval(poll);
      clearInterval(retry);
      poll = retry = null;
    };
    function openSSE() {
      if (es || typeof EventSource === 'undefined') return typeof EventSource === 'undefined' && startPoll();
      let got = false;
      es = new EventSource(streamUrl);
      es.onmessage = (m) => {
        got = true;
        clearTimeout(fallback);
        stopPoll();
        try {
          onState(JSON.parse(m.data));
        } catch {
          return;
        }
        setConn('live');
      };
      es.onerror = () => {
        clearTimeout(fallback);
        // Before the first message, or when the browser gave up: poll. Otherwise give the reconnect 5 s.
        fallback = setTimeout(
          () => {
            if (es && es.readyState === EventSource.OPEN) return;
            es?.close();
            es = null;
            startPoll();
          },
          got && es.readyState === EventSource.CONNECTING ? 5000 : 0,
        );
      };
    }
    openSSE();
  }

  async function loadApi() {
    try {
      const r = await fetch('config.json', { cache: 'no-store' });
      if (!r.ok) return '';
      const j = await r.json();
      const api = typeof j?.api === 'string' ? j.api.trim().replace(/\/+$/, '') : '';
      return /^https?:\/\/[^\s/]+/.test(api) ? api : '';
    } catch {
      return '';
    }
  }

  // ----- replay: the aggregate runs in the browser and the view follows the agenda -----
  async function startReplay() {
    const name = opt.replay;
    try {
      if (!name) throw new Error('name');
      const [mod, text] = await Promise.all([
        import('./aggregate.mjs'),
        fetch(`replays/${encodeURIComponent(name)}.jsonl`, { cache: 'no-store' }).then((r) => {
          if (!r.ok) throw new Error(String(r.status));
          return r.text();
        }),
      ]);
      let check = (e) => e;
      try {
        const [schema, allow] = await Promise.all([import('./schema.mjs'), fetch('allowlist.json').then((r) => r.json())]);
        check = (e) => schema.checkIncoming(allow, e, e?.ws);
      } catch {
        /* the aggregate ignores anything unexpected anyway */
      }
      const events = [];
      for (const line of text.split('\n')) {
        if (!line.trim()) continue;
        try {
          const e = JSON.parse(line);
          // "register" is the Worker's own record (the name from GitHub), never a laptop event: the allowlist does
          // not know it, so only its few fields are kept.
          const ok = e?.ev === 'register' ? (typeof e.p === 'string' && typeof e.name === 'string' ? { v: 1, ws: e.ws, room: e.room, p: e.p, ev: 'register', t: e.t, name: e.name } : null) : check(e);
          if (ok && Number.isFinite(Date.parse(ok.t))) events.push(ok);
        } catch {
          /* a broken line is skipped */
        }
      }
      events.sort((a, b) => Date.parse(a.t) - Date.parse(b.t));
      if (!events.length) throw new Error('empty');
      const agg = new mod.Aggregate({ ws: events[0].ws });
      for (const n of S.hidden) agg.hide(n, true);
      S.agg = agg;
      const t0 = Date.parse(events[0].t);
      const agendaEnd = t0 + (mod.AGENDA.at(-1)[1] + 3) * 60000;
      const end = Math.max(Date.parse(events.at(-1).t), agendaEnd);
      const start = t0 + opt.at * 60000;
      const wall = performance.now();
      let i = 0;
      const tick = () => {
        const now = Math.min(end, start + (performance.now() - wall) * opt.x);
        while (i < events.length && Date.parse(events[i].t) <= now) agg.apply(events[i++]);
        const minute = (now - t0) / 60000;
        let phase = mod.AGENDA[0][0];
        for (const [p, m] of mod.AGENDA) if (minute >= m) phase = p;
        agg.setPhase(phase);
        S.replayDone = now >= end;
        onState(agg.state(now));
        if (S.replayDone) clearInterval(timer);
      };
      const timer = setInterval(tick, opt.lite ? 1000 : 250);
      tick();
    } catch {
      S.conn = 'offline';
      clear(viewRoot);
      built = '';
      viewRoot.append(el('p', 'waiting', t('replayError', { name: name || '?' })));
    }
  }
}

// The admin token: from the fragment #admin=<token> (never a query string) to sessionStorage, then out of the
// address bar. It is never put in a URL, a log or the DOM.
function readAdmin() {
  let token = null;
  const m = /(?:^#|&)admin=([^&]+)/.exec(location.hash || '');
  if (m) {
    try {
      token = decodeURIComponent(m[1]);
    } catch {
      token = null;
    }
    const rest = location.hash
      .slice(1)
      .split('&')
      .filter((p) => p && !p.startsWith('admin='))
      .join('&');
    history.replaceState(null, '', `${location.pathname}${location.search}${rest ? `#${rest}` : ''}`);
    try {
      if (token) sessionStorage.setItem(ADMIN_KEY, token);
    } catch {
      /* kept in memory only */
    }
  }
  try {
    return sessionStorage.getItem(ADMIN_KEY) || token;
  } catch {
    return token;
  }
}
function forgetAdmin() {
  try {
    sessionStorage.removeItem(ADMIN_KEY);
  } catch {
    /* nothing stored */
  }
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
}
