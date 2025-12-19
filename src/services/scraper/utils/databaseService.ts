// src/services/scraper/utils/databaseService.ts - VERSÃO FINAL SEM UPSERT

import { PrismaClient, Prisma } from '@prisma/client';
import { ScrapedAd } from '../../../@types/ad.types';

const prisma = new PrismaClient();

export class DatabaseService {
  async saveAds(ads: ScrapedAd[]): Promise<{ saved: number; failed: number; errors: string[] }> {
    let savedCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`💾 SALVAMENTO - MODO DEBUG`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`📊 Total: ${ads.length}`);
    console.log(`📝 Com adText: ${ads.filter(ad => ad.adText).length}`);

    // DIAGNÓSTICO: Verificar adIds únicos
    const uniqueAdIds = new Set(ads.map(ad => ad.adId));
    console.log(`🆔 adIds únicos: ${uniqueAdIds.size}`);
    console.log(`⚠️ Duplicatas de adId: ${ads.length - uniqueAdIds.size}`);

    // DIAGNÓSTICO: Mostrar alguns adIds
    console.log(`\n📋 Primeiros 5 adIds:`);
    ads.slice(0, 5).forEach((ad, i) => {
      console.log(`   ${i + 1}. ${ad.adId} (${ad.pageName})`);
    });

    for (let i = 0; i < ads.length; i++) {
      const ad = ads[i];

      try {
        console.log(`\n   💾 [${i + 1}/${ads.length}] ${ad.pageName}`);
        console.log(`      adId: ${ad.adId}`);
        console.log(`      libraryId: ${ad.libraryId || 'N/A'}`);
        console.log(`      adText: ${ad.adText ? ad.adText.substring(0, 50) + '...' : 'NULL'}`);

        // Validação
        if (!ad.adId) throw new Error('adId vazio');
        if (!ad.pageName) throw new Error('pageName vazio');
        if (!ad.keyword) throw new Error('keyword vazio');
        if (!ad.country) throw new Error('country vazio');

        // Gera ID SEMPRE ÚNICO para evitar duplicatas
        const uniqueAdId = ad.libraryId 
          ? `${ad.libraryId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
          : ad.adId;

        console.log(`      🔑 ID único gerado: ${uniqueAdId}`);

        // APENAS CREATE - SEM UPSERT
        const result = await prisma.ad.create({
          data: {
            adId: uniqueAdId, // ID SEMPRE ÚNICO
            pageName: ad.pageName,
            keyword: ad.keyword,
            country: ad.country,
            adCreativeUrl: ad.adCreativeUrl || null,
            adText: ad.adText || null,
            adImageUrl: ad.adImageUrl || null,
            adVideoUrl: ad.adVideoUrl || null,
            adLink: ad.adLink || null,
            adPlatform: ad.adPlatform || null,
            language: ad.language || null,
            mediaType: ad.mediaType || null,
            startDate: ad.startDate || null,
            endDate: ad.endDate || null,
            status: ad.status || null,
            activeStatus: ad.activeStatus || null,
            isActive: ad.isActive !== undefined ? ad.isActive : true,
            impressionsMin: ad.impressionsMin || null,
            impressionsMax: ad.impressionsMax || null,
            impressionsDateFrom: ad.impressionsDateFrom || null,
            impressionsDateTo: ad.impressionsDateTo || null,
            activeDays: ad.activeDays !== null && ad.activeDays !== undefined ? ad.activeDays : null,
            currency: ad.currency || null,
            platformSpecificData: ad.platformSpecificData as any,
            libraryId: ad.libraryId || null,
            impressionsEstimated: false,
          }
        });

        savedCount++;
        console.log(`      ✅ CRIADO novo registro! ID banco: ${result.id}`);

        // Verificação imediata
        const check = await prisma.ad.findUnique({
          where: { id: result.id },
          select: { adText: true, activeDays: true, pageName: true }
        });

        console.log(`      🔍 Confirmado no banco:`);
        console.log(`         Nome: ${check?.pageName}`);
        console.log(`         adText: ${check?.adText ? 'SIM' : 'NULL'}`);
        console.log(`         activeDays: ${check?.activeDays !== null ? check?.activeDays : 'NULL'}`);

      } catch (error: any) {
        failedCount++;
        const errorMsg = `[${i + 1}] ${ad.pageName}: ${error.message}`;
        console.error(`      ❌ ERRO: ${errorMsg}`);
        errors.push(errorMsg);

        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          console.error(`         Código: ${error.code}`);
          if (error.code === 'P2002') {
            console.error(`         ⚠️ DUPLICATA detectada! Campo: ${JSON.stringify(error.meta)}`);
          }
        }
      }
    }

    // Contagem final no banco
    const totalInDb = await prisma.ad.count();
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`📊 RESULTADO FINAL`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`   📤 Tentados salvar: ${ads.length}`);
    console.log(`   ✅ Salvos com sucesso: ${savedCount}`);
    console.log(`   ❌ Falhados: ${failedCount}`);
    console.log(`   🗄️ Total de registros no banco: ${totalInDb}`);

    if (errors.length > 0) {
      console.log(`\n⚠️ Erros:`);
      errors.slice(0, 10).forEach((err, idx) => {
        console.log(`   ${idx + 1}. ${err}`);
      });
    }

    return { saved: savedCount, failed: failedCount, errors };
  }

  async disconnect(): Promise<void> {
    await prisma.$disconnect();
  }
}

export default new DatabaseService();