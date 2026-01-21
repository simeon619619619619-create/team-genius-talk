-- Create tasks table
CREATE TABLE public.tasks (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in-progress', 'done')),
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    assignee_name TEXT,
    team_name TEXT,
    due_date DATE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create subtasks table
CREATE TABLE public.subtasks (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in-progress', 'done')),
    assignee_name TEXT,
    due_date DATE,
    handoff_to TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subtasks ENABLE ROW LEVEL SECURITY;

-- RLS policies for tasks
CREATE POLICY "Users can view their own tasks"
ON public.tasks FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own tasks"
ON public.tasks FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tasks"
ON public.tasks FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tasks"
ON public.tasks FOR DELETE
USING (auth.uid() = user_id);

-- RLS policies for subtasks (access via task ownership)
CREATE POLICY "Users can view subtasks of their tasks"
ON public.subtasks FOR SELECT
USING (EXISTS (
    SELECT 1 FROM public.tasks
    WHERE tasks.id = subtasks.task_id AND tasks.user_id = auth.uid()
));

CREATE POLICY "Users can create subtasks for their tasks"
ON public.subtasks FOR INSERT
WITH CHECK (EXISTS (
    SELECT 1 FROM public.tasks
    WHERE tasks.id = subtasks.task_id AND tasks.user_id = auth.uid()
));

CREATE POLICY "Users can update subtasks of their tasks"
ON public.subtasks FOR UPDATE
USING (EXISTS (
    SELECT 1 FROM public.tasks
    WHERE tasks.id = subtasks.task_id AND tasks.user_id = auth.uid()
));

CREATE POLICY "Users can delete subtasks of their tasks"
ON public.subtasks FOR DELETE
USING (EXISTS (
    SELECT 1 FROM public.tasks
    WHERE tasks.id = subtasks.task_id AND tasks.user_id = auth.uid()
));

-- Trigger for updated_at
CREATE TRIGGER update_tasks_updated_at
BEFORE UPDATE ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();