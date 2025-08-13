// Observabilidade - logging de eventos de domínio e métricas

interface Metrica {
  nome: string;
  valor: number;
  timestamp: Date;
  tags?: Record<string, string>;
}

interface LogEvent {
  nivel: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';
  categoria: 'DOMINIO' | 'UI' | 'API' | 'TESTE';
  mensagem: string;
  dados?: any;
  timestamp: Date;
}

export class Observabilidade {
  private metricas: Metrica[] = [];
  private logs: LogEvent[] = [];

  // Logging estruturado
  logDominio(evento: string, dados: any): void {
    this.logs.push({
      nivel: 'INFO',
      categoria: 'DOMINIO',
      mensagem: `Evento: ${evento}`,
      dados,
      timestamp: new Date()
    });
    
    console.log(`[DOMÍNIO] ${evento}:`, dados);
  }

  logUI(acao: string, elemento?: string, dados?: any): void {
    this.logs.push({
      nivel: 'DEBUG',
      categoria: 'UI',
      mensagem: `UI: ${acao}${elemento ? ` → ${elemento}` : ''}`,
      dados,
      timestamp: new Date()
    });
    
    console.log(`[UI] ${acao}${elemento ? ` → ${elemento}` : ''}`);
  }

  logAPI(metodo: string, endpoint: string, status?: number): void {
    this.logs.push({
      nivel: 'DEBUG',
      categoria: 'API',
      mensagem: `${metodo} ${endpoint}${status ? ` → ${status}` : ''}`,
      timestamp: new Date()
    });
    
    console.log(`[API] ${metodo} ${endpoint}${status ? ` → ${status}` : ''}`);
  }

  logTeste(caso: string, status: 'INICIO' | 'SUCESSO' | 'FALHA', detalhes?: string): void {
    const nivel = status === 'FALHA' ? 'ERROR' : 'INFO';
    this.logs.push({
      nivel,
      categoria: 'TESTE',
      mensagem: `${caso}: ${status}`,
      dados: detalhes,
      timestamp: new Date()
    });
    
    console.log(`[TESTE] ${caso}: ${status}${detalhes ? ` - ${detalhes}` : ''}`);
  }

  // Métricas de negócio
  registrarMetrica(nome: string, valor: number, tags?: Record<string, string>): void {
    this.metricas.push({
      nome,
      valor,
      timestamp: new Date(),
      tags
    });
    
    console.log(`[MÉTRICA] ${nome}: ${valor}`, tags);
  }

  // Métricas específicas do E-commerce
  registrarFinalizacaoCompra(tempoMs: number, total: number, sku: string): void {
    this.registrarMetrica('finalizacao_compra.tempo_ms', tempoMs, { sku });
    this.registrarMetrica('finalizacao_compra.valor_total', total, { sku });
    this.registrarMetrica('finalizacao_compra.sucesso', 1, { sku });
  }

  registrarCupomAplicado(codigo: string, desconto: number): void {
    this.registrarMetrica('cupom.aplicado', 1, { codigo });
    this.registrarMetrica('cupom.desconto_valor', desconto, { codigo });
  }

  registrarPagamentoRecusado(motivo: string): void {
    this.registrarMetrica('pagamento.recusa', 1, { motivo });
  }

  registrarFlakiness(caso: string, tentativas: number): void {
    this.registrarMetrica('teste.flakiness', tentativas, { caso });
  }

  // Relatórios
  gerarRelatorioEventos(): { total: number; porCategoria: Record<string, number> } {
    const total = this.logs.length;
    const porCategoria = this.logs.reduce((acc, log) => {
      acc[log.categoria] = (acc[log.categoria] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return { total, porCategoria };
  }

  gerarRelatorioMetricas(): { total: number; metricas: Record<string, number[]> } {
    const total = this.metricas.length;
    const metricas = this.metricas.reduce((acc, metrica) => {
      if (!acc[metrica.nome]) acc[metrica.nome] = [];
      acc[metrica.nome].push(metrica.valor);
      return acc;
    }, {} as Record<string, number[]>);

    return { total, metricas };
  }

  // P95 para tempo de finalização de compra
  calcularP95FinalizacaoCompra(): number | null {
    const tempos = this.metricas
      .filter(m => m.nome === 'finalizacao_compra.tempo_ms')
      .map(m => m.valor)
      .sort((a, b) => a - b);

    if (tempos.length === 0) return null;

    const indiceP95 = Math.ceil(tempos.length * 0.95) - 1;
    return tempos[indiceP95];
  }

  // Taxa de sucesso por caso de uso
  calcularTaxaSucesso(casoUso: string): number | null {
    const sucessos = this.logs.filter(log => 
      log.categoria === 'TESTE' && 
      log.mensagem.includes(casoUso) && 
      log.mensagem.includes('SUCESSO')
    ).length;

    const falhas = this.logs.filter(log => 
      log.categoria === 'TESTE' && 
      log.mensagem.includes(casoUso) && 
      log.mensagem.includes('FALHA')
    ).length;

    const total = sucessos + falhas;
    return total > 0 ? (sucessos / total) * 100 : null;
  }

  // Export para sistemas externos (mock)
  exportarParaDatadog(): void {
    console.log('[EXPORT] Enviando métricas para Datadog...');
    console.log('Métricas:', this.metricas.length);
    console.log('Logs:', this.logs.length);
  }

  exportarParaElasticSearch(): void {
    console.log('[EXPORT] Enviando logs para ElasticSearch...');
    this.logs.forEach(log => {
      console.log(`[ES] ${log.timestamp.toISOString()} [${log.categoria}] ${log.mensagem}`);
    });
  }

  // Limpeza
  limpar(): void {
    this.metricas = [];
    this.logs = [];
  }

  // Getters para testes
  getLogs(): LogEvent[] {
    return [...this.logs];
  }

  getMetricas(): Metrica[] {
    return [...this.metricas];
  }
}

// Instância global
export const observabilidade = new Observabilidade();
