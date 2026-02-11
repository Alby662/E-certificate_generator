-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_projects" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "template_path" TEXT NOT NULL,
    "fields" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "preview_approved" BOOLEAN NOT NULL DEFAULT false,
    "preview_approved_at" DATETIME,
    "last_field_update_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "email_status" TEXT NOT NULL DEFAULT 'not_started',
    "email_sent_count" INTEGER NOT NULL DEFAULT 0,
    "email_failed_count" INTEGER NOT NULL DEFAULT 0,
    "email_started_at" DATETIME,
    "email_completed_at" DATETIME,
    CONSTRAINT "projects_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_projects" ("created_at", "fields", "id", "last_field_update_at", "name", "preview_approved", "preview_approved_at", "template_path", "user_id") SELECT "created_at", "fields", "id", "last_field_update_at", "name", "preview_approved", "preview_approved_at", "template_path", "user_id" FROM "projects";
DROP TABLE "projects";
ALTER TABLE "new_projects" RENAME TO "projects";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
