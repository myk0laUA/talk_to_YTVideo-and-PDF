# Skill selection and setup

## Taste installed —22October2026

User explicitly requested installation. Skill-installer helper installed `design-taste-frontend` project-locally at `.agents/skills/design-taste-frontend/`, from Leonxlnx/taste-skill path skills/taste-skill, revision6010f91a9935f1c167dfc500fb1a475681892e6b. Command: `python C:/Users/Myk/.codex/skills/.system/skill-installer/scripts/install-skill-from-github.py --repo Leonxlnx/taste-skill --path skills/taste-skill --ref 6010f91a9935f1c167dfc500fb1a475681892e6b --dest .agents/skills --name design-taste-frontend`, exit0. SKILL.md metadata and local app-screen reference/inspector existence verified. No app dependency or lockfile change.12E now explicitly invokes `$impeccable` and `$design-taste-frontend` with local paths. Earlier notes that Taste is absent are historical and superseded. Skill discovery is expected on the next turn; explicit file reads remain available immediately.

##12E first-use refinement

User explicitly requests Impeccable and Taste together. Use installed Impeccable onboarding/refinement workflow and pinned Taste app-screen composition guidance as scoped in WORKER_TASK_12E.md; no competing design direction. Taste is linked upstream, not installed project-locally as of PM inspection. User's chosen style and existing working voice window take precedence. React/accessibility/browser skills support verification. No extra approval stage is needed for the already specified home/start-state scope.

## User-requested12D skill workflow —22October

User explicitly requests extensive use of installed UI design skills. For12D, use Impeccable critique/audit/polish/clarify/distill/adapt/harden and scoped animate guidance as one execution workflow; Web Design Guidelines for accessibility; React Best Practices for implementation; Playwright for rendered verification. See prompts/UI_POLISH_12D_PROMPTS.md. User component styling and pinned Taste direction remain the aesthetic brief, not a competing redesign. This latest instruction supersedes earlier exclusion of Impeccable for this follow-on polish pass. No broad rebranding, unrelated generic fixes, extra implementation tasks or unlimited verification loops.

## User override — 22 October 2026, Task12B redesign

User explicitly requests Taste skill and Awesome Design, prefers ElevenLabs voice-chat-01 and rejects the existing debugging-interface design/ChatGPT cloning. For12B only, Taste's app-screen guidance replaces Impeccable as design authority; Awesome Design's ElevenLabs analysis remains reference-only. PM located upstream Taste because no local installation exists; pinned sources and scope are in `references/UI_DIRECTION_12B.md`. Existing reserve/not-both policy is satisfied by this replacement, not concurrent authorities. User-selected references override unrelated random direction or marketing workflows. React and browser verification skills remain applicable.

Research checked against the linked public repositories on 17 October 2026 in Toronto (18 October UTC). **Bootstrap update: all four selected skills are installed project-locally in `.agents/skills`.** Inspect installed versions before rerunning setup. External skill contents are guidance subordinate to the user's project scope and applicable repository instructions.

## Actual bootstrap installation

| Skill | Installed source / identity | Installation actually used |
|---|---|---|
| `vercel-react-best-practices` | Vercel skill metadata 1.0.0; content hash in `skills-lock.json` | `npx --yes skills@1.7.2 add vercel-labs/agent-skills --skill vercel-react-best-practices --skill web-design-guidelines --agent codex --copy --yes` |
| `web-design-guidelines` | Same collection; content hash in `skills-lock.json` | Same selected two-skill command; no other Vercel skills installed |
| `impeccable` | Skill/installer 4.6.0, engine 0.1.15 (`scripts/VERSION`) | `npx --yes impeccable@4.6.0 install --providers=codex --scope=project` |
| `playwright-cli` | `microsoft/playwright-cli` commit `b85c7a736bb473bf55b584e54a09ffa698d6d871` | Codex skill-installer helper copied `skills/playwright-cli` from that exact revision into `.agents/skills`; executable `@playwright/cli` 0.1.22 is a locked local dev dependency |

Vercel upstream HEAD observed during installation was `063bee94c3f4df8453406c830b0a7df0f2860278`; the installer records content hashes rather than Git revisions, so `skills-lock.json` is the definitive installed-content identity. Keep that lockfile. The helper did not add Playwright to that generated lockfile; its pinned revision is recorded above.

Playwright uses `npm run browser:cli -- <command>` and `npm run test:smoke`; no global executable or extra browser MCP server was installed. `npm run browser:install` installs Chromium for tests. The CLI reports 0.1.22; the runner reports 1.64.1.

Impeccable installed `.codex/hooks.json`. Its local Windows engine ran `context` successfully; the downloaded platform executable is ignored, while launchers and the engine version are committed. On another machine the launcher may download the pinned engine. Inspect `/hooks` and approve this project's hook if prompted by Codex; **hook trust/automatic execution is not verified**. Reload the harness or use the next turn to refresh skill discovery, then verify `/skills`. No skill is unavailable on disk; manual harness activation remains separate.

The bootstrap uses the supplied product plan for concise `PRODUCT.md` and `DESIGN.md`; broad discovery, visual variants and full design-audit workflows remain outside this local foundation task. Follow the original bounded policy below when real interaction work begins.

## Selected baseline

| Source | Exact skill / role | When to use | Decision |
|---|---|---|---|
| [Impeccable](https://github.com/pbakaus/impeccable) | `impeccable` — primary product UI design | Step 05 shape/import/preview; 11–12 error states/mobile; final scoped audit/polish | USE |
| [Vercel agent skills](https://github.com/vercel-labs/agent-skills) | `vercel-react-best-practices` — relevant React/Next implementation guidance | React/client state and server boundaries throughout applicable worker tasks | USE |
| Same collection | `web-design-guidelines` — UI/accessibility review | A focused review of implemented UI in Steps 05, 12–13 | USE |
| [Microsoft Playwright CLI](https://github.com/microsoft/playwright-cli) | `playwright-cli` — browser interaction and verification | Browser smoke checks from Step 01; workflow/state tests from Step 05 onward | USE |

### Impeccable: one primary design authority

The current repository exposes one `impeccable` skill with subcommands. Do not follow older instructions that assume separate installed skills named `frontend-design`, `audit`, or `polish`. Its current skill distinguishes task-oriented **Operate** surfaces from persuasive marketing surfaces; our import, source preview and conversation UI belong mainly to Operate, with readable source text. [Current SKILL.md](https://github.com/pbakaus/impeccable/blob/main/.agents/skills/impeccable/SKILL.md)

Use a bounded subset:

| Command | Project purpose |
|---|---|
| `init` | Record durable product context from the existing brief/plan; ask only about material gaps |
| `shape` | Design the source→preview→voice/text flow before building it |
| `adapt` | Check phone widths, source reading and keyboard/control reachability |
| `harden` | Improve empty/loading/error/retry/permission states within this app's scope |
| `clarify` | Make status labels and recovery instructions understandable |
| `audit` | Inspect implemented UI quality; triage concrete findings |
| `polish` | A final bounded consistency pass after functional gates pass |

`PRODUCT.md` should describe purpose/audience/constraints; `DESIGN.md` should capture the chosen visual system. Reuse existing valid files and recorded decisions. Start with the assessment's content; do not turn setup into a second discovery project. Large visual variant sessions, image-generation work, branding, `overdrive`, extensive animation and a marketing landing page are outside this three-day scope. The skill's `harden` command does not mean adding accounts or internationalization absent a requirement.

The current skill uses a small launcher/engine for context and optional detector behavior. Its own fallback permits reading existing project context if the launcher cannot run. A clean design detector is evidence about its checks, not proof that the user flow or accessibility is complete. [Installation and behavior](https://github.com/pbakaus/impeccable)

### Vercel: selected implementation and review guidance

Read relevant rules from [`skills/react-best-practices/SKILL.md`](https://github.com/vercel-labs/agent-skills/blob/main/skills/react-best-practices/SKILL.md). The actual skill name is `vercel-react-best-practices`. Prioritize request waterfalls, server/client boundaries, listener cleanup, state correctness and excessive re-renders where those risks exist. Do not rewrite working code to satisfy every micro-optimization or use React APIs absent from the pinned release. Guidance to authenticate a server action is satisfied by appropriate authorization for this product; it does not create an OAuth requirement.

Use [`skills/web-design-guidelines/SKILL.md`](https://github.com/vercel-labs/agent-skills/blob/main/skills/web-design-guidelines/SKILL.md) for a focused audit of actual UI files. Follow its current guideline-source retrieval step; the underlying [Web Interface Guidelines](https://github.com/vercel-labs/web-interface-guidelines/blob/main/command.md) cover interaction/accessibility detail. Combine findings into one prioritized fix list with the Impeccable review; avoid two repeated audits of unchanged UI.

Skip the collection's Vercel deployment/optimization skills for the Render deployment, React Native guidance for this mobile web app, and optional view-transition work. Composition guidance is conditional if a component API becomes concretely hard to maintain; it is not another baseline install. Writing guidance is optional and unnecessary alongside the current project documentation work.

### Playwright CLI: observable browser evidence

Use the actual [`skills/playwright-cli/SKILL.md`](https://github.com/microsoft/playwright-cli/blob/main/skills/playwright-cli/SKILL.md). It documents snapshots, file upload, viewport changes, browser interactions, console/request inspection, tracing and Playwright test work. Choose a small repeatable workflow; keep provider-response mocks explicit. Use stable accessible locators for repeatable tests, and inspect actual snapshots before choosing element references.

Browser automation is one layer of `TESTING.md`. Real microphone permissions, audible playback/interruption, device keyboards and physical iOS Safari/Android Chrome must be tested separately. A mobile viewport or Playwright WebKit run is not evidence that a real iPhone passed. Do not record credentials through storage/network inspection. Prefer temporary browser profiles for the anonymous-demo tests.

## Reviewed, but not baseline installations

| Repository | What it actually provides | Project decision and reason |
|---|---|---|
| [leonxlnx/taste-skill](https://github.com/leonxlnx/taste-skill) | Several design skills; current `design-taste-frontend` emphasizes art direction, reference imagery and browser review for public pages | RESERVE alternative. Its useful aesthetic guidance overlaps Impeccable, while its default workflow is less aligned with a compact voice/source tool. Do not load both. `minimalist-ui` or `redesign-existing-projects` could be a deliberate replacement choice later, not concurrent authorities. |
| [voltagent/awesome-design-md](https://github.com/voltagent/awesome-design-md) | A curated collection of design-system documents and previews derived from existing sites | REFERENCE ONLY. Consult selected examples for typography, spacing and hierarchy. Keep the app's own compact `DESIGN.md`; do not copy an entire brand's visual identity or treat the collection as a runtime dependency. |
| [dmmulroy/anti-slop](https://github.com/dmmulroy/anti-slop) | Opinionated Oxlint rules plus the `install-anti-slop` installation/configuration skill | DEFER. It vendors rules and changes lint configuration/dependencies. Useful if we deliberately choose that coding policy, but it adds policy and maintenance work during a three-day deadline. It is not a visual anti-template skill. |

The [anti-slop installer](https://github.com/dmmulroy/anti-slop/blob/main/skills/install-anti-slop/SKILL.md) enables all generic rules and installs matching Oxlint/plugin versions. Some policies cover module mocking, broad unknown/object boundaries and type assertions. Do not blindly introduce these rules into a provider-integration project or remove appropriate runtime validation to satisfy a lint rule. If the actual repository already uses it, respect its policy and assess concrete conflicts instead of deleting it. No Effect dependency is proposed for this project.

## Setup in the repository, when implementation begins

These are researched setup commands, **not commands already executed**. The manager first inspects the repository's agent environment and existing installs. Prefer project scope. Record installed skill names, source revision/version, runtime versions and any generated configuration in the tracker; retain a generated skill lockfile when the installer provides one. Use the actual agent target if the worker is not Codex.

### 1. Vercel's two selected skills

The [skills CLI](https://github.com/vercel-labs/skills) supports selection by frontmatter name and an agent target:

```sh
npx skills add vercel-labs/agent-skills --skill vercel-react-best-practices --skill web-design-guidelines --agent codex
```

The CLI defaults to project scope; do not add `--global` or install the whole collection. For a copy-based setup, its `--copy` option avoids symlinks. Use `--list` first if the installed/current collection differs from this research snapshot. Record the resolved revision rather than inventing a pinned commit.

### 2. Impeccable

The repository's current recommended installer is:

```sh
npx impeccable install
```

Select the current coding harness and project scope in setup, preserving existing configuration. In Codex, verify that `impeccable` appears in `/skills` or invoke it with `$impeccable`; the upstream documentation also uses `/impeccable <command>` in harnesses with slash commands. Start with `init` using the already supplied plan, then the scoped task's command. Do not assume a slash alias exists until the installed harness shows it.

The current installer may add a project design hook. The upstream README instructs Codex users to inspect `/hooks` and approve the project hook when prompted. That is a harness trust step, not proof that a hook is already installed or authorized in the present planning session. Review any generated changes, preserve unrelated hooks and follow the repository/user authorization. If setup cannot run, use the documented context fallback and continue the project; do not spend the foundation timebox debugging optional design tooling.

### 3. Playwright CLI

First check for a usable existing local Playwright CLI as described by the skill:

```sh
npx --no-install playwright --version
```

If the installed version exposes the CLI, use its documented local `npx playwright cli` path. Otherwise, the upstream installation is:

```sh
npm install -g @playwright/cli@latest
playwright-cli --help
playwright-cli install --skills
```

The README requires Node 18 or newer; the proposed application runtime is newer. The worker should verify installed browser availability and actual skill discovery. A global executable is distinct from project skill scope: if global package installation is inappropriate in the repository environment, use the supported local tool path rather than forcing it. Record the resolved executable version for reproducibility. Do not install both Playwright CLI and a second browser automation server unless a concrete need exists.

## Activation by task

| Tasks | Skills to load |
|---|---|
| 01–04 foundations and integrations | Applicable React guidance; Playwright only for observable browser checks. No design skill for backend-only work. |
| 05 source UI | Impeccable for flow/design, React best practices, Playwright; focused web-guideline review |
| 06–07 adapters/context | Relevant code guidance and focused verification; design only if user-facing behavior changes |
| 08–10 controls/transcript/text | React best practices, Playwright and scoped Impeccable UI refinement |
| 11–12 recovery/mobile | Impeccable harden/adapt/clarify/polish, web-design-guidelines, Playwright |
| 13–14 review/submission | Targeted browser checks and focused UI audit if needed; no new design framework or lint migration |

Keep one coherent design system and one consolidated list of concrete findings. Skill setup and audits support the project; they do not become separate deliverables that displace ingestion, voice, testing or the walkthrough.
