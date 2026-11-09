# Natural Conversation Acceptance - 2026-11-09

## Method

Live Host used the companion dsh-codex-claude-cli 0.2.1; image, approval and
artifact behavior depends on that adapter as well as this translation layer.

Nine business scenarios, eleven real conversation requests including two
before/after regressions, plus 55 offline automated tests.

The submitted user messages were ordinary tasks. They did not name the
translation system, require an English reply, or provide a predetermined English
answer. One ordinary English edit request checked direct-English behavior.
Checks compared the original request, actual forwarded request, real Claude
answer, display translation, native approvals and filesystem artifacts.

No batch of synthetic history records was sent to models. No new database,
container, server or worktree was created.

## Real Scenarios

| Scenario | Result and evidence |
| --- | --- |
| Chinese work plan | Three requested tasks returned; English forwarding and Chinese display verified |
| Multi-turn reference | Moving the second item first preserved the other task order |
| Chinese button label | Found a real defect: the requested label became Save Draft; after the fix both forwarded data and generated HTML retained 保存草稿 exactly |
| English edit with Chinese label | Input passed through unchanged; disabled was added and Chinese label kept; zero translation requests, input preparation 37 ms |
| Real HTML creation | Native one-time Write approval worked; an actual 3,037-byte file contained all four required Chinese labels, checkboxes and inline JS |
| Artifact preview and download | The file downloaded; preview rendered, checkbox worked. Preview storage was denied by its sandbox, so saving in preview is a documented limitation, not a pass |
| Image attachment | A neutral two-square PNG was pasted as a real image attachment; Claude correctly identified red on the left and blue on the right; trace omitted image bytes |
| Cancel and continue | A running long answer was cancelled; the next question returned 384 for 128 + 256 instead of continuing the cancelled checklist |
| Missing file | No task count was invented. Also found a path-tokenization defect; after fixing and repeating the same request, the entire instruction after the path was forwarded in English |

The missing-file operation was a handled tool/business error, not a provider
outage. A transport-level success alone was never treated as a business pass.

## Fixes Delivered In 0.2.3

1. Preserve quoted Chinese UI copy, titles, filenames and attribute values as
   literal input data. Do not treat apostrophes in English words as quotations.
2. Terminate unquoted paths and URLs at Chinese punctuation so following
   instructions are not mistakenly protected as path data.
3. Skip paid display translation for code-only answers.
4. Add nine natural-dialogue regressions; all 55 automated tests and syntax checks
   pass. Existing cancellation, fail-closed input, incomplete translation,
   credential, cross-session and 100-run retention tests still pass.

Only instruction prose must be English. Requested Chinese data is intentionally
preserved; counting all Han characters without distinguishing data would be an
incorrect acceptance criterion.

## Remaining Gaps

- The main Chat view still displays canonical English. Chinese display text
  requires the Translation tab; seamless Chinese chat is not fully implemented.
- Claude's terminal event still waits for display translation. Nonblocking
  display translation remains to be implemented and tested.
- After a Host restart, a long-history request took 19,566 ms to prepare and made
  twelve translation requests including display translation and one repair.
  Historical/context retranslation is a real latency issue. This is NOT the
  latency of one short fresh user message. Warm direct-English input avoided all
  translation calls in the earlier scenario.
- With global enablement off, an empty session has no visible Translation tab
  before its first message. This isolated test session was explicitly enabled
  using the existing control API before sending the first message. The
  first-message setup workflow needs a clearer product entry point.
- Artifact previews intentionally isolate storage. The generated page handled
  unavailable storage with an explicit message. Browser automation refused the
  file protocol, so opening the downloaded file standalone was not validated.
  No sandbox or browser policy was weakened to obtain a passing result.
- Independent DeepSeek API and local Codex translation were not live-tested in
  this batch. Offline provider contracts are not a substitute for those live
  checks.

This is a scoped test report with verified fixes, not a claim that the entire
seamless-chat and performance target has passed.
