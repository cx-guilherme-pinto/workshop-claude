#!/usr/bin/env node
// "Local routine": a daily security review of the Arena, with the system scheduler
// (launchd on the Mac, Task Scheduler on Windows) running `claude -p "/demo-review --auto"`.
// An alternative to /schedule (routines in the cloud), which needs a claude.ai subscription.
//
//   node tools/routine.mjs                    shows what it would do (changes nothing)
//   node tools/routine.mjs --install --yes    installs it (default time 09:00; --time HH:MM)
//   node tools/routine.mjs --remove --yes     removes it
//
// (--instalar, --remover, --sim and --hora still work.)
import { writeFileSync, existsSync, unlinkSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { homedir, platform } from 'node:os';
import { spawnSync } from 'node:child_process';
import { ARENA as PROJ, arenaTexts } from './engine.mjs';

// Texts in the Arena's language; outside an assembled Arena, Portuguese.
const T = await arenaTexts({
  pt: {
    invalidTime: 'hora inválida (usa HH:MM)',
    remove: (cmd) => `Remover: ${cmd}`,
    removed: 'Removida.',
    installMac: (plist, time, cmd) => `Instalar ${plist} (todos os dias às ${time}):\n  ${cmd}`,
    installed: 'Instalada. Resultados em .workshop/routine/. Para remover: node tools/routine.mjs --remove --yes',
    nothingChanged: '(Nada foi alterado. Junta --yes para instalar.)',
    runs: (time, cmd) => `Esta rotina corre todos os dias às ${time}:\n  ${cmd}\n\nInstalar: node tools/routine.mjs --install --yes`,
    installWin: (tn, time, cmd) => `Instalar a tarefa "${tn}" todos os dias às ${time}:\n  ${cmd}`,
    linux: (cmd) => `Linux: acrescenta ao crontab -e:\n  ${cmd}`,
  },
  en: {
    invalidTime: 'invalid time (use HH:MM)',
    remove: (cmd) => `Remove: ${cmd}`,
    removed: 'Removed.',
    installMac: (plist, time, cmd) => `Install ${plist} (every day at ${time}):\n  ${cmd}`,
    installed: 'Installed. Results in .workshop/routine/. To remove it: node tools/routine.mjs --remove --yes',
    nothingChanged: '(Nothing was changed. Add --yes to install.)',
    runs: (time, cmd) => `This routine runs every day at ${time}:\n  ${cmd}\n\nInstall: node tools/routine.mjs --install --yes`,
    installWin: (tn, time, cmd) => `Install the task "${tn}" every day at ${time}:\n  ${cmd}`,
    linux: (cmd) => `Linux: add to crontab -e:\n  ${cmd}`,
  },
});

const a = process.argv.slice(2);
const has = (...ks) => ks.some((k) => a.includes(k));
const opt = (ks, d) => {
  for (const k of ks) if (a.includes(k)) return a[a.indexOf(k) + 1];
  return d;
};
const yes = has('--yes', '--sim');
const install = has('--install', '--instalar');
const remove = has('--remove', '--remover');
const time = String(opt(['--time', '--hora'], '09:00')).match(/^(\d{1,2}):(\d{2})$/);
if (!time) {
  console.error(T.invalidTime);
  process.exit(2);
}
const [hh, mm] = [Number(time[1]), Number(time[2])];
const LABEL = 'workshop.arena-review';
const OLD_LABEL = 'pt.workshop.arena-revisao';
const prompt = '/demo-review --auto';

if (platform() === 'darwin') {
  const agents = join(homedir(), 'Library', 'LaunchAgents');
  const plist = join(agents, `${LABEL}.plist`);
  const oldPlist = join(agents, `${OLD_LABEL}.plist`);
  const cmd = `cd "${PROJ}" && mkdir -p .workshop/routine && claude -p "${prompt}" --output-format json > ".workshop/routine/$(date +%F).json" 2>&1`;
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key><string>${LABEL}</string>
  <key>ProgramArguments</key><array><string>/bin/zsh</string><string>-lc</string><string>${cmd.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</string></array>
  <key>StartCalendarInterval</key><dict><key>Hour</key><integer>${hh}</integer><key>Minute</key><integer>${mm}</integer></dict>
</dict></plist>
`;
  if (remove) {
    console.log(T.remove(`launchctl unload ${plist} && rm ${plist}`));
    // Also the routine installed by an older kit, under its old name.
    const found = yes ? [plist, oldPlist].filter((p) => existsSync(p)) : [];
    for (const p of found) {
      spawnSync('launchctl', ['unload', p]);
      unlinkSync(p);
    }
    if (found.length) console.log(T.removed);
  } else if (install) {
    console.log(T.installMac(plist, time[0], cmd));
    if (yes) {
      mkdirSync(dirname(plist), { recursive: true });
      writeFileSync(plist, xml);
      spawnSync('launchctl', ['load', plist]);
      console.log(T.installed);
    } else console.log(T.nothingChanged);
  } else {
    console.log(T.runs(time[0], cmd));
  }
} else if (platform() === 'win32') {
  const tn = 'Workshop Arena review';
  const oldTn = 'Workshop Arena revisao';
  const tr = `cmd /c cd /d "${PROJ}" && if not exist .workshop\\routine mkdir .workshop\\routine && claude -p "${prompt}" --output-format json > .workshop\\routine\\latest.json 2>&1`;
  const hhmm = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
  if (remove) {
    console.log(T.remove(`schtasks /Delete /TN "${tn}" /F`));
    if (yes) {
      spawnSync('schtasks', ['/Delete', '/TN', tn, '/F'], { stdio: 'inherit' });
      spawnSync('schtasks', ['/Delete', '/TN', oldTn, '/F'], { stdio: 'ignore' });
    }
  } else if (install) {
    console.log(T.installWin(tn, hhmm, tr));
    if (yes) spawnSync('schtasks', ['/Create', '/SC', 'DAILY', '/TN', tn, '/TR', tr, '/ST', hhmm, '/F'], { stdio: 'inherit' });
    else console.log(T.nothingChanged);
  } else {
    console.log(T.runs(hhmm, tr));
  }
} else {
  console.log(T.linux(`${mm} ${hh} * * * cd "${PROJ}" && claude -p "${prompt}" --output-format json > .workshop/routine/latest.json`));
}
