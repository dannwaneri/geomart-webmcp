import type { Product } from './scoring';

function parseProductRow(row: Record<string, unknown>): Product {
  return {
    id: row.id as string,
    name: row.name as string,
    manufacturer: row.manufacturer as string,
    depth_range_min_m: row.depth_range_min_m as number,
    depth_range_max_m: row.depth_range_max_m as number,
    resistivity_ceiling_ohm_m: row.resistivity_ceiling_ohm_m as number,
    terrain_tags: JSON.parse(row.terrain_tags as string),
    price_usd: row.price_usd as number,
    spec_notes: row.spec_notes as string,
  };
}

// Worker-only (needs the D1 binding) -- never call this from client code.
export async function getProductById(db: D1Database, productId: string): Promise<Product | null> {
  const row = await db.prepare('SELECT * FROM products WHERE id = ?').bind(productId).first();
  if (!row) return null;
  return parseProductRow(row as Record<string, unknown>);
}
