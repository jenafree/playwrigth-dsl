// Comandos simples (atômicos) de domínio

import { SKU, Item, Carrinho, Cupom, Frete, EventoDominio } from './types';
import { SKUs, Cupons, Fretes } from './dados-canonicos';
import { Invariantes } from './invariantes';
import { 
  eventPublisher, 
  criarEventoItemAdicionado, 
  criarEventoCupomAplicado,
  criarEventoCupomRejeitado
} from './eventos';

export interface EstadoCarrinho {
  itens: Item[];
  cupomAplicado: string | null;
  freteSelecionado: Frete | null;
  endereco: string | null;
}

export class ComandosSimples {
  constructor(private estado: EstadoCarrinho) {}

  async adicionarItemAoCarrinho(sku: string, quantidade: number): Promise<void> {
    const skuInfo = SKUs[sku];
    if (!skuInfo) {
      throw new Error(`SKU ${sku} não encontrado`);
    }

    if (!Invariantes.validarEstoque(sku, quantidade, skuInfo.estoque)) {
      throw new Error(`Estoque insuficiente para ${sku}. Disponível: ${skuInfo.estoque}, solicitado: ${quantidade}`);
    }

    const itemExistente = this.estado.itens.find(item => item.sku === sku);
    
    if (itemExistente) {
      itemExistente.quantidade += quantidade;
    } else {
      this.estado.itens.push({
        sku,
        quantidade,
        precoUnitario: skuInfo.preco
      });
    }

    const evento = criarEventoItemAdicionado(sku, quantidade);
    eventPublisher.publish(evento);
  }

  async removerItemDoCarrinho(sku: string): Promise<void> {
    const index = this.estado.itens.findIndex(item => item.sku === sku);
    if (index === -1) {
      throw new Error(`Item ${sku} não encontrado no carrinho`);
    }

    this.estado.itens.splice(index, 1);

    eventPublisher.publish({
      tipo: 'ItemRemovido',
      timestamp: new Date(),
      dados: { sku }
    });
  }

  async alterarQuantidade(sku: string, novaQuantidade: number): Promise<void> {
    if (novaQuantidade === 0) {
      await this.removerItemDoCarrinho(sku);
      return;
    }

    const skuInfo = SKUs[sku];
    if (!Invariantes.validarEstoque(sku, novaQuantidade, skuInfo.estoque)) {
      eventPublisher.publish({
        tipo: 'AlteracaoRejeitada',
        timestamp: new Date(),
        dados: { sku, motivo: 'estoque_insuficiente' }
      });
      throw new Error(`Estoque insuficiente para alterar ${sku} para ${novaQuantidade}`);
    }

    const item = this.estado.itens.find(item => item.sku === sku);
    if (!item) {
      throw new Error(`Item ${sku} não encontrado no carrinho`);
    }

    const quantidadeAnterior = item.quantidade;
    item.quantidade = novaQuantidade;

    eventPublisher.publish({
      tipo: 'QuantidadeAlterada',
      timestamp: new Date(),
      dados: { sku, de: quantidadeAnterior, para: novaQuantidade }
    });
  }

  async aplicarCupom(codigo: string): Promise<void> {
    const cupom = Cupons[codigo];
    
    if (!cupom || !cupom.valido) {
      const evento = criarEventoCupomRejeitado(codigo, cupom?.expirado ? 'expirado' : 'invalido');
      eventPublisher.publish(evento);
      throw new Error(`Cupom ${codigo} é ${cupom?.expirado ? 'expirado' : 'inválido'}`);
    }

    if (!Invariantes.validarCupomNaoCumulativo(this.estado.cupomAplicado, codigo)) {
      const evento = criarEventoCupomRejeitado(codigo, 'nao_cumulativo');
      eventPublisher.publish(evento);
      throw new Error('Cupom não cumulativo. Remova o cupom atual primeiro.');
    }

    this.estado.cupomAplicado = codigo;
    const evento = criarEventoCupomAplicado(codigo, cupom.tipo, cupom.valor);
    eventPublisher.publish(evento);
  }

  async removerCupom(): Promise<void> {
    if (!this.estado.cupomAplicado) {
      throw new Error('Nenhum cupom aplicado para remover');
    }

    const codigoRemovido = this.estado.cupomAplicado;
    this.estado.cupomAplicado = null;

    eventPublisher.publish({
      tipo: 'CupomRemovido',
      timestamp: new Date(),
      dados: { codigo: codigoRemovido }
    });
  }

  async selecionarFrete(tipo: string): Promise<void> {
    const frete = Fretes[tipo as keyof typeof Fretes];
    if (!frete) {
      eventPublisher.publish({
        tipo: 'FreteIndisponivel',
        timestamp: new Date(),
        dados: { tipo }
      });
      throw new Error(`Tipo de frete ${tipo} não disponível`);
    }

    if (!Invariantes.validarFretePositivo(frete)) {
      throw new Error(`Frete inválido: ${tipo}`);
    }

    this.estado.freteSelecionado = frete;

    eventPublisher.publish({
      tipo: 'FreteSelecionado',
      timestamp: new Date(),
      dados: { tipo: frete.tipo, prazo: frete.prazo, custo: frete.custo }
    });
  }

  async revisarResumo(): Promise<{ subtotal: number; frete: number; desconto: number; total: number }> {
    const subtotal = Invariantes.calcularSubtotal(this.estado.itens);
    const frete = this.estado.freteSelecionado?.custo || 0;
    
    let desconto = 0;
    if (this.estado.cupomAplicado) {
      const cupom = Cupons[this.estado.cupomAplicado];
      if (cupom && cupom.tipo === 'percentual') {
        desconto = Invariantes.calcularDesconto(subtotal, cupom.valor);
      }
    }

    const total = subtotal + frete - desconto;

    if (!Invariantes.validarTotalPositivo(total)) {
      throw new Error('Total do pedido não pode ser negativo');
    }

    eventPublisher.publish({
      tipo: 'ResumoRevisado',
      timestamp: new Date(),
      dados: { subtotal, frete, desconto, total }
    });

    return { subtotal, frete, desconto, total };
  }

  async pagar(metodo: string, parametros: any): Promise<{ aprovado: boolean; motivo?: string }> {
    // Simulação baseada nos cartões canônicos
    const cartao = parametros.cartao;
    
    if (cartao?.numero === '4000000000000002') {
      eventPublisher.publish({
        tipo: 'PagamentoRecusado',
        timestamp: new Date(),
        dados: { motivo: 'limite' }
      });
      return { aprovado: false, motivo: 'limite' };
    }

    if (cartao?.numero === '4000000000000259') {
      eventPublisher.publish({
        tipo: 'PagamentoRecusado',
        timestamp: new Date(),
        dados: { motivo: 'antifraude' }
      });
      return { aprovado: false, motivo: 'antifraude' };
    }

    // Pagamento aprovado
    eventPublisher.publish({
      tipo: 'PagamentoAprovado',
      timestamp: new Date(),
      dados: { metodo, parcelas: parametros.parcelas || 1 }
    });

    return { aprovado: true };
  }

  async atualizarEndereco(endereco: any): Promise<void> {
    // Validar dados do endereço
    if (!endereco.cep || !endereco.cidade || !endereco.uf) {
      eventPublisher.publish({
        tipo: 'EnderecoRejeitado',
        timestamp: new Date(),
        dados: { motivo: 'dados_incompletos' }
      });
      throw new Error('Dados do endereço incompletos');
    }

    // Atualizar endereço no estado
    this.estado.endereco = endereco.tipo || 'Personalizado';

    // Se há frete selecionado, pode precisar recalcular
    if (this.estado.freteSelecionado) {
      console.log('[COMANDO] Endereço alterado - frete pode ter mudado');
    }

    eventPublisher.publish({
      tipo: 'EnderecoAtualizado',
      timestamp: new Date(),
      dados: { 
        cep: endereco.cep, 
        cidade: endereco.cidade, 
        uf: endereco.uf 
      }
    });
  }
}
