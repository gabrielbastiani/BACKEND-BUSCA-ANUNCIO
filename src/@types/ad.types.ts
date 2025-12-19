// src/types/ad.types.ts

export interface AdScraperParams {
  keyword: string;
  country?: string;
  maxAds?: number;
  scrollAttempts?: number;
  filters?: AdFilters;
}

export interface AdFilters {
  language?: string;           // 'pt-BR', 'en-US', 'all'
  advertiser?: string;         // Nome específico do anunciante ou 'all'
  platform?: string[];         // ['facebook', 'instagram', 'messenger', 'audience_network']
  mediaType?: string;          // 'image', 'video', 'carousel', 'all'
  activeStatus?: 'active' | 'inactive' | 'all';
  impressionsDateFrom?: string; // ISO date string
  impressionsDateTo?: string;   // ISO date string
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

  // Novos campos
  language?: string;
  mediaType?: string;
  startDate?: Date;
  endDate?: Date;
  status?: string;
  activeStatus?: string;
  isActive?: boolean;
  activeDays?: number; // Quantos dias ativo

  impressionsMin?: number;
  impressionsMax?: number;
  impressionsDateFrom?: Date;
  impressionsDateTo?: Date;

  keyword: string;
  country: string;
  currency?: string;
  platformSpecificData?: any;
  libraryId?: string;
}

export interface ScraperResult {
  success: boolean;
  totalAdsCollected: number;
  ads: ScrapedAd[];
  filters?: AdFilters;
  errors?: string[];
}

export interface FilterOption {
  value: string;
  label: string;
}

export interface AvailableFilters {
  languages: FilterOption[];
  advertisers: FilterOption[];
  platforms: FilterOption[];
  mediaTypes: FilterOption[];
  activeStatuses: FilterOption[];
}

// Filtros para listagem/busca
export interface AdListFilters {
  keyword?: string;
  country?: string;
  pageName?: string;
  language?: string;
  mediaType?: string;
  platform?: string;
  status?: string;
  isActive?: boolean;
  startDateFrom?: string;
  startDateTo?: string;
  page?: number;
  limit?: number;
  sortBy?: 'created_at' | 'updated_at' | 'startDate' | 'pageName' | 'impressionsMax' | 'activeDays';
  sortOrder?: 'asc' | 'desc';
  minActiveDays?: number; // Período mínimo ativo
  maxActiveDays?: number;
  hasImpressions?: boolean;
  minImpressions?: number;
  maxImpressions?: number;
  minSameCreative?: number;
  recentlyPublished?: number;
  publishedFrom?: string;
  publishedTo?: string;
}

export interface AdListResponse {
  ads: any[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  filters: AdListFilters;
}