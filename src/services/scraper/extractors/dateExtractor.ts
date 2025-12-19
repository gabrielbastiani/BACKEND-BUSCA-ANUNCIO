// src/services/scraper/extractors/dateExtractor.ts

export interface DateExtractionResult {
  startDate: Date | null;
  startDateStr: string;
  activeDays: number | null;
  activeTimeStr: string;
}

export class DateExtractor {
  private monthMapPT: { [key: string]: string } = {
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

  private monthMapEN: { [key: string]: string } = {
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

  extract(fullText: string): DateExtractionResult {
    const lines = fullText.split('\n');

    return {
      ...this.extractStartDate(lines),
      ...this.extractActiveDays(lines)
    };
  }

  private extractStartDate(lines: string[]): { startDate: Date | null; startDateStr: string } {
    let startDate: Date | null = null;
    let startDateStr = '';

    for (const line of lines) {
      const trimmedLine = line.trim();

      // Português: "Veiculação iniciada em 18 de dez de 2025"
      const matchPT = trimmedLine.match(/Veiculação iniciada em\s+(\d{1,2})\s+de\s+(\w+)\s+de\s+(\d{4})/i);
      if (matchPT) {
        const day = matchPT[1];
        const monthName = matchPT[2].toLowerCase();
        const year = matchPT[3];

        for (const [fullMonth, monthNum] of Object.entries(this.monthMapPT)) {
          if (monthName.includes(fullMonth.substring(0, 3))) {
            startDateStr = `${year}-${monthNum}-${day.padStart(2, '0')}`;
            startDate = new Date(startDateStr);
            return { startDate, startDateStr };
          }
        }
      }

      // Inglês: "Started running on Dec 18, 2025"
      const matchEN = trimmedLine.match(/Started running on\s+(\w+)\s+(\d{1,2}),\s+(\d{4})/i);
      if (matchEN) {
        const monthName = matchEN[1].toLowerCase();
        const day = matchEN[2];
        const year = matchEN[3];

        for (const [fullMonth, monthNum] of Object.entries(this.monthMapEN)) {
          if (monthName.includes(fullMonth.substring(0, 3))) {
            startDateStr = `${year}-${monthNum}-${day.padStart(2, '0')}`;
            startDate = new Date(startDateStr);
            return { startDate, startDateStr };
          }
        }
      }
    }

    return { startDate, startDateStr };
  }

  private extractActiveDays(lines: string[]): { activeDays: number | null; activeTimeStr: string } {
    let activeDays: number | null = null;
    let activeTimeStr = '';

    for (const line of lines) {
      const trimmedLine = line.trim();

      // Português
      const matchPT = trimmedLine.match(/Tempo total ativo[:\s]*(.+?)$/i);
      if (matchPT) {
        activeTimeStr = matchPT[1].trim();
        activeDays = this.parseActiveDays(activeTimeStr);
        if (activeDays !== null) break;
      }

      // Inglês
      const matchEN = trimmedLine.match(/Total time active[:\s]*(.+?)$/i);
      if (matchEN) {
        activeTimeStr = matchEN[1].trim();
        activeDays = this.parseActiveDays(activeTimeStr);
        if (activeDays !== null) break;
      }
    }

    return { activeDays, activeTimeStr };
  }

  private parseActiveDays(timeStr: string): number | null {
    const hoursMatch = timeStr.match(/(\d+)\s*h(?:ora)?/i);
    const daysMatch = timeStr.match(/(\d+)\s*dia/i);
    const weeksMatch = timeStr.match(/(\d+)\s*semana/i);
    const monthsMatch = timeStr.match(/(\d+)\s*m[eê]s/i);

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
}

export default new DateExtractor();
