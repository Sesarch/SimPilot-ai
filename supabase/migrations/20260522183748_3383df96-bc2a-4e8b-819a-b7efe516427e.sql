
CREATE OR REPLACE FUNCTION public.inbox_bump_unread(_thread_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.inbox_threads
  SET unread_count = unread_count + 1
  WHERE id = _thread_id;
$$;

REVOKE EXECUTE ON FUNCTION public.inbox_bump_unread(uuid) FROM PUBLIC, anon, authenticated;
