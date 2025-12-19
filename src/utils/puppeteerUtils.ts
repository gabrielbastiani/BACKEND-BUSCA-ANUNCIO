// src/utils/puppeteerUtils.ts

import puppeteer, { Browser, Page } from 'puppeteer';

/**
 * Função auxiliar para criar um atraso.
 * @param {number} ms O tempo em milissegundos para esperar.
 * @returns {Promise<void>}
 */
async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * @function initializeBrowser
 * Inicializa uma nova instância do navegador Puppeteer.
 * @returns {Promise<Browser>} Uma promessa que resolve para a instância do navegador.
 */
export async function initializeBrowser(): Promise<Browser> {
  console.log('Tentando inicializar o navegador Puppeteer...');
  try {
    const browser = await puppeteer.launch({
      headless: false, // Mude para 'false' para depurar e ver o navegador
      args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--single-process',
      '--disable-gpu',
      '--disable-infobars',
      '--window-size=1920,1080',
      '--disable-features=site-per-process',
      '--disable-site-isolation-trials',
      // NOVOS ARGUMENTOS AQUI:
      '--disable-extensions', // Desabilita extensões
      '--disable-background-networking', // Desabilita algumas atividades de rede em segundo plano
      '--disable-sync', // Desabilita sincronização
      '--disable-default-apps', // Desabilita apps padrão
      '--hide-scrollbars', // Esconde scrollbars
      '--metrics-recording-only', // Apenas grava métricas
      '--mute-audio', // Muta áudio
      '--no-default-browser-check', // Não verifica se é o navegador padrão
      '--no-experiments', // Desabilita experimentos
      '--no-first-run', // Já está, mas bom reforçar
      '--no-pings', // Desabilita pings
      '--no-proxy-server', // Não usa servidor proxy
      '--no-service-autorun', // Desabilita auto-execução de serviços
      '--disable-breakpad', // Desabilita relatórios de crash
      '--disable-component-update', // Desabilita atualização de componentes
      '--disable-domain-reliability', // Desabilita relatórios de confiabilidade de domínio
      '--disable-ipc-flooding-protection', // Desabilita proteção contra flooding de IPC
      '--disable-renderer-backgrounding', // Desabilita backgrounding do renderizador
      '--enable-features=NetworkService,NetworkServiceInProcess', // Força o uso do NetworkService
      '--force-color-profile=srgb', // Força um perfil de cor
      '--host-rules="MAP * 127.0.0.1"', // Pode ajudar em alguns casos de rede
      '--ignore-certificate-errors', // Ignora erros de certificado (cuidado em produção)
      '--log-level=0', // Nível de log
      '--v=99', // Verbose logging
      '--disable-software-rasterizer' // Desabilita rasterização de software (pode ajudar com GPU)
    ],
      timeout: 90000 // Aumenta o timeout para 90 segundos para o launch do navegador
    });
    console.log('Navegador Puppeteer inicializado com sucesso.');
    return browser;
  } catch (error) {
    console.error('Erro ao inicializar o navegador Puppeteer:', error);
    throw error; // Re-lança o erro para ser capturado pelo serviço
  }
}

/**
 * @function closeBrowser
 * Fecha a instância do navegador Puppeteer.
 * @param {Browser} browser A instância do navegador a ser fechada.
 * @returns {Promise<void>}
 */
export async function closeBrowser(browser: Browser): Promise<void> {
  if (browser) {
    console.log('Fechando o navegador Puppeteer...');
    await browser.close();
    console.log('Navegador Puppeteer fechado.');
  }
}

/**
 * @function createPage
 * Cria uma nova página no navegador e configura algumas opções padrão.
 * @param {Browser} browser A instância do navegador.
 * @returns {Promise<Page>} Uma promessa que resolve para a nova página.
 */
export async function createPage(browser: Browser): Promise<Page> {
  console.log('Criando nova página no navegador...');
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
  page.setDefaultNavigationTimeout(60000); // 60 segundos
  console.log('Página criada e configurada.');
  return page;
}

/**
 * @function waitForSelectorAndClick
 * Espera por um seletor e clica nele.
 * @param {Page} page A instância da página.
 * @param {string} selector O seletor CSS do elemento.
 * @param {number} timeout O tempo máximo para esperar pelo seletor (em ms).
 * @returns {Promise<void>}
 */
export async function waitForSelectorAndClick(page: Page, selector: string, timeout: number = 30000): Promise<void> {
  console.log(`Esperando por seletor e clicando: ${selector}`);
  await page.waitForSelector(selector, { visible: true, timeout });
  await page.click(selector);
  console.log(`Clicado em: ${selector}`);
}

/**
 * @function waitForSelectorAndType
 * Espera por um seletor e digita um texto nele.
 * @param {Page} page A instância da página.
 * @param {string} selector O seletor CSS do elemento.
 * @param {string} text O texto a ser digitado.
 * @param {number} timeout O tempo máximo para esperar pelo seletor (em ms).
 * @returns {Promise<void>}
 */
export async function waitForSelectorAndType(page: Page, selector: string, text: string, timeout: number = 30000): Promise<void> {
  console.log(`Esperando por seletor e digitando "${text}" em: ${selector}`);
  await page.waitForSelector(selector, { visible: true, timeout });
  await page.type(selector, text);
  console.log(`Digitado em: ${selector}`);
}

/**
 * @function scrollPageToEnd
 * Rola a página até o final para carregar mais conteúdo dinâmico.
 * @param {Page} page A instância da página.
 * @param {number} scrollDelay O atraso entre as rolagens (em ms).
 * @param {number} maxScrolls O número máximo de rolagens a serem realizadas.
 * @returns {Promise<void>}
 */
export async function scrollPageToEnd(page: Page, scrollDelay: number = 1000, maxScrolls: number = 10): Promise<void> {
  console.log('Iniciando rolagem da página...');
  let previousHeight;
  let scrollCount = 0;
  while (scrollCount < maxScrolls) {
    previousHeight = await page.evaluate('document.body.scrollHeight');
    await page.evaluate('window.scrollTo(0, document.body.scrollHeight)');
    await delay(scrollDelay); // Espera para o conteúdo carregar
    const newHeight = await page.evaluate('document.body.scrollHeight');
    if (newHeight === previousHeight) {
      console.log('Fim da página atingido ou nenhum novo conteúdo carregado.');
      break;
    }
    scrollCount++;
    console.log(`Rolagem ${scrollCount} de ${maxScrolls} concluída.`);
  }
  console.log('Rolagem da página finalizada.');
}