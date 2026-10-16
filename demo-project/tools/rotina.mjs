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

const PROJ = join(dirname(fileURLToPath(import.meta.url)), '..');
const a = process.argv.slice(2);
const sim = a.includes('--sim');
const hora = (a.includes('--hora') ? a[a.indexOf('--hora') + 1] : '09:00').match(/^(\d{1,2}):(\d{2})$/);
if (!hora) {
  console.error('hora invalida (usa HH:MM)');
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
    console.log(`Remover: launchctl unload ${plist} && rm ${plist}`);
    if (sim && existsSync(plist)) {
      spawnSync('launchctl', ['unload', plist]);
      unlinkSync(plist);
      console.log('Removida.');
    }
  } else if (a.includes('--instalar')) {
    console.log(`Instalar ${plist} (todos os dias às ${hora[0]}):\n  ${cmd}`);
    if (sim) {
      mkdirSync(dirname(plist), { recursive: true });
      writeFileSync(plist, xml);
      spawnSync('launchctl', ['load', plist]);
      console.log('Instalada. Resultados em .workshop/rotina/. Para remover: node tools/rotina.mjs --remover --sim');
    } else console.log('(Nada foi alterado. Junta --sim para instalar.)');
  } else {
    console.log(`Esta rotina corre todos os dias às ${hora[0]}:\n  ${cmd}\n\nInstalar: node tools/rotina.mjs --instalar --sim`);
  }
} else if (platform() === 'win32') {
  const tn = 'Workshop Arena revisao';
  const tr = `cmd /c cd /d "${PROJ}" && if not exist .workshop\\rotina mkdir .workshop\\rotina && claude -p "${prompt}" --output-format json > .workshop\\rotina\\ultima.json 2>&1`;
  const hhmm = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
  if (a.includes('--remover')) {
    console.log(`Remover: schtasks /Delete /TN "${tn}" /F`);
    if (sim) spawnSync('schtasks', ['/Delete', '/TN', tn, '/F'], { stdio: 'inherit' });
  } else if (a.includes('--instalar')) {
    console.log(`Instalar tarefa "${tn}" todos os dias às ${hhmm}:\n  ${tr}`);
    if (sim) spawnSync('schtasks', ['/Create', '/SC', 'DAILY', '/TN', tn, '/TR', tr, '/ST', hhmm, '/F'], { stdio: 'inherit' });
    else console.log('(Nada foi alterado. Junta --sim para instalar.)');
  } else {
    console.log(`Esta rotina corre todos os dias às ${hhmm}:\n  ${tr}\n\nInstalar: node tools/rotina.mjs --instalar --sim`);
  }
} else {
  console.log(`Linux: acrescenta ao crontab -e:\n  ${mm} ${hh} * * * cd "${PROJ}" && claude -p "${prompt}" --output-format json > .workshop/rotina/ultima.json`);
}
