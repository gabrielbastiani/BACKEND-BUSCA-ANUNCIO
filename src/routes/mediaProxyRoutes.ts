// src/routes/mediaProxyRoutes.ts
import { Router } from 'express';
import mediaProxyController from '../controllers/mediaProxyController';

const router = Router();

/**
 * @route   GET /api/media/image
 * @desc    Proxy para imagens do Facebook
 */
router.get('/image', mediaProxyController.proxyImage);

/**
 * @route   GET /api/media/video
 * @desc    Proxy para vídeos do Facebook
 */
router.get('/video', mediaProxyController.proxyVideo);

export default router;
