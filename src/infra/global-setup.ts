// Global Setup - autenticação por papel antes da suíte

import { chromium, FullConfig } from '@playwright/test';
import { APIAdapter } from '../adapters/api-adapter';

const STORAGE_STATE_DIR = './test-results/storage-states';

async function globalSetup(config: FullConfig) {
  console.log('[GLOBAL SETUP] Iniciando configuração global...');

  const browser = await chromium.launch();
  const apiAdapter = new APIAdapter();

  try {
    // Preparar dados canônicos uma vez
    await apiAdapter.seedSKUs();
    await apiAdapter.seedCupons();
    await apiAdapter.resetarEstoque();
    console.log('[GLOBAL SETUP] Seeds executados');

    // Setup para papel "cliente"
    await setupPapelCliente(browser, apiAdapter);

    // Setup para papel "admin" (se necessário)
    await setupPapelAdmin(browser, apiAdapter);

    console.log('[GLOBAL SETUP] Concluído com sucesso');

  } catch (error) {
    console.error('[GLOBAL SETUP] Erro:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

async function setupPapelCliente(browser: any, apiAdapter: APIAdapter) {
  console.log('[GLOBAL SETUP] Configurando papel: cliente');

  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // 1. Criar cliente via API
    const clienteId = await apiAdapter.criarCliente('cliente');
    
    // 2. Definir endereço padrão
    await apiAdapter.seedEnderecoCliente(clienteId, 'Capital');

    // 3. Fazer login via UI (simular processo real)
    await page.goto('/login');
    await page.fill('[data-testid="email"]', `cliente_${clienteId}@teste.com`);
    await page.fill('[data-testid="senha"]', 'senha123');
    await page.click('[data-testid="login-submit"]');

    // Aguardar redirecionamento pós-login
    await page.waitForURL('/dashboard', { timeout: 10000 });

    // Verificar elementos que indicam sessão ativa
    await page.waitForSelector('[data-testid="usuario-logado"]');
    
    console.log(`[GLOBAL SETUP] Cliente autenticado: ${clienteId}`);

    // 4. Salvar estado da sessão
    await context.storageState({ 
      path: `${STORAGE_STATE_DIR}/cliente.json` 
    });

  } catch (error) {
    // Em ambiente de desenvolvimento, criar mock de sessão
    console.warn('[GLOBAL SETUP] Login real falhou, usando mock:', error instanceof Error ? error.message : error);
    await criarMockSessaoCliente(page);
    await context.storageState({ 
      path: `${STORAGE_STATE_DIR}/cliente.json` 
    });
  } finally {
    await context.close();
  }
}

async function setupPapelAdmin(browser: any, apiAdapter: APIAdapter) {
  console.log('[GLOBAL SETUP] Configurando papel: admin');

  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // 1. Criar admin via API
    const adminId = await apiAdapter.criarCliente('admin');

    // 2. Fazer login como admin
    await page.goto('/admin/login');
    await page.fill('[data-testid="email"]', `admin_${adminId}@teste.com`);
    await page.fill('[data-testid="senha"]', 'admin123');
    await page.click('[data-testid="login-submit"]');

    await page.waitForURL('/admin/dashboard', { timeout: 10000 });
    await page.waitForSelector('[data-testid="admin-logado"]');

    console.log(`[GLOBAL SETUP] Admin autenticado: ${adminId}`);

    // 3. Salvar estado
    await context.storageState({ 
      path: `${STORAGE_STATE_DIR}/admin.json` 
    });

  } catch (error) {
    console.warn('[GLOBAL SETUP] Login admin falhou, usando mock:', error instanceof Error ? error.message : error);
    await criarMockSessaoAdmin(page);
    await context.storageState({ 
      path: `${STORAGE_STATE_DIR}/admin.json` 
    });
  } finally {
    await context.close();
  }
}

// Mocks para desenvolvimento (quando backend não está disponível)
async function criarMockSessaoCliente(page: any) {
  await page.addInitScript(() => {
    localStorage.setItem('user', JSON.stringify({
      id: 'cliente_mock',
      nome: 'Cliente Teste',
      email: 'cliente@teste.com',
      papel: 'cliente',
      autenticado: true
    }));
    
    sessionStorage.setItem('token', 'mock_token_cliente');
  });

  // Navegar para página que confirma sessão
  await page.goto('/');
  console.log('[GLOBAL SETUP] Mock de sessão cliente criado');
}

async function criarMockSessaoAdmin(page: any) {
  await page.addInitScript(() => {
    localStorage.setItem('user', JSON.stringify({
      id: 'admin_mock',
      nome: 'Admin Teste',
      email: 'admin@teste.com',
      papel: 'admin',
      autenticado: true
    }));
    
    sessionStorage.setItem('token', 'mock_token_admin');
  });

  await page.goto('/');
  console.log('[GLOBAL SETUP] Mock de sessão admin criado');
}

export default globalSetup;
