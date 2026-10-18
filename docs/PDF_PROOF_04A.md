# Task 04a — PDF extraction proof and PM hosted runbook

Worker proposes **READY_FOR_REVIEW**, local extraction scope only. Step 04 remains IN_PROGRESS; Free Render acceptance is **NOT_RUN**. No deployment, service setting, database mutation, source persistence, preview or conversation integration is included. A successful extraction does not create a Source ID.

## Endpoint and configuration

`POST /api/proof-pdf`, App Router Node runtime. `PDF_PROOF_ENABLED=true`, exact `APP_ORIGIN`, and private `VISITOR_COOKIE_SECRET` (64 hex characters) are required. `PDF_PROOF_LOCAL_HTTP=true` permits production-build HTTP only on localhost/127.0.0.1; leave it false on Render. All gates default off in `.env.example`. No provider key or database is needed. Normal import controls remain unavailable.

First send an empty same-origin POST. Without a valid signed visitor cookie the server returns **401 visitor_required**, issuing its existing HttpOnly/SameSite=Strict anonymous cookie; it does not consume the upload or call the parser. Retry with that cookie and exactly one multipart file field named `file`. Origin must match exactly; cross-site Fetch Metadata is rejected. A forged/expired cookie must complete the same handshake. Do not upload the large body during this handshake.

Only `application/pdf`, a `.pdf` filename, actual leading `%PDF-n.n` bytes, and parser-valid content are accepted. The deliberately narrow multipart grammar accepts a boundary up to 70 characters, two unique part headers (`Content-Disposition` and `Content-Type`), `name="file"; filename="..."` in that order, printable ASCII filenames of 1–200 characters without slashes, no filename*, preamble, epilogue, additional fields/files, or duplicate headers. Native FormData and curl `-F` use the supported grammar. Filename is validation input only; it is not returned, logged, or used as a path.

Every authored response is `Cache-Control: no-store` and `X-Content-Type-Options: nosniff`. Success is `{ok:true, extraction:{parser,fileBytes,pageCount,characterCount,fullText,sections,warnings}}`; sections have `page-N` IDs and 1-based page numbers, including empty pages. `characterCount` counts JS UTF-16 code units in fullText, including the two-newline page separators. Parser is `pdf-parse@2.4.5`. Unknown title/author/language metadata is omitted. No environment, raw model, cookie, owner hash or invented conversation/source ID crosses the DTO boundary. Render text as text, never executable HTML or trusted instructions.

Failure codes/statuses: disabled 503; forbidden 403; visitor_required 401; invalid_request 400; wrong_type 415; too_large 413; malformed/encrypted/no_text/extraction_limit 422; timeout 504; cancelled 408; limit_reached 429; internal 500. An already disconnected client cannot receive its 408, but cleanup still runs. Busy and rate/lifetime exhaustion intentionally share a safe 429 category. Framework-generated unsupported-method 405 is outside the authored POST responses.

## Limits and resource lifecycle

| Bound | Actual implementation |
|---|---|
| File | **25 MB = 25,000,000 bytes**, shared `PDF_MAX_FILE_BYTES`; 25,000,001 rejects |
| Multipart request | File cap plus **16,384 framing bytes** = 25,016,384 actual streamed bytes; framing does not reduce the file allowance |
| Multipart part header block | 4,096 bytes, checked while streaming; single part, boundary <=70, filename <=200 |
| Upload | 30,000 ms total body read, including stalls; abort cancels reader |
| Extraction | 15,000 ms worker deadline, including parser load/getInfo/all pages/destroy; timeout/abort terminates worker and awaits exit before releasing admission |
| Supported text | At most 500 pages and 2,000,000 fullText UTF-16 code units; explicit failure, no partial-success DTO |
| Worker | 128 MiB old generation, 16 MiB young generation, 4 MiB stack; stdout/stderr consumed without logging; empty environment; no inherited loader arguments |
| Admission | One active upload/parse per process; 6 admitted attempts/visitor/hour, 20 in one shared untrusted-network bucket/hour, 20 global/hour, 40 process-lifetime. Invalid admitted uploads count. Forwarding headers cannot select another bucket. |

Gate/origin/visitor/admission run before large-body reads. Content-Length is only an early rejection hint: missing or false low lengths cannot bypass actual stream counting. One preallocated 25,016,384-byte ArrayBuffer receives chunks without concat/Blob/FormData copies. File is a view into that store. The backing store transfers to the worker rather than cloning; pdf-parse receives a Uint8Array rather than a Buffer (which its constructor would copy). PDF.js may allocate parser structures and temporary data, and Next/Node have transport buffers. Worker output structured cloning and JSON serialization duplicate bounded text/sections; fullText itself duplicates page strings. Buffers become garbage-collectable after each request; RSS need not immediately fall. No original upload or parser temporary file is written to disk.

Pages are extracted sequentially, all or error. `disableNormalization:true`, `pageJoiner:""`, `parseHyperlinks:false`; PDF.js/pdf-parse insert layout spaces, inferred line breaks and tab cell separators using their item/position rules. Application normalization only converts CRLF/CR to LF and trims each page's outer whitespace; it never clips substantive content. Full text joins page texts with two newlines. Empty pages remain empty sections and cause a warning, without erasing other pages. This is extraction, not OCR, table reconstruction, semantic reading-order inference, or a conversation context-size promise.

Input is local `data`, never a URL. No screenshot/image/action/JavaScript API is invoked. Eval, XFA, WASM, worker fetching, range/stream/auto fetching are disabled, and worker global fetch rejects network. No embedded links are followed. Parser `destroy()` runs in finally on success/error; the parent additionally terminates and awaits worker exit on every path, including CPU-bound timeout and disconnect. A Promise race is not used as a substitute for terminating CPU work. Worker heap limits are not a hard whole-process/native/external-memory cap; malicious decompression/native allocations and platform memory behavior remain unavoidable limitations. One-at-a-time admission and measured local RSS support the Free-instance trial, without proving its Linux resource envelope.

`@napi-rs/canvas@0.1.80` is pdf-parse's exact transitive dependency. On this Windows Node runtime, importing/unloading it solely in a worker reproducibly exited the entire parent with code 1. Lazily importing it in the parent before creating a worker keeps the native library loaded and fixes that probe; the parser still executes only in the terminable worker. Disabled startup does not load it. The Linux native package and Render memory/deadlines require the hosted check. Parser/library imports are external, and the worker/dependency files are explicitly traced. Turbopack emits the worker under `.next/server/chunks/[worker thread]-...`; tests observe that actual production worker. Deploy the normal repository install/build/start, not an independently copied untraced worker.

## Reproduce local evidence

Use Node **24.22.0**, npm **11.19.1**, npm/committed lockfile, and synthetic CLI database configuration only. This workstation's pinned executable directory is `.tools/node-v24.22.0-win-x64`; put it first in PATH. Fixture Python dependencies used: Python 3.12.14, reportlab 4.4.9, pypdf 6.10.0, Pillow 11.1.0. Install those exact Python packages in an isolated environment if the bundled runtime is unavailable.

```powershell
$env:PATH = "$PWD\.tools\node-v24.22.0-win-x64;$env:PATH"
$env:DATABASE_URL = 'postgresql://synthetic:synthetic@127.0.0.1:1/synthetic?connect_timeout=1'
npm ci
# Run with Python containing the three dependencies above:
python scripts/generate-pdf-fixtures.py
npm run lint
npm run typecheck
npm test
npm run db:validate
npm run build
npm run test:pdf:http
npm run test:smoke
npm run test:captions:mocked
npm run test:voice
npm run test:text
```

Actual fixture command on this host: `& 'C:/Users/Myk/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe' scripts/generate-pdf-fixtures.py`. Generation is deterministic; `artifacts/local/04a/fixtures/manifest.json` records hashes, exact sizes, expected page lines, error categories, independent page counts/text counts and validation. Both large PDFs contain a reachable custom `/TD04aPadding` stream before xref/EOF, with rebuilt /Length and offsets. Strict pypdf validates structure and every expected line independently of the route; Poppler pdfinfo separately confirms both large files' exact sizes/page counts. Corrupt/plain-text fixtures are intentionally invalid and independently rejected. Encrypted fixtures decrypt with the documented synthetic password (empty for the empty-password variant) for independent validation. No private PDFs are used.

`npm run test:pdf:http` starts/tears down owned production Next servers on **127.0.0.1:3105**, using process-only synthetic environment, no usable DB, and other gates off. It refuses an occupied port, checks build identity and fixture hashes, uses raw chunked multipart HTTP without Content-Length, and also tests exact size with correct Content-Length. It records safe DTOs/coverage/timing/no-store, observes worker creation/exit and RSS every 10 ms, tests invalid and rate-limit zero-parser cases, then starts separate explicitly synthetic CPU-work timeout/disconnect servers. Its test-only preload substitutes the first worker solely in those two scenarios; application code has no test environment/request selector. The 30-second upload stall/disconnect scenarios use the real reader. A successful real parse after each injected/unsupported failure proves recovery. All workers and owned servers must exit; final port bind proves release. The harness never prints/saves cookies or signing secrets. The locally generated PDFs/results are synthetic and intentionally ignored.

Unit tests separately inject parser outcomes to cover pre-parser rejects, false Content-Length (which HTTP framing itself cannot meaningfully simulate with an intact body), split headers/delimiters, actual total cap, body cancel, admission release, sanitized exceptions, CPU-worker termination, and missing config. These mocked checks do not establish real extraction correctness. The production HTTP fixtures do. Smoke keeps the route off and checks 503/no-store/405 on desktop and mobile Chromium viewports; physical mobile uploads/audio remain NOT_RUN.

## Acceptance map and evidence

| Criterion | Evidence |
|---|---|
| Decimal boundary and valid framing | Shared constant, streamed reader, unit false/missing-length checks; exact/over fixtures; production HTTP exact acceptance and over 413 |
| Admission/security before parse | Unit no-body/no-parser counters; production invalid/disabled/missing-config scenarios and worker observer; visitor handshake |
| All pages/full text/order | 12 pages × 32 complete expected lines (384), strict page equality/fullText equality; empty-page preservation; independent pypdf validation |
| Unsupported content | Real corrupt, wrong bytes, encrypted/password + empty-password, image-only, 501-page and >2M-character fixtures |
| Mixed layout | All 12 expected strings retained; actual column-first sequence then table rows (`Item Count`, `Apples 7`, `Pears 9`); warnings disclose reading-order limitations |
| Bounded lifecycle | Unit terminated CPU workers; production injected deadline/disconnect with exit events and next real parse; real upload stall and disconnect recovery |
| Isolation/cleanup | Worker transfer, empty env, no upload files; all created workers exit, all owned servers SIGTERM/port released; no external-fetch observations |
| Regression | `checks.json` and corresponding logs: lint/typecheck/unit/schema/build/HTTP/smoke/caption/voice/text; no live provider/database request |
| Hosted/Source/preview/grounding | **NOT_RUN / outside this worker scope**, remains PM-owned |

Final command times/exits/build ID and measured values are appended in `PROJECT_STATE.md`. Detailed safe local evidence is under `artifacts/local/04a/`: `checks.json`, `http-results.json`, `*-extraction.json`, `fixtures/manifest.json`, `fixture-generation.log`, `exact-pdfinfo.txt`, `over-pdfinfo.txt`, `fixture-contact.png`, `layout-table.png`, and server/check logs. Poppler emitted missing optional display-font aliases; inspected standard Helvetica fixtures rendered correctly. npm audit reports five existing high findings in the ESLint/glob development chain, not the parser dependency tree; no unrelated upgrades were attempted.

## PM-only Free Render acceptance (NOT_RUN)

1. Review/accept the dirty application changes or a subsequent PM commit, identify the exact build and dependency lock, and deploy through the existing authorized Free Render workflow. Do not mark Step 04 DONE from this local evidence. Record Linux/Node/native dependency startup and cold versus warm service behavior.
2. Temporarily set only `PDF_PROOF_ENABLED=true`, `APP_ORIGIN` to the exact public HTTPS origin, and a private signing configuration through the existing secret workflow. Keep `PDF_PROOF_LOCAL_HTTP=false`, voice/text/caption gates disabled. No provider key is needed. Do not commit or print the signing secret. Generate the same fixtures locally and compare the manifest hashes before upload. Ensure fewer than 20 admitted attempts/hour and 40 since process startup, one active request at a time; quota exhaustion is a 429 rather than a parser failure.
3. Use an ephemeral cookie jar under ignored `artifacts/local/04a/` (delete it afterward). In PowerShell, set `$pdfOrigin` to the actual HTTPS origin and `$pdfJar` to that private jar path. The handshake returns 401 plus Set-Cookie; subsequent requests use the same jar:

   ```powershell
   curl.exe -sS -D artifacts/local/04a/hosted-handshake-headers.private.txt -c $pdfJar -H "Origin: $pdfOrigin" -X POST "$pdfOrigin/api/proof-pdf" -o artifacts/local/04a/hosted-handshake.json
   curl.exe -sS -b $pdfJar -H "Origin: $pdfOrigin" -F "file=@artifacts/local/04a/fixtures/multi.pdf;type=application/pdf" "$pdfOrigin/api/proof-pdf" -o artifacts/local/04a/hosted-multi.json -w 'status=%{http_code} seconds=%{time_total}\n'
   curl.exe -sS -b $pdfJar -H "Origin: $pdfOrigin" -F "file=@artifacts/local/04a/fixtures/exact-25000000.pdf;type=application/pdf" "$pdfOrigin/api/proof-pdf" -o artifacts/local/04a/hosted-exact.json -w 'status=%{http_code} seconds=%{time_total}\n'
   curl.exe -sS -b $pdfJar -H "Origin: $pdfOrigin" -F "file=@artifacts/local/04a/fixtures/over-25000001.pdf;type=application/pdf" "$pdfOrigin/api/proof-pdf" -o artifacts/local/04a/hosted-over.json -w 'status=%{http_code} seconds=%{time_total}\n'
   ```

   The handshake headers contain a bearer cookie; keep them private and delete them and the jar after testing. Do not attach them as public evidence. Capture only sanitized status/no-store/timing/build/resource summaries. Obtain a fresh visitor handshake after six admitted attempts for this visitor; do not interpret the visitor quota as an upload defect. Do not automate resets to evade the process/global limits.
4. Compare all 12 sections and all 384 multi-page expected lines against manifest expectedPages, fullText versus joined sections, last-page marker, and page/character counts. Exact boundary must return 200, `fileBytes:25000000`, pageCount 1, characterCount 45, all three BOUNDARY markers. One-byte-over must return 413 too_large even though independently valid. Verify no-store on each. Test empty page, image-only, corrupt and both encrypted variants using the same command form and fresh permitted visitor as needed; expect the listed categories. Test layout/table coverage/order and the resource-limit fixtures within quotas. Check small upload recovery after errors and service memory/latency/restarts in authorized Render observations.
5. Check real hosted request cancellation/stall and small-request recovery. The local injected CPU-worker evidence is synthetic; do not enable its test preload on Render or claim a natural fixture caused the timeout. Record proxy/body/time/resource failures precisely if the host cannot meet 25 MB; do not reduce the limit, add storage/OCR or increase paid resources to hide the failure.
6. Restore `PDF_PROOF_ENABLED=false` and the existing proof-disabled service settings. Confirm ordinary HTTPS shell 200 and PDF POST 503/no-store, and remove private cookie artifacts. Record deployed build/fixture identities, exact statuses, coverage, latency, memory observation method, cleanup/recovery, cold start and remaining gaps. Source persistence/mobile upload/preview/conversation grounding stay separate gates.

## Official references consulted

- [pdf-parse official v2.4.5 README](https://github.com/mehmet-kozan/pdf-parse/blob/v2.4.5/README.md) and [version-matched troubleshooting](https://github.com/mehmet-kozan/pdf-parse/blob/v2.4.5/docs/troubleshooting.md): class/data/text/destroy API, Node support and external bundling. Actual `npm view pdf-parse version engines dist.integrity --json` returned **2.4.5** before installation; pinned with `npm install --save-exact pdf-parse@2.4.5`. Installed dist/source/types and lockfile confirm pdfjs-dist 5.4.296 and canvas 0.1.80. The public repository main README already mentions later API work; installed 2.4.5 source/types are the implementation reference.
- Version-matched Next **16.4.2** local guides: `node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md`, `01-app/03-api-reference/05-config/01-next-config-js/serverExternalPackages.md` and `output.md`: Node Route Handlers/Web streams, external dependencies and explicit tracing. No Server Action path is used.
