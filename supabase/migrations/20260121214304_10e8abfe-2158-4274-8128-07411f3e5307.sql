-- Create table for AI bots configuration
CREATE TABLE public.ai_bots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  instructions TEXT NOT NULL,
  model TEXT NOT NULL DEFAULT 'google/gemini-3-flash-preview',
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for plan steps (replacing hardcoded data)
CREATE TABLE public.plan_steps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  step_order INTEGER NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  assigned_bot_id UUID REFERENCES public.ai_bots(id) ON DELETE SET NULL,
  generated_content TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(project_id, step_order)
);

-- Enable RLS
ALTER TABLE public.ai_bots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_steps ENABLE ROW LEVEL SECURITY;

-- RLS policies for ai_bots
CREATE POLICY "Users can view bots for their projects" 
ON public.ai_bots FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM projects p WHERE p.id = project_id AND has_project_access(auth.uid(), p.id)
));

CREATE POLICY "Users can create bots for their projects" 
ON public.ai_bots FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM projects p WHERE p.id = project_id AND can_edit_project(auth.uid(), p.id)
));

CREATE POLICY "Users can update bots for their projects" 
ON public.ai_bots FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM projects p WHERE p.id = project_id AND can_edit_project(auth.uid(), p.id)
));

CREATE POLICY "Users can delete bots for their projects" 
ON public.ai_bots FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM projects p WHERE p.id = project_id AND can_edit_project(auth.uid(), p.id)
));

-- RLS policies for plan_steps
CREATE POLICY "Users can view plan steps for their projects" 
ON public.plan_steps FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM projects p WHERE p.id = project_id AND has_project_access(auth.uid(), p.id)
));

CREATE POLICY "Users can create plan steps for their projects" 
ON public.plan_steps FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM projects p WHERE p.id = project_id AND can_edit_project(auth.uid(), p.id)
));

CREATE POLICY "Users can update plan steps for their projects" 
ON public.plan_steps FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM projects p WHERE p.id = project_id AND can_edit_project(auth.uid(), p.id)
));

CREATE POLICY "Users can delete plan steps for their projects" 
ON public.plan_steps FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM projects p WHERE p.id = project_id AND can_edit_project(auth.uid(), p.id)
));

-- Trigger for updated_at
CREATE TRIGGER update_ai_bots_updated_at
BEFORE UPDATE ON public.ai_bots
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_plan_steps_updated_at
BEFORE UPDATE ON public.plan_steps
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();