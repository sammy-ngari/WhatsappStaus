-- DropIndex
DROP INDEX "users_national_id_key";

-- AlterTable
ALTER TABLE "organizations" ADD COLUMN     "logo_url" VARCHAR(255);

-- AlterTable
ALTER TABLE "brands" ADD COLUMN     "logo_url" VARCHAR(255);

-- AlterTable
ALTER TABLE "users" DROP COLUMN "date_of_birth",
DROP COLUMN "gender",
DROP COLUMN "national_id",
DROP COLUMN "next_of_kin",
DROP COLUMN "next_of_kin_contacts",
DROP COLUMN "phone",
ADD COLUMN     "display_name" VARCHAR(100),
ADD COLUMN     "profile_picture_url" VARCHAR(255);

-- CreateTable
CREATE TABLE "affiliate_profiles" (
    "id" UUID NOT NULL,
    "user_id" VARCHAR(50) NOT NULL,
    "national_id" VARCHAR(20),
    "date_of_birth" VARCHAR(20),
    "gender" VARCHAR(10),
    "phone" VARCHAR(20),
    "next_of_kin" VARCHAR(100),
    "next_of_kin_contacts" VARCHAR(100),
    "payout_account" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "affiliate_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "affiliate_profiles_user_id_key" ON "affiliate_profiles"("user_id");

-- AddForeignKey
ALTER TABLE "affiliate_profiles" ADD CONSTRAINT "affiliate_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
