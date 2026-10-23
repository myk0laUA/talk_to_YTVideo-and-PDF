# Task12E continuation — F05 status clipping only

Sole active implementation task remains12E. PM reviewed FIRST_USE_POLISH_12E.md, current source and full-size welcome/idle/failure screenshots;2486/2486 hashes match. Baseline HEAD1d30684 plus accepted dirty work; build MjvI85J5WVXbfrEnWKCkx. The welcome/import design and centered text start are retained. Overall acceptance waits on this concrete F05 defect.

## Correction

In src/app/globals.css, `.text-start .text-session-status` at current line155 sets unrestricted height, but later equal-specificity `.has-source .text-session-status` at line190 overrides it with max-height25%/overflow auto. Pending and failed first-start messages are clipped in current screenshots. Fix the cascade at the narrowest correct boundary so the full status/recovery text and start/stop action remain readable, do not overlap and remain reachable. Preserve normal active transcript/dock constraints and small-height natural-flow fallback. Do not hide, shorten away or remove meaningful error text to pass the check. No redesign, controller/backend/model/limit/theme changes.

Use installed Impeccable polish/adapt/harden guidance and Taste's existing composition only as applicable; do not repeat art-direction/audit/reviewer-score cycles. The prior cycle cap was correctly honored. This PM-assigned continuation explicitly authorizes one targeted correction/verification batch. Keep all prior evidence untouched; output to artifacts/local/12e-correction (adjust harness destination before execution).

## Acceptance

- Add a meaningful rendered regression assertion for complete first-start pending/failure copy: compare content height against its available height and ancestor clipping/overlap, rather than relying on toBeVisible alone. Demonstrate the assertion detects the current defect before the fix when practical.
- Inspect pending and failed initial text at390/768/1440 in both themes and320px/200% reflow; use full-page capture only when the viewport intentionally flows. Text and actions must not overlap; all copy must be readable without a tiny nested status scroller.
- Verify centered idle start still fits the normal viewport, successful explicit readiness shows/focuses composer, active text dock/scroll remains intact and voice remains unchanged. Use offline fixtures; no provider/DB calls.
- Run pinned lint/typecheck/build and the targeted UI harness/text-session regression suite. Broaden only for a new affected behavior or failure, not the whole historic suite.

Return docs/FIRST_USE_POLISH_12E_CORRECTION.md with changed hashes/build, exact commands/exits, before/after failed-state captures, new regression result and any remaining gaps. Update PROJECT_STATE/TESTING. Target30minutes; stop on new unrelated blockers. READY_FOR_REVIEW then stop; no deployment or later-task advancement.
