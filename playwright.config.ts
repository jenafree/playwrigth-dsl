import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'tests',
  timeout: 30000,
  expect: { timeout: 5000 },
  fullyParallel: true,
  
  // Global Setup desabilitado para demo
  // globalSetup: './src/infra/global-setup.ts',
  
  reporter: [
    ['list'], 
    ['html', { open: 'never' }],
    ['json', { outputFile: 'test-results/results.json' }]
  ],
  
  use: {
    baseURL: 'http://localhost:3000', // E-commerce local
    headless: true,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },
  
  projects: [
    {
      name: 'e2e-cliente',
      testDir: 'tests/e2e',
      use: { 
        ...devices['Desktop Chrome'],
        storageState: './test-results/storage-states/cliente.json'
      }
    },
    {
      name: 'e2e-admin', 
      testDir: 'tests/admin',
      use: { 
        ...devices['Desktop Chrome'],
        storageState: './test-results/storage-states/admin.json'
      }
    }
  ],
  
  outputDir: 'test-results'
});


