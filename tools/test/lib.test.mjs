// Testes das bibliotecas do instalador: redacao, custo, repos.conf e catalogo de mensagens.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { redact, literalsFromEnv } from '../../installer/lib/redact.mjs';
import { custoDeResultado, formatUsd, resolveModelo } from '../../installer/lib/cost.mjs';
import { derived, expand, fillUpper, loadConf, parseConf, releaseFileUrl, repoParts } from '../../installer/lib/conf.mjs';
import { flattenToShell, loadMessages, renderTroubleshooting } from '../../installer/lib/messages.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const json = (p) => JSON.parse(readFileSync(join(ROOT, p), 'utf8'));

test('redacao: casos partilhados (Node)', () => {
  const c = json('tools/test/redact-cases.json');
  for (const t of c.casos) assert.equal(redact(t.in, c.literais), t.out, t.in);
});

test('redacao: valores literais vem das variaveis secretas do ambiente', () => {
  assert.deepEqual(literalsFromEnv({ REPO_TOKEN: 'abcd1234', GH_TOKEN: 'x', OUTRA: 'zzzzzz' }), ['abcd1234']);
});

test('custo: casos partilhados (Node)', () => {
  const pricing = json('pricing.json');
  for (const t of json('tools/test/cost-cases.json').casos) {
    const r = custoDeResultado(t.resultado, pricing);
    if (t.usd === null) assert.equal(r.usd, null, t.nome);
    else assert.ok(Math.abs(r.usd - t.usd) < 1e-9, `${t.nome}: ${r.usd} != ${t.usd}`);
    assert.equal(formatUsd(r.usd), t.texto, t.nome);
  }
  assert.equal(resolveModelo('haiku', pricing), 'claude-haiku-5-5');
  assert.equal(resolveModelo('claude-sonnet-5-5[1m]', pricing), 'claude-sonnet-5-5');
});

test('custo: CLI devolve linhas chave<TAB>valor', () => {
  const r = spawnSync(process.execPath, [join(ROOT, 'installer/lib/cost.mjs'), '/nao/existe.json', join(ROOT, 'pricing.json')], { encoding: 'utf8' });
  assert.match(r.stdout, /^usd\t\nusd_texto\tUS\$ \?\n/);
});

test('repos.conf: leitura, comentarios, sobreposicao pelo ambiente', () => {
  const c = parseConf('# comentario\nA=1\n B = dois \nmau linha\nx=y\nURL=https://h/a?b=c\r\n');
  assert.deepEqual(c, { A: '1', B: 'dois', URL: 'https://h/a?b=c' });
  const conf = loadConf({ root: ROOT, env: { WORKSHOP_VERSION: 'v9', NADA: 'x' } });
  assert.equal(conf.WORKSHOP_VERSION, 'v9');
  assert.equal(conf.NADA, undefined, 'so chaves conhecidas');
});

test('repos.conf: padroes e valores derivados', () => {
  assert.deepEqual(repoParts('https://servidor.pt/dono/nome.git'), { repo: 'https://servidor.pt/dono/nome', host: 'servidor.pt', owner: 'dono', name: 'nome' });
  assert.equal(expand('{repo}/x/{version}/{file}', { repo: 'R', version: 'v1', file: 'f' }), 'R/x/v1/f');
  assert.equal(expand('{desconhecido}', {}), '{desconhecido}');
  const conf = { WORKSHOP_REPO_URL: 'https://g.pt/o/workshop-claude.git', WORKSHOP_VERSION: 'v1.2.3', MEMORY_APP_REPO_URL: 'https://g.pt/o/mem.git', MEMORY_APP_VERSION: 'v0.1.0', RELEASE_DOWNLOAD_URL: '{repo}/releases/download/{version}/{file}', RELEASE_PAGE_URL: '{repo}/releases/tag/{version}', UV_INSTALL_SH_URL: 'https://a/{version}/i.sh', UV_VERSION: '1' };
  const d = derived(conf);
  assert.equal(d.ONE_LINER_MAC, 'curl -fsSL https://g.pt/o/workshop-claude/releases/download/v1.2.3/setup-mac.sh | bash');
  assert.equal(d.ONE_LINER_WINDOWS, 'irm https://g.pt/o/workshop-claude/releases/download/v1.2.3/bootstrap-windows.ps1 | iex');
  assert.equal(d.CHECK_MAC_FIRST, 'curl -fsSL https://g.pt/o/workshop-claude/releases/download/v1.2.3/setup-mac.sh | bash -s -- --check');
  assert.equal(d.RELEASE_URL, 'https://g.pt/o/workshop-claude/releases/tag/v1.2.3');
  assert.equal(d.SHA256SUMS_URL, 'https://g.pt/o/workshop-claude/releases/download/v1.2.3/SHA256SUMS');
  assert.equal(d.UV_INSTALL_SH_URL_V, 'https://a/1/i.sh');
  assert.equal(releaseFileUrl(conf, 'memory', 'x.whl'), 'https://g.pt/o/mem/releases/download/v0.1.0/x.whl');
  assert.equal(fillUpper('{A} {b} {C}', { A: 1, C: 3 }), '1 {b} 3');
});

test('mensagens: catalogo completo e bem formado', () => {
  const m = loadMessages(ROOT);
  for (const n of ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12']) assert.ok(m.passos[n], `passo ${n}`);
  for (const [c, e] of Object.entries(m.erros)) {
    assert.match(c, /^E-[A-Z]+-\d{2}$/);
    assert.ok(['todos', 'mac', 'windows'].includes(e.so), c);
    for (const k of ['titulo', 'causa']) assert.ok(typeof e[k] === 'string' && e[k].length > 5, `${c}.${k}`);
    assert.ok(Array.isArray(e.fazer) && e.fazer.length > 0, `${c}.fazer`);
    assert.ok(Array.isArray(e.mac) && Array.isArray(e.windows), `${c} comandos`);
    for (const f of [e.causa, ...e.fazer]) assert.ok(f.split(/[.!?]\s/).every((s) => s.split(/\s+/).length <= 40), `${c}: frase demasiado longa`);
  }
  for (const k of ['estado_feito', 'estado_ja', 'estado_aviso', 'estado_falhou', 'final_pronto', 'helper_pergunta']) assert.ok(m.ui[k], k);
  assert.equal(m.ui.helper_pergunta, 'Queres que o Claude analise este erro? (custo estimado: menos de US$ 0,01)');
  assert.equal(m.ui.final_pronto, 'Está tudo pronto para o workshop.');
});

test('mensagens: flattenToShell e reversivel em bash (aspas, acentos, listas)', () => {
  const obj = { ui: { a: "o 'teste' «ç»", lista: ['x', "y'z"] }, erros: { 'E-NET-01': { titulo: 'T $HOME `x`' } } };
  const sh = flattenToShell(obj);
  const r = spawnSync('bash', ['-c', `${sh}\nprintf '%s|%s|%s|%s|%s' "$M_ui_a" "$M_ui_lista_n" "$M_ui_lista_1" "$M_erros_E_NET_01_titulo" "\${M_ui_lista_0}"`], { encoding: 'utf8' });
  assert.equal(r.stdout, "o 'teste' «ç»|2|y'z|T $HOME `x`|x");
});

test('TROUBLESHOOTING: cada codigo aparece na secao de cada sistema a que se aplica', () => {
  const m = loadMessages(ROOT);
  const md = renderTroubleshooting(m, { CHECK_MAC: 'cm', CHECK_WINDOWS: 'cw', DOCTOR_MAC: 'dm', DOCTOR_WINDOWS: 'dw' }, { hosts: ['api.anthropic.com'] });
  const [, mac, win] = md.split(/^## (?:macOS|Windows)$/m);
  for (const [c, e] of Object.entries(m.erros)) {
    if (e.so !== 'windows') assert.ok(mac.includes(`### ${c} `), `${c} em macOS`);
    if (e.so !== 'mac') assert.ok(win.includes(`### ${c} `), `${c} em Windows`);
  }
  assert.ok(md.includes('`api.anthropic.com`'));
});

test('mensagens: o catalogo ingles (setup) tem os mesmos codigos e passos que o portugues', () => {
  const pt = loadMessages(ROOT);
  const en = loadMessages(ROOT, 'en');
  assert.deepEqual(loadMessages(ROOT, 'pt'), pt);
  assert.deepEqual(Object.keys(en.erros).sort(), Object.keys(pt.erros).sort());
  assert.deepEqual(Object.keys(en.passos).sort(), Object.keys(pt.passos).sort());
  for (const [c, e] of Object.entries(en.erros)) {
    assert.equal(e.so, pt.erros[c].so, `${c}.so`);
    for (const k of ['titulo', 'causa']) assert.ok(typeof e[k] === 'string' && e[k].length > 5, `${c}.${k}`);
    assert.ok(Array.isArray(e.fazer) && e.fazer.length > 0, `${c}.fazer`);
    assert.ok(Array.isArray(e.mac) && Array.isArray(e.windows), `${c} comandos`);
  }
  assert.equal(en.ui.final_pronto, 'Everything is ready for the workshop.');
});

test('TROUBLESHOOTING: versao inglesa (titulos, ancoras iguais as do pt, todos os codigos)', () => {
  const vars = { CHECK_MAC: 'cm', CHECK_WINDOWS: 'cw', DOCTOR_MAC: 'dm', DOCTOR_WINDOWS: 'dw' };
  const en = loadMessages(ROOT, 'en');
  const md = renderTroubleshooting(en, vars, { hosts: ['api.anthropic.com'], lingua: 'en' });
  const pt = renderTroubleshooting(loadMessages(ROOT), vars, { hosts: ['api.anthropic.com'] });
  assert.match(md, /^<!-- GENERATED by tools\/render\.mjs from setup\/messages\.en\.json\. Do not edit by hand\. -->\n\n# Setup troubleshooting\n\n\*\*English\*\* · \[Português\]\(pt\/TROUBLESHOOTING\.md\)\n/);
  assert.match(pt, /^<!-- GERADO [^\n]*-->\n\n# Resolução de problemas do setup\n\n\[English\]\(\.\.\/TROUBLESHOOTING\.md\) · \*\*Português\*\*\n/);
  for (const h of ['## Before anything else', '## Index', '| Code | Problem | Where |', '## macOS', '## Windows', '## Required domains', '## Corporate proxies and certificates', '- **Why:** ', '- **What to do:**', 'Command (macOS):', '- Check only, without installing: `cm` (Mac) or `cw` (Windows).']) {
    assert.ok(md.includes(h), h);
  }
  for (const pal of ['Porquê', 'O que fazer', 'Índice', 'Domínios necessários', 'Antes de tudo']) assert.ok(!md.includes(pal), pal);
  const ancoras = (t) => [...t.matchAll(/<a id="([^"]+)"><\/a>/g)].map((m) => m[1]);
  assert.deepEqual(ancoras(md), ancoras(pt));
  assert.ok(ancoras(md).includes('mac-e-net-01'));
  const [, mac, win] = md.split(/^## (?:macOS|Windows)$/m);
  for (const [c, e] of Object.entries(en.erros)) {
    assert.ok(md.includes(`| \`${c}\` | `), `${c} no indice`);
    if (e.so !== 'windows') assert.ok(mac.includes(`### ${c} · `) && md.includes(`(#mac-${c.toLowerCase()})`), `${c} em macOS`);
    if (e.so !== 'mac') assert.ok(win.includes(`### ${c} · `) && md.includes(`(#windows-${c.toLowerCase()})`), `${c} em Windows`);
  }
  assert.ok(md.includes('`api.anthropic.com`'));
  assert.throws(() => renderTroubleshooting(en, vars, { lingua: 'fr' }), /fr/);
});
