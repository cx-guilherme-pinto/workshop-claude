#!/usr/bin/env node
// The workshop panel on this computer (docs/pt/WORKSHOP-V2-SPEC.md, section 6; D-34):
//
//   node ~/.workshop-claude/kit/telemetry/ctl.mjs register   registers you on the panel's leaderboard (workshop-register)
//   node ctl.mjs unregister                                   stops sending anything to the panel (the local data stays)
//   node ctl.mjs register --again                             back on the panel after an unregister
//   node ctl.mjs status                                       registration, workshop, events
//   node ctl.mjs show                                         the last 20 events, exactly as they leave
//
// register (the setup runs it after the GitHub login, step 6), D-34: no token and no email ever leave this computer.
// It asks gh (which keeps its own token) for the account (`gh api user`) and its emails (`gh api user/emails`, the
// user:email scope), checks HERE that one of the verified emails is of the company domain (config.json email_domain),
// and sends the panel only the name of the account and a SHA-256 of the workshop code and the account id
// (so the same account keeps its place). The panel answers with a participant id and a credential (an HMAC signature),
// kept in config.json: that signature is all that goes with the events afterwards. The mission book works without it.
import { spawnSync } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { isMain } from '../orchestrator/lib/is-main.mjs';
import { lingua, textos } from '../hooks/lib/language.mjs';
import { active, backfill, paths, readConfig, readLines, record, writeJson } from './lib.mjs';

const T = textos(
  {
    pt: {
      semConfig: 'A telemetria do workshop não está instalada (corre o setup do kit).',
      expirou: 'A configuração expirou em {data}: o kit já não grava nem envia nada.',
      registado: 'Registado no painel como {nome}.',
      naoRegistado: 'Ainda não estás registado no painel. Corre: workshop-register',
      semPainel: 'Este kit não tem o endereço do painel (PANEL_URL no repos.conf).',
      semGh: 'O gh não tem sessão iniciada no github.com: corre  gh auth login  e volta a correr  workshop-register.',
      escopo: 'O gh não pode ler os emails da tua conta. Corre  gh auth refresh -h github.com -s user:email  (abre o browser) e volta a correr  workshop-register.',
      dominio: 'A tua conta GitHub não tem um email verificado @{dominio}. Junta-o e confirma-o em https://github.com/settings/emails e volta a correr  workshop-register. Fazes o workshop igual; só não apareces no painel.',
      rede: 'Não consegui chegar ao painel ({motivo}). Tenta outra rede (a do evento ou um hotspot) e volta a correr  workshop-register.',
      workshop: 'Workshop: {ws} · expira em {data}',
      contagem: 'Eventos na caderneta local: {local} · à espera de envio: {fila}',
      nada: 'Ainda não há eventos enviados.',
      mostrar: 'Os últimos {n} eventos, exatamente como saem do teu computador:',
      saiu: 'Saíste do painel: o kit não envia mais nada. A caderneta de missões e os teus dados locais ficam. Para voltar: workshop-register --again',
      fora: 'Saíste do painel em {data} (unregister): nada é enviado. Para voltar: workshop-register --again',
      renovar: 'O painel foi limpo (um dia novo): o registo é refeito sozinho na próxima vez que usares o Claude, e o que fizeste hoje volta ao painel. Também podes correr: workshop-register',
      uso: 'Uso: ctl.mjs register [--again] | unregister | status | show',
    },
    en: {
      semConfig: 'The workshop telemetry is not installed (run the kit setup).',
      expirou: 'The configuration expired on {data}: the kit no longer records or sends anything.',
      registado: 'Registered on the panel as {nome}.',
      naoRegistado: 'You are not registered on the panel yet. Run: workshop-register',
      semPainel: 'This kit has no panel address (PANEL_URL in repos.conf).',
      semGh: 'gh is not logged in to github.com: run  gh auth login  and then  workshop-register  again.',
      escopo: 'gh cannot read your account\'s emails. Run  gh auth refresh -h github.com -s user:email  (it opens the browser) and then  workshop-register  again.',
      dominio: 'Your GitHub account has no verified @{dominio} email. Add it and confirm it at https://github.com/settings/emails, then run  workshop-register  again. You do the workshop all the same; you just do not appear on the panel.',
      rede: 'I could not reach the panel ({motivo}). Try another network (the event\'s or a hotspot) and run  workshop-register  again.',
      workshop: 'Workshop: {ws} · expires on {data}',
      contagem: 'Events in the local book: {local} · waiting to be sent: {fila}',
      nada: 'No events sent yet.',
      mostrar: 'The last {n} events, exactly as they leave your computer:',
      saiu: 'You left the panel: the kit sends nothing more. Your mission book and your local data stay. To come back: workshop-register --again',
      fora: 'You left the panel on {data} (unregister): nothing is sent. To come back: workshop-register --again',
      renovar: 'The panel was cleared (a new day): you are registered again by yourself the next time you use Claude, and what you did today goes back to the panel. You can also run: workshop-register',
      uso: 'Usage: ctl.mjs register [--again] | unregister | status | show',
    },
  },
  lingua(),
);

const fmt = (s, v = {}) => s.replace(/\{(\w+)\}/g, (_, k) => v[k] ?? '');
const day = (iso) => (iso ? String(iso).slice(0, 10) : '-');

// Runs gh (it uses its own login; no token passes through this script).
export function runGh(args, env = process.env) {
  const r = spawnSync(env.WORKSHOP_GH || 'gh', args, { encoding: 'utf8', env, windowsHide: true, timeout: 20000 });
  return { status: r.error ? -1 : r.status, stdout: String(r.stdout || ''), stderr: String(r.stderr || '') };
}

// The GitHub account as gh sees it: { id, name } and its verified emails, or { error: 'gh' | 'scope' }.
export function githubAccount(gh = runGh) {
  const u = gh(['api', '--hostname', 'github.com', 'user']);
  if (u.status !== 0) return { error: 'gh' };
  let user;
  try {
    user = JSON.parse(u.stdout);
  } catch {
    return { error: 'gh' };
  }
  const e = gh(['api', '--hostname', 'github.com', 'user/emails']);
  if (e.status !== 0) return { error: /HTTP 40[34]|scope|user:email/i.test(e.stderr + e.stdout) ? 'scope' : 'gh' };
  let emails = [];
  try {
    emails = JSON.parse(e.stdout);
  } catch {
    return { error: 'gh' };
  }
  return { id: user.id, name: user.name || user.login, emails: Array.isArray(emails) ? emails : [] };
}

// Exit codes: 0 registered · 3 not a company account · 4 gh missing/without the email scope · 5 network · 6 the
// person left the panel (unregister) and did not say --again: the setup's own register (step 8) never brings them
// back by itself. An old room argument (A|B, before D-34 dropped the rooms) is accepted and ignored.
export async function register(_room, { P = paths(), print = console.log, fetchImpl = fetch, account = () => githubAccount(), now = new Date(), again = false } = {}) {
  const cfg = readConfig(P);
  if (!cfg) return print(T.semConfig), 1;
  if (cfg.unregistered_at && !again) return print(fmt(T.fora, { data: day(cfg.unregistered_at) })), 6;
  if (!active(cfg, now)) return print(fmt(T.expirou, { data: day(cfg.expires_at) })), 1;
  if (!cfg.panel_url) return print(T.semPainel), 5;
  const acc = account();
  if (acc.error) return print(fmt(acc.error === 'scope' ? T.escopo : T.semGh)), 4;
  const domain = String(cfg.email_domain || '').toLowerCase();
  const ok = acc.emails.some((m) => m?.verified === true && typeof m.email === 'string' && domain && m.email.toLowerCase().endsWith('@' + domain));
  if (!ok) return print(fmt(T.dominio, { dominio: domain || '?' })), 3;
  // only the name and a hash of the workshop code and the account id leave this computer
  const body = { name: String(acc.name || '').slice(0, 60), account: createHash('sha256').update(`${cfg.workshop}:${acc.id}`).digest('hex') };
  let r;
  try {
    r = await fetchImpl(`${cfg.panel_url.replace(/\/+$/, '')}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Workshop-Code': cfg.workshop },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    });
  } catch (e) {
    return print(fmt(T.rede, { motivo: e?.name === 'TimeoutError' ? 'timeout' : 'sem ligação' })), 5;
  }
  const j = await r.json().catch(() => ({}));
  if (r.status === 200 && /^[0-9a-f]{32}$/.test(j.p || '') && j.credential) {
    const { room: _old, unregistered_at: _left, needs_register: _wiped, ...rest } = cfg;
    writeJson(P.config, { ...rest, enabled: true, participant: { p: j.p, credential: j.credential, name: j.name, registered_at: now.toISOString() } });
    // what was done before registering (or before the midnight wipe) goes to the panel too, with its own time
    backfill({ P, now });
    record('join', { lang: lingua(), os: process.platform === 'win32' ? 'win' : 'mac' }, { P, now });
    return print(fmt(T.registado, { nome: j.name })), 0;
  }
  return print(fmt(T.rede, { motivo: `HTTP ${r.status}` })), 5;
}

// Leaves the panel (D-34, the organizer's request: "so that nothing more is sent, for safety"): the credential and
// the events still waiting to leave are deleted, and the config says so (unregistered_at), so that neither the hooks
// nor a new run of the setup send or register again. The local book (local.jsonl, missions.json, sent.jsonl) stays:
// the missions and /missions keep working. What the panel already has is deleted at midnight like everything else.
export async function unregister({ P = paths(), print = console.log, now = new Date() } = {}) {
  const cfg = readConfig(P);
  if (!cfg) return print(T.semConfig), 1;
  // a sender running right now finishes its batch first (at most a few seconds)
  for (let i = 0; i < 50 && existsSync(P.sendLock); i++) await new Promise((ok) => setTimeout(ok, 100));
  writeJson(P.config, { ...cfg, enabled: false, participant: null, unregistered_at: now.toISOString() });
  for (const f of [P.queue, P.sending]) rmSync(f, { force: true });
  return print(T.saiu), 0;
}

export async function ctl(args, { P = paths(), print = console.log, now = new Date(), ...rest } = {}) {
  const [cmd = 'status', arg] = args;
  const cfg = readConfig(P);
  if (!cfg) return print(T.semConfig), 1;
  switch (cmd) {
    case 'register':
      return register(arg === '--again' ? undefined : arg, { P, print, now, again: args.includes('--again'), ...rest });
    case 'unregister':
      return unregister({ P, print, now });
    case 'status': {
      if (!active(cfg, now)) print(fmt(T.expirou, { data: day(cfg.expires_at) }));
      print(cfg.participant?.p ? fmt(T.registado, { nome: cfg.participant.name }) : cfg.unregistered_at ? fmt(T.fora, { data: day(cfg.unregistered_at) }) : cfg.needs_register ? T.renovar : T.naoRegistado);
      print(fmt(T.workshop, { ws: cfg.workshop || '-', data: day(cfg.expires_at) }));
      print(fmt(T.contagem, { local: readLines(P.local).length, fila: readLines(P.queue).length + readLines(P.sending).length }));
      return 0;
    }
    case 'show': {
      const list = [...readLines(P.sent), ...readLines(P.sending), ...readLines(P.queue)].slice(-20);
      if (!list.length) return print(T.nada), 0;
      print(fmt(T.mostrar, { n: list.length }));
      for (const e of list) print(JSON.stringify(e));
      return 0;
    }
    default:
      return print(T.uso), 2;
  }
}

if (isMain(import.meta.url)) {
  // With the company proxy in the environment, Node's fetch uses it only with NODE_USE_ENV_PROXY at start.
  if ((process.env.HTTPS_PROXY || process.env.https_proxy) && process.env.NODE_USE_ENV_PROXY !== '1') {
    const r = spawnSync(process.execPath, [fileURLToPath(import.meta.url), ...process.argv.slice(2)], { stdio: 'inherit', env: { ...process.env, NODE_USE_ENV_PROXY: '1' } });
    process.exit(r.status ?? 1);
  }
  process.exitCode = await ctl(process.argv.slice(2));
}
