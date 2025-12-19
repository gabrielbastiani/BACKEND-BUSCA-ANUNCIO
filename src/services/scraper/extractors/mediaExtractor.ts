// src/services/scraper/extractors/mediaExtractor.ts - CORRIGIDO

export interface MediaExtractionResult {
  imageUrl: string;
  videoUrl: string;
  adLink: string;
  mediaType: string;
}

export class MediaExtractor {
  extract(card: Element): MediaExtractionResult {
    return {
      imageUrl: this.extractImage(card),
      videoUrl: this.extractVideo(card),
      adLink: this.extractLink(card),
      mediaType: this.determineMediaType(card)
    };
  }

  private extractImage(card: Element): string {
    let imageUrl = '';
    let bestImageQuality = 0;
    const images = Array.from(card.querySelectorAll('img'));

    for (const img of images) {
      const imgElement = img as HTMLImageElement;
      const src = imgElement.currentSrc || imgElement.src || '';

      if (!this.isValidImageUrl(src)) {
        continue;
      }

      const srcset = imgElement.srcset || imgElement.getAttribute('srcset') || '';
      if (srcset) {
        const sources = srcset.split(',').map(s => {
          const parts = s.trim().split(' ');
          return { url: parts[0], width: parts[1] ? parseInt(parts[1]) : 0 };
        });
        sources.sort((a, b) => b.width - a.width);
        if (sources[0] && sources[0].width > bestImageQuality) {
          imageUrl = sources[0].url;
          bestImageQuality = sources[0].width;
        }
      }

      const naturalWidth = imgElement.naturalWidth || 0;
      if (src && naturalWidth > bestImageQuality && naturalWidth > 50) {
        imageUrl = src;
        bestImageQuality = naturalWidth;
      }
    }

    if (!imageUrl) {
      for (const img of images) {
        const src = (img as HTMLImageElement).currentSrc || 
                   (img as HTMLImageElement).src || '';
        if (this.isValidImageUrl(src)) {
          imageUrl = src;
          break;
        }
      }
    }

    return imageUrl;
  }

  private extractVideo(card: Element): string {
    const video = card.querySelector('video');
    if (!video) return '';

    const vid = video as HTMLVideoElement;
    let videoUrl = vid.currentSrc || vid.src || '';

    if (!videoUrl) {
      const source = video.querySelector('source');
      if (source) {
        videoUrl = (source as HTMLSourceElement).src || '';
      }
    }

    return videoUrl;
  }

  private extractLink(card: Element): string {
    const links = Array.from(card.querySelectorAll('a[href]'));

    for (const link of links) {
      const href = link.getAttribute('href') || '';
      if (href.startsWith('http') && 
          !href.includes('facebook.com/ads') &&
          !href.includes('facebook.com/business')) {
        return href;
      }
    }

    return '';
  }

  private determineMediaType(card: Element): string {
    const video = card.querySelector('video');
    if (video) return 'video';

    const images = Array.from(card.querySelectorAll('img'));
    const validImages = images.filter(img => {
      const src = (img as HTMLImageElement).src || '';
      return src.includes('scontent') || src.includes('fbcdn');
    });

    const carouselIndicators = card.querySelectorAll('[aria-label*="carousel"], [class*="carousel"]');

    if (carouselIndicators.length > 0 || validImages.length > 1) {
      return 'carousel';
    }

    return validImages.length > 0 ? 'image' : 'unknown';
  }

  // CORREÇÃO: Garantir retorno booleano
  private isValidImageUrl(src: string): boolean {
    // Verifica se src não é vazio
    if (!src || src.length === 0) {
      return false;
    }

    // Todas as outras verificações
    return src.startsWith('http') &&
           (src.includes('scontent') || src.includes('fbcdn')) &&
           !src.includes('emoji') &&
           !src.includes('static') &&
           !src.includes('pixel') &&
           !src.includes('profile_pic');
  }
}

export default new MediaExtractor();