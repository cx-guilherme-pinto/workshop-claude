// Tests of the Arena's decision points for Project 1:
//   - "your card" (specs/my-card.json -> card my-01): validation in the Arena language, generation, plan, gallery;
//   - the cards broken on purpose (spec_gaps): spec.md without the deciding detail, card.test.js with only a hash;
//   - the cost decision: tools/plan.mjs --crypto sonnet|haiku;
//   - the settings that stop agents from changing a card's spec or test.
// (--retry is tested with the orchestrator, in orchestrator/test/retry.test.mjs.)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { appendFileSync, cpSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import { montar, settingsDemo } from '../../installer/assemble-demo.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const DEMO = join(ROOT, 'demo-project');
const SOLUTIONS = join(ROOT, 'dev', 'solutions');
const ler = (p) => readFileSync(p, 'utf8');
const lerJson = (p) => JSON.parse(ler(p));
const env = () => {
  const e = { ...process.env };
  delete e.WORKSHOP_LANG;
  delete e.NODE_TEST_CONTEXT;
  return e;
};

function arena(l) {
  const dest = join(mkdtempSync(join(tmpdir(), `arena-dec-${l}-`)), 'arena');
  montar({ dest, node: process.execPath, git: false, probe: false, lingua: l });
  return { dest, limpar: () => rmSync(dirname(dest), { recursive: true, force: true }) };
}
const node = (cwd, ...a) => spawnSync(process.execPath, a, { cwd, encoding: 'utf8', env: env() });
const writeMyCard = (dest, obj) => writeFileSync(join(dest, 'specs', 'my-card.json'), typeof obj === 'string' ? obj : JSON.stringify(obj, null, 2));
const example = (dest) => lerJson(join(dest, 'specs', 'my-card.example.json'));

// A card.js like an agent would write it, straight from the card's fields.
function cardJs(card) {
  const fn = { choice: 'choice', 'spot-the-flaw': 'spotTheFlaw', order: 'order', answer: 'answer' }[card.template];
  const def = { ...card };
  for (const k of ['mode', 'wrong', 'depends', 'template', 'spec_gaps']) delete def[k];
  return `import { ${fn} } from '../../templates/${card.template}.js';\n\nexport default ${fn}(${JSON.stringify(def, null, 2)});\n`;
}

// ---------- your card ----------

test('your card: without specs/my-card.json nothing changes (100 cards, gen --check green, no my-01)', () => {
  const { dest, limpar } = arena('pt');
  try {
    assert.ok(existsSync(join(dest, 'specs', 'my-card.example.json')));
    assert.equal(node(dest, 'tools/gen.mjs', '--check').status, 0);
    assert.ok(!existsSync(join(dest, 'cards', 'my-01')));
    const p = node(dest, 'tools/plan.mjs');
    assert.equal(p.status, 0, p.stderr);
    const plan = lerJson(join(dest, 'plan.json'));
    assert.equal(plan.tasks.filter((t) => t.group_type === 'card').length, 100);
  } finally {
    limpar();
  }
});

for (const l of ['pt', 'en']) {
  test(`your card (${l}): the example copied unchanged generates my-01, the plan has 101 cards and the gallery shows it`, async () => {
    const { dest, limpar } = arena(l);
    try {
      cpSync(join(dest, 'specs', 'my-card.example.json'), join(dest, 'specs', 'my-card.json'));
      const g = node(dest, 'tools/gen.mjs');
      assert.equal(g.status, 0, g.stderr);
      assert.match(g.stdout, /101/);
      const spec = ler(join(dest, 'cards', 'my-01', 'spec.md'));
      assert.ok(spec.startsWith(l === 'en' ? '# Card my-01 — The token on the shared screen' : '# Cartão my-01 — O token no ecrã partilhado'));
      assert.match(spec, /`"b"`/);
      assert.match(ler(join(dest, 'cards', 'my-01', 'card.test.js')), /"id":"my-01","category":"secure-code","template":"choice","answer":"b","wrong":\["a","c","d"\]/);
      assert.match(ler(join(dest, 'TASKS.md')), /\| my-01 \| choice \|/);
      assert.equal(node(dest, 'tools/gen.mjs', '--check').status, 0);

      const p = node(dest, 'tools/plan.mjs');
      assert.equal(p.status, 0, p.stderr);
      const plan = lerJson(join(dest, 'plan.json'));
      const cards = plan.tasks.filter((t) => t.group_type === 'card');
      assert.equal(cards.length, 101);
      const mine = plan.tasks.find((t) => t.id === 'my-01');
      assert.equal(mine.agent, 'worker', 'your card is built with Haiku');
      assert.equal(mine.group, 'secure-code');
      assert.deepEqual(mine.test, ['node', '--test', 'cards/my-01/card.test.js']);
      assert.ok(plan.tasks.find((t) => t.id === 'integration').depends_on.includes('*cards'));

      // The gallery (/api/cards) lists it with its metadata.
      const { listCards } = await import(pathToFileURL(join(dest, 'server.js')).href);
      const c = listCards(dest).cards.find((x) => x.id === 'my-01');
      assert.ok(c, 'my-01 in /api/cards');
      assert.equal(c.category, 'secure-code');
      assert.equal(c.in_plan, true);
      assert.equal(c.exists, false);

      // A card.js like the agent writes passes the generated test.
      writeFileSync(join(dest, 'cards', 'my-01', 'card.js'), cardJs({ id: 'my-01', ...example(dest), _help: undefined }));
      const t = node(dest, '--test', 'cards/my-01/card.test.js');
      assert.equal(t.status, 0, t.stdout.slice(-2000));
    } finally {
      limpar();
    }
  });
}

test('your card: each template generates a test that a straightforward card.js passes (the wrong answers are really wrong)', async () => {
  const { dest, limpar } = arena('en');
  const { validateMyCard } = await import(pathToFileURL(join(dest, 'tools', 'my-card.mjs')).href);
  const categories = lerJson(join(dest, 'specs', 'cards.json')).categories;
  const base = { title: 'My own card', concept: 'One short idea about security.', prompt: 'What is the answer here?', explanation: 'Because this is the safe way to do it.' };
  const cases = [
    { ...base, template: 'spot-the-flaw', language: 'js', segments: ['const a = 1;', 'eval(input);', 'console.log(a);', 'el.innerHTML = input;'], answer: [3, 1] },
    { ...base, template: 'order', category: 'passwords', difficulty: 2, items: [{ id: 'a', text: 'Second' }, { id: 'b', text: 'First' }, { id: 'c', text: 'Third' }], answer: ['b', 'a', 'c'] },
    { ...base, template: 'answer', placeholder: 'An acronym', accept: ['MFA', '2FA'], scenario: { kind: 'text', lines: ['The root account only has a password.'] } },
    { ...base, template: 'choice', options: [{ id: 'x', text: 'Yes' }, { id: 'y', text: 'No' }], answer: 'y', wrong: ['x'] },
  ];
  try {
    for (const raw of cases) {
      const r = validateMyCard(raw, { lang: 'en', categories });
      assert.deepEqual(r.errors, [], raw.template);
      assert.ok(r.card.wrong.length > 0, `${raw.template}: wrong answers`);
      writeMyCard(dest, raw);
      const g = node(dest, 'tools/gen.mjs');
      assert.equal(g.status, 0, g.stderr);
      writeFileSync(join(dest, 'cards', 'my-01', 'card.js'), cardJs(r.card));
      const t = node(dest, '--test', 'cards/my-01/card.test.js');
      assert.equal(t.status, 0, `${raw.template}: ${t.stdout.slice(-2000)}`);
    }
  } finally {
    limpar();
  }
});

test('your card: clear, short errors in the Arena language (field, what is wrong, an example) and nothing is written', () => {
  for (const l of ['pt', 'en']) {
    const { dest, limpar } = arena(l);
    const ex = example(dest);
    const EX = l === 'en' ? /for example/ : /por exemplo/;
    const cases = [
      ['{ "title": "x", }', l === 'en' ? /is not valid JSON: there is an error at line 1, column 17/ : /não é JSON válido: há um erro na linha 1, coluna 17/],
      ['{\n  "title": "x"\n  "template": "choice"\n}', l === 'en' ? /line 3, column 3/ : /linha 3, coluna 3/],
      [{ ...ex, title: undefined }, l === 'en' ? /the field "title" is missing/ : /falta o campo "title"/],
      [{ ...ex, template: 'quiz' }, /"template".*spot-the-flaw, choice, order, answer/],
      [{ ...ex, answer: 'z' }, /"answer".*a, b, c, d/],
      [{ ...ex, category: 'hacking' }, /"category".*secure-code/],
      [{ ...ex, difficulty: 5 }, /"difficulty"/],
      [{ ...ex, anwser: 'b' }, /"anwser"/],
      [{ ...ex, options: [{ id: 'a', text: 'only one' }] }, /"options"/],
      [{ ...ex, template: 'spot-the-flaw', options: undefined, segments: ['a', 'b'], answer: [2] }, /"answer".*0 .* 1/],
      [{ ...ex, template: 'order', options: undefined, items: [{ id: 'a', text: '1' }, { id: 'b', text: '2' }, { id: 'c', text: '3' }], answer: ['a', 'b', 'c'] }, /"items"/],
      [{ ...ex, template: 'answer', options: undefined, answer: undefined, accept: [] }, /"accept"/],
    ];
    try {
      for (const [raw, re] of cases) {
        writeMyCard(dest, raw);
        const g = node(dest, 'tools/gen.mjs');
        assert.equal(g.status, 1, `${JSON.stringify(raw).slice(0, 80)} should fail`);
        assert.match(g.stderr, /specs\/my-card\.json/);
        assert.match(g.stderr, re);
        assert.match(g.stderr, EX);
        assert.match(g.stderr, /node tools\/gen\.mjs/);
        assert.ok(!existsSync(join(dest, 'cards', 'my-01')), 'nothing written');
        // The plan refuses it with the same messages.
        const p = node(dest, 'tools/plan.mjs');
        assert.equal(p.status, 1);
        assert.match(p.stderr, re);
      }
      // Valid but not generated yet: the plan says to run gen first.
      cpSync(join(dest, 'specs', 'my-card.example.json'), join(dest, 'specs', 'my-card.json'));
      const p = node(dest, 'tools/plan.mjs');
      assert.equal(p.status, 1);
      assert.match(p.stderr, /node tools\/gen\.mjs/);
    } finally {
      limpar();
    }
  }
});

// ---------- the cards broken on purpose ----------

const specsPt = lerJson(join(DEMO, 'specs', 'cards.json'));
const specsEn = lerJson(join(DEMO, 'i18n', 'en', 'specs', 'cards.json'));
const broken = specsPt.cards.filter((c) => c.spec_gaps?.length);
// The values a broken card must not show anywhere in its card.test.js or (incomplete) spec.md.
function plainAnswers(c) {
  const out = [JSON.stringify(c.answer)];
  if (Array.isArray(c.answer)) out.push(JSON.stringify(c.answer).replace(/,/g, ', '), c.answer.map((x) => `'${x}'`).join(', '));
  else out.push(`'${c.answer}'`, `\`${c.answer}\``);
  if (c.accept) out.push(JSON.stringify(c.accept));
  return out;
}
const wordRe = (v) => new RegExp(`(^|[^\\w])${String(v).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|[^\\w])`, 'i');
// Copies the reference solutions into an Arena (dev/solutions, then dev/solutions/i18n/<l>).
function addSolutions(dest, l) {
  cpSync(SOLUTIONS, dest, { recursive: true, filter: (p) => !p.startsWith(join(SOLUTIONS, 'i18n')) });
  if (existsSync(join(SOLUTIONS, 'i18n', l))) cpSync(join(SOLUTIONS, 'i18n', l), dest, { recursive: true });
}
// The card.js of the reference solution with another answer: what an agent that guessed wrong writes.
const WRONG = {
  'pv-07': { from: "answer: 'b'", to: "answer: 'a'", shows: { en: /the card picks option a \("Browser fingerprinting: /, pt: /o cartão escolhe a opção a \("Impressão digital do browser: / } },
  'rd-09': { from: 'answer: [1, 3]', to: 'answer: [1, 2, 3]', shows: { en: /the card marks the indexes \[1, 2, 3\] as unsafe/, pt: /o cartão marca os índices \[1, 2, 3\] como inseguros/ } },
  'cr-07': { from: "answer: ['c', 'd', 'a', 'b']", to: "answer: ['c', 'd', 'b', 'a']", shows: { en: /the card puts the items in the order \["c", "d", "b", "a"\]/, pt: /o cartão põe os itens pela ordem \["c", "d", "b", "a"\]/ } },
  'sc-08': { from: /accept: \[.*\]/, to: "accept: ['403', '403 Forbidden', 'Forbidden']", shows: { en: /the card accepts \["403", "403 Forbidden", "Forbidden"\]/, pt: /o cartão aceita \["403", "403 Forbidden", "Forbidden"\]/ } },
};
const failureLine = (out, id) => out.split('\n').find((x) => x.includes('AssertionError') && x.includes(`cards/${id}/spec.md`));

test('broken cards: 4 of the 100, in 4 categories and 4 templates, the same in pt and en', () => {
  assert.equal(specsPt.cards.length, 100);
  assert.deepEqual(broken.map((c) => c.id).sort(), ['cr-07', 'pv-07', 'rd-09', 'sc-08']);
  assert.equal(new Set(broken.map((c) => c.category)).size, 4);
  assert.equal(new Set(broken.map((c) => c.template)).size, 4);
  assert.equal(specsEn.cards.length, 100);
  for (const c of broken) {
    const en = specsEn.cards.find((x) => x.id === c.id);
    assert.deepEqual(en.spec_gaps, c.spec_gaps, c.id);
    assert.deepEqual(en.answer, c.answer, `${c.id}: the same answer in both languages`);
  }
  assert.equal(specsEn.cards.filter((c) => c.spec_gaps?.length).length, 4);
});

for (const l of ['pt', 'en']) {
  test(`broken cards (${l}): no plaintext answer in card.test.js or spec.md, only a short hash`, () => {
    const { dest, limpar } = arena(l);
    try {
      const cards = (l === 'en' ? specsEn : specsPt).cards;
      for (const b of broken) {
        const c = cards.find((x) => x.id === b.id);
        const t = ler(join(dest, 'cards', c.id, 'card.test.js'));
        const spec = ler(join(dest, 'cards', c.id, 'spec.md'));
        for (const v of plainAnswers(c)) {
          assert.ok(!t.includes(v), `${c.id}: card.test.js has ${v}`);
          assert.ok(!spec.includes(v), `${c.id}: spec.md has ${v}`);
        }
        if (c.template === 'answer') {
          for (const v of c.accept) assert.doesNotMatch(t + spec, wordRe(v), `${c.id}: ${v}`);
          // Nor the wrong answers (they would give the right one away).
          for (const w of c.wrong.filter(Boolean)) assert.doesNotMatch(t, wordRe(w), `${c.id}: wrong ${w}`);
        } else {
          assert.doesNotMatch(t.split('\n').find((x) => x.startsWith('const SPEC = ')), /"wrong"|"answer"/, `${c.id}: no answer or wrong answers in SPEC`);
        }
        assert.match(t, /const GAP = \{"right":\["[0-9a-f]{8}"\]/, `${c.id}: the hash`);
        assert.match(t, /Math\.imul\(h \^ s\.charCodeAt\(i\), 0x01000193\)/, `${c.id}: FNV-1a inline`);
        assert.doesNotMatch(t, /\bcrypto\b|node:/, `${c.id}: no crypto and no Node-only import (runs in the browser too)`);
        assert.ok(t.includes(`--retry ${c.id}`), `${c.id}: the message says how to retry`);
        assert.doesNotMatch(t, /readSource\('\.\/spec\.md'/, `${c.id}: the test does not read the spec`);
      }
      // The other cards are as before: the answer in SPEC, no GAP block.
      const other = ler(join(dest, 'cards', 'pw-01', 'card.test.js'));
      assert.doesNotMatch(other, /GAP/);
      assert.match(other, /"answer":"c","wrong":\["a","b","d"\]/);
    } finally {
      limpar();
    }
  });

  test(`broken cards (${l}): the reference solutions pass with the incomplete specs; a wrong answer fails with the card's value and what the spec does not decide`, () => {
    const { dest, limpar } = arena(l);
    try {
      addSolutions(dest, l);
      for (const c of broken) {
        const file = `cards/${c.id}/card.test.js`;
        const ok = node(dest, '--test', '--test-reporter=spec', file);
        assert.equal(ok.status, 0, `${c.id}: the hash matches the reference solution\n${ok.stdout.slice(-1500)}`);
        // An agent that guessed wrong.
        const js = join(dest, 'cards', c.id, 'card.js');
        const right = ler(js);
        const w = WRONG[c.id];
        assert.ok(typeof w.from === 'string' ? right.includes(w.from) : w.from.test(right), `${c.id}: solution shape`);
        writeFileSync(js, right.replace(w.from, w.to));
        const r = node(dest, '--test', '--test-reporter=spec', file);
        assert.equal(r.status, 1, `${c.id} should fail with a wrong answer`);
        assert.match(r.stdout, /ℹ fail 1\b/, `${c.id}: only the answer test fails`);
        const line = failureLine(r.stdout, c.id);
        assert.ok(line, `${c.id}: failure line\n${r.stdout.slice(-1500)}`);
        assert.match(line, w.shows[l]);
        assert.match(line, l === 'en' ? /but that is not the answer the test expects\. cards\/[\w-]+\/spec\.md does not say / : /mas não é essa a resposta que o teste espera\. A spec cards\/[\w-]+\/spec\.md não diz /);
        assert.match(line, l === 'en' ? /decide it from the prompt and the concept, write it in the spec \(Field `(answer|accept)`/ : /decide-o a partir do enunciado e do conceito, escreve-o na spec \(Campo `(answer|accept)`/);
        assert.ok(line.includes(`/demo-swarm --retry ${c.id}`), c.id);
        for (const v of plainAnswers(c).slice(0, 2)) assert.ok(!line.includes(v), `${c.id}: the message must not give the answer ${v}`);
        if (c.template === 'answer') assert.doesNotMatch(line, wordRe(c.answer));
        writeFileSync(js, right);
      }
    } finally {
      limpar();
    }
  });
}

test('broken cards: a person writes the decision in spec.md, gen keeps it, --check stays green and the test is the same', () => {
  const { dest, limpar } = arena('en');
  try {
    addSolutions(dest, 'en');
    const before = Object.fromEntries(broken.map((c) => [c.id, ler(join(dest, 'cards', c.id, 'card.test.js'))]));
    for (const c of broken) appendFileSync(join(dest, 'cards', c.id, 'spec.md'), `\nField \`answer\`: decided by a person\n`);
    assert.equal(node(dest, 'tools/gen.mjs').status, 0);
    assert.equal(node(dest, 'tools/gen.mjs', '--check').status, 0);
    for (const c of broken) {
      assert.match(ler(join(dest, 'cards', c.id, 'spec.md')), /decided by a person/, `${c.id}: the fix stays`);
      assert.equal(ler(join(dest, 'cards', c.id, 'card.test.js')), before[c.id], `${c.id}: the test does not depend on the spec`);
      assert.equal(node(dest, '--test', `cards/${c.id}/card.test.js`).status, 0, c.id);
    }
  } finally {
    limpar();
  }
});

test('broken cards: the plan flags them (spec_gap), and grade fails a wrong one for good on attempt 1 with motivo "spec"', () => {
  const { dest, limpar } = arena('en');
  try {
    addSolutions(dest, 'en');
    const p = node(dest, 'tools/plan.mjs');
    assert.equal(p.status, 0, p.stderr);
    const plan = lerJson(join(dest, 'plan.json'));
    assert.deepEqual(plan.tasks.filter((t) => t.spec_gap).map((t) => t.id).sort(), broken.map((c) => c.id).sort());
    assert.ok(plan.tasks.filter((t) => t.spec_gap).every((t) => t.spec_gap === true && t.group_type === 'card'));
    // A wrong guess on rd-09: failed for good, motivo spec, the message in the excerpt.
    const js = join(dest, 'cards', 'rd-09', 'card.js');
    writeFileSync(js, ler(js).replace(WRONG['rd-09'].from, WRONG['rd-09'].to));
    const g = node(dest, 'tools/workshop/orchestrator/grade.mjs', 'rd-09', 'pv-07');
    assert.equal(g.status, 0, g.stderr);
    const st = lerJson(join(dest, '.workshop', 'status', 'rd-09.json'));
    assert.equal(st.estado, 'falhou');
    assert.equal(st.motivo, 'spec');
    assert.match(st.teste.excerto, /the card marks the indexes \[1, 2, 3\] as unsafe/);
    const ok = lerJson(join(dest, '.workshop', 'status', 'pv-07.json'));
    assert.equal(ok.estado, 'verde');
    assert.equal(ok.motivo, undefined);
  } finally {
    limpar();
  }
});

test('broken cards: gen --no-gaps writes the complete specs (the reference solution of the exercise)', () => {
  const { dest, limpar } = arena('pt');
  try {
    assert.equal(node(dest, 'tools/gen.mjs', '--no-gaps').status, 0);
    assert.match(ler(join(dest, 'cards', 'pv-07', 'spec.md')), /Campo `answer`: `"b"`/);
    assert.match(ler(join(dest, 'cards', 'rd-09', 'spec.md')), /Campo `answer` \(índices inseguros\): `\[1,3\]`/);
    assert.match(ler(join(dest, 'cards', 'cr-07', 'spec.md')), /Campo `answer` \(ordem certa\): `\["c","d","a","b"\]`/);
    assert.match(ler(join(dest, 'cards', 'sc-08', 'spec.md')), /Campo `accept`: `\["404"/);
    // Without --no-gaps, the gaps come back (the complete spec only stays if a person completed it).
    rmSync(join(dest, 'cards', 'pv-07', 'spec.md'));
    assert.equal(node(dest, 'tools/gen.mjs').status, 0);
    assert.doesNotMatch(ler(join(dest, 'cards', 'pv-07', 'spec.md')), /Campo `answer`/);
  } finally {
    limpar();
  }
});

test('broken cards: a gap that does not fit the template is an error in specs/cards.json', () => {
  const { dest, limpar } = arena('en');
  try {
    const f = join(dest, 'specs', 'cards.json');
    const s = lerJson(f);
    s.cards.find((c) => c.id === 'pw-01').spec_gaps = ['accept'];
    writeFileSync(f, JSON.stringify(s));
    const g = node(dest, 'tools/gen.mjs');
    assert.equal(g.status, 1);
    assert.match(g.stderr, /pw-01: spec_gaps "accept" does not fit the template choice/);
  } finally {
    limpar();
  }
});

test('settings: agents cannot change a card spec or test (a person completes the spec)', () => {
  const s = settingsDemo('/tmp/arena', process.execPath);
  for (const r of ['Edit(cards/*/spec.md)', 'Edit(cards/*/card.test.js)']) assert.ok(s.permissions.deny.includes(r), r);
  assert.ok(s.permissions.allow.includes('Edit(cards/**)'), 'card.js stays writable');
});

// ---------- the cost decision: --crypto ----------

test('plan --crypto: sonnet by default, haiku keeps lib-hash and the cryptography cards on Haiku', () => {
  const { dest, limpar } = arena('en');
  try {
    const crypto = (plan) => plan.tasks.filter((t) => t.id === 'lib-hash' || t.depends_on.includes('lib-hash'));
    let p = node(dest, 'tools/plan.mjs');
    assert.equal(p.status, 0, p.stderr);
    let plan = lerJson(join(dest, 'plan.json'));
    assert.equal(plan.config.crypto, 'sonnet');
    assert.deepEqual(crypto(plan).map((t) => t.id), ['lib-hash', 'cr-01', 'cr-02', 'cr-03', 'cr-04', 'cr-06']);
    assert.ok(crypto(plan).every((t) => t.agent === 'implementer'));
    assert.equal(plan.tasks.find((t) => t.id === 'cr-05').agent, 'worker', 'the other cryptography cards stay on Haiku');
    assert.match(p.stdout, /Cryptography \(`lib-hash` \+ cr-01, cr-02, cr-03, cr-04, cr-06\): \*\*Sonnet\*\*/);
    assert.match(p.stdout, /hash\["lib-hash<br\/>Sonnet"\]/);
    assert.match(p.stdout, /cr01\["cr-01<br\/>Sonnet"\]|cr_01\["cr-01<br\/>Sonnet"\]/);
    const costSonnet = p.stdout;

    p = node(dest, 'tools/plan.mjs', '--crypto', 'haiku');
    assert.equal(p.status, 0, p.stderr);
    plan = lerJson(join(dest, 'plan.json'));
    assert.equal(plan.config.crypto, 'haiku');
    assert.ok(crypto(plan).every((t) => t.agent === 'worker'));
    assert.match(p.stdout, /\*\*Haiku\*\*\. To change it: `\/demo-plan --crypto sonnet`/);
    assert.notEqual(p.stdout, costSonnet);
    assert.match(ler(join(dest, '.workshop', 'plan-summary.md')), /lib-hash and the cards that depend on it on Haiku/);

    // --apply keeps the choice, and the planner cannot promote those cards.
    writeFileSync(join(dest, '.workshop', 'planner.json'), JSON.stringify({ max_parallel: 6, promote_to_sonnet: ['cr-01', 'pw-01'], risks: [], justification: 'x' }));
    p = node(dest, 'tools/plan.mjs', '--apply', '.workshop/planner.json');
    assert.equal(p.status, 0, p.stderr);
    plan = lerJson(join(dest, 'plan.json'));
    assert.equal(plan.tasks.find((t) => t.id === 'cr-01').agent, 'worker');
    assert.equal(plan.tasks.find((t) => t.id === 'pw-01').agent, 'implementer');
    assert.deepEqual(plan.adjustments.applied, ['parallelism: 6', 'cr-01 stays on Haiku (--crypto haiku)', 'pw-01 → Sonnet']);

    // --crypto with --apply changes the choice of the plan that is there.
    p = node(dest, 'tools/plan.mjs', '--apply', '.workshop/none.json', '--crypto', 'sonnet');
    assert.equal(p.status, 0, p.stderr);
    assert.ok(crypto(lerJson(join(dest, 'plan.json'))).every((t) => t.agent === 'implementer'));

    for (const bad of [['--crypto', 'opus'], ['--crypto'], ['--crypto', 'constructor']]) {
      const r = node(dest, 'tools/plan.mjs', ...bad);
      assert.equal(r.status, 2, bad.join(' '));
      assert.match(r.stderr, /--crypto must be sonnet or haiku/);
    }
  } finally {
    limpar();
  }
});
