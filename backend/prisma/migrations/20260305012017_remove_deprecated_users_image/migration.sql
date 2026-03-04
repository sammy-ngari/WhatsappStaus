-- Migration: remove deprecated users.image column
-- The system standardized on users.profile_picture_url for avatar storage.
-- The legacy image column is no longer used by the application layer.
-- This change removes duplicate avatar fields and simplifies the identity model.
-- Safety: this migration only alters the users table and does not modify relations.

ALTER TABLE "users" DROP COLUMN "image";