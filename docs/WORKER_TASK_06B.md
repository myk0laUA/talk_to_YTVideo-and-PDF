# Task 06B — coalesce concurrent public caption misses

Use with `prompts/WORKER_PROMPT.md` in the separate worker chat. This is the **single active implementation task**, under original Step 06. PM owns acceptance, real services and deployment.

## Outcome and starting evidence

Implement bounded, process-local coalescing of identical public caption imports on the existing single application instance. Estimate 90–120 minutes, then return evidence. Start from reviewed application `03eb7d8`, local build `g-qTkOYGZcWIx5RNCe1BH`, plus PM documentation commits. Task06A local cache checks and actual PostgreSQL upsert/ownership/expiry/rollback checks passed; see the latest PROJECT_STATE for hosted results. Neither provider key is ready. This task uses synthetic upstreams only. Full Steps03/05/06 and live conversation gates remain open.

## Scope and implementation notes

Relevant existing modules: `src/server/captions/{cache,configured,admission,provider}.ts`, shared admission only where necessary to preserve proof/import coordination, `src/server/sources/{youtube,runtime,config}.ts`, existing unit and built HTTP cache harnesses. Keep server-only implementation in `src/server`. Preserve the public API, UI, schema, lockfile, one owned Source slot and original Step IDs.

**Necessary admission change:** current caption admission permits only one active request process-wide, so a second visitor is rejected before it can join. Refine caption admission to distinguish one active extraction job from bounded admitted waiters. Keep at most one upstream extraction job, one active request per visitor, visitor4/IP8/global8 per hour and lifetime16. Admit at most eight total participants to that one compatible job, counting each against all existing request quotas. Different-key imports and proof requests still receive busy while a job is active; proof still occupies the same single extraction slot. Do not increase these numeric limits or generalize unrelated voice/PDF admission. Cover acquisition/release atomically and cancellation races in the built server.

1. Share only validated public extraction/cache population work for the same normalized video/requested-language/native-mode and compatible provider policy. Every requesting visitor must still pass configuration, origin, cookie, expiry and existing admission before joining. Each caller separately creates a fresh owned Source through the existing atomic replacement path. Never share Source IDs, visitor data, authorization, request bodies or private PDFs in a job result.
2. A simultaneous cold miss yields one configured-provider extraction and one cache population. A joining caller may recheck cache as needed; document exact behavior. Do not coalesce different languages, incompatible adapter configurations or operator bypass with ordinary work. For forced uncached verification, bypass must avoid cache reads/writes **and coalescing**; each deliberate request actually tests its selected provider. Proof remains structurally uncached/uncoalesced and shares existing admission limits.
3. Use a job-owned AbortController. One caller cancelling must detach that caller and prevent its Source write without cancelling remaining live callers. When the last waiter cancels, abort upstream promptly and release the job. A new caller cannot join an already aborted/settled job. Caller expiry also prevents its Source write. No unhandled rejected promises or late result resurrection.
4. Preserve existing adapter deadlines; the shared job has a finite deadline from its creation, never extended by new waiters. Bound the map and waiters using existing admission ceilings, release entries on success/error/cancel/timeout, and do not add persistent timers after completion. A later deliberate retry after a failed job may start fresh work within current quotas; no automatic retries or quota resets.
5. Validate output before sharing/persisting it. Cache/read/write/provider failures retain authored categories and preserve every caller's prior Source. One visitor's Source storage failure must not fail another visitor's independently authorized Source commit or trigger extraction again. Share immutable data or defensively prevent cross-caller mutation.
6. Runtime wiring must reuse one coordinator across production requests in one process. Unit-only singleton evidence is insufficient. State explicitly that multiple processes/hosts are not coordinated. Keep PostgreSQL uniqueness as the durable cache invariant.

**Excluded:** automatic provider fallback/cooldown (a subsequent bounded06C task), additional provider packages, keys, live API calls, spending, DB migrations, generalized cleanup, UI changes, context/voice/text implementation, admission limit increases. Do not turn this task into full Step06 completion. One explicit miss provider remains the policy until separately reviewed.

## Skills and commands

Backend-only: no design skill. Use `.agents/skills/playwright-cli/SKILL.md` only for relevant browser regression checks; consult pinned Next docs only if framework behavior changes. Use Node24.22.0/npm11.19.1. Keep routine tests isolated from `.env` credentials.

Run `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, then `npm run test:captions:cache`, `npm run test:youtube:http`, `npm run test:captions:mocked`, `npm run test:youtube-ui`, and `npm run test:smoke`. Run source HTTP/PDF UI regressions if their shared paths change; otherwise retain exact accepted evidence/build identities and justify unaffected scope. Establish a focused coordinator command if needed before citing it. No install/migration/deployment/live-extraction command.

## Acceptance checks

- Deterministic tests with controlled promises/time: overlapping same key has one extraction/write; distinct language/policy remains separate; warm hit has zero extraction; bypass and proof do not join. Assert provider/cache call counts, not just response equality.
- Two real built HTTP requests with distinct signed visitors overlap while upstream is held. Release once; both201 return distinct owned UUIDs and full ordered fractional-second captions. Foreign GET/DELETE404, replacement/removal isolation, unchanged visitor expiry, no cache TTL extension from joining.
- Cancel leader while follower waits: leader has no Source write, follower succeeds, one provider call. Cancel follower: leader succeeds. Cancel all: underlying signal aborts, map releases, no Source writes, later permitted retry succeeds. Test an already-aborted caller and a join racing final detach.
- Provider failure/timeout/cache write failure clears the job and preserves both prior Sources; no retry/fallback. A deliberately failed Source transaction affects only that caller after shared extraction. Expired visitor cannot consume a late result into a Source.
- Existing proof/import admission and request limits remain enforced for **each** caller, including warm hits and waiters; a rejected caller performs no upstream/cache work. Exact counters and bounded teardown demonstrated in actual built harness, with synthetic upstream/Prisma labeled.
- Production trace/client-bundle audit excludes test hooks, coordinator state and secrets; no browser persistence. All owned test servers/ports/timers close. No shared database mutation by worker.

## Manual and PM checks

1. Worker: run two isolated browser contexts against the controlled built app, start the same import with a held upstream, then release. Verify separate complete previews and isolated removal; capture sanitized screenshots/counts. Browser emulation is not physical-phone evidence.
2. PM: review final hashes and code, rerun focused overlap/cancellation cases, then use real PostgreSQL with a controlled provider if storage orchestration changed. Hosted live availability is a separate gate; do not label coalescing mocks as deployed provider success.
3. Human: no key, purchase or phone action needed for this backend task. Existing live-key and physical-device gaps remain recorded.

## Evidence and stop

Return proposed READY_FOR_REVIEW with base/dirty-or-commit identity, changed-file hashes, build/runtime, command UTC/exits, exact overlap/cancel/provider/write counts, map/port teardown, mock versus real boundaries, screenshots and trace audit. Store artifacts in ignored `artifacts/local/06b/`; update PROJECT_STATE/TESTING and a concise runbook. Record failures and NOT_RUN checks honestly.

Stop and report a focused blocker if cancellation-safe sharing cannot fit the current provider contract without expanding scope. Do not implement06C/07, deploy, contact paid services, or start another implementation task.
