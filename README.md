# DSH Claude Translate

An independent DeepSeek Harness plugin for machines that already run DSH and a
locally authenticated Claude Code adapter. Users can write in Chinese while the
DSH-supplied natural-language context is forwarded to Claude in English. A session
**Translation** tab displays source text, the forwarded English request, the
original Claude response, and a Chinese display translation.

## Requirements

- Node.js 22 or later and a self-hosted DSH Web installation.
- A working local Claude Code login and an adapter registered in DSH. Our
  `dsh-codex-claude-cli` adapter registers `claude-local` by default.
- Either an existing non-Claude DSH model route (Qwen, DeepSeek, or locally
  authenticated Codex), or an independent OpenAI-compatible translation API key.
  This plugin does not require a second Claude subscription or copy CLI login data.

## Install

Install a versioned package with DSH's Plugin Manager, or add its local package
path to the Web profile as a DSH bundle. The package has both Host and browser
halves. Restart the idle Host and reload the page after installation. A plugin
listing alone does not prove that its browser entry or Host hook loaded.

Open any session, select the normal Claude Code model, then open **Translation**.
In **Settings**, choose one of:

1. **Existing DSH model / local Codex:** select its provider, load its models, and
   choose a model. Existing DSH credentials are reused without copying keys.
2. **Independent API key:** choose Qwen, DeepSeek or a custom compatible HTTPS
   endpoint, set its exact model id and API key. Keys are stored through DSH's
   credentials service, never in the plugin configuration, browser storage or Git.

Save, test the saved translation configuration (this does not call Claude), and
enable translation for the current session. Default enablement for all Claude
sessions is an explicit configuration option; installation defaults to disabled.
The plugin does not change the session's selected main model.

## Execution and truth boundaries

1. A `llm/stream` listener handles only configured Claude provider routes.
2. It snapshots the current configuration, translates text and system context,
   including plugin-injected prose, and creates new immutable messages. Source
   message ids and forwarded message ids are mapped in the trace.
3. It dispatches a new request through DSH. Async-local bypass prevents recursion,
   including when DSH clones requests internally. The original loop request and
   canonical session history are never mutated.
4. The actual forwarded **DSH-to-adapter** request is recorded before dispatch.
   This is not a capture of Claude's HTTP wire or CLI-private context. Native
   Claude SDK instructions, native tool loops, workspace CLAUDE.md files and hidden
   reasoning are outside this boundary; do not claim those are all translated.
5. Original model stream chunks pass through unchanged. Display translation is
   separate and cannot silently replace the canonical English answer. A failed
   input translation blocks Claude; failed output translation retains the answer
   and marks the run partial.

Code fences, inline code, URLs, common filesystem paths, structured JSON text,
images and literal tool arguments/results are preserved rather than translated.
Chinese inside those literal data regions is allowed. This is an English
**prose** boundary, not a promise that every byte reaching a native CLI is ASCII.
Existing English-only prose bypasses translation. Repeated translations use a
bounded in-memory cache; no additional system-prompt skill is injected.

Existing local Codex translation routes inherit the native Codex adapter's
sandbox and approval configuration. DSH-provided tools are not supplied for
translation; native CLI policies are not changed by this plugin. Use a read-only
Codex route if choosing Codex as the translation provider.

## Inspection, privacy and disk

- The tab is additive via `conversation.view`; no assistant renderer replacement.
- Requests, raw answers, translated answers, timing and usage survive restart.
- Image bytes and hidden reasoning are omitted from inspection. Known API-key,
  bearer and credential-field patterns are redacted before trace persistence and
  export. Redaction is a practical filter, not a guarantee for arbitrary secrets.
- Private storage: `~/.dsh/claude-translate/<profile>/`, directory mode 0700 and
  atomic data files mode 0600. Configuration stores no API key.
- Each trace is limited to 2 MiB; retained history is limited to 250 files,
  25 MiB, and the configured age (default seven days). No database, container,
  browser download or additional daemon is required.
- API calls use DSH connection admission. Mutating requests additionally require
  same-origin JSON requests. Do not expose an unauthenticated DSH deployment to
  untrusted users: the parent application's authentication remains authoritative.

## Development

Development, Git remote operations, tests, packaging and deployment run on Linux.
Do not run Git remote commands on the local Mac. Package transport to other
machines uses a verified release archive, not host credentials or session history.

```sh
npm test
npm run check
npm pack
```

Tests use fake translators and fake Claude streams; they do not incur model
charges. Real provider verification is a separate, explicit acceptance step.

MIT License. Maintained in its own repository; it is not a repackaging of an
upstream artifact or HTML-rendering plugin.
