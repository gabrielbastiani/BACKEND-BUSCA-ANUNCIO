// src/services/mediaDownloadService.ts - VERSÃO FINAL E COMPLETA

import { Page, ElementHandle } from 'puppeteer';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import axios from 'axios';

interface MediaDownloadResult {
  localPath: string | null;
  originalUrl: string;
  success: boolean;
  type: 'image' | 'video';
}

export class MediaDownloadService {
  private mediaDir: string;

  constructor() {
    this.mediaDir = path.join(process.cwd(), 'public', 'media');
    this.ensureMediaDirectory();
  }

  private async wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private ensureMediaDirectory(): void {
    if (!fs.existsSync(this.mediaDir)) {
      fs.mkdirSync(this.mediaDir, { recursive: true });
      console.log('📁 Diretório de mídias criado:', this.mediaDir);
    }
  }

  /**
   * Gera nome único de arquivo vinculado ao anúncio
   */
  private generateFileName(adIdentifier: string, mediaUrl: string, ext: string): string {
    const adHash = crypto.createHash('md5').update(adIdentifier).digest('hex').substring(0, 8);
    const urlHash = crypto.createHash('md5').update(mediaUrl).digest('hex').substring(0, 8);
    return `ad_${adHash}_${urlHash}.${ext}`;
  }

  /**
   * Extrai URL real do elemento de imagem
   */
  private async extractRealImageUrl(imgElement: ElementHandle<Element>): Promise<string | null> {
    try {
      const url = await imgElement.evaluate((img: Element) => {
        const imgEl = img as HTMLImageElement;

        // Tenta várias propriedades
        if (imgEl.currentSrc) return imgEl.currentSrc;
        if (imgEl.src) return imgEl.src;

        // Tenta srcset
        const srcset = imgEl.srcset || imgEl.getAttribute('srcset');
        if (srcset) {
          const urls = srcset.split(',').map(s => s.trim().split(' ')[0]);
          return urls[urls.length - 1]; // Maior resolução
        }

        return imgEl.getAttribute('src') || null;
      });

      return url;
    } catch (error) {
      return null;
    }
  }

  /**
   * Extrai URL real do elemento de vídeo
   */
  private async extractRealVideoUrl(videoElement: ElementHandle<Element>): Promise<string | null> {
    try {
      const url = await videoElement.evaluate((video: Element) => {
        const vidEl = video as HTMLVideoElement;

        // Tenta src direto
        if (vidEl.currentSrc) return vidEl.currentSrc;
        if (vidEl.src) return vidEl.src;

        // Tenta source element
        const source = vidEl.querySelector('source');
        if (source && source.src) return source.src;

        return vidEl.getAttribute('src') || null;
      });

      return url;
    } catch (error) {
      return null;
    }
  }

  /**
   * Baixa mídia de um container específico de anúncio
   */
  async downloadMediaFromAdContainer(
    page: Page, 
    containerElement: ElementHandle<Element>,
    adIdentifier: string
  ): Promise<{ image: MediaDownloadResult | null; video: MediaDownloadResult | null }> {

    const result = {
      image: null as MediaDownloadResult | null,
      video: null as MediaDownloadResult | null,
    };

    try {
      // Procura por elemento de imagem
      const imgElement = await containerElement.$('img[src*="scontent"], img[src*="fbcdn"]');

      if (imgElement) {
        const imageUrl = await this.extractRealImageUrl(imgElement);

        if (imageUrl) {
          console.log(`      🖼️  Imagem encontrada no anúncio`);
          const downloadResult = await this.downloadImage(page, imageUrl, adIdentifier);
          result.image = downloadResult;
        }
      }

      // Procura por elemento de vídeo
      const videoElement = await containerElement.$('video');

      if (videoElement) {
        const videoUrl = await this.extractRealVideoUrl(videoElement);

        if (videoUrl) {
          console.log(`      🎥 Vídeo encontrado no anúncio`);
          const downloadResult = await this.downloadVideo(page, videoUrl, adIdentifier);
          result.video = downloadResult;
        }
      }

    } catch (error: any) {
      console.error('      ❌ Erro ao processar mídias do container:', error.message);
    }

    return result;
  }

  /**
   * Faz download de imagem
   */
  private async downloadImage(
    page: Page, 
    imageUrl: string, 
    adIdentifier: string
  ): Promise<MediaDownloadResult> {

    const result: MediaDownloadResult = {
      localPath: null,
      originalUrl: imageUrl,
      success: false,
      type: 'image',
    };

    try {
      if (!imageUrl || !imageUrl.startsWith('http')) {
        return result;
      }

      const fileName = this.generateFileName(adIdentifier, imageUrl, 'jpg');
      const filePath = path.join(this.mediaDir, fileName);

      // Se já existe
      if (fs.existsSync(filePath)) {
        console.log(`      ✅ Imagem já existe: ${fileName}`);
        result.localPath = `/media/${fileName}`;
        result.success = true;
        return result;
      }

      console.log(`      📥 Baixando imagem...`);

      // Pega cookies e user agent da sessão
      const cookies = await page.cookies();
      const cookieString = cookies.map(c => `${c.name}=${c.value}`).join('; ');
      const userAgent = await page.evaluate(() => navigator.userAgent);

      // Faz download
      const response = await axios.get(imageUrl, {
        responseType: 'arraybuffer',
        headers: {
          'Cookie': cookieString,
          'User-Agent': userAgent,
          'Referer': 'https://www.facebook.com/',
          'Accept': 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
          'Accept-Language': 'pt-BR,pt;q=0.9',
          'Sec-Fetch-Dest': 'image',
          'Sec-Fetch-Mode': 'no-cors',
          'Sec-Fetch-Site': 'cross-site',
        },
        timeout: 30000,
        maxRedirects: 5,
      });

      // Valida que é uma imagem válida
      const buffer = Buffer.from(response.data);
      if (buffer.length < 100) {
        throw new Error('Arquivo muito pequeno (provavelmente não é uma imagem válida)');
      }

      // Salva
      fs.writeFileSync(filePath, buffer);

      const stats = fs.statSync(filePath);
      console.log(`      ✅ Imagem salva: ${fileName} (${(stats.size / 1024).toFixed(2)} KB)`);

      result.localPath = `/media/${fileName}`;
      result.success = true;

    } catch (error: any) {
      console.error(`      ⚠️ Falha ao baixar imagem: ${error.message}`);
      result.success = false;
    }

    return result;
  }

  /**
   * Faz download de vídeo
   */
  private async downloadVideo(
    page: Page, 
    videoUrl: string, 
    adIdentifier: string
  ): Promise<MediaDownloadResult> {

    const result: MediaDownloadResult = {
      localPath: null,
      originalUrl: videoUrl,
      success: false,
      type: 'video',
    };

    try {
      if (!videoUrl || !videoUrl.startsWith('http')) {
        return result;
      }

      const fileName = this.generateFileName(adIdentifier, videoUrl, 'mp4');
      const filePath = path.join(this.mediaDir, fileName);

      // Se já existe
      if (fs.existsSync(filePath)) {
        console.log(`      ✅ Vídeo já existe: ${fileName}`);
        result.localPath = `/media/${fileName}`;
        result.success = true;
        return result;
      }

      console.log(`      📥 Baixando vídeo (pode demorar)...`);

      // Pega cookies e user agent
      const cookies = await page.cookies();
      const cookieString = cookies.map(c => `${c.name}=${c.value}`).join('; ');
      const userAgent = await page.evaluate(() => navigator.userAgent);

      // Faz download
      const response = await axios.get(videoUrl, {
        responseType: 'arraybuffer',
        headers: {
          'Cookie': cookieString,
          'User-Agent': userAgent,
          'Referer': 'https://www.facebook.com/',
          'Accept': 'video/*,*/*;q=0.9',
          'Accept-Language': 'pt-BR,pt;q=0.9',
          'Sec-Fetch-Dest': 'video',
          'Sec-Fetch-Mode': 'no-cors',
          'Sec-Fetch-Site': 'cross-site',
        },
        timeout: 90000, // 90 segundos
        maxRedirects: 5,
        maxContentLength: 100 * 1024 * 1024, // 100MB max
      });

      // Valida tamanho
      const buffer = Buffer.from(response.data);
      if (buffer.length < 1000) {
        throw new Error('Arquivo muito pequeno (provavelmente não é um vídeo válido)');
      }

      // Salva
      fs.writeFileSync(filePath, buffer);

      const stats = fs.statSync(filePath);
      console.log(`      ✅ Vídeo salvo: ${fileName} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);

      result.localPath = `/media/${fileName}`;
      result.success = true;

    } catch (error: any) {
      console.error(`      ⚠️ Falha ao baixar vídeo: ${error.message}`);
      result.success = false;
    }

    return result;
  }

  /**
   * Limpa mídias antigas
   */
  cleanOldMedia(daysOld: number = 30): void {
    try {
      if (!fs.existsSync(this.mediaDir)) return;

      const files = fs.readdirSync(this.mediaDir);
      const now = Date.now();
      const maxAge = daysOld * 24 * 60 * 60 * 1000;
      let deletedCount = 0;

      files.forEach(file => {
        try {
          const filePath = path.join(this.mediaDir, file);
          const stats = fs.statSync(filePath);
          const age = now - stats.mtimeMs;

          if (age > maxAge) {
            fs.unlinkSync(filePath);
            deletedCount++;
          }
        } catch (error) {
          // Ignora erros individuais
        }
      });

      if (deletedCount > 0) {
        console.log(`🗑️ Limpeza: ${deletedCount} arquivos removidos`);
      }
    } catch (error) {
      console.error('Erro ao limpar mídias:', error);
    }
  }
}

export default new MediaDownloadService();