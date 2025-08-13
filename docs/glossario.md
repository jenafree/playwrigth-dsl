## Glossário v1 — E-commerce (Ubiquitous Language)

### Atores

- **visitante**: usuário sem autenticação.
- **cliente**: usuário autenticado com perfil de compra.
- **admin**: operador administrativo.

### Entidades

- **produto**: oferta comercial que pode possuir variações.
- **variação**: atributo diferenciador (ex.: tamanho/cor) que compõe um SKU.
- **SKU**: unidade estocável e vendável, identificada de forma única.
- **carrinho**: coleção de itens em preparação para compra.
- **item**: instância de um SKU no carrinho com quantidade e preço unitário.
- **endereço**: local de entrega, afeta cálculo de frete/prazo.
- **frete**: custo e prazo de entrega escolhidos para o pedido.
- **cupom**: política promocional aplicada ao subtotal de itens (salvo política específica).
- **pagamento**: instrução de cobrança (ex.: cartão).
- **pedido**: confirmação da compra com número e total.

### Eventos

- **ItemAdicionado**: item incluído no carrinho.
- **ItemRemovido**: item removido do carrinho.
- **QuantidadeAlterada**: quantidade ajustada.
- **CupomAplicado** / **CupomRejeitado** / **CupomRemovido**: estado da política promocional.
- **FreteSelecionado**: modalidade de frete escolhida.
- **PagamentoAprovado** / **PagamentoRecusado**: resultado do gateway.
- **PedidoCriado**: confirmação do pedido.

### Invariantes gerais

- total = soma(itens) + frete − desconto
- estoque(sku) ≥ quantidade
- total ≥ 0
- cupom não cumulativo (salvo exceções de política)
