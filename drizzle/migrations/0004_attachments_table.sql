-- Rename images table to attachments
ALTER TABLE images RENAME TO attachments;

-- Add type column (image, video)
ALTER TABLE attachments ADD COLUMN type TEXT NOT NULL DEFAULT 'image';

-- Add thumbnail_url column for video previews (nullable)
ALTER TABLE attachments ADD COLUMN thumbnail_url TEXT;

-- If there are any indexes or constraints on images, rename them accordingly (example shown, adjust as needed):
-- ALTER INDEX images_pkey RENAME TO attachments_pkey;
-- ALTER INDEX images_post_id_idx RENAME TO attachments_post_id_idx;
-- (Add more as needed based on your DB) 