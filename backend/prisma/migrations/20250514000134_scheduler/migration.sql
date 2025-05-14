-- AlterTable
ALTER TABLE "Image" ADD COLUMN     "lastQueuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "Scheduler" (
    "id" INTEGER NOT NULL,
    "nextRunAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Scheduler_pkey" PRIMARY KEY ("id")
);
