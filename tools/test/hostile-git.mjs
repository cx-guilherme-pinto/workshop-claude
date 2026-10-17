// For the tests: a global git config like the ones on company laptops (chaos test G5). Signed commits and tags with
// no gpg, hooks that fail (core.hooksPath and init.templateDir), a global gitignore with *.js / src/ / lib/ /
// .claude/ / CLAUDE.md (also in the XDG file and in the template's info/exclude), autocrlf + safecrlf, a
// gitattributes with eol=crlf, an editor that fails, no global identity and master as the default branch.
// Returns the environment to use (GIT_CONFIG_GLOBAL, XDG_CONFIG_HOME) and the file a hook writes when it runs.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export function hostileGitHome(dir) {
  const hooks = join(dir, 'hooks');
  const tmpl = join(dir, 'template');
  for (const d of [hooks, join(tmpl, 'hooks'), join(tmpl, 'info'), join(dir, 'xdg', 'git')]) mkdirSync(d, { recursive: true });
  const p = (f) => f.replace(/\\/g, '/');
  const ran = join(dir, 'hook-ran');
  const hook = `#!/bin/sh\necho ran >> "${p(ran)}"\nexit 1\n`;
  for (const h of [join(hooks, 'pre-commit'), join(hooks, 'commit-msg'), join(tmpl, 'hooks', 'pre-commit'), join(tmpl, 'hooks', 'prepare-commit-msg')]) {
    writeFileSync(h, hook, { mode: 0o755 });
  }
  const ignore = '*.js\nsrc/\nlib/\n.claude/\nCLAUDE.md\n';
  writeFileSync(join(dir, 'ignore'), ignore);
  writeFileSync(join(dir, 'xdg', 'git', 'ignore'), ignore);
  writeFileSync(join(tmpl, 'info', 'exclude'), ignore);
  writeFileSync(join(dir, 'attributes'), '* text eol=crlf\n');
  writeFileSync(
    join(dir, 'gitconfig'),
    [
      '[commit]\n\tgpgsign = true',
      '[tag]\n\tgpgsign = true\n\tforceSignAnnotated = true',
      `[gpg]\n\tprogram = ${p(join(dir, 'no-gpg'))}`,
      `[core]\n\thooksPath = ${p(hooks)}\n\texcludesFile = ${p(join(dir, 'ignore'))}\n\tattributesFile = ${p(join(dir, 'attributes'))}\n\tautocrlf = true\n\tsafecrlf = true\n\teditor = false`,
      `[init]\n\ttemplateDir = ${p(tmpl)}\n\tdefaultBranch = master`,
      '[user]\n\tuseConfigOnly = true',
      '[status]\n\tshowUntrackedFiles = no',
      '',
    ].join('\n'),
  );
  return { env: { GIT_CONFIG_GLOBAL: join(dir, 'gitconfig'), GIT_CONFIG_NOSYSTEM: '1', XDG_CONFIG_HOME: join(dir, 'xdg') }, ran };
}
