-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_email_logs" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "participant_id" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "error_message" TEXT,
    "error_category" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 1,
    "sent_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "email_logs_participant_id_fkey" FOREIGN KEY ("participant_id") REFERENCES "participants" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_email_logs" ("created_at", "error_message", "id", "participant_id", "sent_at", "status") SELECT "created_at", "error_message", "id", "participant_id", "sent_at", "status" FROM "email_logs";
DROP TABLE "email_logs";
ALTER TABLE "new_email_logs" RENAME TO "email_logs";
CREATE INDEX "email_logs_participant_id_idx" ON "email_logs"("participant_id");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
