/*
  Warnings:

  - Added the required column `updated_at` to the `ads` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ads" ADD COLUMN     "activeStatus" TEXT,
ADD COLUMN     "impressionsDateFrom" TIMESTAMP(3),
ADD COLUMN     "impressionsDateTo" TIMESTAMP(3),
ADD COLUMN     "impressionsMax" INTEGER,
ADD COLUMN     "impressionsMin" INTEGER,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "language" TEXT,
ADD COLUMN     "libraryId" TEXT,
ADD COLUMN     "mediaType" TEXT,
ADD COLUMN     "updated_at" TIMESTAMPTZ(3) NOT NULL;

-- CreateTable
CREATE TABLE "search_history" (
    "id" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "filters" JSONB,
    "totalAdsFound" INTEGER NOT NULL DEFAULT 0,
    "totalAdsSaved" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL,
    "errorMessage" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "search_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "search_history_keyword_idx" ON "search_history"("keyword");

-- CreateIndex
CREATE INDEX "search_history_status_idx" ON "search_history"("status");

-- CreateIndex
CREATE INDEX "search_history_created_at_idx" ON "search_history"("created_at");

-- CreateIndex
CREATE INDEX "ads_keyword_idx" ON "ads"("keyword");

-- CreateIndex
CREATE INDEX "ads_country_idx" ON "ads"("country");

-- CreateIndex
CREATE INDEX "ads_pageName_idx" ON "ads"("pageName");

-- CreateIndex
CREATE INDEX "ads_language_idx" ON "ads"("language");

-- CreateIndex
CREATE INDEX "ads_mediaType_idx" ON "ads"("mediaType");

-- CreateIndex
CREATE INDEX "ads_status_idx" ON "ads"("status");

-- CreateIndex
CREATE INDEX "ads_startDate_idx" ON "ads"("startDate");

-- CreateIndex
CREATE INDEX "ads_isActive_idx" ON "ads"("isActive");
