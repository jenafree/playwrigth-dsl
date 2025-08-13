// Invariantes de negócio centralizadas

import { Carrinho, Item, Frete } from './types';

export class Invariantes {
  static validarTotal(carrinho: Carrinho, frete: Frete, desconto: number = 0): boolean {
    const somaItens = carrinho.itens.reduce((soma, item) => soma + (item.precoUnitario * item.quantidade), 0);
    const totalEsperado = somaItens + frete.custo - desconto;
    return Math.abs(totalEsperado - carrinho.subtotal) < 0.01; // tolerância para float
  }

  static validarEstoque(sku: string, quantidadeDesejada: number, estoqueDisponivel: number): boolean {
    return estoqueDisponivel >= quantidadeDesejada;
  }

  static validarTotalPositivo(total: number): boolean {
    return total >= 0;
  }

  static validarDesconto(desconto: number, somaItens: number): boolean {
    return desconto <= somaItens && desconto >= 0;
  }

  static validarFretePositivo(frete: Frete): boolean {
    return frete.custo >= 0 && frete.prazo > 0;
  }

  static validarCupomNaoCumulativo(cupomAtual: string | null, novoCupom: string): boolean {
    // Se já há cupom aplicado e é diferente do novo, não é cumulativo
    return cupomAtual === null || cupomAtual === novoCupom;
  }

  static calcularSubtotal(itens: Item[]): number {
    return itens.reduce((soma, item) => soma + (item.precoUnitario * item.quantidade), 0);
  }

  static calcularDesconto(subtotal: number, cupomPercentual: number): number {
    return subtotal * (cupomPercentual / 100);
  }
}
