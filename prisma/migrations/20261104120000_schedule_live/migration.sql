ALTER TABLE "course" ADD COLUMN     "scheduleLive" BOOLEAN NOT NULL DEFAULT false;

-- Keep existing courses bookable; only new courses start hidden.
UPDATE "course" SET "scheduleLive" = true;
