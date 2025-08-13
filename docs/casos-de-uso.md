## Casos de Uso — DSL de Negócio

### Caso 1 — FinalizarCompra (caminho feliz)

- Como cliente logado, adiciono 2 unidades do SKU CAMISETA-PRETA-M ao carrinho.
- Seleciono o frete Econômico para meu endereço cadastrado.
- Reviso o resumo do pedido e pago com cartão aprovado em 1 parcela.
- O pedido é confirmado e numerado.

- **Eventos esperados**
  - ItemAdicionadoAoCarrinho(sku='CAMISETA-PRETA-M', qty=2)
  - FreteSelecionado(tipo='Economico')
  - PagamentoAprovado(metodo='cartao', parcelas=1)
  - PedidoCriado(numero, total)
- **Invariantes**
  - total = soma(itens) + frete − desconto
  - estoque(sku) ≥ quantidade
  - total > 0
  - frete ≥ 0 compatível com CEP
  - número de pedido único após confirmação
- **Pós-condições observáveis**
  - Carrinho esvaziado após criação do pedido.
  - Histórico de pedidos exibe o número recém-criado.
  - Status visível: "Confirmado".
- **Comandos envolvidos**
  - Simples: AdicionarItemAoCarrinho, SelecionarFrete, RevisarResumo, Pagar.
  - Composto: FinalizarCompra.

### Caso 2 — AplicarCupom (válido, inválido, expirado)

- Como cliente logado, aplico o cupom BEMVINDO10; o total reflete 10% de desconto sobre os itens.
- Removo o cupom.
- Aplico o cupom PROMOFAKE; mensagem de cupom inválido e total inalterado.
- Aplico o cupom BLACK2022; mensagem de cupom expirado e total inalterado.

- **Eventos esperados**
  - CupomAplicado(codigo='BEMVINDO10', tipo='percentual', valor=10)
  - CupomRemovido(codigo='BEMVINDO10')
  - CupomRejeitado(codigo='PROMOFAKE', motivo='invalido')
  - CupomRejeitado(codigo='BLACK2022', motivo='expirado')
- **Invariantes**
  - desconto ≤ soma(itens)
  - cupom não cumulativo: aplicar novo remove o anterior (ou rejeita)
  - total_pos_cupom = soma(itens) + frete − desconto (cupom não incide sobre frete)
  - itens/quantidades inalterados quando cupom falha
- **Pós-condições observáveis**
  - Com BEMVINDO10: total reduz exatos 10% do subtotal dos itens.
  - PROMOFAKE / BLACK2022: sem alteração de total + mensagem adequada.
- **Comandos envolvidos**
  - Simples: AplicarCupom, RemoverCupom, RevisarResumo.
  - Composto: AplicarCupomEValidarTotal.

### Caso 3 — Pagamento (recusas e aprovação)

- Como cliente logado, reviso o resumo do pedido.
- Pagar com cartão RecusadoPorLimite; mensagem de recusa e pedido não criado.
- Pagar com cartão RecusadoAntifraude; mensagem de segurança e pedido não criado.
- (Opcional) Pagar com cartão Aprovado; o pedido é confirmado e numerado.

- **Eventos esperados**
  - PagamentoRecusado(motivo='limite')
  - PagamentoRecusado(motivo='antifraude')
  - (Opcional) PagamentoAprovado(...) → PedidoCriado(numero, total)
- **Invariantes**
  - Em recusa, não existe PedidoCriado.
  - Carrinho permanece para nova tentativa.
  - Mensagens de recusa explicam o motivo.
  - Múltiplas tentativas não duplicam cobranças nem reservas indevidas.
- **Pós-condições observáveis**
  - Após recusas: nenhum pedido novo; carrinho intacto.
  - Após aprovação: pedido numerado e carrinho limpo.
- **Comandos envolvidos**
  - Simples: RevisarResumo, Pagar.
  - Composto: TentarPagamentosAteAprovar (opcional).

### Quadro de comandos (simples) → eventos e invariantes

| Comando simples                          | Eventos possíveis                                      | Invariantes tocadas                                      |
| ---------------------------------------- | ------------------------------------------------------ | -------------------------------------------------------- |
| AdicionarItemAoCarrinho(sku, quantidade) | ItemAdicionadoAoCarrinho                               | estoque(sku) ≥ quantidade; total recalculado             |
| RemoverItemDoCarrinho(sku)               | ItemRemovidoDoCarrinho                                 | total recalculado; total ≥ 0                             |
| AlterarQuantidade(sku, novaQuantidade)   | QuantidadeAlterada                                     | estoque(sku) ≥ quantidade; total recalculado             |
| AplicarCupom(codigo)                     | CupomAplicado ou CupomRejeitado                        | desconto ≤ soma(itens); cupom não cumulativo             |
| RemoverCupom()                           | CupomRemovido                                          | total = itens + frete − desconto                         |
| SelecionarFrete(tipo)                    | FreteSelecionado                                       | frete ≥ 0; prazo coerente com CEP                        |
| RevisarResumo()                          | ResumoAtualizado                                       | total consistente; itens/quantidades corretos            |
| Pagar(metodo, parametros)                | PagamentoAprovado/Recusado; se aprovado → PedidoCriado | em recusa, nenhum PedidoCriado; idempotência na cobrança |
