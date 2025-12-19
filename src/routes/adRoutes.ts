// src/routes/adRoutes.ts - ATUALIZE ou ADICIONE:

import { Router } from 'express';
import adFilterService from '../services/adFilterService';

const router = Router();

/**
 * GET /api/ads
 * Lista anúncios com filtros avançados
 */
router.get('/', async (req, res) => {
  try {
    const filters: any = {
      keyword: req.query.keyword as string,
      status: req.query.status as string,
      mediaType: req.query.mediaType as string,
      country: req.query.country as string,
      language: req.query.language as string,
      platform: req.query.platform as string,

      minSameCreative: req.query.minSameCreative ? parseInt(req.query.minSameCreative as string) : undefined,
      minActiveDays: req.query.minActiveDays ? parseInt(req.query.minActiveDays as string) : undefined,
      recentlyPublished: req.query.recentlyPublished ? parseInt(req.query.recentlyPublished as string) : undefined,

      publishedFrom: req.query.publishedFrom as string,
      publishedTo: req.query.publishedTo as string,

      page: req.query.page ? parseInt(req.query.page as string) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
      sortBy: req.query.sortBy as any,
      sortOrder: req.query.sortOrder as 'asc' | 'desc',
    };

    const result = await adFilterService.listAdsWithFilters(filters);
    res.json(result);
  } catch (error: any) {
    console.error('Erro ao listar anúncios:', error);
    res.status(500).json({ error: 'Erro ao listar anúncios', message: error.message });
  }
});

/**
 * GET /api/ads/filter-stats
 * Obtém estatísticas para os filtros
 */
router.get('/filter-stats', async (req, res) => {
  try {
    const stats = await adFilterService.getFilterStats();
    res.json(stats);
  } catch (error: any) {
    console.error('Erro ao obter estatísticas:', error);
    res.status(500).json({ error: 'Erro ao obter estatísticas', message: error.message });
  }
});

export default router;
