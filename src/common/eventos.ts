// Sistema de eventos de domínio

import { EventoDominio } from './types';

export class EventPublisher {
  private listeners: Map<string, Array<(evento: EventoDominio) => void>> = new Map();
  private eventos: EventoDominio[] = [];

  subscribe(tipoEvento: string, callback: (evento: EventoDominio) => void): void {
    if (!this.listeners.has(tipoEvento)) {
      this.listeners.set(tipoEvento, []);
    }
    this.listeners.get(tipoEvento)!.push(callback);
  }

  publish(evento: EventoDominio): void {
    this.eventos.push(evento);
    
    const callbacks = this.listeners.get(evento.tipo) || [];
    callbacks.forEach(callback => callback(evento));
    
    // Log para observabilidade
    console.log(`[EVENTO DOMÍNIO] ${evento.tipo}:`, evento.dados);
  }

  getEventos(): EventoDominio[] {
    return [...this.eventos];
  }

  clearEventos(): void {
    this.eventos = [];
  }

  getEventosPorTipo(tipo: string): EventoDominio[] {
    return this.eventos.filter(e => e.tipo === tipo);
  }
}

// Instância global para os testes
export const eventPublisher = new EventPublisher();

// Helpers para criar eventos específicos
export function criarEventoItemAdicionado(sku: string, quantidade: number): EventoDominio {
  return {
    tipo: 'ItemAdicionado',
    timestamp: new Date(),
    dados: { sku, quantidade }
  };
}

export function criarEventoCupomAplicado(codigo: string, tipo: string, valor: number): EventoDominio {
  return {
    tipo: 'CupomAplicado',
    timestamp: new Date(),
    dados: { codigo, tipo, valor }
  };
}

export function criarEventoCupomRejeitado(codigo: string, motivo: string): EventoDominio {
  return {
    tipo: 'CupomRejeitado',
    timestamp: new Date(),
    dados: { codigo, motivo }
  };
}

export function criarEventoPagamentoAprovado(metodo: string, parcelas: number): EventoDominio {
  return {
    tipo: 'PagamentoAprovado',
    timestamp: new Date(),
    dados: { metodo, parcelas }
  };
}

export function criarEventoPagamentoRecusado(motivo: string): EventoDominio {
  return {
    tipo: 'PagamentoRecusado',
    timestamp: new Date(),
    dados: { motivo }
  };
}

export function criarEventoPedidoCriado(numero: string, total: number): EventoDominio {
  return {
    tipo: 'PedidoCriado',
    timestamp: new Date(),
    dados: { numero, total }
  };
}
