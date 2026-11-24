-- =====================================================================
-- باصيلي (Passyli) — Phase 6: Venue Owner & Staff Dashboard RPCs
-- =====================================================================

-- 1. Create Walk-in Fast Booking (حجز الكاش السريع لموظف الاستقبال لمنع الحجز المزدوج)
CREATE OR REPLACE FUNCTION public.create_walkin_booking(
  p_court_id UUID,
  p_booking_date DATE,
  p_start_time TIME,
  p_end_time TIME,
  p_booker_name TEXT,
  p_booker_phone VARCHAR(20),
  p_total_price INTEGER,
  p_amount_paid INTEGER DEFAULT 0
)
RETURNS JSONB AS $$
DECLARE
  v_booking_ref VARCHAR(24);
  v_booking_id UUID;
  v_existing_id UUID;
BEGIN
  -- 1.1 First release any expired locks
  PERFORM public.release_expired_booking_locks();

  -- 1.2 Check concurrency lock
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
      'error', 'هذا الميعاد محجوز بالفعل أو معلق أونلاين ولا يمكن قفله كاش حالياً'
    );
  END IF;

  -- 1.3 Generate unique reference
  v_booking_ref := 'WALK-' || TO_CHAR(p_booking_date, 'YYYYMMDD') || '-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 4));

  -- 1.4 Insert confirmed walk-in booking
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
    is_walkin,
    locked_until
  ) VALUES (
    v_booking_ref,
    p_court_id,
    p_booker_name,
    p_booker_phone,
    p_booking_date,
    p_start_time,
    p_end_time,
    p_total_price,
    0,
    p_amount_paid,
    GREATEST(p_total_price - p_amount_paid, 0),
    'confirmed',
    TRUE,
    NULL
  )
  RETURNING id INTO v_booking_id;

  RETURN jsonb_build_object(
    'success', TRUE,
    'booking_id', v_booking_id,
    'booking_reference', v_booking_ref
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Review Booking Receipt (مراجعة واعتماد أو تعديل أو رفض إيصالات التحويل)
CREATE OR REPLACE FUNCTION public.review_booking_receipt(
  p_receipt_id UUID,
  p_action TEXT, -- 'approve', 'adjust', 'reject'
  p_adjusted_amount INTEGER DEFAULT NULL,
  p_rejection_reason TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_receipt RECORD;
  v_booking RECORD;
  v_final_amount INTEGER;
BEGIN
  -- 2.1 Find receipt
  SELECT * INTO v_receipt FROM public.receipts WHERE id = p_receipt_id FOR UPDATE;
  IF v_receipt.id IS NULL THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'بيانات الإيصال غير موجودة');
  END IF;

  -- 2.2 Find associated booking
  SELECT * INTO v_booking FROM public.bookings WHERE id = v_receipt.booking_id FOR UPDATE;
  IF v_booking.id IS NULL THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'بيانات الحجز المرتبطة بالإيصال غير موجودة');
  END IF;

  -- 2.3 Execute review action
  IF p_action = 'approve' THEN
    UPDATE public.receipts
    SET status = 'verified',
        verified_at = NOW()
    WHERE id = p_receipt_id;

    UPDATE public.bookings
    SET status = 'confirmed',
        locked_until = NULL
    WHERE id = v_booking.id;

    RETURN jsonb_build_object('success', TRUE, 'action', 'approved');

  ELSIF p_action = 'adjust' THEN
    v_final_amount := COALESCE(p_adjusted_amount, v_receipt.amount_paid);

    UPDATE public.receipts
    SET status = 'verified',
        amount_paid = v_final_amount,
        verified_at = NOW()
    WHERE id = p_receipt_id;

    UPDATE public.bookings
    SET deposit_paid = v_final_amount,
        cash_remaining = GREATEST(v_booking.total_price - v_final_amount, 0),
        status = 'confirmed',
        locked_until = NULL
    WHERE id = v_booking.id;

    RETURN jsonb_build_object(
      'success', TRUE,
      'action', 'adjusted',
      'deposit_paid', v_final_amount,
      'cash_remaining', GREATEST(v_booking.total_price - v_final_amount, 0)
    );

  ELSIF p_action = 'reject' THEN
    UPDATE public.receipts
    SET status = 'rejected',
        rejection_reason = p_rejection_reason,
        verified_at = NOW()
    WHERE id = p_receipt_id;

    UPDATE public.bookings
    SET status = 'cancelled',
        cancellation_reason = COALESCE(p_rejection_reason, 'تم رفض إيصال التحويل لعدم صحة البيانات'),
        locked_until = NULL
    WHERE id = v_booking.id;

    RETURN jsonb_build_object('success', TRUE, 'action', 'rejected');

  ELSE
    RETURN jsonb_build_object('success', FALSE, 'error', 'إجراء مراجعة غير معروف');
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Complete Booking Attendance (تسجيل الحضور وتحصيل المتبقي كاش في الملعب)
CREATE OR REPLACE FUNCTION public.complete_booking_attendance(
  p_booking_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_booking RECORD;
BEGIN
  SELECT * INTO v_booking FROM public.bookings WHERE id = p_booking_id FOR UPDATE;
  IF v_booking.id IS NULL THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'الحجز غير موجود');
  END IF;

  UPDATE public.bookings
  SET status = 'completed',
      deposit_paid = total_price,
      cash_remaining = 0,
      locked_until = NULL
  WHERE id = p_booking_id;

  RETURN jsonb_build_object('success', TRUE, 'status', 'completed');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Toggle Court Maintenance (زر طوارئ الصيانة أو الظروف الجوية)
CREATE OR REPLACE FUNCTION public.toggle_court_maintenance(
  p_court_id UUID,
  p_is_active BOOLEAN
)
RETURNS JSONB AS $$
BEGIN
  UPDATE public.courts
  SET is_active = p_is_active
  WHERE id = p_court_id;

  RETURN jsonb_build_object('success', TRUE, 'is_active', p_is_active);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Cancel Confirmed Booking from Venue Admin (إلغاء الحجز يدوياً من إدارة الملعب وتحرير الميعاد)
CREATE OR REPLACE FUNCTION public.cancel_venue_booking(
  p_booking_id UUID,
  p_cancellation_reason TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_booking RECORD;
BEGIN
  SELECT * INTO v_booking FROM public.bookings WHERE id = p_booking_id FOR UPDATE;
  IF v_booking.id IS NULL THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'بيانات الحجز غير موجودة');
  END IF;

  UPDATE public.bookings
  SET status = 'cancelled',
      cancellation_reason = COALESCE(p_cancellation_reason, 'تم الإلغاء بواسطة إدارة الملعب'),
      locked_until = NULL
  WHERE id = p_booking_id;

  RETURN jsonb_build_object(
    'success', TRUE,
    'booking_id', p_booking_id,
    'booking_reference', v_booking.booking_reference
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Update Venue Wallets (إدارة أرقام إنستاباي وفودافون كاش والعربون للملعب)
CREATE OR REPLACE FUNCTION public.update_venue_wallets(
  p_venue_id UUID,
  p_instapay_address TEXT DEFAULT NULL,
  p_vodafone_cash_number TEXT DEFAULT NULL,
  p_backup_wallet_number TEXT DEFAULT NULL,
  p_deposit_amount INTEGER DEFAULT NULL
)
RETURNS JSONB AS $$
BEGIN
  UPDATE public.venues
  SET 
    instapay_address = COALESCE(p_instapay_address, instapay_address),
    vodafone_cash_number = COALESCE(p_vodafone_cash_number, vodafone_cash_number),
    backup_wallet_number = COALESCE(p_backup_wallet_number, backup_wallet_number),
    deposit_amount = COALESCE(p_deposit_amount, deposit_amount),
    updated_at = NOW()
  WHERE id = p_venue_id;

  RETURN jsonb_build_object('success', TRUE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
