// Padroes de segredos e de codigo perigoso para o gate (Projeto 2). Simples e conservadores:
// servem para chamar a atencao, nao substituem um scanner dedicado.
// O nome de cada padrao e um texto (igual nas duas linguas) ou { pt, en }.
import { lingua } from '../../hooks/lib/language.mjs';

export const SEGREDOS = [
  [/sk-ant-[A-Za-z0-9_-]{20,}/, { pt: 'chave Anthropic', en: 'Anthropic key' }],
  [/\bAKIA[0-9A-Z]{16}\b/, { pt: 'chave AWS', en: 'AWS key' }],
  [/\bgh[pousr]_[A-Za-z0-9]{30,}\b/, { pt: 'token GitHub', en: 'GitHub token' }],
  [/\bglpat-[A-Za-z0-9_-]{20,}\b/, { pt: 'token GitLab', en: 'GitLab token' }],
  [/\bxox[baprs]-[A-Za-z0-9-]{10,}\b/, { pt: 'token Slack', en: 'Slack token' }],
  [/\bAIza[0-9A-Za-z_-]{35}\b/, { pt: 'chave Google', en: 'Google key' }],
  [/-----BEGIN (RSA |EC |OPENSSH |DSA |)PRIVATE KEY-----/, { pt: 'chave privada', en: 'private key' }],
  [/\b(password|passwd|pwd|secret|api[_-]?key|token)\s*[:=]\s*['"][^'"\s]{8,}['"]/i, { pt: 'credencial em claro', en: 'plain-text credential' }],
  [/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/, 'JWT'],
];

export const CODIGO_PERIGOSO = [
  [/\beval\s*\(/, 'eval()'],
  [/\bnew\s+Function\s*\(/, 'new Function()'],
  [/\.innerHTML\s*=|\.outerHTML\s*=|insertAdjacentHTML\s*\(|document\.write\s*\(/, { pt: 'HTML a partir de dados (XSS)', en: 'HTML built from data (XSS)' }],
  [/dangerouslySetInnerHTML/, 'dangerouslySetInnerHTML'],
  [/\b(exec|execSync)\s*\(\s*`[^`]*\$\{/, { pt: 'comando de shell com interpolação', en: 'shell command with interpolation' }],
  [/\b(query|execute)\s*\(\s*(['"`]).*(SELECT|INSERT|UPDATE|DELETE)[^'"`]*\2\s*\+/i, { pt: 'SQL concatenado', en: 'concatenated SQL' }],
  [/\bos\.system\s*\(|subprocess\.[a-z]+\([^)]*shell\s*=\s*True/, { pt: 'shell em Python', en: 'shell in Python' }],
  [/\bpickle\.loads?\s*\(|\byaml\.load\s*\((?![^)]*SafeLoader)/, { pt: 'desserialização insegura', en: 'unsafe deserialization' }],
  [/verify\s*=\s*False|rejectUnauthorized\s*:\s*false|InsecureSkipVerify\s*:\s*true/, { pt: 'TLS sem verificação', en: 'TLS without verification' }],
];

export function procurar(texto, padroes, l = lingua()) {
  const out = [];
  const linhas = texto.split('\n');
  for (let i = 0; i < linhas.length; i++) {
    for (const [re, nome] of padroes) if (re.test(linhas[i])) out.push({ linha: i + 1, tipo: typeof nome === 'string' ? nome : nome[l] ?? nome.en });
  }
  return out;
}
