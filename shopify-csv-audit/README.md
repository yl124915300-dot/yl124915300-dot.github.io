# Catalog Check — Shopify CSV audit MVP

**Status 2026-11-16:** independent pre-revenue prototype. **No paid order, order verification, payment link, store access, lead-capture backend or AI rewriting** is active.

## What works

- User-initiated Shopify product CSV file selection or local demo.
- In-browser parser handles quoted commas and embedded newlines.
- Local deterministic QA of missing handles and grouped title/description/images, numeric prices and compare-at relationships, duplicate SKUs across distinct handles.
- Variant rows with blank Title and HTML are treated as normal; image-only rows aren't treated as variants.
- Download CSV list of potential findings; original file never changed or uploaded.
- No telemetry, third-party JavaScript, automatic writes, admin access or hidden server requests.

## Limits

- A finding is only a hypothesis for merchant review, not proof of lost sales, violation, ChatGPT ranking defects, Shopify import errors or agent qualification.
- Blank SEO title/description can be normal Shopify auto-generation and are not flagged.
- Handles are grouped by exact value; duplicate SKUs between products can have legitimate uses.
- The row number is the CSV data record index (header = 1), not the physical text line if cells contain embedded newlines.
- The scan handles up to 2 MB/5,000 records. The issue table renders up to 350; download includes all.
- No passwords, customer data, order exports or PII should be uploaded.
- The proposed USD129 service is not open for orders: only a verified live PayPal Business payment link *plus* server-side transaction verification/webhooks and authenticated delivery could unlock that.

## Run checks

From repository root:
node --test shopify-csv-audit/audit.test.mjs

View a local test page with any ordinary static web server (ES modules cannot be loaded from file://). The GitHub Pages URL will only become live after this branch is merged to main and the Pages build completes.

## Decision gates

1. Validate the merchant's local scan produces useful issues on real permitted catalog samples.
2. Verify an owned buyer-contact channel and a legal, region-eligible payment method (do not publish an unverified redirect).
3. Add backend order creation, PayPal payment capture checks, signed webhooks, idempotency, refund handling, and authenticated delivery before taking paid orders.
4. Confirm actual organic merchant sessions and buyer-initiated requests. Zero until measured.

References: https://help.shopify.com/en/manual/products/import-export/using-csv , https://developer.paypal.com/payment-links-buttons/overview . No affiliation with Shopify, OpenAI or PayPal.
