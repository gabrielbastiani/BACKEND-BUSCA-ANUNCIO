-- AlterTable
ALTER TABLE "ads" ADD COLUMN     "dataConfidence" TEXT,
ADD COLUMN     "impressionsEstimated" BOOLEAN NOT NULL DEFAULT false;
