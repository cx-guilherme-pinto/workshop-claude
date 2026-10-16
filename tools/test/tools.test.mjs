// Testes das ferramentas: render, check-repo e injecao dos scripts da release.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { fillTemplate, netHosts, renderAll } from '../render.mjs';
import { hostPatterns, nonAsciiPositions, pythonCalls, usedCodesAndKeys } from '../check-repo.mjs';
import { injectBootstrap, injectMac, injectWindows, replaceBlock, setupWindowsUrl } from '../../installer/lib/inject.mjs';
import { loadConf } from '../../installer/lib/conf.mjs';
import { loadMessages } from '../../installer/lib/messages.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

test('render: marcadores desconhecidos sao erro; os conhecidos sao trocados', () => {
  assert.equal(fillTemplate('a {{X}} b', { X: 1 }), 'a 1 b');
  assert.throws(() => fillTemplate('{{NAO_EXISTE}}', {}), /NAO_EXISTE/);
});

test('render: README e docs tem os one-liners do repos.conf e respeitam o ambiente', () => {
  const env = { WORKSHOP_REPO_URL: 'https://github.com/exemplo/workshop-claude.git', RELEASE_DOWNLOAD_URL: '{repo}/releases/download/{version}/{file}' };
  const { vars, files } = renderAll(ROOT, env);
  assert.ok(files['README.md'].includes(vars.ONE_LINER_MAC));
  assert.ok(files['README.md'].includes(vars.ONE_LINER_WINDOWS));
  assert.ok(vars.ONE_LINER_MAC.startsWith('curl -fsSL https://github.com/exemplo/workshop-claude/releases/download/'));
  assert.ok(files['docs/PUBLICAR.md'].includes('5 passos'));
  assert.ok(files['docs/INSTALAR.md'].includes(vars.CHECK_WINDOWS));
  assert.ok(files['docs/TROUBLESHOOTING.md'].includes('E-NET-01'));
  assert.ok(netHosts(vars).includes('github.com'));
});

test('check-repo: padroes de servidor, ASCII e codigos usados', () => {
  assert.deepEqual(hostPatterns({ DEV_REPO_HOST: 'gitea.x.pt', WORKSHOP_REPO_URL: 'https://github.com/dono/w.git', MEMORY_APP_REPO_URL: 'https://gitea.x.pt/d/m.git' }).sort(), ['github.com/dono/', 'gitea.x.pt'].sort());
  assert.deepEqual(nonAsciiPositions(Buffer.from('ab\ncé')), [{ line: 2, col: 2, byte: 0xc3 }, { line: 2, col: 3, byte: 0xa9 }]);
  const sh = usedCodesAndKeys('ws_fail E-NET-01 ""; ws_m s7_oauth; ws_msg passo N=1', 'sh');
  assert.deepEqual([...sh.codes], ['E-NET-01']);
  assert.deepEqual([...sh.keys].sort(), ['passo', 's7_oauth']);
  const ps = usedCodesAndKeys("Set-WsFail 'E-GH-01' ''; (M 'a_instalar'); M 's0_so' @{}", 'ps1');
  assert.deepEqual([...ps.keys].sort(), ['a_instalar', 's0_so']);
});

test('check-repo: o repositorio atual passa', () => {
  const r = spawnSync(process.execPath, [join(ROOT, 'tools/check-repo.mjs')], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
});

test('injecao: bloco marcado e obrigatorio', () => {
  assert.throws(() => replaceBlock('sem bloco', 'x'), /WS-INJETADO/);
  assert.equal(replaceBlock('a\n# >>> WS-INJETADO >>>\nvelho\n# <<< WS-INJETADO <<<\nb', 'novo'), 'a\n# >>> WS-INJETADO >>>\nnovo\n# <<< WS-INJETADO <<<\nb');
});

test('injecao Mac: o script da release define a configuracao, o pricing e as mensagens', () => {
  const conf = loadConf({ root: ROOT, env: {} });
  const out = injectMac(readFileSync(join(ROOT, 'setup/setup-mac.sh'), 'utf8'), {
    conf,
    kitSha256: 'a'.repeat(64),
    pricingText: readFileSync(join(ROOT, 'pricing.json'), 'utf8'),
    messages: loadMessages(ROOT),
  });
  const dir = mkdtempSync(join(tmpdir(), 'ws-inj-'));
  try {
    const f = join(dir, 'setup-mac.sh');
    writeFileSync(f, out);
    const r = spawnSync('/bin/bash', ['-c', `WS_SOURCE_ONLY=1 source "${f}"; ws_injetado; printf '%s\\n' "$WS_INJ_KIT_SHA256" "$M_ui_final_pronto"; printf '%s\\n' "$WS_INJ_CONF" | grep -c '^WORKSHOP_VERSION='; printf '%s' "$WS_INJ_PRICING" | head -c 1`], { encoding: 'utf8' });
    assert.equal(r.status, 0, r.stderr);
    assert.equal(r.stdout, `${'a'.repeat(64)}\nEstá tudo pronto para o workshop.\n1\n{`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('injecao Windows: so ASCII, base64 descodifica para UTF-8', () => {
  const conf = loadConf({ root: ROOT, env: {} });
  const messages = loadMessages(ROOT);
  const out = injectWindows(readFileSync(join(ROOT, 'setup/setup-windows.ps1'), 'utf8'), { conf, kitSha256: 'b'.repeat(64), pricingText: '{"x":"ç"}', messages });
  assert.ok(!/[^\x00-\x7f]/.test(out));
  const b64 = /\$script:WsInjMessagesB64 = \(@\(\n([\s\S]*?)\n\) -join ''\)/.exec(out)[1].split(',\n').map((s) => s.replace(/^'|'$/g, '')).join('');
  assert.deepEqual(JSON.parse(Buffer.from(b64, 'base64').toString('utf8')), messages);
  const boot = injectBootstrap(readFileSync(join(ROOT, 'setup/bootstrap-windows.ps1'), 'utf8'), { conf, setupSha256: 'c'.repeat(64) });
  assert.ok(boot.includes(`$WsSetupSha256 = '${'c'.repeat(64)}'`));
  assert.ok(setupWindowsUrl(conf).endsWith(`/releases/download/${conf.WORKSHOP_VERSION}/setup-windows.ps1`));
});

test('check-repo: deteta chamadas a python, python3 e py, mas nao texto nem opcoes', () => {
  const t = [
    'python3 -c "print(1)"',
    'x=$(python -V)',
    "spawnSync('python3', ['-V'])",
    '& py -3 -V',
    'Start-Process python.exe',
    'uv tool install --managed-python --python 3.12 x.whl',
    '# python3 num comentario',
    'echo "Python 3.12 gerido pelo uv"',
    'PYTHON_VERSION=3.12',
    'local out rc py fails',
    'const [f, py, uv] = process.argv;',
  ].join('\n');
  assert.deepEqual(pythonCalls(t).map((c) => c.line), [1, 2, 3, 4, 5]);
});
