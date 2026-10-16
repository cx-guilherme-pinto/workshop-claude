# Alterações face ao original

1. **`SKILL.md`, frontmatter:** acrescentado `disable-model-invocation: true`. A skill só corre quando é chamada pelo nome (`/design-taste-frontend`). Assim não dispara sozinha em cada página e não gasta tokens sem querer.
2. **`scripts/assets.mjs` removido.** Era o único ficheiro com pedidos de rede, a seis APIs públicas de imagens. Ajustes no `SKILL.md`:
   - a introdução, o passo 1, o passo 6.4.3, o vídeo no passo 6 e o passo 10 deixam de mandar correr o script;
   - "Special cases → No network" passa a dizer que a pesquisa nunca é automática;
   - a linha de `scripts/assets.mjs` saiu da tabela "Files".
   O `README.md`, o `references/imagery.md`, o `library/directions.json`, o `scripts/draw.mjs` e o `scripts/lib/rules.mjs` ainda mencionam `assets.mjs` em texto. Essas menções são inofensivas, porque o ficheiro já não existe.
3. **`SKILL.md`, secção "Uso neste kit"** no início. Explica como aplicar as regras a ecrãs de app, cartões e slides, fora do âmbito original de landing pages, sem o ritual completo.

Não houve mais nenhuma alteração. Os restantes ficheiros são byte a byte iguais ao commit fixado.
