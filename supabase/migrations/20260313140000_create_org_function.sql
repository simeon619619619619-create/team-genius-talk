-- SECURITY DEFINER function to create org + add owner as member, bypasses RLS recursion

CREATE OR REPLACE FUNCTION public.create_organization_for_user(org_name text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_org_id uuid;
  org_count integer;
BEGIN
  -- Check count limit
  SELECT COUNT(*) INTO org_count FROM organizations WHERE owner_id = auth.uid();
  IF org_count >= 3 THEN
    RAISE EXCEPTION 'Достигнат лимит от 3 организации';
  END IF;

  -- Insert organization
  INSERT INTO organizations (name, owner_id)
  VALUES (org_name, auth.uid())
  RETURNING id INTO new_org_id;

  -- Insert owner as member
  INSERT INTO organization_members (organization_id, user_id, role)
  VALUES (new_org_id, auth.uid(), 'owner')
  ON CONFLICT DO NOTHING;

  RETURN jsonb_build_object('id', new_org_id, 'name', org_name, 'owner_id', auth.uid());
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_organization_for_user(text) TO authenticated;
