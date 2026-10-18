-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "SourceKind" AS ENUM ('PDF', 'YOUTUBE');

-- CreateEnum
CREATE TYPE "ExtractionStatus" AS ENUM ('PENDING', 'READY', 'FAILED');

-- CreateTable
CREATE TABLE "Source" (
    "id" UUID NOT NULL,
    "ownerSessionHash" VARCHAR(64) NOT NULL,
    "kind" "SourceKind" NOT NULL,
    "canonicalOrigin" TEXT,
    "title" TEXT NOT NULL,
    "fullText" TEXT NOT NULL DEFAULT '',
    "sections" JSONB NOT NULL DEFAULT '[]',
    "language" TEXT,
    "provider" TEXT,
    "extractionStatus" "ExtractionStatus" NOT NULL DEFAULT 'PENDING',
    "providerJobId" TEXT,
    "characterCount" INTEGER NOT NULL DEFAULT 0,
    "wordCount" INTEGER NOT NULL DEFAULT 0,
    "pageCount" INTEGER,
    "warnings" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Source_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TranscriptCache" (
    "id" UUID NOT NULL,
    "videoId" VARCHAR(11) NOT NULL,
    "languagePreference" TEXT NOT NULL DEFAULT '',
    "mode" TEXT NOT NULL DEFAULT 'native',
    "selectedLanguage" TEXT,
    "provider" TEXT NOT NULL,
    "providerMetadata" JSONB NOT NULL DEFAULT '{}',
    "title" TEXT NOT NULL,
    "fullText" TEXT NOT NULL,
    "sections" JSONB NOT NULL,
    "characterCount" INTEGER NOT NULL,
    "wordCount" INTEGER NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "TranscriptCache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Source_ownerSessionHash_expiresAt_idx" ON "Source"("ownerSessionHash", "expiresAt");

-- CreateIndex
CREATE INDEX "Source_expiresAt_idx" ON "Source"("expiresAt");

-- CreateIndex
CREATE INDEX "TranscriptCache_expiresAt_idx" ON "TranscriptCache"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "TranscriptCache_videoId_languagePreference_mode_key" ON "TranscriptCache"("videoId", "languagePreference", "mode");
