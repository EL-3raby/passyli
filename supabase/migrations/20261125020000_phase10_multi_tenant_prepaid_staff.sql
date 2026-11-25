-- =====================================================================
-- باصيلي (Passyli) — Phase 10:
-- 1. Isolated venue_staff_pins table + plaintext cleanup
-- 2. Owner-aware SELECT policies on venues & courts
-- 3. Hardened Dashboard RPCs with ownership checks & atomic commission deduction
-- 4. Owner Prepaid Wallet & Staff PIN management RPCs
-- 5. Zero-financial Staff Gatekeeper RPCs
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.venue_staff_pins (
  venue_id uuid PRIMARY KEY REFERENCES public.venues(id) ON DELETE CASCADE,
  pin_hash text NOT NULL,
  session_secret text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.venue_staff_pins ENABLE ROW LEVEL SECURITY;

INSERT INTO public.venue_staff_pins (venue_id, pin_hash, session_secret)
SELECT id, encode(sha256(convert_to(TRIM(staff_pin), 'UTF8')), 'hex'), md5(random()::text || clock_timestamp()::text || id::text)
FROM public.venues
WHERE staff_pin IS NOT NULL AND TRIM(staff_pin) ~ '^[0-9]{4,6}$'
ON CONFLICT (venue_id) DO NOTHING;

ALTER TABLE public.venues ALTER COLUMN staff_pin DROP NOT NULL;
UPDATE public.venues SET staff_pin = NULL WHERE staff_pin IS NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'venues' AND policyname = 'venues_select_owner_or_admin'
  ) THEN
    CREATE POLICY "venues_select_owner_or_admin"
      ON public.venues FOR SELECT TO authenticated
      USING (public.is_super_admin() OR owner_id = (SELECT auth.uid()));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'courts' AND policyname = 'courts_select_owner_or_admin'
  ) THEN
    CREATE POLICY "courts_select_owner_or_admin"
      ON public.courts FOR SELECT TO authenticated
      USING (
        public.is_super_admin()
        OR EXISTS (
          SELECT 1 FROM public.venues v
          WHERE v.id = courts.venue_id AND v.owner_id = (SELECT auth.uid())
        )
      );
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.is_venue_owner_or_admin(p_venue_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_super_admin() OR EXISTS (
    SELECT 1 FROM public.venues v
    WHERE v.id = p_venue_id AND v.owner_id = (SELECT auth.uid())
  );
$$;

CREATE OR REPLACE FUNCTION public.review_booking_receipt(
  p_receipt_id uuid,
  p_action text,
  p_adjusted_amount integer DEFAULT NULL::integer,
  p_rejection_reason text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_receipt RECORD;
  v_booking RECORD;
  v_venue_id uuid;
  v_commission integer;
  v_final_amount integer;
  v_already_deducted boolean;
  v_new_balance integer;
BEGIN
  SELECT * INTO v_receipt FROM public.receipts WHERE id = p_receipt_id FOR UPDATE;
  IF v_receipt.id IS NULL THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'بيانات الإيصال غير موجودة');
  END IF;

  SELECT b.*, c.venue_id AS c_venue_id, v.commission_per_slot AS v_comm
  INTO v_booking
  FROM public.bookings b
  JOIN public.courts c ON c.id = b.court_id
  JOIN public.venues v ON v.id = c.venue_id
  WHERE b.id = v_receipt.booking_id
  FOR UPDATE OF b;

  IF v_booking.id IS NULL THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'بيانات الحجز المرتبطة بالإيصال غير موجودة');
  END IF;

  v_venue_id := v_booking.c_venue_id;
  v_commission := COALESCE(v_booking.v_comm, 15);

  IF NOT public.is_venue_owner_or_admin(v_venue_id) THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'غير مصرح لك بمراجعة إيصالات هذا الملعب');
  END IF;

  IF v_receipt.status <> 'submitted' THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'تمت مراجعة هذا الإيصال مسبقاً');
  END IF;

  IF p_action = 'approve' THEN
    v_final_amount := GREATEST(v_booking.deposit_paid, v_receipt.amount_paid);

    UPDATE public.receipts
    SET status = 'verified',
        verified_by = (SELECT auth.uid()),
        verified_at = NOW()
    WHERE id = p_receipt_id;

    UPDATE public.bookings
    SET status = 'confirmed',
        deposit_paid = v_final_amount,
        cash_remaining = GREATEST(v_booking.total_price - v_final_amount, 0),
        locked_until = NULL
    WHERE id = v_booking.id;

    SELECT EXISTS (
      SELECT 1 FROM public.venue_wallet_transactions
      WHERE reference_id = v_booking.id AND type = 'commission_deduction'
    ) INTO v_already_deducted;

    IF NOT v_already_deducted AND v_commission > 0 THEN
      UPDATE public.venues
      SET prepaid_balance = GREATEST(0, prepaid_balance - v_commission),
          updated_at = NOW()
      WHERE id = v_venue_id
      RETURNING prepaid_balance INTO v_new_balance;

      INSERT INTO public.venue_wallet_transactions (
        venue_id, amount, balance_after, type, description, reference_id, created_by
      ) VALUES (
        v_venue_id,
        -v_commission,
        v_new_balance,
        'commission_deduction',
        'خصم عمولة حجز أونلاين مؤكد — مرجع: ' || v_booking.booking_reference,
        v_booking.id,
        (SELECT auth.uid())
      );
    END IF;

    RETURN jsonb_build_object('success', TRUE, 'action', 'approved', 'new_balance', v_new_balance);

  ELSIF p_action = 'adjust' THEN
    v_final_amount := COALESCE(p_adjusted_amount, v_receipt.amount_paid);

    UPDATE public.receipts
    SET status = 'verified',
        amount_paid = v_final_amount,
        verified_by = (SELECT auth.uid()),
        verified_at = NOW()
    WHERE id = p_receipt_id;

    UPDATE public.bookings
    SET deposit_paid = v_final_amount,
        cash_remaining = GREATEST(v_booking.total_price - v_final_amount, 0),
        status = 'confirmed',
        locked_until = NULL
    WHERE id = v_booking.id;

    SELECT EXISTS (
      SELECT 1 FROM public.venue_wallet_transactions
      WHERE reference_id = v_booking.id AND type = 'commission_deduction'
    ) INTO v_already_deducted;

    IF NOT v_already_deducted AND v_commission > 0 THEN
      UPDATE public.venues
      SET prepaid_balance = GREATEST(0, prepaid_balance - v_commission),
          updated_at = NOW()
      WHERE id = v_venue_id
      RETURNING prepaid_balance INTO v_new_balance;

      INSERT INTO public.venue_wallet_transactions (
        venue_id, amount, balance_after, type, description, reference_id, created_by
      ) VALUES (
        v_venue_id,
        -v_commission,
        v_new_balance,
        'commission_deduction',
        'خصم عمولة حجز أونلاين (بعد تسوية العربون) — مرجع: ' || v_booking.booking_reference,
        v_booking.id,
        (SELECT auth.uid())
      );
    END IF;

    RETURN jsonb_build_object(
      'success', TRUE,
      'action', 'adjusted',
      'deposit_paid', v_final_amount,
      'cash_remaining', GREATEST(v_booking.total_price - v_final_amount, 0),
      'new_balance', v_new_balance
    );

  ELSIF p_action = 'reject' THEN
    UPDATE public.receipts
    SET status = 'rejected',
        rejection_reason = COALESCE(NULLIF(TRIM(p_rejection_reason), ''), 'تم رفض إيصال التحويل لعدم صحة البيانات'),
        verified_by = (SELECT auth.uid()),
        verified_at = NOW()
    WHERE id = p_receipt_id;

    UPDATE public.bookings
    SET status = 'cancelled',
        cancellation_reason = COALESCE(NULLIF(TRIM(p_rejection_reason), ''), 'تم رفض إيصال التحويل لعدم صحة البيانات'),
        locked_until = NULL
    WHERE id = v_booking.id;

    RETURN jsonb_build_object('success', TRUE, 'action', 'rejected');

  ELSE
    RETURN jsonb_build_object('success', FALSE, 'error', 'إجراء مراجعة غير معروف');
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_walkin_booking(
  p_court_id uuid,
  p_booking_date date,
  p_start_time time without time zone,
  p_end_time time without time zone,
  p_booker_name text,
  p_booker_phone character varying,
  p_total_price integer,
  p_amount_paid integer DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_venue_id uuid;
  v_booking_ref VARCHAR(24);
  v_booking_id UUID;
  v_existing_id UUID;
BEGIN
  SELECT venue_id INTO v_venue_id FROM public.courts WHERE id = p_court_id;
  IF v_venue_id IS NULL THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'الملعب الفرعي غير موجود');
  END IF;

  IF NOT public.is_venue_owner_or_admin(v_venue_id) THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'غير مصرح لك بإدارة حجوزات هذا الملعب');
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
      'error', 'هذا الميعاد محجوز بالفعل أو معلق أونلاين ولا يمكن قفله كاش حالياً'
    );
  END IF;

  v_booking_ref := 'WALK-' || TO_CHAR(p_booking_date, 'YYYYMMDD') || '-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 4));

  INSERT INTO public.bookings (
    booking_reference, court_id, booker_name, booker_phone,
    booking_date, start_time, end_time, total_price,
    deposit_required, deposit_paid, cash_remaining, status, is_walkin, locked_until
  ) VALUES (
    v_booking_ref, p_court_id, p_booker_name, p_booker_phone,
    p_booking_date, p_start_time, p_end_time, p_total_price,
    0, p_amount_paid, GREATEST(p_total_price - p_amount_paid, 0),
    'confirmed', TRUE, NULL
  )
  RETURNING id INTO v_booking_id;

  RETURN jsonb_build_object('success', TRUE, 'booking_id', v_booking_id, 'booking_reference', v_booking_ref);
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_venue_booking(
  p_booking_id uuid,
  p_cancellation_reason text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking RECORD;
BEGIN
  SELECT b.*, c.venue_id AS c_venue_id
  INTO v_booking
  FROM public.bookings b
  JOIN public.courts c ON c.id = b.court_id
  WHERE b.id = p_booking_id
  FOR UPDATE OF b;

  IF v_booking.id IS NULL THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'بيانات الحجز غير موجودة');
  END IF;

  IF NOT public.is_venue_owner_or_admin(v_booking.c_venue_id) THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'غير مصرح لك بإلغاء حجوزات هذا الملعب');
  END IF;

  UPDATE public.bookings
  SET status = 'cancelled',
      cancellation_reason = COALESCE(NULLIF(TRIM(p_cancellation_reason), ''), 'تم الإلغاء بواسطة إدارة الملعب'),
      locked_until = NULL
  WHERE id = p_booking_id;

  RETURN jsonb_build_object('success', TRUE, 'booking_id', p_booking_id, 'booking_reference', v_booking.booking_reference);
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_booking_attendance(p_booking_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking RECORD;
BEGIN
  SELECT b.*, c.venue_id AS c_venue_id
  INTO v_booking
  FROM public.bookings b
  JOIN public.courts c ON c.id = b.court_id
  WHERE b.id = p_booking_id
  FOR UPDATE OF b;

  IF v_booking.id IS NULL THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'الحجز غير موجود');
  END IF;

  IF NOT public.is_venue_owner_or_admin(v_booking.c_venue_id) THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'غير مصرح لك بتحديث حضور هذا الملعب');
  END IF;

  UPDATE public.bookings
  SET status = 'completed',
      deposit_paid = total_price,
      cash_remaining = 0,
      locked_until = NULL
  WHERE id = p_booking_id;

  RETURN jsonb_build_object('success', TRUE, 'status', 'completed');
END;
$$;

CREATE OR REPLACE FUNCTION public.toggle_court_maintenance(p_court_id uuid, p_is_active boolean)
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
    RETURN jsonb_build_object('success', FALSE, 'error', 'الملعب الفرعي غير موجود');
  END IF;

  IF NOT public.is_venue_owner_or_admin(v_venue_id) THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'غير مصرح لك بتعديل حالة الصيانة لهذا الملعب');
  END IF;

  UPDATE public.courts SET is_active = p_is_active, updated_at = NOW() WHERE id = p_court_id;
  RETURN jsonb_build_object('success', TRUE, 'is_active', p_is_active);
END;
$$;

CREATE OR REPLACE FUNCTION public.update_venue_wallets(
  p_venue_id uuid,
  p_instapay_address text DEFAULT NULL::text,
  p_vodafone_cash_number text DEFAULT NULL::text,
  p_backup_wallet_number text DEFAULT NULL::text,
  p_deposit_amount integer DEFAULT NULL::integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_venue_owner_or_admin(p_venue_id) THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'غير مصرح لك بتحديث محافظ هذا الملعب');
  END IF;

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
$$;

CREATE OR REPLACE FUNCTION public.submit_venue_recharge(
  p_venue_id uuid,
  p_amount integer,
  p_receipt_url text,
  p_ref_number text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_id uuid;
BEGIN
  IF NOT public.is_venue_owner_or_admin(p_venue_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'غير مصرح لك بطلب شحن لهذا الملعب');
  END IF;

  IF COALESCE(p_amount, 0) < 50 THEN
    RETURN jsonb_build_object('success', false, 'error', 'الحد الأدنى لطلب شحن المحفظة هو 50 ج.م');
  END IF;

  IF NULLIF(TRIM(COALESCE(p_receipt_url, '')), '') IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'يرجى إرفاق صورة إيصال التحويل');
  END IF;

  INSERT INTO public.venue_recharge_requests (
    venue_id, amount, receipt_url, reference_number, status
  ) VALUES (
    p_venue_id, p_amount, TRIM(p_receipt_url), NULLIF(TRIM(COALESCE(p_ref_number, '')), ''), 'pending'
  )
  RETURNING id INTO v_new_id;

  RETURN jsonb_build_object('success', true, 'id', v_new_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.owner_get_venue_wallet_details(p_venue_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_venue RECORD;
  v_has_pin boolean;
  v_tx jsonb;
  v_recharges jsonb;
BEGIN
  IF NOT public.is_venue_owner_or_admin(p_venue_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'غير مصرح لك بالوصول لبيانات محفظة هذا الملعب');
  END IF;

  SELECT id, name, prepaid_balance, commission_per_slot, is_active
  INTO v_venue
  FROM public.venues
  WHERE id = p_venue_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'الملعب غير موجود');
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.venue_staff_pins WHERE venue_id = p_venue_id
  ) INTO v_has_pin;

  SELECT COALESCE(jsonb_agg(to_jsonb(tx) ORDER BY tx.created_at DESC), '[]'::jsonb)
  INTO v_tx
  FROM (
    SELECT id, amount, balance_after, type, description, created_at
    FROM public.venue_wallet_transactions
    WHERE venue_id = p_venue_id
    ORDER BY created_at DESC
    LIMIT 40
  ) tx;

  SELECT COALESCE(jsonb_agg(to_jsonb(rr) ORDER BY rr.created_at DESC), '[]'::jsonb)
  INTO v_recharges
  FROM (
    SELECT id, amount, reference_number, status, admin_notes, receipt_url, created_at
    FROM public.venue_recharge_requests
    WHERE venue_id = p_venue_id
    ORDER BY created_at DESC
    LIMIT 20
  ) rr;

  RETURN jsonb_build_object(
    'success', true,
    'prepaid_balance', v_venue.prepaid_balance,
    'commission_per_slot', COALESCE(v_venue.commission_per_slot, 15),
    'is_active', v_venue.is_active,
    'has_staff_pin', v_has_pin,
    'transactions', v_tx,
    'recharges', v_recharges
  );
END;
$$;

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

  INSERT INTO public.venue_staff_pins (venue_id, pin_hash, session_secret, updated_at)
  VALUES (p_venue_id, v_hash, v_secret, now())
  ON CONFLICT (venue_id) DO UPDATE
    SET pin_hash = EXCLUDED.pin_hash,
        session_secret = EXCLUDED.session_secret,
        updated_at = now();

  RETURN jsonb_build_object('success', true, 'has_pin', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.staff_list_active_venues()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(jsonb_agg(to_jsonb(v_row) ORDER BY v_row.name ASC), '[]'::jsonb)
  FROM (
    SELECT v.id, v.name, v.district
    FROM public.venues v
    JOIN public.venue_staff_pins sp ON sp.venue_id = v.id
    WHERE v.is_active = true
  ) v_row;
$$;

CREATE OR REPLACE FUNCTION public.staff_verify_pin(p_venue_id uuid, p_pin text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pin text := TRIM(COALESCE(p_pin, ''));
  v_hash text;
  v_row RECORD;
BEGIN
  IF v_pin !~ '^[0-9]{4,6}$' THEN
    RETURN jsonb_build_object('success', false, 'error', 'رمز PIN غير صحيح');
  END IF;

  v_hash := encode(sha256(convert_to(v_pin, 'UTF8')), 'hex');

  SELECT v.id, v.name, v.district, sp.pin_hash, sp.session_secret
  INTO v_row
  FROM public.venues v
  JOIN public.venue_staff_pins sp ON sp.venue_id = v.id
  WHERE v.id = p_venue_id AND v.is_active = true;

  IF NOT FOUND OR v_row.pin_hash <> v_hash THEN
    RETURN jsonb_build_object('success', false, 'error', 'رمز الدخول غير صحيح أو تم إيقاف صلاحية الاستقبال لهذا الملعب');
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'venue_id', v_row.id,
    'venue_name', v_row.name,
    'venue_district', v_row.district,
    'session_secret', v_row.session_secret
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.staff_get_schedule(
  p_venue_id uuid,
  p_secret text,
  p_date date
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_venue RECORD;
  v_courts jsonb;
  v_bookings jsonb;
BEGIN
  PERFORM public.release_expired_booking_locks();

  SELECT v.id, v.name, v.district, v.opening_time, v.closing_time
  INTO v_venue
  FROM public.venues v
  JOIN public.venue_staff_pins sp ON sp.venue_id = v.id
  WHERE v.id = p_venue_id AND sp.session_secret = p_secret AND v.is_active = true;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'UNAUTHORIZED_STAFF_SESSION');
  END IF;

  SELECT COALESCE(jsonb_agg(to_jsonb(c_row) ORDER BY c_row.name ASC), '[]'::jsonb)
  INTO v_courts
  FROM (
    SELECT id, name, sport, surface, slot_duration_minutes, price_morning, price_evening, peak_hour_start, is_active
    FROM public.courts
    WHERE venue_id = p_venue_id
  ) c_row;

  SELECT COALESCE(jsonb_agg(to_jsonb(b_row) ORDER BY b_row.start_time ASC), '[]'::jsonb)
  INTO v_bookings
  FROM (
    SELECT
      b.id, b.booking_reference, b.court_id, b.booker_name, b.booker_phone,
      b.booking_date, b.start_time, b.end_time, b.cash_remaining, b.status,
      b.is_walkin, b.locked_until
    FROM public.bookings b
    JOIN public.courts c ON c.id = b.court_id
    WHERE c.venue_id = p_venue_id
      AND b.booking_date = p_date
      AND b.status <> 'cancelled'
  ) b_row;

  RETURN jsonb_build_object(
    'success', true,
    'venue', jsonb_build_object(
      'id', v_venue.id,
      'name', v_venue.name,
      'district', v_venue.district,
      'opening_time', v_venue.opening_time,
      'closing_time', v_venue.closing_time
    ),
    'courts', v_courts,
    'bookings', v_bookings
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.staff_create_walkin(
  p_venue_id uuid,
  p_secret text,
  p_court_id uuid,
  p_booking_date date,
  p_start_time time without time zone,
  p_end_time time without time zone,
  p_booker_name text,
  p_booker_phone character varying,
  p_amount_paid integer DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_court RECORD;
  v_existing_id uuid;
  v_total_price integer;
  v_paid integer;
  v_booking_ref varchar(24);
  v_booking_id uuid;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.venue_staff_pins sp
    JOIN public.venues v ON v.id = sp.venue_id
    WHERE sp.venue_id = p_venue_id AND sp.session_secret = p_secret AND v.is_active = true
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'UNAUTHORIZED_STAFF_SESSION');
  END IF;

  SELECT * INTO v_court FROM public.courts WHERE id = p_court_id AND venue_id = p_venue_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'الملعب الفرعي لا ينتمي لهذا النادي');
  END IF;

  IF NOT v_court.is_active THEN
    RETURN jsonb_build_object('success', false, 'error', 'هذا الملعب مغلق للصيانة حالياً');
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
    RETURN jsonb_build_object('success', false, 'error', 'هذا الميعاد محجوز بالفعل ولا يمكن قفله كاش');
  END IF;

  IF p_start_time >= v_court.peak_hour_start OR p_start_time < '05:00:00'::time THEN
    v_total_price := v_court.price_evening;
  ELSE
    v_total_price := v_court.price_morning;
  END IF;

  v_paid := LEAST(GREATEST(COALESCE(p_amount_paid, 0), 0), v_total_price);
  v_booking_ref := 'WALK-' || TO_CHAR(p_booking_date, 'YYYYMMDD') || '-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 4));

  INSERT INTO public.bookings (
    booking_reference, court_id, booker_name, booker_phone,
    booking_date, start_time, end_time, total_price,
    deposit_required, deposit_paid, cash_remaining, status, is_walkin, locked_until
  ) VALUES (
    v_booking_ref, p_court_id, COALESCE(NULLIF(TRIM(p_booker_name), ''), 'حجز كاش'), TRIM(p_booker_phone),
    p_booking_date, p_start_time, p_end_time, v_total_price,
    0, v_paid, GREATEST(v_total_price - v_paid, 0),
    'confirmed', TRUE, NULL
  )
  RETURNING id INTO v_booking_id;

  RETURN jsonb_build_object('success', true, 'booking_id', v_booking_id, 'booking_reference', v_booking_ref);
END;
$$;

CREATE OR REPLACE FUNCTION public.staff_complete_attendance(
  p_venue_id uuid,
  p_secret text,
  p_booking_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking RECORD;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.venue_staff_pins sp
    WHERE sp.venue_id = p_venue_id AND sp.session_secret = p_secret
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'UNAUTHORIZED_STAFF_SESSION');
  END IF;

  SELECT b.* INTO v_booking
  FROM public.bookings b
  JOIN public.courts c ON c.id = b.court_id
  WHERE b.id = p_booking_id AND c.venue_id = p_venue_id
  FOR UPDATE OF b;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'الحجز غير موجود في هذا الملعب');
  END IF;

  UPDATE public.bookings
  SET status = 'completed',
      deposit_paid = total_price,
      cash_remaining = 0,
      locked_until = NULL
  WHERE id = p_booking_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.staff_cancel_booking(
  p_venue_id uuid,
  p_secret text,
  p_booking_id uuid,
  p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking RECORD;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.venue_staff_pins sp
    WHERE sp.venue_id = p_venue_id AND sp.session_secret = p_secret
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'UNAUTHORIZED_STAFF_SESSION');
  END IF;

  SELECT b.* INTO v_booking
  FROM public.bookings b
  JOIN public.courts c ON c.id = b.court_id
  WHERE b.id = p_booking_id AND c.venue_id = p_venue_id
  FOR UPDATE OF b;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'الحجز غير موجود في هذا الملعب');
  END IF;

  UPDATE public.bookings
  SET status = 'cancelled',
      cancellation_reason = COALESCE(NULLIF(TRIM(p_reason), ''), 'تم الإلغاء من بوابة موظف الاستقبال'),
      locked_until = NULL
  WHERE id = p_booking_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.is_venue_owner_or_admin(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_venue_owner_or_admin(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.review_booking_receipt(uuid, text, integer, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.create_walkin_booking(uuid, date, time, time, text, character varying, integer, integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.cancel_venue_booking(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.complete_booking_attendance(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.toggle_court_maintenance(uuid, boolean) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.update_venue_wallets(uuid, text, text, text, integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.submit_venue_recharge(uuid, integer, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.owner_get_venue_wallet_details(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.owner_set_staff_pin(uuid, text) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.review_booking_receipt(uuid, text, integer, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_walkin_booking(uuid, date, time, time, text, character varying, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_venue_booking(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_booking_attendance(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.toggle_court_maintenance(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_venue_wallets(uuid, text, text, text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_venue_recharge(uuid, integer, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.owner_get_venue_wallet_details(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.owner_set_staff_pin(uuid, text) TO authenticated;

GRANT EXECUTE ON FUNCTION public.staff_list_active_venues() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.staff_verify_pin(uuid, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.staff_get_schedule(uuid, text, date) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.staff_create_walkin(uuid, text, uuid, date, time, time, text, character varying, integer) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.staff_complete_attendance(uuid, text, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.staff_cancel_booking(uuid, text, uuid, text) TO anon, authenticated;
