# RealWorld Agent Router — Operator Console

An **operations pre-flight**, not an end-to-end human hiring platform. It supplements the existing public [RealWorld Agent Router](https://realworld-agent-router.naijunyu.chatgpt.site/) site.

## What works

- Create a local task record with a city, objective, evidence requirement, provisional worker budget, platform-fee estimate and management markup.
- Produce a transparent illustrative customer quote, with headroom against the client's stated maximum budget.
- Inspect a public, read-only worker inventory snapshot from RentAHuman for selected cities; a direct public API request is also attempted where the browser allows cross-origin requests.
- Export machine-readable job requests and copy individual task JSON for an agent/operator handoff.
- Record a *manual buyer-approval assertion* distinct from a paid task or a platform booking.
- Give operators real third-party task creation links for the next authorized step.

## What is deliberately not connected

No buyer funding; no automatic bounty posting; no dispatch to a named person; no escrow; no live task tracking; no automatic proof evaluation; no payout release. No worker identity is validated by the directory. The UI must not claim any of those operations happened.

## Free inventory sync

The GitHub Actions workflow runs a read-only Python script approximately four times daily. It extracts a limited subset of publicly listed worker profiles, filtered by city, to worker-snapshot.json without credentials. This is a public directory snapshot, never a reservation, employment commitment, quote guarantee, or confirmation of physical location.

The workflow may be disabled or blocked by repository permissions, provider rate limits or GitHub's scheduled-job availability. Confirm a successful workflow run and non-empty data before stating that a city has live supply.

## Production dispatch prerequisites

1. Buyer agreement: scope, all-in maximum budget, site access authorization, data policy, refund/cancellation terms, identification of the client financially responsible.
2. Provider account: authenticated RentAHuman account/API key or MeatLayer agent account with approved payment method. Keep secrets only in a server-side secret manager; never publish them in this static site or repository.
3. Server backend: authenticated intake, immutable approval records, idempotency keys, REST/MCP adapters, webhook verification, evidence storage and expiry, task and payout ledger.
4. Human approval gate: before funded task creation, any spend or worker acceptance, any material scope change and any payment release.
5. Quality/reconciliation: accepted photos or other agreed proof, source timestamps, dispute handling, refunds and finance reconciliation.

Official docs:
- https://rentahuman.ai/docs
- https://rentahuman.ai/docs/bounties
- https://app.meatlayer.ai/integrate

Business: management fee and/or disclosed per-task orchestration charge, payable by an actual customer. Revenue is zero until received and reconciled, regardless of how many profiles or drafts exist.
