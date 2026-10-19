# PLI V1.3 bounded real-model experiment
This directory is isolated from stable V1.1/V1.2. No PR is merged.
The application target is an offline provenance viewer, not realtime chat.

Model: Qwen/Qwen2.5-1.5B-Instruct-GGUF, official Q4_K_M, Apache-2.0.
Pinned revision 91cad51170dc346986eccefdc2dd33a9da36ead9; SHA256 verified before loading.
llama.cpp b11669 CPU binary has a pinned SHA256; MIT source: https://github.com/ggml-org/llama.cpp.
Model license: https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct-GGUF/blob/main/LICENSE.
Runner policy: https://docs.github.com/en/billing/concepts/product-billing/github-actions.
Only standard ubuntu-24.04 on the already-public repository. No larger/GPU/self-hosted runner.
One job, four threads, 4096 context, maximum 10 calls x 640 output tokens, 900-second generation budget, 22-minute job cap. No cache/artifact upload/model commit. Small synthetic JSON evidence only. No service signup, paid agreement, API key or other-project secret.

The generic prompt and gate are frozen before the ten case texts are committed. Cases have no expected response, few-shot answer or per-scenario text routing. Holdout means unseen by these application rules; it does not mean proven absent from model training or independently authored by a human.
JSON schema constrains format only. Exact quote and amount checks do not establish semantic correctness. Raw prompt/output, token timing, binary/weights digests and failure records must remain visible. Manual semantic review is required; schema/rule success never substitutes for intelligence quality.

Existing V1.2 provider validates untrusted proposals and evidence IDs; unchanged V1.2 engine enforces budget, category constraint and slot conflict. Only SYNTHETIC plans may enter the journal. All real payment/order/message/cancellation actions are denied. No executor exists. The old engine's LLM_NOT_CONNECTED field describes the unchanged V1.2 component; V1.3 inference provenance is separate.

Truth categories: exact quotes are SYNTHETIC_INPUT_QUOTE, assumptions are MODEL_ASSUMPTION, unknowns are UNKNOWN; no scenario is verified real-world fact. Candidate plans are tentative and every amount is synthetic. Transactions 0; net receipts US$0.

V1.1 true schedule-event audit is read-only. Never count push/workflow_dispatch as cron. A snapshot over two hours old must be labelled STALE in the V1.3 viewer.
