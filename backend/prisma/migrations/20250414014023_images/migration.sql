/*
  Warnings:

  - You are about to drop the `Images` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "Images";

-- CreateTable
CREATE TABLE "Image" (
    "id" SERIAL NOT NULL,
    "link" TEXT NOT NULL,
    "autor" TEXT NOT NULL,

    CONSTRAINT "Image_pkey" PRIMARY KEY ("id")
);
