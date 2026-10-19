# PLI V1.3 genuine model evidence and offline replay
V1.3 is isolated in this directory. Existing V1.1/V1.2 file contents and hosting settings are preserved; no PR merge is authorized.

The final pass additionally constrains fact/evidence strings to mechanically split verbatim input sentences and exposes only compact budget/constraint memory to the model. Enums contain source spans, never proposed actions or expected answers. This is a source-grounding constraint, not a claim of unconstrained factual intelligence. Action, rationale, category and currency conversion are model generated. The second failed experiment is preserved under attempts/qwen3-initial/ with attempts/qwen3-initial-review.json.

The public UI replays committed cloud outputs and recomputes the same safety gates in the browser. It is not realtime chat or a freeform inference backend. It has no token, account field or external action executor.

## Genuine model runs
- First experiment: official Qwen2.5-1.5B-Instruct-GGUF Q4_K_M, Apache-2.0. Ten real generations in 102.857 seconds, total 108.408 seconds; all ten were rejected for ungrounded facts. Unit errors and unsafe suggestions make this experiment NO_GO. Immutable inputs, prompt, outputs, model/license digests and logs are under attempts/qwen25/. Review: attempts/qwen25-review.json.
- Second experiment: official Qwen3-4B-GGUF Q4_K_M, Apache-2.0, revision bc640142c66e1fdd12af0bd68f40445458f3869b. Weights SHA256 7485fe6f11af29433bc51cab58009521f205840f5b4ae3a32fa7f92e8534fdf5. Downloaded only to an ephemeral cloud runner and never committed.
- llama.cpp b11669 CPU binary with pinned release SHA256, source MIT: https://github.com/ggml-org/llama.cpp.
- Model license: https://huggingface.co/Qwen/Qwen3-4B-GGUF/blob/main/LICENSE. The downloaded license accompanies evidence.

Standard public-repository ubuntu-24.04 only: four threads, 4096 context, maximum ten sequential calls and 640 tokens per call, 900-second generation budget, 22-minute inference job limit. No GPU/larger/self-hosted runner, Actions artifact upload, persistent model cache, new service signup, paid agreement, API key or other-project secret.
GitHub billing source: https://docs.github.com/en/billing/concepts/product-billing/github-actions.

## Evaluation boundary
The first generic prompt/gate were frozen before its ten case texts. The final generic harness was frozen at bde227b398d229da9cd428bfb5131d7209c0134b before a third fresh case set at 9fd73ca9380569132c30b9cb9b8ab21f6b7430e1. Three bounded runs are the total experiment scope; there is no scheduled model runner or promise of ongoing backend work.

After the first failure, a second generic prompt clarified units and simulation permissions; it was frozen at 0a6df6216baf2157107b4ce30b9b2206e915219b before a fresh ten-event case set at d205728bb709ff04a59bca2e558e5b69d9e1c1c9. No expected answer or per-case text routing exists. Application holdout does not prove absence from training or independent human authorship. Semantic review is by the implementing assistant, not a blinded independent assessor.

JSON grammar constrains formatting, not reasoning. Exact source quotes, assumptions and unknowns remain separate. Quote and amount validation cannot establish every semantic claim. Raw responses, failures, timings, source commit and cryptographic digests are retained. evidence/review.json must report reasoning defects and cannot be replaced by passing engineering tests.

## Existing safety and memory
Only tentative SYNTHETIC future plans may be recorded. V1.2 provider.mjs validates untrusted proposal shape/provenance/budget and unchanged engine.mjs applies budget, constraints, conflicts and journal rules. A separate cloud job restores saved state and recomputes all gates. Browser replay recomputes again. The legacy engine MODE field remains LLM_NOT_CONNECTED because that unchanged V1.2 component has no model provider; V1.3 genuine inference status comes from separate provenance.
All real payment, order, cancellation and messaging operations are denied. Model text cannot grant permission. No actual action is ever executed. Input quotes remain SYNTHETIC_INPUT_QUOTE, not real-world verified facts.

V1.1 audit is read-only. Only event=schedule counts as cron; push and workflow_dispatch do not. Snapshot age over two hours (or unknown age) is explicitly STALE, computed using current browser time.
Real transactions: 0. Net cash receipts: US$0.

## Observed final result
Final run: https://github.com/yl124915300-dot/yl124915300-dot.github.io/actions/runs/39213166104. Ten real outputs, ten structure-valid; one $6 synthetic reservation, six clarification dispositions, three quote/cost rejections. Generation 414.372 seconds, total 426.712 seconds, peak model-process RSS 4,984,740 KiB. Independent initial replay passed 17 checks. Detailed semantic review: four narrow passes, five partial results, one failure; overall NO_GO for semantic reliability. In particular $8 was output as 600 cents and blocked. This is evidence of real inference and a functioning safety boundary, not a reliable autonomous life agent.
