-- Add INSERT policy for projects table
CREATE POLICY "Users can create their own projects"
ON public.projects
FOR INSERT
WITH CHECK (auth.uid() = owner_id);

-- Add UPDATE policy for projects table
CREATE POLICY "Users can update their own projects"
ON public.projects
FOR UPDATE
USING (auth.uid() = owner_id);

-- Add DELETE policy for projects table  
CREATE POLICY "Users can delete their own projects"
ON public.projects
FOR DELETE
USING (auth.uid() = owner_id);