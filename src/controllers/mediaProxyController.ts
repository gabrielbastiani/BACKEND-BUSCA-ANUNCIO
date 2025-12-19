// src/controllers/mediaProxyController.ts
import { Request, Response } from 'express';
import axios from 'axios';

export class MediaProxyController {
  /**
   * Proxy para imagens do Facebook
   */
  async proxyImage(req: Request, res: Response): Promise<void> {
    try {
      const { url } = req.query;

      if (!url || typeof url !== 'string') {
        res.status(400).json({ error: 'URL é obrigatória' });
        return;
      }

      console.log('📸 Proxy de imagem:', url);

      // Faz requisição com headers que imitam um navegador
      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
          'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
          'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
          'Referer': 'https://www.facebook.com/',
          'Sec-Fetch-Dest': 'image',
          'Sec-Fetch-Mode': 'no-cors',
          'Sec-Fetch-Site': 'cross-site',
        },
        timeout: 30000,
      });

      // Define headers de resposta
      res.set({
        'Content-Type': response.headers['content-type'] || 'image/jpeg',
        'Cache-Control': 'public, max-age=86400', // Cache de 1 dia
        'Access-Control-Allow-Origin': '*',
      });

      res.send(Buffer.from(response.data));
    } catch (error: any) {
      console.error('Erro no proxy de imagem:', error.message);
      res.status(500).json({ 
        error: 'Erro ao carregar imagem',
        details: error.message 
      });
    }
  }

  /**
   * Proxy para vídeos do Facebook
   */
  async proxyVideo(req: Request, res: Response): Promise<void> {
    try {
      const { url } = req.query;

      if (!url || typeof url !== 'string') {
        res.status(400).json({ error: 'URL é obrigatória' });
        return;
      }

      console.log('🎥 Proxy de vídeo:', url);

      const response = await axios.get(url, {
        responseType: 'stream',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
          'Accept': 'video/webm,video/ogg,video/*;q=0.9,application/ogg;q=0.7,audio/*;q=0.6,*/*;q=0.5',
          'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
          'Referer': 'https://www.facebook.com/',
          'Range': req.headers.range || 'bytes=0-',
        },
        timeout: 60000,
      });

      res.set({
        'Content-Type': response.headers['content-type'] || 'video/mp4',
        'Content-Length': response.headers['content-length'],
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=86400',
        'Access-Control-Allow-Origin': '*',
      });

      if (response.headers['content-range']) {
        res.set('Content-Range', response.headers['content-range']);
        res.status(206);
      }

      response.data.pipe(res);
    } catch (error: any) {
      console.error('Erro no proxy de vídeo:', error.message);
      res.status(500).json({ 
        error: 'Erro ao carregar vídeo',
        details: error.message 
      });
    }
  }
}

export default new MediaProxyController();
