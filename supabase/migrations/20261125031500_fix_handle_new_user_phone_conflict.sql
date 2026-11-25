-- Harden handle_new_user() against profiles_phone_key unique violations
-- and expose a lightweight boolean RPC to pre-check signup phone availability.

CREATE OR REPLACE FUNCTION public.is_signup_phone_taken(p_phone text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN NULLIF(TRIM(COALESCE(p_phone, '')), '') IS NULL THEN false
    ELSE EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE phone = NULLIF(TRIM(p_phone), '')
    )
  END;
$$;

REVOKE ALL ON FUNCTION public.is_signup_phone_taken(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_signup_phone_taken(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_full_name text := COALESCE(
    NULLIF(TRIM(new.raw_user_meta_data->>'full_name'), ''),
    NULLIF(TRIM(new.raw_user_meta_data->>'name'), ''),
    split_part(new.email, '@', 1),
    'لاعب'
  );
  v_phone text := NULLIF(TRIM(COALESCE(new.raw_user_meta_data->>'phone', '')), '');
  v_avatar text := new.raw_user_meta_data->>'avatar_url';
BEGIN
  IF v_phone IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.profiles WHERE phone = v_phone AND id <> new.id
  ) THEN
    v_phone := NULL;
  END IF;

  BEGIN
    INSERT INTO public.profiles (id, full_name, email, avatar_url, phone, role)
    VALUES (
      new.id,
      v_full_name,
      new.email,
      v_avatar,
      v_phone,
      'player'::user_role
    )
    ON CONFLICT (id) DO UPDATE SET
      full_name = COALESCE(NULLIF(EXCLUDED.full_name, ''), profiles.full_name),
      avatar_url = COALESCE(EXCLUDED.avatar_url, profiles.avatar_url),
      email = COALESCE(EXCLUDED.email, profiles.email),
      phone = COALESCE(profiles.phone, EXCLUDED.phone),
      updated_at = now();
  EXCEPTION
    WHEN unique_violation THEN
      INSERT INTO public.profiles (id, full_name, email, avatar_url, phone, role)
      VALUES (
        new.id,
        v_full_name,
        new.email,
        v_avatar,
        NULL,
        'player'::user_role
      )
      ON CONFLICT (id) DO UPDATE SET
        full_name = COALESCE(NULLIF(EXCLUDED.full_name, ''), profiles.full_name),
        avatar_url = COALESCE(EXCLUDED.avatar_url, profiles.avatar_url),
        email = COALESCE(EXCLUDED.email, profiles.email),
        updated_at = now();
  END;

  RETURN new;
END;
$function$;
