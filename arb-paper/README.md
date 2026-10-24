# Arbitrage Paper Scanner (public data only)

This is a narrow proof of the **automated** detection loop, not a brokerage or a money-moving robot.

- GitHub Actions samples **6 public order books** on Kraken/Coinbase every ~15 minutes (best-effort).
- Simulates **16** USD 100 / USD 1,000 paths per sample: two same-venue triangular paths per exchange and two directions for each of BTC/USD and ETH/USD across the exchanges.
- Uses actual order-book quantities (not displayed mid prices), **0.80% Kraken / 0.60% Coinbase entry-tier taker fees per executed leg**, and additional assumptions of **0.10% price buffer** and **USD 15 cross-venue settlement reserve**. Rates must be rechecked before any real use.
- Initial signals must exceed **USD 10 and 0.5%** hypothetical profit after these assumed reserves. Signals are re-checked against a *second* batch of books 2 seconds later.
- An API error or >25-second capture window is marked `INCOMPLETE` rather than silently claiming zero opportunities.
- JSON evidence is saved as a short-lived GitHub Actions artifact; human audit appears in the job summary.

**Non-goals and remaining obstacles:** No accounts, credentials, wallet, trade API, orders, transfers, private keys, or verified balances. Cross-venue pairs require pre-funded currency on both venues and eventual rebalance. Even a doubly observed positive snapshot is NOT a firm bid/offer or a guarantee of simultaneous fills. Reported buffer is a modeling assumption, not a real settlement quote. Scheduled Actions may be delayed and cannot participate in sub-second arbitrage. Every run is explicitly `PAPER_ONLY_NO_ORDERS`; real income remains **USD 0 until separately verified**.

**Run:** `python3 arb-paper/scanner.py --self-test` to validate local fill arithmetic; `python3 arb-paper/scanner.py --out /tmp/arb-paper.json` for one public API read-only sample.

Official baseline fee schedule references:
- [Kraken Pro](https://www.kraken.com/features/fee-schedule)
- [Coinbase Exchange](https://help.coinbase.com/en/exchange/trading-and-funding/exchange-fees)

Source: `arb-paper/scanner.py`; workflow: `.github/workflows/arb-paper.yml`.
