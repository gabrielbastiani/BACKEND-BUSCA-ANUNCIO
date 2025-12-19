// src/services/facebookAdsScraperService.ts - VERSÃO CORRIGIDA

import { AdScraperParams, ScrapedAd, ScraperResult, AdFilters } from '../@types/ad.types';
import { AdScraperHelpers } from '../utils/adScraperHelpers';
import { AdDataExtractor } from '../utils/adDataExtractor';
import browserService from './scraper/utils/browserService';
import mediaDownloader from './scraper/utils/mediaDownloader';
import databaseService from './scraper/utils/databaseService';

export class FacebookAdsScraperService {
  private maxRetries: number = 5;

  private buildSearchUrl(keyword: string, country: string, filters?: AdFilters): string {
    const baseUrl = 'https://www.facebook.com/ads/library/';
    const keywordWithQuotes = `"${keyword}"`;

    const params: any = {
      active_status: filters?.activeStatus || 'all',
      ad_type: 'all',
      country: country,
      media_type: filters?.mediaType || 'all',
      q: keywordWithQuotes,
      search_type: 'keyword_exact_phrase',
    };

    if (filters?.impressionsDateFrom) {
      params.start_date = filters.impressionsDateFrom;
    }
    if (filters?.impressionsDateTo) {
      params.end_date = filters.impressionsDateTo;
    }

    const searchParams = new URLSearchParams(params);
    return `${baseUrl}?${searchParams.toString()}`;
  }

  private async navigateWithRetry(keyword: string, country: string, filters?: AdFilters): Promise<void> {
    const page = browserService.getPage();
    const searchUrl = this.buildSearchUrl(keyword, country, filters);

    console.log(`🌐 URL: ${searchUrl}`);

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        console.log(`\n🔄 Tentativa ${attempt}/${this.maxRetries}`);

        const response = await page.goto(searchUrl, {
          waitUntil: 'domcontentloaded',
          timeout: 45000
        });

        console.log(`📊 Status: ${response?.status()}`);
        await browserService.wait(3000);

        const currentUrl = page.url();
        if (currentUrl.includes('/login') || currentUrl.includes('/checkpoint')) {
          await browserService.saveScreenshot(`error_login_attempt_${attempt}`);
          throw new Error('Facebook requer login');
        }

        await browserService.acceptCookies();
        await browserService.wait(2000);

        console.log('⏳ Aguardando conteúdo...');
        let contentLoaded = false;

        for (let i = 0; i < 10; i++) {
          await browserService.wait(2000);
          contentLoaded = await browserService.hasAdsContent();
          if (contentLoaded) {
            console.log('✅ Conteúdo detectado!');
            break;
          }
          console.log(`   Aguardando... (${i + 1}/10)`);
        }

        if (!contentLoaded && attempt < this.maxRetries) {
          console.log('🔄 Tentando reload...');
          await browserService.wait(2000);
          continue;
        }

        await browserService.saveScreenshot(`success_attempt_${attempt}`);
        console.log('✅ Página carregada!');
        return;

      } catch (error: any) {
        console.error(`❌ Erro na tentativa ${attempt}:`, error.message);
        await browserService.saveScreenshot(`error_attempt_${attempt}`);

        if (attempt === this.maxRetries) {
          throw new Error(`Falha após ${this.maxRetries} tentativas: ${error.message}`);
        }

        const delay = 3000 + (attempt * 2000);
        console.log(`⏳ Aguardando ${delay}ms...`);
        await browserService.wait(delay);
      }
    }
  }

  private async scrapeAds(keyword: string, country: string, maxAds: number, filters?: AdFilters): Promise<ScrapedAd[]> {
    const page = browserService.getPage();
    const scrapedAds: ScrapedAd[] = [];

    console.log('\n📊 Iniciando coleta...');
    console.log(`🎯 Meta: ${maxAds} anúncios`);

    try {
      let scrollAttempts = 0;
      const maxScrollAttempts = 60;
      let consecutiveNoNewAds = 0;
      const maxConsecutiveNoNewAds = 8;

      // Scroll inicial
      console.log('📜 Scroll inicial...');
      for (let i = 0; i < 10; i++) {
        await page.evaluate(() => window.scrollBy(0, window.innerHeight * 2));
        await browserService.wait(1500);
      }
      await browserService.wait(3000);

      while (scrapedAds.length < maxAds && scrollAttempts < maxScrollAttempts) {
        console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        console.log(`📜 Rodada ${scrollAttempts + 1}/${maxScrollAttempts}`);
        console.log(`📊 Coletados: ${scrapedAds.length}/${maxAds}`);
        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

        if (scrollAttempts > 0) {
          await page.evaluate(() => window.scrollBy(0, window.innerHeight * 1.8));
          await browserService.wait(2000 + Math.random() * 1000);
        }

        // EXTRAÇÃO DIRETA NO EVALUATE - SEM STRING EXTERNA
        const adsRawData = await page.evaluate(() => {
          // Toda a lógica DENTRO do evaluate para evitar problemas de sintaxe
          const results: any[] = [];

          const adCards = Array.from(document.querySelectorAll('[role="article"]'));
          console.log(`Encontrados ${adCards.length} cards`);

          if (adCards.length === 0) {
            const allDivs = Array.from(document.querySelectorAll('div'));
            const potentialCards = allDivs.filter(div => {
              const text = div.innerText || '';
              return text.includes('Identificação da biblioteca') || text.includes('Library ID');
            });
            adCards.push(...potentialCards);
          }

          adCards.forEach((card, idx) => {
            try {
              const fullText = card.textContent || '';

              // 1. Library ID
              let libraryId = '';
              const libMatch = fullText.match(/Identificação da biblioteca[:\s]*(\d+)/i) ||
                              fullText.match(/Library ID[:\s]*(\d+)/i);
              if (libMatch) libraryId = libMatch[1];

              // 2. Nome da página (SIMPLIFICADO)
              let pageName = '';
              const links = Array.from(card.querySelectorAll('a[href]'));
              for (const link of links) {
                const text = link.textContent?.trim() || '';
                const href = link.getAttribute('href') || '';

                if (text.length >= 3 && 
                    text.length <= 150 &&
                    !text.toLowerCase().includes('patrocinado') &&
                    !text.toLowerCase().includes('anúncios') &&
                    !href.includes('/ads/library')) {
                  pageName = text;
                  break;
                }
              }

              // 3. Texto do anúncio (SIMPLIFICADO - PEGA MAIOR TEXTO)
              let adText = '';
              const allDivs = Array.from(card.querySelectorAll('div[dir="auto"]'));

              for (const div of allDivs) {
                const text = (div as HTMLElement).innerText?.trim() || '';

                if (text.length > adText.length &&
                    text.length >= 20 &&
                    text.length <= 5000 &&
                    text !== pageName &&
                    !text.toLowerCase().includes('patrocinado') &&
                    !text.toLowerCase().includes('identificação') &&
                    !text.toLowerCase().includes('veiculação')) {
                  adText = text;
                }
              }

              // 4. Plataformas (SIMPLIFICADO)
              const platforms: string[] = [];
              const platformsText = fullText.toLowerCase();

              if (platformsText.includes('facebook') || !platforms.length) platforms.push('Facebook');
              if (platformsText.includes('instagram') && !platforms.includes('Instagram')) platforms.push('Instagram');
              if (platformsText.includes('messenger') && !platforms.includes('Messenger')) platforms.push('Messenger');

              // 5. Data e dias ativos (SIMPLIFICADO)
              let startDate = '';
              const dateMatch = fullText.match(/(\d{1,2})\s+de\s+(\w+)\s+de\s+(\d{4})/i);
              if (dateMatch) {
                const months: any = {
                  'jan': '01', 'fev': '02', 'mar': '03', 'abr': '04',
                  'mai': '05', 'jun': '06', 'jul': '07', 'ago': '08',
                  'set': '09', 'out': '10', 'nov': '11', 'dez': '12'
                };
                const month = months[dateMatch[2].substring(0, 3).toLowerCase()] || '01';
                startDate = `${dateMatch[3]}-${month}-${dateMatch[1].padStart(2, '0')}`;
              }

              let activeDays: number | null = null;
              const timeMatch = fullText.match(/(\d+)\s*h(?:ora)?/i);
              if (timeMatch) {
                const hours = parseInt(timeMatch[1]);
                activeDays = hours < 24 ? 0 : Math.floor(hours / 24);
              }

              // 6. Imagem
              let imageUrl = '';
              const images = Array.from(card.querySelectorAll('img'));
              for (const img of images) {
                const src = (img as HTMLImageElement).src || '';
                if (src.includes('scontent') && !src.includes('emoji') && !src.includes('profile')) {
                  imageUrl = src;
                  break;
                }
              }

              // 7. Vídeo
              let videoUrl = '';
              const video = card.querySelector('video');
              if (video) {
                videoUrl = (video as HTMLVideoElement).src || '';
                if (!videoUrl) {
                  const source = video.querySelector('source');
                  if (source) videoUrl = (source as HTMLSourceElement).src || '';
                }
              }

              // Validação
              if (pageName && pageName.length >= 2 && (imageUrl || videoUrl)) {
                results.push({
                  libraryId,
                  pageName,
                  adText,
                  imageUrl,
                  videoUrl,
                  platforms,
                  startDate,
                  activeDays,
                  mediaType: videoUrl ? 'video' : 'image',
                  fullText: fullText.substring(0, 500)
                });

                console.log(`Card ${idx + 1}: ${pageName} | Texto: ${adText ? 'SIM' : 'NÃO'} | Dias: ${activeDays}`);
              }
            } catch (error) {
              console.error(`Erro no card ${idx}:`, error);
            }
          });

          return results;
        });

        console.log(`   🔍 Extraídos ${adsRawData.length} anúncios`);

        let newAdsCount = 0;

        for (let i = 0; i < adsRawData.length && scrapedAds.length < maxAds; i++) {
          const adData = adsRawData[i];

          try {
            console.log(`\n   📋 [${scrapedAds.length + 1}/${maxAds}] ${adData.pageName}`);
            console.log(`      Texto: ${adData.adText ? 'SIM (' + adData.adText.length + ' chars)' : 'NÃO'}`);

            const extractedData = AdDataExtractor.extractAllData(adData.fullText, '');

            const adIdentifier = adData.libraryId || 
                                `${adData.pageName.replace(/[^a-zA-Z0-9]/g, '')}_${Date.now()}_${scrapedAds.length}`;

            let localImageUrl: string | null = null;
            let localVideoUrl: string | null = null;

            if (adData.imageUrl) {
              localImageUrl = await mediaDownloader.download(adData.imageUrl, adIdentifier, 'image');
            }

            if (adData.videoUrl) {
              localVideoUrl = await mediaDownloader.download(adData.videoUrl, adIdentifier, 'video');
            }

            // ID SEMPRE ÚNICO
            const uniqueAdId = adData.libraryId 
              ? `${adData.libraryId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
              : `fb_ad_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

            const cleanedAdText = adData.adText ? AdScraperHelpers.cleanText(adData.adText) : null;

            const scrapedAd: ScrapedAd = {
              adId: uniqueAdId,
              pageName: adData.pageName,
              adText: cleanedAdText || undefined,
              adImageUrl: localImageUrl || adData.imageUrl || undefined,
              adVideoUrl: localVideoUrl || adData.videoUrl || undefined,
              adCreativeUrl: localImageUrl || localVideoUrl || adData.imageUrl || adData.videoUrl || undefined,
              adLink: undefined,
              adPlatform: adData.platforms.join(', '),
              language: 'pt-BR',
              mediaType: adData.mediaType,
              libraryId: adData.libraryId || undefined,
              startDate: adData.startDate ? new Date(adData.startDate) : undefined,
              endDate: extractedData.endDate || undefined,
              impressionsMin: 100,
              impressionsMax: 1000,
              impressionsDateFrom: adData.startDate ? new Date(adData.startDate) : undefined,
              impressionsDateTo: new Date(),
              activeDays: adData.activeDays !== null ? adData.activeDays : undefined,
              status: 'ATIVO',
              activeStatus: 'active',
              isActive: true,
              keyword,
              country,
              currency: 'BRL',
              platformSpecificData: {
                rawData: { pageName: adData.pageName, platforms: adData.platforms },
                extractedData,
                dataQuality: { libraryId: adData.libraryId ? 'confirmed' : 'missing' },
                scrapedAt: new Date().toISOString(),
                appliedFilters: filters
              }
            };

            scrapedAds.push(scrapedAd);
            newAdsCount++;

            console.log(`      ✅ Adicionado! Total: ${scrapedAds.length}/${maxAds}`);

          } catch (error: any) {
            console.error(`      ❌ Erro:`, error.message);
          }
        }

        console.log(`\n   📊 Novos: ${newAdsCount}`);

        if (newAdsCount === 0) {
          consecutiveNoNewAds++;
          if (consecutiveNoNewAds >= maxConsecutiveNoNewAds) {
            console.log(`\n⏹️ Parando`);
            break;
          }
        } else {
          consecutiveNoNewAds = 0;
        }

        scrollAttempts++;

        if (scrapedAds.length >= maxAds) {
          console.log(`\n🎯 Meta atingida!`);
          break;
        }
      }

      console.log(`\n✅ COLETA FINALIZADA: ${scrapedAds.length} anúncios`);
      console.log(`📝 Com adText: ${scrapedAds.filter(ad => ad.adText).length}`);

      return scrapedAds;

    } catch (error) {
      console.error('❌ Erro:', error);
      throw error;
    }
  }

  async scrapeAndSave(params: AdScraperParams): Promise<ScraperResult> {
    const errors: string[] = [];
    let ads: ScrapedAd[] = [];

    try {
      console.log('\n🚀 ========== INICIANDO ==========');

      await browserService.init();
      mediaDownloader.setPage(browserService.getPage());

      await this.navigateWithRetry(params.keyword, params.country || 'BR', params.filters);
      ads = await this.scrapeAds(params.keyword, params.country || 'BR', params.maxAds || 50, params.filters);

      if (ads.length > 0) {
        const saveResult = await databaseService.saveAds(ads);

        console.log(`\n📊 Resumo:`);
        console.log(`   Coletados: ${ads.length}`);
        console.log(`   Salvos: ${saveResult.saved}`);
        console.log(`   Falhados: ${saveResult.failed}`);

        if (saveResult.failed > 0) {
          errors.push(...saveResult.errors);
        }
      }

      console.log('\n🎉 ========== CONCLUÍDO ==========');

      return {
        success: true,
        totalAdsCollected: ads.length,
        ads,
        filters: params.filters,
        errors: errors.length > 0 ? errors : undefined
      };

    } catch (error: any) {
      console.error('\n❌ ========== ERRO ==========');
      console.error(error.message);
      errors.push(error.message);

      return {
        success: false,
        totalAdsCollected: ads.length,
        ads,
        filters: params.filters,
        errors
      };

    } finally {
      await browserService.close();
      await databaseService.disconnect();
    }
  }

  async scrapeOnly(params: AdScraperParams): Promise<ScraperResult> {
    return this.scrapeAndSave(params);
  }
}

export default new FacebookAdsScraperService();