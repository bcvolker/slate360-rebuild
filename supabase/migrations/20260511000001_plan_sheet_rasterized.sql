-- Add rasterized image columns to site_walk_plan_sheets for Leaflet.js plan viewer.
-- When a PDF plan is uploaded, the server rasterizes each page to a WebP image
-- stored in R2. The mobile viewer uses these images instead of react-pdf.

ALTER TABLE site_walk_plan_sheets
  ADD COLUMN IF NOT EXISTS rasterized_key TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS rasterized_width INTEGER DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS rasterized_height INTEGER DEFAULT NULL;

COMMENT ON COLUMN site_walk_plan_sheets.rasterized_key IS 'R2 object key for the server-rendered WebP image of this sheet page';
COMMENT ON COLUMN site_walk_plan_sheets.rasterized_width IS 'Pixel width of the rasterized image';
COMMENT ON COLUMN site_walk_plan_sheets.rasterized_height IS 'Pixel height of the rasterized image';
