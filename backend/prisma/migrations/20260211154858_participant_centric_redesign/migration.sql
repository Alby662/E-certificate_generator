-- AlterTable
ALTER TABLE "users" ADD COLUMN "organization_name" TEXT;

-- CreateTable
CREATE TABLE "participants" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" INTEGER NOT NULL,
    "participant_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "organization" TEXT,
    "department" TEXT,
    "job_title" TEXT,
    "custom_data" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "events" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "event_date" DATETIME,
    "event_type" TEXT,
    "description" TEXT,
    "organization_name" TEXT NOT NULL,
    "template_path" TEXT NOT NULL,
    "fields" TEXT NOT NULL,
    "preview_approved" BOOLEAN NOT NULL DEFAULT false,
    "preview_approved_at" DATETIME,
    "last_field_update_at" DATETIME,
    "email_status" TEXT DEFAULT 'not_started',
    "email_sent_count" INTEGER NOT NULL DEFAULT 0,
    "email_failed_count" INTEGER NOT NULL DEFAULT 0,
    "email_started_at" DATETIME,
    "email_completed_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "event_participations" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "participant_id" INTEGER NOT NULL,
    "event_id" INTEGER NOT NULL,
    "certificate_id" TEXT NOT NULL,
    "certificate_path" TEXT,
    "generated_at" DATETIME,
    "role" TEXT,
    "status" TEXT,
    "grade" TEXT,
    "remarks" TEXT,
    "custom_event_data" TEXT,
    "email_status" TEXT NOT NULL DEFAULT 'pending',
    "email_sent_at" DATETIME,
    "email_error" TEXT,
    "email_retries" INTEGER NOT NULL DEFAULT 0,
    "email_last_retry_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "event_participations_participant_id_fkey" FOREIGN KEY ("participant_id") REFERENCES "participants" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "event_participations_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "participants_participant_id_key" ON "participants"("participant_id");

-- CreateIndex
CREATE INDEX "participants_email_idx" ON "participants"("email");


-- CreateIndex
CREATE INDEX "participants_user_id_idx" ON "participants"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "participants_user_id_email_key" ON "participants"("user_id", "email");

-- CreateIndex
CREATE INDEX "events_user_id_idx" ON "events"("user_id");

-- CreateIndex
CREATE INDEX "events_event_date_idx" ON "events"("event_date");

-- CreateIndex
CREATE UNIQUE INDEX "events_user_id_name_event_date_key" ON "events"("user_id", "name", "event_date");

-- CreateIndex
CREATE UNIQUE INDEX "event_participations_certificate_id_key" ON "event_participations"("certificate_id");

-- CreateIndex
CREATE INDEX "event_participations_participant_id_idx" ON "event_participations"("participant_id");

-- CreateIndex
CREATE INDEX "event_participations_event_id_idx" ON "event_participations"("event_id");



-- CreateIndex
CREATE INDEX "event_participations_email_status_idx" ON "event_participations"("email_status");

-- CreateIndex
CREATE UNIQUE INDEX "event_participations_participant_id_event_id_key" ON "event_participations"("participant_id", "event_id");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");
