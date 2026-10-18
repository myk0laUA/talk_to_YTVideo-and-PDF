# Task 03b — Supadata native-caption proof handoff

Proposed **READY_FOR_REVIEW**, local adapter/mock scope only. Step 03 remains **IN_PROGRESS**. No live Supadata/OpenAI request, account/key setup, spend, deployment, database mutation or direct-caption rerun was performed. The accepted 03a local and mixed hosted evidence remains in `CAPTION_PROOF_03A.md` and `PROJECT_STATE.md`.

## Contracts and decisions

Rechecked 18 October 2026: [transcript HTTP specification](https://docs.supadata.ai/get-transcript), [error HTTP specification](https://docs.supadata.ai/errors/list), [rate/quota details](https://docs.supadata.ai/errors/limit-exceeded). Built-in fetch; no dependency or lockfile change. The existing Node POST route, input/origin/cookie validation and no-store response boundary remain in use.

Initial GET goes only to `https://api.supadata.ai/v1/transcript`, with `url` set to the canonical YouTube watch URL constructed from the validated ID, `mode=native`, `text=false` and optional `lang`. The key is sent only in `x-api-key`. Redirects are rejected; cookies omitted; no cache, metadata calls, generation, retries or fallback. Requests cannot select provider, mode, base URL or credentials.

Raw HTTP 200 uses `{content:[{text,offset,duration,lang}],lang,...}`; offset/duration are milliseconds. 202 uses `{jobId}`. Jobs use GET `/v1/transcript/{jobId}`; queued/active are pending, completed has **flat** content/lang fields, failed terminates. The documentation's SDK examples instead read a `result` wrapper. This adapter follows the documented raw HTTP format, tests both the flat success and wrapper rejection, and does not guess SDK compatibility. The HTTP example shows a string content for text output; its prose and initial segment schema define the segment fields used when `text=false`. No native-only contract conflict was found; real service conformance is still NOT_RUN.

Only validated ordered segments survive normalization; none are filtered, sorted or truncated. Full text is every segment's exact text joined with newlines. Fractional milliseconds become fractional seconds. Returned transcript/chunk language must be valid and consistent; requested language is never substituted for actual language. Missing, mixed-language, malformed or partial chunks fail. Track type/title/available-language metadata is not inferred or exposed. This strict supported schema may reject upstream schema variants pending review.

## Configuration and bounds

| Setting | Behavior |
|---|---|
| `CAPTION_PROOF_ENABLED` | Only exact `true` enables proof; defaults off |
| `CAPTION_PROOF_PROVIDER` | `direct` (default when absent) or `supadata`; any other value fails closed |
| `SUPADATA_API_KEY` | Backend only; required for Supadata; absent/invalid fails closed before network |
| `APP_ORIGIN`, `VISITOR_COOKIE_SECRET` | Existing strict origin and 64-hex signing-secret prerequisites |
| `CAPTION_PROOF_LOCAL_HTTP` | Existing explicit loopback-only local production exception; use false for hosted HTTPS |
| Voice/text/issuance gates | Remain off independently; not needed for captions |

`NEXT_PUBLIC_SUPADATA_API_KEY` is rejected. No environment/configuration object is serialized. Normal imports remain unavailable. The direct reproduction command is unchanged: `npm run proof:captions:local -- --allow-public-youtube`. Its child environment now explicitly forces `direct` and clears both managed-key names even when inherited settings select Supadata. This command was **not rerun** in 03b.

Supadata has one 15,000ms total upstream deadline covering initial fetch, response consumption, poll waits, job fetch and normalization completion checks. Exactly one initial extraction; maximum five job polls; at least 1,000ms before each poll. A still-pending fifth poll terminates immediately with timeout (usually about five seconds plus request time). All real fetches and streams share the caller/deadline signal; abortable timers clean up on cancellation. No failure retry or initial resubmission. The unit-only fetch/wait/deadline injections are not environment or request options; test deadlines only shorten the runtime maximum.

Each success/job response is bounded to 2 MiB; 429 error bodies to 8 KiB. Existing limits of 20,000 segments and 1,000,000 full-text UTF-16 characters remain. Existing request body cap is 512 bytes/2 seconds. One handler owns **one shared caption admission bucket** across selected providers: one concurrent, four visitor attempts/hour, eight total/hour, sixteen process lifetime. Body-invalid attempts also consume admission; rejected admission performs no upstream work. Limits are process-local, not a distributed spending guarantee.

Local cancellation cannot cancel remote work already accepted, reverse charges, or guarantee upstream completeness absent provider indicators. Synchronous bounded JSON parsing/normalization cannot be interrupted midway; elapsed time and signals are checked before and afterward. No source storage, cache or grounding behavior is implemented.

## Safe failure contract

| Upstream outcome | Public code / HTTP | Authored message example |
|---|---|---|
| HTTP 206 | `no_captions` / 422 | No existing captions available |
| 401 | `blocked` / 502 | Caption service authentication rejected |
| 402 | `blocked` / 502 | Caption service plan does not permit this request |
| 403 or redirect | `blocked` / 502 | Caption service access rejected |
| 404 | `unavailable` / 422 | Caption resource unavailable |
| Known rate 429 | `rate_limited` / 429 | Caption service request rate exceeded |
| Known quota 429 | `quota_exhausted` / 503 | Caption service quota exhausted; operator action required |
| Unknown 429 | `provider_limited` / 503 | Caption service limit could not be identified; operator review required |
| Failed job/5xx/network | `upstream_failure` / 502 | Caption service job failed / request failed |
| Deadline/poll cap | `timeout` / 504 | Caption service exceeded the total upstream deadline / job exceeded the proof polling limit |
| Caller cancellation | `cancelled` / 408 | Caption request cancelled |
| Unsupported/partial payload | `malformed` / 502 | Caption service returned an unsupported or incomplete response |
| Response/text/segment cap | `too_large` / 413 | Caption service response exceeds the proof byte limit |
| Gate/config/key invalid | `disabled` / 503 | Feature unavailable |

429 classification requires `error=limit-exceeded` and the documented exact details. The quota string is `Plan usage limit was exceeded.`; rate strings are `Global request rate limit was exceeded.` and `Request rate limit on current plan was exceeded.`. Other details/codes are unknown, even if they contain words resembling quota/rate. No code retries these outcomes. Documentation URLs and provider messages are never followed or exposed. HTTP status numbers and the authored stage `transcript` may appear safely.

## Reproducible local mock verification

Select the pinned runtime in PowerShell (checkout-local path shown; normal installation also works):

```powershell
$env:PATH = (Join-Path $PWD '.tools/node-v24.22.0-win-x64') + ';' + $env:PATH
$env:DATABASE_URL = 'postgresql://synthetic:synthetic@127.0.0.1:1/synthetic?connect_timeout=1'
$env:NEXT_TELEMETRY_DISABLED = '1'
npm run lint
npm run typecheck
npm test
npm run db:validate
npm run build
npm run test:captions:mocked
npm run test:smoke
npm run test:voice
npm run test:text
```

`test:captions:mocked` is the new **mocked upstream** production HTTP command, not a live retrieval claim. Leave port 3104 free. It starts the existing production build eight times with an explicit test-only Node preload (`tests/captions/server-mocked.cjs`), synthetic signing/key values and a loopback unusable database URL. Only child processes receive that configuration; `.env` is not modified. All external fetch is intercepted and checked against fixed destinations/header/native parameters. Unexpected destinations or contracts fail the check. No mock hook, test endpoint or mock configuration is added to application runtime.

Scenarios: disabled, missing managed key, invalid selection (all zero upstream calls), managed sync, queued/active/completed, failed job, five-poll pending cap, and explicit direct. Real HTTP checks exercise no-store, off voice/source/issuance gates, request rejections, quota sanitation, release after failure and visitor admission. Counts arrive over child IPC without keys/URLs/payloads. Reports/server logs are ignored under `artifacts/local/03b/`; every owned server is terminated in `finally`. This command uses no browser or physical media.

The 71 new unit checks cover normalization/full text/timing/language/provider, outgoing contracts, async shape, real minimum poll interval, five-poll cap, failed/unsafe jobs, all specified HTTP statuses, quota/rate/unknown429, malformed/partial/SDK-wrapped/oversized/nonfinite results, active stream overflow cancellation, deadline and caller abort during initial/job fetch/body/wait, zero-call gate/config/request validation, shared alternating-provider admission, and direct-harness isolation. Terminal failure cases run through the real handler and then admit another request to prove release. Supadata async tests mostly inject an immediate wait while asserting the requested 1000ms interval; separate real-timer and production HTTP checks exercise actual elapsed waits.

## Acceptance mapping / PM-only next checks

| Task requirement | Evidence |
|---|---|
| 1 explicit config, key isolation, same bucket, forced direct harness | `supadata.test.ts` configuration/rejection/alternating tests; mocked HTTP disabled/missing/invalid/direct scenarios |
| 2 fixed HTTPS GET/header/native/text, no redirects | Strict unit fetch assertions and production preload; redirect/unsafe-ID tests |
| 3 complete normalization, milliseconds, language, unknown metadata | Exact three-marker synchronous/async expectations; malformed/size matrices |
| 4 one initial, bounded polling, cancellation, release | Queued/active/completed/failed/pending counts; five-phase caller/deadline tests; real timers; terminal release assertions |
| 5 unavailable 206, safe errors, known quota/rate/unknown | HTTP matrix and synthetic private-data leakage assertions; no retries/URL following |
| 6 direct retained, independent managed proof only | Existing direct suite, explicit direct built scenario, unchanged opt-in command; no chain/cache/UI/storage |
| Local production operator checks | Mocked HTTP disabled 503/no-store, missing key zero calls and other gates off; default-disabled smoke |

**PM later; NOT_RUN here:** Obtain a suitably configured Supadata key and explicitly authorized quota using normal private secret handling. Do not put a key in chat. Free hosting/database remain unchanged; no assumed credits or test-budget allocation. Do not enable paid access or automatic recharge as part of this handoff.

On the existing Free Render HTTPS service, PM should deploy a reviewed identity, record its commit/deploy/Next build identity where available, and temporarily set `CAPTION_PROOF_ENABLED=true`, `CAPTION_PROOF_PROVIDER=supadata`, private `SUPADATA_API_KEY`, exact HTTPS `APP_ORIGIN`, valid private `VISITOR_COOKIE_SECRET`, and `CAPTION_PROOF_LOCAL_HTTP=false`. Keep `PROOF_ENABLED`, `TEXT_PROOF_ENABLED`, `REALTIME_ISSUANCE_ENABLED` false. Check missing-key failure privately before inserting the key if practical.

Send **one** same-origin JSON POST per fixture to `/api/proof-captions`, `{video:"dQw4w9WgXcQ",language:"en"}` and `{video:"Ks-_Mh1QhMc",language:"en"}`. There is no application/extractor cache in this route; fixed Supadata selection makes these independent managed attempts. Do not resubmit pending/failed/limit outcomes automatically. Record status, provider, actual language, segment/full-text counts, timing range, elapsed time, brief beginning/middle/end excerpts, original-caption meaning/coverage review, failures, and dashboard usage/cost under the authorized quota. Different segmentation counts from 03a are acceptable; lost coverage is not. Even HTTP 206 may consume provider quota. Never save credentials/cookies/raw error bodies or full captions unnecessarily.

Restore `CAPTION_PROOF_ENABLED=false` and normal startup, discard temporary signing configuration and managed key if staged only for this proof, then verify caption POST 503/no-store and ordinary HTTPS shell. Record exact teardown and deployment identity. No phone/audio check is needed for this adapter. Live managed conformance/reliability, deployment, source persistence/cache/preview, grounding, OpenAI and physical audio all remain separate **NOT_RUN** gates. PM owns acceptance; do not mark Step 03 DONE or start Step 06 from this handoff.
