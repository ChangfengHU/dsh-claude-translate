# Stable Streaming Interaction Acceptance

## Version 0.3.6

All source changes, tests, packaging and deployment were performed on Linux114.
Qwen Flash remains the saved translation model. Claude remains the chat model.
No new worktree, service, database or container was created.

## Root Causes And Changes

- Input English was collapsed by default and prepared after background context.
  It is now expanded, with the current question translated first. The complete
  context still has to validate before anything is dispatched to Claude.
- Partial JSON headers temporarily erased the preview while the next row's text
  was incomplete. The parser now keeps preceding received records and does not
  append closing Markdown syntax until the current string is complete.
- Chinese inherited the completed Claude renderer state even while translation
  was streaming. Its display projection now retains native streaming Markdown.
- Completion changed columns and collapsed English. The reply structure now
  stays fixed; live English uses a bounded, user-controlled preview. The phase
  rail stays below the input instead of being moved into the assistant response.
- Historical inputs stay lazy despite default-open English. Shared input/reply
  detail subscriptions are reference counted.

## Verification

109 automated tests pass, including a character-by-character JSON preview
regression check, input-first validation, default expansion, streaming after
Claude finishes, stable layout, session isolation and recent-100 retention.
The full suite also exits normally without forcing the test process to stop.

Normal checklist and colleague-message requests were used, without mentioning
the plugin or requiring predetermined English responses. Browser checks found
no console errors. The final four-item checklist request succeeded with:

| Observation | Count |
| --- | ---: |
| Captured live updates | 72 |
| Updates containing input English previews | 4 |
| Updates containing Chinese incremental previews | 22 |
| Displayed-length backsteps | 0 |

The English preview remained open with the same measured 152-pixel outer height
before and after completion. The reply stayed in its single-column layout.
These observations are one real run, not universal latency or zero-layout-shift
guarantees. Natural text growth still scrolls when the reader follows the end.

## Remaining Boundary

One earlier long, heavily formatted colleague-message response failed the
existing exact-segment output contract after its bounded repair. Original
English was retained and the incomplete Chinese was labeled partial. This
release does not claim to eliminate provider omissions or guarantee semantic
equivalence. Final validation is not relaxed to hide that failure.

Evidence: `stable-stream-final-2026-11-11.json` contains only the test run's
metadata, character counts and timings, not credentials or request snapshots.
