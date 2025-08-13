// Tipos centrais do domínio E-commerce

export interface SKU {
  codigo: string;
  nome: string;
  preco: number;
  estoque: number;
  categoria?: string;
}

export interface Item {
  sku: string;
  quantidade: number;
  precoUnitario: number;
}

export interface Carrinho {
  itens: Item[];
  subtotal: number;
}

export interface Cupom {
  codigo: string;
  tipo: 'percentual' | 'valor';
  valor: number;
  valido: boolean;
  expirado: boolean;
  cumulativo: boolean;
}

export interface Frete {
  tipo: string;
  custo: number;
  prazo: number;
}

export interface Endereco {
  cep: string;
  cidade: string;
  uf: string;
  tipo: 'Capital' | 'Interior';
}

export interface Pagamento {
  metodo: string;
  parcelas: number;
  status: 'aprovado' | 'recusado';
  motivo?: string;
}

export interface Pedido {
  numero: string;
  total: number;
  status: string;
  itens: Item[];
  frete: Frete;
  desconto?: number;
}

// Eventos de domínio
export interface EventoDominio {
  tipo: string;
  timestamp: Date;
  dados: any;
}

export interface ItemAdicionado extends EventoDominio {
  tipo: 'ItemAdicionado';
  dados: {
    sku: string;
    quantidade: number;
  };
}

export interface CupomAplicado extends EventoDominio {
  tipo: 'CupomAplicado';
  dados: {
    codigo: string;
    tipo: string;
    valor: number;
  };
}

export interface CupomRejeitado extends EventoDominio {
  tipo: 'CupomRejeitado';
  dados: {
    codigo: string;
    motivo: string;
  };
}

export interface PagamentoAprovado extends EventoDominio {
  tipo: 'PagamentoAprovado';
  dados: {
    metodo: string;
    parcelas: number;
  };
}

export interface PagamentoRecusado extends EventoDominio {
  tipo: 'PagamentoRecusado';
  dados: {
    motivo: string;
  };
}

export interface PedidoCriado extends EventoDominio {
  tipo: 'PedidoCriado';
  dados: {
    numero: string;
    total: number;
  };
}
