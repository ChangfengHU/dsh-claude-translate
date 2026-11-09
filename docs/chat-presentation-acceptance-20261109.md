# Native Chat Presentation Acceptance

Date: 2026-11-09. Translation package: 0.3.1. Live companion: dsh-codex-claude-cli 0.2.1.

## Scope

This release extends the translation plugin, not a separate global chat theme.
Native Chat supports Chinese, English and bilingual replies. Bilingual layouts
include side-by-side, stacked and Chinese with collapsible English. User input
stays original. Model-visible history and canonical Claude replies stay English.

## Automated Verification

65 Node tests pass, including:

- All language/layout combinations and strict preference validation.
- Per-session preferences surviving restart without affecting other sessions.
- Native turn/step correlation and legacy correlation requiring both prior
  message identity and an exact answer, not answer text alone.
- A deliberately delayed Chinese translation not blocking Claude's finish.
- Failed display translation retaining a successful canonical answer.
- Retained-snapshot cache reuse after restart and invalidation on model changes.
- Session-scoped metadata/batched display endpoints, same-origin writes and
  malformed batch/preference rejection.
- 1,000-record pagination and retention tests, without sending synthetic data
  to any model.
- A 1,000-row client fixture fetching metadata once and only visible reply
  text, plus a stale-poll versus preference-save race regression.
- Native image, tool-action and reasoning block preservation in projection.

## Real Ordinary Conversations

The two submitted messages were ordinary requests, not instructions to test a
plugin, force an English reply or return a predetermined answer:

1. 明天出门前要检查哪些东西？列三项就好。
2. 我坐地铁，不开车，调整一下刚才的清单。

Both produced English forwarded requests, real English Claude answers and
Chinese native Chat replies. The second answer correctly replaced driving
advice with subway service, transit-payment and transfer checks.

| Measured phase | First request | Follow-up after Host restart |
| --- | ---: | ---: |
| Input preparation | 15,434 ms | 2,954 ms |
| Claude execution | 5,604 ms | 6,478 ms |
| Chinese display | 2,394 ms | 4,273 ms |
| Translation requests including display | 4 | 2 |
| Block-cache hits | 0 | 3 |

This is a bounded real example, not a universal speed guarantee. Input preparation
includes request preparation and persistence. Display translation completes
after the native terminal event; it is not included in Claude's completion wait.

## Browser Verification

- New empty session offers enablement and presentation controls before sending.
- Existing retained replies appear in Chinese without another Claude call.
- Pure English shows the original renderer and removes Chinese reply wrappers.
- All three bilingual layouts render, and the English disclosure opens normally.
- Native Markdown, code, links, reasoning and action surfaces remain composed
  with the installed companion renderer rather than copied or replaced wholesale.
- At 1280-pixel viewport, side-by-side columns measured 364/364 pixels.
- At 430-pixel viewport, columns stacked at 302 pixels; no document overflow.
- Reload/Host restart preserved enabled state, preferences and Chinese replies.
- No translation renderer errors observed. Connection-retry warnings during the
  deliberate service restart were expected and recovered.

## Boundaries

- Only retained translation runs have bilingual evidence. Pruning follows the
  existing newest-100/age/size policy and does not delete canonical DSH history.
- No historical batch was sent to models. No new DB, container, service or worktree.
- Global enablement remains explicit, and the main Qwen model was not changed.
- This release did not newly live-test independent DeepSeek-key or local-Codex
  translation paths; provider contracts remain covered by offline tests.
- First-use context translation can still take seconds. Output translation is
  asynchronous, not token-by-token simultaneous interpreting.
- Native Copy copies canonical text. The labeled Chinese-copy action copies
  display Chinese. Raw requests remain inspectable in Translation.
