-- =====================================================================
-- باصيلي (Passyli) — Phase 10 Bonus Feature:
-- Recurring Weekly Bookings RPC (owner_create_recurring_walkin)
-- =====================================================================

CREATE OR REPLACE FUNCTION public.owner_create_recurring_walkin(
  p_court_id uuid,
  p_start_date date,
  p_weeks_count integer,
  p_start_time time without time zone,
  p_end_time time without time zone,
  p_booker_name text,
  p_booker_phone character varying,
  p_total_price integer,
  p_amount_paid_per_slot integer DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_venue_id uuid;
  v_weeks integer := LEAST(GREATEST(COALESCE(p_weeks_count, 4), 2), 12);
  i integer;
  v_target_date date;
  v_existing_id uuid;
  v_booking_ref varchar(24);
  v_booked_dates jsonb := '[]'::jsonb;
  v_skipped_dates jsonb := '[]'::jsonb;
  v_created_count integer := 0;
  v_paid integer;
BEGIN
  SELECT venue_id INTO v_venue_id FROM public.courts WHERE id = p_court_id;
  IF v_venue_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'الملعب الفرعي غير موجود');
  END IF;

  IF NOT public.is_venue_owner_or_admin(v_venue_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'غير مصرح لك بإدارة حجوزات هذا الملعب');
  END IF;

  IF NULLIF(TRIM(COALESCE(p_booker_name, '')), '') IS NULL OR NULLIF(TRIM(COALESCE(p_booker_phone, '')), '') IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'يرجى إدخال اسم الكابتن ورقم الموبايل');
  END IF;

  PERFORM public.release_expired_booking_locks();

  v_paid := LEAST(GREATEST(COALESCE(p_amount_paid_per_slot, 0), 0), GREATEST(COALESCE(p_total_price, 0), 0));

  FOR i IN 0..(v_weeks - 1) LOOP
    v_target_date := p_start_date + (i * 7);

    SELECT id INTO v_existing_id
    FROM public.bookings
    WHERE court_id = p_court_id
      AND booking_date = v_target_date
      AND start_time = p_start_time
      AND status NOT IN ('cancelled', 'expired')
    FOR UPDATE;

    IF v_existing_id IS NOT NULL THEN
      v_skipped_dates := v_skipped_dates || to_jsonb(v_target_date::text);
    ELSE
      v_booking_ref := 'REC-' || TO_CHAR(v_target_date, 'YYYYMMDD') || '-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT || i::text) FROM 1 FOR 4));

      INSERT INTO public.bookings (
        booking_reference, court_id, booker_name, booker_phone,
        booking_date, start_time, end_time, total_price,
        deposit_required, deposit_paid, cash_remaining, status, is_walkin, locked_until
      ) VALUES (
        v_booking_ref, p_court_id, TRIM(p_booker_name), TRIM(p_booker_phone),
        v_target_date, p_start_time, p_end_time, p_total_price,
        0, v_paid, GREATEST(p_total_price - v_paid, 0),
        'confirmed', TRUE, NULL
      );

      v_created_count := v_created_count + 1;
      v_booked_dates := v_booked_dates || to_jsonb(v_target_date::text);
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'created_count', v_created_count,
    'booked_dates', v_booked_dates,
    'skipped_dates', v_skipped_dates
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.owner_create_recurring_walkin(uuid, date, integer, time, time, text, character varying, integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.owner_create_recurring_walkin(uuid, date, integer, time, time, text, character varying, integer, integer) TO authenticated;
