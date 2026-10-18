-- Nullable unique ownership slot: existing/synthetic records remain untouched.
ALTER TABLE "Source" ADD COLUMN "uploadedPdfOwner" VARCHAR(64);
CREATE UNIQUE INDEX "Source_uploadedPdfOwner_key" ON "Source"("uploadedPdfOwner");
ALTER TABLE "Source" ADD CONSTRAINT "Source_uploaded_pdf_identity" CHECK (
  "uploadedPdfOwner" IS NULL OR (
    "uploadedPdfOwner" = "ownerSessionHash" AND "kind" = 'PDF'
    AND "extractionStatus" = 'READY' AND "provider" IS NOT NULL
    AND "provider" = 'pdf-parse@2.4.5' AND "canonicalOrigin" IS NULL
  )
);
