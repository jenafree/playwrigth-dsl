// Validação da Arquitetura DSL - Teste simplificado sem UI

import { test, expect } from '@playwright/test';
import { ComandosSimples, EstadoCarrinho } from '../../src/common/comandos-simples';
import { eventPublisher } from '../../src/common/eventos';
import { observabilidade } from '../../src/infra/observabilidade';

test.describe('Arquitetura DSL - Validação Offline', { tag: ['@smoke', '@demo'] }, () => {
  test('Comandos simples funcionam corretamente sem UI', { tag: '@smoke' }, async () => {
    // 🏗️ SETUP: Criar estado limpo
    const estado: EstadoCarrinho = {
      itens: [],
      cupomAplicado: null,
      freteSelecionado: null,
      endereco: null
    };

    const comandos = new ComandosSimples(estado);
    eventPublisher.clearEventos();
    observabilidade.limpar();

    // 📦 CASO 1: Adicionar item (comando simples)
    await comandos.adicionarItemAoCarrinho('CAMISETA-PRETA-M', 2);
    
    // ✅ Validar estado
    expect(estado.itens).toHaveLength(1);
    expect(estado.itens[0].sku).toBe('CAMISETA-PRETA-M');
    expect(estado.itens[0].quantidade).toBe(2);
    expect(estado.itens[0].precoUnitario).toBe(49.90);
    
    // ✅ Validar evento publicado
    const eventos = eventPublisher.getEventos();
    const eventoItem = eventos.find(e => e.tipo === 'ItemAdicionado');
    expect(eventoItem).toBeDefined();
    expect(eventoItem?.dados.sku).toBe('CAMISETA-PRETA-M');
    expect(eventoItem?.dados.quantidade).toBe(2);

    // 🎫 CASO 2: Aplicar cupom (comando simples)
    await comandos.aplicarCupom('BEMVINDO10');
    
    expect(estado.cupomAplicado).toBe('BEMVINDO10');
    
    const eventoCupom = eventPublisher.getEventos().find(e => e.tipo === 'CupomAplicado');
    expect(eventoCupom?.dados.codigo).toBe('BEMVINDO10');
    expect(eventoCupom?.dados.valor).toBe(10);

    // 🚚 CASO 3: Selecionar frete (comando simples)
    await comandos.selecionarFrete('Economico');
    
    expect(estado.freteSelecionado?.tipo).toBe('Economico');
    expect(estado.freteSelecionado?.custo).toBe(5.90);
    expect(estado.freteSelecionado?.prazo).toBe(7);

    // 📊 CASO 4: Revisar resumo com validação de invariantes
    const resumo = await comandos.revisarResumo();
    
    // 🏛️ Validar INVARIANTES centrais
    const subtotal = 49.90 * 2; // 99.80
    const frete = 5.90;
    const desconto = subtotal * 0.10; // 9.98
    const totalEsperado = subtotal + frete - desconto; // 95.72
    
    expect(Math.abs(resumo.total - totalEsperado)).toBeLessThan(0.01);
    expect(resumo.subtotal).toBe(subtotal);
    expect(resumo.frete).toBe(frete);
    expect(resumo.desconto).toBe(desconto);

    console.log('🎯 [DEMO] Arquitetura DSL validada com sucesso!');
    console.log(`💰 [DEMO] Total calculado: R$ ${resumo.total.toFixed(2)}`);
    console.log(`📊 [DEMO] Eventos publicados: ${eventos.length}`);
  });

  test('Invariantes protegem contra dados inválidos', { tag: '@demo' }, async () => {
    const estado: EstadoCarrinho = {
      itens: [],
      cupomAplicado: null,
      freteSelecionado: null,
      endereco: null
    };

    const comandos = new ComandosSimples(estado);
    eventPublisher.clearEventos();

    // 🚫 TESTE 1: Estoque insuficiente
    await expect(async () => {
      await comandos.adicionarItemAoCarrinho('CAMISETA-PRETA-M', 1000); // > estoque (100)
    }).rejects.toThrow('Estoque insuficiente');

    expect(estado.itens).toHaveLength(0); // Estado protegido

    // 🚫 TESTE 2: Cupom inválido
    await expect(async () => {
      await comandos.aplicarCupom('PROMOFAKE');
    }).rejects.toThrow('inválido');

    expect(estado.cupomAplicado).toBeNull(); // Estado protegido

    // ✅ Validar eventos de rejeição
    const eventos = eventPublisher.getEventos();
    const eventoCupomRejeitado = eventos.find(e => e.tipo === 'CupomRejeitado');
    expect(eventoCupomRejeitado?.dados.codigo).toBe('PROMOFAKE');
    expect(eventoCupomRejeitado?.dados.motivo).toBe('invalido');

    console.log('🛡️ [DEMO] Invariantes protegeram o estado corretamente!');
  });

  test('Dados canônicos estão disponíveis e válidos', { tag: '@demo' }, async () => {
    const { SKUs, Cupons, Enderecos, Cartoes, Fretes } = await import('../../src/common/dados-canonicos');

    // ✅ SKUs canônicos
    expect(SKUs['CAMISETA-PRETA-M']).toBeDefined();
    expect(SKUs['CAMISETA-PRETA-M'].preco).toBe(49.90);
    expect(SKUs['CAMISETA-PRETA-M'].estoque).toBe(100);

    expect(SKUs['TENIS-URBANO-42']).toBeDefined();
    expect(SKUs['MOCHILA-TRAVEL']).toBeDefined();

    // ✅ Cupons canônicos
    expect(Cupons['BEMVINDO10'].valido).toBe(true);
    expect(Cupons['BEMVINDO10'].valor).toBe(10);
    expect(Cupons['PROMOFAKE'].valido).toBe(false);
    expect(Cupons['BLACK2022'].expirado).toBe(true);

    // ✅ Cartões canônicos
    expect(Cartoes.Aprovado.resultado).toBe('aprovado');
    expect(Cartoes.RecusadoPorLimite.motivo).toBe('limite');
    expect(Cartoes.RecusadoAntifraude.motivo).toBe('antifraude');

    // ✅ Endereços canônicos
    expect(Enderecos.Capital.tipo).toBe('Capital');
    expect(Enderecos.Interior.tipo).toBe('Interior');

    // ✅ Fretes canônicos
    expect(Fretes.Economico.custo).toBe(5.90);
    expect(Fretes.Rapido.custo).toBe(12.90);

    console.log('📚 [DEMO] Catálogo de dados canônicos válido!');
    console.log(`📦 [DEMO] SKUs: ${Object.keys(SKUs).length}`);
    console.log(`🎫 [DEMO] Cupons: ${Object.keys(Cupons).length}`);
    console.log(`💳 [DEMO] Cartões: ${Object.keys(Cartoes).length}`);
  });
});
