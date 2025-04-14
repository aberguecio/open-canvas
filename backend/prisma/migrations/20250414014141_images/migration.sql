/*
  Warnings:

  - You are about to drop the column `autor` on the `Image` table. All the data in the column will be lost.
  - You are about to drop the column `link` on the `Image` table. All the data in the column will be lost.
  - Added the required column `name` to the `Image` table without a default value. This is not possible if the table is not empty.
  - Added the required column `url` to the `Image` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Image" DROP COLUMN "autor",
DROP COLUMN "link",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "name" TEXT NOT NULL,
ADD COLUMN     "url" TEXT NOT NULL;
