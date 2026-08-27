import type { Product } from '../scoring';

interface ProductRow {
  id: string;
  name: string;
  manufacturer: string;
  depth_range_min_m: number;
  depth_range_max_m: number;
  resistivity_ceiling_ohm_m: number;
  terrain_tags: string;
  price_usd: number;
  spec_notes: string;
}

let cache: Product[] | null = null;

// Ordinary REST fetch -- this is catalog browsing, explicitly allowed to
// have a normal HTTP path since it carries no site-brief or agent state.
export async function loadCatalog(): Promise<Product[]> {
  if (cache) return cache;
  const res = await fetch('/api/products');
  const rows: ProductRow[] = await res.json();
  cache = rows.map((row) => ({
    ...row,
    terrain_tags: JSON.parse(row.terrain_tags),
  }));
  return cache;
}

export function getCachedProduct(productId: string): Product | null {
  return cache?.find((p) => p.id === productId) ?? null;
}
