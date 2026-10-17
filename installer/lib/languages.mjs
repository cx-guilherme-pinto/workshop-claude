// Lingua da maquina (D-20). O setup deteta-a (Mac: AppleLanguages e LANG; Windows: Get-UICulture e
// Get-Culture; WORKSHOP_LANG sobrepoe-se) e passa a etiqueta ao install-user, que grava:
//  - a definicao "language" do Claude Code, para as skills (em ingles) responderem na lingua da pessoa.
//    So nas linguas suportadas (portugues, ingles, hindi, hebraico) e so se a pessoa nao tiver uma;
//  - ~/.workshop-claude/kit/lingua.json, a lingua dos textos do kit: pt se a maquina estiver em portugues,
//    en em todos os outros casos (o kit so tem textos em portugues e em ingles).

const CLAUDE = { en: 'English', hi: 'Hindi', he: 'Hebrew' };

// A BCP 47-like tag: 2 or 3 ASCII letters, then subtags of up to 8 letters or digits ('-' already in place of '_').
export function eEtiqueta(t) {
  return /^[A-Za-z]{2,3}(-[A-Za-z0-9]{0,8})*$/.test(t) && !/^utf(-|$)/i.test(t);
}

// 'pt_PT.UTF-8' -> 'pt-PT'; 'HE' -> 'he'; 'iw-IL' -> 'he-IL'; 'zh-Hans-CN' -> 'zh-Hans-CN'; '' / 'C' -> ''.
// What is not a language tag also gives '' (no information): 'br' is a tag (Breton), but 'brasil',
// 'Português', 'pt-*', 'en,pt' and 'UTF-8' are not. Same rules as ws_lang_tag in setup-mac.sh.
export function etiqueta(tag) {
  const t = String(tag ?? '').trim().replace(/[.@].*$/, '').replace(/_/g, '-');
  if (!t || /^(c|posix)$/i.test(t)) return '';
  if (!eEtiqueta(t)) return '';
  const partes = t.split('-').filter(Boolean);
  let base = partes[0].toLowerCase();
  if (base === 'iw') base = 'he';
  const resto = partes.slice(1).map((p) => (p.length === 2 ? p.toUpperCase() : p.length === 4 ? p[0].toUpperCase() + p.slice(1).toLowerCase() : p));
  return [base, ...resto].join('-');
}

// { tag, base, kit: 'pt'|'en', claude: valor da definicao "language" ou null }
export function linguaMaquina(tag) {
  const t = etiqueta(tag) || 'en';
  const base = t.split('-')[0];
  let claude = CLAUDE[base] ?? null;
  if (base === 'pt') claude = /(^|-)BR(-|$)/.test(t) ? 'Brazilian Portuguese' : 'European Portuguese';
  return { tag: t, base, kit: base === 'pt' ? 'pt' : 'en', claude };
}
