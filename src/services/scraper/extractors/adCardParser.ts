// src/services/scraper/extractors/adCardParser.ts

import platformExtractor from './platformExtractor';
import dateExtractor from './dateExtractor';
import textExtractor from './textExtractor';
import mediaExtractor from './mediaExtractor';

export interface ParsedAdData {
  libraryId: string;
  pageName: string;
  adText: string;
  imageUrl: string;
  videoUrl: string;
  adLink: string;
  platforms: string[];
  mediaType: string;
  startDate: string;
  startDateObj: Date | null;
  activeDays: number | null;
  activeTimeStr: string;
  fullText: string;
  containerHTML: string;
}

export class AdCardParser {
  parse(card: Element, idx: number): ParsedAdData | null {
    try {
      const fullText = card.textContent || '';

      // 1. Extrair dados básicos
      const libraryId = textExtractor.extractLibraryId(fullText);
      const pageName = textExtractor.extractPageName(card);

      // 2. Extrair datas
      const dateData = dateExtractor.extract(fullText);

      // 3. Extrair plataformas
      const platforms = platformExtractor.extract(card);

      // 4. Extrair texto do anúncio
      const adText = textExtractor.extractAdText(card, pageName);

      // 5. Extrair mídias
      const mediaData = mediaExtractor.extract(card);

      // Validação
      const isValid = pageName.length >= 2 && 
                     pageName.toLowerCase() !== 'patrocinado' &&
                     (mediaData.imageUrl || mediaData.videoUrl);

      if (!isValid) {
        return null;
      }

      // Log
      console.log(`✅ Anúncio ${idx + 1}:`);
      console.log(`   Nome: ${pageName}`);
      console.log(`   Library ID: ${libraryId || 'N/A'}`);
      console.log(`   Plataformas: ${platforms.join(', ')}`);
      console.log(`   Data: ${dateData.startDateStr || 'N/A'}`);
      console.log(`   Ativo: ${dateData.activeTimeStr || 'N/A'} (${dateData.activeDays !== null ? dateData.activeDays + 'd' : 'N/A'})`);

      return {
        libraryId,
        pageName,
        adText,
        ...mediaData,
        platforms,
        startDate: dateData.startDateStr,
        startDateObj: dateData.startDate,
        activeDays: dateData.activeDays,
        activeTimeStr: dateData.activeTimeStr,
        fullText,
        containerHTML: card.outerHTML.substring(0, 6000),
      };

    } catch (error) {
      console.error(`❌ Erro no card ${idx}:`, error);
      return null;
    }
  }
}

export default new AdCardParser();
