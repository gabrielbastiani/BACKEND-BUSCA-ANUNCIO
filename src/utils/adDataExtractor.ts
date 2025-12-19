export class AdDataExtractor {
  /**
   * Extrai Library ID - MELHORADO
   */
  static extractLibraryId(text: string): string | null {
    const patterns = [
      /Identificação da biblioteca[:\s]+(\d+)/i,
      /Library ID[:\s]+(\d+)/i,
      /Ad Library ID[:\s]+(\d+)/i,
      /library_id[=:](\d+)/i,
      /ID:\s*(\d{10,})/i, // IDs longos geralmente são library IDs
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }

    return null;
  }

  /**
   * Extrai data de início - COMPLETAMENTE REFEITO
   */
  static extractStartDate(text: string): Date | null {
    console.log('      🔍 Procurando data em:', text.substring(0, 200));

    // Remove quebras de linha e normaliza espaços
    const cleanText = text.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();

    // PADRÕES BRASILEIROS (ordem importa!)
    const patterns = [
      // "Veiculação iniciada em 12 de dezembro de 2025"
      /Veiculação\s+iniciada\s+em\s+(\d{1,2})\s+de\s+(\w+)\s+de\s+(\d{4})/i,
      // "Started running on December 12, 2025"
      /Started\s+running\s+on\s+(\w+)\s+(\d{1,2}),?\s+(\d{4})/i,
      // "12 de dezembro de 2025"
      /\b(\d{1,2})\s+de\s+(\w+)\s+de\s+(\d{4})\b/i,
    ];

    for (const pattern of patterns) {
      const match = cleanText.match(pattern);
      if (match) {
        console.log('      ✅ Match encontrado:', match[0]);

        // Verifica se é padrão português ou inglês
        if (match[0].toLowerCase().includes('de')) {
          // Padrão português: dia, mês, ano
          const day = parseInt(match[1]);
          const monthStr = match[2].toLowerCase().trim();
          const year = parseInt(match[3]);

          // VALIDAÇÃO: ano deve estar entre 2000 e 2030
          if (year < 2000 || year > 2030) {
            console.log('      ⚠️ Ano inválido:', year);
            continue;
          }

          const date = this.parsePortugueseDate(day, monthStr, year);
          if (date) {
            console.log('      ✅ Data parseada:', date.toLocaleDateString('pt-BR'));
            return date;
          }
        } else {
          // Padrão inglês: mês, dia, ano
          const monthStr = match[1].toLowerCase().trim();
          const day = parseInt(match[2]);
          const year = parseInt(match[3]);

          if (year < 2000 || year > 2030) {
            console.log('      ⚠️ Ano inválido:', year);
            continue;
          }

          const date = this.parseEnglishDate(day, monthStr, year);
          if (date) {
            console.log('      ✅ Data parseada:', date.toLocaleDateString('pt-BR'));
            return date;
          }
        }
      }
    }

    console.log('      ❌ Nenhuma data válida encontrada');
    return null;
  }

  /**
   * Parse de data portuguesa - MELHORADO
   */
  private static parsePortugueseDate(day: number, monthStr: string, year: number): Date | null {
    const monthMap: { [key: string]: number } = {
      'jan': 0, 'janeiro': 0,
      'fev': 1, 'fevereiro': 1,
      'mar': 2, 'março': 2, 'marco': 2,
      'abr': 3, 'abril': 3,
      'mai': 4, 'maio': 4,
      'jun': 5, 'junho': 5,
      'jul': 6, 'julho': 6,
      'ago': 7, 'agosto': 7,
      'set': 8, 'setembro': 8,
      'out': 9, 'outubro': 9,
      'nov': 10, 'novembro': 10,
      'dez': 11, 'dezembro': 11, 'dec': 11
    };

    monthStr = monthStr.replace('.', '').toLowerCase().trim();

    let month = monthMap[monthStr];

    // Tenta match parcial
    if (month === undefined) {
      for (const [key, value] of Object.entries(monthMap)) {
        if (key.startsWith(monthStr.substring(0, 3)) || monthStr.startsWith(key.substring(0, 3))) {
          month = value;
          break;
        }
      }
    }

    // VALIDAÇÕES
    if (month === undefined) {
      console.log('      ⚠️ Mês não reconhecido:', monthStr);
      return null;
    }

    if (day < 1 || day > 31) {
      console.log('      ⚠️ Dia inválido:', day);
      return null;
    }

    if (year < 2000 || year > 2030) {
      console.log('      ⚠️ Ano inválido:', year);
      return null;
    }

    try {
      const date = new Date(year, month, day);
      if (!isNaN(date.getTime())) {
        return date;
      }
    } catch (error) {
      console.log('      ⚠️ Erro ao criar data:', error);
    }

    return null;
  }

  /**
   * Parse de data inglesa
   */
  private static parseEnglishDate(day: number, monthStr: string, year: number): Date | null {
    const monthMap: { [key: string]: number } = {
      'jan': 0, 'january': 0,
      'feb': 1, 'february': 1,
      'mar': 2, 'march': 2,
      'apr': 3, 'april': 3,
      'may': 4,
      'jun': 5, 'june': 5,
      'jul': 6, 'july': 6,
      'aug': 7, 'august': 7,
      'sep': 8, 'september': 8, 'sept': 8,
      'oct': 9, 'october': 9,
      'nov': 10, 'november': 10,
      'dec': 11, 'december': 11
    };

    monthStr = monthStr.toLowerCase().trim();
    const month = monthMap[monthStr];

    if (month !== undefined && day >= 1 && day <= 31 && year >= 2000 && year <= 2030) {
      return new Date(year, month, day);
    }

    return null;
  }

  /**
   * Calcula dias ativos - CORRIGIDO
   */
  static calculateActiveDays(startDate: Date | null, endDate: Date | null, isActive: boolean): number | null {
    if (!startDate) {
      console.log('      ⚠️ Sem startDate, não pode calcular dias ativos');
      return null;
    }

    const now = new Date();
    const end = endDate || (isActive ? now : null);

    if (!end) {
      console.log('      ⚠️ Sem data fim e anúncio inativo');
      return null;
    }

    const diffTime = Math.abs(end.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    console.log(`      ✅ Calculado: ${diffDays} dias (${startDate.toLocaleDateString()} até ${end.toLocaleDateString()})`);
    return diffDays;
  }

  /**
   * Extrai impressões - MELHORADO
   */
  static extractImpressions(text: string): { min: number | null; max: number | null } {
    const result = { min: null as number | null, max: null as number | null };

    // Remove quebras de linha
    const cleanText = text.replace(/\n/g, ' ').replace(/\s+/g, ' ');

    const patterns = [
      // "1.000 - 5.000 impressões"
      /(\d{1,3}(?:\.\d{3})+)\s*[-–—até]\s*(\d{1,3}(?:\.\d{3})+)\s*(?:impressões|impressions|visualizações|views)/i,
      // "1000 - 5000 impressões"
      /(\d{1,3}(?:,?\d{3})*)\s*[-–—até]\s*(\d{1,3}(?:,?\d{3})*)\s*(?:impressões|impressions)/i,
      // "impressões: 1.000 - 5.000"
      /(?:impressões|impressions):\s*(\d{1,3}(?:\.\d{3})+)\s*[-–—até]\s*(\d{1,3}(?:\.\d{3})+)/i,
      // Formato K: "1K - 5K impressões"
      /(\d+\.?\d*)\s*[kK]\s*[-–—até]\s*(\d+\.?\d*)\s*[kK]/i,
    ];

    for (const pattern of patterns) {
      const match = cleanText.match(pattern);
      if (match && match[1] && match[2]) {
        let min = match[1];
        let max = match[2];

        // Converte K para número
        if (match[0].toLowerCase().includes('k')) {
          result.min = Math.round(parseFloat(min) * 1000);
          result.max = Math.round(parseFloat(max) * 1000);
        } else {
          // Remove pontos/vírgulas e converte
          result.min = parseInt(min.replace(/[.,]/g, ''));
          result.max = parseInt(max.replace(/[.,]/g, ''));
        }

        console.log(`      ✅ Impressões encontradas: ${result.min} - ${result.max}`);
        return result;
      }
    }

    console.log('      ❌ Impressões não encontradas');
    return result;
  }

  /**
   * Extrai status ativo/inativo e endDate se aplicável
   */
  static extractStatus(text: string): {
    isActive: boolean;
    status: string;
    activeStatus: string;
    endDate: Date | null;
  } {
    const cleanText = text.toLowerCase().replace(/\n/g, ' ');

    // Verifica se está inativo
    const inactiveIndicators = [
      'inativo',
      'inactive',
      'encerrado',
      'finalizado',
      'terminated',
      'stopped',
      'paused',
      'pausado'
    ];

    const isActive = !inactiveIndicators.some(indicator => cleanText.includes(indicator));

    // Se inativo, tenta extrair data de término
    let endDate: Date | null = null;
    if (!isActive) {
      const endPatterns = [
        /encerrado em\s+(\d{1,2})\s+de\s+(\w+)\s+de\s+(\d{4})/i,
        /finalizado em\s+(\d{1,2})\s+de\s+(\w+)\s+de\s+(\d{4})/i,
        /término[:\s]+(\d{1,2})\s+de\s+(\w+)\s+de\s+(\d{4})/i,
      ];

      for (const pattern of endPatterns) {
        const match = text.match(pattern);
        if (match) {
          const day = parseInt(match[1]);
          const monthStr = match[2].toLowerCase();
          const year = parseInt(match[3]);
          endDate = this.parsePortugueseDate(day, monthStr, year);
          if (endDate) break;
        }
      }
    }

    return {
      isActive,
      status: isActive ? 'ATIVO' : 'INATIVO',
      activeStatus: isActive ? 'active' : 'inactive',
      endDate
    };
  }

  /**
   * Extrai TODOS os dados de uma vez - VERSÃO FINAL
   */
  static extractAllData(text: string, html?: string): {
    libraryId: string | null;
    startDate: Date | null;
    endDate: Date | null;
    impressionsMin: number | null;
    impressionsMax: number | null;
    activeDays: number | null;
    isActive: boolean;
    status: string;
    activeStatus: string;
  } {
    const fullText = text + (html || '');

    console.log('   🔍 Extraindo dados...');

    // Extrai status primeiro
    const statusData = this.extractStatus(fullText);
    console.log(`      Status: ${statusData.status}`);

    // Extrai library ID
    const libraryId = this.extractLibraryId(fullText);
    console.log(`      Library ID: ${libraryId || '❌'}`);

    // Extrai data de início
    const startDate = this.extractStartDate(fullText);
    console.log(`      Start Date: ${startDate ? startDate.toLocaleDateString('pt-BR') : '❌'}`);

    // Extrai impressões
    const impressions = this.extractImpressions(fullText);

    // Calcula dias ativos
    const activeDays = this.calculateActiveDays(startDate, statusData.endDate, statusData.isActive);

    return {
      libraryId,
      startDate,
      endDate: statusData.endDate,
      impressionsMin: impressions.min,
      impressionsMax: impressions.max,
      activeDays,
      isActive: statusData.isActive,
      status: statusData.status,
      activeStatus: statusData.activeStatus
    };
  }
}