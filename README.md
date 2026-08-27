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
npm test        # vitest — scoring/mismatch unit tests
npm run dev     # wrangler dev, local D1 + Worker
```

Testing the tools themselves requires a WebMCP-capable environment: Chrome with `chrome://flags/#enable-webmcp-testing` enabled, or ChatGPT's in-app browser — no other environment currently discovers `document.modelContext` tools.

## Status

Catalog, storefront, all five tools, and the no-REST-fallback audit are built and verified (unit tests, and DOM-level verification via a temporary registration shim simulating a real agent call). Still open: confirming `agent.requestUserInteraction()` actually fires a dialog in a real Chrome/ChatGPT environment, and the demo video / Devpost writeup.

## License

MIT — see [LICENSE](LICENSE).
