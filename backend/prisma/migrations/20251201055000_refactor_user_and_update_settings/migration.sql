-- Drop old BannedUser table if exists
DROP TABLE IF EXISTS "BannedUser";

-- CreateTable User (replaces BannedUser)
CREATE TABLE IF NOT EXISTS "User" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "isBanned" BOOLEAN NOT NULL DEFAULT false,
    "banReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");

-- Add new columns to Settings if they don't exist
ALTER TABLE "Settings" ADD COLUMN IF NOT EXISTS "defaultImageDurationHours" INTEGER NOT NULL DEFAULT 24;
ALTER TABLE "Settings" ADD COLUMN IF NOT EXISTS "autoBanEnabled" BOOLEAN NOT NULL DEFAULT false;
