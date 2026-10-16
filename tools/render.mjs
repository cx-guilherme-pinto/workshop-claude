#!/usr/bin/env node
// Gera os ficheiros que contem URLs a partir do repos.conf (+ variaveis de ambiente com o mesmo nome):
//   tools/templates/*.tmpl     -> README.md, docs/PUBLICAR.md, docs/INSTALAR.md
//   setup/messages.pt.json     -> docs/TROUBLESHOOTING.md (catalogo de erros, por sistema operativo)
// e escreve a lista dos ficheiros gerados em tools/generated-files.json (usada pelo tools/check-repo.mjs).
//
//   node tools/render.mjs            gera
//   node tools/render.mjs --check    so confirma que os ficheiros gerados estao atualizados (CI)
//   node tools/render.mjs --vars     mostra os valores disponiveis para os templates
//
// Marcadores nos templates: {{NOME}} (ex.: {{ONE_LINER_MAC}}, {{RELEASE_URL}}, {{SHA256SUMS_URL}}).
// Um marcador desconhecido e um erro.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { KIT_ROOT, derived, loadConf } from '../installer/lib/conf.mjs';
import { loadMessages, renderTroubleshooting } from '../installer/lib/messages.mjs';

export const TEMPLATES = [
  ['tools/templates/README.md.tmpl', 'README.md'],
  ['tools/templates/PUBLICAR.md.tmpl', 'docs/PUBLICAR.md'],
  ['tools/templates/INSTALAR.md.tmpl', 'docs/INSTALAR.md'],
];
export const GENERATED_LIST = 'tools/generated-files.json';
const AVISO = '<!-- GERADO por tools/render.mjs a partir de {{FONTE}} e do repos.conf. Não editar à mão: edita o template. -->\n\n';

export function netHosts(vars) {
  const hosts = String(vars.NET_CHECK_HOSTS || '').split(/\s+/).filter(Boolean);
  for (const h of [vars.REPO_HOST, vars.MEMORY_HOST]) if (h && !hosts.includes(h)) hosts.push(h);
  return hosts;
}

export function fillTemplate(text, vars, name = 'template') {
  const unknown = new Set();
  const out = text.replace(/\{\{([A-Z][A-Z0-9_]*)\}\}/g, (all, k) => {
    if (vars[k] === undefined) {
      unknown.add(k);
      return all;
    }
    return String(vars[k]);
  });
  if (unknown.size) throw new Error(`${name}: marcadores desconhecidos: ${[...unknown].join(', ')}`);
  return out;
}

export function renderAll(root = KIT_ROOT, env = process.env) {
  const vars = derived(loadConf({ root, env }));
  vars.NET_HOSTS_LIST = netHosts(vars).map((h) => `- \`${h}\``).join('\n');
  const files = {};
  for (const [tmpl, dest] of TEMPLATES) {
    const src = readFileSync(join(root, tmpl), 'utf8');
    files[dest] = AVISO.replace('{{FONTE}}', tmpl) + fillTemplate(src, vars, tmpl);
  }
  files['docs/TROUBLESHOOTING.md'] = renderTroubleshooting(loadMessages(root), vars, { hosts: netHosts(vars) });
  return { vars, files };
}

function main(argv) {
  const { vars, files } = renderAll();
  if (argv.includes('--vars')) {
    for (const k of Object.keys(vars).sort()) console.log(`${k}=${vars[k]}`);
    return 0;
  }
  const list = { nota: 'Ficheiros gerados por tools/render.mjs. O tools/check-repo.mjs aceita URLs nestes ficheiros.', ficheiros: Object.keys(files).sort() };
  const all = { ...files, [GENERATED_LIST]: JSON.stringify(list, null, 2) + '\n' };
  if (argv.includes('--check')) {
    const stale = Object.entries(all).filter(([p, c]) => !existsSync(join(KIT_ROOT, p)) || readFileSync(join(KIT_ROOT, p), 'utf8') !== c);
    for (const [p] of stale) console.error(`desatualizado: ${p} (corre node tools/render.mjs)`);
    return stale.length ? 1 : 0;
  }
  for (const [p, c] of Object.entries(all)) {
    mkdirSync(dirname(join(KIT_ROOT, p)), { recursive: true });
    writeFileSync(join(KIT_ROOT, p), c);
    console.log(`gerado: ${p}`);
  }
  return 0;
}

if (process.argv[1] && process.argv[1].endsWith('render.mjs')) process.exitCode = main(process.argv.slice(2));
