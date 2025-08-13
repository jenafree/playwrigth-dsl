// Fixtures customizadas - contexto por papel e adapters

import { test as base, Page } from '@playwright/test';
import { UIAdapter } from '../adapters/ui-adapter';
import { APIAdapter } from '../adapters/api-adapter';
import { ECommerceUseCases } from '../flows/use-cases';
import { eventPublisher } from '../common/eventos';

interface CustomFixtures {
  clientePage: Page;
  adminPage: Page;
  uiAdapter: UIAdapter;
  apiAdapter: APIAdapter;
  useCases: ECommerceUseCases;
}

// Estender fixtures base do Playwright
export const test = base.extend<CustomFixtures>({
  // Contexto do cliente (usa storage state do global setup)
  clientePage: async ({ browser }, use) => {
    const context = await browser.newContext({
      storageState: './test-results/storage-states/cliente.json'
    });
    const page = await context.newPage();
    
    await use(page);
    await context.close();
  },

  // Contexto do admin
  adminPage: async ({ browser }, use) => {
    const context = await browser.newContext({
      storageState: './test-results/storage-states/admin.json'
    });
    const page = await context.newPage();
    
    await use(page);
    await context.close();
  },

  // UI Adapter (padrão usa clientePage)
  uiAdapter: async ({ clientePage }, use) => {
    const adapter = new UIAdapter(clientePage);
    await use(adapter);
  },

  // API Adapter
  apiAdapter: async ({}, use) => {
    const adapter = new APIAdapter();
    await use(adapter);
  },

  // Use Cases (orquestra adapters)
  useCases: async ({ uiAdapter, apiAdapter }, use) => {
    const useCases = new ECommerceUseCases(uiAdapter, apiAdapter);
    
    // Setup antes de cada teste
    await useCases.prepararContextoCliente();
    eventPublisher.clearEventos(); // Limpar eventos de testes anteriores
    
    await use(useCases);
    
    // Cleanup após cada teste
    await useCases.validarInvariantes();
  }
});

export { expect } from '@playwright/test';
