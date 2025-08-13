import { Page, expect } from '@playwright/test';

export class Dsl {
  private readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async visit(url: string): Promise<void> {
    await this.page.goto(url, { waitUntil: 'domcontentloaded' });
  }

  async loadHtml(html: string): Promise<void> {
    await this.page.setContent(html, { waitUntil: 'domcontentloaded' });
  }

  async click(textOrSelector: string): Promise<void> {
    const selector = this.toSelector(textOrSelector);
    await this.page.click(selector);
  }

  async fill(textOrSelector: string, value: string): Promise<void> {
    const selector = this.toSelector(textOrSelector);
    await this.page.fill(selector, value);
  }

  async seeText(text: string): Promise<void> {
    await expect(this.page.getByText(text, { exact: false })).toBeVisible();
  }

  async screenshot(name: string): Promise<void> {
    await this.page.screenshot({ path: `test-results/${name}.png`, fullPage: true });
  }

  private toSelector(textOrSelector: string): string {
    if (
      textOrSelector.startsWith('#') ||
      textOrSelector.startsWith('.') ||
      textOrSelector.startsWith('//') ||
      textOrSelector.startsWith('css=')
    ) {
      return textOrSelector;
    }
    return `text=${textOrSelector}`;
  }
}

export function using(page: Page): Dsl {
  return new Dsl(page);
}


