# GeoMart

A geoscience survey equipment storefront where a human and an AI agent collaborate on selecting the right Vertical Electrical Sounding (VES) / resistivity instrument for a field survey — built for [The WebMCP Challenge](https://webmcphackathon.devpost.com/) (OpenAI, on Devpost).

## Why WebMCP, not a REST API

The obvious shape for this is `search_products` / `compare_products` / `request_quote` — literally the hackathon's own example. GeoMart deliberately departs from that baseline in three ways:

1. **The core state is live and unsubmitted.** A human fills in a "site brief" (target depth, resistivity range, terrain, budget) directly in the page. That data is never sent to a server until a human explicitly submits a quote — a server-side REST API structurally cannot see it, because it doesn't exist anywhere but this page's JS memory.
2. **Fit-scoring reasons about physical measurement limits, not spec matching.** Whether an instrument can reach a target depth or whether its resistivity ceiling will saturate on a given site is real electrical-survey physics, not a filter on a spec sheet.
3. **Tool results write back into the live page, visibly** — a comparison tray, a quote draft, and per-product fit badges all update in the browser in real time, not as JSON returned to a chat window.

**The non-negotiable design rule**: every one of the five tools below is reachable *only* through `document.modelContext.registerTool`. No REST route on the Worker duplicates what a tool does — verified by auditing every registered route against all five tool names and plausible aliases (see `src/worker.ts`).

## The five tools

| Tool | What it does | Why it can't be a REST endpoint |
|---|---|---|
| `read_site_brief()` | Reads the live, possibly-incomplete site brief directly from page memory. | The data has never been sent to a server. |
| `assess_site_fit(product_id)` | Scores one instrument against the current brief (depth range, resistivity ceiling, terrain). | Runs in the browser against live brief state; also writes a visible fit badge onto the product's catalog card, not just JSON back to the agent. |
| `flag_depth_mismatch(product_id)` | Rejects a product with a stated reason if it can't physically reach the target depth. | Same as above — a live DOM write, not just a returned value. |
| `update_comparison_tray(product_ids[])` | Writes into the page's visible comparison tray in real time. | An agent using only a REST API has no way to make the human's own browser UI update. |
| `draft_quote_notes(product_id, reasoning)` | Drafts editable, unsubmitted quote justification text. | Writes into a live, visible textarea — submission itself is a separate, human-only action (see below). |

## Human-in-the-loop

A quote request is never created by a tool. `draft_quote_notes` only populates an editable draft; a plain button click in the page UI — outside the WebMCP tool surface entirely — is the sole path that calls `POST /api/quotes`. This is deliberate: the agent proposes, the human disposes. The spec's own `agent.requestUserInteraction()` is wired in as an opportunistic upgrade on top of that gate, but isn't relied on alone since Chrome's implementation status for it wasn't confirmed at build time (see `spike/requestUserInteraction-test.html`).

## Stack

- **Cloudflare Workers** — serves static assets, a plain REST catalog listing (`GET /api/products`), and the one human-gated write (`POST /api/quotes`).
- **Cloudflare D1** — 25 real VES/resistivity survey products (ABEM, AGI, IRIS Instruments, GF Instruments, Geometrics, Megger, Zonge) with real depth ranges, resistivity specs, and estimated market prices.
- **Plain TypeScript + esbuild** — no SPA framework; the storefront is a single bundled client script (`src/client/*.ts` → `public/app.js`) so `document.modelContext` registration timing stays simple.

Fit-scoring and mismatch-checking (`src/scoring.ts`) are pure functions with no server dependency, deliberately bundled into the *browser* build rather than exposed as a Worker route — a Worker endpoint would be curl-able by anyone, which would fail the project's own "could this be built without WebMCP?" test for those two tools.

## Development

```bash
npm install
npm run build   # bundles src/client/*.ts -> public/app.js
npm test        # vitest, scoring/mismatch unit tests
npm run dev     # wrangler dev, local D1 + Worker
```

`npm run dev` needs a `.dev.vars` file with `TURNSTILE_SECRET_KEY=<your secret>` (get one via `wrangler turnstile widget create`, or from the Cloudflare dashboard), or the quote-submission endpoint won't verify. `.dev.vars` is gitignored and never committed.

Testing the tools themselves requires a WebMCP-capable environment: Chrome with `chrome://flags/#enable-webmcp-testing` enabled, the ChatGPT desktop app's built-in browser, or Codex/Antigravity with browser access. No other environment currently discovers `document.modelContext` tools.

## Status

Catalog, storefront, all five tools, and the no-REST-fallback audit are built and verified: unit tests, DOM-level checks with a registration shim, and a live pass against a real agent (Codex, via the ChatGPT desktop app's built-in browser) that discovered and called all five tools unaided, including a self-corrected `not_found` recovery and a comparison-tray update that visibly wrote into the live page. `agent.requestUserInteraction()` was confirmed to silently no-op in that runtime, matching Chrome's own documentation that the API isn't implemented yet. The plain Submit-button gate is the mechanism actually carrying the human-in-the-loop requirement, not a hedge.

A second adversarial pass, using Google Antigravity with both source-code and live-site access, found and fixed three real gaps: an XSS in the quote-draft textarea and tray (agent-supplied strings were rendered via unescaped `innerHTML`), a click-forgery hole (script-simulated clicks on the Submit button could not be told apart from real ones, closed with an `isTrusted` check), and, most seriously, a completely unprotected `POST /api/quotes` endpoint: a bare script outside any browser could submit a quote directly with zero human involvement, since `isTrusted` only guards the button's own handler and nothing checked the request's origin. Closed with a same-origin check plus a product-existence check, both re-verified by replaying the exact attack that had succeeded and confirming it now returns 403. That same test also caught an unrelated bug: `schema_quotes.sql` had been written but never applied, so the `quotes` table never existed in either environment until this pass. The actual commit action had been silently broken the whole time, hidden because every prior WebMCP test only exercised the client-side `draft_quote_notes` step.

A retest exposed a real limitation in that fix, not just a theoretical one: `Origin` is a public value, so a script that reads this open-source repo can set it to the correct value itself. Node's `fetch()` has no browser-level restriction against forging that header, so the check only blocks a *missing* or *wrong* Origin, not an informed one. A session-cookie alternative was considered and rejected for the same reason: a script with full HTTP access can fetch the page first to receive the cookie, then replay it on the POST, which requires no special browser capability either.

On a public, unauthenticated API whose source code is required to be open, no purely request-shape check (Origin, a replayable cookie, anything derivable by reading the repo) can prove a submission came from a real human. Closing that gap needed something a script has no way to derive from the public source: Cloudflare Turnstile, verified server-side against Cloudflare's `siteverify` endpoint using a secret that lives only in a `wrangler secret`, never in this repo or the client bundle. `POST /api/quotes` now requires a valid Turnstile token in addition to the Origin and product-existence checks; re-verified in production by replaying the exact bypass that had succeeded (correct Origin, no token, and separately a fake token) and confirming both now return 403.

This limitation was specific to the `POST /api/quotes` commit step throughout and never affected the load-bearing claim for the five WebMCP tools, which stayed REST-inaccessible under the same adversarial pass, full source access included. Still open: the demo video and Devpost writeup.

## License

MIT — see [LICENSE](LICENSE).
