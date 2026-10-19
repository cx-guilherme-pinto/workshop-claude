# Respostas das specs ambíguas do Canivete (só para o apresentador)

Esta folha **não vai no kit do participante** (`tools/build-release.sh` deixa-a de fora). Tem a regra que falta em cada uma das 3 ferramentas partidas de propósito (`docs/pt/WORKSHOP-V2-SPEC.md`, secção 5.3), o erro que o agente costuma dar e o argumento para a sala. A mensagem do teste diz o que a ferramenta devolveu e que regra a spec não decide, nunca o valor certo. Não dês a resposta: ajuda a pessoa a chegar lá pelo conceito.

Como se corrige: a pessoa acrescenta a regra (por palavras dela) em `tools/<id>/spec.md` e corre `/demo-swarm --retry <id>`. Se decidir mal, volta a mesma mensagem com o resultado dela.

## nm-03 · Arredondar com casas decimais

- **O que a spec não decide:** como arredondar os casos exatamente a meio, como 1,005 com 2 casas.
- **Erro habitual do agente:** `Math.round(v * 100) / 100` ou `toFixed(2)`. Os dois dão **1** para 1,005, porque em vírgula flutuante 1.005 × 100 = 100,49999…
- **A regra:** os casos a meio arredondam para cima, em decimal. 1,005 → 1,01 e 2,675 → 2,68; 1,0049 continua a dar 1.
- **Uma frase que serve na spec:** "Os casos exatamente a meio, em decimal, arredondam para cima: 1,005 com 2 casas dá 1,01. Não multipliques em vírgula flutuante: desloca a vírgula no texto do número (ou usa um épsilon)."
- **Argumento para a sala:** é o mesmo erro de quem soma cêntimos em `float`. O teste não é picuinhas: uma calculadora que arredonda 1,005 para 1,00 está errada para qualquer contabilista.

## dn-01 · Gorjeta e divisão da conta

- **O que a spec não decide:** como arredondar a parte de cada pessoa.
- **Erro habitual do agente:** arredondamento normal ao cêntimo: 100 € por 3 dá 33,33 € cada, e a soma das partes (99,99 €) fica abaixo da conta.
- **A regra:** cada parte arredonda **para cima** ao cêntimo, para a soma nunca ficar abaixo do total. 100 € por 3 dá 33,34 €, 10 € por 3 dá 3,34 €, e uma divisão exata fica igual (60 € por 3 dá 20 €).
- **Uma frase que serve na spec:** "A parte de cada pessoa arredonda para cima ao cêntimo (a soma das partes nunca fica abaixo do total); trabalha em cêntimos inteiros."
- **Argumento para a sala:** "sobra um cêntimo" parece pouco, mas é o tipo de regra de negócio que só quem pede a ferramenta sabe. O agente não a adivinha: ou está na spec, ou não está.

## tx-02 · Maiúsculas de título

- **O que a spec não decide:** o que fazer às palavras pequenas (de, da, e, em…).
- **Erro habitual do agente:** maiúscula em todas as palavras: «A Casa De Papel».
- **A regra:** as palavras pequenas (a, à, o, os, as, e, de, da, do, das, dos, em, na, no, nas, nos, um, uma, por, para, com) ficam em minúsculas, exceto a primeira do título. «a casa de papel» → «A Casa de Papel», «CIDADE E SERRA» → «Cidade e Serra».
- **Em inglês** (o Canivete em inglês): a, an, the, and, but, or, nor, for, of, in, on, at, to, by. «the lord of the rings» → «The Lord of the Rings».
- **Argumento para a sala:** a regra muda de língua para língua e de editora para editora. É uma decisão, não um facto, por isso tem de estar escrita.

## Se ninguém tiver vermelhos

Pode acontecer que o Sonnet (com `--model sonnet`) acerte uma delas à primeira. Usa a dispersão do painel: quem escolheu Haiku tem quase sempre os 3 vermelhos, e quem escolheu Sonnet pagou mais para evitar um ou dois. Pede a alguém com vermelhos para ler a mensagem em voz alta.
