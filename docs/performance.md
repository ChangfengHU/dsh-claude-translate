# Performance And Retention Acceptance

Tested on 2026-11-09. These are small synthetic/provider checks, not a load SLA.

## Storage Tests

- All 46 automated tests passed, including deterministic sampling and bounded repair regressions.
- Isolated 1,000-run fixture: 50 cursor pages read in 67 ms, zero full-history
  disk reads on list requests; shared snapshots occupied 1,206,067 bytes.
- The scale test explicitly overrides retention to 5,000 for the temporary
  fixture. The deployed default is **100**, not 5,000.
- 105 sequential records left exactly 100; oldest files and orphan references
  were removed. Concurrent save/prune preserved all surviving shared references.
- 1,000 session enablement settings validated. This is not 1,000 concurrent CLI
  tasks; translated requests are bounded to eight active calls.

## Provider Samples

Same translation policy and similar short prohibitions in this environment:

| Model | Short samples | Observation |
| --- | --- | --- |
| qwen-flash | 1,753 / 1,392 ms | Low-latency candidate; no reasoning usage reported |
| qwen-plus-latest | 1,739 / 2,028 ms | Similar latency range; useful quality baseline |
| qwen3.8-flash | 5,161 ms | Reported 158 reasoning tokens in the route used |
| qwen3.7-flash | 14,293 ms | Reported 1,402 reasoning tokens in the route used |
| qwen-turbo | Rejected | Did not complete normally with the current route/key |

One Flash attempt returned invalid JSON and was blocked before Claude. The route
now explicitly requests temperature zero for non-Codex translation adapters.
The exact imperative plus no-tool/no-file constraints then passed in 1,632 ms.
Input validation stays fail-closed; deterministic temperature is not a universal
guarantee of semantic fidelity.

The deployed translator uses qwen-flash; the main conversation model is not
changed. This is a bounded sample, not proof of a globally fastest model. Larger
context, output length, cache state and provider load change latency. Independent
DeepSeek API and local Codex were contract-tested, not live-benchmarked here.

## Public Repository Audit

Tracked worktree plus both existing commits were scanned for private-key blocks
and known Qwen/OpenAI/GitHub/Cloudflare/AWS key patterns. No unexpected credential
matches were found. The literal test key in unit tests is fake. Pattern scanning
is not a proof that arbitrary unrecognised secrets cannot exist.

## Live Claude Acceptance

A real Chinese-input call completed successfully with qwen-flash translation.
Forwarded system/message prose contained zero Han characters. Claude returned
exactly: The fast translation path is working. The display translation was
stored alongside the untouched English answer. Observed timings: input 3,590 ms,
Claude 5,315 ms, display translation 2,066 ms. These timings depend on cache state.
An earlier residual-Chinese failure was retained as a failed trace and was not
forwarded. The exact long injected context then passed a separate preflight.
