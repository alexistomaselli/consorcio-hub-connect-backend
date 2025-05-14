-- AlterTable
ALTER TABLE "email_verifications" ADD COLUMN     "registrationData" JSONB,
ALTER COLUMN "userId" DROP NOT NULL;
