# MATCH OS · Partner transaction gateway

**Scope:** a new private server component of the existing MATCH OS project, not a replacement site. Supports only the United States and exact, explicitly selected LivingSocial Partner API options. Users pay Groupon directly. This code is **NOT a deployed or connected live transaction service**, and does not prove a buyer, merchant order, paid commission or net proceeds.

## Current observable gate

GitHub Actions read-only preflight: `.github/workflows/match-os-partner-readiness.yml`.
Its contract job runs synthetic, no-network tests. Its separate live-readonly job **must fail** with `PARTNER_BLOCKED` when private GitHub secret `MATCH_OS_GROUPON_API_KEY` is absent. A green contract job is not a live Partner API credential or order.

## Account owner action (only in the provider's secure UI)

1. [Sign in to LivingSocial for Agents](https://agent.livingsocial.com/account/storefronts). First check for existing **IntentLocal** and **Intent Transaction Router** storefront registrations rather than creating duplicates. If needed, register the original project's intended storefront through the official flow. Do not paste credentials in ChatGPT or a repository.
2. Create a dedicated Partner API key inside the storefront. Put it only in GitHub Actions secret `MATCH_OS_GROUPON_API_KEY` for read-only preflight; for a live Worker, separately add it using the deployment platform's secret manager as `MATCH_OS_GROUPON_API_KEY`. A GitHub Actions secret does **not** make it available to a Worker. Never put it in GitHub Pages JavaScript.
3. Confirm the separate Groupon CJ program approval and storefront publisher PID **in the provider dashboard**. A working Partner API key is not proof of CJ approval. Only CJ's actual confirmed commission and payout constitute revenue evidence.
4. Re-run the read-only workflow. It calls `GET /partner_storefront/me` and a limited US product search (no cart or charges), without printing the key, PID, identities or order details.

## Deployment prerequisites — not performed by merely committing code

The server gateway is `gateway-worker.mjs`, designed for a Cloudflare Worker with private bindings:

- `MATCH_OS_GROUPON_API_KEY` — Partner API secret
- `MATCH_OS_TOKEN_KEY` — separate random secret with 40+ characters for signed anonymous decisions
- `MATCH_OS_TURNSTILE_SECRET` — Cloudflare Turnstile private key; client-side site key must be provisioned through the account
- `MATCH_OS_DB` — private Cloudflare D1 database with `schema.sql` applied
- `MATCH_OS_PARTNER_LIVE_ENABLED=true` — set **only after** the owner has completed authorization, secure platform setup, rate controls, live smoke checks and explicit launch

Without all bindings, write endpoints answer `PARTNER_NOT_CONNECTED`. Do not expose a public production URL or flip the flag before a valid anti-abuse/Turnstile and migration check. The current GitHub Pages site does not send requests to this undeployed gateway.

Secure operational flow after connection:
1. The consumer **actively** opens an existing MATCH OS chat, authorizes a partner catalog read, and verifies they are shopping for US offers.
2. `POST /v1/search` (Turnstile) calls authenticated US search, not the noncommission open Agent API.
3. The buyer **chooses** an exact `productId`, `optionId`, quantity and sees the full `retail` unit price and terms. `POST /v1/quote` rechecks product, availability and price, refuses required selections or booking-only items, and returns a 5-minute signed decision token.
4. A **separate buyer click** requests `POST /v1/cart` (another Turnstile). D1 primary-key uniqueness ensures the same decision causes only one create-cart call; timeouts stop as `UNCERTAIN_STOP`, never silently retry the POST. On a changed price, stop and ask buyer to reconfirm, never substitute a price or option.
5. Return the Partner API's fresh `buyLink` **unchanged** and open it in the shopper's browser. The buyer pays Groupon, not MATCH OS. No checkout is opened by the backend and no payment is automated.
6. `POST /v1/status` uses a private signed status token. It reads the cart and Groupon order; verifies exact product, option, quantity and this cart's clientReference. `CONFIRMED` / `REDEEMED` count only as independently verified merchant orders. `PENDING` / `ON_HOLD` / `UNKNOWN` are not orders. `REFUNDED` negates purchase. Commission remains **UNVERIFIED** until CJ independently reports it.

This component currently does not hold time slots or hotel stays: those cases are refused instead of falsely creating an ordinary cart. Full customer tracking, delayed refund reconciliation and partner payout reconciliation require account-connected server runtime and are not implemented by the repository alone.

## Validation

`node --test match-os-probe/partner-contract.test.mjs` verifies exact price, country, option, origin, duplicate decisions, backend fail-closed and order/refund outcome with synthetic mocked upstream responses. The test API key and identifiers are fake. No real merchant checkout or billing is executed in CI.

**Do not report** traffic, deals, purchase completion or income from these tests. The only progression to a live, high-frequency commerce system is permissioned traffic → active Partner credentials → one opt-in live cart → one genuinely paid buyer order → one verified CJ payout → repeatable unit economics.

References: [Partner API docs](https://agent.livingsocial.com/docs/for-builders/how-it-works), [Cart contract](https://agent.livingsocial.com/docs/for-builders/managing-the-cart), [Order list](https://agent.livingsocial.com/docs/for-builders/checkout-and-order-confirmation/the-order-list).
