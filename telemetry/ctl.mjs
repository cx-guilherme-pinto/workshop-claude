#!/usr/bin/env node
// Participation in the workshop panel (docs/pt/WORKSHOP-V2-SPEC.md, section 6.6):
//
//   node ~/.workshop-claude/kit/telemetry/ctl.mjs status
//   node ctl.mjs on [A|B]           send anonymous events to the panel (room A or B)
//   node ctl.mjs off                stop sending; the events still waiting are deleted
//   node ctl.mjs show               the last 20 events, exactly as they leave (or will leave) the machine
//   node ctl.mjs nickname <name>    a nickname for the panel feed (1 to 16 of A-Z a-z 0-9 space _ -)
//   node ctl.mjs nickname --off
//
// The mission book (/missions, the statusline) works with participation on or off.
import { existsSync, rmSync } from 'node:fs';
import { isMain } from '../orchestrator/lib/is-main.mjs';
import { lingua, textos } from '../hooks/lib/language.mjs';
import { active, paths, readConfig, readId, readLines, record, writeJson } from './lib.mjs';
import { checkValue } from './schema.mjs';

const T = textos(
  {
    pt: {
      semConfig: 'A telemetria do workshop não está instalada (corre o setup do kit).',
      expirou: 'A configuração expirou em {data}: o kit já não grava nem envia nada.',
      ligada: 'Participação no painel: ligada (sala {sala}).',
      desligada: 'Participação no painel: desligada. A tua caderneta de missões continua a funcionar.',
      sala: 'Indica a sala: ctl.mjs on A  ou  ctl.mjs on B',
      workshop: 'Workshop: {ws} · expira em {data}',
      contagem: 'Eventos na caderneta local: {local} · à espera de envio: {fila}',
      nada: 'Ainda não há eventos para enviar.',
      mostrar: 'Os últimos {n} eventos, exatamente como saem do teu computador:',
      alcunha: 'Alcunha no painel: {a}',
      semAlcunha: 'Sem alcunha: o painel diz "alguém da sala {sala}".',
      alcunhaInvalida: 'Alcunha inválida: 1 a 16 caracteres, só letras sem acentos, números, espaço, _ e -.',
      uso: 'Uso: ctl.mjs status | on [A|B] | off | show | nickname <nome> | nickname --off',
    },
    en: {
      semConfig: 'The workshop telemetry is not installed (run the kit setup).',
      expirou: 'The configuration expired on {data}: the kit no longer records or sends anything.',
      ligada: 'Panel participation: on (room {sala}).',
      desligada: 'Panel participation: off. Your mission book still works.',
      sala: 'Choose the room: ctl.mjs on A  or  ctl.mjs on B',
      workshop: 'Workshop: {ws} · expires on {data}',
      contagem: 'Events in the local book: {local} · waiting to be sent: {fila}',
      nada: 'There are no events to send yet.',
      mostrar: 'The last {n} events, exactly as they leave your computer:',
      alcunha: 'Panel nickname: {a}',
      semAlcunha: 'No nickname: the panel says "someone in room {sala}".',
      alcunhaInvalida: 'Invalid nickname: 1 to 16 characters, only letters without accents, digits, space, _ and -.',
      uso: 'Usage: ctl.mjs status | on [A|B] | off | show | nickname <name> | nickname --off',
    },
  },
  lingua(),
);

const fmt = (s, v = {}) => s.replace(/\{(\w+)\}/g, (_, k) => v[k] ?? '');
const day = (iso) => (iso ? String(iso).slice(0, 10) : '-');

export function ctl(args, { P = paths(), print = console.log, now = new Date() } = {}) {
  const [cmd = 'status', arg] = args;
  const cfg = readConfig(P);
  if (!cfg) {
    print(T.semConfig);
    return 1;
  }
  if (!active(cfg, now) && cmd !== 'status' && cmd !== 'show' && cmd !== 'off') {
    print(fmt(T.expirou, { data: day(cfg.expires_at) }));
    return 1;
  }
  switch (cmd) {
    case 'status': {
      if (!active(cfg, now)) print(fmt(T.expirou, { data: day(cfg.expires_at) }));
      print(cfg.enabled ? fmt(T.ligada, { sala: cfg.room }) : T.desligada);
      print(fmt(T.workshop, { ws: cfg.workshop || '-', data: day(cfg.expires_at) }));
      print(cfg.nickname ? fmt(T.alcunha, { a: cfg.nickname }) : fmt(T.semAlcunha, { sala: cfg.room || '?' }));
      print(fmt(T.contagem, { local: readLines(P.local).length, fila: readLines(P.queue).length }));
      return 0;
    }
    case 'on': {
      const room = (arg || cfg.room || '').toUpperCase();
      if (!['A', 'B'].includes(room)) {
        print(T.sala);
        return 2;
      }
      readId(P, { create: true });
      writeJson(P.config, { ...cfg, enabled: true, room });
      record('join', { lang: lingua(), os: process.platform === 'win32' ? 'win' : 'mac', ...(cfg.nickname ? { nickname: cfg.nickname } : {}) }, { P, now });
      print(fmt(T.ligada, { sala: room }));
      return 0;
    }
    case 'off': {
      writeJson(P.config, { ...cfg, enabled: false });
      for (const f of [P.queue, P.sending]) if (existsSync(f)) rmSync(f, { force: true });
      print(T.desligada);
      return 0;
    }
    case 'show': {
      const sent = readLines(P.sent);
      const list = [...sent, ...readLines(P.queue)].slice(-20);
      if (!list.length) {
        print(T.nada);
        return 0;
      }
      print(fmt(T.mostrar, { n: list.length }));
      for (const e of list) print(JSON.stringify(e));
      return 0;
    }
    case 'nickname': {
      const name = args.slice(1).join(' ').trim();
      if (name === '--off') {
        writeJson(P.config, { ...cfg, nickname: null });
        print(fmt(T.semAlcunha, { sala: cfg.room || '?' }));
        return 0;
      }
      if (typeof checkValue('nickname', name) !== 'string') {
        print(T.alcunhaInvalida);
        return 2;
      }
      writeJson(P.config, { ...cfg, nickname: name });
      print(fmt(T.alcunha, { a: name }));
      return 0;
    }
    default:
      print(T.uso);
      return 2;
  }
}

if (isMain(import.meta.url)) process.exitCode = ctl(process.argv.slice(2));
