-- Enum types
CREATE TYPE public.app_role AS ENUM ('owner', 'editor', 'viewer');
CREATE TYPE public.task_type AS ENUM ('project', 'strategy', 'action');

-- Profiles table
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    full_name TEXT,
    email TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Projects table
CREATE TABLE public.projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- User roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'viewer',
    invited_email TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    UNIQUE (user_id, project_id)
);

-- Business plans table
CREATE TABLE public.business_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL UNIQUE,
    year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM now()),
    annual_goals JSONB DEFAULT '[]'::jsonb,
    q1_items JSONB DEFAULT '[]'::jsonb,
    q2_items JSONB DEFAULT '[]'::jsonb,
    q3_items JSONB DEFAULT '[]'::jsonb,
    q4_items JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Weekly tasks table
CREATE TABLE public.weekly_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_plan_id UUID REFERENCES public.business_plans(id) ON DELETE CASCADE NOT NULL,
    week_number INTEGER NOT NULL CHECK (week_number >= 1 AND week_number <= 52),
    title TEXT NOT NULL,
    description TEXT,
    task_type task_type NOT NULL DEFAULT 'action',
    priority TEXT CHECK (priority IN ('low', 'medium', 'high')) DEFAULT 'medium',
    estimated_hours NUMERIC(4,1) DEFAULT 1,
    day_of_week INTEGER CHECK (day_of_week >= 1 AND day_of_week <= 7),
    is_completed BOOLEAN DEFAULT false,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_tasks ENABLE ROW LEVEL SECURITY;

-- Security definer function to check project access
CREATE OR REPLACE FUNCTION public.has_project_access(_user_id UUID, _project_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.projects WHERE id = _project_id AND owner_id = _user_id
        UNION
        SELECT 1 FROM public.user_roles WHERE project_id = _project_id AND user_id = _user_id
    )
$$;

-- Security definer function to check if user can edit project
CREATE OR REPLACE FUNCTION public.can_edit_project(_user_id UUID, _project_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.projects WHERE id = _project_id AND owner_id = _user_id
        UNION
        SELECT 1 FROM public.user_roles WHERE project_id = _project_id AND user_id = _user_id AND role IN ('owner', 'editor')
    )
$$;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
    ON public.profiles FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Projects policies
CREATE POLICY "Users can view projects they have access to"
    ON public.projects FOR SELECT
    USING (public.has_project_access(auth.uid(), id));

CREATE POLICY "Users can create projects"
    ON public.projects FOR INSERT
    WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Project owners can update projects"
    ON public.projects FOR UPDATE
    USING (owner_id = auth.uid());

CREATE POLICY "Project owners can delete projects"
    ON public.projects FOR DELETE
    USING (owner_id = auth.uid());

-- User roles policies
CREATE POLICY "Users can view roles for their projects"
    ON public.user_roles FOR SELECT
    USING (public.has_project_access(auth.uid(), project_id));

CREATE POLICY "Project owners can manage roles"
    ON public.user_roles FOR ALL
    USING (EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND owner_id = auth.uid()));

-- Business plans policies
CREATE POLICY "Users can view business plans they have access to"
    ON public.business_plans FOR SELECT
    USING (public.has_project_access(auth.uid(), project_id));

CREATE POLICY "Users with edit access can insert business plans"
    ON public.business_plans FOR INSERT
    WITH CHECK (public.can_edit_project(auth.uid(), project_id));

CREATE POLICY "Users with edit access can update business plans"
    ON public.business_plans FOR UPDATE
    USING (public.can_edit_project(auth.uid(), project_id));

CREATE POLICY "Users with edit access can delete business plans"
    ON public.business_plans FOR DELETE
    USING (public.can_edit_project(auth.uid(), project_id));

-- Weekly tasks policies
CREATE POLICY "Users can view weekly tasks they have access to"
    ON public.weekly_tasks FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.business_plans bp
        WHERE bp.id = business_plan_id AND public.has_project_access(auth.uid(), bp.project_id)
    ));

CREATE POLICY "Users with edit access can insert weekly tasks"
    ON public.weekly_tasks FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.business_plans bp
        WHERE bp.id = business_plan_id AND public.can_edit_project(auth.uid(), bp.project_id)
    ));

CREATE POLICY "Users with edit access can update weekly tasks"
    ON public.weekly_tasks FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM public.business_plans bp
        WHERE bp.id = business_plan_id AND public.can_edit_project(auth.uid(), bp.project_id)
    ));

CREATE POLICY "Users with edit access can delete weekly tasks"
    ON public.weekly_tasks FOR DELETE
    USING (EXISTS (
        SELECT 1 FROM public.business_plans bp
        WHERE bp.id = business_plan_id AND public.can_edit_project(auth.uid(), bp.project_id)
    ));

-- Trigger to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (user_id, email, full_name)
    VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
    RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Updated_at triggers
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_projects_updated_at
    BEFORE UPDATE ON public.projects
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_business_plans_updated_at
    BEFORE UPDATE ON public.business_plans
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_weekly_tasks_updated_at
    BEFORE UPDATE ON public.weekly_tasks
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();