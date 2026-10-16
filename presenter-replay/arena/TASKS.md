# TASKS — Arena de Segurança

Cada tarefa é feita por um agente. **Este ficheiro é gerado** por `node tools/gen.mjs` a partir de `specs/cards.json` e `specs/tarefas.json`.

- Modo participante: **15 cartões** + utilitário + 2 páginas + integração + revisão.
- Modo apresentador: **100 cartões** + as mesmas tarefas.

## Tarefas de suporte

| id | onda | o quê | spec | depende de |
| --- | --- | --- | --- | --- |
| lib-hash | 1 | Utilitário de criptografia lib/hash.js | `specs/lib-hash.md` | — |
| pagina-categoria | 2 | Página de categoria | `specs/pagina-categoria.md` | *cartoes |
| tabela-pontuacao | 2 | Tabela de pontuação | `specs/tabela-pontuacao.md` | *cartoes |
| integracao | 3 | Integração e suite completa | `specs/integracao.md` | pagina-categoria, tabela-pontuacao |
| revisao | 4 | Revisão de segurança e qualidade | `specs/revisao.md` | integracao |

## Passwords

| id | modo | modelo | título | conceito | depende de |
| --- | --- | --- | --- | --- | --- |
| pw-01 | participante | escolha | Qual é a password mais forte? | O comprimento e a imprevisibilidade pesam mais do que trocar letras por símbolos. | — |
| pw-02 | participante | ordenar | Do segundo fator mais forte ao mais fraco | Nem todo o segundo fator protege o mesmo: os que resistem a phishing ficam no topo. | — |
| pw-03 | apresentador | escolha | Uma password, milhares de contas | Password spraying: testar uma password comum em muitas contas evita o bloqueio por tentativas falhadas. | — |
| pw-04 | apresentador | escolha | Como guardar 80 passwords? | Um gestor de passwords cria e guarda uma password única e forte para cada site. | — |
| pw-05 | apresentador | resposta | Os três tipos de fator | A MFA junta fatores de tipos diferentes: algo que sabes, algo que tens e algo que és. | — |
| pw-06 | apresentador | clica-erro | A política de passwords tem regras más | Mudanças forçadas e dicas de password tornam as passwords mais fracas, não mais fortes. | — |
| pw-07 | apresentador | ordenar | Como funciona o credential stuffing | Credential stuffing: pares de email e password roubados num site são testados em muitos outros. | — |
| pw-08 | apresentador | escolha | O teu email apareceu numa fuga | Quando uma conta aparece numa fuga, muda-se a password nesse site e em todos onde se repetia. | — |
| pw-09 | apresentador | escolha | A pergunta de segurança | As respostas verdadeiras a perguntas de segurança encontram-se muitas vezes nas redes sociais. | — |
| pw-10 | apresentador | resposta | Entrar sem password | Uma passkey troca a password por um par de chaves: a chave privada nunca sai do teu dispositivo. | — |

## Phishing

| id | modo | modelo | título | conceito | depende de |
| --- | --- | --- | --- | --- | --- |
| ph-01 | participante | escolha | Qual é o site verdadeiro? | Domínios parecidos trocam uma letra ou juntam um hífen para enganar quem lê depressa. | — |
| ph-02 | participante | escolha | O que denuncia este email? | Pressa e links para outro domínio são os sinais mais comuns de phishing. | — |
| ph-03 | apresentador | clica-erro | O anexo disfarçado | Uma extensão dupla esconde um programa atrás de um nome que parece um documento. | — |
| ph-04 | apresentador | clica-erro | O nome não prova nada | O nome do remetente é texto livre; o que conta é o domínio depois do @. | — |
| ph-05 | apresentador | escolha | O QR colado no parquímetro | Quishing: um QR falso colado por cima do verdadeiro leva a um site de pagamento falso. | — |
| ph-06 | apresentador | ordenar | Lê o URL pela ordem certa | O domínio é o que fica entre :// e a primeira barra; é ele que diz de quem é o site. | — |
| ph-07 | apresentador | resposta | O link mente | O texto de um link pode mostrar um endereço e levar a outro. | — |
| ph-08 | apresentador | escolha | Ativar o conteúdo? | As macros de um documento são código; ativá-las pode instalar malware. | — |
| ph-09 | apresentador | clica-erro | Phishing por SMS | Smishing: o mesmo truque do phishing, mas por SMS, onde é mais difícil ver o link. | — |
| ph-10 | apresentador | escolha | A app pede acesso ao teu email | Phishing de consentimento: em vez da password, o atacante pede autorização para uma app entrar na tua conta. | — |

## Web (XSS, SQLi, CSRF)

| id | modo | modelo | título | conceito | depende de |
| --- | --- | --- | --- | --- | --- |
| web-01 | participante | clica-erro | Encontra a injeção SQL | Juntar texto do utilizador a uma consulta SQL deixa o atacante reescrever a consulta. | — |
| web-02 | participante | clica-erro | Encontra o XSS | Pôr texto do utilizador em innerHTML deixa o browser executar código escondido nesse texto. | — |
| web-03 | apresentador | escolha | O formulário escondido | CSRF: outro site faz o teu browser enviar um pedido com a tua sessão, sem tu saberes. | — |
| web-04 | apresentador | clica-erro | As faturas dos outros | IDOR: o servidor devolve um objeto só pelo id, sem confirmar que pertence a quem pede. | — |
| web-05 | apresentador | escolha | Para onde vais depois do login? | Open redirect: o site reencaminha para qualquer endereço que venha no URL. | — |
| web-06 | apresentador | resposta | De onde podem vir os scripts? | A Content-Security-Policy diz ao browser de que origens pode carregar scripts e outros recursos. | — |
| web-07 | apresentador | escolha | O cookie de sessão bem configurado | Um cookie de sessão deve ter Secure, HttpOnly e SameSite. | — |
| web-08 | apresentador | ordenar | A sessão do princípio ao fim | O id de sessão deve ser novo depois do login e destruído no logout. | — |
| web-09 | apresentador | resposta | O site dentro de um iframe | Clickjacking: outro site carrega o teu num iframe invisível e engana o utilizador para clicar. | — |
| web-10 | apresentador | clica-erro | O CORS demasiado aberto | Refletir qualquer origem com credenciais deixa qualquer site ler respostas em nome do utilizador. | — |

## Redes

| id | modo | modelo | título | conceito | depende de |
| --- | --- | --- | --- | --- | --- |
| rd-01 | participante | escolha | Duas redes no café | Qualquer pessoa pode criar uma rede Wi-Fi com o nome de um café (evil twin). | — |
| rd-02 | apresentador | ordenar | Por onde passa o teu tráfego | Cada ponto entre ti e o site pode ver para onde vais; o HTTPS esconde o conteúdo, não o destino. | — |
| rd-03 | apresentador | resposta | Sempre HTTPS | O HSTS obriga o browser a usar HTTPS num site, mesmo que se escreva http://. | — |
| rd-04 | apresentador | ordenar | O que acontece ao abrir um site HTTPS | Antes de qualquer dado seguir cifrado, o browser confirma o certificado do servidor. | — |
| rd-05 | apresentador | escolha | O que uma VPN não faz | Uma VPN cifra o caminho até ao servidor da VPN; não trava phishing nem malware. | — |
| rd-06 | apresentador | clica-erro | Portas a mais na firewall | Um servidor web só deve expor à internet as portas de que precisa. | — |
| rd-07 | apresentador | resposta | DNS que ninguém lê | O DNS tradicional viaja sem cifra; o DoH esconde os nomes que consultas. | — |
| rd-08 | apresentador | escolha | Onde ligar as câmaras baratas | Separar dispositivos pouco fiáveis numa rede própria limita o estrago se forem atacados. | — |
| rd-09 | apresentador | clica-erro | O router mal configurado | WEP e WPS são pontos fracos conhecidos no Wi-Fi de casa. | — |
| rd-10 | apresentador | escolha | Aviso de certificado | Um aviso de certificado pode ser sinal de que alguém está a intercetar a ligação. | — |

## Privacidade

| id | modo | modelo | título | conceito | depende de |
| --- | --- | --- | --- | --- | --- |
| pv-01 | participante | escolha | A calculadora curiosa | Uma app só deve ter as permissões de que precisa para funcionar. | — |
| pv-02 | apresentador | resposta | A foto diz onde estás | Os metadados EXIF de uma foto podem guardar as coordenadas GPS de onde foi tirada. | — |
| pv-03 | apresentador | escolha | A imagem de 1 píxel | Um píxel de rastreio num email avisa o remetente de quando e onde o abriste. | — |
| pv-04 | apresentador | resposta | Levar os dados contigo | O RGPD dá-te o direito de receber os teus dados num formato que outro serviço consegue ler. | — |
| pv-05 | apresentador | clica-erro | Dados a mais na newsletter | Minimização: recolhe só os dados de que precisas para o fim anunciado. | — |
| pv-06 | apresentador | ordenar | Pedir os teus dados a uma empresa | O direito de acesso deixa-te saber que dados uma empresa tem sobre ti. | — |
| pv-07 | apresentador | escolha | Sem cookies e ainda te reconhecem | A impressão digital do browser junta detalhes técnicos que te identificam sem cookies. | — |
| pv-08 | apresentador | escolha | A foto do cartão de embarque | O código de barras de um cartão de embarque contém o nome e a referência da reserva. | — |
| pv-09 | apresentador | clica-erro | Dados pessoais no URL | Dados pessoais no URL ficam no histórico e nos registos dos servidores por onde o pedido passa. | — |
| pv-10 | apresentador | ordenar | Quem vê a tua publicação? | Cada nível de partilha alarga quem vê o que publicas; o mais restrito é o mais privado. | — |

## Engenharia social

| id | modo | modelo | título | conceito | depende de |
| --- | --- | --- | --- | --- | --- |
| es-01 | participante | escolha | O pedido urgente do diretor | Fraude do CEO: alguém finge ser um chefe para pedir uma transferência urgente e secreta. | — |
| es-02 | apresentador | escolha | Seguras a porta? | Tailgating: entrar numa zona protegida colado a quem tem acesso. | — |
| es-03 | apresentador | resposta | O banco ao telefone | Vishing: burla por chamada de voz em que o burlão finge ser do banco ou do apoio técnico. | — |
| es-04 | apresentador | escolha | 15 pedidos de aprovação | Fadiga de MFA: o atacante já tem a password e envia pedidos até alguém aprovar. | — |
| es-05 | apresentador | clica-erro | A história da migração | Pretexting: uma história credível serve para pedir algo que nunca se deve dar. | — |
| es-06 | apresentador | ordenar | As fases de um ataque de engenharia social | Um ataque de engenharia social começa muito antes do contacto: com pesquisa sobre o alvo. | — |
| es-07 | apresentador | escolha | A pen USB no parque | Baiting: deixar um objeto apelativo, como uma pen USB, à espera de que alguém o use. | — |
| es-08 | apresentador | resposta | Phishing feito à medida | Spear phishing: phishing dirigido a uma pessoa, com detalhes reais para parecer legítimo. | — |
| es-09 | apresentador | clica-erro | O fornecedor mudou de banco | Fraude do IBAN: um email pede para pagar a uma conta nova e evita qualquer confirmação. | — |
| es-10 | apresentador | ordenar | O golpe do número novo | O golpe do 'mudei de número' usa a confiança da família para pedir dinheiro com pressa. | — |

## Criptografia básica

| id | modo | modelo | título | conceito | depende de |
| --- | --- | --- | --- | --- | --- |
| cr-01 | participante | resposta | Decifra a mensagem de César | A cifra de César troca cada letra por outra a uma distância fixa. Com só 25 chaves, parte-se em segundos. | lib-hash |
| cr-02 | participante | resposta | O cookie em Base64 | Base64 é uma forma de escrever bytes como texto, não uma cifra: qualquer pessoa o reverte. | lib-hash |
| cr-03 | participante | resposta | Qual é o ficheiro verdadeiro? | Um hash SHA-256 muda por completo se o ficheiro mudar, por isso serve para confirmar downloads. | lib-hash |
| cr-04 | apresentador | resposta | Hashes repetidos na fuga | Sem salt, passwords iguais dão hashes iguais e saltam à vista numa fuga. | lib-hash |
| cr-05 | apresentador | escolha | Hash ou cifra? | Uma cifra reverte-se com a chave; um hash é de sentido único. | — |
| cr-06 | apresentador | resposta | Uma letra muda tudo | Efeito avalanche: mudar um só carácter na entrada muda o hash todo. | lib-hash |
| cr-07 | apresentador | ordenar | Da chave mais fraca à mais forte | Cada bit a mais numa chave duplica o número de chaves que um atacante tem de testar. | — |
| cr-08 | apresentador | ordenar | Guardar passwords: do pior ao melhor | Passwords guardam-se com um hash lento e com salt, feito de propósito para custar a testar. | — |
| cr-09 | apresentador | resposta | O S do HTTPS | O HTTPS é HTTP dentro de TLS; o antigo SSL já não é seguro. | — |
| cr-10 | apresentador | escolha | Números ao acaso a sério | Tokens de segurança precisam de um gerador aleatório criptográfico, não de Math.random(). | — |

## Segredos e cloud

| id | modo | modelo | título | conceito | depende de |
| --- | --- | --- | --- | --- | --- |
| sc-01 | participante | clica-erro | A chave no código | Segredos escritos no código acabam no git e em todas as cópias do repositório. | — |
| sc-02 | apresentador | escolha | Apaguei a chave no commit seguinte | O que entra no git fica no histórico; uma chave exposta tem de ser revogada. | — |
| sc-03 | apresentador | resposta | O .env fica de fora | O ficheiro .env com segredos nunca entra no repositório; partilha-se só um .env.example sem valores. | — |
| sc-04 | apresentador | ordenar | Do acesso mínimo ao total | Menor privilégio: cada conta ou serviço recebe só o acesso de que precisa. | — |
| sc-05 | apresentador | escolha | O bucket público | Um bucket com leitura pública fica acessível a qualquer pessoa na internet. | — |
| sc-06 | apresentador | ordenar | A vida de um segredo | Um segredo tem ciclo de vida: cria-se num cofre, roda-se com regularidade e revoga-se no fim. | — |
| sc-07 | apresentador | clica-erro | O segredo no registo do CI | Tudo o que um pipeline escreve fica nos registos, que muita gente pode ler. | — |
| sc-08 | apresentador | resposta | A conta root da cloud | A conta principal da cloud controla tudo e precisa da proteção mais forte. | — |
| sc-09 | apresentador | clica-erro | O segredo na imagem | Um segredo escrito no Dockerfile fica gravado na imagem, ao alcance de quem a descarregar. | — |
| sc-10 | apresentador | escolha | Como a app chega à base de dados | Credenciais temporárias, dadas pela cloud a um serviço, evitam chaves fixas que podem vazar. | — |

## Dispositivos móveis

| id | modo | modelo | título | conceito | depende de |
| --- | --- | --- | --- | --- | --- |
| mb-01 | participante | ordenar | Do bloqueio mais fraco ao mais forte | Quanto mais combinações o bloqueio tiver, mais tempo leva a adivinhar. | — |
| mb-02 | apresentador | escolha | O jogo pago de graça | Apps instaladas fora das lojas oficiais são a principal porta de entrada de malware no telemóvel. | — |
| mb-03 | apresentador | escolha | A app de limpeza quer acessibilidade | O serviço de acessibilidade deixa uma app ler o ecrã e carregar em botões por ti. | — |
| mb-04 | apresentador | escolha | A atualização pendente | As atualizações de segurança corrigem falhas que os atacantes já conhecem. | — |
| mb-05 | apresentador | ordenar | Como se rouba um número de telemóvel | Troca de SIM: o atacante convence a operadora a passar o teu número para um cartão dele. | — |
| mb-06 | apresentador | escolha | Perdeste o telemóvel | Bloquear e apagar à distância protege os dados de um telemóvel perdido. | — |
| mb-07 | apresentador | clica-erro | A app pronta para a loja? | Uma app publicada não deve estar em modo de depuração nem aceitar tráfego sem cifra. | — |
| mb-08 | apresentador | escolha | Carregar no aeroporto | Uma porta USB pública pode trocar dados com o telemóvel, não só energia. | — |
| mb-09 | apresentador | resposta | Gerir os telemóveis da empresa | A gestão de dispositivos móveis aplica regras de segurança e permite apagar dados à distância. | — |
| mb-10 | apresentador | clica-erro | O que se vê no ecrã bloqueado | Notificações no ecrã bloqueado podem mostrar códigos a quem pegar no telemóvel. | — |

## Código seguro

| id | modo | modelo | título | conceito | depende de |
| --- | --- | --- | --- | --- | --- |
| cs-01 | participante | clica-erro | Encontra o path traversal | Juntar ao caminho o nome de um ficheiro vindo do utilizador deixa sair da pasta prevista. | — |
| cs-02 | apresentador | escolha | Validar a idade | Validar com uma lista do que é permitido é mais seguro do que tentar bloquear o que é perigoso. | — |
| cs-03 | apresentador | clica-erro | A password no registo | Passwords e tokens nunca devem ir para os registos da aplicação. | — |
| cs-04 | apresentador | escolha | A calculadora com eval | eval() executa como código qualquer texto que receber. | — |
| cs-05 | apresentador | ordenar | Corrigir uma dependência vulnerável | Uma dependência com uma falha conhecida corrige-se atualizando-a, com testes antes do deploy. | — |
| cs-06 | apresentador | resposta | Valores separados do SQL | Consultas parametrizadas enviam o SQL e os valores em separado, e a base de dados nunca os mistura. | — |
| cs-07 | apresentador | clica-erro | O erro que conta demais | Mensagens de erro detalhadas revelam ao atacante como a aplicação funciona por dentro. | — |
| cs-08 | apresentador | escolha | Tentativas sem limite | Sem limite de tentativas, o login fica aberto a ataques de força bruta. | — |
| cs-09 | apresentador | clica-erro | Encontra a injeção de comandos | Juntar texto do utilizador a um comando da shell deixa correr outros comandos. | — |
| cs-10 | apresentador | resposta | Versões fixas | O lockfile fixa as versões exatas de todas as dependências, incluindo as indiretas. | — |
