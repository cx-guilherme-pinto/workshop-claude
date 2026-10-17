#!/usr/bin/env node
// Instalacao do workshop ao nivel do utilizador (igual em Mac e Windows).
//
//   node installer/install-user.mjs instalar   --node <node> [--kit-src <dir>] [--ca-pem <f>] [--https-proxy <url>]
//                                              [--no-proxy <lista>] [--substituir-statusline] [--versao <v>]
//                                              [--lingua-maquina <etiqueta, ex.: pt-PT>]
//   node installer/install-user.mjs verificar  --node <node> [--kit-src <dir>] [--ca-pem <f>] [--https-proxy <url>]
//                                              [--no-proxy <lista>] [--lingua-maquina <etiqueta>]
//   node installer/install-user.mjs desinstalar
//   node installer/install-user.mjs registar   --tipo <t> --nome <n> [--caminho <p>] [--valor <v>]
//   node installer/install-user.mjs extras
//
// O que faz "instalar":
//   - copia hooks/ orchestrator/ statusline/ pricing.json para ~/.workshop-claude/kit/
//   - copia skills-prod/* e skills-shared/* para ~/.claude/skills/ e agents/prod/*.md para ~/.claude/agents/,
//     trocando {{KIT_DIR}} pelo caminho absoluto do kit (barras "/" tambem no Windows)
//   - faz backup e merge seguro do ~/.claude/settings.json (hooks, statusLine so se nao houver, env e, com
//     --lingua-maquina, a "language" do Claude Code se nao houver nenhuma). Sem --https-proxy, o HTTPS_PROXY e o
//     NO_PROXY que uma instalacao anterior gravou saem (o proxy do escritorio nao serve noutra rede)
//   - com --lingua-maquina, escreve ~/.workshop-claude/kit/language.json (pt ou en: a lingua dos textos do kit)
//   - regista tudo em ~/.workshop-claude/manifest.json, para o "desinstalar" o desfazer
//
// Saida: linhas "chave<TAB>valor" (faceis de ler em bash e PowerShell). Codigos de saida:
//   0 ok · 1 em falta (verificar) · 2 erro de utilizacao · 3 settings.json invalido · 4 outro erro
import { existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, copyFileSync, statSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseConf } from './lib/conf.mjs';
import { gitSync } from './lib/kit-repo.mjs';
import { linguaMaquina } from './lib/languages.mjs';
import { isMain as ehPrincipal } from './lib/is-main.mjs';
import { LANGUAGE_FILE, storedLanguage } from '../hooks/lib/language.mjs';
import {
  checkSettings,
  mergeSettings,
  parseSettings,
  serialize,
  SettingsError,
  unmergeSettings,
} from './lib/settings.mjs';
import {
  copyTree,
  fingerprint,
  fwd,
  moveAside,
  readJson,
  sha256,
  sha256File,
  timestamp,
  userPaths,
  writeAtomic,
} from './lib/fsx.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
// existsSync segue links: um link pendente (ex.: para uns dotfiles por montar) contava como livre e a copia
// rebentava com ENOENT a meio. O lstat ve o proprio link, que e movido como link (o destino nunca e tocado).
const ocupado = (p) => {
  try {
    lstatSync(p);
    return true;
  } catch {
    return false;
  }
};
const MOTOR = ['hooks', 'orchestrator', 'statusline', 'pricing.json'];

function parseArgs(argv) {
  const o = { cmd: argv[0], flags: {} };
  for (let i = 1; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const k = a.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith('--')) o.flags[k] = true;
    else {
      o.flags[k] = next;
      i++;
    }
  }
  return o;
}

const out = (k, v = '') => process.stdout.write(`${k}\t${String(v).replace(/[\t\r\n]+/g, ' ')}\n`);

export function kitSources(kitSrc) {
  const dirs = (p) => (existsSync(p) ? readdirSync(p).filter((n) => !n.startsWith('.') && statSync(join(p, n)).isDirectory()).sort() : []);
  const skills = [];
  for (const base of ['skills-prod', 'skills-shared']) {
    for (const n of dirs(join(kitSrc, base))) {
      if (existsSync(join(kitSrc, base, n, 'SKILL.md'))) skills.push({ nome: n, origem: join(kitSrc, base, n) });
    }
  }
  const agDir = join(kitSrc, 'agents', 'prod');
  const agentes = existsSync(agDir)
    ? readdirSync(agDir)
        .filter((f) => f.endsWith('.md'))
        .sort()
        .map((f) => ({ nome: f, origem: join(agDir, f) }))
    : [];
  return { skills, agentes };
}

function kitVersion(kitSrc, flags) {
  if (typeof flags.versao === 'string') return flags.versao;
  try {
    return parseConf(readFileSync(join(kitSrc, 'repos.conf'), 'utf8')).WORKSHOP_VERSION || 'dev';
  } catch {
    return 'dev';
  }
}

export function envFor(flags) {
  const env = { DISABLE_AUTOUPDATER: '1' };
  const ca = typeof flags['ca-pem'] === 'string' ? flags['ca-pem'] : null;
  const proxy = typeof flags['https-proxy'] === 'string' ? flags['https-proxy'] : null;
  if (ca) {
    env.NODE_EXTRA_CA_CERTS = fwd(resolve(ca));
    env.UV_SYSTEM_CERTS = 'true';
  }
  if (proxy) env.HTTPS_PROXY = proxy;
  if (ca || proxy) env.NO_PROXY = typeof flags['no-proxy'] === 'string' ? flags['no-proxy'] : 'localhost,127.0.0.1';
  return env;
}

// Etiqueta da lingua da maquina (--lingua-maquina) -> { tag, kit, claude } ou null.
export function linguaDe(flags) {
  return typeof flags['lingua-maquina'] === 'string' ? linguaMaquina(flags['lingua-maquina']) : null;
}

// The kit language written at install time (language.json; lingua.json in older installs).
function linguaKitInstalada(P) {
  return existsSync(P.kitDir) ? storedLanguage(P.kitDir) : null;
}

function loadManifest(P) {
  return readJson(P.manifest, null);
}

function saveManifest(P, m) {
  m.atualizado_em = new Date().toISOString();
  writeAtomic(P.manifest, JSON.stringify(m, null, 2) + '\n');
}

function readSettingsFile(P) {
  if (!existsSync(P.settings)) return { exists: false, text: null, obj: {} };
  const text = readFileSync(P.settings, 'utf8');
  return { exists: true, text, obj: parseSettings(text) };
}

// Tira do lugar uma skill/agente nosso sem perder alteracoes da pessoa: se o conteudo ja nao e o que o kit
// escreveu (sha no manifest), vai para o backup em <ts>/edited/ (linha "editado"); sem sha (manifest de uma
// versao anterior a v1.0.0-rc.2) nao se sabe, por isso vai para <ts>/previous/ (linha "anteriores", uma so).
// Devolve { editado } ou { anterior } com o caminho do backup, ou {} quando se apagou uma copia intacta.
function retirarNosso(kind, item, P, ts) {
  const dest = item.destino;
  if (!ocupado(dest)) return {};
  if (item.sha && fingerprint([dest]) === item.sha) {
    rmSync(dest, { recursive: true, force: true });
    return {};
  }
  const pasta = item.sha ? 'edited' : 'previous';
  const to = fwd(moveAside(dest, P.backupDir, join(ts, pasta, kind === 'agentes' ? 'agents' : kind, basename(dest))));
  return item.sha ? { editado: to } : { anterior: fwd(join(P.backupDir, ts, pasta)) };
}

// Copia uma skill/agente; se ja existir algo com o mesmo nome que nao e nosso, guarda-o no backup.
function placeItem(kind, item, destRoot, P, manifest, replacements, ts) {
  const dest = join(destRoot, item.nome);
  const prev = (manifest[kind] || []).find((x) => x.nome === item.nome);
  let backup = prev?.backup || null;
  let retirado = {};
  if (ocupado(dest)) {
    if (prev) retirado = retirarNosso(kind, { ...prev, destino: dest }, P, ts);
    else {
      backup = fwd(moveAside(dest, P.backupDir, join(ts, kind, item.nome)));
      retirado = { alheio: backup };
    }
  }
  try {
    if (statSync(item.origem).isDirectory()) copyTree(item.origem, dest, replacements);
    else {
      mkdirSync(destRoot, { recursive: true });
      let t = readFileSync(item.origem, 'utf8');
      for (const [k, v] of Object.entries(replacements)) t = t.split(`{{${k}}}`).join(v);
      writeAtomic(dest, t);
    }
  } catch (e) {
    // Desfazer este item: tirar a copia a meio e repor o que la estava (o item da pessoa ou o nosso editado).
    rmSync(dest, { recursive: true, force: true });
    const devolver = backup !== (prev?.backup || null) ? backup : retirado.editado;
    if (devolver) renameSync(devolver, dest);
    throw e;
  }
  return { nome: item.nome, destino: fwd(dest), backup, sha: fingerprint([dest]), retirado };
}

// Linhas "editado" (uma por item) e "anteriores" (uma so) para o setup.
function saidaRetirados(lista) {
  for (const r of lista) if (r.editado) out('editado', r.editado);
  // skills/agentes da pessoa com o nome de um do kit: ficam no backup e o --desinstalar repoe-nos
  for (const r of lista) if (r.alheio) out('alheio', r.alheio);
  const ant = lista.find((r) => r.anterior);
  if (ant) out('anteriores', ant.anterior);
}

export function instalar(flags, env = process.env) {
  const P = userPaths(env);
  const kitSrc = resolve(typeof flags['kit-src'] === 'string' ? flags['kit-src'] : join(HERE, '..'));
  const node = flags.node;
  if (typeof node !== 'string') throw Object.assign(new Error('missing --node <path to node>'), { exit: 2 });
  for (const m of MOTOR) {
    if (!existsSync(join(kitSrc, m))) throw new Error(`the kit in ${kitSrc} has no ${m}`);
  }
  const ts = timestamp();
  const manifest = loadManifest(P) || { v: 1, instalado_em: new Date().toISOString(), skills: [], agentes: [], extras: [] };
  const versao = kitVersion(kitSrc, flags);
  const fp = fingerprint([...MOTOR, 'skills-prod', 'skills-shared', 'agents/prod'].map((p) => join(kitSrc, p)));

  // 1. settings.json primeiro: se for invalido, nao se toca em nada.
  const cur = readSettingsFile(P);
  const envVars = envFor(flags);
  const lm = linguaDe(flags);
  const merged = mergeSettings(
    cur.obj,
    { node, kitDir: P.kitDir, env: envVars, substituirStatusline: Boolean(flags['substituir-statusline']), language: lm?.claude },
    manifest.settings?.record || null,
  );

  // 2. Motor do kit (pasta toda nossa: substitui-se).
  rmSync(P.kitDir, { recursive: true, force: true });
  mkdirSync(P.kitDir, { recursive: true });
  for (const m of MOTOR) {
    const src = join(kitSrc, m);
    if (statSync(src).isDirectory()) copyTree(src, join(P.kitDir, m));
    else copyFileSync(src, join(P.kitDir, m));
  }
  if (lm) writeAtomic(join(P.kitDir, LANGUAGE_FILE), JSON.stringify({ language: lm.kit, machine: lm.tag }, null, 2) + '\n');

  // 3. Skills e agentes.
  const replacements = { KIT_DIR: fwd(P.kitDir) };
  const { skills, agentes } = kitSources(kitSrc);
  // Uma falha a meio (ex.: um caminho sem escrita) nao pode deixar itens da pessoa no backup sem registo: o que ja
  // ficou no sitio vai para o manifest antes do erro, para o --desinstalar e a proxima corrida o reconhecerem.
  const feitos = { skills: [], agentes: [] };
  const por = (kind, root) => (it) => {
    const r = placeItem(kind, it, root, P, manifest, replacements, ts);
    feitos[kind].push(r);
    return r;
  };
  let novasSkills, novosAgentes;
  try {
    novasSkills = skills.map(por('skills', P.skillsDir));
    novosAgentes = agentes.map(por('agentes', P.agentsDir));
  } catch (e) {
    for (const kind of ['skills', 'agentes']) {
      const ja = feitos[kind].map(({ retirado, ...x }) => x);
      manifest[kind] = [...ja, ...(manifest[kind] || []).filter((o) => !ja.some((x) => x.nome === o.nome))];
    }
    saveManifest(P, manifest);
    throw e;
  }
  const retirados = [...novasSkills, ...novosAgentes].map((x) => x.retirado);
  // Itens nossos de versoes anteriores que ja nao existem no kit: remover (e repor o backup, se houver).
  for (const [kind, now] of [
    ['skills', novasSkills],
    ['agentes', novosAgentes],
  ]) {
    for (const old of manifest[kind] || []) {
      if (now.some((x) => x.nome === old.nome)) continue;
      retirados.push(restoreItem(kind, old, P, ts));
    }
  }
  const semRetirado = ({ retirado, ...x }) => x;
  manifest.skills = novasSkills.map(semRetirado);
  manifest.agentes = novosAgentes.map(semRetirado);

  // 4. Escrever o settings.json. Backup antes de qualquer escrita: o primeiro fica como "original"
  //    (e o que o --desinstalar repoe); os seguintes ficam com a data.
  let settingsMan = manifest.settings || null;
  mkdirSync(P.backupDir, { recursive: true });
  if (!settingsMan) {
    let backup = null;
    if (cur.exists) {
      backup = join(P.backupDir, `settings-original-${ts}.json`);
      copyFileSync(P.settings, backup);
    }
    settingsMan = { caminho: fwd(P.settings), existia: cur.exists, backup_original: backup ? fwd(backup) : null };
  }
  const text = serialize(merged.settings);
  if (!cur.exists || cur.text !== text) {
    if (cur.exists && manifest.settings) copyFileSync(P.settings, join(P.backupDir, `settings-${ts}.json`));
    writeAtomic(P.settings, text);
  }
  settingsMan.record = merged.record;
  settingsMan.sha256_escrito = sha256(Buffer.from(text));
  manifest.settings = settingsMan;

  manifest.kit_versao = versao;
  manifest.kit_fingerprint = fp;
  manifest.kit_dir = fwd(P.kitDir);
  manifest.node = fwd(node);
  manifest.env = envVars;
  if (lm) manifest.lingua = { maquina: lm.tag, kit: lm.kit };
  saveManifest(P, manifest);

  out('estado', 'instalado');
  out('versao', versao);
  out('skills', novasSkills.length);
  out('agentes', novosAgentes.length);
  out('kit', fwd(P.kitDir));
  out('settings', fwd(P.settings));
  if (lm) saidaLingua(lm, linguaKitInstalada(P), merged.settings.language, merged.record);
  for (const w of merged.warnings) out('aviso', w);
  saidaRetirados(retirados);
  return 0;
}

// lingua <etiqueta> · lingua_kit pt|en · language <valor no settings.json> · language_nossa 1|0 (1 = posta pelo workshop)
function saidaLingua(lm, kit, language, record) {
  out('lingua', lm.tag);
  out('lingua_kit', kit ?? '');
  out('language', language ?? '');
  out('language_nossa', record?.language_criado && language === record.language_valor ? 1 : 0);
}

function restoreItem(kind, item, P, ts) {
  const retirado = retirarNosso(kind, item, P, ts);
  if (item.backup && ocupado(item.backup)) {
    mkdirSync(dirname(item.destino), { recursive: true });
    moveAside(item.backup, dirname(item.destino), basename(item.destino));
  }
  return retirado;
}

export function verificar(flags, env = process.env) {
  const P = userPaths(env);
  const kitSrc = resolve(typeof flags['kit-src'] === 'string' ? flags['kit-src'] : join(HERE, '..'));
  const manifest = loadManifest(P);
  const faltam = [];
  const avisos = [];
  if (!manifest) faltam.push('manifest');
  for (const m of MOTOR) if (!existsSync(join(P.kitDir, m))) faltam.push(`kit ${m}`);
  if (manifest) {
    for (const it of [...(manifest.skills || []), ...(manifest.agentes || [])]) {
      if (!existsSync(it.destino)) faltam.push(`${it.nome}`);
    }
    if (existsSync(kitSrc) && existsSync(join(kitSrc, 'hooks'))) {
      const fp = fingerprint([...MOTOR, 'skills-prod', 'skills-shared', 'agents/prod'].map((p) => join(kitSrc, p)));
      if (fp !== manifest.kit_fingerprint) faltam.push('kit desatualizado');
    }
  }
  let statusline = '?';
  try {
    const cur = readSettingsFile(P);
    const node = typeof flags.node === 'string' ? flags.node : manifest?.node;
    if (!node) faltam.push('node');
    else {
      const r = checkSettings(cur.obj, { node, kitDir: P.kitDir, env: envFor(flags), record: manifest?.settings?.record });
      statusline = r.statusline;
      faltam.push(...r.faltam.filter((f) => !(f === 'statusLine' && r.statusline === 'alheia')));
      if (r.statusline === 'alheia') avisos.push('E-CFG-06');
      if (r.hooksOff) avisos.push('E-CFG-11');
      // Sem instalacao ainda nao ha nada a dizer sobre a lingua (a "language" so se grava ao instalar).
      const lm = manifest ? linguaDe(flags) : null;
      if (lm) {
        const kit = linguaKitInstalada(P);
        if (kit !== lm.kit) faltam.push(`lingua do kit (${kit ?? '-'} -> ${lm.kit})`);
        // The workshop's own "language" that the install would change (pt -> pt-BR: European -> Brazilian
        // Portuguese, same kit texts). Without this, "WORKSHOP_LANG=pt-BR" after a "pt" install changed nothing.
        const rec = manifest?.settings?.record;
        const atual = cur.obj.language;
        if (lm.claude && rec?.language_criado && atual === rec.language_valor && atual !== lm.claude) {
          faltam.push(`language do Claude (${atual} -> ${lm.claude})`);
        }
        saidaLingua(lm, kit, cur.obj.language, manifest?.settings?.record);
      }
    }
  } catch (e) {
    if (e instanceof SettingsError) {
      out('erro', e.code);
      if (e.detail) out('erro_detalhe', e.detail);
      faltam.push('settings.json invalido');
    } else throw e;
  }
  out('ok', faltam.length ? 0 : 1);
  out('versao', manifest?.kit_versao || '');
  out('skills', manifest?.skills?.length || 0);
  out('agentes', manifest?.agentes?.length || 0);
  out('statusline', statusline);
  for (const f of faltam) out('falta', f);
  for (const a of avisos) out('aviso', a);
  return faltam.length ? 1 : 0;
}

export function registar(flags, env = process.env) {
  const P = userPaths(env);
  const manifest = loadManifest(P) || { v: 1, instalado_em: new Date().toISOString(), skills: [], agentes: [], extras: [] };
  if (typeof flags.tipo !== 'string' || typeof flags.nome !== 'string') {
    throw Object.assign(new Error('registar needs --tipo and --nome'), { exit: 2 });
  }
  const item = { tipo: flags.tipo, nome: flags.nome };
  if (typeof flags.caminho === 'string') item.caminho = fwd(flags.caminho);
  if (typeof flags.valor === 'string') item.valor = flags.valor;
  if (flags.anterior !== undefined) item.anterior = flags.anterior === true ? '' : flags.anterior;
  manifest.extras = manifest.extras || [];
  const i = manifest.extras.findIndex((x) => x.tipo === item.tipo && x.nome === item.nome);
  if (i >= 0) {
    // mantem o "anterior" original (o valor de antes do workshop)
    if ('anterior' in manifest.extras[i]) item.anterior = manifest.extras[i].anterior;
    manifest.extras[i] = { ...manifest.extras[i], ...item };
  } else manifest.extras.push(item);
  saveManifest(P, manifest);
  out('registado', `${item.tipo} ${item.nome}`);
  return 0;
}

export function extras(flags, env = process.env) {
  const m = loadManifest(userPaths(env));
  for (const x of m?.extras || []) {
    process.stdout.write([x.tipo, x.nome, x.caminho || '', x.valor || '', x.anterior ?? ''].join('\t') + '\n');
  }
  return 0;
}

// So o repositorio do proprio projeto (nunca um acima dele, ex.: um HOME com os dotfiles em git) e com o git isolado
// da montagem (lib/kit-repo.mjs): um gitignore global nao pode esconder ficheiros da pessoa desta verificacao.
function projetoIntacto(dir) {
  if (!existsSync(join(dir, '.git'))) return false;
  const g = (...a) => gitSync(dir, a);
  const st = g('status', '--porcelain', '--untracked-files=all');
  if (st.status !== 0 || st.stdout.trim() !== '') return false;
  const n = g('rev-list', '--count', 'HEAD');
  return n.status === 0 && n.stdout.trim() === '1';
}

export function desinstalar(flags, env = process.env) {
  const P = userPaths(env);
  const manifest = loadManifest(P);
  if (!manifest) {
    out('sem_manifest', fwd(P.manifest));
    return 0;
  }
  const ts = timestamp();
  // settings.json
  const s = manifest.settings;
  if (s) {
    const atual = sha256File(P.settings);
    if (atual && atual === s.sha256_escrito) {
      if (s.backup_original && existsSync(s.backup_original)) copyFileSync(s.backup_original, P.settings);
      else if (!s.existia) rmSync(P.settings, { force: true });
      out('settings', 'reposto');
    } else if (atual) {
      mkdirSync(P.backupDir, { recursive: true });
      copyFileSync(P.settings, join(P.backupDir, `settings-antes-de-desinstalar-${ts}.json`));
      try {
        const obj = parseSettings(readFileSync(P.settings, 'utf8'));
        writeAtomic(P.settings, serialize(unmergeSettings(obj, s.record || {})));
        out('settings', 'limpo');
      } catch (e) {
        out('erro', `settings: ${e.message}`);
      }
    }
  }
  const retirados = [];
  for (const [kind, it] of [...(manifest.skills || []).map((x) => ['skills', x]), ...(manifest.agentes || []).map((x) => ['agentes', x])]) {
    retirados.push(restoreItem(kind, it, P, ts));
    out('removido', it.nome);
  }
  saidaRetirados(retirados);
  rmSync(P.kitDir, { recursive: true, force: true });
  out('removido', 'kit');
  for (const x of manifest.extras || []) {
    if (x.tipo !== 'projeto' || !x.caminho || !existsSync(x.caminho)) continue;
    if (projetoIntacto(x.caminho)) {
      rmSync(x.caminho, { recursive: true, force: true });
      out('projeto_removido', x.caminho);
    } else out('projeto_mantido', x.caminho);
  }
  mkdirSync(P.backupDir, { recursive: true });
  copyFileSync(P.manifest, join(P.backupDir, `manifest-desinstalado-${ts}.json`));
  rmSync(P.manifest, { force: true });
  out('backup', fwd(P.backupDir));
  return 0;
}

const CMDS = { instalar, verificar, desinstalar, registar, extras };

const isMain = ehPrincipal(import.meta.url);
if (isMain) {
  const { cmd, flags } = parseArgs(process.argv.slice(2));
  const fn = CMDS[cmd];
  if (!fn) {
    process.stderr.write(`usage: install-user.mjs ${Object.keys(CMDS).join('|')} [options]\n`);
    process.exit(2);
  }
  try {
    process.exitCode = fn(flags);
  } catch (e) {
    if (e instanceof SettingsError) {
      out('erro', e.code);
      if (e.detail) out('erro_detalhe', e.detail);
      process.stderr.write(`ERROR install-user: ${e.message}\n`);
      process.exitCode = 3;
    } else {
      process.stderr.write(`ERROR install-user: ${e.message}\n`);
      process.exitCode = e.exit || 4;
    }
  }
}
