export interface Product {
  id: string;
  name: string;
  manufacturer: string;
  depth_range_min_m: number;
  depth_range_max_m: number;
  resistivity_ceiling_ohm_m: number;
  terrain_tags: string[];
  price_usd: number;
  spec_notes: string;
}

export interface SiteBrief {
  target_depth_m?: number | null;
  resistivity_range_min?: number | null;
  resistivity_range_max?: number | null;
  terrain?: string | null;
  budget_usd?: number | null;
}

export interface FitResult {
  score: number; // 0-100
  rationale: string;
  limiting_factor: string | null;
}

export interface MismatchResult {
  mismatch: boolean;
  reason: string | null;
}

interface FactorScore {
  name: string;
  score: number; // 0-100
  detail: string;
}

function scoreDepth(product: Product, brief: SiteBrief): FactorScore | null {
  if (brief.target_depth_m == null) return null;
  if (product.depth_range_max_m >= brief.target_depth_m) {
    return { name: 'depth', score: 100, detail: `reaches target depth of ${brief.target_depth_m}m (max range ${product.depth_range_max_m}m)` };
  }
  const shortfall = brief.target_depth_m - product.depth_range_max_m;
  return {
    name: 'depth',
    score: 0,
    detail: `cannot reach target depth of ${brief.target_depth_m}m -- max range is ${product.depth_range_max_m}m, short by ${shortfall}m`,
  };
}

function scoreResistivityCeiling(product: Product, brief: SiteBrief): FactorScore | null {
  if (brief.resistivity_range_max == null) return null;
  if (product.resistivity_ceiling_ohm_m >= brief.resistivity_range_max) {
    return { name: 'resistivity_ceiling', score: 100, detail: `covers expected resistivity up to ${brief.resistivity_range_max} ohm-m (ceiling ${product.resistivity_ceiling_ohm_m} ohm-m)` };
  }
  return {
    name: 'resistivity_ceiling',
    score: 20,
    detail: `resistivity ceiling of ${product.resistivity_ceiling_ohm_m} ohm-m is below the site's expected ${brief.resistivity_range_max} ohm-m -- readings may saturate`,
  };
}

function scoreTerrain(product: Product, brief: SiteBrief): FactorScore | null {
  if (!brief.terrain) return null;
  const matches = product.terrain_tags.includes(brief.terrain);
  return {
    name: 'terrain',
    score: matches ? 100 : 40,
    detail: matches
      ? `rated for ${brief.terrain} terrain`
      : `not specifically rated for ${brief.terrain} terrain (rated for: ${product.terrain_tags.join(', ')})`,
  };
}

function scoreBudget(product: Product, brief: SiteBrief): FactorScore | null {
  if (brief.budget_usd == null) return null;
  if (product.price_usd <= brief.budget_usd) {
    return { name: 'budget', score: 100, detail: `within budget ($${product.price_usd} <= $${brief.budget_usd})` };
  }
  const overBy = product.price_usd - brief.budget_usd;
  return {
    name: 'budget',
    score: 0,
    detail: `exceeds budget by $${overBy} ($${product.price_usd} vs $${brief.budget_usd})`,
  };
}

const FACTOR_WEIGHTS: Record<string, number> = {
  depth: 0.4,
  resistivity_ceiling: 0.25,
  terrain: 0.15,
  budget: 0.2,
};

export function scoreFit(product: Product, brief: SiteBrief): FitResult {
  const factors = [
    scoreDepth(product, brief),
    scoreResistivityCeiling(product, brief),
    scoreTerrain(product, brief),
    scoreBudget(product, brief),
  ].filter((f): f is FactorScore => f !== null);

  if (factors.length === 0) {
    return {
      score: 0,
      rationale: 'Site brief has no fields set yet -- fill in at least a target depth to get a meaningful score.',
      limiting_factor: null,
    };
  }

  const totalWeight = factors.reduce((sum, f) => sum + FACTOR_WEIGHTS[f.name], 0);
  const weightedScore = factors.reduce((sum, f) => sum + f.score * FACTOR_WEIGHTS[f.name], 0) / totalWeight;

  const worst = factors.reduce((min, f) => (f.score < min.score ? f : min), factors[0]);
  const limiting_factor = worst.score < 100 ? `${worst.name}: ${worst.detail}` : null;

  const rationale = factors.map((f) => `${f.name} (${f.score}/100): ${f.detail}`).join('; ');

  return {
    score: Math.round(weightedScore),
    rationale,
    limiting_factor,
  };
}

export function checkDepthMismatch(product: Product, brief: SiteBrief): MismatchResult {
  if (brief.target_depth_m == null) {
    return { mismatch: false, reason: null };
  }
  if (product.depth_range_max_m >= brief.target_depth_m) {
    return { mismatch: false, reason: null };
  }
  const shortfall = brief.target_depth_m - product.depth_range_max_m;
  return {
    mismatch: true,
    reason: `Target depth ${brief.target_depth_m}m exceeds ${product.name}'s maximum depth range of ${product.depth_range_max_m}m (short by ${shortfall}m).`,
  };
}

