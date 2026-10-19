import { text } from '../../templates/text.js';

const R = {
  ok: 'Parece um email válido.',
  spaces: 'Não pode ter espaços.',
  at: 'Tem de ter exatamente um @.',
  local: 'A parte antes do @ não é válida.',
  domain: 'O domínio depois do @ não é válido.',
};

// The rules in order: the first one that fails gives the reason.
function reason(email) {
  if (/\s/.test(email)) return R.spaces;
  const parts = email.split('@');
  if (parts.length !== 2) return R.at;
  const [local, domain] = parts;
  if (!/^[A-Za-z0-9._%+-]{1,64}$/.test(local) || local.startsWith('.') || local.endsWith('.') || local.includes('..')) return R.local;
  const labels = domain.split('.');
  const okLabel = (l) => /^[A-Za-z0-9-]{1,63}$/.test(l) && !l.startsWith('-') && !l.endsWith('-');
  if (labels.length < 2 || !labels.every(okLabel) || !/^[A-Za-z]{2,}$/.test(labels[labels.length - 1])) return R.domain;
  return R.ok;
}

export default text({
  id: 'dv-05',
  title: 'Validar um email (regras simples)',
  inputs: [{ name: 'email', type: 'text', label: 'Email' }],
  run({ email }) {
    const r = reason(email);
    return { valid: r === R.ok, reason: r };
  },
});
