-- Create storage bucket for content posts
INSERT INTO storage.buckets (id, name, public)
VALUES ('content-posts', 'content-posts', true);

-- Storage policies for content posts
CREATE POLICY "Users can view content posts"
ON storage.objects FOR SELECT
USING (bucket_id = 'content-posts');

CREATE POLICY "Authenticated users can upload content posts"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'content-posts' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update their own content posts"
ON storage.objects FOR UPDATE
USING (bucket_id = 'content-posts' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own content posts"
ON storage.objects FOR DELETE
USING (bucket_id = 'content-posts' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create table for content posts (social media previews)
CREATE TABLE public.content_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_plan_id UUID NOT NULL REFERENCES public.business_plans(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id),
  post_date DATE NOT NULL,
  title TEXT,
  description TEXT,
  media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video')),
  media_url TEXT NOT NULL,
  platform TEXT, -- instagram, facebook, tiktok, etc.
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'published')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.content_posts ENABLE ROW LEVEL SECURITY;

-- RLS policies for content_posts
CREATE POLICY "Users can view content posts they have access to"
ON public.content_posts FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM business_plans bp
    WHERE bp.id = content_posts.business_plan_id
    AND has_project_access(auth.uid(), bp.project_id)
  )
);

CREATE POLICY "Users with edit access can insert content posts"
ON public.content_posts FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM business_plans bp
    WHERE bp.id = content_posts.business_plan_id
    AND can_edit_project(auth.uid(), bp.project_id)
  )
);

CREATE POLICY "Users with edit access can update content posts"
ON public.content_posts FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM business_plans bp
    WHERE bp.id = content_posts.business_plan_id
    AND can_edit_project(auth.uid(), bp.project_id)
  )
);

CREATE POLICY "Users with edit access can delete content posts"
ON public.content_posts FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM business_plans bp
    WHERE bp.id = content_posts.business_plan_id
    AND can_edit_project(auth.uid(), bp.project_id)
  )
);

-- Add trigger for updated_at
CREATE TRIGGER update_content_posts_updated_at
BEFORE UPDATE ON public.content_posts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();