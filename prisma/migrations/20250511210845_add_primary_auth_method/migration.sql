-- AlterTable
ALTER TABLE "users" ADD COLUMN     "primaryAuthMethod" TEXT NOT NULL DEFAULT 'EMAIL';
