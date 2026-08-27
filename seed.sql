-- GeoMart product catalog: real VES/resistivity survey equipment.
-- Depth ranges are derived from each unit's documented electrode/channel
-- capacity using the standard ERT heuristic (max investigation depth ~=
-- spread length / 5, spread length = (electrodes-1) x typical spacing),
-- anchored to vendor-confirmed figures where published (e.g. ABEM LS2 and
-- AGI SuperSting R8 both confirmed at up to 600m for their largest
-- electrode configurations). Prices are estimated market list prices;
-- this equipment class is largely quote-only, so figures are marked
-- "(est.)" in spec_notes where no published price was found.

INSERT INTO products (id, name, manufacturer, depth_range_min_m, depth_range_max_m, resistivity_ceiling_ohm_m, terrain_tags, price_usd, spec_notes) VALUES
('abem-ls2-4-81', 'Terrameter LS2 (Advanced 4/81)', 'ABEM / Guideline Geo', 5, 600, 50000, '["rocky","remote","mining","groundwater"]', 58000, '12-channel receiver, up to 81 built-in electrode positions (16,000+ with external selectors), 250W/600V transmitter, IP66 case. Vendor-confirmed depth capability to 600m; price confirmed ~$55-60k for this configuration.'),
('abem-sas4000', 'Terrameter SAS 4000', 'ABEM / Guideline Geo', 5, 400, 20000, '["remote","mining","rocky"]', 42000, 'Legacy top-tier ABEM unit, predecessor to LS2, still widely deployed for deep mineral/groundwater surveys. Price est.'),
('abem-sas1000', 'Terrameter SAS 1000', 'ABEM / Guideline Geo', 2, 80, 10000, '["urban","engineering"]', 22000, 'Compact single-channel legacy unit for shallow-to-medium engineering and geotechnical surveys. Price est.'),
('agi-supersting-r1', 'SuperSting R1/IP', 'Advanced Geosciences Inc (AGI)', 2, 40, 10000, '["urban","engineering","archaeological"]', 16000, 'Entry-level single-channel SuperSting, minimum electrode config (28). Suited to small budget-constrained shallow jobs. Price est.'),
('agi-supersting-r2', 'SuperSting R2', 'Advanced Geosciences Inc (AGI)', 3, 90, 15000, '["engineering","groundwater"]', 24000, 'Two-channel SuperSting, up to 56 electrodes. Price est.'),
('agi-supersting-r4', 'SuperSting R4', 'Advanced Geosciences Inc (AGI)', 5, 150, 20000, '["groundwater","mining","remote"]', 34000, 'Four-channel SuperSting, up to 84 electrodes. Price est.'),
('agi-supersting-r6', 'SuperSting R6', 'Advanced Geosciences Inc (AGI)', 6, 250, 25000, '["mining","remote","rocky"]', 45000, 'Six-channel SuperSting, up to 98 electrodes. Price est.'),
('agi-supersting-r8', 'SuperSting R8', 'Advanced Geosciences Inc (AGI)', 8, 600, 30000, '["mining","remote","rocky","groundwater"]', 62000, 'Vendor-confirmed 8-channel, up to 112 electrodes at 5m spacing, 180-2000mA output. Depth capability to 600m matches AGI''s largest documented configuration. Price est.'),
('agi-supersting-wifi', 'SuperSting Wi-Fi', 'Advanced Geosciences Inc (AGI)', 8, 600, 30000, '["mining","remote","rocky","groundwater"]', 64000, 'Wi-Fi-enabled R8-class platform for remote control and data transfer, integrated GPS. Price est.'),
('agi-ministing', 'MiniSting', 'Advanced Geosciences Inc (AGI)', 1, 20, 5000, '["urban","archaeological","engineering"]', 9500, 'Low-cost single-channel unit for grounding-grid testing, Wenner soil resistivity, and small archaeological jobs. Price est.'),
('iris-syscal-junior', 'Syscal Junior', 'IRIS Instruments', 1, 30, 8000, '["engineering","archaeological"]', 14000, 'Basic single-channel manual-electrode unit for small shallow surveys. Price est.'),
('iris-syscal-junior-sw48', 'Syscal Junior Switch 48', 'IRIS Instruments', 2, 70, 10000, '["engineering","groundwater","urban"]', 19000, 'Syscal Junior with built-in 48-electrode switching for semi-automated 2D profiling. Price est.'),
('iris-syscal-r1plus', 'Syscal R1 Plus', 'IRIS Instruments', 3, 100, 12000, '["groundwater","engineering"]', 21000, 'Vendor-documented as designed for medium-depth exploration; 200W/800Vpp transmitter, 2-channel receiver. Price est.'),
('iris-syscal-r1plus-sw48', 'Syscal R1 Plus Switch 48', 'IRIS Instruments', 4, 140, 15000, '["groundwater","remote"]', 27000, 'R1 Plus with in-built 48-electrode switching. Price est.'),
('iris-syscal-pro', 'Syscal Pro', 'IRIS Instruments', 8, 350, 30000, '["mining","remote","rocky","groundwater"]', 48000, 'Vendor-confirmed 10-channel receiver, 250W/2000Vpp transmitter -- most powerful unit in the Syscal range for manual electrode layouts. Price est.'),
('iris-syscal-pro-sw48', 'Syscal Pro Switch 48', 'IRIS Instruments', 8, 300, 28000, '["groundwater","mining","engineering"]', 52000, 'Vendor-confirmed 10-channel, 250W/2000Vpp with in-built switching for 48 electrodes at 5m/10m spacing for 1D/2D/3D surveys. Price est.'),
('iris-elrec-pro', 'ELREC Pro', 'IRIS Instruments', 10, 400, 35000, '["mining","remote"]', 55000, 'Dedicated 10-channel IP/resistivity receiver paired with an external transmitter; targeted at deep mineral exploration IP surveys. Price est.'),
('gf-ares-5a', 'ARES 5A', 'GF Instruments', 6, 200, 22000, '["groundwater","dam-monitoring","remote"]', 38000, 'Vendor-confirmed 850W output, 2000Vpp, 5A automatic resistivity/IP system, PC-free control unit. Price est.'),
('gf-ares-ii', 'ARES II (10-channel)', 'GF Instruments', 8, 350, 28000, '["mining","groundwater","remote","archaeological"]', 46000, 'Vendor-confirmed 10-channel automatic resistivity system for 2D/3D ERT/IP tomography, dam and cavity monitoring. Price est.'),
('geometrics-ohmmapper', 'OhmMapper', 'Geometrics', 0.5, 25, 100000, '["rocky","frozen","paved","urban","remote"]', 28000, 'Capacitively-coupled system, no ground stakes -- vendor-confirmed 1-100,000 ohm-m operating range. Trades shallow depth for the ability to survey resistive/rocky/frozen/paved terrain where galvanic electrode contact fails. Price est.'),
('megger-det2-3', 'DET2/3', 'Megger', 0.5, 15, 20000, '["urban","engineering"]', 2200, 'Automatic basic earth/ground resistance tester, entry point for shallow grounding-grid and soil resistivity work. Price est.'),
('megger-det4td2', 'DET4TD2', 'Megger', 1, 30, 5000, '["urban","engineering"]', 1800, 'Vendor-confirmed dry-cell four-terminal tester, 0.01-200,000 ohm resistance range, for shallow soil resistivity and grounding-grid surveys. Price est.'),
('megger-det4tr2', 'DET4TR2', 'Megger', 1, 30, 5000, '["urban","engineering","remote"]', 2600, 'Rechargeable four-terminal soil resistivity kit, same shallow-survey class as DET4TD2 with field-rechargeable power. Price est.'),
('megger-det4tc2', 'DET4TC2', 'Megger', 1, 30, 6000, '["urban","engineering"]', 3400, 'Vendor-confirmed selectable test-frequency four-terminal tester with stakeless clamp-on measurement option. Price est.'),
('zonge-gdp32ii', 'GDP-32II', 'Zonge International', 15, 500, 40000, '["mining","remote","rocky"]', 65000, 'Multi-function deep IP/resistivity receiver widely used in mineral exploration, paired with a high-power transmitter for large-spread surveys. Price est.');
