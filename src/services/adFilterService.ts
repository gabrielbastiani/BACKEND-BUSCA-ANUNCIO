// src/services/adFilterService.ts - NOVO ARQUIVO

import { PrismaClient } from '@prisma/client';
import { AdListFilters, AdListResponse } from '../@types/ad.types';

const prisma = new PrismaClient();

export class AdFilterService {
  /**
   * Lista anúncios com filtros avançados
   */
  async listAdsWithFilters(filters: AdListFilters): Promise<AdListResponse> {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    // Construir WHERE clause
    const where: any = {};

    // Filtro por keyword
    if (filters.keyword) {
      where.OR = [
        { pageName: { contains: filters.keyword, mode: 'insensitive' } },
        { adText: { contains: filters.keyword, mode: 'insensitive' } },
        { keyword: { contains: filters.keyword, mode: 'insensitive' } },
      ];
    }

    // Filtro por status
    if (filters.status) {
      if (filters.status === 'active') {
        where.isActive = true;
      } else if (filters.status === 'inactive') {
        where.isActive = false;
      }
    }

    // Filtro por tipo de mídia
    if (filters.mediaType && filters.mediaType !== 'all') {
      where.mediaType = filters.mediaType;
    }

    // Filtro por país
    if (filters.country) {
      where.country = filters.country;
    }

    // 2. Filtro: Tempo mínimo ativo (em dias)
    if (filters.minActiveDays) {
      where.activeDays = { gte: filters.minActiveDays };
    }

    // 3. Filtro: Anúncios recém publicados
    if (filters.recentlyPublished) {
      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - filters.recentlyPublished);
      where.startDate = { gte: daysAgo };
    }

    // 4. Filtro: Período de publicação
    if (filters.publishedFrom || filters.publishedTo) {
      where.startDate = {};
      if (filters.publishedFrom) {
        where.startDate.gte = new Date(filters.publishedFrom);
      }
      if (filters.publishedTo) {
        where.startDate.lte = new Date(filters.publishedTo);
      }
    }

    // 5. Filtro: Idioma
    if (filters.language && filters.language !== 'all') {
      where.language = filters.language;
    }

    // 6. Filtro: Plataforma
    if (filters.platform && filters.platform !== 'all') {
      where.adPlatform = { contains: filters.platform };
    }

    // Buscar anúncios
    const [ads, total] = await Promise.all([
      prisma.ad.findMany({
        where,
        skip,
        take: limit,
        orderBy: this.buildOrderBy(filters),
        select: {
          id: true,
          adId: true,
          pageName: true,
          adText: true,
          adImageUrl: true,
          adVideoUrl: true,
          adCreativeUrl: true,
          adLink: true,
          adPlatform: true,
          language: true,
          mediaType: true,
          startDate: true,
          endDate: true,
          status: true,
          isActive: true,
          impressionsMin: true,
          impressionsMax: true,
          activeDays: true,
          keyword: true,
          country: true,
          created_at: true,
          platformSpecificData: true,
        },
      }),
      prisma.ad.count({ where }),
    ]);

    // 1. Filtro: Quantidade de anúncios com mesmo criativo
    let filteredAds = ads;
    if (filters.minSameCreative && filters.minSameCreative > 1) {
      filteredAds = await this.filterBySameCreative(ads, filters.minSameCreative);
    }

    const totalPages = Math.ceil(total / limit);

    return {
      ads: filteredAds,
      total: filteredAds.length,
      page,
      limit,
      totalPages,
      filters,
    };
  }

  /**
   * Filtra anúncios que usam o mesmo criativo (URL de imagem/vídeo)
   */
  private async filterBySameCreative(ads: any[], minCount: number): Promise<any[]> {
    // Agrupa anúncios por URL de criativo
    const creativeGroups = new Map<string, any[]>();

    ads.forEach(ad => {
      const creativeUrl = ad.adImageUrl || ad.adVideoUrl || ad.adCreativeUrl;
      if (creativeUrl) {
        if (!creativeGroups.has(creativeUrl)) {
          creativeGroups.set(creativeUrl, []);
        }
        creativeGroups.get(creativeUrl)!.push(ad);
      }
    });

    // Filtra grupos com pelo menos minCount anúncios
    const filtered: any[] = [];
    creativeGroups.forEach((group, creativeUrl) => {
      if (group.length >= minCount) {
        filtered.push(...group);
      }
    });

    return filtered;
  }

  /**
   * Constrói cláusula ORDER BY
   */
  private buildOrderBy(filters: AdListFilters): any {
    const sortBy = filters.sortBy || 'created_at';
    const sortOrder = filters.sortOrder || 'desc';

    return { [sortBy]: sortOrder };
  }

  /**
   * Obtém estatísticas para filtros
   */
  async getFilterStats(): Promise<any> {
    const [
      totalAds,
      activeAds,
      languages,
      platforms,
      mediaTypes,
    ] = await Promise.all([
      prisma.ad.count(),
      prisma.ad.count({ where: { isActive: true } }),
      prisma.ad.groupBy({
        by: ['language'],
        _count: true,
      }),
      prisma.ad.groupBy({
        by: ['adPlatform'],
        _count: true,
      }),
      prisma.ad.groupBy({
        by: ['mediaType'],
        _count: true,
      }),
    ]);

    return {
      totalAds,
      activeAds,
      inactiveAds: totalAds - activeAds,
      languages: languages.map(l => ({ language: l.language, count: l._count })),
      platforms: platforms.map(p => ({ platform: p.adPlatform, count: p._count })),
      mediaTypes: mediaTypes.map(m => ({ type: m.mediaType, count: m._count })),
    };
  }
}

export default new AdFilterService();
