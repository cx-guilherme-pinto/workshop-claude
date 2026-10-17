// Testes do merge seguro do settings.json (installer/lib/settings.mjs).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  checkSettings,
  command,
  isOurs,
  mergeSettings,
  parseSettings,
  SettingsError,
  unmergeSettings,
} from '../../installer/lib/settings.mjs';

const HOME_MAC = '/Users/João Silva';
const KIT_MAC = `${HOME_MAC}/.workshop-claude/kit`;
const NODE_MAC = `${HOME_MAC}/.workshop-claude/node/bin/node`;
const KIT_WIN = 'C:\\Users\\João Silva\\.workshop-claude\\kit';
const NODE_WIN = 'C:\\Program Files\\nodejs\\node.exe';

const alheio = () => ({
  model: 'claude-sonnet-5-5',
  statusLine: { type: 'command', command: 'echo minha-statusline' },
  hooks: {
    Stop: [{ hooks: [{ type: 'command', command: 'echo meu-hook' }] }],
    PreToolUse: [{ matcher: 'Bash', hooks: [{ type: 'command', command: '/usr/local/bin/guarda' }] }],
  },
  env: { MEU_ENV: '1' },
  enabledPlugins: { 'x@y': true },
  permissions: { allow: ['Bash(ls)'] },
});

test('mantem chaves, hooks e statusLine alheios e acrescenta os hooks do workshop', () => {
  const cur = alheio();
  const { settings: s, warnings, record } = mergeSettings(cur, { node: NODE_MAC, kitDir: KIT_MAC, env: { DISABLE_AUTOUPDATER: '1' } });
  assert.equal(s.model, 'claude-sonnet-5-5');
  assert.deepEqual(s.enabledPlugins, { 'x@y': true });
  assert.deepEqual(s.permissions, { allow: ['Bash(ls)'] });
  assert.deepEqual(s.statusLine, cur.statusLine, 'statusLine alheia mantida');
  assert.deepEqual(warnings, ['E-CFG-06']);
  assert.equal(record.statusline_mantida, true);
  assert.equal(s.hooks.Stop.length, 2, 'hook alheio + o nosso');
  assert.equal(s.hooks.Stop[0].hooks[0].command, 'echo meu-hook');
  assert.equal(s.hooks.PreToolUse[0].hooks[0].command, '/usr/local/bin/guarda');
  assert.equal(s.hooks.SubagentStop[0].hooks[0].command, `"${NODE_MAC}" "${KIT_MAC}/hooks/subagent-stop.mjs"`);
  assert.equal(s.hooks.Stop[1].hooks[0].command, `"${NODE_MAC}" "${KIT_MAC}/hooks/stop.mjs"`);
  assert.equal(s.hooks.Stop[1].hooks[0].timeout, 30);
  assert.equal(s.env.MEU_ENV, '1');
  assert.equal(s.env.DISABLE_AUTOUPDATER, '1');
  assert.deepEqual(cur, alheio(), 'o objeto original nao e alterado');
});

test('e idempotente: aplicar duas vezes da o mesmo resultado', () => {
  const opts = { node: NODE_MAC, kitDir: KIT_MAC, env: { DISABLE_AUTOUPDATER: '1', HTTPS_PROXY: 'http://proxy:8080', NO_PROXY: 'localhost,127.0.0.1' } };
  const a = mergeSettings(alheio(), opts);
  const b = mergeSettings(a.settings, opts, a.record);
  assert.deepEqual(b.settings, a.settings);
  assert.equal(b.changed, false);
  assert.deepEqual(b.record.env_anterior, a.record.env_anterior, 'o valor anterior original mantem-se');
});

test('caminhos do Windows usam barras "/" e aspas (utilizador com espaco e acentos)', () => {
  const { settings: s } = mergeSettings({}, { node: NODE_WIN, kitDir: KIT_WIN });
  const cmd = s.hooks.SubagentStop[0].hooks[0].command;
  assert.equal(cmd, '"C:/Program Files/nodejs/node.exe" "C:/Users/João Silva/.workshop-claude/kit/hooks/subagent-stop.mjs"');
  assert.ok(!cmd.includes('\\'));
  assert.equal(s.statusLine.command, '"C:/Program Files/nodejs/node.exe" "C:/Users/João Silva/.workshop-claude/kit/statusline/statusline.mjs"');
  assert.ok(isOurs(cmd));
});

test('sem statusLine: instala a do workshop; com --substituir-statusline guarda a anterior', () => {
  const a = mergeSettings({}, { node: NODE_MAC, kitDir: KIT_MAC });
  assert.equal(a.record.statusline_nossa, true);
  assert.ok(isOurs(a.settings.statusLine.command));
  const b = mergeSettings(alheio(), { node: NODE_MAC, kitDir: KIT_MAC, substituirStatusline: true });
  assert.ok(isOurs(b.settings.statusLine.command));
  assert.deepEqual(b.record.statusline_anterior, alheio().statusLine);
  assert.deepEqual(b.warnings, []);
});

test('atualiza o caminho do node sem duplicar os hooks', () => {
  const a = mergeSettings(alheio(), { node: NODE_MAC, kitDir: KIT_MAC });
  const b = mergeSettings(a.settings, { node: '/opt/homebrew/bin/node', kitDir: KIT_MAC }, a.record);
  assert.equal(b.settings.hooks.SubagentStop.length, 1);
  assert.equal(b.settings.hooks.Stop.length, 2);
  assert.ok(b.settings.hooks.Stop[1].hooks[0].command.startsWith('"/opt/homebrew/bin/node"'));
});

test('stop.mjs e subagent-stop.mjs nao se confundem', () => {
  const s = { hooks: { Stop: [{ hooks: [{ type: 'command', command: command(NODE_MAC, `${KIT_MAC}/hooks/subagent-stop.mjs`) }] }] } };
  const r = mergeSettings(s, { node: NODE_MAC, kitDir: KIT_MAC });
  assert.equal(r.settings.hooks.Stop[0].hooks.length, 1, 'o hook (estranho) do subagente no Stop fica');
  assert.equal(r.settings.hooks.Stop.length, 2, 'e o stop.mjs e acrescentado');
});

test('unmerge repoe exatamente o original', () => {
  const orig = alheio();
  const env = { DISABLE_AUTOUPDATER: '1', NODE_EXTRA_CA_CERTS: '/x/ca.pem', NO_PROXY: 'localhost,127.0.0.1' };
  const a = mergeSettings(orig, { node: NODE_MAC, kitDir: KIT_MAC, env, substituirStatusline: true });
  assert.deepEqual(unmergeSettings(a.settings, a.record), orig);
  const vazio = mergeSettings({}, { node: NODE_MAC, kitDir: KIT_MAC, env });
  assert.deepEqual(unmergeSettings(vazio.settings, vazio.record), {});
});

test('unmerge mantem o que a pessoa mudou depois da instalacao', () => {
  const a = mergeSettings(alheio(), { node: NODE_MAC, kitDir: KIT_MAC, env: { DISABLE_AUTOUPDATER: '1' } });
  const depois = JSON.parse(JSON.stringify(a.settings));
  depois.theme = 'dark';
  depois.env.DISABLE_AUTOUPDATER = '0';
  const r = unmergeSettings(depois, a.record);
  assert.equal(r.theme, 'dark');
  assert.equal(r.env.DISABLE_AUTOUPDATER, '0', 'valor alterado pela pessoa fica');
  assert.ok(!JSON.stringify(r).includes('.workshop-claude/kit/'));
});

test('env com o mesmo valor antes do workshop nao e removida no unmerge', () => {
  const orig = { env: { DISABLE_AUTOUPDATER: '1' } };
  const a = mergeSettings(orig, { node: NODE_MAC, kitDir: KIT_MAC, env: { DISABLE_AUTOUPDATER: '1' } });
  assert.deepEqual(unmergeSettings(a.settings, a.record), orig);
});

test('settings.json invalido ou com tipos errados da SettingsError (E-CFG-05)', () => {
  assert.throws(() => parseSettings('{ "a": 1, }'), SettingsError);
  assert.throws(() => parseSettings('[1,2]'), SettingsError);
  assert.deepEqual(parseSettings(''), {});
  assert.deepEqual(parseSettings('\uFEFF{"a":1}'), { a: 1 });
  assert.throws(() => mergeSettings({ hooks: [] }, { node: NODE_MAC, kitDir: KIT_MAC }), SettingsError);
  assert.throws(() => mergeSettings({ hooks: { Stop: {} } }, { node: NODE_MAC, kitDir: KIT_MAC }), SettingsError);
  assert.throws(() => mergeSettings({ env: 'x' }, { node: NODE_MAC, kitDir: KIT_MAC }), SettingsError);
});

test('checkSettings deteta o que falta e statusline alheia', () => {
  const opts = { node: NODE_MAC, kitDir: KIT_MAC, env: { DISABLE_AUTOUPDATER: '1' } };
  assert.deepEqual(checkSettings({}, opts).faltam.sort(), ['env DISABLE_AUTOUPDATER', 'hook Stop', 'hook SubagentStop', 'statusLine']);
  const a = mergeSettings(alheio(), opts);
  const c = checkSettings(a.settings, opts);
  assert.equal(c.ok, true);
  assert.equal(c.statusline, 'alheia');
});

test('language (D-20): define so se nao houver; atualiza a nossa; nunca toca na da pessoa; unmerge so tira a nossa', () => {
  const opts = { node: NODE_MAC, kitDir: KIT_MAC };
  const a = mergeSettings(alheio(), { ...opts, language: 'European Portuguese' });
  assert.equal(a.settings.language, 'European Portuguese');
  assert.equal(a.record.language_criado, true);
  const b = mergeSettings(a.settings, { ...opts, language: 'Hebrew' }, a.record);
  assert.equal(b.settings.language, 'Hebrew', 'a nossa acompanha a lingua da maquina');
  assert.equal(unmergeSettings(b.settings, b.record).language, undefined);
  const mudada = { ...b.settings, language: 'japanese' };
  const c = mergeSettings(mudada, { ...opts, language: 'English' }, b.record);
  assert.equal(c.settings.language, 'japanese', 'a pessoa mudou-a: fica');
  assert.equal(unmergeSettings(c.settings, c.record).language, 'japanese');
  const propria = mergeSettings({ language: 'spanish' }, { ...opts, language: 'Hindi' });
  assert.equal(propria.settings.language, 'spanish');
  assert.equal(propria.record.language_criado, false);
  assert.equal(unmergeSettings(propria.settings, propria.record).language, 'spanish');
  const sem = mergeSettings(alheio(), opts);
  assert.equal('language' in sem.settings, false, 'sem lingua suportada nao se define nada');
});

// --- chaos G3-network: o proxy gravado numa rede (escritorio) nao pode ficar quando a rede ja nao o tem
test('proxy de uma instalacao anterior sai quando ja nao e pedido; volta o anterior; o da pessoa fica', () => {
  const opts = { node: NODE_MAC, kitDir: KIT_MAC };
  const office = { DISABLE_AUTOUPDATER: '1', HTTPS_PROXY: 'http://proxy.empresa:8080', NO_PROXY: 'localhost,127.0.0.1' };
  const a = mergeSettings(alheio(), { ...opts, env: office });
  assert.equal(a.settings.env.HTTPS_PROXY, 'http://proxy.empresa:8080');
  const venue = mergeSettings(a.settings, { ...opts, env: { DISABLE_AUTOUPDATER: '1' } }, a.record);
  assert.equal('HTTPS_PROXY' in venue.settings.env, false, 'o proxy do escritorio sai');
  assert.equal('NO_PROXY' in venue.settings.env, false, 'o NO_PROXY que veio com ele tambem');
  assert.equal(venue.settings.env.MEU_ENV, '1', 'o resto do env fica');
  assert.equal('HTTPS_PROXY' in venue.record.env_valor, false);
  assert.deepEqual(unmergeSettings(venue.settings, venue.record).env, alheio().env, 'o desinstalar continua a repor o original');
  const back = mergeSettings(venue.settings, { ...opts, env: office }, venue.record);
  assert.equal(back.settings.env.HTTPS_PROXY, 'http://proxy.empresa:8080', 'de volta ao escritorio, volta o proxy');
  assert.deepEqual(unmergeSettings(back.settings, back.record).env, alheio().env);

  // A pessoa ja tinha um proxy seu antes do workshop: o setup trocou-o e depois repoe-no (nunca o apaga).
  const propria = { ...alheio(), env: { HTTPS_PROXY: 'http://meu-proxy:3128' } };
  const b = mergeSettings(propria, { ...opts, env: office });
  const b2 = mergeSettings(b.settings, { ...opts, env: { DISABLE_AUTOUPDATER: '1' } }, b.record);
  assert.equal(b2.settings.env.HTTPS_PROXY, 'http://meu-proxy:3128');
  // A pessoa mudou o proxy depois da instalacao: fica o dela.
  const mudado = { ...a.settings, env: { ...a.settings.env, HTTPS_PROXY: 'http://outro:8080' } };
  const c = mergeSettings(mudado, { ...opts, env: { DISABLE_AUTOUPDATER: '1' } }, a.record);
  assert.equal(c.settings.env.HTTPS_PROXY, 'http://outro:8080');
  // O mesmo valor que a pessoa ja tinha antes do workshop nao e nosso: nunca sai.
  const igual = { env: { HTTPS_PROXY: 'http://proxy.empresa:8080' } };
  const d = mergeSettings(igual, { ...opts, env: office });
  const d2 = mergeSettings(d.settings, { ...opts, env: { DISABLE_AUTOUPDATER: '1' } }, d.record);
  assert.equal(d2.settings.env.HTTPS_PROXY, 'http://proxy.empresa:8080');
  // O certificado da empresa fica (noutra rede nao estraga nada).
  const ca = mergeSettings({}, { ...opts, env: { NODE_EXTRA_CA_CERTS: '/x/ca.pem', UV_SYSTEM_CERTS: 'true' } });
  const ca2 = mergeSettings(ca.settings, { ...opts, env: {} }, ca.record);
  assert.equal(ca2.settings.env.NODE_EXTRA_CA_CERTS, '/x/ca.pem');
});

test('NO_PROXY junta o da pessoa ao nosso, sem repetidos, e o checkSettings aceita a lista junta', () => {
  const opts = { node: NODE_MAC, kitDir: KIT_MAC };
  const cur = { env: { NO_PROXY: '.corp.internal, localhost' } };
  const env = { HTTPS_PROXY: 'http://p:8080', NO_PROXY: 'localhost,127.0.0.1' };
  const a = mergeSettings(cur, { ...opts, env });
  assert.equal(a.settings.env.NO_PROXY, 'localhost,127.0.0.1,.corp.internal');
  const b = mergeSettings(a.settings, { ...opts, env }, a.record);
  assert.equal(b.settings.env.NO_PROXY, 'localhost,127.0.0.1,.corp.internal', 'idempotente: nada se acumula');
  assert.equal(unmergeSettings(b.settings, b.record).env.NO_PROXY, '.corp.internal, localhost', 'o desinstalar repoe o da pessoa');
  assert.equal(checkSettings(b.settings, { ...opts, env }).faltam.includes('env NO_PROXY'), false);
  const venue = mergeSettings(b.settings, { ...opts, env: {} }, b.record);
  assert.equal(venue.settings.env.NO_PROXY, '.corp.internal, localhost', 'sem proxy, volta o NO_PROXY da pessoa');
});

test('checkSettings encontra o proxy nosso que esta execucao ja nao pede (o passo 8 nao fica "ja feito")', () => {
  const opts = { node: NODE_MAC, kitDir: KIT_MAC };
  const office = { DISABLE_AUTOUPDATER: '1', HTTPS_PROXY: 'http://proxy.empresa:8080', NO_PROXY: 'localhost,127.0.0.1' };
  const a = mergeSettings({}, { ...opts, env: office });
  assert.deepEqual(checkSettings(a.settings, { ...opts, env: office, record: a.record }).faltam, []);
  const r = checkSettings(a.settings, { ...opts, env: { DISABLE_AUTOUPDATER: '1' }, record: a.record });
  assert.deepEqual(r.faltam.filter((f) => f.startsWith('env')).sort(), ['env HTTPS_PROXY (stale)', 'env NO_PROXY (stale)']);
  const venue = mergeSettings(a.settings, { ...opts, env: { DISABLE_AUTOUPDATER: '1' } }, a.record);
  const r2 = checkSettings(venue.settings, { ...opts, env: { DISABLE_AUTOUPDATER: '1' }, record: venue.record });
  assert.deepEqual(r2.faltam.filter((f) => f.startsWith('env')), []);
});
