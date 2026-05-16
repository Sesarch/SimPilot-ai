CREATE OR REPLACE FUNCTION public.prune_seeded_provision_pings(_min_age_minutes integer)
RETURNS TABLE(deleted_event_ids text[], verified_event_exists boolean, cutoff_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cutoff timestamptz := now() - make_interval(mins => GREATEST(_min_age_minutes, 0));
  v_verified boolean;
  v_deleted text[] := ARRAY[]::text[];
BEGIN
  -- Serialize concurrent prune attempts across the cluster.
  PERFORM pg_advisory_xact_lock(hashtext('stripe_webhook_events.prune_seeded_provision_pings'));

  SELECT EXISTS (
    SELECT 1
    FROM public.stripe_webhook_events
    WHERE stripe_event_id NOT LIKE 'evt_provision_ping_%'
      AND stripe_event_id NOT LIKE 'evt_admin_test_%'
      AND event_type <> 'admin.test.ping'
    LIMIT 1
  ) INTO v_verified;

  IF NOT v_verified THEN
    RETURN QUERY SELECT v_deleted, FALSE, v_cutoff;
    RETURN;
  END IF;

  WITH del AS (
    DELETE FROM public.stripe_webhook_events
    WHERE stripe_event_id LIKE 'evt_provision_ping_%'
      AND created_at < v_cutoff
    RETURNING stripe_event_id
  )
  SELECT COALESCE(array_agg(stripe_event_id), ARRAY[]::text[])
    INTO v_deleted
    FROM del;

  RETURN QUERY SELECT v_deleted, TRUE, v_cutoff;
END;
$$;

REVOKE ALL ON FUNCTION public.prune_seeded_provision_pings(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.prune_seeded_provision_pings(integer) TO service_role;