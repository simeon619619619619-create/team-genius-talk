-- Create promo_codes table to track available promo codes
CREATE TABLE public.promo_codes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code text NOT NULL UNIQUE,
    description text,
    is_active boolean NOT NULL DEFAULT true,
    max_uses integer, -- NULL means unlimited
    current_uses integer NOT NULL DEFAULT 0,
    grants_lifetime_access boolean NOT NULL DEFAULT false,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    expires_at timestamp with time zone
);

-- Create used_promo_codes table to track who used which promo codes
CREATE TABLE public.used_promo_codes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    promo_code_id uuid REFERENCES public.promo_codes(id) ON DELETE CASCADE NOT NULL,
    user_id uuid NOT NULL,
    used_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.used_promo_codes ENABLE ROW LEVEL SECURITY;

-- RLS policies for promo_codes (only admins can manage, users can view active codes)
CREATE POLICY "Admins can manage promo codes"
ON public.promo_codes
FOR ALL
USING (is_admin(auth.uid()));

CREATE POLICY "Users can view active promo codes"
ON public.promo_codes
FOR SELECT
USING (is_active = true);

-- RLS policies for used_promo_codes
CREATE POLICY "Users can view their own used promo codes"
ON public.used_promo_codes
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own used promo codes"
ON public.used_promo_codes
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all used promo codes"
ON public.used_promo_codes
FOR SELECT
USING (is_admin(auth.uid()));

-- Insert the default promo code
INSERT INTO public.promo_codes (code, description, grants_lifetime_access, max_uses)
VALUES ('simora69$', 'Вечен безплатен достъп - промо код', true, NULL);