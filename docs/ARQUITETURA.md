# Documento de Casos – E-commerce (DSL de Negócio)

**Foco**: zero código. Arquitetura, DSL, governança e casos âncora.

---

## 🔑 Diretrizes-Chave

- **Login via Global Setup**: autenticação antes da suíte, salvando estado por papel (ex.: `cliente`, `admin`).
- **Camada `common`**: vocabulário de domínio + dados canônicos + comandos simples reutilizáveis.
- **Comandos Simples x Compostos**: simples = ação atômica; compostos = orquestram simples para um caso de uso.
- **Eventos & Invariantes**: obrigatórios em cada caso.

---

## 📚 Glossário Essencial

Atores: visitante, cliente, admin.
Entidades: produto, SKU, variação, carrinho, item, endereço, frete, cupom, pagamento, pedido.
Eventos: ItemAdicionado, CupomAplicado/CupomRejeitado, FreteSelecionado, PagamentoAprovado/Recusado, PedidoCriado.
Invariantes gerais: `total = itens + frete – desconto`, estoque ≥ quantidade, total ≥ 0, cupom não cumulativo.

---

## 🧱 Camadas (contrato conceitual)

- **Spec**: narra intenção do negócio.
- **Flows / Use Cases**: comandos compostos com pré/pós-condições e eventos.
- **Common**: dados canônicos e comandos simples.
- **Adapters**: UI/API traduzindo intenções.
- **Infra**: global setup, tags, retries, observabilidade.

---

## 🧩 Catálogo de Dados Canônicos

- **SKUs**: CAMISETA-PRETA-M, TENIS-URBANO-42, MOCHILA-TRAVEL.
- **Cupons**: BEMVINDO10 (válido), PROMOFAKE (inválido), BLACK2022 (expirado).
- **Cartões**: Aprovado, RecusadoPorLimite, RecusadoAntifraude.
- **Endereços**: Capital, Interior.

---

## 🧠 Tipos de Comando

**Simples**: AdicionarItemAoCarrinho, RemoverItemDoCarrinho, AlterarQuantidade, AplicarCupom, RemoverCupom, SelecionarFrete, RevisarResumo, Pagar, AtualizarEndereco.

**Compostos**: FinalizarCompra, AplicarCupomEValidarTotal, TentarPagamentosAteAprovar.

---

## 📦 Caso 1 — FinalizarCompra (feliz)

**Contexto**: cliente logado, carrinho vazio, SKU disponível, endereço cadastrado, sem cupom.
**História**: adicionar 2 unidades → selecionar frete econômico → revisar resumo → pagar com cartão aprovado.
**Eventos**: ItemAdicionadoAoCarrinho, FreteSelecionado, PagamentoAprovado, PedidoCriado.
**Invariantes**: total coerente, estoque ≥ qty, num_pedido único.
**Pós**: carrinho vazio, histórico atualizado.
**Comandos**: simples e composto FinalizarCompra.

---

## 🧪 Caso 2 — AplicarCupom (variações)

**Contexto**: cliente logado, carrinho com 1 SKU, cupons válido/inválido/expirado.
**História**: aplicar BEMVINDO10 → remover → aplicar PROMOFAKE → aplicar BLACK2022.
**Eventos**: CupomAplicado, CupomRemovido, CupomRejeitado.
**Invariantes**: desconto ≤ subtotal, não cumulativo.
**Pós**: total ajustado quando válido, inalterado quando inválido/expirado.
**Comandos**: simples e composto AplicarCupomEValidarTotal.

---

## 💳 Caso 3 — Pagamento (recusas/aprovação)

**Contexto**: cliente logado, carrinho 1 SKU, frete selecionado, cartões sandbox.
**História**: pagar com RecusadoPorLimite → pagar com RecusadoAntifraude → (opcional) pagar com Aprovado.
**Eventos**: PagamentoRecusado, (opcional) PagamentoAprovado, PedidoCriado.
**Invariantes**: sem pedido criado nas recusas, carrinho intacto.
**Pós**: pedido só criado na aprovação.
**Comandos**: simples e composto TentarPagamentosAteAprovar.

---

## 📌 Quadro de Comandos (Mapa de Impacto)

| Comando                 | Intenção          | Eventos                                 | Invariantes                    | Pré                | Pós                        | Observabilidade                 |
| ----------------------- | ----------------- | --------------------------------------- | ------------------------------ | ------------------ | -------------------------- | ------------------------------- |
| AdicionarItemAoCarrinho | Incluir item      | ItemAdicionado / ItemRejeitado          | estoque ≥ qty; total correto   | SKU disponível     | Item no resumo             | Log SKU/qty; evitar duplicidade |
| RemoverItemDoCarrinho   | Retirar item      | ItemRemovido                            | total recalculado              | Item no carrinho   | Item removido              | Checar cupons ainda válidos     |
| AlterarQuantidade       | Ajustar qty       | QuantidadeAlterada / AlteracaoRejeitada | estoque ≥ qty                  | Item existente     | Qty refletida              | Validar limites                 |
| AplicarCupom            | Benefício         | CupomAplicado / CupomRejeitado          | desconto ≤ subtotal            | Itens elegíveis    | Total ajustado             | Mensagem específica             |
| RemoverCupom            | Retirar benefício | CupomRemovido                           | total baseline                 | Cupom ativo        | Total baseline             | Limpar label/banner             |
| SelecionarFrete         | Modal entrega     | FreteSelecionado / FreteIndisponivel    | frete ≥ 0                      | Endereço definido  | Prazo/custo exibidos       | Registrar CEP/tipo              |
| RevisarResumo           | Validar pedido    | ResumoRevisado                          | total coerente                 | Carrinho não vazio | Resumo correto             | Checar invariantes              |
| Pagar                   | Concluir compra   | PagamentoAprovado / PagamentoRecusado   | PedidoCriado só após aprovação | Resumo válido      | Mensagem aprovada/recusada | Evitar duplicação               |
| AtualizarEndereco       | Alterar destino   | EnderecoAtualizado / EnderecoRejeitado  | frete recalculado              | Dados válidos      | Endereço atualizado        | Recalcular frete                |

**Compostos** → Simples:

- FinalizarCompra: AdicionarItem → SelecionarFrete → RevisarResumo → Pagar.
- AplicarCupomEValidarTotal: AplicarCupom → RevisarResumo → RemoverCupom → Repetir.
- TentarPagamentosAteAprovar: RevisarResumo → Pagar(recusas) → Pagar(aprovado).

---

## 🛡️ Governança

- DSL puro, sem termos de UI.
- Eventos e invariantes obrigatórios.
- Dados canônicos citados.
- Login sempre via Global Setup.

---

## 🗺️ Diagrama Textual — Arquitetura Hexagonal

```
            [  Infra / Config  ]
                 |  (global setup, tags, retries, observabilidade)
                 v
        +----------------------------+
        |         Spec (DSL)         |
        |  Histórias de negócio      |
        +----------------------------+
                 |
                 v
        +----------------------------+
        |   Flows / Use Cases        |
        | (comandos compostos)       |
        +----------------------------+
                 |
      -----------------------------
      |                           |
      v                           v
+-------------+            +-------------+
|  Common     |            |  Common     |
| (dados +    |            | (comandos   |
| comandos    |            | simples)    |
+-------------+            +-------------+
      |                           |
      v                           v
+-------------+            +-------------+
| UI Adapter  |            | API Adapter |
| Playwright  |            | Seeds/Clean |
+-------------+            +-------------+
      \                           /
       \                         /
        \                       /
         +---------------------+
         |    Sistemas-Alvo    |
         |  (E-commerce real)  |
         +---------------------+
```

---

## 🗺️ Roadmap sem código

1. ✅ Validar documento com dev/PO.
2. ✅ Fechar catálogo canônico.
3. ✅ Definir contratos dos comandos.
4. ✅ Configurar Global Setup.
5. ✅ Escrever specs-piloto usando DSL.
6. 🔄 Negociar `data-test-id` com front.
7. 🔄 Escalar para demais jornadas.

---

## 📁 Estrutura Implementada

```
src/
├── common/           # Vocabulário + comandos simples
│   ├── types.ts
│   ├── dados-canonicos.ts
│   ├── eventos.ts
│   ├── invariantes.ts
│   └── comandos-simples.ts
├── flows/            # Comandos compostos (use cases)
│   └── use-cases.ts
├── adapters/         # Tradução UI/API
│   ├── ui-adapter.ts
│   └── api-adapter.ts
└── infra/            # Global setup + observabilidade
    ├── global-setup.ts
    ├── fixtures.ts
    └── observabilidade.ts

tests/e2e/            # Specs DSL puro
├── finalizar-compra.spec.ts
├── aplicar-cupom.spec.ts
└── pagamento.spec.ts
```

---

## 🚀 Como Executar

```bash
# Testes completos
npx playwright test tests/e2e

# Caso específico
npx playwright test finalizar-compra

# UI interativa
npx playwright test --ui

# Relatório HTML
npx playwright show-report
```
