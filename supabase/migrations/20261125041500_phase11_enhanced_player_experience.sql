-- Phase 11: Enhanced Player Experience Schema & RPCs

-- 1. Update lock_court_slot to enforce server-authoritative pricing & payment_type ('deposit' | 'full')
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
AS $function$
DECLARE
  v_booking_ref VARCHAR(24);
  v_booking_id UUID;
  v_existing_id UUID;
  v_court_active boolean;
  v_venue_active boolean;
  v_venue_balance integer;
  v_venue_comm integer;
  v_price_morning integer;
  v_price_evening integer;
  v_peak_hour time;
  v_venue_deposit integer;
  v_authoritative_total integer;
  v_authoritative_deposit integer;
  v_authoritative_cash integer;
  v_payment_type text;
BEGIN
  IF EXISTS (SELECT 1 FROM public.fraud_blacklist WHERE phone = p_booker_phone) THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'تم إيقاف هذا الرقم مؤقتاً لمخالفة سياسة الحجز. يرجى التواصل مع الدعم الفني.'
    );
  END IF;

  SELECT
    c.is_active,
    v.is_active,
    v.prepaid_balance,
    COALESCE(v.commission_per_slot, 15),
    c.price_morning,
    c.price_evening,
    c.peak_hour_start,
    COALESCE(v.deposit_amount, 100)
  INTO
    v_court_active,
    v_venue_active,
    v_venue_balance,
    v_venue_comm,
    v_price_morning,
    v_price_evening,
    v_peak_hour,
    v_venue_deposit
  FROM public.courts c
  JOIN public.venues v ON v.id = c.venue_id
  WHERE c.id = p_court_id;

  IF NOT FOUND OR NOT COALESCE(v_court_active, false) OR NOT COALESCE(v_venue_active, false) THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'هذا الملعب غير متاح للحجز الأونلاين حالياً (تحت الصيانة أو متوقف مؤقتاً).'
    );
  END IF;

  IF COALESCE(v_venue_balance, 0) < v_venue_comm THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'الحجز الأونلاين متوقف مؤقتاً لهذا الملعب حالياً. يمكنك اختيار ملعب آخر متاح.'
    );
  END IF;

  IF EXTRACT(HOUR FROM p_start_time) >= EXTRACT(HOUR FROM v_peak_hour) OR EXTRACT(HOUR FROM p_start_time) < 6 THEN
    v_authoritative_total := COALESCE(v_price_evening, p_total_price);
  ELSE
    v_authoritative_total := COALESCE(v_price_morning, p_total_price);
  END IF;

  IF p_deposit_required >= v_authoritative_total THEN
    v_payment_type := 'full';
    v_authoritative_deposit := v_authoritative_total;
    v_authoritative_cash := 0;
  ELSE
    v_payment_type := 'deposit';
    v_authoritative_deposit := LEAST(v_venue_deposit, v_authoritative_total);
    v_authoritative_cash := GREATEST(0, v_authoritative_total - v_authoritative_deposit);
  END IF;

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
    booking_reference, court_id, booker_id, booker_name, booker_phone,
    booking_date, start_time, end_time, total_price, deposit_required,
    deposit_paid, cash_remaining, status, locked_until, locked_by_session, payment_type
  ) VALUES (
    v_booking_ref, p_court_id, (SELECT auth.uid()), p_booker_name, p_booker_phone,
    p_booking_date, p_start_time, p_end_time, v_authoritative_total, v_authoritative_deposit,
    0, v_authoritative_cash, 'pending_payment', NOW() + INTERVAL '8 minutes', p_session_id, v_payment_type
  )
  RETURNING id INTO v_booking_id;

  RETURN jsonb_build_object(
    'success', TRUE,
    'booking_id', v_booking_id,
    'booking_reference', v_booking_ref,
    'locked_until', NOW() + INTERVAL '8 minutes',
    'payment_type', v_payment_type,
    'total_price', v_authoritative_total,
    'deposit_required', v_authoritative_deposit,
    'cash_remaining', v_authoritative_cash
  );
EXCEPTION WHEN unique_violation THEN
  RETURN jsonb_build_object(
    'success', FALSE,
    'error', 'الميعاد محجوز بالفعل أو قيد الدفع من لاعب آخر حالياً'
  );
END;
$function$;

-- 2. Instant Booking Reschedule (>= 12h before match, 1 free reschedule, atomic anti-double-booking)
CREATE OR REPLACE FUNCTION public.reschedule_booking(
  p_booking_reference text,
  p_new_date date,
  p_new_start_time time without time zone,
  p_new_end_time time without time zone,
  p_session_id text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_uid uuid := (SELECT auth.uid());
  v_user_phone text;
  v_booking public.bookings%ROWTYPE;
  v_price_morning integer;
  v_price_evening integer;
  v_peak_hour time;
  v_court_active boolean;
  v_venue_active boolean;
  v_new_total integer;
  v_new_cash integer;
  v_existing_id uuid;
  v_match_start timestamptz;
  v_new_match_start timestamptz;
BEGIN
  IF v_uid IS NOT NULL THEN
    SELECT phone INTO v_user_phone FROM public.profiles WHERE id = v_uid;
  END IF;

  SELECT b.* INTO v_booking
  FROM public.bookings b
  WHERE UPPER(b.booking_reference) = UPPER(TRIM(p_booking_reference))
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'لم يتم العثور على الحجز المطلوب.');
  END IF;

  IF NOT (
    (v_uid IS NOT NULL AND v_booking.booker_id = v_uid)
    OR (v_user_phone IS NOT NULL AND v_user_phone <> '' AND v_booking.booker_phone = v_user_phone)
    OR (p_session_id IS NOT NULL AND p_session_id <> '' AND v_booking.locked_by_session = p_session_id)
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'يرجى تسجيل الدخول بحساب صاحب الحجز لإتمام تعديل الميعاد.');
  END IF;

  IF v_booking.status <> 'confirmed' THEN
    RETURN jsonb_build_object('success', false, 'error', 'التعديل الفوري متاح للحجوزات المؤكدة فقط.');
  END IF;

  IF v_booking.reschedule_requested_at IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'تم استخدام ميزة تعديل الميعاد المجاني لهذا الحجز مسبقاً.');
  END IF;

  v_match_start := ((v_booking.booking_date + v_booking.start_time) AT TIME ZONE 'Africa/Cairo');
  IF v_match_start < NOW() + INTERVAL '12 hours' THEN
    RETURN jsonb_build_object('success', false, 'error', 'عذراً، التعديل المجاني متاح قبل موعد الماتش بـ 12 ساعة على الأقل.');
  END IF;

  v_new_match_start := ((p_new_date + p_new_start_time) AT TIME ZONE 'Africa/Cairo');
  IF v_new_match_start <= NOW() + INTERVAL '30 minutes' THEN
    RETURN jsonb_build_object('success', false, 'error', 'يرجى اختيار ميعاد جديد في المستقبل.');
  END IF;

  SELECT c.price_morning, c.price_evening, c.peak_hour_start, c.is_active, v.is_active
  INTO v_price_morning, v_price_evening, v_peak_hour, v_court_active, v_venue_active
  FROM public.courts c
  JOIN public.venues v ON v.id = c.venue_id
  WHERE c.id = v_booking.court_id;

  IF NOT COALESCE(v_court_active, false) OR NOT COALESCE(v_venue_active, false) THEN
    RETURN jsonb_build_object('success', false, 'error', 'هذا الملعب متوقف مؤقتاً للصيانة حالياً.');
  END IF;

  IF EXTRACT(HOUR FROM p_new_start_time) >= EXTRACT(HOUR FROM v_peak_hour) OR EXTRACT(HOUR FROM p_new_start_time) < 6 THEN
    v_new_total := v_price_evening;
  ELSE
    v_new_total := v_price_morning;
  END IF;

  v_new_cash := GREATEST(0, v_new_total - COALESCE(v_booking.deposit_paid, 0));

  PERFORM public.release_expired_booking_locks();

  SELECT id INTO v_existing_id
  FROM public.bookings
  WHERE court_id = v_booking.court_id
    AND booking_date = p_new_date
    AND start_time = p_new_start_time
    AND status NOT IN ('cancelled', 'expired')
    AND id <> v_booking.id
  FOR UPDATE;

  IF v_existing_id IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'الميعاد الجديد محجوز بالفعل، اختر ساعة أخرى متاحة.');
  END IF;

  UPDATE public.bookings
  SET
    booking_date = p_new_date,
    start_time = p_new_start_time,
    end_time = p_new_end_time,
    total_price = v_new_total,
    cash_remaining = v_new_cash,
    reschedule_requested_at = NOW(),
    reschedule_requested_slot = TO_CHAR(v_booking.booking_date, 'YYYY-MM-DD') || ' ' || LEFT(v_booking.start_time::text, 5),
    updated_at = NOW()
  WHERE id = v_booking.id;

  UPDATE public.matchmaking_posts
  SET match_date = p_new_date, start_time = p_new_start_time, updated_at = NOW()
  WHERE booking_id = v_booking.id AND status = 'open';

  RETURN jsonb_build_object(
    'success', true,
    'booking_date', p_new_date,
    'start_time', p_new_start_time,
    'end_time', p_new_end_time,
    'total_price', v_new_total,
    'cash_remaining', v_new_cash
  );
EXCEPTION WHEN unique_violation THEN
  RETURN jsonb_build_object('success', false, 'error', 'الميعاد الجديد محجوز بالفعل، اختر ساعة أخرى متاحة.');
END;
$function$;

REVOKE ALL ON FUNCTION public.reschedule_booking(text, date, time, time, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reschedule_booking(text, date, time, time, text) TO anon, authenticated;

-- 3. Matchmaking Squad Roster Table & Atomic Join / Leave RPCs (soft status, zero DELETE)
CREATE TABLE IF NOT EXISTS public.matchmaking_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.matchmaking_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  player_name text NOT NULL,
  player_phone character varying(20) NOT NULL,
  position text NOT NULL DEFAULT 'أي مركز',
  status text NOT NULL DEFAULT 'joined' CHECK (status IN ('joined', 'left')),
  joined_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_matchmaking_active_participant
  ON public.matchmaking_participants(post_id, user_id)
  WHERE status = 'joined';

CREATE INDEX IF NOT EXISTS idx_matchmaking_participants_post_id
  ON public.matchmaking_participants(post_id)
  WHERE status = 'joined';

ALTER TABLE public.matchmaking_participants ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'matchmaking_participants' AND policyname = 'matchmaking_participants_select_own_or_creator'
  ) THEN
    CREATE POLICY matchmaking_participants_select_own_or_creator
      ON public.matchmaking_participants
      FOR SELECT
      TO authenticated
      USING (
        user_id = (SELECT auth.uid())
        OR EXISTS (
          SELECT 1 FROM public.matchmaking_posts mp
          WHERE mp.id = post_id AND mp.creator_id = (SELECT auth.uid())
        )
      );
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.get_matchmaking_participants(p_post_ids uuid[])
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_uid uuid := (SELECT auth.uid());
BEGIN
  RETURN COALESCE((
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', mp.id,
        'post_id', mp.post_id,
        'user_id', mp.user_id,
        'player_name', mp.player_name,
        'position', mp.position,
        'joined_at', mp.joined_at,
        'is_me', (v_uid IS NOT NULL AND mp.user_id = v_uid),
        'player_phone', CASE
          WHEN v_uid IS NOT NULL AND (mp.user_id = v_uid OR p.creator_id = v_uid) THEN mp.player_phone
          ELSE NULL
        END
      )
      ORDER BY mp.joined_at ASC
    )
    FROM public.matchmaking_participants mp
    JOIN public.matchmaking_posts p ON p.id = mp.post_id
    WHERE mp.post_id = ANY(p_post_ids)
      AND mp.status = 'joined'
  ), '[]'::jsonb);
END;
$function$;

REVOKE ALL ON FUNCTION public.get_matchmaking_participants(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_matchmaking_participants(uuid[]) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.join_matchmaking_post(
  p_post_id uuid,
  p_player_name text,
  p_player_phone text,
  p_position text DEFAULT 'أي مركز'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_uid uuid := (SELECT auth.uid());
  v_post public.matchmaking_posts%ROWTYPE;
  v_clean_name text := NULLIF(TRIM(COALESCE(p_player_name, '')), '');
  v_clean_phone text := REGEXP_REPLACE(COALESCE(p_player_phone, ''), '\s+', '', 'g');
  v_new_needed integer;
  v_new_status public.matchmaking_status;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'يرجى تسجيل الدخول أولاً للانضمام إلى التقسيمة.');
  END IF;

  IF v_clean_name IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'يرجى كتابة اسمك.');
  END IF;

  IF v_clean_phone !~ '^01[0125][0-9]{8}$' THEN
    RETURN jsonb_build_object('success', false, 'error', 'يرجى إدخال رقم موبايل مصري صحيح.');
  END IF;

  SELECT * INTO v_post
  FROM public.matchmaking_posts
  WHERE id = p_post_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'لم يتم العثور على هذه التقسيمة.');
  END IF;

  IF v_post.creator_id = v_uid THEN
    RETURN jsonb_build_object('success', false, 'error', 'أنت منظم هذه التقسيمة بالفعل.');
  END IF;

  IF v_post.status <> 'open' OR v_post.players_needed <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'عذراً، اكتمل عدد اللاعبين في هذه التقسيمة بالفعل.');
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.matchmaking_participants
    WHERE post_id = p_post_id AND user_id = v_uid AND status = 'joined'
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'أنت منضم بالفعل لهذه التقسيمة.');
  END IF;

  INSERT INTO public.matchmaking_participants (post_id, user_id, player_name, player_phone, position, status)
  VALUES (p_post_id, v_uid, v_clean_name, v_clean_phone, COALESCE(NULLIF(TRIM(p_position), ''), 'أي مركز'), 'joined');

  v_new_needed := GREATEST(0, v_post.players_needed - 1);
  v_new_status := CASE WHEN v_new_needed = 0 THEN 'filled'::public.matchmaking_status ELSE 'open'::public.matchmaking_status END;

  UPDATE public.matchmaking_posts
  SET
    players_needed = v_new_needed,
    current_players = COALESCE(current_players, 1) + 1,
    status = v_new_status,
    updated_at = NOW()
  WHERE id = p_post_id;

  RETURN jsonb_build_object(
    'success', true,
    'players_needed', v_new_needed,
    'status', v_new_status::text
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.join_matchmaking_post(uuid, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.join_matchmaking_post(uuid, text, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.leave_matchmaking_post(p_post_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_uid uuid := (SELECT auth.uid());
  v_post public.matchmaking_posts%ROWTYPE;
  v_left_id uuid;
  v_new_needed integer;
  v_new_status public.matchmaking_status;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'غير مصرح.');
  END IF;

  SELECT * INTO v_post
  FROM public.matchmaking_posts
  WHERE id = p_post_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'التقسيمة غير موجودة.');
  END IF;

  UPDATE public.matchmaking_participants
  SET status = 'left'
  WHERE post_id = p_post_id AND user_id = v_uid AND status = 'joined'
  RETURNING id INTO v_left_id;

  IF v_left_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'لست مسجلاً في هذه التقسيمة.');
  END IF;

  v_new_needed := v_post.players_needed + 1;
  v_new_status := CASE WHEN v_post.status = 'cancelled' THEN 'cancelled'::public.matchmaking_status ELSE 'open'::public.matchmaking_status END;

  UPDATE public.matchmaking_posts
  SET
    players_needed = v_new_needed,
    current_players = GREATEST(1, COALESCE(current_players, 1) - 1),
    status = v_new_status,
    updated_at = NOW()
  WHERE id = p_post_id;

  RETURN jsonb_build_object(
    'success', true,
    'players_needed', v_new_needed,
    'status', v_new_status::text
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.leave_matchmaking_post(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.leave_matchmaking_post(uuid) TO authenticated;

-- 4. Verified Post-Match Venue Reviews
CREATE TABLE IF NOT EXISTS public.venue_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL UNIQUE REFERENCES public.bookings(id) ON DELETE CASCADE,
  venue_id uuid NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  turf_rating smallint NOT NULL CHECK (turf_rating BETWEEN 1 AND 5),
  lighting_rating smallint NOT NULL CHECK (lighting_rating BETWEEN 1 AND 5),
  service_rating smallint NOT NULL CHECK (service_rating BETWEEN 1 AND 5),
  overall_rating numeric(3,2) GENERATED ALWAYS AS (ROUND(((turf_rating + lighting_rating + service_rating)::numeric / 3.0), 2)) STORED,
  comment text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_venue_reviews_venue_id ON public.venue_reviews(venue_id);

ALTER TABLE public.venue_reviews ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'venue_reviews' AND policyname = 'venue_reviews_public_select'
  ) THEN
    CREATE POLICY venue_reviews_public_select
      ON public.venue_reviews
      FOR SELECT
      TO anon, authenticated
      USING (true);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.submit_venue_review(
  p_booking_id uuid,
  p_turf_rating integer,
  p_lighting_rating integer,
  p_service_rating integer,
  p_comment text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_uid uuid := (SELECT auth.uid());
  v_user_phone text;
  v_booking public.bookings%ROWTYPE;
  v_venue_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'يرجى تسجيل الدخول لتقييم الملعب.');
  END IF;

  SELECT phone INTO v_user_phone FROM public.profiles WHERE id = v_uid;

  SELECT b.* INTO v_booking
  FROM public.bookings b
  WHERE b.id = p_booking_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'الحجز غير موجود.');
  END IF;

  IF NOT (
    v_booking.booker_id = v_uid
    OR (v_user_phone IS NOT NULL AND v_user_phone <> '' AND v_booking.booker_phone = v_user_phone)
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'لا تملك صلاحية تقييم هذا الحجز.');
  END IF;

  IF v_booking.status <> 'completed' THEN
    RETURN jsonb_build_object('success', false, 'error', 'التقييم الموثق متاح فقط بعد حضور الماتش واكتماله.');
  END IF;

  SELECT venue_id INTO v_venue_id FROM public.courts WHERE id = v_booking.court_id;

  INSERT INTO public.venue_reviews (
    booking_id, venue_id, user_id, turf_rating, lighting_rating, service_rating, comment
  ) VALUES (
    p_booking_id,
    v_venue_id,
    v_uid,
    LEAST(5, GREATEST(1, p_turf_rating)),
    LEAST(5, GREATEST(1, p_lighting_rating)),
    LEAST(5, GREATEST(1, p_service_rating)),
    NULLIF(TRIM(COALESCE(p_comment, '')), '')
  );

  RETURN jsonb_build_object('success', true);
EXCEPTION WHEN unique_violation THEN
  RETURN jsonb_build_object('success', false, 'error', 'تم تقييم هذا الماتش مسبقاً.');
END;
$function$;

REVOKE ALL ON FUNCTION public.submit_venue_review(uuid, integer, integer, integer, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_venue_review(uuid, integer, integer, integer, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_venue_rating_summaries()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT COALESCE(jsonb_agg(to_jsonb(s)), '[]'::jsonb)
  FROM (
    SELECT
      venue_id,
      ROUND(AVG(overall_rating), 1) AS avg_rating,
      COUNT(*)::integer AS reviews_count
    FROM public.venue_reviews
    GROUP BY venue_id
  ) s;
$function$;

REVOKE ALL ON FUNCTION public.get_venue_rating_summaries() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_venue_rating_summaries() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_player_bookings(p_phone text DEFAULT NULL::text, p_user_id uuid DEFAULT NULL::uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
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
      b.locked_until,
      b.payment_type,
      b.reschedule_requested_at,
      b.reschedule_requested_slot,
      b.booker_name,
      b.booker_phone,
      b.created_at,
      EXISTS (SELECT 1 FROM public.venue_reviews r WHERE r.booking_id = b.id) AS has_review,
      jsonb_build_object(
        'id', c.id,
        'name', c.name,
        'sport', c.sport,
        'slot_duration_minutes', c.slot_duration_minutes,
        'venue', jsonb_build_object(
          'id', v.id,
          'name', v.name,
          'slug', v.slug,
          'city', v.city,
          'district', v.district,
          'address', v.address,
          'phone', v.phone,
          'whatsapp_number', v.whatsapp_number
        )
      ) AS court
    FROM public.bookings b
    JOIN public.courts c ON c.id = b.court_id
    JOIN public.venues v ON v.id = c.venue_id
    WHERE
      b.booker_id = v_uid
      OR (v_user_phone IS NOT NULL AND v_user_phone <> '' AND b.booker_phone = v_user_phone)
  ) b_data;

  RETURN v_result;
END;
$function$;

-- 5. Slot Availability Waitlist
CREATE TABLE IF NOT EXISTS public.slot_waitlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  court_id uuid NOT NULL REFERENCES public.courts(id) ON DELETE CASCADE,
  booking_date date NOT NULL,
  start_time time without time zone NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  session_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (court_id, booking_date, start_time, session_id)
);

ALTER TABLE public.slot_waitlist ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'slot_waitlist' AND policyname = 'slot_waitlist_own_select'
  ) THEN
    CREATE POLICY slot_waitlist_own_select
      ON public.slot_waitlist
      FOR SELECT
      TO authenticated
      USING (user_id = (SELECT auth.uid()));
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.subscribe_slot_waitlist(
  p_court_id uuid,
  p_booking_date date,
  p_start_time time without time zone,
  p_session_id text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_uid uuid := (SELECT auth.uid());
  v_clean_session text := NULLIF(TRIM(COALESCE(p_session_id, '')), '');
BEGIN
  IF v_clean_session IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'معرف الجلسة غير صالح.');
  END IF;

  INSERT INTO public.slot_waitlist (court_id, booking_date, start_time, user_id, session_id)
  VALUES (p_court_id, p_booking_date, p_start_time, v_uid, v_clean_session)
  ON CONFLICT (court_id, booking_date, start_time, session_id) DO UPDATE
  SET user_id = COALESCE(slot_waitlist.user_id, EXCLUDED.user_id);

  RETURN jsonb_build_object('success', true);
END;
$function$;

REVOKE ALL ON FUNCTION public.subscribe_slot_waitlist(uuid, date, time, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.subscribe_slot_waitlist(uuid, date, time, text) TO anon, authenticated;
