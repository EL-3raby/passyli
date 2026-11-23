-- Migration: Fix slot lock and release RPCs with SECURITY DEFINER and exception handling
-- Date: 2026-11-23

-- 1. Ensure release_expired_booking_locks runs with SECURITY DEFINER to bypass RLS when cleaning expired holds
CREATE OR REPLACE FUNCTION public.release_expired_booking_locks()
RETURNS INTEGER AS $$
DECLARE
  released_count INTEGER;
BEGIN
  UPDATE public.bookings
  SET status = 'expired'
  WHERE status = 'pending_payment'
    AND locked_until < NOW();
    
  GET DIAGNOSTICS released_count = ROW_COUNT;
  RETURN released_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Update lock_court_slot to SECURITY DEFINER and handle race-condition unique constraint violations gracefully
CREATE OR REPLACE FUNCTION public.lock_court_slot(
  p_court_id UUID,
  p_booking_date DATE,
  p_start_time TIME,
  p_end_time TIME,
  p_booker_name TEXT,
  p_booker_phone VARCHAR(20),
  p_total_price INTEGER,
  p_deposit_required INTEGER,
  p_cash_remaining INTEGER,
  p_session_id TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_booking_ref VARCHAR(24);
  v_booking_id UUID;
  v_existing_id UUID;
BEGIN
  -- 1. First release any expired locks
  PERFORM public.release_expired_booking_locks();

  -- 2. Check if slot is already actively booked or held
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

  -- 3. Generate unique booking reference (e.g. PAS-YYYYMMDD-XXXX)
  v_booking_ref := 'PAS-' || TO_CHAR(p_booking_date, 'YYYYMMDD') || '-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 4));

  -- 4. Insert atomic hold
  INSERT INTO public.bookings (
    booking_reference,
    court_id,
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
