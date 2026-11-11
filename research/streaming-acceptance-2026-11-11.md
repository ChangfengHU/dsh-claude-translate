# Streaming Acceptance - 2026-11-11

## Scope

Release 0.3.5, developed and installed on Linux114. Main chat remains local
Claude; the saved translator remains Qwen Flash. No new service, database,
container or worktree was created. No local-Mac development or Git remote
operation was used.

## Automated Checks

104 tests cover existing contracts and retention, partial JSON and literal
safety, SSE UTF-8 boundaries and cancellation, strict final validation, native
route progress, authenticated session-scoped watches, bounded output batching,
native actions, language layouts and Markdown structure. Pipeline ownership
keeps the first-token wait visible without duplicate status rails.

## Real Conversation

The ordinary Chinese task asked for a subway client-meeting checklist covering
before departure, the journey and arrival. No plugin name, forced English reply
or predetermined answer was included. A normal English follow-up requested one
action per stage and confirmed subway rather than driving.

The post-Markdown-fix Chinese run produced 101 observed live frames:

| Observation | Measured value |
| --- | ---: |
| Input preparation | 5,427 ms |
| Claude execution | 11,805 ms |
| First English to first Chinese | 1,753 ms |
| Chinese first appeared before Claude finished | 3,484 ms |
| Final Chinese ready after Claude finished | 1,619 ms |
| Output translation interval, overlapping Claude | 6,464 ms |
| English / Chinese final size | 1,441 / 508 characters |

These are one observed request, not latency guarantees. Input preparation also
includes uncached request context, not just the visible user sentence. Phase
durations overlap and must not be summed as sequential work.

The UI showed incremental English and Chinese, intact numbered lists and bold
labels, and captured forwarded English. Chinese, English and all bilingual
layouts were switched in the test session. Sending the English follow-up from
Translation automatically returned to Chat; its preparation took about 40 ms.

## Limits

Incremental previews are display-only, never evidence that an unvalidated input
has already been sent. Completed input still passes the strict segment and
literal contract. Native English history is unchanged. Translation can still
have semantic errors; the checks are not a semantic-equivalence proof. Short
responses, provider delays or prefix repair may defer Chinese until later.
