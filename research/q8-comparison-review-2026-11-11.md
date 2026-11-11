# Q8 vs Qwen Translation Pilot - 2026-11-11

## Decision

Do not replace the default translator with HY-MT1.5-1.8B Q8 yet. Its GPU inference is fast, but this pilot found material meaning changes. Cross-machine latency also removes most of its local speed advantage. Cost was not a selection criterion. No production DSH configuration, main Claude model, credential, or chat UI was changed.

## Comparable Streaming API Results

Eight ordinary synthetic texts: four Chinese-to-English requests and four English-to-Chinese replies. All requests originated on DSH Linux 114. Qwen candidates were interleaved; Q8 was measured afterward through a private SSH tunnel to the AutoDL GPU. Each candidate had one excluded warm-up. Requests were sequential within each main suite. Common literal protection was used, with each provider's appropriate request format. Q8 used temperature 0. These are raw translation APIs, not complete Claude conversations.

| Candidate | Samples | Median first text | Median complete | Cases preserving all reviewed hard requirements |
| --- | ---: | ---: | ---: | ---: |
| HY-MT1.5-1.8B Q8_0 on AutoDL | 8 | 470 ms | 710 ms | 4/8 |
| Qwen-Flash, raw streaming API | 8 | 420.5 ms | 736 ms | 7/8 |
| Qwen-MT-Flash, dedicated translation API | 8 | 350 ms | 682 ms | 7/8 |

This is a small, phased pilot, not a statistically significant global ranking. The 28 ms completion-time difference between Q8 and MT-Flash is not evidence of a durable advantage. First text means actual nonempty model content, not response headers or a UI animation. All 24 raw responses finished normally, streamed incrementally, and passed literal restoration; that did not guarantee semantic correctness.

Manual review checked prohibitions, facts versus advice, time ordering, function/file containment, retries versus total attempts, unchanged identifiers, Markdown/JSON, and progressive streaming requirements. The implementing agent performed source-by-source review; there was no blinded second annotator, LLM judge, BLEU, or COMET evaluation. Case counts are not universal translation-accuracy percentages.

## Material Errors

### Q8

- `code-scope`: "先给方案" became "Provide the solution as is". The required plan-first order was lost.
- `retry-count`: "after 3 retries" became "经过3次尝试", while the next sentence still said four total attempts.
- `markdown-json`: "No booking or payment was made" became "无需进行任何预订或支付操作". A factual statement about what happened became advice about what is needed.
- `long-technical`: streaming the answer as it arrives became displaying it when ready; the controlled qualifier on the retry was omitted.
- Two otherwise passing cases had minor wording/script issues: "three items" became "three categories of tasks", and one traditional-Chinese character sequence appeared in a Chinese reply.

The retry error reproduced with the original unshielded source at temperature 0 and at the vendor-recommended temperature/top-p/top-k settings. The booking/payment error also reproduced without shielding at the recommended settings. These follow-ups were diagnostic, not extra ranked samples. No nonquantized baseline was tested: these errors cannot be attributed specifically to Q8 quantization rather than the underlying model, prompt, or serving configuration.

### Qwen

- Raw Qwen-Flash answered one Chinese request instead of translating it. This is not a claim that the same failure occurred in the current plugin's JSON-segment pipeline.
- Shielded Qwen-MT-Flash reversed function/file containment in one case. The original unshielded source translated correctly in a follow-up. This is evidence to investigate placeholder semantics, not a reason to remove secret/literal protection.
- Literal/schema validation alone cannot catch these meaning changes.

## Current Plugin Comparison

The unmodified production `TextTranslator` and API executor were also exercised on all eight texts with fresh per-case caches, against Qwen-Flash. This isolated API-mode test preserves the current JSON-segment contract, but does not include native route-dispatch overhead.

- Median complete translation: **1125.5 ms**; no first-text number because the current executor buffers the JSON response.
- Eight requests completed; zero repair attempts and zero cache hits.
- **7/8** cases preserved every reviewed hard requirement. One response reversed file/function containment despite passing JSON and literal checks.
- Separately, two real native DSH translation-test RPC calls completed in **1849 ms** and **1864 ms**, with no cache hits or Claude conversation calls. Both preserved their tested requirements.

These are different protocol layers. The raw Qwen-Flash row must not be presented as the current plugin's end-to-end latency or quality score. The current plugin is not semantically infallible either.

## AutoDL Measurements

- GPU: NVIDIA GeForce RTX 5090.
- Model: `tencent/HY-MT1.5-1.8B-GGUF`, revision `265b2e615a7dc9b06c435dc878829ad99a512ba2`, Q8_0.
- Weight: **1,908,528,288 bytes**; SHA-256 `6789b06d0902f2f5312c0e1703d56ccbddfcfb6c653d22519b7c720f7db9a98e` verified against the official repository metadata after downloading from a domestic mirror.
- Engine: llama.cpp commit `cd959ba`, built against the existing CUDA 13.0 toolkit; context 2048, one slot, GPU offload requested for all layers. GPU allocation was independently observed.
- Process start to healthy model: **1150 ms**, without dummy warm-up. This is not a cold-machine or cold-disk measurement.
- Local short-text first request: **106 ms first text / 197 ms complete**.
- Two subsequent local short-text probes: **24/13 ms first text**, **104/87 ms complete**. These probes did not use the common literal shielding and are not interchangeable with the eight-case suite.
- The server's internal prompt-plus-generation duration across the eight main Q8 cases had a **112.8 ms median**, versus **710 ms** observed from 114. Network/tunnel/HTTP delivery overhead matters substantially.
- Observed post-request GPU allocation: **2526 MiB**, not a continuously sampled peak. The test process was stopped afterward and its GPU allocation released.
- Existing ComfyUI process remained running with its previous GPU allocation. Its queue was not cleared, models were not unloaded, and the service was not restarted.
- The model and verified runtime were retained in `/root/autodl-tmp/dsh-translation-q8`, approximately **1.9 GiB** according to `du -sh`. Source/build intermediates and failed/unused archives were removed. No container or persistent translation service was created.

The Tencent model uses a custom community license, not the plugin's MIT license. Keep the model license with the weights and review its territorial and distribution conditions before offering a public hosted service. The benchmark endpoint was loopback-only, reached through SSH, and is no longer listening.

## Implications

1. Keep the current default unchanged. Q8 is an experimental source, not a qualified replacement on these results.
2. Preserve literal/secret protection while improving how code relationships survive anonymization; add semantic regression checks for factual status, negations, plan-first ordering, and retries versus attempts.
3. Treat independent English/Chinese streaming and honest stage progress as a plugin transport/presenter task. Upstream streaming capability alone does not fix today's buffered Chinese display.
4. A future Q8 experiment should improve the general prompt/adapter and rerun a held-out set, or compare a stronger model. Do not hardcode corrections for these examples or call a small pilot a production acceptance score.

## Evidence And Reproduction

- [Benchmark runner](./q8-comparison.mjs)
- [Qwen raw API records](./q8-qwen-api-2026-11-11.json)
- [Q8 cross-machine records](./q8-autodl-2026-11-11.json)
- [Current contract records](./q8-current-contract-2026-11-11.json)
- [Native DSH RPC records](./q8-current-pipeline-2026-11-11.json)
- [Diagnostic follow-ups](./q8-quality-followups-2026-11-11.json)
- [GPU, startup and local probes](./q8-resources-2026-11-11.json)
- [Reviewed invariants and aggregate values](./q8-summary-2026-11-11.json)

```sh
node research/q8-comparison.mjs --self-test
# Requires an existing DSH Qwen credential and a private loopback forward to a running test model.
node research/q8-comparison.mjs --q8-endpoint http://127.0.0.1:18088
```

Total: 45 small translation requests across main suites, warm-ups, local probes, current-contract checks and diagnostics; seven offline self-test groups. No request was sent to Claude. No real user history or secret was included in benchmark inputs or outputs.

Sources: [Tencent model](https://huggingface.co/tencent/HY-MT1.5-1.8B-GGUF), [model license](https://github.com/Tencent-Hunyuan/Hy-MT/blob/main/License.txt), [llama.cpp streaming interface](https://github.com/ggml-org/llama.cpp/blob/master/tools/server/README.md), [Qwen translation API](https://www.alibabacloud.com/help/en/model-studio/machine-translation).
