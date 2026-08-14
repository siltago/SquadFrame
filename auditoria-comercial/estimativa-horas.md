# Estimativa de horas

## Reconstrução de sessões

| Cenário | Regra | Sessões | Horas rastreáveis pelo histórico Git | Média/sessão | Média/dia ativo |
|---|---|---:|---:|---:|---:|
| Conservador | gap 1h; +30 min; mínimo 30 min | 75 | 60,4 h | 0,81 h | 1,78 h |
| Provável | gap 2h; +45 min; mínimo 1h | 64 | 95,4 h | 1,49 h | 2,81 h |
| Ampliado | gap 3h; +1h; mínimo 1h30 | 54 | 130,2 h | 2,41 h | 3,83 h |

Médias semanais: 8,64 h / 13,63 h / 18,60 h. Médias mensais: 20,15 h / 31,79 h / 43,41 h.

## Trabalho não capturado pelo Git

| Atividade | Mínimo | Provável | Ampliado | Fundamento |
|---|---:|---:|---:|---|
| Requisitos e processos | 5 h | 15 h | 30 h | Domínio industrial detalhado |
| Arquitetura/modelagem | 5 h | 15 h | 30 h | 11 mil linhas SQL e documentos arquiteturais |
| Pesquisa/estudo/prompts | 5 h | 20 h | 45 h | Ritmo/volume indicam forte automação; inferência |
| Testes manuais/correções sem commit | 5 h | 15 h | 30 h | Sem suíte automatizada |
| Design e revisão | 4 h | 10 h | 20 h | 306 TSX e design system |
| Documentação/reuniões/deploy | 5 h | 10 h | 25 h | Docs, Vercel e alinhamento implícito |

As categorias não são observáveis com precisão e não devem ser somadas mecanicamente a cada cenário de sessão, pois podem se sobrepor ao intervalo entre commits.

## Dedicação total adotada

| Cenário | Horas rastreáveis pelo histórico Git | Horas estimadas de dedicação total | Confiança |
|---|---:|---:|---|
| Total mínimo | 60,4 h | **90 h** | Baixa-média |
| Total provável | 95,4 h | **180 h** | Média |
| Total ampliado | 130,2 h | **320 h** | Baixa-média |

O intervalo amplo é intencional. O Git mostra intensidade excepcional (64 mil linhas úteis em 47 dias), compatível com geração assistida e ciclos curtos, mas incapaz de revelar integralmente planejamento e validação. Estes números são **estimativas**, não apontamento de horas.

