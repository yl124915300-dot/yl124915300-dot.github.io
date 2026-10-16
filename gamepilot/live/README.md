# GamePilot Capture Review — research add-on

This is an additive capture module in the existing GamePilot web repository. The historical V5 ZIP is not in connected GitHub, so this is **not a recovered, integrated or upgraded V5 release**. The existing calculator is unchanged.

## What runs

- A separate browser/PWA companion window. The player chooses a game window with the browser's screen-sharing prompt, or imports an image.
- Real Tesseract.js OCR from image pixels, using bundled English/Chinese data. No model API, credentials, uploads or game API.
- The **Recognize fields and compare frames** path reads HUD health, energy, turn, card-name boxes and enemy-side health candidates directly from pixels. It preserves OCR boxes, scores and missing fields, with agreement between color and contrast passes. It does not require a hand-entered state. OCR scores are not calibrated probabilities; the two passes are correlated.
- The automatic recognizer is incomplete: card costs/effective values, enemy intent and block, complete hand/enemy counts, icon statuses and relic effects remain unknown. It **abstains from action advice**. The separate legacy manual-review policy still requires a full reviewed transcript; it is not used as automatic-recognition evidence.
- A narrow candidate policy for confirmed cost-1 Strike/Defend cards using effective values from the current screen. It enumerates plays, prioritizes immediate incoming damage and then enemy HP, and shows only the first move.
- Unsupported cards/effects, incomplete state, lethal supported lines, stale or imported frames abstain. No automatic End Turn or full-run strategy.
- An exactly identical recaptured image can retain its human transcript; a changed image always clears it.
- Pixel-change sampling, source-ended events, new frame/import, edits and a 15-second expiry revoke old advice. Sampling can miss tiny changes; it is **not** a validated game-state detector.
- After a player marks a candidate for execution, a different fresh frame and fully reviewed state are required. Exact mismatch withdraws the candidate. A human-entered match is not independent verification.
- Exported private logs contain hashes, automatic matched OCR spans/unknown fields, observed comparisons, and any legacy reviewed state/candidate/outcome. They contain no image pixels. Original images and unstructured full OCR text stay in browser memory.

## Install the cloud-built archive

Download the archive from the PR's successful **GamePilot cloud checks** run, extract it, enter `GamePilot-Capture-Review`, then:

    python launch.py

Python 3.9+ is required. The launcher chooses an available loopback port and opens the browser. Use the browser's **Install app** action if available. PWA installation/permission prompts have not been accepted in a real game. This is a separate companion window, not a native overlay or Workshop mod.
The archive bundles OCR runtime, WASM and language data. Runtime needs no external network. Stop sharing to release capture permission; Ctrl+C closes the launcher. It reads no game saves or credentials.

For source builds (Node.js 22+, Python 3.9+):

    npm install --ignore-scripts --no-audit --no-fund
    npm run vendor
    python launch.py

Dependencies: Tesseract.js/core 7.0.0, English/Chinese data 1.0.0. See [Tesseract API](https://github.com/naptha/tesseract.js/blob/master/docs/api.md) and [local deployment](https://github.com/naptha/tesseract.js/blob/master/docs/local-installation.md). Upstream licenses are in vendor directories. Direct dependencies are pinned; the generated lockfile records transitive resolution.

## Cloud verification

    npm test
    python -m unittest discover -s tests -p '*_test.py'
    python launch.py --self-test
    npm run vendor
    npx playwright install --with-deps chromium
    npm run test:browser
    python build_bundle.py

CI checks a **synthetic display-stream** UI lifecycle (not game access), late-image import races, basic-policy safety, stale/racing frames, exact post-action comparisons, loopback security, actual browser OCR on a **synthetic** image, and OCR input/abstention on the public screenshot in [CombatSolver issue 239](https://github.com/Torch1230/CombatSolver/issues/239). The public image is downloaded only during testing. Source URL, retrieval time, hash and OCR result are recorded in `cloud-evidence.json`. This historical Chinese input-only check is separate from the new official-source development benchmark. No game or player action is simulated as real.
Separate Linux/Windows jobs extract the exact CI-built archive and run the launcher HTTP check. These are installation smoke checks, not real game installs or PWA UI acceptance.

## Unpassed release gates

| Gate | Status before a verified real session |
| --- | --- |
| Historical V5 source integrated | NOT_RUN — cloud source unavailable |
| Automatic complete screenshot recognition | FAIL — partial observations only |
| Read real game window on a supported browser | NOT_RUN |
| One real screenshot yields verified correct actionable advice | FAIL — automatic path abstains |
| Independent human review / held-out recognition validation | NOT_RUN |
| Player executes move and new frame reflects it | NOT_RUN |
| Finish a real fight/run with updates | NOT_RUN |
| Native overlay/mod loading/Workshop release | NOT_RUN / not implemented |

A public screenshot OCR pass is only an input-path result. Engineering tests and matching hand-entered states do not satisfy real-player gates.
For the first real session, record exact game/browser versions; preserve before/after images privately; review enemy count, companions, HP, intent, block, full hand and all mechanics; record the proposed card/target; let the player operate; capture a fresh frame and independently review the outcome. This limited policy may abstain throughout an ordinary run. A complete recognizer and wider tested rules remain necessary.

## Pixel benchmark

The bounded public-still benchmark is `tests/real-benchmark.mjs`, using four SHA-256-pinned sources in `benchmarks/manifest.json` (two combat scenes, character selection, shop). Reference labels are partial model visual annotations for development, not independent human review or a held-out benchmark. Numeric labels/card names are used by the Node evaluator only; the recognizer receives pixels and the frame hash. It records original source URLs, SHA-256, dimensions, retrieval time, OCR spans and automatic missing fields in `test-results/real-benchmark.json`. No source ID or reference label is passed to the recognizer. Public screenshot replay is distinct from sharing a live game window, taking a player action or completing a battle.

Source scope: official Mega Crit promotional screenshots from the [Steam store](https://store.steampowered.com/app/2868840/Slay_the_Spire_2/), with publisher attribution. This is a limited technical review, not a licensed training dataset; no general redistribution right is asserted. Originals are downloaded only by the cloud benchmark and are not included in the companion bundle. Exact gameplay build and recording history are unknown. [Publisher content policy](https://www.megacrit.com/content-policy/) is recorded as context, not a blanket screenshot-dataset license.

Automatic before/after comparison reports shared numeric deltas and unknown coverage. Different pixels or a matching energy delta cannot verify action identity, causality, correct enemy targeting, a complete state or a real game session. It never emits a real-action PASS.
