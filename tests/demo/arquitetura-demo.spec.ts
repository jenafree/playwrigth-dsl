// Demonstração da arquitetura DSL - validação offline dos comandos

import { test, expect } from '@playwright/test';
import { ComandosSimples, EstadoCarrinho } from '../../src/common/comandos-simples';
import { ECommerceUseCases } from '../../src/flows/use-cases';
import { UIAdapter } from '../../src/adapters/ui-adapter';
import { APIAdapter } from '../../src/adapters/api-adapter';
import { eventPublisher } from '../../src/common/eventos';
import { observabilidade } from '../../src/infra/observabilidade';

test.describe('Demo - Arquitetura DSL Funcionando', () => {
  test('Comandos simples operam corretamente (offline)', async () => {
    // Criar estado limpo
    const estado: EstadoCarrinho = {
      itens: [],
      cupomAplicado: null,
      freteSelecionado: null,
      endereco: null
    };

    const comandos = new ComandosSimples(estado);
    eventPublisher.clearEventos();
    observabilidade.limpar();

    // 1. Adicionar item (comando simples)
    observabilidade.logTeste('AdicionarItem', 'INICIO', 'SKU CAMISETA-PRETA-M');
    await comandos.adicionarItemAoCarrinho('CAMISETA-PRETA-M', 2);
    
    // Validar estado
    expect(estado.itens).toHaveLength(1);
    expect(estado.itens[0].sku).toBe('CAMISETA-PRETA-M');
    expect(estado.itens[0].quantidade).toBe(2);
    
    // Validar evento
    const eventos = eventPublisher.getEventos();
    const eventoItem = eventos.find(e => e.tipo === 'ItemAdicionado');
    expect(eventoItem).toBeDefined();
    expect(eventoItem?.dados.sku).toBe('CAMISETA-PRETA-M');
    
    observabilidade.logTeste('AdicionarItem', 'SUCESSO', 'Item adicionado com evento');

    // 2. Aplicar cupom (comando simples)
    observabilidade.logTeste('AplicarCupom', 'INICIO', 'BEMVINDO10');
    await comandos.aplicarCupom('BEMVINDO10');
    
    expect(estado.cupomAplicado).toBe('BEMVINDO10');
    
    const eventoCupom = eventPublisher.getEventos().find(e => e.tipo === 'CupomAplicado');
    expect(eventoCupom?.dados.codigo).toBe('BEMVINDO10');
    expect(eventoCupom?.dados.valor).toBe(10);
    
    observabilidade.logTeste('AplicarCupom', 'SUCESSO', '10% de desconto aplicado');

    // 3. Selecionar frete (comando simples)
    await comandos.selecionarFrete('Economico');
    expect(estado.freteSelecionado?.tipo).toBe('Economico');
    expect(estado.freteSelecionado?.custo).toBe(5.90);

    // 4. Revisar resumo (comando simples com validação de invariantes)
    const resumo = await comandos.revisarResumo();
    
    // Validar invariantes centrais
    const subtotal = 49.90 * 2; // 99.80
    const frete = 5.90;
    const desconto = subtotal * 0.10; // 9.98
    const totalEsperado = subtotal + frete - desconto; // 95.72
    
    expect(Math.abs(resumo.total - totalEsperado)).toBeLessThan(0.01);
    expect(resumo.subtotal).toBe(subtotal);
    expect(resumo.frete).toBe(frete);
    expect(resumo.desconto).toBe(desconto);

    console.log('[DEMO] ✅ Comandos simples funcionando corretamente');
    console.log('[DEMO] ✅ Eventos sendo publicados');
    console.log('[DEMO] ✅ Invariantes validadas');
    console.log(`[DEMO] ✅ Total calculado: R$ ${resumo.total.toFixed(2)}`);
  });

  test('Invariantes são respeitadas em cenários de erro', async () => {
    const estado: EstadoCarrinho = {
      itens: [],
      cupomAplicado: null,
      freteSelecionado: null,
      endereco: null
    };

    const comandos = new ComandosSimples(estado);
    eventPublisher.clearEventos();

    // 1. Tentar adicionar item com estoque insuficiente
    await expect(async () => {
      await comandos.adicionarItemAoCarrinho('CAMISETA-PRETA-M', 1000); // > estoque (100)
    }).rejects.toThrow('Estoque insuficiente');

    expect(estado.itens).toHaveLength(0); // Estado não alterado

    // 2. Tentar aplicar cupom inválido
    await expect(async () => {
      await comandos.aplicarCupom('PROMOFAKE');
    }).rejects.toThrow('inválido');

    expect(estado.cupomAplicado).toBeNull(); // Estado não alterado

    // 3. Verificar eventos de rejeição
    const eventos = eventPublisher.getEventos();
    const eventoCupomRejeitado = eventos.find(e => e.tipo === 'CupomRejeitado');
    expect(eventoCupomRejeitado?.dados.codigo).toBe('PROMOFAKE');
    expect(eventoCupomRejeitado?.dados.motivo).toBe('invalido');

    console.log('[DEMO] ✅ Invariantes respeitadas em cenários de erro');
    console.log('[DEMO] ✅ Estados protegidos contra alterações inválidas');
  });

  test('Observabilidade captura métricas e logs', async () => {
    observabilidade.limpar();

    // Simular métricas de uso
    observabilidade.registrarFinalizacaoCompra(1500, 105.70, 'CAMISETA-PRETA-M');
    observabilidade.registrarCupomAplicado('BEMVINDO10', 9.98);
    observabilidade.registrarPagamentoRecusado('limite');

    // Logs estruturados
    observabilidade.logDominio('ItemAdicionado', { sku: 'CAMISETA-PRETA-M', qty: 2 });
    observabilidade.logUI('Clique', 'botao-finalizar');
    observabilidade.logAPI('POST', '/api/pedidos', 201);

    // Validar coleta
    const metricas = observabilidade.getMetricas();
    expect(metricas.length).toBeGreaterThan(0);

    const logs = observabilidade.getLogs();
    expect(logs.length).toBeGreaterThan(0);

    // Relatórios
    const relatorioEventos = observabilidade.gerarRelatorioEventos();
    expect(relatorioEventos.total).toBeGreaterThan(0);
    expect(relatorioEventos.porCategoria['DOMINIO']).toBeDefined();

    const relatorioMetricas = observabilidade.gerarRelatorioMetricas();
    expect(relatorioMetricas.total).toBeGreaterThan(0);

    console.log('[DEMO] ✅ Observabilidade funcionando');
    console.log('[DEMO] ✅ Métricas coletadas:', metricas.length);
    console.log('[DEMO] ✅ Logs estruturados:', logs.length);
  });

  test('Dados canônicos estão disponíveis e válidos', async () => {
    const { SKUs, Cupons, Enderecos, Cartoes, Fretes } = await import('../../src/common/dados-canonicos');

    // Validar SKUs canônicos
    expect(SKUs['CAMISETA-PRETA-M']).toBeDefined();
    expect(SKUs['CAMISETA-PRETA-M'].preco).toBe(49.90);
    expect(SKUs['CAMISETA-PRETA-M'].estoque).toBe(100);

    expect(SKUs['TENIS-URBANO-42']).toBeDefined();
    expect(SKUs['MOCHILA-TRAVEL']).toBeDefined();

    // Validar cupons canônicos
    expect(Cupons['BEMVINDO10'].valido).toBe(true);
    expect(Cupons['BEMVINDO10'].valor).toBe(10);
    expect(Cupons['PROMOFAKE'].valido).toBe(false);
    expect(Cupons['BLACK2022'].expirado).toBe(true);

    // Validar cartões canônicos
    expect(Cartoes.Aprovado.resultado).toBe('aprovado');
    expect(Cartoes.RecusadoPorLimite.motivo).toBe('limite');
    expect(Cartoes.RecusadoAntifraude.motivo).toBe('antifraude');

    // Validar endereços canônicos
    expect(Enderecos.Capital.tipo).toBe('Capital');
    expect(Enderecos.Interior.tipo).toBe('Interior');

    // Validar fretes canônicos
    expect(Fretes.Economico.custo).toBe(5.90);
    expect(Fretes.Rapido.custo).toBe(12.90);

    console.log('[DEMO] ✅ Catálogo de dados canônicos válido');
    console.log('[DEMO] ✅ SKUs:', Object.keys(SKUs).length);
    console.log('[DEMO] ✅ Cupons:', Object.keys(Cupons).length);
    console.log('[DEMO] ✅ Cartões:', Object.keys(Cartoes).length);
  });
});
