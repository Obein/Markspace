-- 0011_session_geo_tracking.sql
-- Record initial geographic coordinates and location metadata for dynamic session security verification (>50km anomaly detection)

ALTER TABLE token_families ADD COLUMN latitude REAL;
ALTER TABLE token_families ADD COLUMN longitude REAL;
ALTER TABLE token_families ADD COLUMN city TEXT;
ALTER TABLE token_families ADD COLUMN country TEXT;
