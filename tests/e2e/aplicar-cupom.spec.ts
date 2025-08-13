// Caso 2: AplicarCupom (válido, inválido, expirado) - DSL puro de negócio

import { test, expect } from '../../src/infra/fixtures';

test.describe('AplicarCupom - Casos de Uso', { tag: ['@critica'] }, () => {
  test('Como cliente logado, aplico cupom válido, removo e testo cupons inválidos', { tag: '@critica' }, async ({ useCases }) => {
    // 🎯 História DSL (sem UI-ês)
    // Como cliente logado, aplico o cupom BEMVINDO10; o total reflete 10% de desconto sobre os itens.
    // Removo o cupom.
    // Aplico o cupom PROMOFAKE; mensagem de cupom inválido e total inalterado.
    // Aplico o cupom BLACK2022; mensagem de cupom expirado e total inalterado.

    await useCases.aplicarCupomEValidarTotal(
      'CAMISETA-PRETA-M',  // SKU base para teste
      'BEMVINDO10',        // cupom válido (10%)
      'PROMOFAKE',         // cupom inválido
      'BLACK2022'          // cupom expirado
    );

    // 📊 Validações de eventos esperados
    const { eventPublisher } = await import('../../src/common/eventos');
    const eventos = eventPublisher.getEventos();

    // Evento: CupomAplicado (cupom válido)
    const eventoCupomAplicado = eventos.find(e => 
      e.tipo === 'CupomAplicado' && e.dados.codigo === 'BEMVINDO10'
    );
    expect(eventoCupomAplicado).toBeDefined();
    expect(eventoCupomAplicado?.dados.tipo).toBe('percentual');
    expect(eventoCupomAplicado?.dados.valor).toBe(10);

    // Evento: CupomRemovido
    const eventoCupomRemovido = eventos.find(e => e.tipo === 'CupomRemovido');
    expect(eventoCupomRemovido).toBeDefined();
    expect(eventoCupomRemovido?.dados.codigo).toBe('BEMVINDO10');

    // Eventos: CupomRejeitado (inválido e expirado)
    const eventosCupomRejeitado = eventos.filter(e => e.tipo === 'CupomRejeitado');
    expect(eventosCupomRejeitado).toHaveLength(2);

    const rejeicaoInvalido = eventosCupomRejeitado.find(e => e.dados.codigo === 'PROMOFAKE');
    expect(rejeicaoInvalido?.dados.motivo).toBe('invalido');

    const rejeicaoExpirado = eventosCupomRejeitado.find(e => e.dados.codigo === 'BLACK2022');
    expect(rejeicaoExpirado?.dados.motivo).toBe('expirado');

    console.log('[SUCESSO] Todos os cenários de cupom validados');
  });

  test('Validar invariantes específicas do caso AplicarCupom', async ({ uiAdapter }) => {
    // Preparar carrinho
    await uiAdapter.adicionarItemAoCarrinho('CAMISETA-PRETA-M', 1);
    const resumoSemCupom = await uiAdapter.revisarResumo();

    // Aplicar cupom válido
    await uiAdapter.aplicarCupom('BEMVINDO10');
    const resumoComCupom = await uiAdapter.revisarResumo();

    // 🏛️ Invariantes específicas

    // Invariante: desconto ≤ soma(itens)
    expect(resumoComCupom.desconto).toBeLessThanOrEqual(resumoComCupom.subtotal);

    // Invariante: cupom não cumulativo (simular tentativa)
    await expect(async () => {
      await uiAdapter.aplicarCupom('OUTRO_CUPOM_HIPOTETICO');
    }).rejects.toThrow(); // Deve falhar por não ser cumulativo

    // Invariante: total_pos_cupom = soma(itens) + frete − desconto
    const { Invariantes } = await import('../../src/common/invariantes');
    const totalCalculado = resumoComCupom.subtotal + resumoComCupom.frete - resumoComCupom.desconto;
    expect(Math.abs(resumoComCupom.total - totalCalculado)).toBeLessThan(0.01);

    // Invariante: BEMVINDO10 incide apenas sobre itens (frete fora do cálculo)
    const descontoEsperado = resumoComCupom.subtotal * 0.10;
    expect(Math.abs(resumoComCupom.desconto - descontoEsperado)).toBeLessThan(0.01);

    console.log('[VALIDAÇÃO] Invariantes de cupom confirmadas');
  });

  test('Cenário isolado: cupom válido com desconto exato', async ({ uiAdapter }) => {
    // Item de preço conhecido
    await uiAdapter.adicionarItemAoCarrinho('CAMISETA-PRETA-M', 2); // 2x R$ 49,90 = R$ 99,80

    const resumoAntes = await uiAdapter.revisarResumo();
    expect(resumoAntes.subtotal).toBe(99.80);

    await uiAdapter.aplicarCupom('BEMVINDO10');
    const resumoDepois = await uiAdapter.revisarResumo();

    // Validar desconto preciso
    const descontoEsperado = 99.80 * 0.10; // R$ 9,98
    expect(resumoDepois.desconto).toBe(descontoEsperado);
    expect(resumoDepois.total).toBe(resumoAntes.total - descontoEsperado);

    // ✅ Pós-condição observável: etiqueta de cupom visível na UI
    const cupomVisivel = await uiAdapter.verificarCupomAplicado('BEMVINDO10');
    expect(cupomVisivel).toBe(true);

    console.log(`[SUCESSO] Desconto de R$ ${descontoEsperado} aplicado corretamente`);
  });
});
