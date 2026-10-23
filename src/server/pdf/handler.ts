import "server-only";
import type { PdfFailureCode, PdfResult } from "../../shared/pdf.ts";
import { Admission, type Limits } from "../proof/admission.ts";
import type { VisitorConfig } from "../proof/config.ts";
import { createVisitor, readVisitor, visitorCookie } from "../proof/visitor.ts";
import { PdfError, pdfErrors } from "./errors.ts";
import { readPdfMultipart } from "./multipart.ts";
import type { PdfParser } from "./worker.ts";

export const pdfLimits: Limits = { visitor: 6, ip: 20, global: 20, windowMs: 3_600_000, concurrent: 1 };
const reply = (status: number, dto: PdfResult, cookie?: string) => Response.json(dto, { status,
  headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", ...(cookie ? { "Set-Cookie": cookie } : {}) } });
const fail = (code: PdfFailureCode, cookie?: string) => reply(pdfErrors[code][0], { ok: false, error: { code, message: pdfErrors[code][1] } }, cookie);

export function createPdfHandler(deps: { config: () => VisitorConfig | null; parse: PdfParser;
  admission?: Admission; now?: () => number; uploadMs?: number }) {
  const admission = deps.admission ?? new Admission(pdfLimits);
  const now = deps.now ?? Date.now;
  return async (request: Request): Promise<Response> => {
    let release: (() => void) | undefined;
    try {
      const config = deps.config();
      if (!config) return fail("disabled");
      if (request.method !== "POST") return reply(405, { ok: false, error: { code: "invalid_request", message: "Method not allowed" } });
      if (request.headers.get("origin") !== config.origin || ![null, "same-origin"].includes(request.headers.get("sec-fetch-site"))) return fail("forbidden");
      const visitor = readVisitor(request.headers.get("cookie"), config, now());
      if (!visitor) return fail("visitor_required", visitorCookie(createVisitor(config, now()), config, now()));
      release = admission.acquire(visitor.owner, "unverified-network", now()) ?? undefined;
      if (!release) return fail("limit_reached");
      const bytes = await readPdfMultipart(request, deps.uploadMs);
      const extraction = await deps.parse(bytes, request.signal);
      if (request.signal.aborted) return fail("cancelled");
      return reply(200, { ok: true, extraction });
    } catch (error) { return fail(error instanceof PdfError ? error.code : "internal"); }
    finally { release?.(); }
  };
}
