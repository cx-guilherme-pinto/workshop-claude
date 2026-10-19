# Privacidade do painel do workshop

O kit tem uma **caderneta de missões** que vive só no teu computador e um **painel ao vivo**, opcional, que os apresentadores projetam ao lado dos slides. Esta página explica o que o painel recebe, o que nunca sai do teu portátil e como o desligas. As regras vêm da especificação (`docs/pt/WORKSHOP-V2-SPEC.md`, secção 6.6) e das decisões D-30 e D-31 do `DECISIONS.md`.

## Registo (decisão D-34)

- **Toda a gente está no painel.** O setup regista-te logo a seguir ao login do GitHub (passo 6). Não há pergunta.
- **Como funciona o registo — nenhum token e nenhum email saem do teu computador:**
  - no teu portátil, o kit pede ao gh (que guarda o seu próprio login) o teu perfil do GitHub e os teus emails, e confirma ali mesmo que a conta tem um **email verificado do domínio da empresa** (`PANEL_EMAIL_DOMAIN`, checkmarx.com);
  - depois envia à Worker do painel, por HTTPS, só três coisas: o teu nome do GitHub, a tua sala e um hash (SHA-256) do código do workshop e do id da tua conta GitHub, para um segundo portátil ou um setup novo manterem o teu lugar;
  - a Worker responde com uma credencial, uma assinatura HMAC que só o servidor sabe fazer. É só essa assinatura que acompanha os teus eventos a seguir.
- **O que o painel guarda:** o teu nome do GitHub (como aparece no board de liderança), o hash e a tua sala. Nunca o teu email, o teu login, o id da conta nem nenhum token.
- **O compromisso (escolha do organizador):** o email da empresa é confirmado no portátil, por isso a Worker confia na palavra do kit. Quem tiver o código do workshop pode registar um nome inventado; o apresentador pode esconder qualquer nome, e o código muda em cada workshop.
- **Sem email da empresa:** fazes o workshop igual; só não apareces no board.
- **Os teus comandos:**
  - `node ~/.workshop-claude/kit/telemetry/ctl.mjs status` mostra o teu registo;
  - `ctl.mjs register A` (ou `B`) volta a registar;
  - `ctl.mjs show` mostra os últimos 20 eventos, exatamente como saem do teu computador.
- **O scope de que precisa:** o login do GitHub do setup pede o scope `user:email`, para o painel poder ver os teus emails verificados.
- **A caderneta de missões** (`/missions` e a statusline) funciona igual, com ou sem registo.

## O que é enviado (depois do registo)

Só os eventos e os campos de `telemetry/allowlist.json`. Mais nada pode ser enviado: o kit tira qualquer outro campo antes de escrever a fila, e o servidor volta a recusá-lo. Cada evento leva:
- a versão do formato;
- o código do workshop;
- a tua sala (A ou B);
- o id de participante que o painel te deu no registo;
- o nome do evento, a hora e a versão do kit.

Os eventos acrescentam:

| Evento | Campos a mais |
|---|---|
| `join` | língua (pt/en), sistema (mac/win) |
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
- Tokens: nenhum, nunca. O gh guarda o seu; a credencial do painel é uma assinatura feita pelo servidor.
- O teu email, o teu login do GitHub, o id da conta e o nome da máquina. Ao painel só chegam o teu nome do GitHub e um hash da conta.

**Como o kit o garante:**
- O hook de telemetria lê o input dos hooks do Claude Code, guarda só o nome da funcionalidade e deita fora o resto sem o escrever em lado nenhum.
- Só atua nos projetos do workshop (`~/workshop-claude` e os repositórios onde o `/task-intake` criou a `.workshop/`).
- Nunca faz rede. É um processo à parte que envia a fila, em lotes.
- Um teste (`tools/test/telemetry-privacy.test.mjs`) dá-lhe os inputs reais do Claude Code 2.1.292 com marcadores em todo o texto livre, e falha se algum marcador chegar a um ficheiro.

## O board de liderança

O painel mostra um board de pessoas, com o nome do GitHub, ordenado por pontos:
- cada missão validada: 1 ponto;
- o swarm de cada projeto acabado: 1 ponto;
- uma spec que corrigiste: 1 ponto;
- cada gate aprovado: 2 pontos;
- o relatório do Projeto 2: 1 ponto.

Em caso de empate, ganha quem chegou lá primeiro. O custo nunca conta: gastar mais não dá pontos. O apresentador pode esconder qualquer nome (a pessoa continua no board, como "—").

## O servidor

- **Onde corre:** numa Worker do Cloudflare com um Durable Object (a API) e no Cloudflare Pages (a página), em endereços `workers.dev` e `pages.dev` (D-30).
- **O que o nosso código guarda:** os eventos permitidos e os registos (nome do GitHub, o hash da conta, a sala). Nunca recebe o teu email nem nenhum token, nunca guarda o teu endereço IP, os cabeçalhos do pedido nem os dados de pedido do Cloudflare, e os logs da Worker estão desligados.
- **O que o Cloudflare vê:** o teu IP, na rede dele, como qualquer site que abres.
- **Durante quanto tempo:** os eventos apagam-se 7 dias depois do workshop. O organizador limpa-os com `POST /admin/reset`, e o código do workshop e o token de admin mudam a cada workshop.

## Expiração e desinstalação

- **Expiração:** a configuração da telemetria tem uma data de expiração, o fim do dia a seguir ao workshop (`WORKSHOP_DATE` no `repos.conf`; sem data, 14 dias depois da instalação). Depois dessa data, o kit não grava nem envia nada.
- **Desinstalação:** o `--uninstall` apaga `~/.workshop-claude/telemetry/` (a caderneta, a fila e o id).
