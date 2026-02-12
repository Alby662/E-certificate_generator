-- AlterTable
ALTER TABLE "projects" ADD COLUMN "event_date" DATETIME;
ALTER TABLE "projects" ADD COLUMN "event_name" TEXT;
ALTER TABLE "projects" ADD COLUMN "organization_name" TEXT DEFAULT 'Yukti Yantra';
