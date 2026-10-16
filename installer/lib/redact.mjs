// Filtro de redacao do log do setup. As mesmas regras existem em bash (setup-mac.sh, ws_redact)
// e em PowerShell (setup-windows.ps1, Protect-WsText). Os tres sao testados com os mesmos casos:
// tools/test/redact-cases.json.
//
// Regras (aplicadas por esta ordem):
//   1. valores literais de variaveis secretas (REPO_TOKEN, CLAUDE_CODE_OAUTH_TOKEN, ...)
//   2. sk-ant-...                      -> sk-ant-***
//   3. github_pat_... / ghp_ gho_ ghu_ ghs_ ghr_ -> prefixo + ***
//   4. Authorization: <tudo ate ao fim da linha ou aspas> -> Authorization: ***
//   5. Bearer <token>                  -> Bearer ***
//   6. utilizador:senha@ ou token@ em URLs -> ***@
//   7. chave=valor / "chave": "valor" para token|secret|password|passwd|api_key|apikey -> ***

export const SECRET_ENV_NAMES = [
  'REPO_TOKEN',
  'CLAUDE_CODE_OAUTH_TOKEN',
  'ANTHROPIC_API_KEY',
  'ANTHROPIC_AUTH_TOKEN',
  'GH_TOKEN',
  'GITHUB_TOKEN',
];

export function redact(text, literals = []) {
  let s = String(text ?? '');
  for (const lit of literals) {
    if (lit && lit.length >= 4) s = s.split(lit).join('***');
  }
  s = s.replace(/sk-ant-[A-Za-z0-9_-]{4,}/g, 'sk-ant-***');
  s = s.replace(/github_pat_[A-Za-z0-9_]{10,}/g, 'github_pat_***');
  s = s.replace(/(gh[pousr]_)[A-Za-z0-9]{10,}/g, '$1***');
  s = s.replace(/([Aa]uthorization["']?[ \t]*[:=][ \t]*)[^"'\r\n]+/g, '$1***');
  s = s.replace(/([Bb]earer[ \t]+)[A-Za-z0-9._~+/=-]+/g, '$1***');
  s = s.replace(/(:\/\/)[^/@\s"']+@/g, '$1***@');
  s = s.replace(
    /((?:[Tt][Oo][Kk][Ee][Nn]|[Ss][Ee][Cc][Rr][Ee][Tt]|[Pp][Aa][Ss][Ss][Ww][Oo][Rr][Dd]|[Pp][Aa][Ss][Ss][Ww][Dd]|[Aa][Pp][Ii][_-]?[Kk][Ee][Yy])["']?[ \t]*[:=][ \t]*["']?)[^"'\s,&]+/g,
    '$1***',
  );
  return s;
}

export function literalsFromEnv(env = process.env) {
  return SECRET_ENV_NAMES.map((k) => env[k]).filter((v) => v && v.length >= 4);
}
