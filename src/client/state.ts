import type { SiteBrief } from '../scoring';

export interface QuoteDraft {
  product_id: string;
  reasoning_text: string;
  status: 'draft' | 'submitted';
  mismatch_warning: string | null;
}

type Listener = () => void;

function createStore<T>(initial: T) {
  let value = initial;
  const listeners = new Set<Listener>();
  return {
    get: () => value,
    set(next: T) {
      value = next;
      for (const l of listeners) l();
    },
    subscribe(l: Listener) {
      listeners.add(l);
      return () => listeners.delete(l);
    },
  };
}

// Lives only in this page's memory. Never persisted until the human
// explicitly submits a quote via the plain UI button.
export const siteBriefStore = createStore<SiteBrief>({
  target_depth_m: null,
  resistivity_range_min: null,
  resistivity_range_max: null,
  terrain: null,
  budget_usd: null,
});

export const comparisonTrayStore = createStore<string[]>([]);

export const quoteDraftStore = createStore<QuoteDraft | null>(null);

export function setTray(productIds: string[]): void {
  const unique = Array.from(new Set(productIds));
  comparisonTrayStore.set(unique);
}

export interface ProductAssessment {
  score?: number;
  limiting_factor?: string | null;
  mismatch?: boolean;
  mismatch_reason?: string | null;
}

// Written into by assess_site_fit and flag_depth_mismatch so their results
// land as a visible badge on the product's own catalog card, not just as
// JSON handed back to the calling agent -- an agent reasoning purely from
// read_site_brief plus the public catalog REST route could derive this
// arithmetic itself, so the tool's real value is surfacing it live on the
// page the human is looking at.
export const assessmentStore = createStore<Record<string, ProductAssessment>>({});

export function updateAssessment(productId: string, patch: ProductAssessment): void {
  const current = assessmentStore.get();
  assessmentStore.set({
    ...current,
    [productId]: { ...current[productId], ...patch },
  });
}
