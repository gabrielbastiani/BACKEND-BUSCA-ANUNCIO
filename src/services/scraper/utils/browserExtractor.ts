// src/services/scraper/utils/browserExtractor.ts - VERSÃO CORRIGIDA

export const browserExtractorFunction = `
(function() {
  const platformIconMap = {
    '-75px -309px': 'Facebook',
    '-75px -668px': 'Instagram',
    '-32px -1333px': 'Messenger',
    '-58px -1333px': 'Audience Network',
    '-45px -309px': 'WhatsApp',
    '-84px -1333px': 'Threads',
  };

  const monthMapPT = {
    'janeiro': '01', 'jan': '01',
    'fevereiro': '02', 'fev': '02',
    'março': '03', 'mar': '03',
    'abril': '04', 'abr': '04',
    'maio': '05', 'mai': '05',
    'junho': '06', 'jun': '06',
    'julho': '07', 'jul': '07',
    'agosto': '08', 'ago': '08',
    'setembro': '09', 'set': '09',
    'outubro': '10', 'out': '10',
    'novembro': '11', 'nov': '11',
    'dezembro': '12', 'dez': '12'
  };

  const monthMapEN = {
    'january': '01', 'jan': '01',
    'february': '02', 'feb': '02',
    'march': '03', 'mar': '03',
    'april': '04', 'apr': '04',
    'may': '05',
    'june': '06', 'jun': '06',
    'july': '07', 'jul': '07',
    'august': '08', 'aug': '08',
    'september': '09', 'sep': '09',
    'october': '10', 'oct': '10',
    'november': '11', 'nov': '11',
    'december': '12', 'dec': '12'
  };

  function extractPlatforms(card) {
    const platforms = [];
    const allSpans = Array.from(card.querySelectorAll('span, div'));
    let platformsSection = null;

    for (const span of allSpans) {
      const text = (span.textContent || '').trim().toLowerCase();
      if (text === 'plataformas' || text === 'platforms') {
        platformsSection = span.parentElement;
        break;
      }
    }

    if (platformsSection) {
      const iconElements = Array.from(platformsSection.querySelectorAll('div[style*="mask-image"]'));

      iconElements.forEach(icon => {
        const style = icon.getAttribute('style') || '';
        const maskPosMatch = style.match(/mask-position:\\s*([^;]+)/i);

        if (maskPosMatch) {
          const maskPosition = maskPosMatch[1].trim();
          const platform = platformIconMap[maskPosition];

          if (platform && !platforms.includes(platform)) {
            platforms.push(platform);
          }
        }
      });
    }

    if (platforms.length === 0) {
      const allElements = Array.from(card.querySelectorAll('*'));
      allElements.forEach(el => {
        const ariaLabel = (el.getAttribute('aria-label') || '').toLowerCase();
        const alt = (el.getAttribute('alt') || '').toLowerCase();
        const combined = ariaLabel + ' ' + alt;

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
    }

    if (platforms.length === 0) {
      platforms.push('Facebook');
    }

    return platforms;
  }

  function extractStartDate(lines) {
    for (const line of lines) {
      const trimmedLine = line.trim();

      const matchPT = trimmedLine.match(/Veiculação iniciada em\\s+(\\d{1,2})\\s+de\\s+(\\w+)\\s+de\\s+(\\d{4})/i);
      if (matchPT) {
        const day = matchPT[1];
        const monthName = matchPT[2].toLowerCase();
        const year = matchPT[3];

        for (const [fullMonth, monthNum] of Object.entries(monthMapPT)) {
          if (monthName.includes(fullMonth.substring(0, 3))) {
            const dateStr = year + '-' + monthNum + '-' + day.padStart(2, '0');
            return { date: dateStr, raw: line };
          }
        }
      }

      const matchEN = trimmedLine.match(/Started running on\\s+(\\w+)\\s+(\\d{1,2}),\\s+(\\d{4})/i);
      if (matchEN) {
        const monthName = matchEN[1].toLowerCase();
        const day = matchEN[2];
        const year = matchEN[3];

        for (const [fullMonth, monthNum] of Object.entries(monthMapEN)) {
          if (monthName.includes(fullMonth.substring(0, 3))) {
            const dateStr = year + '-' + monthNum + '-' + day.padStart(2, '0');
            return { date: dateStr, raw: line };
          }
        }
      }
    }

    return { date: '', raw: '' };
  }

  function extractActiveDays(lines) {
    for (const line of lines) {
      const trimmedLine = line.trim();

      const matchPT = trimmedLine.match(/Tempo total ativo[:\\s]*(.+?)$/i);
      if (matchPT) {
        const timeStr = matchPT[1].trim();
        const days = parseActiveDays(timeStr);
        return { days: days, raw: timeStr };
      }

      const matchEN = trimmedLine.match(/Total time active[:\\s]*(.+?)$/i);
      if (matchEN) {
        const timeStr = matchEN[1].trim();
        const days = parseActiveDays(timeStr);
        return { days: days, raw: timeStr };
      }
    }

    return { days: null, raw: '' };
  }

  function parseActiveDays(timeStr) {
    // Remove caracteres extras
    const cleanStr = timeStr.replace(/Plataformas|​|\\s+/g, ' ').trim();

    const hoursMatch = cleanStr.match(/(\\d+)\\s*h(?:ora)?/i);
    const daysMatch = cleanStr.match(/(\\d+)\\s*dia/i);
    const weeksMatch = cleanStr.match(/(\\d+)\\s*semana/i);
    const monthsMatch = cleanStr.match(/(\\d+)\\s*m[eê]s/i);

    if (hoursMatch) {
      const hours = parseInt(hoursMatch[1]);
      return hours < 24 ? 0 : Math.floor(hours / 24);
    } else if (daysMatch) {
      return parseInt(daysMatch[1]);
    } else if (weeksMatch) {
      return parseInt(weeksMatch[1]) * 7;
    } else if (monthsMatch) {
      return parseInt(monthsMatch[1]) * 30;
    }

    return null;
  }

  // CORREÇÃO CRÍTICA: extractPageName
  function extractPageName(card) {
    // Método 1: Busca link específico da página (antes de "Patrocinado")
    const allLinks = Array.from(card.querySelectorAll('a[href]'));

    for (const link of allLinks) {
      const href = link.getAttribute('href') || '';
      const text = (link.textContent || '').trim();

      // Ignora links de anúncios, políticas, etc
      if (href.includes('/ads/library') || 
          href.includes('/policies') ||
          href.includes('facebook.com/business') ||
          text.toLowerCase() === 'patrocinado' ||
          text.toLowerCase() === 'sponsored' ||
          text.toLowerCase().includes('ver detalhes') ||
          text.toLowerCase().includes('anúncios usam') ||
          text.toLowerCase().includes('esse criativo')) {
        continue;
      }

      // Link de perfil geralmente tem formato /username/ ou aria-label com nome
      if ((href.startsWith('https://www.facebook.com/') || href.startsWith('/')) &&
          !href.includes('?') &&
          text.length >= 3 &&
          text.length <= 150) {
        return text;
      }

      // Verifica aria-label
      const ariaLabel = link.getAttribute('aria-label') || '';
      if (ariaLabel.length >= 3 && 
          ariaLabel.length <= 150 &&
          !ariaLabel.toLowerCase().includes('ver detalhes')) {
        return ariaLabel;
      }
    }

    // Método 2: Busca por strong/span ANTES de "Patrocinado"
    const allElements = Array.from(card.querySelectorAll('strong, span[dir="auto"], h2, h3, h4'));
    let foundPatrocinado = false;

    for (const el of allElements) {
      const text = (el.textContent || '').trim();

      if (text.toLowerCase() === 'patrocinado' || text.toLowerCase() === 'sponsored') {
        foundPatrocinado = true;
        continue;
      }

      // Se já passou por "Patrocinado", ignora
      if (foundPatrocinado) continue;

      // Ignora textos inválidos
      if (text.toLowerCase().includes('anúncios usam') ||
          text.toLowerCase().includes('esse criativo') ||
          text.toLowerCase().includes('identificação') ||
          text.toLowerCase().includes('veiculação') ||
          text.toLowerCase().includes('tempo total') ||
          text.toLowerCase() === 'ativo' ||
          text.length < 3 ||
          text.length > 150) {
        continue;
      }

      return text;
    }

    return '';
  }

  // Dentro de browserExtractor.ts, na função extractAdText:

function extractAdText(card, pageName) {
  let adText = '';
  let bestLength = 0;

  console.log('🔍 Extraindo texto para: ' + pageName);

  const textDivs = Array.from(card.querySelectorAll('div[dir="auto"]'));
  console.log('   Encontrados ' + textDivs.length + ' divs com dir="auto"');

  for (const div of textDivs) {
    const text = (div.innerText || '').trim();

    // Log cada texto encontrado
    if (text.length >= 20 && text.length <= 5000) {
      console.log('   Candidato: ' + text.substring(0, 50) + '... (' + text.length + ' chars)');
    }

    if (text.length > bestLength && 
        text.length >= 20 && 
        text.length <= 5000 &&
        text !== pageName &&
        !text.toLowerCase().startsWith('patrocinado') &&
        !text.toLowerCase().startsWith('veiculação') &&
        !text.toLowerCase().startsWith('identificação')) {
      adText = text;
      bestLength = text.length;
      console.log('   ✅ MELHOR texto até agora: ' + text.substring(0, 50) + '...');
    }
  }

  if (!adText || adText.length < 40) {
    console.log('   ⚠️ Texto muito curto, tentando fallback...');
    const fullText = card.textContent || '';
    const lines = fullText.split('\n');

    let foundPatrocinado = false;

    for (const line of lines) {
      const trimmedLine = line.trim();

      if (trimmedLine.toLowerCase() === 'patrocinado' || 
          trimmedLine.toLowerCase() === 'sponsored') {
        foundPatrocinado = true;
        continue;
      }

      if (!foundPatrocinado) continue;

      if (trimmedLine.toLowerCase().includes('identificação') ||
          trimmedLine.toLowerCase().includes('veiculação') ||
          trimmedLine === pageName ||
          trimmedLine.length < 20) {
        continue;
      }

      if (trimmedLine.length > bestLength && trimmedLine.length <= 5000) {
        adText = trimmedLine;
        bestLength = trimmedLine.length;
        console.log('   ✅ Fallback encontrou: ' + trimmedLine.substring(0, 50) + '...');
      }
    }
  }

  console.log('   📝 Texto final: ' + (adText ? adText.substring(0, 50) + '... (' + adText.length + ' chars)' : 'NENHUM'));

  return adText;
}

  function extractImage(card) {
    let imageUrl = '';
    let bestQuality = 0;
    const images = Array.from(card.querySelectorAll('img'));

    for (const img of images) {
      const src = img.currentSrc || img.src || '';

      if (!src || 
          !src.startsWith('http') ||
          !(src.includes('scontent') || src.includes('fbcdn')) ||
          src.includes('emoji') ||
          src.includes('static') ||
          src.includes('pixel') ||
          src.includes('profile_pic')) {
        continue;
      }

      const srcset = img.srcset || img.getAttribute('srcset') || '';
      if (srcset) {
        const sources = srcset.split(',').map(s => {
          const parts = s.trim().split(' ');
          return { url: parts[0], width: parts[1] ? parseInt(parts[1]) : 0 };
        });
        sources.sort((a, b) => b.width - a.width);
        if (sources[0] && sources[0].width > bestQuality) {
          imageUrl = sources[0].url;
          bestQuality = sources[0].width;
        }
      }

      const naturalWidth = img.naturalWidth || 0;
      if (src && naturalWidth > bestQuality && naturalWidth > 50) {
        imageUrl = src;
        bestQuality = naturalWidth;
      }
    }

    return imageUrl;
  }

  function extractVideo(card) {
    const video = card.querySelector('video');
    if (!video) return '';

    let videoUrl = video.currentSrc || video.src || '';
    if (!videoUrl) {
      const source = video.querySelector('source');
      if (source) {
        videoUrl = source.src || '';
      }
    }

    return videoUrl;
  }

  function extractLink(card) {
    const links = Array.from(card.querySelectorAll('a[href]'));
    for (const link of links) {
      const href = link.getAttribute('href') || '';
      if (href.startsWith('http') && 
          !href.includes('facebook.com/ads') &&
          !href.includes('facebook.com/business') &&
          !href.includes('facebook.com/policies')) {
        return href;
      }
    }
    return '';
  }

  function extractMediaType(card) {
    if (card.querySelector('video')) return 'video';

    const images = Array.from(card.querySelectorAll('img'));
    const validImages = images.filter(img => {
      const src = img.src || '';
      return src.includes('scontent') || src.includes('fbcdn');
    });

    const carouselIndicators = card.querySelectorAll('[aria-label*="carousel"], [class*="carousel"]');
    if (carouselIndicators.length > 0 || validImages.length > 1) {
      return 'carousel';
    }

    return validImages.length > 0 ? 'image' : 'unknown';
  }

  // Função principal
  function extractAdData(card, index) {
    try {
      const fullText = card.textContent || '';
      const lines = fullText.split('\\n');

      // Library ID
      const libraryIdMatch = fullText.match(/Identificação da biblioteca[:\\s]*(\\d+)/i) ||
                            fullText.match(/Library ID[:\\s]*(\\d+)/i);
      const libraryId = libraryIdMatch ? libraryIdMatch[1] : '';

      // Nome da página (CORRIGIDO)
      const pageName = extractPageName(card);

      // Datas
      const startDateData = extractStartDate(lines);
      const activeDaysData = extractActiveDays(lines);

      // Plataformas
      const platforms = extractPlatforms(card);

      // Texto do anúncio (CORRIGIDO)
      const adText = extractAdText(card, pageName);

      // Mídias
      const imageUrl = extractImage(card);
      const videoUrl = extractVideo(card);
      const adLink = extractLink(card);
      const mediaType = extractMediaType(card);

      // Validação
      if (!pageName || pageName.length < 2 || pageName.toLowerCase() === 'patrocinado') {
        console.log('❌ Card inválido: pageName=' + pageName);
        return null;
      }

      if (!imageUrl && !videoUrl) {
        console.log('❌ Card sem mídia');
        return null;
      }

      // Log de sucesso
      console.log('✅ Extraído: ' + pageName + ' | Texto: ' + (adText ? adText.substring(0, 50) + '...' : 'N/A'));

      return {
        libraryId: libraryId,
        pageName: pageName,
        adText: adText,
        imageUrl: imageUrl,
        videoUrl: videoUrl,
        adLink: adLink,
        platforms: platforms,
        mediaType: mediaType,
        startDate: startDateData.date,
        activeDays: activeDaysData.days,
        activeTimeStr: activeDaysData.raw,
        fullText: fullText.substring(0, 2000), // Aumentado para debug
      };

    } catch (error) {
      console.error('❌ Erro ao extrair card:', error);
      return null;
    }
  }

  return extractAdData;
})();
`;
