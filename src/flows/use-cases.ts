// Comandos compostos (Use Cases) - orquestram comandos simples

import { Page } from '@playwright/test';
import { UIAdapter } from '../adapters/ui-adapter';
import { APIAdapter } from '../adapters/api-adapter';
import { Cartoes } from '../common/dados-canonicos';
import { eventPublisher, criarEventoPedidoCriado } from '../common/eventos';
import { Invariantes } from '../common/invariantes';

export class ECommerceUseCases {
  constructor(
    private uiAdapter: UIAdapter,
    private apiAdapter: APIAdapter
  ) {}

  /**
   * Caso composto: FinalizarCompra
   * Orquestra: adicionar item → selecionar frete → revisar → pagar → confirmar pedido
   */
  async finalizarCompra(
    sku: string, 
    quantidade: number, 
    tipoFrete: string, 
    metodoPagamento: 'cartao' = 'cartao',
    parcelas: number = 1
  ): Promise<string> {
    console.log(`[USE CASE] Iniciando FinalizarCompra: ${sku} (${quantidade}x)`);

    // 1. Adicionar item ao carrinho
    await this.uiAdapter.adicionarItemAoCarrinho(sku, quantidade);

    // 2. Selecionar frete
    await this.uiAdapter.selecionarFrete(tipoFrete);

    // 3. Revisar resumo (valida invariantes)
    const resumo = await this.uiAdapter.revisarResumo();
    console.log('[USE CASE] Resumo validado:', resumo);

    // 4. Pagar com cartão aprovado
    const cartaoAprovado = Cartoes.Aprovado;
    const resultadoPagamento = await this.uiAdapter.pagar(metodoPagamento, {
      cartao: cartaoAprovado,
      parcelas
    });

    if (!resultadoPagamento.aprovado) {
      throw new Error(`Pagamento recusado: ${resultadoPagamento.motivo}`);
    }

    // 5. Confirmar criação do pedido
    const numeroPedido = await this.uiAdapter.verificarPedidoCriado();
    if (!numeroPedido) {
      throw new Error('Pedido não foi criado após pagamento aprovado');
    }

    // Publicar evento de alto nível
    const eventoPedidoCriado = criarEventoPedidoCriado(numeroPedido, resumo.total);
    eventPublisher.publish(eventoPedidoCriado);

    console.log(`[USE CASE] FinalizarCompra concluída. Pedido: ${numeroPedido}`);
    return numeroPedido;
  }

  /**
   * Caso composto: AplicarCupomEValidarTotal
   * Testa aplicação, remoção e casos de erro de cupons
   */
  async aplicarCupomEValidarTotal(
    sku: string,
    cupomValido: string,
    cupomInvalido: string,
    cupomExpirado: string
  ): Promise<void> {
    console.log('[USE CASE] Iniciando AplicarCupomEValidarTotal');

    // Preparar carrinho com item
    await this.uiAdapter.adicionarItemAoCarrinho(sku, 1);
    const resumoSemCupom = await this.uiAdapter.revisarResumo();
    console.log(`[USE CASE] Total sem cupom: ${resumoSemCupom.total}`);

    // 1. Aplicar cupom válido
    await this.uiAdapter.aplicarCupom(cupomValido);
    const resumoComCupom = await this.uiAdapter.revisarResumo();
    console.log(`[USE CASE] Total com cupom: ${resumoComCupom.total}`);

    // Validar desconto aplicado
    if (resumoComCupom.total >= resumoSemCupom.total) {
      throw new Error('Cupom válido não reduziu o total');
    }

    // 2. Remover cupom
    await this.uiAdapter.removerCupom();
    const resumoAposRemocao = await this.uiAdapter.revisarResumo();
    
    if (Math.abs(resumoAposRemocao.total - resumoSemCupom.total) > 0.01) {
      throw new Error('Total não voltou ao valor original após remoção do cupom');
    }

    // 3. Testar cupom inválido
    try {
      await this.uiAdapter.aplicarCupom(cupomInvalido);
      throw new Error('Cupom inválido foi aceito incorretamente');
    } catch (error) {
      console.log(`[USE CASE] Cupom inválido rejeitado corretamente: ${error instanceof Error ? error.message : error}`);
    }

    // 4. Testar cupom expirado
    try {
      await this.uiAdapter.aplicarCupom(cupomExpirado);
      throw new Error('Cupom expirado foi aceito incorretamente');
    } catch (error) {
      console.log(`[USE CASE] Cupom expirado rejeitado corretamente: ${error instanceof Error ? error.message : error}`);
    }

    console.log('[USE CASE] AplicarCupomEValidarTotal concluído com sucesso');
  }

  /**
   * Caso composto: TentarPagamentosAteAprovar
   * Testa cenários de pagamento: recusas por limite/antifraude → aprovação final
   */
  async tentarPagamentosAteAprovar(sku: string): Promise<string> {
    console.log('[USE CASE] Iniciando TentarPagamentosAteAprovar');

    // Preparar carrinho e frete
    await this.uiAdapter.adicionarItemAoCarrinho(sku, 1);
    await this.uiAdapter.selecionarFrete('Economico');
    const resumo = await this.uiAdapter.revisarResumo();

    // 1. Tentar pagamento com cartão recusado por limite
    console.log('[USE CASE] Tentativa 1: cartão com limite insuficiente');
    const resultadoLimite = await this.uiAdapter.pagar('cartao', {
      cartao: Cartoes.RecusadoPorLimite,
      parcelas: 1
    });

    if (resultadoLimite.aprovado) {
      throw new Error('Cartão sem limite foi aprovado incorretamente');
    }

    // Validar que carrinho permaneceu íntegro
    const resumoAposRecusa1 = await this.uiAdapter.revisarResumo();
    if (Math.abs(resumoAposRecusa1.total - resumo.total) > 0.01) {
      throw new Error('Carrinho foi alterado após recusa de pagamento');
    }

    // 2. Tentar pagamento com cartão bloqueado por antifraude
    console.log('[USE CASE] Tentativa 2: cartão bloqueado por antifraude');
    const resultadoAntifraude = await this.uiAdapter.pagar('cartao', {
      cartao: Cartoes.RecusadoAntifraude,
      parcelas: 1
    });

    if (resultadoAntifraude.aprovado) {
      throw new Error('Cartão bloqueado foi aprovado incorretamente');
    }

    // 3. Pagamento final aprovado
    console.log('[USE CASE] Tentativa 3: cartão válido');
    const resultadoAprovado = await this.uiAdapter.pagar('cartao', {
      cartao: Cartoes.Aprovado,
      parcelas: 1
    });

    if (!resultadoAprovado.aprovado) {
      throw new Error('Cartão válido foi recusado');
    }

    // Confirmar pedido criado
    const numeroPedido = await this.uiAdapter.verificarPedidoCriado();
    if (!numeroPedido) {
      throw new Error('Pedido não foi criado após aprovação');
    }

    // Publicar evento
    eventPublisher.publish(criarEventoPedidoCriado(numeroPedido, resumo.total));

    console.log(`[USE CASE] TentarPagamentosAteAprovar concluído. Pedido: ${numeroPedido}`);
    return numeroPedido;
  }

  /**
   * Caso auxiliar: preparar contexto padrão para testes
   */
  async prepararContextoCliente(tipoEndereco: 'Capital' | 'Interior' = 'Capital'): Promise<void> {
    console.log('[USE CASE] Preparando contexto do cliente');
    
    // Limpar estado anterior
    await this.apiAdapter.limparCarrinho('cliente_teste');
    await this.apiAdapter.limparPedidos('cliente_teste');
    
    // Definir endereço
    await this.apiAdapter.seedEnderecoCliente('cliente_teste', tipoEndereco);
    
    // Garantir produtos disponíveis
    await this.apiAdapter.seedSKUs();
    await this.apiAdapter.seedCupons();
    
    console.log(`[USE CASE] Contexto preparado com endereço: ${tipoEndereco}`);
  }

  /**
   * Validações pós-teste
   */
  async validarInvariantes(): Promise<void> {
    const estado = this.uiAdapter.getEstado();
    
    // Validar invariantes do carrinho
    if (estado.itens.length > 0) {
      const subtotal = Invariantes.calcularSubtotal(estado.itens);
      console.log(`[VALIDAÇÃO] Subtotal calculado: ${subtotal}`);
      
      if (estado.freteSelecionado) {
        const totalEsperado = subtotal + estado.freteSelecionado.custo;
        console.log(`[VALIDAÇÃO] Total esperado: ${totalEsperado}`);
      }
    }
    
    // Validar eventos publicados
    const eventos = eventPublisher.getEventos();
    console.log(`[VALIDAÇÃO] Eventos publicados: ${eventos.map(e => e.tipo).join(', ')}`);
  }
}
