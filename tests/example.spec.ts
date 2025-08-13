import { test } from '@playwright/test';
import { using } from '../src/dsl';

test('carrega HTML em memória e valida texto', async ({ page }) => {
  const dsl = using(page);
  await dsl.loadHtml(`
    <html>
      <body>
        <h1>Example Domain</h1>
        <p>conteúdo local</p>
      </body>
    </html>
  `);
  await dsl.seeText('Example Domain');
});


