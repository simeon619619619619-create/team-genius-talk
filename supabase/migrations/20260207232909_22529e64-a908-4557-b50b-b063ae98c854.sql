
-- Make chat-attachments bucket private
UPDATE storage.buckets SET public = false WHERE id = 'chat-attachments';

-- Drop the overly permissive public read policy
DROP POLICY IF EXISTS "Public read access for chat attachments" ON storage.objects;

-- Add policy so users can only view their own chat attachments
CREATE POLICY "Users can view own chat attachments"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'chat-attachments' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);
