// src/services/scraper/utils/browserService.ts

import puppeteer, { Browser, Page } from 'puppeteer';
import * as fs from 'fs';
import * as path from 'path';

export class BrowserService {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private debugMode: boolean = process.env.DEBUG_MODE === 'true';

  async init(): Promise<void> {
    console.log('🚀 Inicializando navegador...');

    const launchOptions: any = {
      headless: process.env.HEADLESS === 'true',
      defaultViewport: null,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-blink-features=AutomationControlled',
        '--disable-features=IsolateOrigins,site-per-process',
        '--start-maximized',
        '--window-size=1920,1080'
      ],
      ignoreDefaultArgs: ['--enable-automation']
    };

    if (process.env.PUPPETEER_EXECUTABLE_PATH) {
      launchOptions.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
    }

    this.browser = await puppeteer.launch(launchOptions);
    this.page = await this.browser.newPage();

    await this.page.setViewport({
      width: 1920,
      height: 1080,
      deviceScaleFactor: 1
    });

    await this.page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
      Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
      Object.defineProperty(navigator, 'languages', { get: () => ['pt-BR', 'pt', 'en-US', 'en'] });
      (window as any).chrome = { runtime: {} };
    });

    await this.page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
    );

    await this.page.setExtraHTTPHeaders({
      'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'DNT': '1',
      'Connection': 'keep-alive'
    });

    console.log('✅ Navegador inicializado');
  }

  getPage(): Page {
    if (!this.page) {
      throw new Error('Página não inicializada');
    }
    return this.page;
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
      console.log('🔒 Navegador fechado');
    }
  }

  async saveScreenshot(name: string): Promise<void> {
    if (!this.page || !this.debugMode) return;

    try {
      const screenshotsDir = path.join(process.cwd(), 'screenshots');
      if (!fs.existsSync(screenshotsDir)) {
        fs.mkdirSync(screenshotsDir, { recursive: true });
      }

      const timestamp = new Date().getTime();
      const filename = `${name}_${timestamp}.png`;
      await this.page.screenshot({
        path: path.join(screenshotsDir, filename),
        fullPage: true
      });

      console.log(`📸 Screenshot: ${filename}`);
    } catch (error) {
      console.error('Erro ao salvar screenshot:', error);
    }
  }

  async wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async acceptCookies(): Promise<void> {
    if (!this.page) return;

    console.log('🍪 Verificando cookies...');

    try {
      const cookieAccepted = await this.page.evaluate(() => {
        const cookieSelectors = [
          'button[data-cookiebanner="accept_button"]',
          'button[title*="Permitir"]',
          'button[title*="Allow"]',
          'button[title*="Aceitar"]',
        ];

        for (const selector of cookieSelectors) {
          const button = document.querySelector(selector);
          if (button) {
            (button as HTMLElement).click();
            return true;
          }
        }
        return false;
      });

      if (cookieAccepted) {
        console.log('✅ Cookies aceitos');
        await this.wait(2000);
      }
    } catch (error) {
      console.log('ℹ️ Sem banner de cookies');
    }
  }

  async hasAdsContent(): Promise<boolean> {
    if (!this.page) return false;

    try {
      const hasText = await this.page.evaluate(() => {
        const text = document.body.innerText.toLowerCase();
        return text.includes('anúncios') ||
          text.includes('ads') ||
          text.includes('biblioteca') ||
          text.includes('library');
      });

      return hasText;
    } catch {
      return false;
    }
  }
}

export default new BrowserService();
