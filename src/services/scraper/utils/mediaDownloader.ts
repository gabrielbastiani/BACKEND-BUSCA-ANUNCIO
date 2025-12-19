// src/services/scraper/utils/mediaDownloader.ts

import { Page } from 'puppeteer';
import * as fs from 'fs';
import * as path from 'path';

export class MediaDownloader {
  private page: Page | null = null;

  setPage(page: Page): void {
    this.page = page;
  }

  async download(
    mediaUrl: string,
    adIdentifier: string,
    type: 'image' | 'video'
  ): Promise<string | null> {
    if (!this.page || !mediaUrl || !mediaUrl.startsWith('http')) {
      return null;
    }

    try {
      const crypto = require('crypto');
      const axios = require('axios');

      // Gera nome do arquivo
      const hash = crypto.createHash('md5')
        .update(adIdentifier + mediaUrl)
        .digest('hex')
        .substring(0, 12);

      let ext = type === 'video' ? 'mp4' : 'jpg';

      if (type === 'image') {
        const urlPath = new URL(mediaUrl).pathname;
        const inferredExt = path.extname(urlPath).toLowerCase();
        if (['.jpg', '.jpeg', '.png', '.gif', '.webp', '.avif'].includes(inferredExt)) {
          ext = inferredExt.substring(1);
        }
      }

      const fileName = `ad_${hash}.${ext}`;
      const mediaDir = path.join(process.cwd(), 'public', 'media');
      const filePath = path.join(mediaDir, fileName);

      // Verifica se já existe
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        const minSize = type === 'video' ? 50000 : 10000;
        if (stats.size >= minSize) {
          console.log(`      ✅ Arquivo existe: ${fileName}`);
          return `/media/${fileName}`;
        } else {
          fs.unlinkSync(filePath);
        }
      }

      // Cria diretório se não existe
      if (!fs.existsSync(mediaDir)) {
        fs.mkdirSync(mediaDir, { recursive: true });
      }

      // Prepara headers
      const cookies = await this.page.cookies();
      const cookieString = cookies.map(c => `${c.name}=${c.value}`).join('; ');
      const userAgent = await this.page.evaluate(() => navigator.userAgent);

      console.log(`      📥 Baixando ${type}...`);

      // Faz download
      const response = await axios.get(mediaUrl, {
        responseType: 'arraybuffer',
        headers: {
          'Cookie': cookieString,
          'User-Agent': userAgent,
          'Referer': 'https://www.facebook.com/',
          'Host': new URL(mediaUrl).host,
          'Origin': 'https://www.facebook.com',
          'Accept': type === 'video' 
            ? 'video/webm,video/ogg,video/*;q=0.9,application/ogg;q=0.7,audio/*;q=0.6,*/*;q=0.5' 
            : 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
          'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
          'Accept-Encoding': 'gzip, deflate, br',
          'Sec-Fetch-Dest': type === 'video' ? 'video' : 'image',
          'Sec-Fetch-Mode': 'no-cors',
          'Sec-Fetch-Site': 'cross-site',
        },
        timeout: type === 'video' ? 120000 : 45000,
        maxRedirects: 5,
        maxContentLength: type === 'video' ? 150 * 1024 * 1024 : 15 * 1024 * 1024,
        validateStatus: (status: number) => status === 200,
      });

      const buffer = Buffer.from(response.data);

      // Valida tamanho
      const minSize = type === 'video' ? 50000 : 10000;
      if (buffer.length < minSize) {
        throw new Error(`Arquivo muito pequeno: ${buffer.length} bytes`);
      }

      // Salva arquivo
      fs.writeFileSync(filePath, buffer);

      const stats = fs.statSync(filePath);
      const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
      const sizeKB = (stats.size / 1024).toFixed(2);
      const sizeStr = stats.size > 1024 * 1024 ? `${sizeMB} MB` : `${sizeKB} KB`;

      console.log(`      ✅ Salvo: ${fileName} (${sizeStr})`);

      return `/media/${fileName}`;

    } catch (error: any) {
      console.error(`      ❌ Falha ao baixar ${type}:`, error.message);
      return null;
    }
  }
}

export default new MediaDownloader();