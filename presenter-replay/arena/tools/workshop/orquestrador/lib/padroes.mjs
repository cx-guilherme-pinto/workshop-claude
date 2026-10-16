// Padroes de segredos e de codigo perigoso para o gate (Projeto 2). Simples e conservadores:
// servem para chamar a atencao, nao substituem um scanner dedicado.

export const SEGREDOS = [
  [/sk-ant-[A-Za-z0-9_-]{20,}/, 'chave Anthropic'],
  [/\bAKIA[0-9A-Z]{16}\b/, 'chave AWS'],
  [/\bgh[pousr]_[A-Za-z0-9]{30,}\b/, 'token GitHub'],
  [/\bglpat-[A-Za-z0-9_-]{20,}\b/, 'token GitLab'],
  [/\bxox[baprs]-[A-Za-z0-9-]{10,}\b/, 'token Slack'],
  [/\bAIza[0-9A-Za-z_-]{35}\b/, 'chave Google'],
  [/-----BEGIN (RSA |EC |OPENSSH |DSA |)PRIVATE KEY-----/, 'chave privada'],
  [/\b(password|passwd|pwd|secret|api[_-]?key|token)\s*[:=]\s*['"][^'"\s]{8,}['"]/i, 'credencial em claro'],
  [/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/, 'JWT'],
];

export const CODIGO_PERIGOSO = [
  [/\beval\s*\(/, 'eval('],
  [/\bnew\s+Function\s*\(/, 'new Function('],
  [/\.innerHTML\s*=|\.outerHTML\s*=|insertAdjacentHTML\s*\(|document\.write\s*\(/, 'HTML a partir de dados (XSS)'],
  [/dangerouslySetInnerHTML/, 'dangerouslySetInnerHTML'],
  [/\b(exec|execSync)\s*\(\s*`[^`]*\$\{/, 'comando de shell com interpolação'],
  [/\b(query|execute)\s*\(\s*(['"`]).*(SELECT|INSERT|UPDATE|DELETE)[^'"`]*\2\s*\+/i, 'SQL concatenado'],
  [/\bos\.system\s*\(|subprocess\.[a-z]+\([^)]*shell\s*=\s*True/, 'shell em Python'],
  [/\bpickle\.loads?\s*\(|\byaml\.load\s*\((?![^)]*SafeLoader)/, 'desserialização insegura'],
  [/verify\s*=\s*False|rejectUnauthorized\s*:\s*false|InsecureSkipVerify\s*:\s*true/, 'TLS sem verificação'],
];

export function procurar(texto, padroes) {
  const out = [];
  const linhas = texto.split('\n');
  for (let i = 0; i < linhas.length; i++) {
    for (const [re, nome] of padroes) if (re.test(linhas[i])) out.push({ linha: i + 1, tipo: nome });
  }
  return out;
}
