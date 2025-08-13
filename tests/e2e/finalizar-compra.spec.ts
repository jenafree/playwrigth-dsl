// Caso 1: FinalizarCompra (caminho feliz) - DSL puro de negócio

import { test, expect } from '../../src/infra/fixtures';

test.describe('FinalizarCompra - Caminho Feliz', { tag: ['@smoke', '@critica'] }, () => {
  test('Como cliente logado, adiciono item ao carrinho, seleciono frete e finalizo compra com cartão aprovado', { tag: '@smoke' }, async ({ useCases }) => {
    // 🎯 História DSL (sem UI-ês)
    // Como cliente logado, adiciono 2 unidades do SKU CAMISETA-PRETA-M ao carrinho.
    // Seleciono o frete Econômico para meu endereço cadastrado.
    // Reviso o resumo do pedido e pago com cartão aprovado em 1 parcela.
    // O pedido é confirmado e numerado.

    const numeroPedido = await useCases.finalizarCompra(
      'CAMISETA-PRETA-M',  // SKU canônico
      2,                   // quantidade
      'Economico',         // frete canônico
      'cartao',           // método
      1                   // parcelas
    );

    // 📊 Validações de eventos esperados
    const { eventPublisher } = await import('../../src/common/eventos');
    const eventos = eventPublisher.getEventos();

    const eventoItemAdicionado = eventos.find(e => e.tipo === 'ItemAdicionado');
    expect(eventoItemAdicionado).toBeDefined();
    expect(eventoItemAdicionado?.dados.sku).toBe('CAMISETA-PRETA-M');
    expect(eventoItemAdicionado?.dados.quantidade).toBe(2);

    const eventoFreteSelecionado = eventos.find(e => e.tipo === 'FreteSelecionado');
    expect(eventoFreteSelecionado).toBeDefined();
    expect(eventoFreteSelecionado?.dados.tipo).toBe('Economico');

    const eventoPagamentoAprovado = eventos.find(e => e.tipo === 'PagamentoAprovado');
    expect(eventoPagamentoAprovado).toBeDefined();
    expect(eventoPagamentoAprovado?.dados.metodo).toBe('cartao');
    expect(eventoPagamentoAprovado?.dados.parcelas).toBe(1);

    const eventoPedidoCriado = eventos.find(e => e.tipo === 'PedidoCriado');
    expect(eventoPedidoCriado).toBeDefined();
    expect(eventoPedidoCriado?.dados.numero).toBe(numeroPedido);

    // 🏛️ Validações de invariantes
    const { Invariantes } = await import('../../src/common/invariantes');
    const { SKUs, Fretes } = await import('../../src/common/dados-canonicos');

    const precoUnitario = SKUs['CAMISETA-PRETA-M'].preco;
    const subtotalEsperado = precoUnitario * 2; // 49,90 * 2 = 99,80
    const freteEsperado = Fretes.Economico.custo; // 5,90
    const totalEsperado = subtotalEsperado + freteEsperado; // 105,70

    expect(eventoPedidoCriado?.dados.total).toBe(totalEsperado);

    // ✅ Pós-condições observáveis
    expect(numeroPedido).toMatch(/^PED\d+$/); // Formato de número de pedido
    console.log(`[SUCESSO] Pedido ${numeroPedido} criado com total R$ ${totalEsperado}`);
  });

  test('Validar invariantes específicas do caso FinalizarCompra', async ({ useCases }) => {
    // Preparar estado inicial
    await useCases.finalizarCompra('CAMISETA-PRETA-M', 1, 'Economico');

    // Invariantes específicas
    const { eventPublisher } = await import('../../src/common/eventos');
    const eventos = eventPublisher.getEventos();

    // Invariante: estoque(sku) ≥ quantidade durante a reserva
    const eventoItem = eventos.find(e => e.tipo === 'ItemAdicionado');
    expect(eventoItem?.dados.quantidade).toBeLessThanOrEqual(100); // estoque canônico

    // Invariante: total > 0
    const eventoPedido = eventos.find(e => e.tipo === 'PedidoCriado');
    expect(eventoPedido?.dados.total).toBeGreaterThan(0);

    // Invariante: frete ≥ 0 compatível com CEP
    const eventoFrete = eventos.find(e => e.tipo === 'FreteSelecionado');
    expect(eventoFrete?.dados.custo).toBeGreaterThanOrEqual(0);
    expect(eventoFrete?.dados.prazo).toBeGreaterThan(0);

    // Invariante: num_pedido existente e único após confirmação
    expect(eventoPedido?.dados.numero).toBeTruthy();
    const pedidosDuplicados = eventos.filter(e => 
      e.tipo === 'PedidoCriado' && e.dados.numero === eventoPedido?.dados.numero
    );
    expect(pedidosDuplicados).toHaveLength(1);
  });
});
