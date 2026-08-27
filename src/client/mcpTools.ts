import { scoreFit, checkDepthMismatch } from '../scoring';
import { siteBriefStore, comparisonTrayStore, quoteDraftStore, setTray, updateAssessment } from './state';
import { loadCatalog, getCachedProduct } from './catalog';

interface ToolAgent {
  requestUserInteraction?: (callback: () => Promise<unknown>) => Promise<unknown>;
}

function notFound(productId: string) {
  return { error: 'not_found', product_id: productId };
}

export function isWebMcpAvailable(): boolean {
  return typeof document !== 'undefined' && 'modelContext' in document;
}

export async function registerGeoMartTools(): Promise<void> {
  if (!isWebMcpAvailable()) return;
  await loadCatalog();

  const modelContext = (document as unknown as { modelContext: { registerTool: (def: unknown) => Promise<unknown> } }).modelContext;

  await modelContext.registerTool({
    name: 'read_site_brief',
    description: "Reads the live, possibly-incomplete site brief the human is currently filling in on this page. This data has never been sent to a server -- it only exists in this page's memory.",
    inputSchema: { type: 'object', properties: {} },
    async execute() {
      return siteBriefStore.get();
    },
  });

  await modelContext.registerTool({
    name: 'assess_site_fit',
    description: 'Scores one survey instrument against the current live site brief, reasoning about physical measurement limits (depth range, resistivity ceiling, terrain suitability) rather than simple spec matching.',
    inputSchema: {
      type: 'object',
      properties: { product_id: { type: 'string' } },
      required: ['product_id'],
    },
    async execute({ product_id }: { product_id: string }) {
      const product = getCachedProduct(product_id);
      if (!product) return notFound(product_id);
      const result = scoreFit(product, siteBriefStore.get());
      // Write the result onto the product's own catalog card, visibly, not
      // just back to the agent -- see the note on assessmentStore.
      updateAssessment(product_id, { score: result.score, limiting_factor: result.limiting_factor });
      return result;
    },
  });

  await modelContext.registerTool({
    name: 'flag_depth_mismatch',
    description: "Checks whether a product's depth range can physically reach the site brief's target depth. Returns a stated reason when it cannot.",
    inputSchema: {
      type: 'object',
      properties: { product_id: { type: 'string' } },
      required: ['product_id'],
    },
    async execute({ product_id }: { product_id: string }) {
      const product = getCachedProduct(product_id);
      if (!product) return notFound(product_id);
      const result = checkDepthMismatch(product, siteBriefStore.get());
      updateAssessment(product_id, { mismatch: result.mismatch, mismatch_reason: result.reason });
      return result;
    },
  });

  await modelContext.registerTool({
    name: 'update_comparison_tray',
    description: "Writes a list of product IDs into the page's visible comparison tray, replacing its current contents.",
    inputSchema: {
      type: 'object',
      properties: { product_ids: { type: 'array', items: { type: 'string' } } },
      required: ['product_ids'],
    },
    async execute({ product_ids }: { product_ids: string[] }) {
      setTray(product_ids);
      return { tray: comparisonTrayStore.get() };
    },
  });

  await modelContext.registerTool({
    name: 'draft_quote_notes',
    description: 'Drafts justification text for a quote request on one product. This only creates an editable, unsubmitted draft -- a human must review it and click Submit in the page UI before any quote request is created. This tool cannot submit the quote itself.',
    inputSchema: {
      type: 'object',
      properties: {
        product_id: { type: 'string' },
        reasoning: { type: 'string' },
      },
      required: ['product_id', 'reasoning'],
    },
    async execute({ product_id, reasoning }: { product_id: string; reasoning: string }, agent?: ToolAgent) {
      const product = getCachedProduct(product_id);
      if (!product) return notFound(product_id);

      const mismatch = checkDepthMismatch(product, siteBriefStore.get());
      const mismatch_warning = mismatch.mismatch ? mismatch.reason : null;

      quoteDraftStore.set({
        product_id,
        reasoning_text: reasoning,
        status: 'draft',
        mismatch_warning,
      });

      // Opportunistic upgrade: only used if the runtime actually implements
      // it (verified via the Task 1b spike before relying on it for real).
      // The plain Submit button in the page UI remains the sole path that
      // actually creates a quote request either way -- this call, even if
      // it resolves true, does not submit anything by itself.
      if (agent && typeof agent.requestUserInteraction === 'function') {
        try {
          await agent.requestUserInteraction(async () => true);
        } catch {
          // Spec surface not implemented in this runtime -- ignore and
          // fall through to the button-based gate, which is unaffected.
        }
      }

      return { draft: quoteDraftStore.get() };
    },
  });
}
