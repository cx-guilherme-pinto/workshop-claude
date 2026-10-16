#!/usr/bin/env node
// "Rotina local": uma revisao de seguranca diaria da Arena, com o agendador do sistema
// (launchd no Mac, Agendador de Tarefas no Windows) a correr `claude -p "/demo-review --auto"`.
// Alternativa ao /schedule (rotinas na cloud), que exige assinatura claude.ai.
//
//   node tools/rotina.mjs                  mostra o que faria (nao altera nada)
//   node tools/rotina.mjs --instalar --sim instala (hora por defeito 09:00; --hora HH:MM)
//   node tools/rotina.mjs --remover --sim  remove
import { writeFileSync, existsSync, unlinkSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { homedir, platform } from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

// Textos na lingua da Arena (tools/workshop/lingua.json); fora de uma Arena montada, em portugues.
const { textos } = await import('./workshop/hooks/lib/lingua.mjs').catch(() => ({ textos: (d) => d.pt }));
const T = textos({
  pt: {
    horaInvalida: 'hora invalida (usa HH:MM)',
    remover: (cmd) => `Remover: ${cmd}`,
    removida: 'Removida.',
    instalarMac: (plist, hora, cmd) => `Instalar ${plist} (todos os dias às ${hora}):\n  ${cmd}`,
    instalada: 'Instalada. Resultados em .workshop/rotina/. Para remover: node tools/rotina.mjs --remover --sim',
    nadaAlterado: '(Nada foi alterado. Junta --sim para instalar.)',
    corre: (hora, cmd) => `Esta rotina corre todos os dias às ${hora}:\n  ${cmd}\n\nInstalar: node tools/rotina.mjs --instalar --sim`,
    instalarWin: (tn, hora, cmd) => `Instalar tarefa "${tn}" todos os dias às ${hora}:\n  ${cmd}`,
    linux: (cmd) => `Linux: acrescenta ao crontab -e:\n  ${cmd}`,
  },
  en: {
    horaInvalida: 'invalid time (use HH:MM)',
    remover: (cmd) => `Remove: ${cmd}`,
    removida: 'Removed.',
    instalarMac: (plist, hora, cmd) => `Install ${plist} (every day at ${hora}):\n  ${cmd}`,
    instalada: 'Installed. Results in .workshop/rotina/. To remove it: node tools/rotina.mjs --remover --sim',
    nadaAlterado: '(Nothing was changed. Add --sim to install.)',
    corre: (hora, cmd) => `This routine runs every day at ${hora}:\n  ${cmd}\n\nInstall: node tools/rotina.mjs --instalar --sim`,
    instalarWin: (tn, hora, cmd) => `Install the task "${tn}" every day at ${hora}:\n  ${cmd}`,
    linux: (cmd) => `Linux: add to crontab -e:\n  ${cmd}`,
  },
});

const PROJ = join(dirname(fileURLToPath(import.meta.url)), '..');
const a = process.argv.slice(2);
const sim = a.includes('--sim');
const hora = (a.includes('--hora') ? a[a.indexOf('--hora') + 1] : '09:00').match(/^(\d{1,2}):(\d{2})$/);
if (!hora) {
  console.error(T.horaInvalida);
  process.exit(2);
}
const [hh, mm] = [Number(hora[1]), Number(hora[2])];
const NOME = 'pt.workshop.arena-revisao';
const prompt = '/demo-review --auto';

if (platform() === 'darwin') {
  const plist = join(homedir(), 'Library', 'LaunchAgents', `${NOME}.plist`);
  const cmd = `cd "${PROJ}" && mkdir -p .workshop/rotina && claude -p "${prompt}" --output-format json > ".workshop/rotina/$(date +%F).json" 2>&1`;
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key><string>${NOME}</string>
  <key>ProgramArguments</key><array><string>/bin/zsh</string><string>-lc</string><string>${cmd.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</string></array>
  <key>StartCalendarInterval</key><dict><key>Hour</key><integer>${hh}</integer><key>Minute</key><integer>${mm}</integer></dict>
</dict></plist>
`;
  if (a.includes('--remover')) {
    console.log(T.remover(`launchctl unload ${plist} && rm ${plist}`));
    if (sim && existsSync(plist)) {
      spawnSync('launchctl', ['unload', plist]);
      unlinkSync(plist);
      console.log(T.removida);
    }
  } else if (a.includes('--instalar')) {
    console.log(T.instalarMac(plist, hora[0], cmd));
    if (sim) {
      mkdirSync(dirname(plist), { recursive: true });
      writeFileSync(plist, xml);
      spawnSync('launchctl', ['load', plist]);
      console.log(T.instalada);
    } else console.log(T.nadaAlterado);
  } else {
    console.log(T.corre(hora[0], cmd));
  }
} else if (platform() === 'win32') {
  const tn = 'Workshop Arena revisao';
  const tr = `cmd /c cd /d "${PROJ}" && if not exist .workshop\\rotina mkdir .workshop\\rotina && claude -p "${prompt}" --output-format json > .workshop\\rotina\\ultima.json 2>&1`;
  const hhmm = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
  if (a.includes('--remover')) {
    console.log(T.remover(`schtasks /Delete /TN "${tn}" /F`));
    if (sim) spawnSync('schtasks', ['/Delete', '/TN', tn, '/F'], { stdio: 'inherit' });
  } else if (a.includes('--instalar')) {
    console.log(T.instalarWin(tn, hhmm, tr));
    if (sim) spawnSync('schtasks', ['/Create', '/SC', 'DAILY', '/TN', tn, '/TR', tr, '/ST', hhmm, '/F'], { stdio: 'inherit' });
    else console.log(T.nadaAlterado);
  } else {
    console.log(T.corre(hhmm, tr));
  }
} else {
  console.log(T.linux(`${mm} ${hh} * * * cd "${PROJ}" && claude -p "${prompt}" --output-format json > .workshop/rotina/ultima.json`));
}
