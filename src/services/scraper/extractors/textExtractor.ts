// src/services/scraper/extractors/textExtractor.ts

export class TextExtractor {
  extractPageName(card: Element): string {
    let pageName = '';

    // Método 1: Links com aria-label
    const pageLinks = Array.from(card.querySelectorAll('a[aria-label]'));
    for (const link of pageLinks) {
      const ariaLabel = link.getAttribute('aria-label') || '';
      const href = link.getAttribute('href') || '';

      if (ariaLabel.length >= 3 && 
          ariaLabel.length <= 150 &&
          !ariaLabel.toLowerCase().includes('ver detalhes') &&
          !ariaLabel.toLowerCase().includes('see details') &&
          !href.includes('/ads/library')) {
        pageName = ariaLabel;
        break;
      }
    }

    // Método 2: Headings
    if (!pageName) {
      const headings = Array.from(card.querySelectorAll('strong, span[dir="auto"]'));
      for (const h of headings) {
        const text = h.textContent?.trim() || '';
        if (text.length >= 3 && 
            text.length <= 150 &&
            text.toLowerCase() !== 'patrocinado' &&
            text.toLowerCase() !== 'sponsored') {
          pageName = text;
          break;
        }
      }
    }

    return pageName;
  }

  extractAdText(card: Element, pageName: string): string {
    let adText = '';
    let bestTextLength = 0;

    // Método 1: div[dir="auto"]
    const textDivs = Array.from(card.querySelectorAll('div[dir="auto"]'));
    for (const div of textDivs) {
      const text = (div as HTMLElement).innerText?.trim() || '';

      if (this.isValidAdText(text, pageName, bestTextLength)) {
        adText = text;
        bestTextLength = text.length;
      }
    }

    // Método 2: Linhas do fullText
    if (!adText || adText.length < 40) {
      const fullText = card.textContent || '';
      const lines = fullText.split('\n');

      for (const line of lines) {
        const cleanLine = line.trim();

        if (this.isMetadataLine(cleanLine, pageName)) {
          continue;
        }

        if (cleanLine.length > bestTextLength && 
            cleanLine.length >= 20 &&
            cleanLine.length <= 5000) {
          adText = cleanLine;
          bestTextLength = cleanLine.length;
        }
      }
    }

    return adText;
  }

  extractLibraryId(fullText: string): string {
    const libraryIdMatch = fullText.match(/Identificação da biblioteca[:\s]*(\d+)/i) ||
                          fullText.match(/Library ID[:\s]*(\d+)/i);
    return libraryIdMatch ? libraryIdMatch[1] : '';
  }

  private isValidAdText(text: string, pageName: string, minLength: number): boolean {
    return text.length > minLength && 
           text.length >= 20 && 
           text.length <= 5000 &&
           text !== pageName &&
           !text.toLowerCase().startsWith('patrocinado') &&
           !text.toLowerCase().startsWith('veiculação') &&
           !text.toLowerCase().startsWith('identificação') &&
           !text.toLowerCase().startsWith('tempo total');
  }

  private isMetadataLine(line: string, pageName: string): boolean {
    const lower = line.toLowerCase();
    return lower.includes('patrocinado') ||
           lower.includes('veiculação') ||
           lower.includes('identificação') ||
           lower.includes('tempo total') ||
           line === pageName;
  }
}

export default new TextExtractor();
