# Translation workspace and captured input acceptance

Verified on Linux 114 on 2026-11-10, with the existing DSH web profile.

## Behavior

- Accepted text sends return to Chat from Translation using the native shared chat store.
- Rejected sends, typing, history loads and translation connection tests do not navigate.
- Image-only acceptance and manual attachment removal are covered separately offline.
- Chat can expand the exact captured English user input, keyed by durable message ID and native event sequence. Identical text does not identify a turn.
- Input bodies are loaded only when expanded; metadata polling contains no prompt bodies.
- Failed pre-forward requests say Not sent. Persisted captured input remains session-scoped after restart.
- Settings uses a full-width configuration/test split, with advanced options collapsed and a stacked narrow-screen layout. Composer clearance preserves scroll access to results.

## Tests

- 81 translation automated tests passed, including late native-store registration, input identity, restart persistence, image-only navigation and 1000-record lazy-fetch regression.
- Real ordinary conversation requests covered a subway outing, rain adjustment, shortening the list, and a weather reminder. No request named the plugin or supplied a canned English answer.
- The first live navigation check failed and led to a correction: public stored entries expose the shared store on entry.store, and registration must follow later native module activation. The final ordinary reminder send switched Translation to Chat.
- English input expansion showed the real forwarded reminder and the actual Chinese response.
- Desktop 1280x720 and narrow 390x844 layouts were inspected; the test section remained reachable by scrolling. Model Console catalogs and signed-in source states loaded after the bundle change.
- Existing public-origin settings protection still returns 403. No credentials, main model, global defaults or saved translation source were changed.

## Performance evidence and limits

- Translation state/chat/runs origin probes were approximately 2-10 ms. This does not include public network latency or model execution.
- Model Console removed unused full-Zod locale code: browser payload 827406 to 47387 bytes, with a 120000-byte build budget.
- Combined plugin boot payload decreased from 6076079 to approximately 5305 KB, uncompressed across 49 entries.
- Public Model Console compressed transfer decreased from 148965 to 15827 bytes in probes from Linux 114.
- A translation-only test completed in about 1.5 seconds. Real Claude requests additionally require input translation, Claude execution and optional response translation; their latency is not page-load latency.
- A Mac-to-public homepage probe took about 2.2 seconds, including approximately 1.6 seconds of TLS establishment; a Linux-114 public probe was about 0.1 seconds. Explicit local proxy and direct curl probes were similar. This identifies a separate network-path delay, not a proven single proxy defect.
- Plugin Station (799436 bytes) and Skill/MCP Console (704020 bytes) remain large boot dependencies. They were not silently replaced as part of this release.
- No DevTools trace was available in this environment. These are HTTP/payload and functional measurements, not claimed LCP, INP, frame-rate or complete 1000-turn browser benchmarks.
