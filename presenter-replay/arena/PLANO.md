# Plano da Arena — modo apresentador

| onda | modelo | o quê | em paralelo |
|---|---|---|---|
| 1 | Haiku | `lib-hash` + 100 cartões (cr-01, cr-02, cr-03, cr-04, cr-06 esperam pelo `lib-hash`) | até 8 |
| 2 | Sonnet | página de categoria + tabela de pontuação | 2 |
| 3 | Sonnet | integração e suite completa; cartões que falhem 2× são refeitos em Sonnet | 1+ |
| 4 | Opus | revisão de segurança e qualidade, veredito final | 1 |

```mermaid
flowchart LR
  hash["lib-hash<br/>Haiku"]
  g_passwords["Passwords ×10<br/>Haiku"]
  g_passwords --> paginas
  g_phishing["Phishing ×10<br/>Haiku"]
  g_phishing --> paginas
  g_web["Web (XSS, SQLi, CSRF) ×10<br/>Haiku"]
  g_web --> paginas
  g_redes["Redes ×10<br/>Haiku"]
  g_redes --> paginas
  g_privacidade["Privacidade ×10<br/>Haiku"]
  g_privacidade --> paginas
  g_engenharia_social["Engenharia social ×10<br/>Haiku"]
  g_engenharia_social --> paginas
  g_criptografia["Criptografia básica ×10<br/>Haiku"]
  hash --> g_criptografia
  g_criptografia --> paginas
  g_segredos_cloud["Segredos e cloud ×10<br/>Haiku"]
  g_segredos_cloud --> paginas
  g_mobile["Dispositivos móveis ×10<br/>Haiku"]
  g_mobile --> paginas
  g_codigo_seguro["Código seguro ×10<br/>Haiku"]
  g_codigo_seguro --> paginas
  hash --> paginas
  paginas["onda 2 · Sonnet<br/>categorias + pontuação"] --> integracao["onda 3 · Sonnet<br/>integração + suite"]
  integracao --> revisao["onda 4 · Opus<br/>revisão"]
```

## Estimativa de custo

| tipo | modelo | agentes | custo por agente | subtotal |
|---|---|---|---|---|
| worker | Haiku 5.5 | 101 (+11 repetições) | US$ 0,0056 | US$ 0,63 |
| implementer | Sonnet 5.5 | 2 | US$ 0,23 | US$ 0,45 |
| integrator | Sonnet 5.5 | 1 | US$ 0,23 | US$ 0,23 |
| reviewer | Opus 5.5 | 1 | US$ 0,31 | US$ 0,31 |
| sessão principal | Sonnet 5.5 | 1 | US$ 0,0575 | US$ 0,98 |
| **total estimado** | | | | **US$ 2,60** |

Alvo: US$ 5,00 · teto: US$ 10,00. Dentro do alvo. A execução nunca é interrompida por custo.

## Ajustes do planner

Mantenho o paralelismo por defeito de 8 em vez de 16: a memória não tem lições sobre erros 429, mas 105 tarefas a 16 em simultâneo aumentam o risco de limites de taxa sem ganho proporcional. Os cartões são unidades pequenas e independentes, adequadas a Haiku, e a 3.ª tentativa já escala automaticamente para Sonnet, o que cobre os casos difíceis sem custo à partida. Não promovo nenhum cartão: mesmo os de criptografia que usam lib-hash só consomem uma biblioteca já pronta, e o risco real está em lib-hash, não nos cartões. As páginas e a integração ficam em Sonnet e a revisão em Opus, onde o raciocínio transversal compensa o custo.

- paralelismo: 8

Riscos:
- Os cartões cr-01, cr-02, cr-03, cr-04 e cr-06 dependem de lib-hash: se lib-hash falhar ou mudar de API, estes 5 cartões bloqueiam ou partem em cascata.
- Sobreposição de temas (ph-07 vs ph-06, web-01 vs cs-06, pw-07 vs pw-03, cr-08 vs pw-04) pode gerar conteúdo duplicado ou contraditório entre agentes independentes.
- Com 100 cartões em Haiku, a consistência de formato e de tom pode variar e só ser detetada tarde, na integração ou na revisão em Opus.
- Os cartões de código (web-*, cs-*) mostram exemplos vulneráveis: risco de exemplos tecnicamente errados ou de código inseguro copiável sem aviso claro.
