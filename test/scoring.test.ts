import { describe, it, expect } from 'vitest';
import { scoreFit, checkDepthMismatch, type Product, type SiteBrief } from '../src/scoring';
import { getProductById } from '../src/productRepo';

const megger: Product = {
  id: 'megger-det4td2',
  name: 'DET4TD2',
  manufacturer: 'Megger',
  depth_range_min_m: 1,
  depth_range_max_m: 30,
  resistivity_ceiling_ohm_m: 5000,
  terrain_tags: ['urban', 'engineering'],
  price_usd: 1800,
  spec_notes: 'shallow tester',
};

const superstingR8: Product = {
  id: 'agi-supersting-r8',
  name: 'SuperSting R8',
  manufacturer: 'Advanced Geosciences Inc (AGI)',
  depth_range_min_m: 8,
  depth_range_max_m: 600,
  resistivity_ceiling_ohm_m: 30000,
  terrain_tags: ['mining', 'remote', 'rocky', 'groundwater'],
  price_usd: 62000,
  spec_notes: 'deep 8-channel unit',
};

describe('checkDepthMismatch', () => {
  it('flags a mismatch when target depth exceeds the product max range', () => {
    const brief: SiteBrief = { target_depth_m: 150 };
    const result = checkDepthMismatch(megger, brief);
    expect(result.mismatch).toBe(true);
    expect(result.reason).toContain('150m');
    expect(result.reason).toContain('30m');
  });

  it('does not flag a mismatch when the product exactly meets the target depth (exact boundary)', () => {
    const brief: SiteBrief = { target_depth_m: 30 };
    const result = checkDepthMismatch(megger, brief);
    expect(result.mismatch).toBe(false);
    expect(result.reason).toBeNull();
  });

  it('does not flag a mismatch when the product exceeds the target depth', () => {
    const brief: SiteBrief = { target_depth_m: 500 };
    const result = checkDepthMismatch(superstingR8, brief);
    expect(result.mismatch).toBe(false);
  });

  it('returns no mismatch when target depth is not set on the brief (partial/empty brief)', () => {
    const brief: SiteBrief = {};
    const result = checkDepthMismatch(megger, brief);
    expect(result.mismatch).toBe(false);
    expect(result.reason).toBeNull();
  });
});

describe('scoreFit', () => {
  it('returns a zero score with no crash when the brief is completely empty', () => {
    const brief: SiteBrief = {};
    const result = scoreFit(megger, brief);
    expect(result.score).toBe(0);
    expect(result.limiting_factor).toBeNull();
  });

  it('scores a poor match low with depth named as the limiting factor', () => {
    const brief: SiteBrief = { target_depth_m: 150, terrain: 'urban' };
    const result = scoreFit(megger, brief);
    expect(result.score).toBeLessThan(60);
    expect(result.limiting_factor).toContain('depth');
  });

  it('scores a strong match highly with no limiting factor', () => {
    const brief: SiteBrief = {
      target_depth_m: 400,
      resistivity_range_max: 20000,
      terrain: 'mining',
      budget_usd: 70000,
    };
    const result = scoreFit(superstingR8, brief);
    expect(result.score).toBeGreaterThan(90);
    expect(result.limiting_factor).toBeNull();
  });

  it('degrades score based on partial brief fields only (only target depth set)', () => {
    const brief: SiteBrief = { target_depth_m: 20 };
    const result = scoreFit(megger, brief);
    expect(result.score).toBe(100);
    expect(result.rationale).toContain('depth');
  });

  it('flags budget as limiting factor when price exceeds budget', () => {
    const brief: SiteBrief = { target_depth_m: 400, budget_usd: 1000 };
    const result = scoreFit(superstingR8, brief);
    expect(result.limiting_factor).toContain('budget');
  });
});

describe('getProductById', () => {
  function mockDb(row: Record<string, unknown> | null): D1Database {
    return {
      prepare: () => ({
        bind: () => ({
          first: async () => row,
        }),
      }),
    } as unknown as D1Database;
  }

  it('returns null for an unknown product id', async () => {
    const db = mockDb(null);
    const result = await getProductById(db, 'does-not-exist');
    expect(result).toBeNull();
  });

  it('parses a found row into a Product with terrain_tags as an array', async () => {
    const db = mockDb({
      id: 'megger-det4td2',
      name: 'DET4TD2',
      manufacturer: 'Megger',
      depth_range_min_m: 1,
      depth_range_max_m: 30,
      resistivity_ceiling_ohm_m: 5000,
      terrain_tags: '["urban","engineering"]',
      price_usd: 1800,
      spec_notes: 'shallow tester',
    });
    const result = await getProductById(db, 'megger-det4td2');
    expect(result).not.toBeNull();
    expect(result!.terrain_tags).toEqual(['urban', 'engineering']);
  });
});
