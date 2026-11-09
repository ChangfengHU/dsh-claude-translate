# Acceptance: 2026-11-09

## Environment and scope

- Development, Git operations, packaging and deployment: Linux host 114 only.
- Repository: ChangfengHU/dsh-claude-translate, private, main.
- Installed plugin: 0.1.4; existing Claude adapter: dsh-codex-claude-cli 0.2.1.
- Translation provider actually exercised: existing DSH deepseek-official route
  configured for Aliyun Qwen qwen-plus-latest, not the DeepSeek API endpoint.
- Independent API mode and local Codex route contracts have automated tests;
  separate real DeepSeek and local Codex translation calls were not exercised.
- Installation remains globally disabled. Only the acceptance session was opted
  in; users can explicitly enable other sessions or the global default.

## Automated verification

37 Node tests cover immutable request reconstruction, plugin injection prose,
preserved images/code/tool data, translation caches, fail-closed input,
nonfatal display translation failure, cancellation, private atomic persistence,
cross-session lookup, credential isolation, transport validation, native RPC,
async-local recursion bypass and translation completeness regressions.
All JavaScript sources pass syntax checks. No model calls occur in unit tests.

## Actual browser and model acceptance

Session: session-8ccef168-059c-46d6-818c-3bd26eb10f17

Accepted run: tr_a2a5663c-0464-4344-81f3-6970c7f5cc6c

- Chinese source requests one exact English sentence and prohibits tools or
  reading/modifying files. Preflight preserved both requirements in English.
- Forwarded system text and message text contained zero Chinese characters.
- Claude returned exactly: The translation plugin is working.
- Chinese display translation rendered beside the untouched English response.
- Conversation and original/forwarded requests were visible in the new tab.
- JSON export completed through the browser and matched the selected run id.
- Desktop 1280px and narrow 390px layouts were inspected. The narrow layout
  stacks panes, intentionally scrolls history chips, and retains one native
  DSH input composer. Temporary viewport overrides were reset.

## Findings fixed before acceptance

1. This DSH exposes connection.rpc.handle, not connection.admit. The plugin now
   uses an official trusted-host RPC channel instead of weakening admission.
2. A plain-text translation model answered an imperative instead of translating
   it. Translation now requires identified complete sentence records, rejects
   missing/duplicate/unknown ids and incomplete output, and uses explicit
   translate-don't-obey policy. No heuristic proves universal semantic fidelity.
3. Invented placeholder/end markers are rejected before forwarding.
4. Auxiliary title requests no longer replace the normal conversation result in
   the default history view. They remain available via the auxiliary toggle.
5. A second input composer was removed to retain native DSH interaction.

## Remaining boundaries

Native CLI-private instructions, workspace instruction files and internal tool
loops are outside the DSH-to-adapter inspection boundary. Literal structured
data can remain Chinese. This is not a claim that the entire native CLI wire is
English or captured. High-risk requests still warrant reviewing both versions.
The pre-existing Claude adapter can reject title requests with unsupported
generation options; auxiliary failures are not conversation success failures.
