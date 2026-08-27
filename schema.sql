DROP TABLE IF EXISTS products;

CREATE TABLE products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  manufacturer TEXT NOT NULL,
  depth_range_min_m REAL NOT NULL,
  depth_range_max_m REAL NOT NULL,
  resistivity_ceiling_ohm_m REAL NOT NULL,
  terrain_tags TEXT NOT NULL, -- JSON array, e.g. ["rocky","remote"]
  price_usd REAL NOT NULL,
  spec_notes TEXT NOT NULL
);

CREATE INDEX idx_products_depth ON products(depth_range_min_m, depth_range_max_m);
