-- =====================================================================
-- باصيلي (Passyli) — Phase 10 Hardening & Court Management:
-- 1. Staff PIN brute-force lockout (5 attempts -> 10m cooldown)
-- 2. lock_court_slot active venue/court + prepaid balance enforcement
-- 3. Owner court pricing/duration update & add court RPCs
-- =====================================================================

ALTER TABLE public.venue_staff_pins
  ADD COLUMN IF NOT EXISTS failed_attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS locked_until timestamptz;

CREATE OR REPLACE FUNCTION public.owner_set_staff_pin(p_venue_id uuid, p_pin text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pin text := NULLIF(TRIM(COALESCE(p_pin, '')), '');
  v_hash text;
  v_secret text;
BEGIN
  IF NOT public.is_venue_owner_or_admin(p_venue_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'غير مصرح لك بتعديل رمز موظفي هذا الملعب');
  END IF;

  IF v_pin IS NULL THEN
    DELETE FROM public.venue_staff_pins WHERE venue_id = p_venue_id;
    RETURN jsonb_build_object('success', true, 'has_pin', false);
  END IF;

  IF v_pin !~ '^[0-9]{4,6}$' THEN
    RETURN jsonb_build_object('success', false, 'error', 'يجب أن يتكون رمز PIN من 4 إلى 6 أرقام إنجليزية فقط');
  END IF;

  v_hash := encode(sha256(convert_to(v_pin, 'UTF8')), 'hex');
  v_secret := md5(random()::text || clock_timestamp()::text || p_venue_id::text || random()::text);

  INSERT INTO public.venue_staff_pins (venue_id, pin_hash, session_secret, failed_attempts, locked_until, updated_at)
  VALUES (p_venue_id, v_hash, v_secret, 0, NULL, now())
  ON CONFLICT (venue_id) DO UPDATE
    SET pin_hash = EXCLUDED.pin_hash,
        session_secret = EXCLUDED.session_secret,
        failed_attempts = 0,
        locked_until = NULL,
        updated_at = now();

  RETURN jsonb_build_object('success', true, 'has_pin', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.staff_verify_pin(p_venue_id uuid, p_pin text)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pin text := TRIM(COALESCE(p_pin, ''));
  v_hash text;
  v_row RECORD;
  v_next_attempts integer;
BEGIN
  SELECT v.id, v.name, v.district, sp.pin_hash, sp.session_secret, sp.failed_attempts, sp.locked_until
  INTO v_row
  FROM public.venues v
  JOIN public.venue_staff_pins sp ON sp.venue_id = v.id
  WHERE v.id = p_venue_id AND v.is_active = true
  FOR UPDATE OF sp;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'تم إيقاف صلاحية الاستقبال أو الملعب غير متاح حالياً');
  END IF;

  IF v_row.locked_until IS NOT NULL AND v_row.locked_until > now() THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'تم تجميد المحاولات مؤقتاً لمدة 10 دقائق بعد 5 محاولات خاطئة. تواصل مع المالك لتحديث الرمز.'
    );
  END IF;

  IF v_pin !~ '^[0-9]{4,6}$' THEN
    RETURN jsonb_build_object('success', false, 'error', 'رمز PIN يجب أن يكون 4 إلى 6 أرقام');
  END IF;

  v_hash := encode(sha256(convert_to(v_pin, 'UTF8')), 'hex');

  IF v_row.pin_hash <> v_hash THEN
    v_next_attempts := COALESCE(v_row.failed_attempts, 0) + 1;
    IF v_next_attempts >= 5 THEN
      UPDATE public.venue_staff_pins
      SET failed_attempts = v_next_attempts,
          locked_until = now() + interval '10 minutes'
      WHERE venue_id = p_venue_id;
      RETURN jsonb_build_object(
        'success', false,
        'error', 'تجاوزت 5 محاولات خاطئة. تم تجميد الدخول لمدة 10 دقائق لحماية الملعب.'
      );
    ELSE
      UPDATE public.venue_staff_pins
      SET failed_attempts = v_next_attempts
      WHERE venue_id = p_venue_id;
      RETURN jsonb_build_object(
        'success', false,
        'error', 'رمز الدخول غير صحيح (متبقي ' || (5 - v_next_attempts) || ' محاولات)'
      );
    END IF;
  END IF;

  UPDATE public.venue_staff_pins
  SET failed_attempts = 0, locked_until = NULL
  WHERE venue_id = p_venue_id;

  RETURN jsonb_build_object(
    'success', true,
    'venue_id', v_row.id,
    'venue_name', v_row.name,
    'venue_district', v_row.district,
    'session_secret', v_row.session_secret
  );
END;
$$;

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
  v_court_active boolean;
  v_venue_active boolean;
  v_venue_balance integer;
  v_venue_comm integer;
BEGIN
  IF EXISTS (SELECT 1 FROM public.fraud_blacklist WHERE phone = p_booker_phone) THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'تم إيقاف هذا الرقم مؤقتاً لمخالفة سياسة الحجز. يرجى التواصل مع الدعم الفني.'
    );
  END IF;

  SELECT c.is_active, v.is_active, v.prepaid_balance, COALESCE(v.commission_per_slot, 15)
  INTO v_court_active, v_venue_active, v_venue_balance, v_venue_comm
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
    deposit_paid, cash_remaining, status, locked_until, locked_by_session
  ) VALUES (
    v_booking_ref, p_court_id, (SELECT auth.uid()), p_booker_name, p_booker_phone,
    p_booking_date, p_start_time, p_end_time, p_total_price, p_deposit_required,
    0, p_cash_remaining, 'pending_payment', NOW() + INTERVAL '8 minutes', p_session_id
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

CREATE OR REPLACE FUNCTION public.owner_update_court_settings(
  p_court_id uuid,
  p_name text,
  p_price_morning integer,
  p_price_evening integer,
  p_peak_hour_start time without time zone,
  p_slot_duration_minutes integer,
  p_is_active boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_venue_id uuid;
BEGIN
  SELECT venue_id INTO v_venue_id FROM public.courts WHERE id = p_court_id;
  IF v_venue_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'الملعب الفرعي غير موجود');
  END IF;

  IF NOT public.is_venue_owner_or_admin(v_venue_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'غير مصرح لك بتعديل هذا الملعب');
  END IF;

  IF COALESCE(p_price_morning, 0) < 50 OR COALESCE(p_price_evening, 0) < 50 THEN
    RETURN jsonb_build_object('success', false, 'error', 'الحد الأدنى لسعر الساعة هو 50 ج.م');
  END IF;

  IF p_slot_duration_minutes NOT IN (60, 90, 120) THEN
    RETURN jsonb_build_object('success', false, 'error', 'مدة الحجز المسموحة 60 أو 90 أو 120 دقيقة');
  END IF;

  UPDATE public.courts
  SET name = COALESCE(NULLIF(TRIM(p_name), ''), name),
      price_morning = p_price_morning,
      price_evening = p_price_evening,
      peak_hour_start = COALESCE(p_peak_hour_start, peak_hour_start),
      slot_duration_minutes = p_slot_duration_minutes,
      is_active = COALESCE(p_is_active, is_active),
      updated_at = now()
  WHERE id = p_court_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.owner_add_court(
  p_venue_id uuid,
  p_name text,
  p_sport public.sport_type,
  p_surface public.surface_type,
  p_price_morning integer,
  p_price_evening integer,
  p_peak_hour_start time without time zone DEFAULT '17:00:00',
  p_slot_duration_minutes integer DEFAULT 60
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_court_id uuid;
BEGIN
  IF NOT public.is_venue_owner_or_admin(p_venue_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'غير مصرح لك بإضافة ملاعب لهذه المنشأة');
  END IF;

  IF NULLIF(TRIM(COALESCE(p_name, '')), '') IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'يرجى إدخال اسم الملعب الفرعي');
  END IF;

  IF COALESCE(p_price_morning, 0) < 50 OR COALESCE(p_price_evening, 0) < 50 THEN
    RETURN jsonb_build_object('success', false, 'error', 'الحد الأدنى لسعر الساعة هو 50 ج.م');
  END IF;

  IF p_slot_duration_minutes NOT IN (60, 90, 120) THEN
    RETURN jsonb_build_object('success', false, 'error', 'مدة الحجز المسموحة 60 أو 90 أو 120 دقيقة');
  END IF;

  INSERT INTO public.courts (
    venue_id, name, sport, surface, price_morning, price_evening,
    peak_hour_start, slot_duration_minutes, is_active
  ) VALUES (
    p_venue_id, TRIM(p_name), p_sport, p_surface, p_price_morning, p_price_evening,
    COALESCE(p_peak_hour_start, '17:00:00'::time), p_slot_duration_minutes, true
  )
  RETURNING id INTO v_court_id;

  RETURN jsonb_build_object('success', true, 'court_id', v_court_id);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.owner_update_court_settings(uuid, text, integer, integer, time, integer, boolean) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.owner_add_court(uuid, text, public.sport_type, public.surface_type, integer, integer, time, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.owner_update_court_settings(uuid, text, integer, integer, time, integer, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.owner_add_court(uuid, text, public.sport_type, public.surface_type, integer, integer, time, integer) TO authenticated;
