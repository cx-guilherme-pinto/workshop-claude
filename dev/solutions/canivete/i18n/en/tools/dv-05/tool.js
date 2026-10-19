import { text } from '../../templates/text.js';

const R = {
  ok: 'Looks like a valid email.',
  spaces: 'It cannot have spaces.',
  at: 'It must have exactly one @.',
  local: 'The part before the @ is not valid.',
  domain: 'The domain after the @ is not valid.',
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
  title: 'Validate an email (simple rules)',
  inputs: [{ name: 'email', type: 'text', label: 'Email' }],
  run({ email }) {
    const r = reason(email);
    return { valid: r === R.ok, reason: r };
  },
});
