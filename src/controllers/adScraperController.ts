// src/controllers/adScraperController.ts

import { Request, Response } from 'express';
import { PrismaClient, Prisma } from '@prisma/client';
import { AdScraperParams, AdListFilters, AvailableFilters } from '../@types/ad.types';
import facebookAdsScraperService from '../services/facebookAdsScraperService';

const prisma = new PrismaClient();

export class AdScraperController {
  /**
   * Inicia o scraping e salva os anúncios no banco
   */
  async scrapeAndSave(req: Request, res: Response): Promise<void> {
    try {
      const { keyword, country, maxAds, filters } = req.body;

      if (!keyword || keyword.trim() === '') {
        res.status(400).json({
          success: false,
          message: 'A palavra-chave é obrigatória'
        });
        return;
      }

      const params: AdScraperParams = {
        keyword: keyword.trim(),
        country: country || 'BR',
        maxAds: maxAds || 50,
        filters: filters || {}
      };

      console.log('🚀 Iniciando scraping:', params);

      // Cria registro de histórico - CORREÇÃO AQUI
      const searchHistory = await prisma.searchHistory.create({
        data: {
          keyword: params.keyword,
          country: params.country!,
          filters: (params.filters as Prisma.InputJsonValue) || Prisma.JsonNull, // CAST para tipo compatível
          status: 'processing',
          totalAdsFound: 0,
          totalAdsSaved: 0
        }
      });

      // Executa o scraping
      const result = await facebookAdsScraperService.scrapeAndSave(params);

      // Atualiza histórico - CORREÇÃO AQUI
      await prisma.searchHistory.update({
        where: { id: searchHistory.id },
        data: {
          status: result.success ? 'completed' : 'failed',
          totalAdsFound: result.totalAdsCollected,
          totalAdsSaved: result.totalAdsCollected,
          completedAt: new Date(),
          errorMessage: result.errors?.join('; ') || null
        }
      });

      if (result.success) {
        res.status(200).json({
          success: true,
          message: `✅ Scraping concluído! ${result.totalAdsCollected} anúncios coletados.`,
          data: {
            searchHistoryId: searchHistory.id,
            totalAdsCollected: result.totalAdsCollected,
            keyword: params.keyword,
            country: params.country,
            appliedFilters: result.filters,
            adsPreview: result.ads.slice(0, 5).map(ad => ({
              id: ad.adId,
              pageName: ad.pageName,
              adTextPreview: ad.adText?.substring(0, 100),
              mediaType: ad.mediaType,
              platform: ad.adPlatform,
              language: ad.language
            }))
          },
          errors: result.errors
        });
      } else {
        res.status(500).json({
          success: false,
          message: '❌ Erro ao realizar scraping',
          data: {
            searchHistoryId: searchHistory.id,
            totalAdsCollected: result.totalAdsCollected
          },
          errors: result.errors
        });
      }

    } catch (error: any) {
      console.error('❌ Erro no controller:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno no servidor',
        error: error.message
      });
    }
  }

  /**
   * Apenas testa o scraping sem salvar
   */
  async scrapeOnly(req: Request, res: Response): Promise<void> {
    try {
      const { keyword, country, maxAds, filters } = req.body;

      if (!keyword || keyword.trim() === '') {
        res.status(400).json({
          success: false,
          message: 'A palavra-chave é obrigatória'
        });
        return;
      }

      const params: AdScraperParams = {
        keyword: keyword.trim(),
        country: country || 'BR',
        maxAds: maxAds || 20,
        filters: filters || {}
      };

      const result = await facebookAdsScraperService.scrapeOnly(params);

      res.status(200).json({
        success: result.success,
        message: result.success ? '✅ Teste concluído' : '❌ Erro no teste',
        data: {
          totalAdsCollected: result.totalAdsCollected,
          appliedFilters: result.filters,
          ads: result.ads
        },
        errors: result.errors
      });

    } catch (error: any) {
      console.error('❌ Erro no controller:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno no servidor',
        error: error.message
      });
    }
  }

  /**
   * Lista anúncios com filtros e paginação
   */
  async listAds(req: Request, res: Response): Promise<void> {
    try {
      const {
        keyword,
        country,
        pageName,
        language,
        mediaType,
        platform,
        status,
        isActive,
        startDateFrom,
        startDateTo,
        minActiveDays, // NOVO
        maxActiveDays, // NOVO
        hasImpressions, // NOVO
        minImpressions, // NOVO
        maxImpressions,
        page = '1',
        limit = '20',
        sortBy = 'updated_at', // Mudei o padrão
        sortOrder = 'desc'
      } = req.query;

      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const skip = (pageNum - 1) * limitNum;

      // Constrói filtros
      const where: any = {};

      if (keyword) {
        where.keyword = { contains: keyword as string, mode: 'insensitive' };
      }

      if (country) {
        where.country = country as string;
      }

      if (pageName) {
        where.pageName = { contains: pageName as string, mode: 'insensitive' };
      }

      if (language) {
        where.language = language as string;
      }

      if (mediaType) {
        where.mediaType = mediaType as string;
      }

      if (platform) {
        where.adPlatform = { contains: platform as string, mode: 'insensitive' };
      }

      if (status) {
        where.status = status as string;
      }

      if (isActive !== undefined) {
        where.isActive = isActive === 'true';
      }

      if (startDateFrom || startDateTo) {
        where.startDate = {};
        if (startDateFrom) {
          where.startDate.gte = new Date(startDateFrom as string);
        }
        if (startDateTo) {
          where.startDate.lte = new Date(startDateTo as string);
        }
      }

      // NOVOS FILTROS
      if (minActiveDays || maxActiveDays) {
        where.activeDays = {};
        if (minActiveDays) {
          where.activeDays.gte = parseInt(minActiveDays as string);
        }
        if (maxActiveDays) {
          where.activeDays.lte = parseInt(maxActiveDays as string);
        }
      }

      if (hasImpressions === 'true') {
        where.impressionsMin = { not: null };
      }

      if (minImpressions || maxImpressions) {
        where.AND = where.AND || [];
        if (minImpressions) {
          where.AND.push({
            impressionsMin: { gte: parseInt(minImpressions as string) }
          });
        }
        if (maxImpressions) {
          where.AND.push({
            impressionsMax: { lte: parseInt(maxImpressions as string) }
          });
        }
      }



      // Ordenação especial
      let orderBy: any = {};

      if (sortBy === 'updated_at') {
        // Recém atualizados
        orderBy = { updated_at: sortOrder as string };
      } else if (sortBy === 'startDate') {
        // Recém publicados
        orderBy = { startDate: sortOrder as string };
      } else if (sortBy === 'impressionsMax') {
        // Mais impressões
        orderBy = { impressionsMax: sortOrder as string };
      } else if (sortBy === 'activeDays') {
        // Mais antigos/ativos
        orderBy = { activeDays: sortOrder as string };
      } else {
        orderBy[sortBy as string] = sortOrder as string;
      }

      // Busca
      const [ads, total] = await Promise.all([
        prisma.ad.findMany({
          where,
          skip,
          take: limitNum,
          orderBy,
          select: {
            id: true,
            adId: true,
            pageName: true,
            adText: true,
            adImageUrl: true,
            adVideoUrl: true,
            adLink: true,
            adPlatform: true,
            language: true,
            mediaType: true,
            status: true,
            isActive: true,
            startDate: true,
            activeDays: true,
            impressionsMin: true,
            impressionsMax: true,
            libraryId: true,
            keyword: true,
            country: true,
            created_at: true,
            updated_at: true,
            lastSeenActive: true
          }
        }),
        prisma.ad.count({ where })
      ]);

      res.status(200).json({
        success: true,
        data: {
          ads,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            totalPages: Math.ceil(total / limitNum),
            hasNext: pageNum * limitNum < total,
            hasPrev: pageNum > 1
          },
          appliedFilters: {
            keyword, country, pageName, language, mediaType, platform,
            status, isActive, startDateFrom, startDateTo,
            minActiveDays, maxActiveDays, hasImpressions,
            minImpressions, maxImpressions
          }
        }
      });

    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Erro ao buscar anúncios',
        error: error.message
      });
    }
  }

  /**
   * Busca um anúncio específico por ID
   */
  async getAdById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const ad = await prisma.ad.findUnique({
        where: { id }
      });

      if (!ad) {
        res.status(404).json({
          success: false,
          message: 'Anúncio não encontrado'
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: ad
      });

    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Erro ao buscar anúncio',
        error: error.message
      });
    }
  }

  /**
   * Retorna filtros disponíveis baseados nos dados existentes
   */
  async getAvailableFilters(req: Request, res: Response): Promise<void> {
    try {
      const { keyword, country } = req.query;

      const where: any = {};
      if (keyword) where.keyword = { contains: keyword as string, mode: 'insensitive' };
      if (country) where.country = country as string;

      // Busca valores únicos para cada filtro
      const [
        languages,
        advertisers,
        platforms,
        mediaTypes,
        statuses
      ] = await Promise.all([
        prisma.ad.groupBy({
          by: ['language'],
          where: { ...where, language: { not: null } },
          _count: true,
          orderBy: { _count: { language: 'desc' } }
        }),
        prisma.ad.groupBy({
          by: ['pageName'],
          where,
          _count: true,
          orderBy: { _count: { pageName: 'desc' } },
          take: 50
        }),
        prisma.ad.groupBy({
          by: ['adPlatform'],
          where: { ...where, adPlatform: { not: null } },
          _count: true
        }),
        prisma.ad.groupBy({
          by: ['mediaType'],
          where: { ...where, mediaType: { not: null } },
          _count: true
        }),
        prisma.ad.groupBy({
          by: ['status'],
          where: { ...where, status: { not: null } },
          _count: true
        })
      ]);

      const availableFilters: AvailableFilters = {
        languages: languages.map(item => ({
          value: item.language!,
          label: `${item.language} (${item._count})`
        })),
        advertisers: advertisers.map(item => ({
          value: item.pageName,
          label: `${item.pageName} (${item._count})`
        })),
        platforms: platforms.map(item => ({
          value: item.adPlatform!,
          label: `${item.adPlatform} (${item._count})`
        })),
        mediaTypes: mediaTypes.map(item => ({
          value: item.mediaType!,
          label: `${item.mediaType} (${item._count})`
        })),
        activeStatuses: statuses.map(item => ({
          value: item.status!,
          label: `${item.status} (${item._count})`
        }))
      };

      res.status(200).json({
        success: true,
        data: availableFilters
      });

    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Erro ao buscar filtros disponíveis',
        error: error.message
      });
    }
  }

  /**
   * Retorna estatísticas dos anúncios
   */
  async getStats(req: Request, res: Response): Promise<void> {
    try {
      const { keyword, country } = req.query;

      const where: any = {};
      if (keyword) where.keyword = { contains: keyword as string, mode: 'insensitive' };
      if (country) where.country = country as string;

      const [
        total,
        byKeyword,
        byCountry,
        byPlatform,
        byMediaType,
        byLanguage,
        byStatus,
        impressionsStats
      ] = await Promise.all([
        prisma.ad.count({ where }),

        prisma.ad.groupBy({
          by: ['keyword'],
          _count: { keyword: true },
          where,
          orderBy: { _count: { keyword: 'desc' } },
          take: 10
        }),

        prisma.ad.groupBy({
          by: ['country'],
          _count: { country: true },
          where,
          orderBy: { _count: { country: 'desc' } }
        }),

        prisma.ad.groupBy({
          by: ['adPlatform'],
          _count: { adPlatform: true },
          where: { ...where, adPlatform: { not: null } }
        }),

        prisma.ad.groupBy({
          by: ['mediaType'],
          _count: { mediaType: true },
          where: { ...where, mediaType: { not: null } }
        }),

        prisma.ad.groupBy({
          by: ['language'],
          _count: { language: true },
          where: { ...where, language: { not: null } },
          orderBy: { _count: { language: 'desc' } }
        }),

        prisma.ad.groupBy({
          by: ['status'],
          _count: { status: true },
          where: { ...where, status: { not: null } }
        }),

        prisma.ad.aggregate({
          where: {
            ...where,
            impressionsMin: { not: null },
            impressionsMax: { not: null }
          },
          _avg: {
            impressionsMin: true,
            impressionsMax: true
          },
          _sum: {
            impressionsMin: true,
            impressionsMax: true
          }
        })
      ]);

      res.status(200).json({
        success: true,
        data: {
          total,
          byKeyword: byKeyword.map(item => ({
            keyword: item.keyword,
            count: item._count.keyword
          })),
          byCountry: byCountry.map(item => ({
            country: item.country,
            count: item._count.country
          })),
          byPlatform: byPlatform.map(item => ({
            platform: item.adPlatform,
            count: item._count.adPlatform
          })),
          byMediaType: byMediaType.map(item => ({
            mediaType: item.mediaType,
            count: item._count.mediaType
          })),
          byLanguage: byLanguage.map(item => ({
            language: item.language,
            count: item._count.language
          })),
          byStatus: byStatus.map(item => ({
            status: item.status,
            count: item._count.status
          })),
          impressions: {
            avgMin: Math.round(impressionsStats._avg.impressionsMin || 0),
            avgMax: Math.round(impressionsStats._avg.impressionsMax || 0),
            totalMin: impressionsStats._sum.impressionsMin || 0,
            totalMax: impressionsStats._sum.impressionsMax || 0
          }
        }
      });

    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Erro ao buscar estatísticas',
        error: error.message
      });
    }
  }

  /**
   * Histórico de buscas
   */
  async getSearchHistory(req: Request, res: Response): Promise<void> {
    try {
      const { page = '1', limit = '20' } = req.query;

      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const skip = (pageNum - 1) * limitNum;

      const [history, total] = await Promise.all([
        prisma.searchHistory.findMany({
          skip,
          take: limitNum,
          orderBy: { created_at: 'desc' }
        }),
        prisma.searchHistory.count()
      ]);

      res.status(200).json({
        success: true,
        data: {
          history,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            totalPages: Math.ceil(total / limitNum)
          }
        }
      });

    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Erro ao buscar histórico',
        error: error.message
      });
    }
  }

  /**
   * Deleta anúncios por filtros
   */
  async deleteAds(req: Request, res: Response): Promise<void> {
    try {
      const { keyword, country, olderThanDays, adIds } = req.body;

      const where: any = {};

      if (adIds && Array.isArray(adIds)) {
        where.id = { in: adIds };
      } else {
        if (keyword) where.keyword = keyword;
        if (country) where.country = country;
        if (olderThanDays) {
          const date = new Date();
          date.setDate(date.getDate() - olderThanDays);
          where.created_at = { lt: date };
        }
      }

      const result = await prisma.ad.deleteMany({ where });

      res.status(200).json({
        success: true,
        message: `✅ ${result.count} anúncios deletados`,
        data: { deletedCount: result.count }
      });

    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Erro ao deletar anúncios',
        error: error.message
      });
    }
  }

  /**
   * Exporta anúncios em CSV
   */
  async exportAds(req: Request, res: Response): Promise<void> {
    try {
      const { keyword, country, format = 'csv' } = req.query;

      const where: any = {};
      if (keyword) where.keyword = { contains: keyword as string, mode: 'insensitive' };
      if (country) where.country = country as string;

      const ads = await prisma.ad.findMany({
        where,
        orderBy: { created_at: 'desc' },
        take: 1000
      });

      if (format === 'csv') {
        const csv = this.convertToCSV(ads);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=ads_${Date.now()}.csv`);
        res.send(csv);
      } else if (format === 'json') {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename=ads_${Date.now()}.json`);
        res.json(ads);
      } else {
        res.status(400).json({
          success: false,
          message: 'Formato não suportado. Use csv ou json'
        });
      }

    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Erro ao exportar anúncios',
        error: error.message
      });
    }
  }

  private convertToCSV(data: any[]): string {
    if (data.length === 0) return '';

    const headers = Object.keys(data[0]);
    const csvRows = [];

    csvRows.push(headers.join(','));

    for (const row of data) {
      const values = headers.map(header => {
        const value = row[header];
        if (value === null || value === undefined) return '';
        if (typeof value === 'object') return JSON.stringify(value).replace(/"/g, '""');
        return `"${String(value).replace(/"/g, '""')}"`;
      });
      csvRows.push(values.join(','));
    }

    return csvRows.join('\n');
  }
}

export default new AdScraperController();