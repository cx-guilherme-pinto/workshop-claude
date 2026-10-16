# Benchmark de custo e tempo

Gerado em 2026-10-16 14:48 a partir de `benchmark/results.csv`. O custo é medido com os tokens reais e os preços de `pricing.json`. A coluna "Claude Code" é o `total_cost_usd` do CLI, que sobrestima nesta versão (ver DECISIONS D-13).

## Modo participante (10 execuções)

| métrica | mínimo | média | máximo | desvio padrão |
|---|---|---|---|---|
| custo total | US$ 0,90 | US$ 1,03 | US$ 1,12 | US$ 0,0588 |
| custo Haiku | US$ 0,0255 | US$ 0,0289 | US$ 0,0313 | US$ 0,0019 |
| custo Sonnet | US$ 0,55 | US$ 0,68 | US$ 0,76 | US$ 0,0558 |
| custo Opus | US$ 0,31 | US$ 0,32 | US$ 0,34 | US$ 0,0104 |
| duração | 3,5 min | 4,0 min | 4,8 min | 0,5 min |
| agentes | 22 | 22,1 | 23 | 0,3 |
| custo segundo o Claude Code | US$ 2,24 | US$ 2,45 | US$ 2,68 | US$ 0,12 |

Execuções com sucesso (testes verdes e sem erros): **10/10**.
Critério de aceitação (todas com sucesso, ≤ 20 min, custo máximo ≤ US$ 10, média idealmente ≤ US$ 5): **CUMPRIDO**.

| execução | duração | custo | Haiku | Sonnet | Opus | agentes | verdes | testes | veredito | gate | negações |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 20261016-143850-participante-1 | 3,6 min | US$ 1,05 | US$ 0,0255 | US$ 0,69 | US$ 0,33 | 22 | 20 | 155/155 | aprovado_com_reservas | aprovado | 0 |
| 20261016-144228-participante-2 | 4,8 min | US$ 1,12 | US$ 0,0313 | US$ 0,76 | US$ 0,34 | 22 | 20 | 155/155 | aprovado_com_reservas | aprovado | 1 |
| 20261016-144716-participante-3 | 4,3 min | US$ 1,02 | US$ 0,0274 | US$ 0,69 | US$ 0,31 | 22 | 20 | 155/155 | aprovado | aprovado | 0 |
| 20261016-145135-participante-4 | 4,4 min | US$ 0,98 | US$ 0,0312 | US$ 0,64 | US$ 0,31 | 22 | 20 | 155/155 | aprovado_com_reservas | aprovado | 0 |
| 20261016-145559-participante-5 | 3,8 min | US$ 1,06 | US$ 0,0301 | US$ 0,72 | US$ 0,32 | 23 | 20 | 155/155 | aprovado_com_reservas | aprovado | 1 |
| 20261016-145947-participante-6 | 4,8 min | US$ 1,01 | US$ 0,0300 | US$ 0,67 | US$ 0,31 | 22 | 20 | 155/155 | aprovado_com_reservas | aprovado | 1 |
| 20261016-150436-participante-7 | 3,5 min | US$ 1,01 | US$ 0,0289 | US$ 0,66 | US$ 0,32 | 22 | 20 | 155/155 | aprovado_com_reservas | aprovado | 0 |
| 20261016-150803-participante-8 | 4,3 min | US$ 0,90 | US$ 0,0287 | US$ 0,55 | US$ 0,33 | 22 | 20 | 155/155 | aprovado_com_reservas | aprovado | 0 |
| 20261016-151220-participante-9 | 3,5 min | US$ 1,07 | US$ 0,0267 | US$ 0,71 | US$ 0,34 | 22 | 20 | 155/155 | aprovado | aprovado | 0 |
| 20261016-151550-participante-10 | 3,5 min | US$ 1,03 | US$ 0,0295 | US$ 0,68 | US$ 0,32 | 22 | 20 | 155/155 | aprovado_com_reservas | aprovado | 1 |

## Modo apresentador (3 execuções)

| métrica | mínimo | média | máximo | desvio padrão |
|---|---|---|---|---|
| custo total | US$ 2,53 | US$ 2,54 | US$ 2,55 | US$ 0,0152 |
| custo Haiku | US$ 0,16 | US$ 0,17 | US$ 0,17 | US$ 0,0030 |
| custo Sonnet | US$ 1,99 | US$ 1,99 | US$ 2,00 | US$ 0,0070 |
| custo Opus | US$ 0,37 | US$ 0,38 | US$ 0,39 | US$ 0,0063 |
| duração | 6,6 min | 7,1 min | 7,9 min | 0,7 min |
| agentes | 107 | 107,0 | 107 | 0,0 |
| custo segundo o Claude Code | US$ 10,00 | US$ 10,13 | US$ 10,28 | US$ 0,14 |

Execuções com sucesso (testes verdes e sem erros): **3/3**.

| execução | duração | custo | Haiku | Sonnet | Opus | agentes | verdes | testes | veredito | gate | negações |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 20261016-152044-apresentador-gravado | 6,6 min | US$ 2,53 | US$ 0,16 | US$ 1,99 | US$ 0,37 | 107 | 105 | 665/665 | aprovado_com_reservas | aprovado | 0 |
| 20261016-153209-apresentador-gravado | 6,9 min | US$ 2,55 | US$ 0,17 | US$ 1,99 | US$ 0,39 | 107 | 105 | 665/665 | aprovado_com_reservas | aprovado | 0 |
| 20261016-154024-apresentador-1 | 7,9 min | US$ 2,55 | US$ 0,17 | US$ 2,00 | US$ 0,38 | 107 | 105 | 665/665 | aprovado_com_reservas | aprovado | 0 |

