// src/services/adScraperService.ts

// Importação explícita de Page e Browser do puppeteer
import { Page, Browser, ElementHandle } from 'puppeteer'; // Mantenha ElementHandle, pode ser útil
import { initializeBrowser, closeBrowser, createPage, waitForSelectorAndClick, waitForSelectorAndType, scrollPageToEnd } from '../utils/puppeteerUtils';
import { AdData, ScrapeOptions, ScrapedAdRaw } from '../@types/ad.types';
import prisma from '../prisma';
import moment from 'moment';

const BASE_URL = "https://pt-br.facebook.com/ads/library/";

/**
 * Função auxiliar para simular page.waitForTimeout caso não seja reconhecido.
 * @param {number} ms O tempo em milissegundos para esperar.
 * @returns {Promise<void>}
 */
async function customWaitForTimeout(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Função auxiliar para simular page.$x usando type assertion (casting para any).
 * Isso é um workaround para problemas de tipagem persistentes.
 * @param {Page} page A instância da página Puppeteer.
 * @param {string} xpath O seletor XPath.
 * @returns {Promise<ElementHandle<Element>[]>} Um array de ElementHandles.
 */
async function custom$x(page: Page, xpath: string): Promise<ElementHandle<Element>[]> {
  // Força o tipo da página para 'any' para acessar o método $x,
  // contornando o problema de tipagem.
  return (page as any).$x(xpath);
}


/**
 * @function parseDate
 * Tenta parsear uma string de data em um objeto Date.
 * @param {string | null | undefined} dateString A string da data.
 * @returns {Date | null | undefined} O objeto Date, null ou undefined se não puder ser parseado.
 */
function parseDate(dateString: string | null | undefined): Date | null | undefined {
  if (!dateString) return null;
  const parsedDate = moment(dateString, [
    "DD [de] MMMM [de] YYYY",
    "YYYY-MM-DD",
    "MM/DD/YYYY",
    "DD/MM/YYYY"
  ], 'pt-br', true);

  return parsedDate.isValid() ? parsedDate.toDate() : null;
}

/**
 * @function extractAdDetails
 * Extrai os detalhes de um único anúncio a partir de seu elemento HTML.
 * @param {Page} page A instância da página Puppeteer.
 * @param {string} adElementSelector O seletor CSS para o elemento raiz do anúncio.
 * @returns {Promise<ScrapedAdRaw | null>} Os dados brutos do anúncio ou null se não puder extrair.
 */
async function extractAdDetails(page: Page, adElementSelector: string): Promise<ScrapedAdRaw | null> {
  return await page.evaluate((selector) => {
    const adElement = document.querySelector(selector);
    if (!adElement) return null;

    const getText = (sel: string) => {
      const el = adElement.querySelector(sel);
      return el ? el.textContent?.trim() : null;
    };

    const getSrc = (sel: string) => {
      const el = adElement.querySelector(sel);
      return el ? el.getAttribute('src') : null;
    };

    const getHref = (sel: string) => {
      const el = adElement.querySelector(sel);
      return el ? el.getAttribute('href') : null;
    };

    const adIdLink = adElement.querySelector('a[href*="/ads/library/details/"]');
    const adIdMatch = adIdLink?.getAttribute('href')?.match(/details\/(\d+)/);
    const adId = adIdMatch ? adIdMatch[1] : `unknown-${Math.random().toString(36).substr(2, 9)}`;

    const pageName = getText('div[data-testid="ad_a_library_card_page_name"] a') || getText('div[data-testid="ad_a_library_card_page_name"]');
    const adText = getText('div[data-testid="ad_a_library_card_text"]');
    const adLink = getHref('a[data-testid="ad_a_library_card_link"]');

    const adImageUrl = getSrc('img[data-testid="ad_a_library_card_image"]');
    const adVideoUrl = getSrc('video[data-testid="ad_a_library_card_video"] source') || getSrc('video[data-testid="ad_a_library_card_video"]');

    const platforms = Array.from(adElement.querySelectorAll('div[data-testid="ad_a_library_card_platform_icon"] img'))
      .map(img => img.getAttribute('alt'))
      .filter(Boolean)
      .join(', ');

    const statusText = getText('div[data-testid="ad_a_library_card_status"]');
    let startDate: string | null = null;
    let endDate: string | null = null;
    let status: string | null = null;

    if (statusText) {
      const statusMatch = statusText.match(/(ATIVO|INATIVO)\s-\sInício:\s(.+?)(?:\s-\sFim:\s(.+))?/);
      if (statusMatch) {
        status = statusMatch[1];
        startDate = statusMatch[2];
        endDate = statusMatch[3] || null;
      } else {
        status = statusText.includes('ATIVO') ? 'ATIVO' : (statusText.includes('INATIVO') ? 'INATIVO' : null);
        const dateOnlyMatch = statusText.match(/Início:\s(.+)/);
        if (dateOnlyMatch) startDate = dateOnlyMatch[1];
      }
    }

    const platformSpecificData = {};

    return {
      adId: adId,
      pageName: pageName || 'Nome da Página Desconhecido',
      adText: adText,
      adCreativeUrl: adImageUrl || adVideoUrl,
      adImageUrl: adImageUrl,
      adVideoUrl: adVideoUrl,
      adLink: adLink,
      adPlatform: platforms || null,
      startDate: startDate,
      endDate: endDate,
      status: status,
      platformSpecificData: platformSpecificData,
    };
  }, adElementSelector);
}

/**
 * @function scrapeFacebookAds
 * Realiza o web scraping na Biblioteca de Anúncios do Facebook.
 * @param {ScrapeOptions} options As opções para o scraping, incluindo a palavra-chave.
 * @returns {Promise<AdData[]>} Uma promessa que resolve para um array de objetos AdData.
 */
export async function scrapeFacebookAds(options: ScrapeOptions): Promise<AdData[]> {
  const { keyword, country = 'BR', adCategory = 'ALL', limit } = options;
  let browserInstance: Browser | undefined;
  let page: Page | undefined;
  const collectedAds: AdData[] = [];
  const seenAdIds = new Set<string>();

  try {
    browserInstance = await initializeBrowser();
    page = await createPage(browserInstance);

    let url = `${BASE_URL}?country=${country}&q=${encodeURIComponent(keyword)}`;

    if (adCategory === 'POLITICAL_AND_ISSUE_ADS') {
      url += `&ad_type=political_and_issue_ads`;
    } else {
      url = `${BASE_URL}?country=${country}`;
    }

    console.log(`Navegando para: ${url}`);
    await page.goto(url, { waitUntil: 'networkidle2' });

    const searchInputSelector = 'input[placeholder*="Pesquisar por palavra-chave"]';
    await waitForSelectorAndType(page, searchInputSelector, keyword);
    await page.keyboard.press('Enter');
    await page.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => console.log('Navegação após Enter não ocorreu ou falhou.'));
    await customWaitForTimeout(3000);

    const adTypeDropdownButtonSelector = 'div[aria-label="Tipo de anúncio"] > div[role="button"]';
    const allAdsOptionSelector = 'div[role="option"] > span:nth-child(2) > span:nth-child(2)';

    try {
      await page.waitForSelector(adTypeDropdownButtonSelector, { timeout: 10000 });
      const currentAdType = await page.evaluate((selector) => {
        const el = document.querySelector(selector);
        return el ? el.textContent?.trim() : '';
      }, adTypeDropdownButtonSelector);

      if (adCategory === 'ALL' && currentAdType !== 'Todos os anúncios') {
        console.log('Selecionando "Todos os anúncios" na categoria...');
        await waitForSelectorAndClick(page, adTypeDropdownButtonSelector);
        await page.waitForSelector(allAdsOptionSelector, { visible: true, timeout: 10000 });
        // CORREÇÃO: Usar custom$x que agora faz o cast para any
        const allAdsOption = await custom$x(page, `//div[@role="option"]//span[contains(text(), "Todos os anúncios")]`);
        if (allAdsOption.length > 0) {
          await allAdsOption[0].click();
          await page.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => console.log('Navegação após seleção de categoria não ocorreu ou falhou.'));
          await customWaitForTimeout(3000);
        } else {
          console.warn('Não foi possível encontrar a opção "Todos os anúncios" no dropdown.');
        }
      } else if (adCategory === 'POLITICAL_AND_ISSUE_ADS' && currentAdType !== 'Anúncios sobre temas sociais, eleições ou política') {
        console.log('Selecionando "Anúncios sobre temas sociais, eleições ou política" na categoria...');
        await waitForSelectorAndClick(page, adTypeDropdownButtonSelector);
        await page.waitForSelector(allAdsOptionSelector, { visible: true, timeout: 10000 });
        // CORREÇÃO: Usar custom$x que agora faz o cast para any
        const politicalAdsOption = await custom$x(page, `//div[@role="option"]//span[contains(text(), "Anúncios sobre temas sociais, eleições ou política")]`);
        if (politicalAdsOption.length > 0) {
          await politicalAdsOption[0].click();
          await page.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => console.log('Navegação após seleção de categoria não ocorreu ou falhou.'));
          await customWaitForTimeout(3000);
        } else {
          console.warn('Não foi possível encontrar a opção "Anúncios sobre temas sociais, eleições ou política" no dropdown.');
        }
      }
    } catch (error) {
      console.warn('Erro ao tentar configurar a categoria de anúncio (pode ser que já esteja configurada ou seletor mudou):', error);
    }

    const countryDropdownButtonSelector = 'div[aria-label="País"] > div[role="button"]';
    const brazilOptionSelector = 'div[role="option"] > span:nth-child(2) > span:nth-child(2)';

    try {
      await page.waitForSelector(countryDropdownButtonSelector, { timeout: 10000 });
      const currentCountry = await page.evaluate((selector) => {
        const el = document.querySelector(selector);
        return el ? el.textContent?.trim() : '';
      }, countryDropdownButtonSelector);

      if (country === 'BR' && currentCountry !== 'Brasil') {
        console.log('Selecionando "Brasil" no país...');
        await waitForSelectorAndClick(page, countryDropdownButtonSelector);
        await page.waitForSelector(brazilOptionSelector, { visible: true, timeout: 10000 });
        // CORREÇÃO: Usar custom$x que agora faz o cast para any
        const brazilOption = await custom$x(page, `//div[@role="option"]//span[contains(text(), "Brasil")]`);
        if (brazilOption.length > 0) {
          await brazilOption[0].click();
          await page.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => console.log('Navegação após seleção de país não ocorreu ou falhou.'));
          await customWaitForTimeout(3000);
        } else {
          console.warn('Não foi possível encontrar a opção "Brasil" no dropdown de país.');
        }
      }
    } catch (error) {
      console.warn('Erro ao tentar configurar o país (pode ser que já esteja configurado ou seletor mudou):', error);
    }

    console.log('Iniciando rolagem e coleta de anúncios...');

    let totalScrolledAds = 0;
    const maxScrolls = 20;
    const adCardSelector = 'div[data-testid="ad_a_library_card"]';

    for (let i = 0; i < maxScrolls; i++) {
      await scrollPageToEnd(page, 2000, 1);
      await customWaitForTimeout(2000);

      const adElements = await page.$$(adCardSelector);
      console.log(`Após rolagem ${i + 1}, encontrados ${adElements.length} elementos de anúncio.`);

      for (const adElement of adElements) {
        const adIdLink = await adElement.$('a[href*="/ads/library/details/"]');
        const adIdMatch = await adIdLink?.evaluate(el => el.getAttribute('href')?.match(/details\/(\d+)/));
        const currentAdId = adIdMatch && adIdMatch[1] ? adIdMatch[1] : `unknown-${Math.random().toString(36).substr(2, 9)}`;

        if (!seenAdIds.has(currentAdId)) {
          seenAdIds.add(currentAdId);
          totalScrolledAds++;

          const rawAdData = await extractAdDetails(page, `div[data-testid="ad_a_library_card"]:nth-child(${totalScrolledAds})`);
          if (rawAdData) {
            const mappedAd: AdData = {
              adId: rawAdData.adId,
              pageName: rawAdData.pageName,
              adCreativeUrl: rawAdData.adCreativeUrl,
              adText: rawAdData.adText,
              adImageUrl: rawAdData.adImageUrl,
              adVideoUrl: rawAdData.adVideoUrl,
              adLink: rawAdData.adLink,
              adPlatform: rawAdData.adPlatform,
              startDate: parseDate(rawAdData.startDate),
              endDate: parseDate(rawAdData.endDate),
              status: rawAdData.status,
              keyword: keyword,
              country: country,
              currency: 'BRL',
              platformSpecificData: rawAdData.platformSpecificData,
            };
            collectedAds.push(mappedAd);
          }

          if (limit && collectedAds.length >= limit) {
            console.log(`Limite de ${limit} anúncios atingido.`);
            break;
          }
        }
      }

      if (limit && collectedAds.length >= limit) {
        break;
      }

      const previousCount = seenAdIds.size;
      const newAdElements = await page.$$(adCardSelector);
      if (newAdElements.length === previousCount) {
        console.log('Não há mais anúncios para carregar ou o final da página foi atingido.');
        break;
      }
    }

    console.log(`Total de anúncios coletados: ${collectedAds.length}`);
    return collectedAds;

  } catch (error) {
    console.error('Erro durante o scraping:', error);
    throw new Error(`Falha ao realizar scraping: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    if (browserInstance) {
      await closeBrowser(browserInstance);
    }
  }
}

/**
 * @function saveAdsToDatabase
 * Salva os anúncios coletados no banco de dados usando Prisma.
 * @param {AdData[]} ads Um array de objetos AdData para salvar.
 * @returns {Promise<void>}
 */
export async function saveAdsToDatabase(ads: AdData[]): Promise<void> {
  if (ads.length === 0) {
    console.log('Nenhum anúncio para salvar no banco de dados.');
    return;
  }

  console.log(`Tentando salvar ${ads.length} anúncios no banco de dados...`);
  try {
    for (const ad of ads) {
      const existingAd = await prisma.ad.findUnique({
        where: { adId: ad.adId },
      });

      if (existingAd) {
        await prisma.ad.update({
          where: { id: existingAd.id },
          data: {
            ...ad,
            platformSpecificData: ad.platformSpecificData ? JSON.stringify(ad.platformSpecificData) : undefined,
          },
        });
        console.log(`Anúncio atualizado: ${ad.adId}`);
      } else {
        await prisma.ad.create({
          data: {
            ...ad,
            platformSpecificData: ad.platformSpecificData ? JSON.stringify(ad.platformSpecificData) : undefined,
          },
        });
        console.log(`Anúncio criado: ${ad.adId}`);
      }
    }
    console.log('Todos os anúncios foram processados e salvos/atualizados no banco de dados.');
  } catch (error) {
    console.error('Erro ao salvar anúncios no banco de dados:', error);
    throw new Error(`Falha ao salvar anúncios: ${error instanceof Error ? error.message : String(error)}`);
  }
}