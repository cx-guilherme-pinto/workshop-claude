#!/usr/bin/env node
// The workshop panel on this computer (docs/pt/WORKSHOP-V2-SPEC.md, section 6; D-34):
//
//   node ~/.workshop-claude/kit/telemetry/ctl.mjs register [A|B]   registers you on the panel's leaderboard
//   node ctl.mjs status                                             registration, room, workshop, events
//   node ctl.mjs show                                               the last 20 events, exactly as they leave
//
// register (the setup runs it after the GitHub login, step 6): reads the gh token with `gh auth token` (in memory
// only: never on the command line, in a file or in a log) and sends it once to the panel's Worker, which checks with
// the GitHub API that the account has a verified email of the company domain, keeps only the name of the account and
// throws the token away. The panel answers with a participant id and a credential, kept in config.json; from then on
// the events of this computer go to the leaderboard with that name. The mission book works with or without it.
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { isMain } from '../orchestrator/lib/is-main.mjs';
import { lingua, textos } from '../hooks/lib/language.mjs';
import { active, paths, readConfig, readLines, record, writeJson } from './lib.mjs';

const T = textos(
  {
    pt: {
      semConfig: 'A telemetria do workshop não está instalada (corre o setup do kit).',
      expirou: 'A configuração expirou em {data}: o kit já não grava nem envia nada.',
      registado: 'Registado no painel como {nome} (sala {sala}).',
      naoRegistado: 'Ainda não estás registado no painel. Corre: node ~/.workshop-claude/kit/telemetry/ctl.mjs register A  (ou B, a tua sala)',
      sala: 'Indica a sala: ctl.mjs register A  ou  ctl.mjs register B',
      semPainel: 'Este kit não tem o endereço do painel (PANEL_URL no repos.conf).',
      semGh: 'O gh não tem sessão iniciada no github.com: corre  gh auth login  e volta a correr  ctl.mjs register {sala}.',
      escopo: 'O gh não pode ler os emails da tua conta. Corre  gh auth refresh -h github.com -s user:email  (abre o browser) e volta a correr  ctl.mjs register {sala}.',
      dominio: 'A tua conta GitHub não tem um email verificado @{dominio}. Junta-o e confirma-o em https://github.com/settings/emails e volta a correr  ctl.mjs register {sala}. Fazes o workshop igual; só não apareces no painel.',
      rede: 'Não consegui chegar ao painel ({motivo}). Tenta outra rede (a do evento ou um hotspot) e volta a correr  ctl.mjs register {sala}.',
      workshop: 'Workshop: {ws} · expira em {data}',
      contagem: 'Eventos na caderneta local: {local} · à espera de envio: {fila}',
      nada: 'Ainda não há eventos enviados.',
      mostrar: 'Os últimos {n} eventos, exatamente como saem do teu computador:',
      uso: 'Uso: ctl.mjs register [A|B] | status | show',
    },
    en: {
      semConfig: 'The workshop telemetry is not installed (run the kit setup).',
      expirou: 'The configuration expired on {data}: the kit no longer records or sends anything.',
      registado: 'Registered on the panel as {nome} (room {sala}).',
      naoRegistado: 'You are not registered on the panel yet. Run: node ~/.workshop-claude/kit/telemetry/ctl.mjs register A  (or B, your room)',
      sala: 'Choose the room: ctl.mjs register A  or  ctl.mjs register B',
      semPainel: 'This kit has no panel address (PANEL_URL in repos.conf).',
      semGh: 'gh is not logged in to github.com: run  gh auth login  and then  ctl.mjs register {sala}  again.',
      escopo: 'gh cannot read your account\'s emails. Run  gh auth refresh -h github.com -s user:email  (it opens the browser) and then  ctl.mjs register {sala}  again.',
      dominio: 'Your GitHub account has no verified @{dominio} email. Add it and confirm it at https://github.com/settings/emails, then run  ctl.mjs register {sala}  again. You do the workshop all the same; you just do not appear on the panel.',
      rede: 'I could not reach the panel ({motivo}). Try another network (the event\'s or a hotspot) and run  ctl.mjs register {sala}  again.',
      workshop: 'Workshop: {ws} · expires on {data}',
      contagem: 'Events in the local book: {local} · waiting to be sent: {fila}',
      nada: 'No events sent yet.',
      mostrar: 'The last {n} events, exactly as they leave your computer:',
      uso: 'Usage: ctl.mjs register [A|B] | status | show',
    },
  },
  lingua(),
);

const fmt = (s, v = {}) => s.replace(/\{(\w+)\}/g, (_, k) => v[k] ?? '');
const day = (iso) => (iso ? String(iso).slice(0, 10) : '-');

// The gh token, read in memory (stdout of `gh auth token`). null if gh is missing or not logged in.
export function ghToken(env = process.env) {
  const r = spawnSync(env.WORKSHOP_GH || 'gh', ['auth', 'token', '--hostname', 'github.com'], { encoding: 'utf8', env, windowsHide: true, timeout: 15000 });
  const t = r.status === 0 ? String(r.stdout || '').trim() : '';
  return /^[A-Za-z0-9_]{10,400}$/.test(t) ? t : null;
}

// Exit codes: 0 registered · 2 usage · 3 not a company account · 4 gh missing/without the email scope · 5 network.
export async function register(room, { P = paths(), print = console.log, fetchImpl = fetch, token = ghToken, now = new Date() } = {}) {
  const cfg = readConfig(P);
  if (!cfg) return print(T.semConfig), 1;
  if (!active(cfg, now)) return print(fmt(T.expirou, { data: day(cfg.expires_at) })), 1;
  const sala = String(room || cfg.room || '').toUpperCase();
  if (!['A', 'B'].includes(sala)) return print(T.sala), 2;
  if (!cfg.panel_url) return print(T.semPainel), 5;
  const tok = token();
  if (!tok) return print(fmt(T.semGh, { sala })), 4;
  let r;
  try {
    r = await fetchImpl(`${cfg.panel_url.replace(/\/+$/, '')}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Workshop-Code': cfg.workshop },
      body: JSON.stringify({ token: tok, room: sala }),
      signal: AbortSignal.timeout(15000),
    });
  } catch (e) {
    return print(fmt(T.rede, { motivo: e?.name === 'TimeoutError' ? 'timeout' : 'sem ligação', sala })), 5;
  }
  const j = await r.json().catch(() => ({}));
  if (r.status === 200 && /^[0-9a-f]{32}$/.test(j.p || '') && j.credential) {
    writeJson(P.config, { ...cfg, enabled: true, room: sala, participant: { p: j.p, credential: j.credential, name: j.name, registered_at: now.toISOString() } });
    record('join', { lang: lingua(), os: process.platform === 'win32' ? 'win' : 'mac' }, { P, now });
    return print(fmt(T.registado, { nome: j.name, sala })), 0;
  }
  if (r.status === 403 && j.reason === 'domain') return print(fmt(T.dominio, { dominio: cfg.email_domain || 'checkmarx.com', sala })), 3;
  if (j.reason === 'scope') return print(fmt(T.escopo, { sala })), 4;
  if (j.reason === 'token') return print(fmt(T.semGh, { sala })), 4;
  return print(fmt(T.rede, { motivo: `HTTP ${r.status}`, sala })), 5;
}

export async function ctl(args, { P = paths(), print = console.log, now = new Date(), ...rest } = {}) {
  const [cmd = 'status', arg] = args;
  const cfg = readConfig(P);
  if (!cfg) return print(T.semConfig), 1;
  switch (cmd) {
    case 'register':
      return register(arg, { P, print, now, ...rest });
    case 'status': {
      if (!active(cfg, now)) print(fmt(T.expirou, { data: day(cfg.expires_at) }));
      print(cfg.participant?.p ? fmt(T.registado, { nome: cfg.participant.name, sala: cfg.room }) : T.naoRegistado);
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
