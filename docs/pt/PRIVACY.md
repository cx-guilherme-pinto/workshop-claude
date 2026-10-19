# Privacidade do painel do workshop

O kit tem uma **caderneta de missões** que vive só no teu computador e um **painel ao vivo**, opcional, que os apresentadores projetam ao lado dos slides. Esta página explica o que o painel recebe, o que nunca sai do teu portátil e como o desligas. As regras vêm da especificação (`docs/pt/WORKSHOP-V2-SPEC.md`, secção 6.6) e das decisões D-30 e D-31 do `DECISIONS.md`.

## A escolha é tua

- **O setup pergunta uma vez** (passo 8): "Queres que o teu kit envie eventos anónimos para o painel do workshop? Só o nome da funcionalidade do Claude Code que usaste, nunca o que escreves". Por defeito a resposta é **não**.
  - Sem terminal (uma instalação automática), ou com `--yes`, a resposta é não.
  - Se disseres que sim, escolhes a tua sala (A ou B).
- **Podes mudar quando quiseres:**
  - `node ~/.workshop-claude/kit/telemetry/ctl.mjs status` mostra a escolha atual;
  - `ctl.mjs on A` ou `ctl.mjs on B` liga a participação;
  - `ctl.mjs off` desliga-a e apaga os eventos que ainda estavam à espera de envio;
  - `ctl.mjs show` mostra os últimos 20 eventos, exatamente como saem do teu computador.
- **Ligada ou desligada, a caderneta funciona igual** (`/missions` e a statusline). Com a participação desligada, só não apareces nos números da sala.

## O que é enviado (só com a participação ligada)

Só os eventos e os campos de `telemetry/allowlist.json`. Mais nada pode ser enviado: o kit tira qualquer outro campo antes de escrever a fila, e o servidor volta a recusá-lo. Cada evento leva:
- a versão do formato;
- o código do workshop;
- a tua sala (A ou B);
- um id aleatório (16 bytes ao acaso, criados na instalação, sem nada que venha de ti ou da máquina);
- o nome do evento, a hora e a versão do kit.

Os eventos acrescentam:

| Evento | Campos a mais |
|---|---|
| `join` | língua (pt/en), sistema (mac/win), alcunha só se tiveres escolhido uma |
| `check_ok` | — |
| `feature` | o nome de uma funcionalidade do Claude Code que usaste, uma vez por sessão: `plan_mode`, `model_switch`, `subagent`, `skill_user`, `hook_user`, `loop`, `statusline_user`, `headless`, `memory_write` |
| `mission_done` | o id da missão (M1 a M10) |
| `cost` | um custo em US$ (dos tokens dos transcripts × `pricing.json`), a família do modelo (haiku/sonnet/opus/other), o bloco (missions/p1/p2) |
| `p1_*`, `p2_*` | as tuas escolhas e os resultados dos Projetos 1 e 2: paralelismo, modelo, previsão em minutos, número de tarefas, duração, verdes e vermelhos, o id de uma ferramenta do catálogo, o veredito do gate, o número de agentes, `EX-1`/`EX-2`/`EX-3` ou `own` (nunca a chave real da issue), o destino do relatório (file/jira/github) |

O `tests_run` (verdes e vermelhos do `npm test` no projeto das missões) é só local e nunca é enviado.

## O que nunca sai do teu computador

- Os teus prompts, as respostas do Claude e o teu código.
- Nomes de ficheiros, caminhos, a pasta de trabalho e o `transcript_path`.
- Nomes de repositórios e chaves de issues reais.
- Tokens.
- O teu email, o teu nome de utilizador e o nome da máquina.

**Como o kit o garante:**
- O hook de telemetria lê o input dos hooks do Claude Code, guarda só o nome da funcionalidade e deita fora o resto sem o escrever em lado nenhum.
- Só atua nos projetos do workshop (`~/workshop-claude` e os repositórios onde o `/task-intake` criou a `.workshop/`).
- Nunca faz rede. É um processo à parte que envia a fila, em lotes.
- Um teste (`tools/test/telemetry-privacy.test.mjs`) dá-lhe os inputs reais do Claude Code 2.1.292 com marcadores em todo o texto livre, e falha se algum marcador chegar a um ficheiro.

## Alcunha

Desligada por defeito. Com `ctl.mjs nickname <nome>` (1 a 16 caracteres: letras sem acentos, números, espaço, `_` e `-`), a tua alcunha pode aparecer no feed de marcos do painel, por exemplo "Ana foi a primeira da sala A a acabar a M4". O apresentador pode esconder qualquer alcunha. O painel nunca mostra um ranking de pessoas: mostra a sala e a comparação entre as duas salas.

## O servidor

- **Onde corre:** numa Worker do Cloudflare com um Durable Object (a API) e no Cloudflare Pages (a página), em endereços `workers.dev` e `pages.dev` (D-30).
- **O que o nosso código guarda:** os eventos permitidos. Nunca guarda o teu endereço IP, os cabeçalhos do pedido nem os dados de pedido do Cloudflare, e os logs da Worker estão desligados.
- **O que o Cloudflare vê:** o teu IP, na rede dele, como qualquer site que abres.
- **Durante quanto tempo:** os eventos apagam-se 7 dias depois do workshop. O organizador limpa-os com `POST /admin/reset`, e o código do workshop e o token de admin mudam a cada workshop.

## Expiração e desinstalação

- **Expiração:** a configuração da telemetria tem uma data de expiração, o fim do dia a seguir ao workshop (`WORKSHOP_DATE` no `repos.conf`; sem data, 14 dias depois da instalação). Depois dessa data, o kit não grava nem envia nada.
- **Desinstalação:** o `--uninstall` apaga `~/.workshop-claude/telemetry/` (a caderneta, a fila e o id).
