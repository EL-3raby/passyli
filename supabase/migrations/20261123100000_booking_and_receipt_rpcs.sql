-- Migration: Booking and Receipt helper RPCs and storage setup
-- Date: 2026-11-23

-- 1. Cancel Booking Lock (تحرير فوري للميعاد عند الإلغاء أو التراجع)
CREATE OR REPLACE FUNCTION public.cancel_booking_lock(
  p_booking_id UUID,
  p_session_id TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_updated INTEGER;
BEGIN
  UPDATE public.bookings
  SET status = 'cancelled',
      locked_until = NULL
  WHERE id = p_booking_id
    AND status = 'pending_payment'
    AND (p_session_id IS NULL OR locked_by_session = p_session_id);

  GET DIAGNOSTICS v_updated = ROW_COUNT;

  IF v_updated > 0 THEN
    RETURN jsonb_build_object('success', TRUE);
  ELSE
    RETURN jsonb_build_object('success', FALSE, 'error', 'لم يتم العثور على حجز مؤقت نشط للإلغاء');
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Submit Booking Receipt (تسجيل إيصال التحويل وتثبيت الحجز)
CREATE OR REPLACE FUNCTION public.submit_booking_receipt(
  p_booking_id UUID,
  p_sender_name TEXT,
  p_sender_phone VARCHAR(20),
  p_payment_method public.payment_method,
  p_reference_number TEXT,
  p_amount_paid INTEGER,
  p_image_url TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_booking RECORD;
  v_receipt_id UUID;
BEGIN
  -- 1. Check booking existence and validity
  SELECT * INTO v_booking
  FROM public.bookings
  WHERE id = p_booking_id;

  IF v_booking.id IS NULL THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'بيانات الحجز غير موجودة');
  END IF;

  IF v_booking.status = 'cancelled' OR v_booking.status = 'expired' THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'مهلة الحجز انتهت بالفعل أو تم إلغاؤه');
  END IF;

  -- 2. Insert receipt record
  INSERT INTO public.receipts (
    booking_id,
    sender_name,
    sender_phone,
    payment_method,
    reference_number,
    amount_paid,
    image_url,
    status
  ) VALUES (
    p_booking_id,
    p_sender_name,
    p_sender_phone,
    p_payment_method,
    p_reference_number,
    p_amount_paid,
    p_image_url,
    'submitted'
  )
  RETURNING id INTO v_receipt_id;

  -- 3. Update booking status and remove lock expiration
  UPDATE public.bookings
  SET 
    deposit_paid = p_amount_paid,
    cash_remaining = GREATEST(total_price - p_amount_paid, 0),
    status = 'confirmed',
    locked_until = NULL
  WHERE id = p_booking_id;

  RETURN jsonb_build_object(
    'success', TRUE,
    'receipt_id', v_receipt_id,
    'booking_reference', v_booking.booking_reference
  );
EXCEPTION WHEN unique_violation THEN
  RETURN jsonb_build_object(
    'success', FALSE,
    'error', 'تم استخدام الرقم المرجعي لهذا التحويل من قبل. يرجى التأكد من الرقم المكتوب في الإيصال.'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
