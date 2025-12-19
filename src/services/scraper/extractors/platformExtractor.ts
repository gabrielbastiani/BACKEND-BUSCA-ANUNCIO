// src/services/scraper/extractors/platformExtractor.ts

export class PlatformExtractor {
  private platformIconMap: { [key: string]: string } = {
    '-75px -309px': 'Facebook',
    '-75px -668px': 'Instagram',
    '-32px -1333px': 'Messenger',
    '-58px -1333px': 'Audience Network',
    '-45px -309px': 'WhatsApp',
    '-84px -1333px': 'Threads',
  };

  extract(card: Element): string[] {
    const platforms: string[] = [];

    // 1. Busca seção "Plataformas"
    const platformsSection = this.findPlatformsSection(card);

    if (platformsSection) {
      // 2. Extrai por CSS Sprites
      const spritePlatforms = this.extractFromSprites(platformsSection);
      platforms.push(...spritePlatforms);

      // 3. Fallback: inferir por ordem se não mapeou
      if (spritePlatforms.length === 0) {
        const inferredPlatforms = this.inferFromOrder(platformsSection);
        platforms.push(...inferredPlatforms);
      }
    }

    // 4. Fallback: busca por aria-labels
    if (platforms.length === 0) {
      const ariaLabelPlatforms = this.extractFromAriaLabels(card);
      platforms.push(...ariaLabelPlatforms);
    }

    // 5. Default
    if (platforms.length === 0) {
      platforms.push('Facebook');
    }

    return [...new Set(platforms)]; // Remove duplicatas
  }

  private findPlatformsSection(card: Element): Element | null {
    const allSpans = Array.from(card.querySelectorAll('span, div'));

    for (const span of allSpans) {
      const text = span.textContent?.trim().toLowerCase() || '';
      if (text === 'plataformas' || text === 'platforms') {
        return span.parentElement;
      }
    }

    return null;
  }

  private extractFromSprites(section: Element): string[] {
    const platforms: string[] = [];
    const iconElements = Array.from(section.querySelectorAll('div[style*="mask-image"]'));

    iconElements.forEach(icon => {
      const style = icon.getAttribute('style') || '';
      const maskPosMatch = style.match(/mask-position:\s*([^;]+)/i);

      if (maskPosMatch) {
        const maskPosition = maskPosMatch[1].trim();
        const platform = this.platformIconMap[maskPosition];

        if (platform && !platforms.includes(platform)) {
          platforms.push(platform);
          console.log(`      ✅ Plataforma: ${platform} (${maskPosition})`);
        } else if (!platform) {
          console.log(`      ⚠️ Posição desconhecida: ${maskPosition}`);
        }
      }
    });

    return platforms;
  }

  private inferFromOrder(section: Element): string[] {
    const platforms: string[] = [];
    const iconElements = Array.from(section.querySelectorAll('div[style*="mask-image"]'));
    const commonOrder = ['Facebook', 'Instagram', 'Messenger', 'Audience Network'];

    iconElements.forEach((icon, idx) => {
      if (idx < commonOrder.length) {
        platforms.push(commonOrder[idx]);
      }
    });

    if (platforms.length > 0) {
      console.log(`      ℹ️ Plataformas inferidas: ${platforms.join(', ')}`);
    }

    return platforms;
  }

  private extractFromAriaLabels(card: Element): string[] {
    const platforms: string[] = [];
    const allElements = Array.from(card.querySelectorAll('*'));

    allElements.forEach(el => {
      const ariaLabel = el.getAttribute('aria-label')?.toLowerCase() || '';
      const alt = el.getAttribute('alt')?.toLowerCase() || '';
      const title = el.getAttribute('title')?.toLowerCase() || '';
      const combined = `${ariaLabel} ${alt} ${title}`;

      if (combined.includes('facebook') && !platforms.includes('Facebook')) {
        platforms.push('Facebook');
      }
      if (combined.includes('instagram') && !platforms.includes('Instagram')) {
        platforms.push('Instagram');
      }
      if (combined.includes('messenger') && !platforms.includes('Messenger')) {
        platforms.push('Messenger');
      }
      if (combined.includes('whatsapp') && !platforms.includes('WhatsApp')) {
        platforms.push('WhatsApp');
      }
      if (combined.includes('threads') && !platforms.includes('Threads')) {
        platforms.push('Threads');
      }
      if (combined.includes('audience') && !platforms.includes('Audience Network')) {
        platforms.push('Audience Network');
      }
    });

    return platforms;
  }
}

export default new PlatformExtractor();
