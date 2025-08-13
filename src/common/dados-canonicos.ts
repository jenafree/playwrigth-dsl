// Catálogo de dados canônicos para testes

import { SKU, Cupom, Endereco } from './types';

export const SKUs: Record<string, SKU> = {
  'CAMISETA-PRETA-M': {
    codigo: 'CAMISETA-PRETA-M',
    nome: 'Camiseta Preta Tamanho M',
    preco: 49.90,
    estoque: 100,
    categoria: 'vestuario'
  },
  'TENIS-URBANO-42': {
    codigo: 'TENIS-URBANO-42',
    nome: 'Tênis Urbano Tamanho 42',
    preco: 199.90,
    estoque: 50,
    categoria: 'calcados'
  },
  'MOCHILA-TRAVEL': {
    codigo: 'MOCHILA-TRAVEL',
    nome: 'Mochila Travel',
    preco: 89.90,
    estoque: 25,
    categoria: 'acessorios'
  }
};

export const Cupons: Record<string, Cupom> = {
  'BEMVINDO10': {
    codigo: 'BEMVINDO10',
    tipo: 'percentual',
    valor: 10,
    valido: true,
    expirado: false,
    cumulativo: false
  },
  'PROMOFAKE': {
    codigo: 'PROMOFAKE',
    tipo: 'percentual',
    valor: 0,
    valido: false,
    expirado: false,
    cumulativo: false
  },
  'BLACK2022': {
    codigo: 'BLACK2022',
    tipo: 'percentual',
    valor: 50,
    valido: false,
    expirado: true,
    cumulativo: false
  }
};

export const Enderecos: Record<string, Endereco> = {
  'Capital': {
    cep: '01310-100',
    cidade: 'São Paulo',
    uf: 'SP',
    tipo: 'Capital'
  },
  'Interior': {
    cep: '14400-000',
    cidade: 'Franca',
    uf: 'SP',
    tipo: 'Interior'
  }
};

export const Cartoes = {
  Aprovado: {
    numero: '4111111111111111',
    nome: 'João Silva',
    cvv: '123',
    validade: '12/25',
    resultado: 'aprovado'
  },
  RecusadoPorLimite: {
    numero: '4000000000000002',
    nome: 'João Silva',
    cvv: '123',
    validade: '12/25',
    resultado: 'recusado',
    motivo: 'limite'
  },
  RecusadoAntifraude: {
    numero: '4000000000000259',
    nome: 'João Silva',
    cvv: '123',
    validade: '12/25',
    resultado: 'recusado',
    motivo: 'antifraude'
  }
};

export const Fretes = {
  Economico: {
    tipo: 'Economico',
    custo: 5.90,
    prazo: 7
  },
  Rapido: {
    tipo: 'Rapido',
    custo: 12.90,
    prazo: 3
  }
};
