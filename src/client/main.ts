import { siteBriefStore, comparisonTrayStore, quoteDraftStore, assessmentStore } from './state';
import { loadCatalog, getCachedProduct } from './catalog';
import { registerGeoMartTools, isWebMcpAvailable } from './mcpTools';
import type { Product } from '../scoring';

function el<T extends HTMLElement>(id: string): T {
  const found = document.getElementById(id);
  if (!found) throw new Error(`missing #${id}`);
  return found as T;
}

function renderCatalog(products: Product[]) {
  const list = el<HTMLDivElement>('catalog-list');
  list.innerHTML = products
    .map(
      (p) => `
      <div class="product-card" data-id="${p.id}">
        <h3>${p.name}</h3>
        <p class="muted">${p.manufacturer}</p>
        <p>Depth: ${p.depth_range_min_m}-${p.depth_range_max_m}m</p>
        <p>Resistivity ceiling: ${p.resistivity_ceiling_ohm_m} ohm-m</p>
        <p>Terrain: ${p.terrain_tags.join(', ')}</p>
        <p class="price">$${p.price_usd.toLocaleString()}</p>
        <div class="fit-badge-slot" data-badge-for="${p.id}"></div>
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
      return `<div class="tray-item">${p ? p.name : id}</div>`;
    })
    .join('');
}

function renderQuoteDraft() {
  const container = el<HTMLDivElement>('quote-draft');
  const draft = quoteDraftStore.get();
  if (!draft) {
    container.innerHTML = '<p class="muted">No quote drafted yet.</p>';
    return;
  }
  const product = getCachedProduct(draft.product_id);
  container.innerHTML = `
    <div class="quote-card">
      <h4>Draft quote: ${product ? product.name : draft.product_id}</h4>
      ${draft.mismatch_warning ? `<p class="warning">Warning: ${draft.mismatch_warning}</p>` : ''}
      <textarea id="quote-reasoning">${draft.reasoning_text}</textarea>
      <button id="submit-quote-btn" ${draft.status === 'submitted' ? 'disabled' : ''}>
        ${draft.status === 'submitted' ? 'Submitted' : 'Submit quote request'}
      </button>
    </div>`;

  if (draft.status !== 'submitted') {
    el<HTMLButtonElement>('submit-quote-btn').addEventListener('click', async () => {
      const reasoning = el<HTMLTextAreaElement>('quote-reasoning').value;
      const res = await fetch('/api/quotes', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ product_id: draft.product_id, reasoning_text: reasoning }),
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
