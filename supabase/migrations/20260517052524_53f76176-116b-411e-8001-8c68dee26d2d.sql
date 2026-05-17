ALTER TABLE public.profiles ALTER COLUMN profile_public SET DEFAULT false;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, trial_started_at, trial_ends_at, profile_public)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    now(),
    now() + INTERVAL '7 days',
    false
  );
  RETURN NEW;
END;
$function$;