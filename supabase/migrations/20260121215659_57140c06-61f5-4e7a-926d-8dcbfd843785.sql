-- Create table for storing step conversations (Q&A)
CREATE TABLE public.step_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  step_id UUID REFERENCES public.plan_steps(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for storing collected answers (structured data)
CREATE TABLE public.step_answers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  step_id UUID REFERENCES public.plan_steps(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  question_key TEXT NOT NULL,
  question_text TEXT NOT NULL,
  answer TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(step_id, question_key)
);

-- Enable RLS
ALTER TABLE public.step_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.step_answers ENABLE ROW LEVEL SECURITY;

-- RLS policies for step_conversations
CREATE POLICY "Users can view step conversations for their projects" 
ON public.step_conversations FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM projects p WHERE p.id = project_id AND has_project_access(auth.uid(), p.id)
));

CREATE POLICY "Users can create step conversations for their projects" 
ON public.step_conversations FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM projects p WHERE p.id = project_id AND can_edit_project(auth.uid(), p.id)
));

CREATE POLICY "Users can delete step conversations for their projects" 
ON public.step_conversations FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM projects p WHERE p.id = project_id AND can_edit_project(auth.uid(), p.id)
));

-- RLS policies for step_answers
CREATE POLICY "Users can view step answers for their projects" 
ON public.step_answers FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM projects p WHERE p.id = project_id AND has_project_access(auth.uid(), p.id)
));

CREATE POLICY "Users can create step answers for their projects" 
ON public.step_answers FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM projects p WHERE p.id = project_id AND can_edit_project(auth.uid(), p.id)
));

CREATE POLICY "Users can update step answers for their projects" 
ON public.step_answers FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM projects p WHERE p.id = project_id AND can_edit_project(auth.uid(), p.id)
));

CREATE POLICY "Users can delete step answers for their projects" 
ON public.step_answers FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM projects p WHERE p.id = project_id AND can_edit_project(auth.uid(), p.id)
));

-- Trigger for updated_at
CREATE TRIGGER update_step_answers_updated_at
BEFORE UPDATE ON public.step_answers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();