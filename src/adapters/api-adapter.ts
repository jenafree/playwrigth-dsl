// Adapter API - seeds, limpeza e controle de estado via API

import { SKUs, Cupons, Enderecos } from '../common/dados-canonicos';

export class APIAdapter {
  private baseURL: string;

  constructor(baseURL: string = 'http://localhost:3000/api') {
    this.baseURL = baseURL;
  }

  // Seeds - preparar dados para teste
  async seedSKUs(): Promise<void> {
    for (const [codigo, sku] of Object.entries(SKUs)) {
      await this.criarOuAtualizarProduto(sku);
    }
    console.log('[API SEED] SKUs criados:', Object.keys(SKUs));
  }

  async seedCupons(): Promise<void> {
    for (const [codigo, cupom] of Object.entries(Cupons)) {
      await this.criarOuAtualizarCupom(cupom);
    }
    console.log('[API SEED] Cupons criados:', Object.keys(Cupons));
  }

  async seedEnderecoCliente(clienteId: string, tipoEndereco: 'Capital' | 'Interior'): Promise<void> {
    const endereco = Enderecos[tipoEndereco];
    await this.definirEnderecoCliente(clienteId, endereco);
    console.log(`[API SEED] Endereço ${tipoEndereco} definido para cliente ${clienteId}`);
  }

  // Limpeza - executada antes/depois de cada teste
  async limparCarrinho(clienteId: string): Promise<void> {
    try {
      await this.makeRequest('DELETE', `/carrinho/${clienteId}`);
      console.log(`[API CLEANUP] Carrinho limpo para cliente ${clienteId}`);
    } catch (error) {
      console.warn('Erro ao limpar carrinho (pode não existir):', error);
    }
  }

  async limparPedidos(clienteId: string): Promise<void> {
    try {
      await this.makeRequest('DELETE', `/pedidos/${clienteId}`);
      console.log(`[API CLEANUP] Pedidos limpos para cliente ${clienteId}`);
    } catch (error) {
      console.warn('Erro ao limpar pedidos (pode não existir):', error);
    }
  }

  async resetarEstoque(): Promise<void> {
    for (const [codigo, sku] of Object.entries(SKUs)) {
      await this.atualizarEstoque(codigo, sku.estoque);
    }
    console.log('[API CLEANUP] Estoque resetado para valores canônicos');
  }

  // Operações específicas
  async criarCliente(perfil: 'cliente' | 'admin' = 'cliente'): Promise<string> {
    const response = await this.makeRequest('POST', '/clientes', {
      nome: 'Cliente Teste',
      email: `teste+${Date.now()}@example.com`,
      perfil
    });
    const clienteId = response.id;
    console.log(`[API] Cliente ${perfil} criado: ${clienteId}`);
    return clienteId;
  }

  async autenticarCliente(clienteId: string): Promise<string> {
    const response = await this.makeRequest('POST', '/auth/login', {
      clienteId
    });
    const token = response.token;
    console.log(`[API] Cliente autenticado: ${clienteId}`);
    return token;
  }

  // Consultas de estado (para validações)
  async obterCarrinho(clienteId: string): Promise<any> {
    return await this.makeRequest('GET', `/carrinho/${clienteId}`);
  }

  async obterPedidos(clienteId: string): Promise<any[]> {
    return await this.makeRequest('GET', `/pedidos/${clienteId}`);
  }

  async obterEstoque(sku: string): Promise<number> {
    const response = await this.makeRequest('GET', `/produtos/${sku}/estoque`);
    return response.quantidade;
  }

  // Controle de relógio (para testes time-sensitive)
  async definirDataAtual(data: Date): Promise<void> {
    await this.makeRequest('POST', '/sistema/clock', {
      timestamp: data.getTime()
    });
    console.log(`[API] Data do sistema definida: ${data.toISOString()}`);
  }

  async resetarRelogio(): Promise<void> {
    await this.makeRequest('DELETE', '/sistema/clock');
    console.log('[API] Relógio do sistema resetado');
  }

  // Helpers privados
  private async criarOuAtualizarProduto(sku: any): Promise<void> {
    await this.makeRequest('PUT', `/produtos/${sku.codigo}`, sku);
  }

  private async criarOuAtualizarCupom(cupom: any): Promise<void> {
    await this.makeRequest('PUT', `/cupons/${cupom.codigo}`, cupom);
  }

  private async definirEnderecoCliente(clienteId: string, endereco: any): Promise<void> {
    await this.makeRequest('PUT', `/clientes/${clienteId}/endereco`, endereco);
  }

  private async atualizarEstoque(sku: string, quantidade: number): Promise<void> {
    await this.makeRequest('PUT', `/produtos/${sku}/estoque`, { quantidade });
  }

  private async makeRequest(method: string, endpoint: string, body?: any): Promise<any> {
    const url = `${this.baseURL}${endpoint}`;
    
    // Simulação de API para desenvolvimento/testes
    // Em ambiente real, faria requisições HTTP reais
    console.log(`[API MOCK] ${method} ${url}`, body ? JSON.stringify(body, null, 2) : '');
    
    // Retorna resposta mock baseada no endpoint
    if (endpoint.includes('/clientes') && method === 'POST') {
      return { id: `cliente_${Date.now()}` };
    }
    
    if (endpoint.includes('/auth/login')) {
      return { token: `token_${Date.now()}` };
    }
    
    if (endpoint.includes('/carrinho/') && method === 'GET') {
      return { itens: [], total: 0 };
    }
    
    if (endpoint.includes('/pedidos/') && method === 'GET') {
      return [];
    }
    
    if (endpoint.includes('/estoque')) {
      const sku = endpoint.split('/')[2];
      return { quantidade: SKUs[sku]?.estoque || 0 };
    }
    
    return { success: true };
  }
}
