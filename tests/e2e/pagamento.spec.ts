// Caso 3: Pagamento (recusas e aprovação) - DSL puro de negócio

import { test, expect } from '../../src/infra/fixtures';

test.describe('Pagamento - Recusas e Aprovação', { tag: ['@critica', '@externas'] }, () => {
  test('Como cliente logado, tento pagamentos que são recusados e depois aprovo com cartão válido', { tag: '@critica' }, async ({ useCases }) => {
    // 🎯 História DSL (sem UI-ês)
    // Como cliente logado, reviso o resumo do pedido.
    // Pagar com cartão RecusadoPorLimite; mensagem de recusa e pedido não criado.
    // Pagar com cartão RecusadoAntifraude; mensagem de segurança e pedido não criado.
    // (Opcional) Pagar com cartão Aprovado; o pedido é confirmado e numerado.

    const numeroPedido = await useCases.tentarPagamentosAteAprovar('CAMISETA-PRETA-M');

    // 📊 Validações de eventos esperados
    const { eventPublisher } = await import('../../src/common/eventos');
    const eventos = eventPublisher.getEventos();

    // Eventos de recusa
    const eventosRecusa = eventos.filter(e => e.tipo === 'PagamentoRecusado');
    expect(eventosRecusa).toHaveLength(2);

    const recusaLimite = eventosRecusa.find(e => e.dados.motivo === 'limite');
    expect(recusaLimite).toBeDefined();

    const recusaAntifraude = eventosRecusa.find(e => e.dados.motivo === 'antifraude');
    expect(recusaAntifraude).toBeDefined();

    // Evento de aprovação final
    const eventoAprovado = eventos.find(e => e.tipo === 'PagamentoAprovado');
    expect(eventoAprovado).toBeDefined();

    // Evento de pedido criado apenas após aprovação
    const eventoPedidoCriado = eventos.find(e => e.tipo === 'PedidoCriado');
    expect(eventoPedidoCriado).toBeDefined();
    expect(eventoPedidoCriado?.dados.numero).toBe(numeroPedido);

    console.log(`[SUCESSO] Sequência de pagamentos validada. Pedido final: ${numeroPedido}`);
  });

  test('Validar invariantes específicas do caso Pagamento', async ({ uiAdapter }) => {
    // Preparar contexto
    await uiAdapter.adicionarItemAoCarrinho('CAMISETA-PRETA-M', 1);
    await uiAdapter.selecionarFrete('Economico');
    const resumoOriginal = await uiAdapter.revisarResumo();

    // 🏛️ Invariantes específicas

    // Invariante: Em recusa, não existe PedidoCriado
    const { Cartoes } = await import('../../src/common/dados-canonicos');
    
    const resultadoRecusa = await uiAdapter.pagar('cartao', {
      cartao: Cartoes.RecusadoPorLimite,
      parcelas: 1
    });
    expect(resultadoRecusa.aprovado).toBe(false);

    // Verificar que nenhum pedido foi criado
    const numeroPedidoAposRecusa = await uiAdapter.verificarPedidoCriado();
    expect(numeroPedidoAposRecusa).toBeNull();

    // Invariante: Carrinho permanece para nova tentativa
    const resumoAposRecusa = await uiAdapter.revisarResumo();
    expect(Math.abs(resumoAposRecusa.total - resumoOriginal.total)).toBeLessThan(0.01);
    expect(resumoAposRecusa.subtotal).toBe(resumoOriginal.subtotal);

    // Invariante: Mensagens de recusa explicam o motivo
    expect(resultadoRecusa.motivo).toBe('limite');

    console.log('[VALIDAÇÃO] Invariantes de pagamento confirmadas');
  });

  test('Cenário isolado: múltiplas tentativas não duplicam cobranças', async ({ uiAdapter }) => {
    const { Cartoes } = await import('../../src/common/dados-canonicos');
    const { eventPublisher } = await import('../../src/common/eventos');

    // Preparar carrinho
    await uiAdapter.adicionarItemAoCarrinho('CAMISETA-PRETA-M', 1);
    await uiAdapter.selecionarFrete('Economico');

    eventPublisher.clearEventos(); // Focar apenas nas tentativas de pagamento

    // Múltiplas tentativas com mesmo cartão recusado
    await uiAdapter.pagar('cartao', { cartao: Cartoes.RecusadoPorLimite, parcelas: 1 });
    await uiAdapter.pagar('cartao', { cartao: Cartoes.RecusadoPorLimite, parcelas: 1 });
    
    // Tentativa final aprovada
    await uiAdapter.pagar('cartao', { cartao: Cartoes.Aprovado, parcelas: 1 });

    const eventos = eventPublisher.getEventos();

    // 🏛️ Invariante: Múltiplas tentativas não duplicam cobranças nem reservas indevidas
    const eventosRecusa = eventos.filter(e => e.tipo === 'PagamentoRecusado');
    const eventosAprovacao = eventos.filter(e => e.tipo === 'PagamentoAprovado');
    const eventosPedido = eventos.filter(e => e.tipo === 'PedidoCriado');

    expect(eventosRecusa).toHaveLength(2); // Duas recusas
    expect(eventosAprovacao).toHaveLength(1); // Uma aprovação
    expect(eventosPedido).toHaveLength(1); // Um pedido criado

    // ✅ Pós-condições observáveis
    const numeroPedido = await uiAdapter.verificarPedidoCriado();
    expect(numeroPedido).toBeTruthy(); // Pedido foi criado após aprovação

    console.log('[SUCESSO] Idempotência de pagamento validada');
  });

  test('Cenário crítico: cartão aprovado deve sempre criar pedido', async ({ uiAdapter }) => {
    const { Cartoes } = await import('../../src/common/dados-canonicos');

    // Preparar carrinho simples
    await uiAdapter.adicionarItemAoCarrinho('CAMISETA-PRETA-M', 1);
    await uiAdapter.selecionarFrete('Economico');
    const resumo = await uiAdapter.revisarResumo();

    // Pagamento com cartão garantidamente aprovado
    const resultado = await uiAdapter.pagar('cartao', {
      cartao: Cartoes.Aprovado,
      parcelas: 1
    });

    // Validações críticas
    expect(resultado.aprovado).toBe(true);
    expect(resultado.motivo).toBeUndefined(); // Sem motivo de recusa

    const numeroPedido = await uiAdapter.verificarPedidoCriado();
    expect(numeroPedido).toBeTruthy();

    // ✅ Pós-condição: carrinho limpo após criação do pedido
    const carrinhoAposPedido = await uiAdapter.verificarItemNoCarrinho('CAMISETA-PRETA-M');
    expect(carrinhoAposPedido).toBe(false); // Item não deve estar mais no carrinho

    console.log(`[SUCESSO CRÍTICO] Cartão aprovado → Pedido ${numeroPedido} criado → Carrinho limpo`);
  });
});
