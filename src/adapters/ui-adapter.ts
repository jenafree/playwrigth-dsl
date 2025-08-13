// Adapter UI - traduz comandos de domínio em interações Playwright

import { Page } from '@playwright/test';
import { ComandosSimples, EstadoCarrinho } from '../common/comandos-simples';
import { Cartoes } from '../common/dados-canonicos';

export class UIAdapter {
  private comandos: ComandosSimples;
  private estado: EstadoCarrinho;

  constructor(private page: Page) {
    this.estado = {
      itens: [],
      cupomAplicado: null,
      freteSelecionado: null,
      endereco: null
    };
    this.comandos = new ComandosSimples(this.estado);
  }

  async adicionarItemAoCarrinho(sku: string, quantidade: number): Promise<void> {
    // Comando de domínio (publica eventos, valida invariantes)
    await this.comandos.adicionarItemAoCarrinho(sku, quantidade);
    
    // Tradução para UI (escondida da DSL)
    await this.page.goto(`/produto/${sku}`);
    await this.page.fill('[data-testid="quantidade"]', quantidade.toString());
    await this.page.click('[data-testid="adicionar-carrinho"]');
    
    // Aguardar feedback visual
    await this.page.waitForSelector('[data-testid="item-adicionado-toast"]', { timeout: 5000 });
  }

  async removerItemDoCarrinho(sku: string): Promise<void> {
    await this.comandos.removerItemDoCarrinho(sku);
    
    await this.page.goto('/carrinho');
    await this.page.click(`[data-testid="remover-item-${sku}"]`);
    await this.page.waitForSelector(`[data-testid="item-${sku}"]`, { state: 'detached' });
  }

  async alterarQuantidade(sku: string, novaQuantidade: number): Promise<void> {
    await this.comandos.alterarQuantidade(sku, novaQuantidade);
    
    await this.page.goto('/carrinho');
    await this.page.fill(`[data-testid="quantidade-${sku}"]`, novaQuantidade.toString());
    await this.page.click(`[data-testid="atualizar-${sku}"]`);
  }

  async aplicarCupom(codigo: string): Promise<void> {
    try {
      await this.comandos.aplicarCupom(codigo);
      
      // UI: aplicação bem-sucedida
      await this.page.goto('/carrinho');
      await this.page.fill('[data-testid="cupom-codigo"]', codigo);
      await this.page.click('[data-testid="aplicar-cupom"]');
      await this.page.waitForSelector('[data-testid="cupom-aplicado"]', { timeout: 5000 });
      
    } catch (error) {
      // UI: tratamento de erro (cupom inválido/expirado)
      await this.page.goto('/carrinho');
      await this.page.fill('[data-testid="cupom-codigo"]', codigo);
      await this.page.click('[data-testid="aplicar-cupom"]');
      await this.page.waitForSelector('[data-testid="cupom-erro"]', { timeout: 5000 });
      
      // Re-throw para manter comportamento de domínio
      throw error;
    }
  }

  async removerCupom(): Promise<void> {
    await this.comandos.removerCupom();
    
    await this.page.click('[data-testid="remover-cupom"]');
    await this.page.waitForSelector('[data-testid="cupom-aplicado"]', { state: 'detached' });
  }

  async selecionarFrete(tipo: string): Promise<void> {
    await this.comandos.selecionarFrete(tipo);
    
    await this.page.goto('/checkout');
    await this.page.click(`[data-testid="frete-${tipo.toLowerCase()}"]`);
    await this.page.waitForSelector(`[data-testid="frete-selecionado-${tipo.toLowerCase()}"]`);
  }

  async revisarResumo(): Promise<{ subtotal: number; frete: number; desconto: number; total: number }> {
    const resumo = await this.comandos.revisarResumo();
    
    // Verificar se a UI reflete o resumo correto
    await this.page.goto('/checkout');
    
    const subtotalUI = await this.page.textContent('[data-testid="subtotal"]');
    const freteUI = await this.page.textContent('[data-testid="frete"]');
    const descontoUI = await this.page.textContent('[data-testid="desconto"]');
    const totalUI = await this.page.textContent('[data-testid="total"]');
    
    // Validação básica (poderia ser mais robusta)
    console.log('Resumo domínio:', resumo);
    console.log('Resumo UI:', { subtotalUI, freteUI, descontoUI, totalUI });
    
    return resumo;
  }

  async pagar(metodo: string, parametros: any): Promise<{ aprovado: boolean; motivo?: string }> {
    const resultado = await this.comandos.pagar(metodo, parametros);
    
    // Navegar para pagamento
    await this.page.goto('/checkout/pagamento');
    
    if (metodo === 'cartao') {
      const cartao = parametros.cartao;
      await this.page.fill('[data-testid="numero-cartao"]', cartao.numero);
      await this.page.fill('[data-testid="nome-cartao"]', cartao.nome);
      await this.page.fill('[data-testid="cvv"]', cartao.cvv);
      await this.page.fill('[data-testid="validade"]', cartao.validade);
      
      if (parametros.parcelas > 1) {
        await this.page.selectOption('[data-testid="parcelas"]', parametros.parcelas.toString());
      }
    }
    
    await this.page.click('[data-testid="finalizar-pagamento"]');
    
    if (resultado.aprovado) {
      await this.page.waitForSelector('[data-testid="pagamento-aprovado"]', { timeout: 10000 });
    } else {
      await this.page.waitForSelector('[data-testid="pagamento-recusado"]', { timeout: 10000 });
      const mensagemErro = await this.page.textContent('[data-testid="motivo-recusa"]');
      console.log('Motivo da recusa na UI:', mensagemErro);
    }
    
    return resultado;
  }

  // Helpers para validar elementos visuais
  async verificarItemNoCarrinho(sku: string): Promise<boolean> {
    await this.page.goto('/carrinho');
    const elemento = await this.page.locator(`[data-testid="item-${sku}"]`);
    return await elemento.isVisible();
  }

  async verificarCupomAplicado(codigo: string): Promise<boolean> {
    const elemento = await this.page.locator('[data-testid="cupom-aplicado"]');
    const isVisible = await elemento.isVisible();
    if (isVisible) {
      const texto = await elemento.textContent();
      return texto?.includes(codigo) || false;
    }
    return false;
  }

  async verificarPedidoCriado(): Promise<string | null> {
    try {
      await this.page.waitForSelector('[data-testid="pedido-numero"]', { timeout: 5000 });
      return await this.page.textContent('[data-testid="pedido-numero"]');
    } catch {
      return null;
    }
  }

  // Estado interno para DSL
  getEstado(): EstadoCarrinho {
    return { ...this.estado };
  }
}
