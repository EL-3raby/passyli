-- =====================================================================
-- باصيلي (Passyli) — Phase 8: Multi-Tenant Auth, RBAC & Player Portal
-- =====================================================================

-- 1. Profiles adjustments for Google & Email OAuth
ALTER TABLE public.profiles ALTER COLUMN phone DROP NOT NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email text;

-- 2. Secure Super Admin check helper
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = (SELECT auth.uid()) AND role = 'super_admin'
  );
$$;

-- 3. Secure Auth Trigger (never trusts user_metadata role)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, avatar_url, phone, role)
  VALUES (
    new.id,
    COALESCE(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      split_part(new.email, '@', 1),
      'لاعب'
    ),
    new.email,
    new.raw_user_meta_data->>'avatar_url',
    NULLIF(TRIM(COALESCE(new.raw_user_meta_data->>'phone', '')), ''),
    'player'::user_role
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = COALESCE(NULLIF(EXCLUDED.full_name, ''), profiles.full_name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, profiles.avatar_url),
    email = COALESCE(EXCLUDED.email, profiles.email),
    updated_at = now();
  RETURN new;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. Profiles RLS policies (prevent role self-escalation)
ALTER POLICY "profiles_read_own" ON public.profiles
  USING ((SELECT auth.uid()) = id OR public.is_super_admin());

ALTER POLICY "profiles_update_own" ON public.profiles
  USING ((SELECT auth.uid()) = id)
  WITH CHECK (
    (SELECT auth.uid()) = id
    AND role = (SELECT p.role FROM public.profiles p WHERE p.id = (SELECT auth.uid()))
  );

-- 5. Attach authenticated user ID automatically in lock_court_slot & create_matchmaking_post
CREATE OR REPLACE FUNCTION public.lock_court_slot(
  p_court_id uuid,
  p_booking_date date,
  p_start_time time without time zone,
  p_end_time time without time zone,
  p_booker_name text,
  p_booker_phone character varying,
  p_total_price integer,
  p_deposit_required integer,
  p_cash_remaining integer,
  p_session_id text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking_ref VARCHAR(24);
  v_booking_id UUID;
  v_existing_id UUID;
BEGIN
  PERFORM public.release_expired_booking_locks();

  SELECT id INTO v_existing_id
  FROM public.bookings
  WHERE court_id = p_court_id
    AND booking_date = p_booking_date
    AND start_time = p_start_time
    AND status NOT IN ('cancelled', 'expired')
  FOR UPDATE;

  IF v_existing_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'الميعاد محجوز بالفعل أو قيد الدفع من لاعب آخر حالياً'
    );
  END IF;

  v_booking_ref := 'PAS-' || TO_CHAR(p_booking_date, 'YYYYMMDD') || '-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 4));

  INSERT INTO public.bookings (
    booking_reference,
    court_id,
    booker_id,
    booker_name,
    booker_phone,
    booking_date,
    start_time,
    end_time,
    total_price,
    deposit_required,
    deposit_paid,
    cash_remaining,
    status,
    locked_until,
    locked_by_session
  ) VALUES (
    v_booking_ref,
    p_court_id,
    (SELECT auth.uid()),
    p_booker_name,
    p_booker_phone,
    p_booking_date,
    p_start_time,
    p_end_time,
    p_total_price,
    p_deposit_required,
    0,
    p_cash_remaining,
    'pending_payment',
    NOW() + INTERVAL '8 minutes',
    p_session_id
  )
  RETURNING id INTO v_booking_id;

  RETURN jsonb_build_object(
    'success', TRUE,
    'booking_id', v_booking_id,
    'booking_reference', v_booking_ref,
    'locked_until', NOW() + INTERVAL '8 minutes'
  );
EXCEPTION WHEN unique_violation THEN
  RETURN jsonb_build_object(
    'success', FALSE,
    'error', 'الميعاد محجوز بالفعل أو قيد الدفع من لاعب آخر حالياً'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.create_matchmaking_post(
  p_court_id UUID,
  p_sport public.sport_type,
  p_match_date DATE,
  p_start_time TIME,
  p_players_needed INTEGER,
  p_cost_per_player INTEGER,
  p_creator_name TEXT,
  p_creator_phone VARCHAR(20),
  p_whatsapp_number VARCHAR(20) DEFAULT NULL,
  p_required_position TEXT DEFAULT 'أي مركز',
  p_skill_level TEXT DEFAULT 'متوسط',
  p_notes TEXT DEFAULT NULL,
  p_booking_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_post_id UUID;
BEGIN
  INSERT INTO public.matchmaking_posts (
    court_id,
    creator_id,
    sport,
    match_date,
    start_time,
    players_needed,
    current_players,
    cost_per_player,
    creator_name,
    creator_phone,
    whatsapp_number,
    required_position,
    skill_level,
    notes,
    booking_id,
    status
  ) VALUES (
    p_court_id,
    (SELECT auth.uid()),
    p_sport,
    p_match_date,
    p_start_time,
    p_players_needed,
    0,
    p_cost_per_player,
    p_creator_name,
    p_creator_phone,
    COALESCE(p_whatsapp_number, p_creator_phone),
    p_required_position,
    p_skill_level,
    p_notes,
    p_booking_id,
    'open'
  )
  RETURNING id INTO v_post_id;

  RETURN jsonb_build_object(
    'success', TRUE,
    'post_id', v_post_id
  );
END;
$$;

-- 6. Player Portal RPCs (strictly scoped to authenticated auth.uid() & profile phone)
CREATE OR REPLACE FUNCTION public.get_player_bookings(p_phone text DEFAULT NULL::text, p_user_id uuid DEFAULT NULL::uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := (SELECT auth.uid());
  v_user_phone text;
  v_result jsonb;
BEGIN
  IF v_uid IS NULL THEN
    RETURN '[]'::jsonb;
  END IF;

  SELECT phone INTO v_user_phone FROM public.profiles WHERE id = v_uid;

  SELECT COALESCE(
    jsonb_agg(to_jsonb(b_data) ORDER BY b_data.booking_date DESC, b_data.start_time DESC),
    '[]'::jsonb
  )
  INTO v_result
  FROM (
    SELECT
      b.id,
      b.booking_reference,
      b.booking_date,
      b.start_time,
      b.end_time,
      b.total_price,
      b.deposit_required,
      b.deposit_paid,
      b.cash_remaining,
      b.status,
      b.payment_type,
      b.booker_name,
      b.booker_phone,
      b.created_at,
      jsonb_build_object(
        'id', c.id,
        'name', c.name,
        'sport', c.sport,
        'slot_duration_minutes', c.slot_duration_minutes,
        'venue', jsonb_build_object(
          'id', v.id,
          'name', v.name,
          'city', v.city,
          'district', v.district,
          'address', v.address,
          'phone', v.phone,
          'whatsapp_number', v.whatsapp_number
        )
      ) as court
    FROM public.bookings b
    JOIN public.courts c ON c.id = b.court_id
    JOIN public.venues v ON v.id = c.venue_id
    WHERE
      b.booker_id = v_uid
      OR (v_user_phone IS NOT NULL AND v_user_phone <> '' AND b.booker_phone = v_user_phone)
  ) b_data;

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_player_matchmaking_posts()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := (SELECT auth.uid());
  v_user_phone text;
  v_result jsonb;
BEGIN
  IF v_uid IS NULL THEN
    RETURN '[]'::jsonb;
  END IF;

  SELECT phone INTO v_user_phone FROM public.profiles WHERE id = v_uid;

  SELECT COALESCE(
    jsonb_agg(to_jsonb(m_data) ORDER BY m_data.match_date DESC, m_data.start_time DESC),
    '[]'::jsonb
  )
  INTO v_result
  FROM (
    SELECT
      m.id,
      m.sport,
      m.match_date,
      m.start_time,
      m.players_needed,
      m.cost_per_player,
      m.required_position,
      m.skill_level,
      m.status,
      c.name AS court_name,
      v.name AS venue_name,
      v.district AS venue_district
    FROM public.matchmaking_posts m
    JOIN public.courts c ON c.id = m.court_id
    JOIN public.venues v ON v.id = c.venue_id
    WHERE
      m.creator_id = v_uid
      OR (v_user_phone IS NOT NULL AND v_user_phone <> '' AND m.creator_phone = v_user_phone)
  ) m_data;

  RETURN v_result;
END;
$$;
