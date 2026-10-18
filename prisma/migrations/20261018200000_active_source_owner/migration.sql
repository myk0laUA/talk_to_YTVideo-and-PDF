-- Retain the existing nullable column and unique index: no row rewrite/backfill.
-- Prisma activeSourceOwner maps to the legacy uploadedPdfOwner column.
-- Atomic constraint replacement; all previously valid PDF/proof rows remain valid.
BEGIN;
ALTER TABLE "Source" DROP CONSTRAINT "Source_uploaded_pdf_identity";
ALTER TABLE "Source" ADD CONSTRAINT "Source_active_source_identity" CHECK (
  "uploadedPdfOwner" IS NULL OR (
    "uploadedPdfOwner" = "ownerSessionHash" AND "extractionStatus" = 'READY'
    AND "provider" IS NOT NULL AND (
      ("kind" = 'PDF' AND "provider" = 'pdf-parse@2.4.5' AND "canonicalOrigin" IS NULL)
      OR ("kind" = 'YOUTUBE' AND "provider" IN ('youtube-transcript-plus@2.0.3', 'supadata')
        AND "canonicalOrigin" IS NOT NULL
        AND "canonicalOrigin" ~ '^https://www[.]youtube[.]com/watch[?]v=[A-Za-z0-9_-]{11}$'
        AND "language" IS NOT NULL AND "language" ~ '^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})*$'
        AND length("language") <= 35 AND "pageCount" IS NULL)
    )
  )
);
COMMIT;
