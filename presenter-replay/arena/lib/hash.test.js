// Teste pré-escrito para a tarefa lib-hash (ver specs/lib-hash.md).
import { test, assert, readSource } from './testkit.js';
import { securityProblems } from './security.js';

let mod = null;
let importError = null;
try {
  mod = await import('./hash.js');
} catch (e) {
  importError = e;
}

test('lib/hash.js existe e carrega', () => {
  assert.ok(mod, `lib/hash.js não existe ou tem um erro: ${importError?.message}`);
});

if (mod) {
  test('sha256Hex: vetores conhecidos', () => {
    assert.equal(mod.sha256Hex(''), 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
    assert.equal(mod.sha256Hex('abc'), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
    assert.equal(
      mod.sha256Hex('abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq'),
      '248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1',
    );
  });

  test('sha256Hex: UTF-8 e textos longos', () => {
    assert.equal(mod.sha256Hex('ação'), '0664077f33cc3ebbaa4bbdacac0eb70e740983080f01dce29929e73b7785a7ad');
    assert.equal(mod.sha256Hex('a'.repeat(64)), 'ffe054fe7ae0cb6dc65c3af9b61d5209f439851db43d0ba5997337df154668eb');
    assert.equal(mod.sha256Hex('x'.repeat(1000)), '44f8354494a5ba03ba1792a8d3e9c534c47a9181980fde7a3f44b06ef2ae7c7f');
  });

  test('caesar: desloca letras e preserva o resto', () => {
    assert.equal(mod.caesar('ATAQUE AO MEIO-DIA', 3), 'DWDTXH DR PHLR-GLD');
    assert.equal(mod.caesar('DWDTXH DR PHLR-GLD', -3), 'ATAQUE AO MEIO-DIA');
    assert.equal(mod.caesar('xyz', 3), 'abc');
    assert.equal(mod.caesar('Abc, 123!', 29), 'Def, 123!');
    assert.equal(mod.caesar('Olá', 1), 'Pmá');
  });

  test('base64: ida e volta com acentos', () => {
    assert.equal(mod.toBase64('Arena'), 'QXJlbmE=');
    assert.equal(mod.fromBase64('QXJlbmE='), 'Arena');
    assert.equal(mod.fromBase64(mod.toBase64('Segurança à séria ✓')), 'Segurança à séria ✓');
  });

  test('fonte segura', async () => {
    const src = await readSource('./hash.js', import.meta.url);
    assert.deepEqual(securityProblems(src), []);
    assert.ok(!/node:crypto|crypto\.subtle|require\(/.test(src), 'sem node:crypto, crypto.subtle nem require');
  });
}
