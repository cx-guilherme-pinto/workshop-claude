<!-- GERADO por tools/render.mjs a partir de tools/templates/pt/EMAIL.md.tmpl e do repos.conf. Não editar à mão: edita o template. -->

# Email a enviar antes do workshop

Para o organizador: copia o assunto e o corpo para o email. Envia-o cerca de uma semana antes do workshop e um lembrete 2 dias antes. Os links apontam para a release v1.1.0-rc.4 do kit: depois de uma release nova, corre `node tools/render.mjs` e volta a copiar o email.

---

**Assunto:** Orquestração de Agentes com Claude, segunda-feira 26 de outubro: 15 minutos de preparação antes do dia

Olá a todos,

Na **segunda-feira, 26 de outubro, das 14h00 às 15h30**, na **Cafeteria, em Braga**, temos o workshop **Orquestração de Agentes com Claude**. São 90 minutos a fazer, não a ouvir: missões curtas com o Claude Code, um swarm de agentes que constrói um Canivete de ferramentas e uma tarefa a sério num repositório de treino. Um painel ao vivo, no ecrã, mostra o que a sala já fez.

Para passarmos a sessão a construir e não a instalar, faz isto **até domingo, 25 de outubro**. Demora 10 a 20 minutos e não precisas de permissões de administrador.

**1. Antes de começar**

- A tua conta corporativa do Claude. É a única conta Claude de que precisas.
- Uma conta GitHub com sessão iniciada no github.com. Para apareceres na classificação do painel, a conta precisa de um email **@checkmarx.com** verificado (github.com → Settings → Emails). Sem ele fazes o workshop igual; só não apareces no painel.
- **Mac:** abre o Terminal e corre `xcode-select --install`. Carrega em "Instalar" e espera que acabe. Se disser que já está instalado, ótimo.
- **Windows:** não há nada a preparar. Usa o Windows PowerShell (não o PowerShell ISE).

**2. Corre o setup**

No Mac, no Terminal:

```
curl -fsSL https://github.com/cx-guilherme-pinto/workshop-claude/releases/download/v1.1.0-rc.4/setup-mac.sh | bash
```

No Windows, no PowerShell:

```
irm https://github.com/cx-guilherme-pinto/workshop-claude/releases/download/v1.1.0-rc.4/bootstrap-windows.ps1 | iex
```

O setup faz algumas perguntas: por exemplo, o login no Claude e o login no GitHub, que abrem o browser. Mostra uma linha por passo e um resumo no fim. O setup fala só inglês; o Claude responde-te na tua língua.

**3. Confirma**

No fim deves ver **"Everything is ready for the workshop."** Depois fecha e volta a abrir o terminal.

Durante ou depois da instalação podem aparecer alguns warnings. Se vires warnings, ou mesmo erros, não faz mal: não te preocupes.

**Se alguma coisa falhar**

- Corre o mesmo comando outra vez: os passos já feitos são saltados.
- Numa rede da empresa, se falhar a rede, experimenta o hotspot do telemóvel.
- O guia completo e os códigos de erro estão no [guia de instalação](https://github.com/cx-guilherme-pinto/workshop-claude/blob/v1.1.0-rc.4/docs/pt/INSTALL.md).
- Continua sem dar? Responde a este email com o ficheiro `summary.txt` em anexo; está na pasta `.workshop-claude` da tua pasta pessoal. Não tem palavras-passe nem tokens.

**Precisas de ajuda?**

O setup deve funcionar só com o script de instalação, e mais nada. Na manhã de segunda-feira, 26 de outubro, estaremos todos disponíveis para ajudar na pré-instalação para o workshop. Podes também falar diretamente comigo ou com algum dos outros organizadores:

- guilherme.pinto@checkmarx.com
- Pedro.Fernandes@checkmarx.com
- joao.delgado@checkmarx.com
- Tiago.PSilva@checkmarx.com
- Rui.Nogueira@checkmarx.com

**O que o painel vê**

O painel vê que missões fizeste, as tuas decisões (número de agentes, modelo) e o nome da tua conta GitHub. Nunca vê os teus prompts, o teu código nem tokens, e tudo é apagado à meia-noite.

No dia, traz o portátil com o carregador e o setup feito.

Até lá,
Guilherme
