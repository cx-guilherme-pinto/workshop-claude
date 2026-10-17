// Command-line options shared by the orchestrator scripts. Each option has an English name and,
// where there was one, the older Portuguese name, which still works:
//   --project (--projeto), --plan (--plano), --test (--teste), --ignore (--ignorar), --all (--todos),
//   --summary (--resumo), --agent (--agente), --once (--uma-vez), --global-test (--teste-global).
export const ALIASES = {
  '--project': ['--projeto'],
  '--plan': ['--plano'],
  '--test': ['--teste'],
  '--ignore': ['--ignorar'],
  '--all': ['--todos'],
  '--summary': ['--resumo'],
  '--agent': ['--agente'],
  '--once': ['--uma-vez'],
  '--global-test': ['--teste-global'],
};

const names = (k) => [k, ...(ALIASES[k] || [])];

// The value after --k (or one of its aliases), or `fallback`.
export function opt(argv, k, fallback = null) {
  for (let i = 0; i < argv.length; i++) if (names(k).includes(argv[i]) && i + 1 < argv.length) return argv[i + 1];
  return fallback;
}

// Every value after --k (the option can be repeated).
export function opts(argv, k) {
  const out = [];
  for (let i = 0; i < argv.length; i++) if (names(k).includes(argv[i]) && i + 1 < argv.length) out.push(argv[++i]);
  return out;
}

// Whether --k (or one of its aliases) is present.
export function flag(argv, k) {
  return argv.some((a) => names(k).includes(a));
}

// The canonical English name of an option (aliases resolved), or the argument itself.
export function canonical(a) {
  for (const [k, v] of Object.entries(ALIASES)) if (v.includes(a)) return k;
  return a;
}
