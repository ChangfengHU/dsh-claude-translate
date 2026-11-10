# Translation UI Acceptance

User-facing date: 2026-11-10, America/New_York.

## Scope

- Translation, Models and Model Console surfaces use English UI labels.
- The composer has a compact Translate popover and a short model label such as
  `Claude · Default`; exact source/model/effort remain in the picker and tooltip.
- Translation source changes load that source's models automatically. Stale
  responses cannot replace a newer source selection. Save/test operations reject
  registered-source/model mismatches before credentials or Claude are invoked.
- Claude Code targets are detected from native runtime adapters, not editable
  route IDs. Source errors distinguish authentication, quota and model rejection
  without returning raw provider messages or credentials.
- Qwen Flash is the initial preference; DeepSeek and Codex remain explicit
  alternatives. Existing user choices are not silently changed by the package.

## Verified

- Translation: 75 automated tests passed. Model Console: 33 tests passed.
- In-page DeepSeek translation returned a real English translation in 1.13s.
- In-page Qwen Flash translation returned a real English translation in 3.03s.
  These are individual observations, not comparative speed benchmarks.
- A normal Chinese subway checklist request completed with Qwen Flash input
  translation, actual English forwarded input, an English Claude response and
  Chinese display translation. The run and execution status were succeeded.
- The deployed default translation selection is Qwen Flash. The primary Claude
  conversation selection, credentials and permissions were not changed.
- A public mismatched Codex/Qwen test was rejected with the explicit
  TRANSLATION_MODEL_MISMATCH RPC code, before any model call.
- Native global settings RPC and foreign-Origin translation requests remained
  HTTP 403. No global admission bypass was introduced.
- Checked desktop, 900px and 390px layouts. The mobile popover stays inside the
  viewport after end-aligning it. Temporary viewport overrides were reset.

## Boundaries

Codex is selectable but the one catalog model tested in this acceptance failed.
Catalog membership is not proof of account entitlement; this release does not
claim every native Codex model is callable. No account credentials were changed.

Old failed conversation messages and native history were retained. No bulk AI
evaluation, new daemon, database, branch or worktree was created. Development,
tests, package builds and Git operations ran on Linux 114.
