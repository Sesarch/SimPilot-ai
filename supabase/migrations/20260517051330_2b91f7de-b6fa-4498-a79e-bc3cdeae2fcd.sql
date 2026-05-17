
REVOKE INSERT, UPDATE, DELETE ON public.profiles_public FROM anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.award_achievement(text, text, uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.award_achievement(text, text, uuid, integer) TO authenticated;
