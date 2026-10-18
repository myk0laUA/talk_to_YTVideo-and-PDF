# Task06C — bounded caption provider fallback and cooldown

Use with `prompts/WORKER_PROMPT.md` in the separate worker chat. **Single active implementation task**, original Step06. PM owns acceptance, service configuration and live tests.

## Outcome / starting evidence

Add an explicitly configured automatic selection mode around the existing direct and Supadata native-caption adapters, with selective fallback, one deadline and process-local cooldown. Estimate90–120minutes; return evidence rather than widening scope. Read latest PROJECT_STATE for reviewed06B application commit. Local buildgPQqBgrBk57n2NXLBiHYu, fresh352unit/61coalescing checks and realDB overlap/rollback/cancellation passed. Public deployment remains reviewed06A03eb7d8, PDF-only. Direct hosted retrieval last returned502blocked; neither OpenAI nor Supadata key is ready. No live calls/spending authorized for this worker task. Full live gates remain open.

## Scope / relevant paths

`src/server/captions/{configured,config,coordinator,admission,provider,supadata}.ts`, `src/server/sources/{config,youtube,runtime}.ts`, `.env.example` and focused tests/harnesses. Add server-only orchestration modules as needed. Preserve UI, public DTO shape, source ownership/expiry/atomic replacement, PostgreSQL cache schema, cache provenance and original Step IDs. No provider package or schema migration.

This bounded task covers the two existing adapters only. ScrapeCreators remains an explicit deferred integration, not a claimed implemented third fallback. No OCR/audio transcription, accounts, context/voice/text work, generic cleanup, infrastructure change or quota increase.

## Required behavior

1. Keep forced `direct` and `supadata` selections. Add server-only `auto` for source ingestion; proof remains forced and uncached/uncoalesced. Forced verification bypasses cache/coalescing and automatic fallback/cooldown suppression; it must actually call the requested adapter. Preserve default-off gates and missing-key fail-closed behavior.
2. Automatic direct-first must require a separate explicit server-only opt-in, default **false**, because recent hosted direct checks are blocked. With auto and opt-in false, use Supadata only. Auto requires a valid Supadata key even if direct-first is opted in; missing managed configuration must not silently become direct-only. Operator can deliberately select forced direct separately. No browser provider selector or public bypass controls.
3. Cache first with original provenance and strict validation; a cache hit makes no provider call. On an uncached automatic miss, use one shared job and **one15second total deadline from job creation**, including cache lookup and every adapter attempt/poll. Direct gets at most its current9seconds and managed only the remaining budget. Cancellation propagates to the current attempt/poll, aborts timers and prevents late success from becoming a Source. Coalesced followers do not restart deadline or attempts. Preserve forced mode bounds.
4. At most one direct attempt followed by at most one Supadata submission, with existing bounded polling for a202 job and no resubmission. Fallback only for direct `blocked`, `timeout`, `rate_limited`, or `upstream_failure`, while time remains. Terminal `no_captions`, `unavailable`, `invalid_input`, `too_large`, `malformed`, `cancelled`, configuration/auth/storage failures do not trigger a second provider. Validate direct output before deciding success; malformed success is terminal. Never cache failures/partial/job responses.
5. Auto direct `blocked` or `rate_limited` opens a finite cooldown immediately (document a five-minute default); two consecutive eligible timeout/upstream failures also open it. Success clears failure streak. During cooldown, auto skips direct and goes to managed within its original total budget. Cooldown expires without persistent background timers and is bounded process-local state per relevant policy, not one unbounded entry per video. Forced proof must not be hidden by cooldown. Explain process restart/multiple-host limitations.
6. On managed rate_limited, apply a bounded cooldown to future managed misses and return an authored rate-limit error while active, without sleeping/retrying/resubmitting. Treat quota_exhausted/provider_limited/auth failures as operator-action failures, with no retry/fallback masquerading as recovery; retain exact existing authored categories and document policy. Cached success remains usable subject to normal configuration/auth/admission. No new SDK/HTTP behavior is needed: reuse verified adapter contracts.
7. Share compatible automatic work across callers only; job identity includes selection mode/direct opt-in and credential policy. Forced/bypass jobs cannot join auto work. Keep one active upstream job, bounded waiters and existing visitor/IP/global/lifetime budgets. Each successful caller independently creates its owned Source; one Source failure cannot repeat extraction or invalidate other callers. Preserve privacy, immutable shared transcript, correct actual-provider metadata and no private fields in DTOs/logs.
8. Internal stage/result diagnostics may be returned to isolated test instrumentation or safe operator logs, never permanent keys/private text. A managed result is never evidence that direct works. Do not enable auto/direct in the real deployment.

## Acceptance / tests

- Deterministic fake-clock/provider tests: direct success/no managed call; eligible failure→one managed call; every terminal category→zero fallback; direct opt-in disabled; cooldown open/skip/expiry/reset; managed rate-limit cooldown; quota/auth no retry; malformed outputs; missing key/default-off config; remaining deadline and abort during each stage/poll; no lingering timers/state or unhandled rejections.
- Built production HTTP with synthetic Prisma/upstream exercises actual adapters: direct blocked→managed immediate success, direct timeout leaves only remaining time, managed202 bounded polling without resubmission, missing/quota/rate-limit cases, known cooldown skips direct, cache hit preserves managed provenance, forced bypass actually attempts requested provider. Reject all nonfixture external fetches.
- Two overlapping visitors share exactly one chain/cache write and get distinct owned UUIDs/full ordered captions/expiry. Cancel one while fallback is pending: other succeeds and cancelled caller never writes Source. Cancel all: active attempt aborts, no Source; later deliberate retry obeys cooldown/quotas. Assert one Source failure preserves prior independently. Proof/import admission still coordinated.
- Exact counter evidence for watch/player/timedtext/managed submit/polls/cache writes/Source commits; a passing final HTTP status alone is insufficient. Demonstrate one overall deadline through measured fake-time and built held responses, not merely adapter timers tested independently.
- No UI/schema/lockfile changes, no artifacts/test hooks in production traces or browser chunks, no secret/client persistence. All owned servers/ports/timers released.

## Skills / commands

Backend-only: no design skill. Reuse selected `.agents/skills/playwright-cli/SKILL.md` for relevant browser regression; no React/framework change expected. If modifying upstream API assumptions, verify primary provider documentation first; do not use real keys/calls to research. Pinned Node24.22.0/npm11.19.1; preserve lockfile.

Run `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, then `npm run test:captions:mocked`, `npm run test:captions:cache`, `npm run test:captions:coalescing`, `npm run test:youtube:http`, `npm run test:youtube-ui`, `npm run test:smoke`. Establish a focused built fallback command if needed. Run sourceHTTP/PDFUI if shared storage/UI behavior changes; otherwise retain exact existing identities and justify unaffected scope. All routine commands use isolated synthetic config, never real `.env` DB/provider credentials.

## Manual steps / evidence / stop

1. Worker: controlled built server, import fixture whose direct attempt blocks and managed adapter succeeds; inspect complete preview and originating provider, repeat warm import with zero extraction, then remove only that visitor's Source. Record synthetic boundary and exact call counts.
2. PM: review hashes/code/command evidence, rerun focused deadline/cooldown/overlap checks. Deployment configuration and actual managed proof wait for key/quota readiness and an authorized live-test allocation. No new human phone/key action is needed to implement06C.
3. Return proposed READY_FOR_REVIEW, changed-file hashes, base/dirty-or-commit/build/runtime identities, exact commands/UTC/exits, failure matrix and counts, policy/deadline/cooldown details, screenshots/audit/teardown and honest NOT_RUN gaps. Save ignored artifacts under `artifacts/local/06c/`; update PROJECT_STATE/TESTING and one concise runbook.

Stop on a need for new provider integration, quota increase, UI redesign or wider architecture. Do not implement07, call paid/live APIs, deploy, add services or start another worker task. PM alone accepts completion; full Step06 remains open until live gates pass.
