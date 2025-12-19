// src/utils/intelligentAdDataExtractor.ts

export class IntelligentAdDataExtractor {

    /**
     * Tenta extrair impressões de múltiplas formas
     */
    static extractImpressions(text: string, html: string): {
        min: number | null;
        max: number | null;
        estimated: boolean;
    } {
        const result = {
            min: null as number | null,
            max: null as number | null,
            estimated: false
        };

        // MÉTODO 1: Busca por padrão explícito de impressões
        const patterns = [
            // Português
            /(\d{1,3}(?:[.,]\d{3})*)\s*[-–—]\s*(\d{1,3}(?:[.,]\d{3})*)\s*(?:impressões|visualizações)/i,
            /impressões:\s*(\d{1,3}(?:[.,]\d{3})*)\s*[-–—]\s*(\d{1,3}(?:[.,]\d{3})*)/i,
            /(\d{1,3}(?:[.,]\d{3})*)\s*a\s*(\d{1,3}(?:[.,]\d{3})*)\s*impressões/i,
            // Inglês
            /(\d{1,3}(?:[.,]\d{3})*)\s*[-–—]\s*(\d{1,3}(?:[.,]\d{3})*)\s*(?:impressions|views)/i,
            /impressions:\s*(\d{1,3}(?:[.,]\d{3})*)\s*[-–—]\s*(\d{1,3}(?:[.,]\d{3})*)/i,
            // Formato K (mil)
            /(\d+\.?\d*)\s*[kK]\s*[-–—]\s*(\d+\.?\d*)\s*[kK]\s*(?:impressões|impressions)/i,
            /(\d+)\s*mil\s*[-–—]\s*(\d+)\s*mil/i
        ];

        for (const pattern of patterns) {
            const match = (text + ' ' + html).match(pattern);
            if (match && match[1] && match[2]) {
                let min = match[1].replace(/[.,]/g, '');
                let max = match[2].replace(/[.,]/g, '');

                // Converte K para número
                if (match[1].toLowerCase().includes('k')) {
                    min = (parseFloat(match[1]) * 1000).toString();
                    max = (parseFloat(match[2]) * 1000).toString();
                }

                result.min = parseInt(min);
                result.max = parseInt(max);
                result.estimated = false;
                return result;
            }
        }

        // MÉTODO 2: Busca por indicadores de popularidade
        const popularityIndicators = this.extractPopularityIndicators(text, html);
        if (popularityIndicators.hasEngagement) {
            const estimated = this.estimateImpressionsByEngagement(popularityIndicators);
            if (estimated) {
                result.min = estimated.min;
                result.max = estimated.max;
                result.estimated = true;
                return result;
            }
        }

        // MÉTODO 3: Estimativa baseada em tipo de anúncio e plataforma
        const baseEstimate = this.estimateByAdType(text, html);
        if (baseEstimate) {
            result.min = baseEstimate.min;
            result.max = baseEstimate.max;
            result.estimated = true;
        }

        return result;
    }

    /**
     * Extrai indicadores de engajamento
     */
    private static extractPopularityIndicators(text: string, html: string): {
        hasEngagement: boolean;
        likes?: number;
        comments?: number;
        shares?: number;
    } {
        const combined = text + ' ' + html;
        const result: any = { hasEngagement: false };

        // Busca curtidas
        const likePatterns = [
            /(\d+(?:[.,]\d{3})*)\s*(?:curtidas|curtir|likes?)/i,
            /(\d+[kK])\s*(?:curtidas|likes?)/i
        ];

        for (const pattern of likePatterns) {
            const match = combined.match(pattern);
            if (match) {
                result.likes = this.parseNumber(match[1]);
                result.hasEngagement = true;
                break;
            }
        }

        // Busca comentários
        const commentPatterns = [
            /(\d+(?:[.,]\d{3})*)\s*(?:comentários?|comments?)/i,
            /(\d+[kK])\s*(?:comentários?|comments?)/i
        ];

        for (const pattern of commentPatterns) {
            const match = combined.match(pattern);
            if (match) {
                result.comments = this.parseNumber(match[1]);
                result.hasEngagement = true;
                break;
            }
        }

        // Busca compartilhamentos
        const sharePatterns = [
            /(\d+(?:[.,]\d{3})*)\s*(?:compartilhamentos?|shares?)/i,
            /(\d+[kK])\s*(?:compartilhamentos?|shares?)/i
        ];

        for (const pattern of sharePatterns) {
            const match = combined.match(pattern);
            if (match) {
                result.shares = this.parseNumber(match[1]);
                result.hasEngagement = true;
                break;
            }
        }

        return result;
    }

    /**
     * Estima impressões baseado em engajamento
     */
    private static estimateImpressionsByEngagement(indicators: any): {
        min: number;
        max: number;
    } | null {
        // Taxa média de engajamento no Facebook: 0.5% - 3%
        // Impressões = Engajamento / Taxa de Engajamento

        const totalEngagement = (indicators.likes || 0) +
            (indicators.comments || 0) * 2 +
            (indicators.shares || 0) * 3;

        if (totalEngagement === 0) return null;

        // Estimativa conservadora
        const minImpressions = Math.round(totalEngagement / 0.03); // 3% taxa alta
        const maxImpressions = Math.round(totalEngagement / 0.005); // 0.5% taxa baixa

        return {
            min: minImpressions,
            max: maxImpressions
        };
    }

    /**
     * Estimativa base por tipo de anúncio
     */
    private static estimateByAdType(text: string, html: string): {
        min: number;
        max: number;
    } | null {
        const combined = (text + ' ' + html).toLowerCase();

        // Anúncios de vídeo geralmente têm mais alcance
        if (combined.includes('video') || combined.includes('vídeo')) {
            return { min: 1000, max: 5000 };
        }

        // Anúncios com carrossel
        if (combined.includes('carousel') || combined.includes('carrossel')) {
            return { min: 500, max: 3000 };
        }

        // Anúncios de imagem padrão
        return { min: 100, max: 1000 };
    }

    /**
     * Calcula período de impressões estimado
     */
    static estimateImpressionsPeriod(startDate: Date | null): {
        dateFrom: Date | null;
        dateTo: Date | null;
    } {
        if (!startDate) {
            return { dateFrom: null, dateTo: null };
        }

        // Impressões geralmente são contadas desde o início até agora
        const dateFrom = new Date(startDate);
        const dateTo = new Date(); // Agora

        return { dateFrom, dateTo };
    }

    /**
     * Calcula dias ativos
     */
    static calculateActiveDays(startDate: Date | null, endDate: Date | null, isActive: boolean): number | null {
        if (!startDate) return null;

        const end = endDate || (isActive ? new Date() : null);
        if (!end) return null;

        const diffTime = Math.abs(end.getTime() - startDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        return diffDays;
    }

    /**
     * Parser de números com suporte a K (mil), M (milhão)
     */
    private static parseNumber(str: string): number {
        str = str.toLowerCase().trim();

        if (str.includes('k')) {
            return parseFloat(str.replace('k', '')) * 1000;
        }

        if (str.includes('m')) {
            return parseFloat(str.replace('m', '')) * 1000000;
        }

        // Remove pontos e vírgulas
        return parseInt(str.replace(/[.,]/g, ''));
    }

    /**
     * NOVA: Tenta clicar no anúncio para ver mais detalhes
     */
    static async tryExpandAdDetails(page: any, adElement: any): Promise<{
        impressions?: { min: number; max: number };
        period?: { from: Date; to: Date };
        additionalData?: any;
    }> {
        try {
            // Procura botão "Ver detalhes" ou similar
            const detailsButton = await adElement.$('button:has-text("Ver detalhes"), a:has-text("Ver detalhes"), [aria-label*="detalhes"]');

            if (detailsButton) {
                await detailsButton.click();
                await page.waitForTimeout(2000);

                // Extrai dados do modal/popup
                const modalData = await page.evaluate(() => {
                    const modalText = document.body.innerText;
                    return modalText;
                });

                // Processa dados do modal
                const impressions = this.extractImpressions(modalData, '');

                // Fecha modal
                const closeButton = await page.$('[aria-label*="Fechar"], button:has-text("Fechar")');
                if (closeButton) {
                    await closeButton.click();
                    await page.waitForTimeout(1000);
                }

                if (impressions.min && impressions.max) {
                    return { impressions: { min: impressions.min, max: impressions.max } };
                }
            }
        } catch (error) {
            // Ignora erros de expansão
        }

        return {};
    }

    /**
     * Função principal que combina todas as estratégias
     */
    static extractCompleteData(text: string, html: string, startDate: Date | null, isActive: boolean = true): {
        impressionsMin: number | null;
        impressionsMax: number | null;
        impressionsEstimated: boolean;
        impressionsDateFrom: Date | null;
        impressionsDateTo: Date | null;
        activeDays: number | null;
        confidence: 'high' | 'medium' | 'low';
    } {
        // Extrai impressões
        const impressions = this.extractImpressions(text, html);

        // Calcula período de impressões
        const period = this.estimateImpressionsPeriod(startDate);

        // Calcula dias ativos
        const activeDays = this.calculateActiveDays(startDate, null, isActive);

        // Determina confiança dos dados
        let confidence: 'high' | 'medium' | 'low' = 'low';
        if (!impressions.estimated && impressions.min && impressions.max) {
            confidence = 'high';
        } else if (impressions.estimated && impressions.min && impressions.max) {
            confidence = 'medium';
        }

        return {
            impressionsMin: impressions.min,
            impressionsMax: impressions.max,
            impressionsEstimated: impressions.estimated,
            impressionsDateFrom: period.dateFrom,
            impressionsDateTo: period.dateTo,
            activeDays,
            confidence
        };
    }
}
