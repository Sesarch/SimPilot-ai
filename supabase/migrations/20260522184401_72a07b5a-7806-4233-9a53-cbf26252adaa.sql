
REVOKE EXECUTE ON FUNCTION public.inbox_route_thread(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.inbox_route_thread_trigger() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.inbox_route_after_inbound_message() FROM PUBLIC, anon, authenticated;
