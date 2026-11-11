# Translation And Streaming Review - 2026-11-11

## Scope And Status

This is a research-only change. No production plugin source, default model, credentials, service, or permission configuration was changed. No model weights were downloaded. The new DeepSeek credential was supplied over non-echoing stdin for the benchmark and was not saved.

The DSH application host and a separately managed AutoDL GPU resource are different deployment targets. CPU-only observations on the application host do not limit the remote-GPU option. No actual self-hosted translation performance was measured in this review.

## Current Implementation

The production default is Qwen Flash through the registered DSH LLM route. The legacy route identifier is deepseek-official, but its selected model is qwen-flash; the route ID does not mean the current translator is a DeepSeek model.

TextTranslator protects code, paths, URLs and literal values, segments prose, asks for JSON translation records, validates identities and completeness, and caches successful translations. Input translation also covers uncached system/message prose; tool-result evidence is not rewritten. English-only prose can bypass translation.

The engine forwards Claude's canonical English chunks as they arrive. It does not buffer the entire Claude answer before yielding chunks to DSH. After Claude finishes, a separate job translates the completed answer into Chinese.

Three separate bottlenecks explain the screenshot:

1. The Chinese-only presenter hides the English text while the Chinese result is pending. Native English streaming is therefore visually concealed.
2. The provider executor accumulates the translator's JSON response, and TextTranslator validates the completed object. It currently exposes no progressive Chinese display callback.
3. The Chat-side translation channel polls metadata every 900 ms while active and every 3.5 seconds while idle. Input translation, first English token and Chinese translation are not presented as one operational pipeline.

Claude's native Think content must remain distinct from application progress. Translation activity should not be portrayed as Claude's private reasoning.

## Small API Benchmark

Four synthetic ordinary tasks, two Chinese-to-English and two English-to-Chinese. Cases cover everyday instructions, file/function scope, negation, retries, numbers, Markdown and code/JSON literals. Same literal protection is applied to every candidate. Generic models use an explicit translation-only system instruction; dedicated MT models use their required translation_options.

One request at a time, rotating candidate order across cases. Four responses per candidate; 24 attempts total, including four qwen-turbo rate-limit responses. There was also one MT-Flash availability probe and two existing-plugin baseline calls: 27 translation attempts in total. No Claude conversation request or LLM-as-judge evaluation was performed.

These are API-only measurements from this host and account, not end-to-end Claude timings, market-wide rankings, P95 estimates or a statistically conclusive quality benchmark. The full JSON-segmented plugin path is measured separately below. The first measured request can include connection setup; no broad performance claim is justified by four samples.

| Candidate | Successful cases | Median first text | Median completion | Literal checks | Semantic review |
| --- | ---: | ---: | ---: | ---: | --- |
| qwen-mt-flash | 4/4 | 326 ms | 764 ms | 4/4 | All four cases passed the review |
| qwen-mt-lite | 4/4 | 371 ms | 615 ms | 4/4 | Scope error and retries/attempts error |
| qwen-flash, raw API | 4/4 | 397 ms | 1,040 ms | 4/4 | One file/function scope inversion |
| deepseek-flash, thinking disabled | 4/4 | 757 ms | 1,049 ms | 4/4 | All four cases passed the review |
| qwen-mt-plus | 4/4 | Not incremental | 969 ms | 4/4 | All four cases passed; tested with supported non-streaming mode |
| qwen-turbo | 0/4 | Not measured | Not measured | Not measured | HTTP 429; cannot rank |

### Important Quality Findings

- MT-Lite changed modifying verifySession inside src/auth.ts into modifying the file to include verifySession. It also changed three retries into three attempts, changing operational meaning.
- The raw whole-text Qwen Flash test inverted the file/function containment relationship.
- These failures passed literal-token checks. Preserving backticks is necessary but does not prove semantic correctness.
- The production Qwen Flash JSON-segmented path was separately tested with the daily and code-scope inputs: 1,068 ms and 1,605 ms, one request each, no cache hits or repairs. Both outputs preserved the requested meaning. The raw-API failure must NOT be reported as a reproduced failure of the current production path.
- Passing four tasks does not establish that MT-Flash, MT-Plus or DeepSeek has universally better translation quality.

### Transparent Pilot Fit Score

This is a requirements-fit calculation, not a language-quality benchmark score.

Hard gates: all four semantic cases must pass and genuine incremental output must be available for the realtime recommendation. Only MT-Flash and DeepSeek Flash meet both gates in this pilot. Others receive no eligible realtime score rather than hiding a critical failure behind an average.

For eligible candidates:

- Quality: 50 points for all four reviewed cases passing.
- Speed: 30 points multiplied by the average of fastest-first-text / candidate-first-text and fastest-completion / candidate-completion, capped at one.
- Cost: 10 points multiplied by cheapest-standard-cost / candidate-standard-cost, capped at one.
- Incremental streaming: 10 points.

Standard cost means 1,000 uncached input tokens plus 1,000 output tokens at published Beijing CNY rates. DeepSeek uses the conservative peak rate. It is NOT the actual benchmark invoice; several Qwen streaming responses did not include usage counters.

| Eligible candidate | Pilot fit | Interpretation |
| --- | ---: | --- |
| qwen-mt-flash | 93/100 | First integration candidate for this workload |
| deepseek-flash | 77/100 at peak pricing | Viable fallback; slightly higher score off-peak |

## Verified API Prices

Published prices per million tokens, checked on 2026-11-11. Prices depend on region, caching and time; do not mix international USD quotes with Beijing CNY quotes.

| Candidate | Input CNY / 1M | Output CNY / 1M | Standard 1K-in + 1K-out |
| --- | ---: | ---: | ---: |
| qwen-flash, input up to 128K | 0.15 | 1.50 | 0.00165 CNY |
| qwen-mt-lite | 0.60 | 1.60 | 0.00220 CNY |
| qwen-mt-flash | 0.70 | 1.95 | 0.00265 CNY |
| qwen-mt-plus | 1.80 | 5.40 | 0.00720 CNY |
| deepseek-flash, off-peak/cache miss | 1.00 | 4.00 | 0.00500 CNY |
| deepseek-flash, peak/cache miss | 2.00 | 8.00 | 0.01000 CNY |

MT-Flash is not cheaper per token than the current Qwen Flash tier. Its advantages in this pilot are dedicated translation behavior and good first-text latency. Removing unnecessary translation calls, buffering and polling is still important.

The DeepSeek account catalog returned deepseek-flash and deepseek-v4-pro. Official documentation identifies the Flash version as DeepSeek-V4.1-Flash-1017 and documents thinking as enabled by default; translation tests explicitly disabled it. Pro was researched but not benchmarked: its published peak cache-miss/input and output rates are 9 and 27 CNY per million tokens, which is unattractive for the initial low-cost realtime translator selection. No claim about its measured latency or superior quality is made.

Sources:
- [Alibaba pricing](https://help.aliyun.com/zh/model-studio/model-pricing)
- [Dedicated MT request and streaming contract](https://www.alibabacloud.com/help/en/model-studio/machine-translation)
- [DeepSeek pricing and current versions](https://api-docs.deepseek.com/zh-cn/quick_start/pricing)
- [DeepSeek thinking mode](https://api-docs.deepseek.com/zh-cn/guides/thinking_mode)

## Small Self-Hosted Models

Only public model metadata and file sizes were fetched. No weights, runtime or new service was installed. No actual CPU/GPU translation speed or quality score is assigned.

| Candidate | Verified artifact/scale | Fit for the current host | Caveat |
| --- | --- | --- | --- |
| Tencent HY-MT1.5-1.8B, official GGUF | Q4_K_M file: 1,133,080,512 bytes; Q6_K: 1,474,785,216; Q8_0: 1,908,528,288 | First small bidirectional candidate to benchmark through llama.cpp on ARM64 CPU | Custom Tencent license; runtime/KV memory is additional; speed remains unmeasured |
| Google TranslateGemma 4B | Official 4B-family model; model API lists about 4.30B parameters | Potential quality-oriented alternative, with quantization and a larger footprint | Gated access and Gemma license; accepting terms remains a user action; not measured here |
| Helsinki-NLP OPUS-MT en-zh / zh-en | Each published pytorch_model.bin is 312,087,009 bytes | Lightweight CPU baseline; separate models for each direction | Older sentence-oriented architecture; developer constraints and formatting require dedicated validation |
| Meta NLLB-200 distilled 600M | Published pytorch_model.bin: 2,460,457,927 bytes | Research baseline if many languages matter | Model card declares CC-BY-NC-4.0; not the default choice for a commercial deployment |

Parameter count alone does not determine on-disk size, resident memory or latency. A quantized 1.8B-family model can have a smaller artifact than an unquantized 600M model.

For OPUS, the current model cards declare Apache-2.0 for en-zh and CC-BY-4.0 for zh-en. Do not label both directions Apache-2.0. The Tencent license contains territory restrictions; review its actual text before deployment. No legal clearance is inferred from a public download.

Self-hosting can reduce per-request vendor charges, but still incurs RAM, CPU/GPU, electricity, deployment, monitoring and upgrade costs. It must be benchmarked on the approved AutoDL or CPU target before claiming it beats the measured hosted APIs.

Sources:
- [Tencent official model and variants](https://huggingface.co/tencent/HY-MT1.5-1.8B)
- [Tencent official quantized files](https://huggingface.co/tencent/HY-MT1.5-1.8B-GGUF/tree/main)
- [Tencent license](https://huggingface.co/tencent/HY-MT1.5-1.8B/blob/main/License.txt)
- [Google announcement](https://blog.google/innovation-and-ai/technology/developers-tools/translategemma/)
- [TranslateGemma model card](https://huggingface.co/google/translategemma-4b-it)
- [OPUS en-zh](https://huggingface.co/Helsinki-NLP/opus-mt-en-zh)
- [OPUS zh-en](https://huggingface.co/Helsinki-NLP/opus-mt-zh-en)
- [NLLB model card](https://huggingface.co/facebook/nllb-200-distilled-600M)

## Recommended Streaming And UI Design

### Message Processing

Present a compact operational row inside the message flow:

Input translation -> English ready/sent -> Claude live output -> Chinese translation -> Completed.

Every stage uses actual run IDs, state transitions and timestamps. First-token time, translation duration, selected source and errors are inspectable. Keep this operational progress separate from native Think.

The actual forwarded English input must be inspectable. A live input-translation preview must be labeled not sent until completeness and literal validation succeed. Partial instructions must never be sent to Claude.

### Display Modes

- English: native English deltas appear immediately. Do not wait for Chinese. Chinese translation can be on-demand rather than paying for an unseen background result.
- Chinese: show the real progress stages and make the live English preview available while Chinese is pending. When Chinese is ready, it becomes primary; the original remains inspectable.
- Bilingual: English streams immediately; Chinese progresses independently beside or below it, preserving the selected layout. Translation errors must never hide a successful original answer.

### Backend Boundaries

Keep provider selection independent of the main Claude model. Use explicit translator adapters for generic JSON-segmented LLMs, dedicated MT APIs, and a future self-hosted endpoint.

A dedicated Qwen-MT model cannot safely be enabled merely by changing the model string in the existing generic adapter: its request requires exactly one user message and translation_options, rather than the current system-plus-JSON translation protocol. Retain literal protection, message identity, semantic regression cases, bounded retries and error handling across adapters.

Use the host's authenticated event mechanism for phase/display changes, with cancellation-aware long polling only as a compatible fallback. Avoid per-token disk writes and large history re-downloads. Persist canonical English and translated display data separately. Do not rerun Claude merely because output translation failed.

For incremental Chinese, prefer the dedicated model's actual incremental output. If the generic JSON adapter is kept, use a tested incremental JSON parser and publish only validated contiguous display segments, never a character-by-character playback of a completed answer.

### Suggested Next Steps

1. Fix English passthrough and add the visible processing row without changing the current default.
2. Add an explicit MT adapter and test MT-Flash against the existing JSON path using a small fixed suite.
3. Integrate genuine progressive Chinese display and provider capability/error states.
4. Benchmark the official HY-MT 1.8B model on an approved AutoDL GPU resource; compare supported precision choices instead of assuming the smallest quantization is fastest. Obtain license approval and disk/RAM/VRAM limits first.
5. Change the default only after the new adapter and UI pass regression tests. Keep DeepSeek Flash as a configurable alternative.

## AutoDL Resource Integration

The owner has an existing Vault-managed AutoDL resource and Hub-managed GPU capability plugins. Current catalog lookups identify ComfyUI and Blender services. These are not proof that a text-translation inference endpoint already exists. A live GPU-status read is not a capacity lease.

Recommended separation:

```text
DSH translation plugin -> authenticated streaming inference API -> small MT model on AutoDL
DSH selected agents -> installed MCP + Skill -> authorized generation/resource-management tools
Vault -> server-side scoped credentials; never master Vault or SSH credentials in model context
```

MCP is suitable for resource discovery, health, availability and controlled model-service lifecycle. For the translation data path, use a direct streaming adapter rather than asking Claude to choose an MCP tool to translate its own incoming request.

The existing GPU is shared with other workloads. Model residency needs an explicit VRAM budget and coordinated lease. A zero-percent utilization sample does not mean that resident models or queued image/video/render tasks can be displaced. Do not kill, unload or restart their processes. If a lease is unavailable or first-token latency exceeds the budget, fall back to a configured MT API; do not wait indefinitely for a render queue.

Keep the translation source selector separate from the main Claude model. A possible future source is AutoDL Translation with states Ready, Busy, Starting and Unavailable, alongside Qwen and DeepSeek. Surface model/version, provider, cold/warm state and fallback reason in the processing UI. A generic endpoint must not silently claim compatibility with the dedicated MT request template.

No AutoDL SSH access, deployment, model download, GPU reservation or DSH capability grant was performed during this research. Installing a managed MCP later must be verified as both connected and granted to the intended agent; a configuration entry alone is not proof of usable tools.

## Reproducibility

The initial recorded run tried every qwen-turbo case and received four rate-limit errors. The reusable runner now stops further requests for a candidate after its first 429; that change does not rewrite the original evidence.

- Raw API results: translation-benchmark-2026-11-11.json
- Existing plugin baseline: current-pipeline-baseline-2026-11-11.json
- Runner: translation-benchmark.mjs
- No secrets are present in the result files.
