// Pre-written test for the lib-hash task (see specs/lib-hash.md).
import { test, assert, readSource } from './testkit.js';
import { problemasDeSeguranca } from './seguranca.js';

let mod = null;
let erroImport = null;
try {
  mod = await import('./hash.js');
} catch (e) {
  erroImport = e;
}

test('lib/hash.js exists and loads', () => {
  assert.ok(mod, `lib/hash.js does not exist or has an error: ${erroImport?.message}`);
});

if (mod) {
  test('sha256Hex: known vectors', () => {
    assert.equal(mod.sha256Hex(''), 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
    assert.equal(mod.sha256Hex('abc'), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
    assert.equal(
      mod.sha256Hex('abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq'),
      '248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1',
    );
  });

  test('sha256Hex: UTF-8 and long texts', () => {
    assert.equal(mod.sha256Hex('ação'), '0664077f33cc3ebbaa4bbdacac0eb70e740983080f01dce29929e73b7785a7ad');
    assert.equal(mod.sha256Hex('a'.repeat(64)), 'ffe054fe7ae0cb6dc65c3af9b61d5209f439851db43d0ba5997337df154668eb');
    assert.equal(mod.sha256Hex('x'.repeat(1000)), '44f8354494a5ba03ba1792a8d3e9c534c47a9181980fde7a3f44b06ef2ae7c7f');
  });

  test('cesar: shifts letters and keeps everything else', () => {
    assert.equal(mod.cesar('ATTACK AT NOON', 3), 'DWWDFN DW QRRQ');
    assert.equal(mod.cesar('DWWDFN DW QRRQ', -3), 'ATTACK AT NOON');
    assert.equal(mod.cesar('xyz', 3), 'abc');
    assert.equal(mod.cesar('Abc, 123!', 29), 'Def, 123!');
    assert.equal(mod.cesar('Olá', 1), 'Pmá');
  });

  test('base64: round trip with accents', () => {
    assert.equal(mod.paraBase64('Arena'), 'QXJlbmE=');
    assert.equal(mod.deBase64('QXJlbmE='), 'Arena');
    assert.equal(mod.deBase64(mod.paraBase64('Café, naïve ✓')), 'Café, naïve ✓');
  });

  test('safe source', async () => {
    const src = await readSource('./hash.js', import.meta.url);
    assert.deepEqual(problemasDeSeguranca(src), []);
    assert.ok(!/node:crypto|crypto\.subtle|require\(/.test(src), 'no node:crypto, crypto.subtle or require');
  });
}
