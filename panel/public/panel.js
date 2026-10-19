// The live panel page (docs/pt/WORKSHOP-V2-SPEC.md, sections 6.1 to 6.3 and 6.8), projected next to the slides.
//
//   /?room=A|B|all           the room this projector highlights (all: both rooms together, for the closing)
//   /?lang=pt|en             the language (default: the browser's; pt for any pt*)
//   /?lite=1                 a slow projector: no animations, one update per second
//   /?replay=<name>&x=<n>    plays replays/<name>.jsonl in the browser at n times real speed (plan B: no API)
//                            &at=<min> starts at that minute of the agenda (rehearsals, screenshots)
//   /#admin=<token>          the presenter's admin token (moved to sessionStorage, removed from the address bar)
//
// Keys: 1-5 = Opening, Missions, Project 1, Project 2, Closing (with the admin token the view of both rooms,
// without it this page only); 0 = follow the shared view again; H then a click on a nickname in the feed hides it.
//
// Rules: the DOM is built with createElement/textContent (strict CSP: no inline scripts or styles, no HTML from
// strings); it shows coverage and quality, never raw volumes and never a ranking of people; nicknames appear only in
// the milestone feed, and hidden ones never. Every text is in TEXT below, with the same keys in pt and en.

export const VIEWS = ['opening', 'missions', 'p1', 'p2', 'closing'];
const ROOMS = ['A', 'B'];
const BUDGET = 5;

export const TEXT = {
  pt: {
    title: 'Painel do workshop',
    room: 'Sala {r}',
    rooms: 'Salas A e B',
    activeHead: 'Ativas agora',
    costHead: 'Custo médio por pessoa',
    costTarget: 'alvo US$ {n}',
    views: { opening: 'Abertura', missions: 'Missões', p1: 'Projeto 1', p2: 'Projeto 2', closing: 'Fecho' },
    readyHead: 'Prontas para começar',
    readyOf: 'de {n} ligadas',
    missionsHead: 'O que a sala já fez',
    tryNow: 'Experimenta agora',
    feedHead: 'Os primeiros de cada sala',
    feedEmpty: 'Ainda sem marcos.',
    someone: 'Alguém na sala {r}',
    feed: {
      mission: 'estreou a {m} · {name}',
      tool: 'inventou a primeira ferramenta ({tpl})',
      swarm: 'acabou o primeiro swarm',
      report: 'fechou a primeira issue',
    },
    missionNames: { M1: 'plan mode', M2: '/model haiku', M3: 'subagente', M4: 'skill', M5: 'hook', M6: '/loop', M7: '/btw', M8: 'statusline', M9: 'claude -p', M10: 'memória' },
    scatterHead: 'Tempo do swarm × custo do Projeto 1',
    scatterEmpty: 'À espera do primeiro swarm.',
    axisMin: 'min',
    axisUsd: 'US$',
    parallel: 'em paralelo',
    forecast: 'Previsto',
    actual: 'Real',
    medianHead: 'Mediana do swarm',
    minutes: '{n} min',
    specsHead: 'Specs corrigidas',
    specsOf: 'de {n} swarms acabados',
    funnelHead: 'Pessoas que já chegaram a cada passo',
    stages: { intake: 'intake', plan: 'plan', swarm: 'swarm', gate: 'gate', report: 'report' },
    histHead: 'Agentes escolhidos pelo planner',
    histEmpty: 'À espera do primeiro plano.',
    histUnit: 'agentes',
    closedHead: 'Issues fechadas',
    closedOf: 'de {n} pessoas',
    betterHead: 'Fazer melhor',
    perGreen: 'por tarefa verde',
    greenFirst: 'das tarefas verdes à primeira',
    haiku: 'do custo em Haiku',
    coverageHead: 'Cobertura média das missões',
    agents: 'agentes lançados',
    replay: 'replay ×{x}',
    replayEnd: 'replay acabou',
    offline: 'sem ligação, a tentar',
    waiting: 'À espera de dados…',
    replayError: 'Não consegui abrir o replay {name}.',
    viewShared: 'Vista {v} nas duas salas',
    viewLocal: 'Vista {v} só nesta página (0 volta à partilhada)',
    viewFollow: 'A seguir a vista partilhada',
    adminRefused: 'Token de admin recusado: a vista mudou só aqui',
    hideMode: 'Clica numa alcunha para a esconder (Esc cancela)',
    hidden: 'Alcunha escondida',
    noNick: 'Não há alcunhas no feed',
  },
  en: {
    title: 'Workshop panel',
    room: 'Room {r}',
    rooms: 'Rooms A and B',
    activeHead: 'Active now',
    costHead: 'Average cost per person',
    costTarget: 'target US$ {n}',
    views: { opening: 'Opening', missions: 'Missions', p1: 'Project 1', p2: 'Project 2', closing: 'Closing' },
    readyHead: 'Ready to start',
    readyOf: 'of {n} connected',
    missionsHead: 'What the room can already do',
    tryNow: 'Try it now',
    feedHead: 'Firsts in each room',
    feedEmpty: 'No milestones yet.',
    someone: 'Someone in room {r}',
    feed: {
      mission: 'was first to finish {m} · {name}',
      tool: 'invented the first tool ({tpl})',
      swarm: 'finished the first swarm',
      report: 'closed the first issue',
    },
    missionNames: { M1: 'plan mode', M2: '/model haiku', M3: 'subagent', M4: 'skill', M5: 'hook', M6: '/loop', M7: '/btw', M8: 'statusline', M9: 'claude -p', M10: 'memory' },
    scatterHead: 'Swarm time × Project 1 cost',
    scatterEmpty: 'Waiting for the first swarm.',
    axisMin: 'min',
    axisUsd: 'US$',
    parallel: 'in parallel',
    forecast: 'Forecast',
    actual: 'Actual',
    medianHead: 'Median swarm',
    minutes: '{n} min',
    specsHead: 'Specs fixed',
    specsOf: 'of {n} finished swarms',
    funnelHead: 'People who reached each step',
    stages: { intake: 'intake', plan: 'plan', swarm: 'swarm', gate: 'gate', report: 'report' },
    histHead: 'Agents the planner chose',
    histEmpty: 'Waiting for the first plan.',
    histUnit: 'agents',
    closedHead: 'Issues closed',
    closedOf: 'of {n} people',
    betterHead: 'Doing better',
    perGreen: 'per green task',
    greenFirst: 'of the tasks green at the first try',
    haiku: 'of the cost in Haiku',
    coverageHead: 'Average mission coverage',
    agents: 'agents launched',
    replay: 'replay ×{x}',
    replayEnd: 'replay finished',
    offline: 'offline, retrying',
    waiting: 'Waiting for data…',
    replayError: 'Could not open the replay {name}.',
    viewShared: '{v} view in both rooms',
    viewLocal: '{v} view on this page only (0 goes back to the shared one)',
    viewFollow: 'Following the shared view',
    adminRefused: 'Admin token refused: the view changed here only',
    hideMode: 'Click a nickname to hide it (Esc cancels)',
    hidden: 'Nickname hidden',
    noNick: 'There are no nicknames in the feed',
  },
};

const STAGES = ['intake', 'plan', 'swarm', 'gate', 'report'];
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

// A row per room: the tag, a number and a bar with a note. focus = the room this projector highlights (null = both
// the same size). Returns update(values) with values[room] = {value, frac, note, tone}.
function roomRows(parent, focus, cls = '') {
  const order = focus ? [focus, ROOMS.find((r) => r !== focus)] : ROOMS;
  const box = el('div', `rows ${cls}`);
  const rows = order.map((r) => {
    const row = el('div', `row ${focus && r !== focus ? 'small' : 'big'}`);
    const tag = el('span', 'tag', roomName(r));
    const value = el('span', 'num');
    const meter = el('div', 'meter');
    const bar = el('div', 'bar');
    const fill = el('span', 'fill');
    bar.append(fill);
    const note = el('span', 'note');
    meter.append(bar, note);
    row.append(tag, value, meter);
    box.append(row);
    return { r, row, value, fill, note };
  });
  parent.append(box);
  return (values) => {
    for (const x of rows) {
      const v = values[x.r] || {};
      setText(x.value, v.value ?? '—');
      setFill(x.fill, v.frac || 0);
      setText(x.note, v.note || '');
      x.row.dataset.tone = v.tone || 'green';
    }
  };
}

function section(parent, head, cls = '') {
  const s = el('section', `block ${cls}`);
  if (head) s.append(el('h3', 'head', head));
  parent.append(s);
  return s;
}

// ---------- the top strip (always visible) ----------

function buildStrip(root, ctx) {
  clear(root);
  const head = el('div', 'strip-head');
  head.append(el('span', 'tag'), el('span', 'label', t('activeHead')), el('span', 'label wide', t('costHead')));
  root.append(head);
  const order = ctx.focus ? [ctx.focus, ROOMS.find((r) => r !== ctx.focus)] : ROOMS;
  const rows = order.map((r, i) => {
    const row = el('div', `strip-row ${ctx.focus && r !== ctx.focus ? 'small' : 'big'}`);
    const active = el('span', 'num');
    const cost = el('span', 'num');
    const bar = el('div', 'bar');
    const fill = el('span', 'fill');
    bar.append(fill);
    const meter = el('div', 'meter');
    meter.append(bar);
    if (i === 0) meter.append(el('span', 'note', t('costTarget', { n: num(BUDGET) })));
    row.append(el('span', 'tag', roomName(r)), active, cost, meter);
    root.append(row);
    return { r, row, active, cost, fill };
  });
  return (state) => {
    for (const x of rows) {
      const s = state.rooms?.[x.r] || {};
      setText(x.active, num(s.active));
      const c = s.cost_avg_usd;
      setText(x.cost, typeof c === 'number' ? num(c, 2) : '—');
      setFill(x.fill, frac(c || 0, state.budget_usd || BUDGET));
      x.row.dataset.tone = c > 2 * (state.budget_usd || BUDGET) ? 'red' : c > (state.budget_usd || BUDGET) ? 'yellow' : 'green';
    }
  };
}

// ---------- the views ----------

function viewHeader(root, view, ctx) {
  const h = el('div', 'view-head');
  h.append(el('h2', 'view-title', `${t(`views.${view}`)} · ${roomName(ctx.focus)}`));
  const status = el('span', 'status');
  h.append(status);
  root.append(h);
  return status;
}

const view = {};

view.opening = (root, ctx) => {
  const s = section(root, t('readyHead'), 'opening');
  const rows = roomRows(s, ctx.focus, 'huge');
  return (state) => {
    const v = {};
    for (const r of ROOMS) {
      const x = state.rooms?.[r] || {};
      v[r] = { value: num(x.ready), frac: frac(x.ready, x.people), note: t('readyOf', { n: num(x.people) }) };
    }
    rows(v);
  };
};

view.missions = (root, ctx) => {
  const s = section(root, t('missionsHead'), 'missions');
  const grid = el('div', 'grid');
  s.append(grid);
  const cells = new Map();
  const tryBox = el('div', 'try');
  const tryLabel = el('span', 'try-label', t('tryNow'));
  const tryWhat = el('span', 'try-what');
  tryBox.append(tryLabel, tryWhat);
  s.append(tryBox);
  const f = section(root, t('feedHead'), 'feed-block');
  const feed = el('ol', 'feed');
  f.append(feed);
  let feedKey = '';
  return (state) => {
    const room = state.rooms?.[ctx.focus || 'all'] || {};
    const other = ctx.focus ? state.rooms?.[ROOMS.find((r) => r !== ctx.focus)] : null;
    const list = Array.isArray(state.missions) ? state.missions : [];
    if ([...cells.keys()].join() !== list.join()) {
      clear(grid);
      cells.clear();
      for (const m of list) {
        const c = el('div', 'mcell');
        const fill = el('span', 'fill');
        const id = el('span', 'id', m);
        const pct = el('span', 'pct');
        const o = el('span', 'other');
        c.append(fill, id, pct, o);
        grid.append(c);
        cells.set(m, { c, fill, pct, o });
      }
    }
    for (const [m, x] of cells) {
      const p = room.missions?.[m]?.pct ?? 0;
      setFill(x.fill, p / 100);
      setText(x.pct, pctText(p));
      setText(x.o, other ? `${ctx.other} ${pctText(other.missions?.[m]?.pct ?? 0)}` : '');
      x.c.classList.toggle('least', room.least_done === m);
    }
    const least = room.least_done;
    tryBox.hidden = !least;
    setText(tryWhat, least ? `${least} · ${t(`missionNames.${least}`)}` : '');
    const items = (Array.isArray(state.feed) ? state.feed : []).slice(-5).reverse();
    const key = JSON.stringify([items, ctx.hiding]);
    if (key === feedKey) return;
    feedKey = key;
    clear(feed);
    if (!items.length) feed.append(el('li', 'empty', t('feedEmpty')));
    for (const it of items) {
      const li = el('li');
      const nick = typeof it.nickname === 'string' && !ctx.hidden.has(it.nickname) ? it.nickname : null;
      const r = ROOMS.includes(it.room) ? it.room : '?';
      if (nick && ctx.hiding) {
        const b = el('button', 'who nick', `${nick} (${r})`);
        b.type = 'button';
        b.addEventListener('click', () => ctx.hide(nick));
        li.append(b);
      } else li.append(el('span', 'who', nick ? `${nick} (${r})` : t('someone', { r })));
      li.append(document.createTextNode(' '), el('span', 'what', feedText(it)));
      feed.append(li);
    }
  };
};

function feedText(it) {
  if (it.kind === 'mission') return t('feed.mission', { m: it.mission, name: t(`missionNames.${it.mission}`) });
  if (it.kind === 'tool') return t('feed.tool', { tpl: it.template || '' });
  if (it.kind === 'swarm') return t('feed.swarm');
  if (it.kind === 'report') return t('feed.report');
  return '';
}

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
  if (ctx.focus) {
    // the other room's points are dimmed
    const k = el('span', 'key');
    const g = svg('svg', { viewBox: '0 0 20 20', width: 20, height: 20, 'aria-hidden': 'true' });
    g.append(svg('circle', { cx: 10, cy: 10, r: 9 }, 'dot par-12 dim'));
    k.append(g, document.createTextNode(roomName(ctx.other)));
    legend.append(k);
  }
  s.append(legend);

  const pair = section(root, t('medianHead'), 'pair');
  const pairRow = el('div', 'pair-row');
  const fc = el('div', 'stat');
  const fcNum = el('span', 'num');
  fc.append(fcNum, el('span', 'label', t('forecast')));
  const ac = el('div', 'stat');
  const acNum = el('span', 'num');
  ac.append(acNum, el('span', 'label', t('actual')));
  pairRow.append(fc, ac);
  pair.append(pairRow);

  const sp = section(root, t('specsHead'), 'specs');
  const spRow = el('div', 'stat inline');
  const spNum = el('span', 'num');
  const spOf = el('span', 'label');
  spRow.append(spNum, spOf);
  sp.append(spRow);

  let chartKey = '';
  return (state) => {
    const room = state.rooms?.[ctx.focus || 'all'] || {};
    const p1 = room.p1 || {};
    setText(fcNum, typeof p1.forecast_median_min === 'number' ? t('minutes', { n: num(p1.forecast_median_min, p1.forecast_median_min % 1 ? 1 : 0) }) : '—');
    setText(acNum, typeof p1.actual_median_min === 'number' ? t('minutes', { n: num(p1.actual_median_min, 1) }) : '—');
    setText(spNum, num(p1.specs_fixed));
    setText(spOf, t('specsOf', { n: num(p1.swarm_done) }));
    // The scatter: this room on top, the other one dimmed (both full in the room=all view).
    const mine = (ctx.focus ? state.rooms?.[ctx.focus]?.p1?.points : state.rooms?.all?.p1?.points) || [];
    const others = ctx.focus ? state.rooms?.[ctx.other]?.p1?.points || [] : [];
    const key = JSON.stringify([mine, others, ctx.width]);
    if (key === chartKey) return;
    chartKey = key;
    drawScatter(fig, mine, others, fig.clientWidth || ctx.width);
  };
};

function drawScatter(fig, mine, others, width) {
  clear(fig);
  const all = [...mine, ...others].filter((p) => Number.isFinite(p?.duration_s) && Number.isFinite(p?.cost_usd));
  const w = Math.max(280, Math.round(width));
  const h = Math.round(Math.min(460, Math.max(300, w * 0.54)));
  const g = svg('svg', { viewBox: `0 0 ${w} ${h}`, width: w, height: h, role: 'img', 'aria-label': t('scatterHead') });
  fig.append(g);
  const left = 64;
  const right = 16;
  const top = 60;
  const bottom = 44;
  // Without points the axes still show a plausible range (10 min, US$ 2).
  const xs = ticks(all.length ? Math.max(...all.map((p) => p.duration_s / 60), 1) : 10, w > 700 ? 6 : 5);
  const ys = ticks(all.length ? Math.max(...all.map((p) => p.cost_usd), 0.5) : 2, 4);
  const X = (min) => left + (min / xs.top) * (w - left - right);
  const Y = (usdV) => h - bottom - (usdV / ys.top) * (h - top - bottom);
  for (const v of ys.list) {
    g.append(svg('line', { x1: left, x2: w - right, y1: Y(v), y2: Y(v) }, v === 0 ? 'axisline' : 'gridline'));
    g.append(Object.assign(svg('text', { x: left - 10, y: Y(v) + 8, 'text-anchor': 'end' }, 'tick'), { textContent: num(v, decimals(ys.step)) }));
  }
  g.append(Object.assign(svg('text', { x: left - 10, y: 24, 'text-anchor': 'end' }, 'tick unit'), { textContent: t('axisUsd') }));
  for (const v of xs.list) {
    if (v === 0) continue;
    g.append(svg('line', { x1: X(v), x2: X(v), y1: h - bottom, y2: h - bottom + 8 }, 'axisline'));
    g.append(Object.assign(svg('text', { x: X(v), y: h - 10, 'text-anchor': v === xs.top ? 'end' : 'middle' }, 'tick'), { textContent: v === xs.top ? `${num(v, decimals(xs.step))} ${t('axisMin')}` : num(v, decimals(xs.step)) }));
  }
  if (!all.length) {
    g.append(Object.assign(svg('text', { x: (left + w - right) / 2, y: (top + h - bottom) / 2, 'text-anchor': 'middle' }, 'empty'), { textContent: t('scatterEmpty') }));
    return;
  }
  const draw = (p, dim) => {
    const cx = X(p.duration_s / 60);
    const cy = Y(p.cost_usd);
    const cls = `dot par-${[4, 8, 12].includes(p.parallel) ? p.parallel : 'x'}${dim ? ' dim' : ''}`;
    g.append(p.model === 'sonnet' ? svg('rect', { x: cx - 8, y: cy - 8, width: 16, height: 16 }, cls) : svg('circle', { cx, cy, r: 9 }, cls));
  };
  for (const p of others) draw(p, true);
  for (const p of mine) draw(p, false);
}

view.p2 = (root, ctx) => {
  const f = section(root, t('funnelHead'), 'funnel-block');
  const funnel = el('div', 'funnel');
  const rows = STAGES.map((st) => {
    const row = el('div', 'frow');
    const bar = el('div', 'bar');
    const fill = el('span', 'fill');
    bar.append(fill);
    const n = el('span', 'n');
    row.append(el('span', 'stage', t(`stages.${st}`)), bar, n);
    funnel.append(row);
    return { fill, n };
  });
  f.append(funnel);
  const hs = section(root, t('histHead'), 'hist-block');
  const fig = el('figure', 'chart hist');
  hs.append(fig);
  const cs = section(root, t('closedHead'), 'closed');
  const closed = roomRows(cs, ctx.focus);
  let histKey = '';
  return (state) => {
    const room = state.rooms?.[ctx.focus || 'all'] || {};
    const fun = room.p2?.funnel || {};
    // The aggregate counts the last step each person reached; a funnel shows who reached at least that step.
    const reached = STAGES.map((_, i) => STAGES.slice(i).reduce((a, st) => a + (Number(fun[st]) || 0), 0));
    const base = Math.max(room.people || 0, reached[0], 1);
    rows.forEach((x, i) => {
      setFill(x.fill, frac(reached[i], base));
      setText(x.n, num(reached[i]));
    });
    const hist = room.p2?.agents_hist || {};
    const key = JSON.stringify([hist, ctx.width]);
    if (key !== histKey) {
      histKey = key;
      drawHist(fig, hist, fig.clientWidth || ctx.width);
    }
    const v = {};
    for (const r of ROOMS) {
      const x = state.rooms?.[r] || {};
      v[r] = { value: num(x.p2?.closed), frac: frac(x.p2?.closed, x.people), note: t('closedOf', { n: num(x.people) }) };
    }
    closed(v);
  };
};

function drawHist(fig, hist, width) {
  clear(fig);
  const keys = Object.keys(hist)
    .map(Number)
    .filter((k) => Number.isInteger(k) && k >= 0 && k <= 100);
  const w = Math.max(280, Math.round(width));
  const h = 230;
  const g = svg('svg', { viewBox: `0 0 ${w} ${h}`, width: w, height: h, role: 'img', 'aria-label': t('histHead') });
  fig.append(g);
  if (!keys.length) {
    g.append(Object.assign(svg('text', { x: w / 2, y: h / 2, 'text-anchor': 'middle' }, 'empty'), { textContent: t('histEmpty') }));
    return;
  }
  const lo = Math.min(...keys);
  const hi = Math.max(...keys);
  const bins = [];
  for (let k = lo; k <= hi; k++) bins.push([k, Number(hist[k]) || 0]);
  const max = Math.max(...bins.map((b) => b[1]), 1);
  const top = 34;
  const bottom = 40;
  const gap = 12;
  const unitW = 110;
  const bw = Math.min(90, (w - unitW - gap * bins.length) / bins.length);
  bins.forEach(([k, n], i) => {
    const x = i * (bw + gap);
    const bh = ((h - top - bottom) * n) / max;
    g.append(svg('rect', { x, y: h - bottom - bh, width: bw, height: Math.max(bh, n ? 2 : 0) }, 'hbar'));
    g.append(Object.assign(svg('text', { x: x + bw / 2, y: h - bottom - bh - 8, 'text-anchor': 'middle' }, 'tick value'), { textContent: num(n) }));
    g.append(Object.assign(svg('text', { x: x + bw / 2, y: h - 10, 'text-anchor': 'middle' }, 'tick'), { textContent: num(k) }));
  });
  g.append(Object.assign(svg('text', { x: bins.length * (bw + gap) + 4, y: h - 10 }, 'tick unit'), { textContent: t('histUnit') }));
}

view.closing = (root, ctx) => {
  const b = section(root, t('betterHead'), 'better');
  const mk = (label) => {
    const row = el('div', 'stat inline');
    const n = el('span', 'num');
    row.append(n, el('span', 'label', label));
    b.append(row);
    return n;
  };
  const perGreen = mk(t('perGreen'));
  const greenFirst = mk(t('greenFirst'));
  const haiku = mk(t('haiku'));
  const cs = section(root, t('coverageHead'), 'coverage');
  const cov = roomRows(cs, ctx.focus);
  const as = section(root, null, 'agents');
  const ar = el('div', 'stat inline');
  const an = el('span', 'num');
  ar.append(an, el('span', 'label', t('agents')));
  as.append(ar);
  return (state) => {
    const room = state.rooms?.[ctx.focus || 'all'] || {};
    const c = room.closing || {};
    setText(perGreen, typeof c.cost_per_green_usd === 'number' ? `US$ ${usd(c.cost_per_green_usd)}` : '—');
    setText(greenFirst, pctText(c.green_first_pct));
    setText(haiku, pctText(c.haiku_pct));
    setText(an, num(c.agents_launched));
    const v = {};
    for (const r of ROOMS) {
      const x = state.rooms?.[r] || {};
      const p = typeof x.coverage_avg === 'number' ? x.coverage_avg * 100 : null;
      v[r] = { value: pctText(p === null ? null : Math.round(p)), frac: (p || 0) / 100 };
    }
    cov(v);
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
  const S = { state: null, override: null, hiding: false, hidden: new Set(), conn: opt.replay !== null ? 'replay' : 'connecting', replayDone: false, agg: null };
  let built = '';
  let updateStrip = null;
  let updateView = null;
  let statusEl = null;
  let toastTimer = null;

  const ctx = () => ({ focus: opt.room, other: opt.room ? ROOMS.find((r) => r !== opt.room) : null, hiding: S.hiding, hidden: S.hidden, hide, width: viewRoot.clientWidth || 600 });

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
      updateStrip = buildStrip(strip, c);
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
    updateStrip(S.state);
    updateView(S.state, c);
  }

  function onState(s) {
    if (!s || typeof s !== 'object' || s.v !== 1 || !s.rooms) return;
    S.state = s;
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

  function setHiding(on) {
    if (S.hiding === on) return;
    if (on && !(S.state?.feed || []).some((f) => typeof f.nickname === 'string' && !S.hidden.has(f.nickname))) return toast(t('noNick'));
    S.hiding = on;
    document.documentElement.classList.toggle('hiding', on);
    built = '';
    render();
    if (on) toast(t('hideMode'));
  }

  async function hide(nick) {
    S.hidden.add(nick);
    if (S.agg) S.agg.hide(nick, true);
    S.hiding = false;
    document.documentElement.classList.remove('hiding');
    built = '';
    render();
    toast(t('hidden'));
    if (S.conn !== 'replay' && admin) {
      try {
        await post('/admin/hide', { nickname: nick, on: true });
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
          const e = check(JSON.parse(line));
          if (e && Number.isFinite(Date.parse(e.t))) events.push(e);
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
