# DSH Claude Translate

[中文说明](README.zh-CN.md)

**中文输入，英文与 Claude Code 交流，中文阅读回复。**
在 DSH 中无缝使用本机 Claude Code，无需每次手动翻译或复制提示词。

Write naturally in Chinese, let the plugin forward English prose to your locally
authenticated Claude Code, and inspect both the real English answer and its
Chinese display translation in a Trajectory-style session timeline.

## What You Need

- A machine running **DSH Web** and **Claude Code with a valid local login**.
- The companion [dsh-codex-claude-cli](https://github.com/ChangfengHU/dsh-codex-claude-cli)
  DSH adapter, which exposes the local Claude CLI as the `claude-local` route.
- One translation source:
  - **Local Codex**, already installed, logged in and exposed by the companion
    adapter. Reuses your local login; no extra translation key is needed.
  - **Qwen / 千问 API key**, or **DeepSeek API key**.
  - An existing non-Claude DSH model route, which reuses its configured credentials.

> 安装 CLI 不等于已登录。本插件不复制 Claude/Codex 登录凭据，也不绕过供应商认证。
> 仅安装翻译插件不会凭空创建 Claude 通道；需同时启用本机 CLI 适配插件。
> 设置页会识别已经注册的 Claude/Codex 通道；这不是对 CLI 登录有效性的证明。

## Quick Start

1. Install the companion CLI adapter and this plugin through DSH's Plugin Manager
   as Host + Web bundles. Restart the idle DSH Host and reload the browser.
   Install a versioned release package, not an unpinned development directory.
2. Open **Translation → 翻译设置**. Choose your existing Codex/model route, or enter
   a Qwen/DeepSeek key once. Keys go to DSH's credentials service, never Git or
   browser localStorage.
3. Save and test the configuration. Testing translates a sample only; it does not
   call Claude or run tools.
4. Select Claude Code in DSH's normal model picker and enable translation for this
   session. Continue using the **original chat composer**. English input works too:
   English-only prose bypasses paid input translation.

After setup there is no copy/paste translation step. Global default enablement is
optional and explicit; the plugin never switches your main conversation model.

The repository's release assets contain the translation package. A companion
adapter release must be installed separately; this repository does not bundle a
private machine's installed adapter or its login data.

## Read Replies Your Way

The native Chat composer now offers **Chinese**, **English**, and **bilingual**
reply presentation. Chinese is the default presentation; enabling translation
still remains explicit. Bilingual layouts include side-by-side, stacked, and
Chinese with collapsible English. Preferences are saved per session and survive
reloads and Host restarts. At narrow widths side-by-side falls back to stacked.

Enable **中英转换** before the first message of a new Claude session. Your input
stays exactly as you typed it. Display choices never rewrite canonical English
model history, switch the main model, or trigger another Claude request.
The separate Translation tab still provides the original and actual forwarded
requests. Native images, file links, previews, approvals, tool actions and
collapsed reasoning remain owned by the companion renderer.

Claude's terminal event no longer waits for the Chinese display translation.
The display is filled asynchronously; a failed or interrupted translation keeps
the English answer available. Native Copy continues to copy canonical text;
**复制中文** copies the displayed Chinese.

Chat uses a shared session metadata subscription and batches text reads for
visible replies. It does not download full request snapshots for every bubble.
Only retained translation runs have bilingual evidence: after the 100-run/age/
size limit prunes a trace, native conversation history remains available without
silently calling a model to retranslate it.

## Inspect the Timeline

- A compact row per invocation, with input-translation / Claude / reply-translation
  phases, real timings, status, model and timestamp.
- Expand a row in place to inspect **original input → actual forwarded English**
  and **raw Claude reply → Chinese display translation**.
- Full request inspection is lazy. Original and forwarded JSON load only when
  requested; full-record download is separate.
- Search, stable cursor pagination (20 rows per page), session isolation, auxiliary
  request filtering, cancellation and explicit provider errors.
- Only the expanded row loads details. Idle completed details are cached; hidden
  tabs stop polling. Unchanged list responses contain a revision, not the history.
- Source code, paths, structured JSON, images and literal tool arguments/results
  are preserved. English prose is enforced, not ASCII-only data.

## Fast Translation

The model is configurable; **fastest is environment- and workload-dependent**.
A Qwen Flash/Turbo-class route is a useful latency candidate, but choose it only
after testing its exact ID, regional availability and translation fidelity.
Do not substitute a specialized MT model that cannot return the required segment
JSON without implementing its protocol.

The plugin caches whole blocks and reusable literal-free sentence segments.
Changing nearby English session metadata no longer forces all static Chinese
context to be translated again. Existing English-only input incurs no input
translation call. Failed/incomplete input translation blocks Claude rather than
silently dropping instructions.

After restart, matching retained snapshots can warm the block cache. Reuse is
bound to the translation pipeline, provider, model, endpoint and exact text;
changing one invalidates reuse. This is bounded by existing trace retention, not
an additional unbounded cache. First-use translation and changed context can
still take time; the plugin does not claim every request is instantaneous.

Invalid segment output receives at most one strict, metered repair attempt.
If it still fails, Claude is not called. Repairs are not endless retries.

Quoted UI copy and filenames are preserved as literal input data. Chinese
punctuation terminates unquoted paths/URLs, so the instruction after a path is
not accidentally hidden from translation. Code-only answers skip paid display
translation. Real acceptance uses normal business requests, not messages that
tell Claude about this plugin or supply the expected English answer.

Local Codex is convenient for reusing a login, but is not automatically the lowest
latency translator. Codex translation inherits the adapter's sandbox/approval
policy. DSH tools are not supplied to translation requests; native CLI policy is
not weakened.

## 1,000-Record Design

This does **not** render or transfer 1,000 full conversations on page load.

| Layer | Behavior |
| --- | --- |
| History | Indexed summaries, cursor pages of 20; maximum page size 50 |
| List polling | In-memory metadata only; no full JSON/file scan per refresh |
| Detail | One selected run, lazy loading; compact text capped at 32K characters |
| Full JSON | On demand; 64K-character visual preview, complete download |
| Storage | Content-addressed shared message/system blobs, immutable message ID mapping preserved |
| Limits | Only the latest 100 traces across this plugin profile, 64 MiB total trace/blob budget, default seven-day retention |
| Concurrency | At most eight active translated Claude requests; excess requests fail explicitly |

默认只保留最近 **100 条翻译调用**（整个插件 profile 合计），超出的旧记录自动删除，
没有引用的共享文件同步清理。不会删除 DSH 原始会话。正在执行的调用不会被清理。

These are bounded **debug-history** records, not an unlimited business archive.
Retention can evict old traces when age/count/size limits are reached. Canonical
DSH conversation history is not deleted by this plugin.

Run `npm test` to reproduce the 1,000-run pagination, restart, ownership, dedup and
1,000-session configuration tests. Synthetic scale tests run in isolated temporary
directories and never call models or pollute real sessions. They do not prove that
a provider can handle 1,000 concurrent model calls.

## Truth And Safety Boundaries

The hook records the actual **DSH-to-Claude-adapter** request before dispatch. It
does not capture Claude's HTTP wire or CLI-private context. Native CLI-internal
prompts, CLAUDE.md, native tool loops and hidden reasoning are outside this capture.

Canonical English stream chunks pass through unchanged; the Chinese display
translation never replaces model history. Identified translation segments reject
missing/duplicate IDs, Chinese left in translated prose, changed placeholders and
obvious shortening. These guards detect common omissions, not every possible
semantic error. Review bilingual input for high-risk actions.

Known credential patterns are redacted from debug storage/export; this is a
practical filter, not a guarantee for arbitrary secrets. Image bytes and hidden
reasoning are omitted. Data lives under `~/.dsh/claude-translate/<profile>/`, with
0700 directories and 0600 atomic files. Keys are stored through DSH credentials.

DSH Connection admission and same-origin writes are required. This plugin is not
a replacement for the parent DSH installation's authentication. Never expose an
unauthenticated coding agent to untrusted users.

## Development

Node.js 22+, no build-time dependency installation required:

~~~sh
npm test
npm run check
npm pack
~~~

Manual source edits, builds, Git remote operations and deployment for this project
are performed on the authorized Linux development host. No local-Mac Git remote
operations are needed. Transfer packages, never machine credentials/session data.

MIT License. Independently maintained; not an upstream UI plugin repackaged.
