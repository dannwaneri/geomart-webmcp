import { siteBriefStore, comparisonTrayStore, quoteDraftStore, assessmentStore } from './state';
import { loadCatalog, getCachedProduct } from './catalog';
import { registerGeoMartTools, isWebMcpAvailable } from './mcpTools';
import type { Product } from '../scoring';

function el<T extends HTMLElement>(id: string): T {
  const found = document.getElementById(id);
  if (!found) throw new Error(`missing #${id}`);
  return found as T;
}

// Tool-call arguments (reasoning text, product IDs) are agent-supplied
// strings rendered via innerHTML -- escape before interpolating so a
// crafted argument can't inject markup into the page.
function escapeHtml(value: string): string {
  const div = document.createElement('div');
  div.textContent = value;
  return div.innerHTML;
}

function renderCatalog(products: Product[]) {
  const list = el<HTMLDivElement>('catalog-list');
  list.innerHTML = products
    .map(
      (p) => `
      <div class="product-card" data-id="${escapeHtml(p.id)}">
        <h3>${escapeHtml(p.name)}</h3>
        <p class="muted">${escapeHtml(p.manufacturer)}</p>
        <p>Depth: ${p.depth_range_min_m}-${p.depth_range_max_m}m</p>
        <p>Resistivity ceiling: ${p.resistivity_ceiling_ohm_m} ohm-m</p>
        <p>Terrain: ${p.terrain_tags.map(escapeHtml).join(', ')}</p>
        <p class="price">$${p.price_usd.toLocaleString()}</p>
        <div class="fit-badge-slot" data-badge-for="${escapeHtml(p.id)}"></div>
      </div>`
    )
    .join('');
}

// Written by assess_site_fit / flag_depth_mismatch's execute() handlers via
// assessmentStore -- this is what makes those two tools live-page writes
// instead of just JSON handed back to the calling agent.
function renderAssessments() {
  const assessments = assessmentStore.get();
  for (const [productId, assessment] of Object.entries(assessments)) {
    const slot = document.querySelector(`.fit-badge-slot[data-badge-for="${productId}"]`);
    if (!slot) continue;
    const parts: string[] = [];
    if (assessment.score != null) {
      parts.push(`<span class="fit-score">Fit: ${assessment.score}/100</span>`);
    }
    if (assessment.limiting_factor) {
      parts.push(`<span class="fit-limiting">${assessment.limiting_factor}</span>`);
    }
    if (assessment.mismatch) {
      parts.push(`<span class="fit-mismatch">${assessment.mismatch_reason}</span>`);
    }
    slot.innerHTML = parts.join('');
  }
}

function renderTray() {
  const tray = el<HTMLDivElement>('tray-list');
  const ids = comparisonTrayStore.get();
  if (ids.length === 0) {
    tray.innerHTML = '<p class="muted">No products in comparison tray yet.</p>';
    return;
  }
  tray.innerHTML = ids
    .map((id) => {
      const p = getCachedProduct(id);
      return `<div class="tray-item">${p ? escapeHtml(p.name) : escapeHtml(id)}</div>`;
    })
    .join('');
}

// Public value -- safe to ship in the client bundle. The private secret
// never leaves the Worker (stored via `wrangler secret`, verified against
// Cloudflare's siteverify endpoint in worker.ts).
const TURNSTILE_SITE_KEY = '0x4AAAAAAEiIhZDnL2AMtS2j';

interface TurnstileApi {
  render: (el: string, opts: { sitekey: string }) => string;
  getResponse: (widgetId: string) => string;
}

function getTurnstile(): TurnstileApi | undefined {
  return (window as unknown as { turnstile?: TurnstileApi }).turnstile;
}

let turnstileWidgetId: string | null = null;

// index.html defines window.onTurnstileReady in a plain synchronous script
// before this module (or the Turnstile script) even starts loading, so the
// flag is reliable regardless of which finishes first. Check it directly
// here rather than only reacting to the callback, in case Turnstile already
// finished loading before this module ran at all.
let turnstileReady = (window as unknown as { __turnstileReady?: boolean }).__turnstileReady === true;

(window as unknown as { __onTurnstileReadyCallback: () => void }).__onTurnstileReadyCallback = () => {
  turnstileReady = true;
  if (quoteDraftStore.get()) renderQuoteDraft();
};

function renderQuoteDraft() {
  const container = el<HTMLDivElement>('quote-draft');
  const draft = quoteDraftStore.get();
  if (!draft) {
    container.innerHTML = '<p class="muted">No quote drafted yet.</p>';
    turnstileWidgetId = null;
    return;
  }
  const product = getCachedProduct(draft.product_id);
  container.innerHTML = `
    <div class="quote-card">
      <h4>Draft quote: ${product ? escapeHtml(product.name) : escapeHtml(draft.product_id)}</h4>
      ${draft.mismatch_warning ? `<p class="warning">Warning: ${escapeHtml(draft.mismatch_warning)}</p>` : ''}
      <textarea id="quote-reasoning">${escapeHtml(draft.reasoning_text)}</textarea>
      ${draft.status !== 'submitted' ? '<div id="turnstile-widget"></div><p id="turnstile-status" class="warning" hidden>Please complete the verification challenge above before submitting.</p>' : ''}
      <button id="submit-quote-btn" ${draft.status === 'submitted' ? 'disabled' : ''}>
        ${draft.status === 'submitted' ? 'Submitted' : 'Submit quote request'}
      </button>
    </div>`;

  if (draft.status !== 'submitted') {
    const turnstile = turnstileReady ? getTurnstile() : undefined;
    turnstileWidgetId = turnstile ? turnstile.render('#turnstile-widget', { sitekey: TURNSTILE_SITE_KEY }) : null;

    el<HTMLButtonElement>('submit-quote-btn').addEventListener('click', async (event) => {
      // isTrusted is set by the browser only for genuine hardware-derived
      // input, never by script-dispatched events (element.click(),
      // dispatchEvent(...)) -- this is what actually stops a tool's
      // execute() handler, or any other same-origin JS, from forging the
      // human's approval by simulating a click rather than a real one.
      if (!event.isTrusted) return;
      const turnstileToken = turnstileWidgetId && turnstile ? turnstile.getResponse(turnstileWidgetId) : '';
      if (!turnstileToken) {
        el<HTMLParagraphElement>('turnstile-status').hidden = false;
        return;
      }
      const reasoning = el<HTMLTextAreaElement>('quote-reasoning').value;
      const res = await fetch('/api/quotes', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ product_id: draft.product_id, reasoning_text: reasoning, turnstile_token: turnstileToken }),
      });
      if (res.ok) {
        quoteDraftStore.set({ ...draft, reasoning_text: reasoning, status: 'submitted' });
      }
    });
  }
}

function wireForm() {
  const fields: Array<[string, keyof ReturnType<typeof siteBriefStore.get>]> = [
    ['target-depth', 'target_depth_m'],
    ['resistivity-min', 'resistivity_range_min'],
    ['resistivity-max', 'resistivity_range_max'],
    ['budget', 'budget_usd'],
  ];
  for (const [inputId, field] of fields) {
    el<HTMLInputElement>(inputId).addEventListener('input', (e) => {
      const raw = (e.target as HTMLInputElement).value;
      const value = raw === '' ? null : Number(raw);
      siteBriefStore.set({ ...siteBriefStore.get(), [field]: value });
    });
  }
  el<HTMLSelectElement>('terrain').addEventListener('change', (e) => {
    const value = (e.target as HTMLSelectElement).value || null;
    siteBriefStore.set({ ...siteBriefStore.get(), terrain: value });
  });
}

function showWebMcpBanner() {
  if (isWebMcpAvailable()) return;
  const banner = el<HTMLDivElement>('webmcp-banner');
  banner.hidden = false;
}

async function main() {
  const products = await loadCatalog();
  renderCatalog(products);
  renderTray();
  renderQuoteDraft();
  wireForm();
  showWebMcpBanner();

  comparisonTrayStore.subscribe(renderTray);
  quoteDraftStore.subscribe(renderQuoteDraft);
  assessmentStore.subscribe(renderAssessments);

  await registerGeoMartTools();
}

main();
