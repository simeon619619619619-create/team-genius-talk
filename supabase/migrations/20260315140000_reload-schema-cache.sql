-- Reload PostgREST schema cache so it picks up resend_integrations
NOTIFY pgrst, 'reload schema';
