-- CreateTable
CREATE TABLE "ads" (
    "id" TEXT NOT NULL,
    "adId" TEXT NOT NULL,
    "pageName" TEXT NOT NULL,
    "adCreativeUrl" TEXT,
    "adText" TEXT,
    "adImageUrl" TEXT,
    "adVideoUrl" TEXT,
    "adLink" TEXT,
    "adPlatform" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "status" TEXT,
    "keyword" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "currency" TEXT,
    "platformSpecificData" JSONB,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ads_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ads_adId_key" ON "ads"("adId");
