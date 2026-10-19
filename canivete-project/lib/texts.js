// Pocketknife texts (Portuguese, pt-PT): the templates' input errors, the app (public/), the generated tests and
// the security checks. Runs in the browser (/lib/texts.js) and in Node. The English project puts
// i18n/en/lib/texts.js in place of this file; both versions have the same keys, only the text changes.

export const LANG = 'pt';

export const T = {
  name: 'Canivete',
  decimal: ',',

  // Errors of the templates when an input cannot be read (templates/common.js).
  input: {
    required: (label) => `Falta preencher: ${label}.`,
    number: (label) => `${label}: escreve um número.`,
    integer: (label) => `${label}: escreve um número inteiro.`,
    min: (label, min) => `${label}: o mínimo é ${min}.`,
    max: (label, max) => `${label}: o máximo é ${max}.`,
    date: (label) => `${label}: escreve uma data no formato AAAA-MM-DD.`,
    choice: (label) => `${label}: escolhe uma das opções.`,
    list: (label) => `${label}: escreve pelo menos um item, separados por vírgulas ou linhas.`,
    tooLong: (label) => `${label}: o texto é demasiado longo.`,
  },

  // States of the swarm tasks (the same as the orchestrator's task table).
  states: { todo: 'por fazer', working: 'a trabalhar', green: 'passou', red: 'falhou', failed: 'falhou de vez' },
  templates: { calc: 'Cálculo', convert: 'Conversão', text: 'Texto', generate: 'Gerador' },
  modes: { participant: 'participante', presenter: 'apresentador' },

  // The security checks of tool.js (lib/security.js).
  security: {
    setTimeoutString: 'setTimeout/setInterval com texto',
    onAssignment: 'handler on* atribuído (.onclick = …)',
    document: 'usa document (a UI é da casca: o tool.js só calcula)',
    window: 'usa window',
    network: 'faz pedidos de rede',
    storage: 'usa armazenamento do browser',
    dynamicImport: 'import() dinâmico',
    importNotAllowed: (t) => `import não permitido: ${t} (só ../../templates/*.js e ../../lib/*.js)`,
    globalRandom: 'usa Math.random (no modelo generate usa o random() que o run recebe)',
  },

  // The generated tool.test.js.
  tests: {
    loads: 'tool.js existe e carrega',
    doesNotLoad: (id) => `tools/${id}/tool.js não existe, não tem export default ou tem um erro: `,
    contract: 'cumpre o contrato',
    wrongId: 'id errado',
    usesTemplate: (t) => `tem de usar o modelo ${t} (templates/${t}.js)`,
    noTitle: 'falta title',
    inputs: 'as entradas têm de ser as da spec (mesmos nomes, pela mesma ordem)',
    example: (n) => `exemplo ${n}`,
    gotError: (e) => `devolveu o erro "${e}"`,
    expected: (exp, got) => `esperava ${exp}, recebeu ${got}`,
    errorCase: (n) => `entrada inválida ${n}`,
    shouldError: (e, got) => `devia devolver o erro "${e}", devolveu ${got}`,
    property: (n) => `propriedade ${n}`,
    deterministic: 'com a mesma seed dá o mesmo resultado',
    safeSource: 'fonte segura',
    expectedTruthy: 'esperava um valor verdadeiro',
    shouldNotBe: (v) => `não devia ser ${v}`,
    doesNotMatch: (s, re) => `${s} não corresponde a ${re}`,
    failed: 'falhou',
    expectedException: 'esperava uma exceção',
    couldNotRead: (rel, status) => `não consegui ler ${rel} (${status})`,
    gapHead: (inputs, got) => `para ${inputs} a ferramenta devolveu ${got}, mas não é esse o resultado que o teste espera.`,
    gapTail: (id, what) => ` A spec tools/${id}/spec.md não diz ${what}: decide a regra a partir do conceito, escreve-a na spec e corre /demo-swarm --retry ${id} (os agentes não mudam specs).`,
  },
};
