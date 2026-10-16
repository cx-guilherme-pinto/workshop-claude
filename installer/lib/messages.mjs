// Catalogo de mensagens do setup (setup/messages.pt.json):
//  - flattenToShell(): converte-o em atribuicoes bash (M_ui_titulo='...'), injetadas no setup-mac.sh;
//  - renderTroubleshooting(): gera docs/TROUBLESHOOTING.md, organizado por sistema operativo.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fillUpper } from './conf.mjs';

export function loadMessages(root) {
  return JSON.parse(readFileSync(join(root, 'setup', 'messages.pt.json'), 'utf8'));
}

const shq = (v) => `'${String(v).replace(/'/g, `'\\''`)}'`;
const safe = (k) => String(k).replace(/[^A-Za-z0-9]/g, '_');

// Mesmas regras que a funcao ws_msgs_from_json do setup-mac.sh (JXA/node em modo dev).
export function flattenToShell(obj, prefix = 'M') {
  const out = [];
  const walk = (p, v) => {
    if (Array.isArray(v)) {
      out.push(`${p}_n=${v.length}`);
      v.forEach((x, i) => walk(`${p}_${i}`, x));
    } else if (v && typeof v === 'object') {
      for (const k of Object.keys(v)) walk(`${p}_${safe(k)}`, v[k]);
    } else {
      out.push(`${p}=${shq(v)}`);
    }
  };
  for (const k of Object.keys(obj)) {
    if (k === 'nota' || k === 'versao') continue;
    walk(`${prefix}_${safe(k)}`, obj[k]);
  }
  return out.join('\n') + '\n';
}

const SO_NOME = { mac: 'macOS', windows: 'Windows' };

function bloco(cmds) {
  if (!cmds || !cmds.length) return '';
  return '\n```\n' + cmds.join('\n') + '\n```\n';
}

export function renderTroubleshooting(msgs, vars, { hosts = [] } = {}) {
  const f = (t) => fillUpper(t, vars);
  const erros = msgs.erros;
  const codes = Object.keys(erros);
  const L = [];
  L.push('<!-- GERADO por tools/render.mjs a partir de setup/messages.pt.json. Não editar à mão. -->');
  L.push('');
  L.push('# Resolução de problemas do setup');
  L.push('');
  L.push('Cada erro do setup tem um **código** (por exemplo, `E-NET-01`). O setup mostra o código, a causa e o que fazer. Aqui está o catálogo completo, por sistema operativo.');
  L.push('');
  L.push('## Antes de tudo');
  L.push('');
  L.push('- Volta a correr o setup: os passos já feitos são saltados.');
  L.push(`- Só verificar, sem instalar: \`${vars.CHECK_MAC}\` (Mac) ou \`${vars.CHECK_WINDOWS}\` (Windows).`);
  L.push(`- Diagnóstico com ajuda do Claude: \`${vars.DOCTOR_MAC}\` (Mac) ou \`${vars.DOCTOR_WINDOWS}\` (Windows).`);
  L.push('- O log completo, sem segredos, está em `~/.workshop-claude/setup.log`. O resumo está em `~/.workshop-claude/resumo.txt`.');
  L.push('- Nunca envies a tua API key a ninguém. O setup nunca a pede nem a mostra.');
  L.push('');
  L.push('## Índice');
  L.push('');
  L.push('| Código | Problema | Onde |');
  L.push('|---|---|---|');
  for (const c of codes) {
    const sos = erros[c].so === 'todos' ? ['mac', 'windows'] : [erros[c].so];
    const links = sos.map((so) => `[${SO_NOME[so]}](#${so}-${c.toLowerCase()})`).join(' · ');
    L.push(`| \`${c}\` | ${f(erros[c].titulo)} | ${links} |`);
  }
  L.push('');
  for (const so of ['mac', 'windows']) {
    L.push(`## ${SO_NOME[so]}`);
    L.push('');
    for (const c of codes) {
      const e = erros[c];
      if (e.so !== 'todos' && e.so !== so) continue;
      L.push(`<a id="${so}-${c.toLowerCase()}"></a>`);
      L.push('');
      L.push(`### ${c} · ${f(e.titulo)}`);
      L.push('');
      L.push(`- **Porquê:** ${f(e.causa)}`);
      L.push('- **O que fazer:**');
      for (const x of e.fazer) L.push(`  - ${f(x)}`);
      const cmds = (e[so] || []).map(f);
      if (cmds.length) {
        L.push('');
        L.push(`Comando${cmds.length > 1 ? 's' : ''} (${SO_NOME[so]}):`);
        L.push(bloco(cmds).trimEnd());
      }
      L.push('');
    }
  }
  L.push('## Domínios necessários');
  L.push('');
  L.push('Pede ao IT que estes domínios fiquem acessíveis por HTTPS (porta 443):');
  L.push('');
  for (const h of hosts) L.push(`- \`${h}\``);
  L.push('');
  L.push('## Proxies e certificados da empresa');
  L.push('');
  L.push('- O setup deteta o proxy do sistema (no Windows também resolve o PAC) e grava `HTTPS_PROXY` e `NO_PROXY=localhost,127.0.0.1` no `env` do `~/.claude/settings.json`.');
  L.push('- Se a empresa intercetar o HTTPS, o setup exporta as raízes da empresa para `~/.workshop-claude/ca.pem` e define `NODE_EXTRA_CA_CERTS` e `UV_SYSTEM_CERTS=true`.');
  L.push('- Proxies só com NTLM ou Kerberos não são suportados (ver `E-NET-06`).');
  L.push('');
  return L.join('\n') + '\n';
}
