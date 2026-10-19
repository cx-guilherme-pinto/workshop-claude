// Pocketknife texts (English): the templates' input errors, the app (public/), the generated tests and the security
// checks. Runs in the browser (/lib/texts.js) and in Node. Same keys as the Portuguese lib/texts.js.

export const LANG = 'en';

export const T = {
  name: 'Pocketknife',
  decimal: '.',

  input: {
    required: (label) => `Missing: ${label}.`,
    number: (label) => `${label}: type a number.`,
    integer: (label) => `${label}: type a whole number.`,
    min: (label, min) => `${label}: the minimum is ${min}.`,
    max: (label, max) => `${label}: the maximum is ${max}.`,
    date: (label) => `${label}: type a date as YYYY-MM-DD.`,
    choice: (label) => `${label}: pick one of the options.`,
    list: (label) => `${label}: type at least one item, separated by commas or lines.`,
    tooLong: (label) => `${label}: the text is too long.`,
  },

  states: { todo: 'to do', working: 'working', green: 'passed', red: 'failed', failed: 'failed for good' },
  templates: { calc: 'Calculation', convert: 'Conversion', text: 'Text', generate: 'Generator' },
  modes: { participant: 'participant', presenter: 'presenter' },

  security: {
    setTimeoutString: 'setTimeout/setInterval with a string',
    onAssignment: 'on* handler assigned (.onclick = …)',
    document: 'uses document (the UI belongs to the shell: tool.js only computes)',
    window: 'uses window',
    network: 'makes network requests',
    storage: 'uses browser storage',
    dynamicImport: 'dynamic import()',
    importNotAllowed: (t) => `import not allowed: ${t} (only ../../templates/*.js and ../../lib/*.js)`,
    globalRandom: 'uses Math.random (in the generate template use the random() that run receives)',
  },

  tests: {
    loads: 'tool.js exists and loads',
    doesNotLoad: (id) => `tools/${id}/tool.js does not exist, has no default export or has an error: `,
    contract: 'follows the contract',
    wrongId: 'wrong id',
    usesTemplate: (t) => `must use the ${t} template (templates/${t}.js)`,
    noTitle: 'title is missing',
    inputs: 'the inputs must be the spec\'s (same names, in the same order)',
    example: (n) => `example ${n}`,
    gotError: (e) => `returned the error "${e}"`,
    expected: (exp, got) => `expected ${exp}, got ${got}`,
    errorCase: (n) => `invalid input ${n}`,
    shouldError: (e, got) => `should return the error "${e}", returned ${got}`,
    property: (n) => `property ${n}`,
    deterministic: 'the same seed gives the same result',
    safeSource: 'safe source',
    expectedTruthy: 'expected a truthy value',
    shouldNotBe: (v) => `should not be ${v}`,
    doesNotMatch: (s, re) => `${s} does not match ${re}`,
    failed: 'failed',
    expectedException: 'expected an exception',
    couldNotRead: (rel, status) => `could not read ${rel} (${status})`,
    gapHead: (inputs, got) => `for ${inputs} the tool returned ${got}, but that is not the result the test expects.`,
    gapTail: (id, what) => ` The spec tools/${id}/spec.md does not say ${what}: decide the rule from the concept, write it in the spec and run /demo-swarm --retry ${id} (agents never change specs).`,
  },
};
