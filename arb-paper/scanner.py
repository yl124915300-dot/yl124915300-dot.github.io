#!/usr/bin/env python3
"""Read-only, public spot order-book PAPER scanner. Does not place orders."""
import argparse
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from decimal import Decimal, getcontext
import json
from pathlib import Path
import time
from urllib.request import Request, urlopen

getcontext().prec = 28
D = Decimal
FEES = {"kraken": D("0.008"), "coinbase": D("0.006")}
SIZES = (D("100"), D("1000"))
BUFFER = D("0.001")  # assumed adverse price movement
REBALANCE = D("15")   # additional assumed USD reserve for cross-venue settlement
MIN_GAIN = D("10")
MIN_RATE = D("0.005")
URLS = {
    ("kraken", "ETHUSD"): "https://api.kraken.com/0/public/Depth?pair=ETHUSD&count=100",
    ("kraken", "BTCUSD"): "https://api.kraken.com/0/public/Depth?pair=XBTUSD&count=100",
    ("kraken", "ETHBTC"): "https://api.kraken.com/0/public/Depth?pair=ETHXBT&count=100",
    ("coinbase", "ETHUSD"): "https://api.exchange.coinbase.com/products/ETH-USD/book?level=2",
    ("coinbase", "BTCUSD"): "https://api.exchange.coinbase.com/products/BTC-USD/book?level=2",
    ("coinbase", "ETHBTC"): "https://api.exchange.coinbase.com/products/ETH-BTC/book?level=2",
    ("kraken", "SOLUSD"): "https://api.kraken.com/0/public/Depth?pair=SOLUSD&count=100",
    ("kraken", "SOLBTC"): "https://api.kraken.com/0/public/Depth?pair=SOLXBT&count=100",
    ("coinbase", "SOLUSD"): "https://api.exchange.coinbase.com/products/SOL-USD/book?level=2",
    ("coinbase", "SOLBTC"): "https://api.exchange.coinbase.com/products/SOL-BTC/book?level=2",
    ("kraken", "ADAUSD"): "https://api.kraken.com/0/public/Depth?pair=ADAUSD&count=100",
    ("kraken", "ADABTC"): "https://api.kraken.com/0/public/Depth?pair=ADAXBT&count=100",
    ("coinbase", "ADAUSD"): "https://api.exchange.coinbase.com/products/ADA-USD/book?level=2",
    ("coinbase", "ADABTC"): "https://api.exchange.coinbase.com/products/ADA-BTC/book?level=2",
}
TRI = {
    "USD-ETH-BTC-USD": (("ETHUSD", "buy"), ("ETHBTC", "sell"), ("BTCUSD", "sell")),
    "USD-BTC-ETH-USD": (("BTCUSD", "buy"), ("ETHBTC", "buy"), ("ETHUSD", "sell")),
    "USD-SOL-BTC-USD": (("SOLUSD", "buy"), ("SOLBTC", "sell"), ("BTCUSD", "sell")),
    "USD-BTC-SOL-USD": (("BTCUSD", "buy"), ("SOLBTC", "buy"), ("SOLUSD", "sell")),
    "USD-ADA-BTC-USD": (("ADAUSD", "buy"), ("ADABTC", "sell"), ("BTCUSD", "sell")),
    "USD-BTC-ADA-USD": (("BTCUSD", "buy"), ("ADABTC", "buy"), ("ADAUSD", "sell")),
}

def timestamp():
    return datetime.now(timezone.utc).isoformat(timespec="seconds")

def n(x):
    return format(x.quantize(D("0.00000001")), "f")

def fetch(item):
    (venue, pair), url = item
    start = time.time()
    req = Request(url, headers={"User-Agent": "PublicPaperArbitrage/1.0",
                                "Accept": "application/json"})
    with urlopen(req, timeout=12) as response:
        data = json.load(response)
    end = time.time()
    if venue == "kraken":
        if data.get("error"):
            raise ValueError(data["error"])
        matches = data.get("result", {})
        if len(matches) != 1:
            raise ValueError("Unexpected Kraken result")
        raw = next(iter(matches.values()))
    else:
        raw = data
    def parse(side):
        levels = [(D(str(r[0])), D(str(r[1]))) for r in raw[side]]
        if not levels or any(p <= 0 or q <= 0 for p, q in levels):
            raise ValueError("Invalid order-book levels")
        return levels
    book = {
        "bids": parse("bids"), "asks": parse("asks"), "url": url,
        "start": start, "end": end,
        "exchange_time": data.get("time") if venue == "coinbase" else None,
    }
    if book["bids"][0][0] >= book["asks"][0][0]:
        raise ValueError("Crossed or inconsistent book")
    return (venue, pair), book

def execute(book, action, input_amount, fee):
    """Buy spends quote and receives base. Sell spends base and receives quote."""
    if action not in ("buy", "sell") or input_amount <= 0 or not (0 <= fee < 1):
        raise ValueError("Invalid execution parameters")
    remaining, received = input_amount, D(0)
    for price, quantity in book["asks" if action == "buy" else "bids"]:
        spent = min(remaining, price * quantity if action == "buy" else quantity)
        received += spent / price if action == "buy" else spent * price
        remaining -= spent
        if remaining <= D("0.000000000001"):
            break
    return {"filled": remaining <= D("0.000000000001"),
            "output": received * (1 - fee)}

def settle(capital, ending, reserve, info):
    profit = ending - capital - reserve
    return {**info, "filled": True, "capital_usd": n(capital),
            "end_before_reserve_usd": n(ending), "reserve_usd": n(reserve),
            "paper_profit_usd": n(profit),
            "paper_return_pct": n(profit * 100 / capital),
            "signal": profit >= MIN_GAIN and profit / capital >= MIN_RATE}

def triangular(b, venue, route, capital):
    value = capital
    info = {"kind": "triangular", "venue": venue, "route": route}
    for pair, action in TRI[route]:
        step = execute(b[(venue, pair)], action, value, FEES[venue])
        if not step["filled"]:
            return {**info, "capital_usd": n(capital), "filled": False,
                    "reason": "Insufficient book depth on " + pair}
        value = step["output"]
    return settle(capital, value, capital * BUFFER, info)

def across(b, buying, selling, pair, capital):
    info = {"kind": "cross_venue", "buy_venue": buying,
            "sell_venue": selling, "pair": pair}
    buy = execute(b[(buying, pair)], "buy", capital, FEES[buying])
    if buy["filled"]:
        sale = execute(b[(selling, pair)], "sell", buy["output"], FEES[selling])
    else:
        sale = {"filled": False}
    if not sale["filled"]:
        return {**info, "capital_usd": n(capital), "filled": False,
                "reason": "Insufficient depth on buy or sell side"}
    return settle(capital, sale["output"], capital * BUFFER + REBALANCE,
                  {**info, "prefunded_inventory_required": True})

def snapshots():
    b, errors = {}, {}
    with ThreadPoolExecutor(max_workers=len(URLS)) as pool:
        futures = {pool.submit(fetch, entry): entry[0] for entry in URLS.items()}
        for f in as_completed(futures):
            key = futures[f]
            try:
                name, item = f.result()
                b[name] = item
            except Exception as err:
                errors["/".join(key)] = (type(err).__name__ + ": " + str(err))[:180]
    start = min((x["start"] for x in b.values()), default=0)
    end = max((x["end"] for x in b.values()), default=0)
    window = end - start
    if window > 25:
        errors["sampling_window"] = f"Excessive timing window: {window:.3f}s"
    return b, errors, round(window, 3)

def score(books):
    if set(books) != set(URLS):
        return []
    rows = []
    for capital in SIZES:
        for venue in FEES:
            for route in TRI:
                rows.append(triangular(books, venue, route, capital))
        for pair in ("ETHUSD", "BTCUSD", "SOLUSD", "ADAUSD"):
            for a, z in (("kraken", "coinbase"), ("coinbase", "kraken")):
                rows.append(across(books, a, z, pair, capital))
    return rows

def identity(row):
    return tuple(row.get(key, "") for key in
                 ("kind", "venue", "route", "buy_venue",
                  "sell_venue", "pair", "capital_usd"))

def scan():
    books, errors, window = snapshots()
    rows = score(books) if not errors else []
    positives = [row for row in rows if row.get("signal")]
    report = {
        "utc": timestamp(), "mode": "PAPER_ONLY_NO_ORDERS",
        "status": "INCOMPLETE" if errors else "COMPLETE",
        "sample_span_seconds": window,
        "taker_fee_fraction": {k: str(v) for k, v in FEES.items()},
        "assumed_slippage_buffer_pct": str(BUFFER * 100),
        "assumed_rebalancing_reserve_usd": str(REBALANCE),
        "quotes": {
            "/".join(key): {
                "bid": str(book["bids"][0][0]), "bid_qty": str(book["bids"][0][1]),
                "ask": str(book["asks"][0][0]), "ask_qty": str(book["asks"][0][1]),
                "source": book["url"], "exchange_time": book["exchange_time"],
                "fetched_utc": datetime.fromtimestamp(book["end"], timezone.utc).isoformat()
            } for key, book in books.items()
        },
        "errors": errors, "simulations": rows,
        "initial_positive": positives, "confirmed": [],
        "warnings": [
            "Samples are NOT atomic and prices may move between requests.",
            "Slippage and rebalancing reserves are assumptions, not settlement quotes.",
            "No balances, exchange permissions, withdrawal routes or inventory were verified.",
            "No real orders or funds; paper profitability is not realized income."
        ],
    }
    if positives:
        time.sleep(2)
        books2, errors2, window2 = snapshots()
        second = score(books2) if not errors2 else []
        matching = {identity(r): r for r in second if r.get("signal")}
        report["confirmation"] = {
            "utc": timestamp(), "errors": errors2, "sample_span_seconds": window2
        }
        report["confirmed"] = [
            {"first": row, "repeat": matching[identity(row)]}
            for row in positives if identity(row) in matching
        ]
    return report

def readable(result):
    lines = [
        "Read-only order-book arbitrage audit",
        "UTC " + result["utc"] + " | " + result["status"],
        "Paths: " + str(len(result["simulations"])) +
        " | Initial signals: " + str(len(result["initial_positive"])) +
        " | Confirmed signals: " + str(len(result["confirmed"])),
    ]
    if result["errors"]:
        lines.append("Errors: " + json.dumps(result["errors"]))
    else:
        rows = sorted([r for r in result["simulations"] if r.get("filled")],
                      key=lambda r: D(r["paper_profit_usd"]), reverse=True)
        for row in rows[:3]:
            lines.append("Hypothetical " + row["kind"] + " " +
                         row.get("venue", row.get("buy_venue", "")) + " " +
                         row.get("route", row.get("pair", "")) +
                         " : USD " + row["paper_profit_usd"] +
                         " net on USD " + row["capital_usd"])
    lines.append("Not a trading system: no order executed or funds moved.")
    return "\n".join(lines) + "\n"

def selftest():
    levels = {"asks": [(D(10), D(2)), (D(11), D(1))],
              "bids": [(D(9), D(2)), (D(8), D(1))]}
    buy = execute(levels, "buy", D(21), D("0.01"))
    expected = (D(2) + D(1)/D(11)) * D("0.99")
    assert buy["filled"] and abs(buy["output"] - expected) < D("0.00000001")
    assert execute(levels, "sell", D(3), D(0))["output"] == D(26)
    assert not execute(levels, "buy", D(100), D(0))["filled"]
    assert not execute(levels, "sell", D(4), D(0))["filled"]
    books = {}
    prices = {"ETHUSD": ("1999", "2001"),
              "BTCUSD": ("79999", "80001"),
              "ETHBTC": ("0.02499", "0.02501"),
              "SOLUSD": ("99.9", "100.1"),
              "SOLBTC": ("0.001249", "0.001251"),
              "ADAUSD": ("0.1999", "0.2001"),
              "ADABTC": ("0.00000249", "0.00000251")}
    for venue in FEES:
        for pair, (bid, ask) in prices.items():
            books[(venue, pair)] = {
                "bids": [(D(bid), D(100000))], "asks": [(D(ask), D(100000))]
            }
    assert len(score(books)) == 40
    assert not any(r.get("signal") for r in score(books))
    print("SELF_TEST_PASS")

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--self-test", action="store_true")
    parser.add_argument("--out", default="arb-paper/latest.json")
    parser.add_argument("--summary", default="")
    args = parser.parse_args()
    if args.self_test:
        selftest()
        return 0
    result = scan()
    dest = Path(args.out)
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    text = readable(result)
    print(text, end="")
    if args.summary:
        Path(args.summary).write_text(text, encoding="utf-8")
    return 0 if result["status"] == "COMPLETE" else 2

if __name__ == "__main__":
    raise SystemExit(main())
