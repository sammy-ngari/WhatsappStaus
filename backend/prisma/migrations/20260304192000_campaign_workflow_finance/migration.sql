-- =================================================================================================
-- Migration: Campaign workflow expansion + participant/events tracking + earnings/withdrawals/referrals
-- Business requirement:
-- 1) Replace legacy CampaignStatus lifecycle with expanded workflow states.
-- 2) Add campaign review lifecycle fields.
-- 3) Add campaign participant and event tracking tables.
-- 4) Add financial ledger and withdrawals tables.
-- 5) Add referrals table for one-to-one referred user attribution.
-- Data integrity and backward compatibility:
-- - Existing campaign status values are validated before type conversion.
-- - Explicit value mapping preserves semantic continuity for existing rows.
-- - Foreign keys and uniqueness constraints protect referential and business integrity.
-- - Existing tables/columns remain intact; only additive changes plus requested enum replacement.
-- =================================================================================================

-- -------------------------------------------------------------------------------------------------
-- PART 1: Safe replacement of CampaignStatus enum.
-- Why: The business now needs draft/scheduled/paused/archived lifecycle states for campaigns.
-- Integrity: We validate all current values before conversion and abort on unexpected data.
-- Backward compatibility: Existing ACTIVE/INACTIVE/COMPLETED rows are deterministically mapped.
-- -------------------------------------------------------------------------------------------------
BEGIN;

-- Operational validation output required before enum transition.
SELECT DISTINCT "status"::text AS status
FROM "campaigns"
ORDER BY status;

-- Guardrail: fail fast if production contains any status outside the legacy enum contract.
DO $$
DECLARE
  unexpected_statuses TEXT[];
BEGIN
  SELECT ARRAY_AGG(s.status ORDER BY s.status)
  INTO unexpected_statuses
  FROM (
    SELECT DISTINCT "status"::text AS status
    FROM "campaigns"
    WHERE "status"::text NOT IN ('ACTIVE', 'INACTIVE', 'COMPLETED')
  ) AS s;

  IF unexpected_statuses IS NOT NULL THEN
    RAISE EXCEPTION
      'Migration aborted: campaigns.status contains unexpected values: %',
      unexpected_statuses;
  END IF;
END
$$;

-- Temporary enum with the new lifecycle states.
CREATE TYPE "CampaignStatus_new" AS ENUM (
  'DRAFT',
  'SCHEDULED',
  'ACTIVE',
  'PAUSED',
  'COMPLETED',
  'ARCHIVED'
);

-- Remove default first so PostgreSQL can safely change enum type.
ALTER TABLE "campaigns"
ALTER COLUMN "status" DROP DEFAULT;

-- Explicit mapping required by product rules:
-- ACTIVE -> ACTIVE
-- INACTIVE -> DRAFT
-- COMPLETED -> COMPLETED
ALTER TABLE "campaigns"
ALTER COLUMN "status" TYPE "CampaignStatus_new"
USING (
  CASE "status"::text
    WHEN 'ACTIVE' THEN 'ACTIVE'::"CampaignStatus_new"
    WHEN 'INACTIVE' THEN 'DRAFT'::"CampaignStatus_new"
    WHEN 'COMPLETED' THEN 'COMPLETED'::"CampaignStatus_new"
    ELSE NULL
  END
);

-- Preserve backward-compatible default behavior for newly created campaigns.
ALTER TABLE "campaigns"
ALTER COLUMN "status" SET DEFAULT 'DRAFT';

-- Swap types atomically after successful conversion.
ALTER TYPE "CampaignStatus" RENAME TO "CampaignStatus_old";
ALTER TYPE "CampaignStatus_new" RENAME TO "CampaignStatus";
DROP TYPE "CampaignStatus_old";

COMMIT;

-- -------------------------------------------------------------------------------------------------
-- PART 2: Add CampaignReviewStatus enum.
-- Why: Campaign review workflow requires explicit submission/review states.
-- Integrity: Strong enum guarantees only approved review states are persisted.
-- -------------------------------------------------------------------------------------------------
CREATE TYPE "CampaignReviewStatus" AS ENUM (
  'NOT_SUBMITTED',
  'PENDING',
  'APPROVED',
  'REJECTED'
);

-- -------------------------------------------------------------------------------------------------
-- PART 3: Alter campaigns table with review and budget tracking fields.
-- Why: Product requires campaign revision, submission, reviewer audit, and budget tracking data.
-- Integrity: Defaults keep existing rows valid; nullable audit/budget fields avoid breaking existing data.
-- Backward compatibility: Existing campaigns continue functioning without destructive changes.
-- -------------------------------------------------------------------------------------------------
ALTER TABLE "campaigns"
ADD COLUMN "review_status" "CampaignReviewStatus" NOT NULL DEFAULT 'NOT_SUBMITTED',
ADD COLUMN "revision_number" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "last_submitted_at" TIMESTAMP(3),
ADD COLUMN "reviewed_at" TIMESTAMP(3),
ADD COLUMN "reviewed_by" TEXT,
ADD COLUMN "rejection_reason" TEXT,
ADD COLUMN "budget_total" DECIMAL,
ADD COLUMN "budget_remaining" DECIMAL;

-- Review-state index supports operational filtering queues without altering existing access patterns.
CREATE INDEX "campaigns_review_status_idx" ON "campaigns"("review_status");

-- -------------------------------------------------------------------------------------------------
-- PART 4: Add CampaignEventType enum.
-- Why: Campaign analytics events must be constrained to the required canonical event set.
-- Integrity: Enum prevents invalid event categories.
-- -------------------------------------------------------------------------------------------------
CREATE TYPE "CampaignEventType" AS ENUM (
  'VIEW',
  'CLICK',
  'CONVERSION'
);

-- -------------------------------------------------------------------------------------------------
-- PART 5: Create campaign_participants table.
-- Why: Product requires persistent campaign membership records.
-- Integrity: FK constraints protect user/campaign references; unique constraint prevents duplicate joins.
-- Backward compatibility: New table is additive and does not change existing campaign/user rows.
-- -------------------------------------------------------------------------------------------------
CREATE TABLE "campaign_participants" (
  "id" UUID NOT NULL,
  "campaign_id" VARCHAR(50) NOT NULL,
  "user_id" VARCHAR(50) NOT NULL,
  "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',

  CONSTRAINT "campaign_participants_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "campaign_participants"
ADD CONSTRAINT "campaign_participants_campaign_id_fkey"
FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "campaign_participants"
ADD CONSTRAINT "campaign_participants_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE UNIQUE INDEX "campaign_participants_campaign_id_user_id_key"
ON "campaign_participants"("campaign_id", "user_id");

CREATE INDEX "campaign_participants_campaign_id_idx"
ON "campaign_participants"("campaign_id");

CREATE INDEX "campaign_participants_user_id_idx"
ON "campaign_participants"("user_id");

-- -------------------------------------------------------------------------------------------------
-- PART 6: Create campaign_events table.
-- Why: Product requires event-level tracking per campaign and affiliate actor.
-- Integrity: FK constraints preserve referential consistency; enum constrains event type values.
-- Backward compatibility: Purely additive analytics table.
-- -------------------------------------------------------------------------------------------------
CREATE TABLE "campaign_events" (
  "id" UUID NOT NULL,
  "campaign_id" VARCHAR(50) NOT NULL,
  "affiliate_id" VARCHAR(50) NOT NULL,
  "event_type" "CampaignEventType" NOT NULL,
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "campaign_events_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "campaign_events"
ADD CONSTRAINT "campaign_events_campaign_id_fkey"
FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "campaign_events"
ADD CONSTRAINT "campaign_events_affiliate_id_fkey"
FOREIGN KEY ("affiliate_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "campaign_events_campaign_id_idx"
ON "campaign_events"("campaign_id");

CREATE INDEX "campaign_events_affiliate_id_idx"
ON "campaign_events"("affiliate_id");

CREATE INDEX "campaign_events_event_type_idx"
ON "campaign_events"("event_type");

-- -------------------------------------------------------------------------------------------------
-- PART 7: Create earnings_ledger table.
-- Why: Financial entries must be recorded with exact decimal precision for auditable earnings tracking.
-- Integrity: DECIMAL is used for money; FK constraints maintain valid ownership and campaign linkage.
-- Backward compatibility: Additive ledger table without altering existing user or campaign data.
-- -------------------------------------------------------------------------------------------------
CREATE TABLE "earnings_ledger" (
  "id" UUID NOT NULL,
  "user_id" VARCHAR(50) NOT NULL,
  "campaign_id" VARCHAR(50),
  "amount" DECIMAL NOT NULL,
  "type" TEXT NOT NULL,
  "reference_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "earnings_ledger_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "earnings_ledger"
ADD CONSTRAINT "earnings_ledger_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "earnings_ledger"
ADD CONSTRAINT "earnings_ledger_campaign_id_fkey"
FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "earnings_ledger_user_id_idx"
ON "earnings_ledger"("user_id");

CREATE INDEX "earnings_ledger_campaign_id_idx"
ON "earnings_ledger"("campaign_id");

CREATE INDEX "earnings_ledger_type_idx"
ON "earnings_ledger"("type");

-- -------------------------------------------------------------------------------------------------
-- PART 8: Add WithdrawalStatus enum.
-- Why: Withdrawal review and settlement lifecycle requires constrained state transitions.
-- Integrity: Enum prevents invalid workflow values.
-- -------------------------------------------------------------------------------------------------
CREATE TYPE "WithdrawalStatus" AS ENUM (
  'PENDING',
  'APPROVED',
  'REJECTED',
  'PAID'
);

-- -------------------------------------------------------------------------------------------------
-- PART 9: Create withdrawals table.
-- Why: Product requires request/review lifecycle records for payout withdrawals.
-- Integrity: DECIMAL preserves currency precision; FK ties withdrawal to the requesting user.
-- Backward compatibility: Additive table, no changes to existing user records.
-- -------------------------------------------------------------------------------------------------
CREATE TABLE "withdrawals" (
  "id" UUID NOT NULL,
  "user_id" VARCHAR(50) NOT NULL,
  "amount" DECIMAL NOT NULL,
  "status" "WithdrawalStatus" NOT NULL DEFAULT 'PENDING',
  "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reviewed_at" TIMESTAMP(3),
  "reviewed_by" TEXT,
  "notes" TEXT,

  CONSTRAINT "withdrawals_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "withdrawals"
ADD CONSTRAINT "withdrawals_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "withdrawals_user_id_idx"
ON "withdrawals"("user_id");

CREATE INDEX "withdrawals_status_idx"
ON "withdrawals"("status");

-- -------------------------------------------------------------------------------------------------
-- PART 10: Create referrals table.
-- Why: Product needs durable referral attribution between referrer and referred user.
-- Integrity: Unique referred_user_id enforces one-to-one referral ownership.
-- Backward compatibility: Additive relationship table with no mutation of user table structure.
-- -------------------------------------------------------------------------------------------------
CREATE TABLE "referrals" (
  "id" UUID NOT NULL,
  "referrer_id" VARCHAR(50) NOT NULL,
  "referred_user_id" VARCHAR(50) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "referrals_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "referrals"
ADD CONSTRAINT "referrals_referrer_id_fkey"
FOREIGN KEY ("referrer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "referrals"
ADD CONSTRAINT "referrals_referred_user_id_fkey"
FOREIGN KEY ("referred_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE UNIQUE INDEX "referrals_referred_user_id_key"
ON "referrals"("referred_user_id");

CREATE INDEX "referrals_referrer_id_idx"
ON "referrals"("referrer_id");
