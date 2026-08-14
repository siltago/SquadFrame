# Estados da visita

Transições são validadas em `services/rules.ts`:

```text
agendada → disponivel_offline | em_deslocamento | cancelada
em_deslocamento → em_andamento | cancelada
em_andamento → pausada | aguardando_sincronizacao | aguardando_revisao | cancelada
pausada → em_andamento | cancelada
aguardando_revisao → concluida | correcao_solicitada
correcao_solicitada → em_andamento
```

Estados terminais não aceitam transição arbitrária. O progresso considera ambientes, elementos, medidas válidas e pendências críticas; fotos e vídeos ainda não entram no cálculo.
