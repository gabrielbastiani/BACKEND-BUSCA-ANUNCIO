// src/types/index.d.ts

import { Request } from 'express';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
      };
    }
  }
}

export interface AdScraperParams {
  keyword: string;
  country?: string;
  maxAds?: number;
  scrollAttempts?: number;
}

export interface ScrapedAd {
  adId: string;
  pageName: string;
  adCreativeUrl?: string;
  adText?: string;
  adImageUrl?: string;
  adVideoUrl?: string;
  adLink?: string;
  adPlatform?: string;
  startDate?: Date;
  endDate?: Date;
  status?: string;
  keyword: string;
  country: string;
  currency?: string;
  platformSpecificData?: any;
}

export interface ScraperResult {
  success: boolean;
  totalAdsCollected: number;
  ads: ScrapedAd[];
  errors?: string[];
}