import "server-only";
import type { PdfSourceFailureCode, SourceFailureCode, SourceResult } from "../../shared/source.ts";
import type { VisitorConfig } from "../proof/config.ts";
import { createVisitor, readVisitor, visitorCookie } from "../proof/visitor.ts";
import { Admission } from "../proof/admission.ts";
import { pdfLimits } from "../pdf/handler.ts";
import { PdfError, pdfErrors } from "../pdf/errors.ts";
import { readPdfMultipart } from "../pdf/multipart.ts";
import type { PdfParser } from "../pdf/worker.ts";
import { SourceError, requireLive, requireOwned, sourceDto, uploadedRecord, type SourceRepository } from "./service.ts";

const errors: Record<PdfSourceFailureCode, [number, string]> = { ...pdfErrors,
  unavailable: [404, "Source unavailable"], storage_unavailable: [503, "Source storage unavailable; try again later"],
  replacement_conflict: [409, "Another upload completed; retrieve the current source or retry the upload"],
};
const reply = (status: number, value: SourceResult, cookie?: string) => Response.json(value, { status, headers: {
  "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", ...(cookie ? { "Set-Cookie": cookie } : {}),
} });
const fail = (code: SourceFailureCode, cookie?: string) => {
  const [status, message] = errors[code as PdfSourceFailureCode] ?? errors.storage_unavailable;
  return reply(status, { ok: false, error: { code, message } }, cookie);
};
const validId = (id: string) => /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(id);

export function createSourceHandlers(deps: { config: () => VisitorConfig | null; repository: SourceRepository;
  readConfig?: () => VisitorConfig | null; parse: PdfParser; admission?: Admission; now?: () => number }) {
  const admission = deps.admission ?? new Admission(pdfLimits);
  const now = deps.now ?? Date.now;
  const handle = async (request: Request, id?: string): Promise<Response> => {
    let release: (() => void) | undefined;
    try {
      const upload = request.method === "POST" && id === undefined;
      const config = upload ? deps.config() : (deps.readConfig ?? deps.config)();
      if (!config) return fail("disabled");
      if (!upload && !["GET", "DELETE"].includes(request.method)) return reply(405, { ok: false, error: { code: "invalid_request", message: "Method not allowed" } });
      if (request.method !== "GET" && (request.headers.get("origin") !== config.origin
        || ![null, "same-origin"].includes(request.headers.get("sec-fetch-site")))) return fail("forbidden");
      if (request.method === "GET" && (request.headers.get("origin") !== null && request.headers.get("origin") !== config.origin
        || ![null, "same-origin", "none"].includes(request.headers.get("sec-fetch-site")))) return fail("forbidden");
      const visitor = readVisitor(request.headers.get("cookie"), config, now());
      if (!visitor) return fail("visitor_required", visitorCookie(createVisitor(config, now()), config, now()));
      const guard = () => requireLive(visitor, request.signal, now());
      guard();
      if (upload) {
        release = admission.acquire(visitor.owner, "unverified-network", now()) ?? undefined;
        if (!release) return fail("limit_reached");
        const bytes = await readPdfMultipart(request);
        const extraction = await deps.parse(bytes, request.signal);
        guard();
        const candidate = uploadedRecord(extraction, visitor);
        const saved = await deps.repository.replace(candidate, guard);
        guard(); requireOwned(saved, visitor, now());
        if (saved.id !== candidate.id) throw new SourceError("storage_unavailable");
        return reply(201, { ok: true, source: sourceDto(saved) });
      }
      if (!id || !validId(id)) return fail("unavailable");
      if (request.method === "DELETE") {
        const removed = await deps.repository.remove(id, visitor.owner, new Date(now()), guard);
        guard();
        return removed ? reply(200, { ok: true }) : fail("unavailable");
      }
      const saved = await deps.repository.get(id, visitor.owner, new Date(now()));
      guard(); requireOwned(saved, visitor, now());
      if (saved.id !== id) throw new SourceError("unavailable");
      return reply(200, { ok: true, source: sourceDto(saved, true) });
    } catch (error) { return fail(error instanceof SourceError || error instanceof PdfError ? error.code : "storage_unavailable"); }
    finally { release?.(); }
  };
  return { upload: (request: Request) => handle(request),
    read: (request: Request, id: string) => handle(request, id), remove: (request: Request, id: string) => handle(request, id) };
}
