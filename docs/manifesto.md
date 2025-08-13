## Manifesto de Arquitetura & DSL — E-commerce (Playwright, Clean Code)

### Missão

- **Objetivo**: suíte E2E focada em negócio, com DSL de domínio que "conta a história" do cliente. Interações técnicas (cliques, seletores, esperas) ficam nos adapters.
- **Qualidade**: legibilidade máxima, flakiness mínima, manutenção barata.

### Norte filosófico

- **Intenção > Implementação**: a spec narra intenções do cliente e promessas do negócio.
- **DDD light / Hexagonal**: domínio no centro; adapters (UI/API) nas bordas.
- **Baixo acoplamento, alta coesão**.
- **Determinismo & Idempotência**: dados previsíveis; cada caso cria/limpa o que usa.
- **Observabilidade de negócio**: logs/asserts falam de eventos como `PedidoCriado`.

### Domínio (Ubiquitous Language)

- **Atores**: visitante, cliente, admin.
- **Entidades**: produto, variação, SKU, carrinho, item, endereço, frete, cupom, pagamento, pedido.
- **Eventos**: ItemAdicionado, CupomAplicado/CupomRejeitado, FreteSelecionado, PagamentoAprovado/Recusado, PedidoCriado.
- **Invariantes gerais**:
  - total = soma(itens) + frete − desconto
  - estoque(sku) ≥ quantidade
  - total ≥ 0
  - cupom não cumulativo (salvo política específica)

### Camadas (contrato conceitual)

- **Spec (História)**: descreve intenção do negócio em português. Proibido mencionar UI.
- **Flows / Use Cases (Comandos compostos)**: encadeiam comandos simples; validam invariantes e publicam eventos.
- **Common (Vocabulário + Comandos simples)**: catálogos canônicos (SKUs, cupons, cartões, endereços) e comandos atômicos de domínio (sem UI).
- **Adapters (UI/API)**: traduzem intenções em interações técnicas (Playwright, REST, seeds, clock).
- **Infra**: global setup de papéis, tags de suíte, paralelismo, retries controlados, métricas.

### Tipos de comando

- **Simples (atômicos)**: AdicionarItemAoCarrinho, RemoverItemDoCarrinho, AlterarQuantidade, AplicarCupom, RemoverCupom, SelecionarFrete, RevisarResumo, Pagar.
- **Compostos (use cases)**: FinalizarCompra, AplicarCupomEValidarTotal, TentarPagamentosAteAprovar.

### Login — Global Setup

- Autenticação executa antes da suíte e persiste estado por papel (`cliente`, `admin`).
- Histórias nascem autenticadas; specs não "fazem login".
- Troca de papel = carregar outro estado antes do caso.

### Qualidade & Anti-flakiness

- Seletores estáveis (acordar `data-test-id` com o front).
- Esperas por sinais de negócio (resumo do pedido, toast `PedidoCriado`).
- Casos independentes, sem ordem implícita.
- Retry apenas para instabilidades de infra; nunca para mascarar bug.

### Taxonomia de suítes

- `@smoke`: buscar → add carrinho → checkout simples.
- `@critica`: carrinho, cupom, frete, pagamento.
- `@contrato`: APIs de catálogo/preço/frete/cupom.
- `@externas`: integrações (gateway/antifraude) com sandbox/mocks.
- `@regressao`: ampla, programada.
- `@exploratoria`: bordas catalogadas.

### Observabilidade

- Nome do caso de uso = intenção de negócio.
- Logs por evento de domínio (ItemAdicionado, PedidoCriado).
- Métricas: taxa de sucesso por caso, p95 de FinalizarCompra, flake rate por suíte.

### Governança & PR

- Specs usam vocabulário de domínio; sem UI/seletores.
- Citar dados canônicos usados (SKU, cupom, cartão) e por quê.
- Mostrar evidência do evento final (PedidoCriado/PagamentoRecusado).
- Reprovar se houver dados mágicos, falta de invariantes, ou menção direta à UI.

### Critérios de Pronto (DoD)

- Contexto → comandos → eventos → invariantes definidos.
- DSL sem termos de UI.
- Dados criados/limpos; teste idempotente.
- Observabilidade presente (logs de domínio).
- Glossário atualizado.

### Roadmap (sem código)

- Oficinar Glossário com dev+PO.
- Especificar em texto os 3 casos âncora.
- Mapear invariantes e eventos de cada caso.
- Esboçar contratos dos adapters (UI/API).
- Desenhar dados canônicos (SKUs, cupons, cartões, endereços).
- Definir plano de seed/limpeza e relógio de teste.
- Estratégia de execução (smoke por PR, crítica por merge, regressão noturna).

### Riscos & Decisões padrão

- Mudança de UI: mitigada por DSL + centralização de seletores.
- Dados compartilhados: isolamento por teste; limpeza rigorosa.
- Integrações instáveis: sandbox/mocks em suíte própria; E2E real no caminho crítico.
- Sensível a relógio (cupons/frete): controlar tempo ou usar janelas robustas.
