-- Create table for bot context/memory (communication between steps)
CREATE TABLE public.bot_context (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  bot_id UUID REFERENCES public.ai_bots(id) ON DELETE CASCADE,
  step_id UUID REFERENCES public.plan_steps(id) ON DELETE CASCADE,
  context_key TEXT NOT NULL,
  context_value TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(project_id, step_id, context_key)
);

-- Enable RLS
ALTER TABLE public.bot_context ENABLE ROW LEVEL SECURITY;

-- RLS policies for bot_context
CREATE POLICY "Users can view bot context for their projects" 
ON public.bot_context FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM projects p WHERE p.id = project_id AND has_project_access(auth.uid(), p.id)
));

CREATE POLICY "Users can create bot context for their projects" 
ON public.bot_context FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM projects p WHERE p.id = project_id AND can_edit_project(auth.uid(), p.id)
));

CREATE POLICY "Users can update bot context for their projects" 
ON public.bot_context FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM projects p WHERE p.id = project_id AND can_edit_project(auth.uid(), p.id)
));

CREATE POLICY "Users can delete bot context for their projects" 
ON public.bot_context FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM projects p WHERE p.id = project_id AND can_edit_project(auth.uid(), p.id)
));

-- Trigger for updated_at
CREATE TRIGGER update_bot_context_updated_at
BEFORE UPDATE ON public.bot_context
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();