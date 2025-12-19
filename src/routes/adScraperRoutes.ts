// src/routes/adScraperRoutes.ts

import { Router } from 'express';
import { body, query, param } from 'express-validator';
import adScraperController from '../controllers/adScraperController';
import { validateRequest } from '../middlewares/validateRequest';

const router = Router();

// ==================== SCRAPING ====================

/**
 * @route   POST /api/scraper/scrape-and-save
 * @desc    Realiza scraping com filtros e salva no banco
 */
router.post(
  '/scrape-and-save',
  [
    body('keyword')
      .notEmpty()
      .withMessage('Palavra-chave obrigatória')
      .isString()
      .trim()
      .isLength({ min: 2, max: 100 }),
    body('country')
      .optional()
      .isString()
      .isLength({ min: 2, max: 2 })
      .toUpperCase(),
    body('maxAds')
      .optional()
      .isInt({ min: 1, max: 200 }),
    body('filters')
      .optional()
      .isObject(),
    body('filters.language')
      .optional()
      .isString(),
    body('filters.advertiser')
      .optional()
      .isString(),
    body('filters.platform')
      .optional()
      .isArray(),
    body('filters.mediaType')
      .optional()
      .isString()
      .isIn(['image', 'video', 'carousel', 'all']),
    body('filters.activeStatus')
      .optional()
      .isString()
      .isIn(['active', 'inactive', 'all']),
    body('filters.impressionsDateFrom')
      .optional()
      .isISO8601(),
    body('filters.impressionsDateTo')
      .optional()
      .isISO8601()
  ],
  validateRequest,
  adScraperController.scrapeAndSave
);

/**
 * @route   POST /api/scraper/test
 * @desc    Testa scraping sem salvar
 */
router.post(
  '/test',
  [
    body('keyword').notEmpty().isString().trim(),
    body('country').optional().isString(),
    body('maxAds').optional().isInt({ min: 1, max: 50 }),
    body('filters').optional().isObject()
  ],
  validateRequest,
  adScraperController.scrapeOnly
);

// ==================== LISTAGEM E BUSCA ====================

/**
 * @route   GET /api/scraper/ads
 * @desc    Lista anúncios com filtros e paginação
 */
router.get(
  '/ads',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('keyword').optional().isString(),
    query('country').optional().isString(),
    query('pageName').optional().isString(),
    query('language').optional().isString(),
    query('mediaType').optional().isString(),
    query('platform').optional().isString(),
    query('status').optional().isString(),
    query('isActive').optional().isBoolean(),
    query('startDateFrom').optional().isISO8601(),
    query('startDateTo').optional().isISO8601(),

    // NOVOS FILTROS
    query('minActiveDays').optional().isInt({ min: 0 }),
    query('maxActiveDays').optional().isInt({ min: 0 }),
    query('hasImpressions').optional().isBoolean(),
    query('minImpressions').optional().isInt({ min: 0 }),
    query('maxImpressions').optional().isInt({ min: 0 }),

    query('sortBy').optional().isIn([
      'created_at', 
      'updated_at', 
      'startDate', 
      'pageName', 
      'impressionsMax', 
      'activeDays'
    ]),
    query('sortOrder').optional().isIn(['asc', 'desc'])
  ],
  validateRequest,
  adScraperController.listAds
);

/**
 * @route   GET /api/scraper/ads/:id
 * @desc    Busca um anúncio específico
 */
router.get(
  '/ads/:id',
  [param('id').notEmpty().isString()],
  validateRequest,
  adScraperController.getAdById
);

/**
 * @route   GET /api/scraper/filters
 * @desc    Retorna filtros disponíveis baseados nos dados
 */
router.get(
  '/filters',
  [
    query('keyword').optional().isString(),
    query('country').optional().isString()
  ],
  validateRequest,
  adScraperController.getAvailableFilters
);

// ==================== ESTATÍSTICAS ====================

/**
 * @route   GET /api/scraper/stats
 * @desc    Retorna estatísticas dos anúncios
 */
router.get(
  '/stats',
  [
    query('keyword').optional().isString(),
    query('country').optional().isString()
  ],
  validateRequest,
  adScraperController.getStats
);

/**
 * @route   GET /api/scraper/history
 * @desc    Histórico de buscas realizadas
 */
router.get(
  '/history',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 })
  ],
  validateRequest,
  adScraperController.getSearchHistory
);

// ==================== AÇÕES ====================

/**
 * @route   DELETE /api/scraper/ads
 * @desc    Deleta anúncios por filtros
 */
router.delete(
  '/ads',
  [
    body('keyword').optional().isString(),
    body('country').optional().isString(),
    body('olderThanDays').optional().isInt({ min: 1 }),
    body('adIds').optional().isArray()
  ],
  validateRequest,
  adScraperController.deleteAds
);

/**
 * @route   GET /api/scraper/export
 * @desc    Exporta anúncios em CSV ou JSON
 */
router.get(
  '/export',
  [
    query('keyword').optional().isString(),
    query('country').optional().isString(),
    query('format').optional().isIn(['csv', 'json'])
  ],
  validateRequest,
  adScraperController.exportAds
);

export default router;