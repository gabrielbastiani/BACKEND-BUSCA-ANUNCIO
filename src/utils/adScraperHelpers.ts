// src/utils/adScraperHelpers.ts

import { Page } from 'puppeteer';

export class AdScraperHelpers {
  /**
   * Realiza scroll suave na página para carregar mais conteúdo
   */
  static async autoScroll(page: Page, maxScrolls: number = 10): Promise<void> {
    await page.evaluate(async (maxScrolls) => {
      await new Promise<void>((resolve) => {
        let totalHeight = 0;
        let scrollCount = 0;
        const distance = 300;

        const timer = setInterval(() => {
          const scrollHeight = document.body.scrollHeight;
          window.scrollBy(0, distance);
          totalHeight += distance;
          scrollCount++;

          if (totalHeight >= scrollHeight || scrollCount >= maxScrolls) {
            clearInterval(timer);
            resolve();
          }
        }, 500);
      });
    }, maxScrolls);
  }

  /**
   * Aguarda um tempo aleatório para parecer mais humano
   */
  static async randomDelay(min: number = 1000, max: number = 3000): Promise<void> {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  /**
   * Remove caracteres especiais e limpa texto
   */
  static cleanText(text: string): string {
    return text
      .replace(/\s+/g, ' ')
      .replace(/\n+/g, ' ')
      .trim();
  }

  /**
   * Extrai ID único do anúncio
   */
  static extractAdId(url: string): string {
    const match = url.match(/ad_id=(\d+)/);
    return match ? match[1] : `ad_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Converte string de data para Date object
   */
  static parseDate(dateString: string): Date | undefined {
    try {
      // Tenta diferentes formatos de data
      const date = new Date(dateString);
      return isNaN(date.getTime()) ? undefined : date;
    } catch {
      return undefined;
    }
  }

  /**
   * Verifica se o elemento está visível na página
   */
  static async isElementVisible(page: Page, selector: string): Promise<boolean> {
    try {
      const element = await page.$(selector);
      if (!element) return false;

      const isVisible = await page.evaluate((el) => {
        if (!el) return false;
        const style = window.getComputedStyle(el);
        return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
      }, element);

      return isVisible;
    } catch {
      return false;
    }
  }
}
