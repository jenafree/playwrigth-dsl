## Critérios de PR e Definition of Done

### Critérios de PR

- Especificação usa vocabulário de domínio; não menciona UI/seletores.
- Dados canônicos citados (SKU, cupom, cartão, endereço) e justificativa de uso.
- Evidência do evento final (PedidoCriado/PagamentoRecusado).
- Invariantes/asserts de negócio presentes e auditáveis.
- Explicar impacto em comandos/eventos (referenciar quadro em `casos-de-uso`).

### Reprovações automáticas

- Spec descreve implementação ("clicar", "digitar", seletor) em vez de intenção.
- Uso de dados mágicos fora do catálogo canônico.
- Ausência de invariantes ou eventos esperados.

### Definition of Done (DoD)

- Contexto → comandos → eventos → invariantes definidos e verificados.
- DSL de negócio, sem termos de UI.
- Dados criados/limpos; teste idempotente e isolado.
- Observabilidade de domínio (logs por evento; nome do caso).
- Glossário atualizado e referenciado.
