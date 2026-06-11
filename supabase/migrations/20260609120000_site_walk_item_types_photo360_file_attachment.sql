-- Expand site_walk_items.item_type for 360 photo and file-attachment stops.
ALTER TABLE public.site_walk_items
  DROP CONSTRAINT IF EXISTS site_walk_items_item_type_check;

ALTER TABLE public.site_walk_items
  ADD CONSTRAINT site_walk_items_item_type_check
  CHECK (item_type IN (
    'photo',
    'video',
    'text_note',
    'voice_note',
    'annotation',
    'photo_360',
    'file_attachment'
  ));
