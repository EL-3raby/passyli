-- =====================================================================
-- باصيلي (Passyli) — Phase 9 Enhancements:
-- 1. Lock down obsolete legacy RPCs (approve_partner_application, approve_venue_recharge)
-- 2. Extend admin_get_dashboard_overview with low-balance/dispute counts, duplicate ref detection, & 7-day trend
-- 3. Add admin_get_bookings_feed & admin_resolve_booking_dispute RPCs
-- 4. Enable Realtime on public.receipts
-- =====================================================================

REVOKE EXECUTE ON FUNCTION public.approve_partner_application(uuid, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.approve_venue_recharge(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.admin_get_dashboard_overview()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today date := (NOW() AT TIME ZONE 'Africa/Cairo')::date;
  v_stats jsonb;
  v_apps jsonb;
  v_venues jsonb;
  v_recharges jsonb;
  v_transactions jsonb;
  v_users jsonb;
  v_blacklist jsonb;
  v_trend jsonb;
BEGIN
  IF NOT public.is_super_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'غير مصرح لك بالوصول للوحة المشرف');
  END IF;

  SELECT jsonb_build_object(
    'total_venues', (SELECT COUNT(*) FROM public.venues),
    'active_venues', (SELECT COUNT(*) FROM public.venues WHERE is_active = true),
    'low_balance_venues', (SELECT COUNT(*) FROM public.venues WHERE is_active = true AND prepaid_balance <= 30),
    'unlinked_venues', (SELECT COUNT(*) FROM public.venues WHERE owner_id IS NULL),
    'pending_applications', (SELECT COUNT(*) FROM public.partner_applications WHERE status = 'pending'),
    'pending_recharges', (SELECT COUNT(*) FROM public.venue_recharge_requests WHERE status = 'pending'),
    'pending_receipt_bookings', (
      SELECT COUNT(DISTINCT r.booking_id)
      FROM public.receipts r
      JOIN public.bookings b ON b.id = r.booking_id
      WHERE r.status = 'submitted' AND b.status = 'pending_payment'
    ),
    'active_locked_bookings', (
      SELECT COUNT(*) FROM public.bookings
      WHERE status = 'pending_payment' AND locked_until > now()
    ),
    'total_bookings', (SELECT COUNT(*) FROM public.bookings WHERE status IN ('confirmed', 'completed')),
    'today_bookings', (SELECT COUNT(*) FROM public.bookings WHERE booking_date = v_today AND status IN ('confirmed', 'completed')),
    'confirmed_revenue', (SELECT COALESCE(SUM(total_price), 0) FROM public.bookings WHERE status IN ('confirmed', 'completed')),
    'total_commission_earned', (
      SELECT COALESCE(SUM(ABS(amount)), 0) FROM public.venue_wallet_transactions WHERE type = 'commission_deduction'
    ),
    'total_wallet_balances', (SELECT COALESCE(SUM(prepaid_balance), 0) FROM public.venues),
    'total_players', (SELECT COUNT(*) FROM public.profiles WHERE role = 'player'),
    'blacklist_count', (SELECT COUNT(*) FROM public.fraud_blacklist)
  ) INTO v_stats;

  SELECT COALESCE(jsonb_agg(to_jsonb(pa) ORDER BY (pa.status = 'pending') DESC, pa.created_at DESC), '[]'::jsonb)
  INTO v_apps FROM public.partner_applications pa;

  SELECT COALESCE(jsonb_agg(to_jsonb(vn) ORDER BY vn.created_at DESC), '[]'::jsonb)
  INTO v_venues
  FROM (
    SELECT
      v.id, v.name, v.slug, v.city, v.district, v.address, v.phone, v.whatsapp_number,
      v.deposit_amount, v.prepaid_balance, v.commission_per_slot, v.is_active, v.is_verified,
      v.owner_id, v.created_at,
      p.full_name AS owner_name, p.email AS owner_email, p.phone AS owner_phone,
      (SELECT COUNT(*) FROM public.courts c WHERE c.venue_id = v.id) AS courts_count,
      (SELECT COUNT(*) FROM public.bookings b JOIN public.courts c ON c.id = b.court_id WHERE c.venue_id = v.id AND b.status IN ('confirmed', 'completed')) AS bookings_count
    FROM public.venues v
    LEFT JOIN public.profiles p ON p.id = v.owner_id
  ) vn;

  SELECT COALESCE(jsonb_agg(to_jsonb(rr) ORDER BY (rr.status = 'pending') DESC, rr.created_at DESC), '[]'::jsonb)
  INTO v_recharges
  FROM (
    SELECT r.id, r.venue_id, v.name AS venue_name, v.prepaid_balance AS current_balance,
      r.amount, r.receipt_url, r.reference_number, r.status, r.admin_notes, r.created_at,
      (
        SELECT COUNT(*)
        FROM public.venue_recharge_requests r2
        WHERE r2.id <> r.id
          AND r.reference_number IS NOT NULL
          AND TRIM(r.reference_number) <> ''
          AND r2.reference_number IS NOT NULL
          AND LOWER(TRIM(r2.reference_number)) = LOWER(TRIM(r.reference_number))
      ) AS duplicate_ref_count
    FROM public.venue_recharge_requests r
    JOIN public.venues v ON v.id = r.venue_id
  ) rr;

  SELECT COALESCE(jsonb_agg(to_jsonb(tx) ORDER BY tx.created_at DESC), '[]'::jsonb)
  INTO v_transactions
  FROM (
    SELECT t.id, t.venue_id, v.name AS venue_name, t.amount, t.balance_after, t.type, t.description, t.created_at
    FROM public.venue_wallet_transactions t
    JOIN public.venues v ON v.id = t.venue_id
    ORDER BY t.created_at DESC
    LIMIT 150
  ) tx;

  SELECT COALESCE(jsonb_agg(to_jsonb(pr) ORDER BY pr.created_at DESC), '[]'::jsonb)
  INTO v_users
  FROM (
    SELECT u.id, u.full_name, u.email, u.phone, u.role, u.preferred_position, u.avatar_url, u.created_at,
      (SELECT COUNT(*) FROM public.bookings b WHERE b.booker_id = u.id) AS bookings_count
    FROM public.profiles u
  ) pr;

  SELECT COALESCE(jsonb_agg(to_jsonb(bl) ORDER BY bl.created_at DESC), '[]'::jsonb)
  INTO v_blacklist FROM public.fraud_blacklist bl;

  SELECT COALESCE(jsonb_agg(to_jsonb(tr) ORDER BY tr.day ASC), '[]'::jsonb)
  INTO v_trend
  FROM (
    SELECT
      d.day::date AS day,
      COALESCE(COUNT(b.id), 0) AS bookings_count,
      COALESCE(SUM(b.total_price), 0) AS revenue
    FROM generate_series(v_today - 6, v_today, '1 day'::interval) AS d(day)
    LEFT JOIN public.bookings b
      ON b.booking_date = d.day::date
      AND b.status IN ('confirmed', 'completed')
    GROUP BY d.day::date
  ) tr;

  RETURN jsonb_build_object(
    'success', true,
    'stats', v_stats,
    'applications', v_apps,
    'venues', v_venues,
    'recharge_requests', v_recharges,
    'wallet_transactions', v_transactions,
    'users', v_users,
    'blacklist', v_blacklist,
    'daily_trend', v_trend
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_get_bookings_feed(
  p_search text DEFAULT NULL,
  p_status text DEFAULT NULL,
  p_limit integer DEFAULT 80
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_search text := NULLIF(TRIM(COALESCE(p_search, '')), '');
  v_status text := NULLIF(TRIM(COALESCE(p_status, '')), '');
  v_lim integer := LEAST(GREATEST(COALESCE(p_limit, 80), 1), 200);
  v_items jsonb;
BEGIN
  IF NOT public.is_super_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'غير مصرح لك بالوصول لسجل الحجوزات');
  END IF;

  SELECT COALESCE(jsonb_agg(to_jsonb(row_item)), '[]'::jsonb)
  INTO v_items
  FROM (
    SELECT
      b.id,
      b.booking_reference,
      b.booker_name,
      b.booker_phone,
      b.booking_date,
      b.start_time,
      b.end_time,
      b.status,
      b.total_price,
      b.deposit_required,
      b.deposit_paid,
      b.cash_remaining,
      b.is_walkin,
      b.locked_until,
      b.cancellation_reason,
      b.created_at,
      c.name AS court_name,
      c.sport,
      v.id AS venue_id,
      v.name AS venue_name,
      v.whatsapp_number AS venue_whatsapp,
      rec.id AS receipt_id,
      rec.status AS receipt_status,
      rec.image_url AS receipt_image_url,
      rec.reference_number AS receipt_reference,
      rec.payment_method AS receipt_payment_method,
      rec.sender_phone AS receipt_sender_phone,
      rec.amount_paid AS receipt_amount_paid,
      rec.rejection_reason AS receipt_rejection_reason
    FROM public.bookings b
    JOIN public.courts c ON c.id = b.court_id
    JOIN public.venues v ON v.id = c.venue_id
    LEFT JOIN LATERAL (
      SELECT r.id, r.status, r.image_url, r.reference_number, r.payment_method, r.sender_phone, r.amount_paid, r.rejection_reason
      FROM public.receipts r
      WHERE r.booking_id = b.id
      ORDER BY r.created_at DESC
      LIMIT 1
    ) rec ON true
    WHERE (
      v_search IS NULL
      OR b.booking_reference ILIKE '%' || v_search || '%'
      OR b.booker_phone ILIKE '%' || v_search || '%'
      OR b.booker_name ILIKE '%' || v_search || '%'
      OR v.name ILIKE '%' || v_search || '%'
      OR COALESCE(rec.reference_number, '') ILIKE '%' || v_search || '%'
    )
    AND (
      v_status IS NULL
      OR v_status = 'all'
      OR (v_status = 'pending_receipt' AND b.status = 'pending_payment' AND rec.status = 'submitted')
      OR (v_status = 'locked' AND b.status = 'pending_payment' AND b.locked_until > now())
      OR (v_status IN ('pending_payment', 'confirmed', 'completed', 'cancelled', 'expired') AND b.status::text = v_status)
    )
    ORDER BY
      (b.status = 'pending_payment' AND rec.status = 'submitted') DESC,
      (b.status = 'pending_payment' AND b.locked_until > now()) DESC,
      b.created_at DESC
    LIMIT v_lim
  ) row_item;

  RETURN jsonb_build_object('success', true, 'bookings', v_items);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_resolve_booking_dispute(
  p_booking_id uuid,
  p_action text,
  p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking RECORD;
  v_venue_id uuid;
  v_commission integer;
  v_new_balance integer;
  v_already_deducted boolean;
BEGIN
  IF NOT public.is_super_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'غير مصرح لك بتنفيذ هذا الإجراء');
  END IF;

  SELECT b.*, c.venue_id AS c_venue_id, v.commission_per_slot AS v_commission
  INTO v_booking
  FROM public.bookings b
  JOIN public.courts c ON c.id = b.court_id
  JOIN public.venues v ON v.id = c.venue_id
  WHERE b.id = p_booking_id
  FOR UPDATE OF b;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'الحجز غير موجود');
  END IF;

  v_venue_id := v_booking.c_venue_id;
  v_commission := COALESCE(v_booking.v_commission, 15);

  IF p_action = 'release_lock' THEN
    IF v_booking.status <> 'pending_payment' THEN
      RETURN jsonb_build_object('success', false, 'error', 'يمكن تحرير القفل للحجوزات المعلقة للدفع فقط');
    END IF;

    UPDATE public.bookings
    SET status = 'cancelled',
        locked_until = NULL,
        locked_by_session = NULL,
        cancellation_reason = COALESCE(NULLIF(TRIM(p_reason), ''), 'تحرير قفل إداري من المشرف العام'),
        updated_at = now()
    WHERE id = p_booking_id;

    RETURN jsonb_build_object('success', true);

  ELSIF p_action = 'force_confirm' THEN
    IF v_booking.status NOT IN ('pending_payment', 'expired') THEN
      RETURN jsonb_build_object('success', false, 'error', 'لا يمكن تأكيد هذا الحجز في حالته الحالية');
    END IF;

    UPDATE public.bookings
    SET status = 'confirmed',
        locked_until = NULL,
        locked_by_session = NULL,
        deposit_paid = GREATEST(v_booking.deposit_paid, v_booking.deposit_required),
        cash_remaining = GREATEST(0, v_booking.total_price - GREATEST(v_booking.deposit_paid, v_booking.deposit_required)),
        updated_at = now()
    WHERE id = p_booking_id;

    UPDATE public.receipts
    SET status = 'verified',
        verified_by = (SELECT auth.uid()),
        verified_at = now()
    WHERE booking_id = p_booking_id AND status IN ('submitted', 'pending');

    SELECT EXISTS (
      SELECT 1 FROM public.venue_wallet_transactions
      WHERE reference_id = p_booking_id AND type = 'commission_deduction'
    ) INTO v_already_deducted;

    IF NOT v_already_deducted AND v_commission > 0 THEN
      UPDATE public.venues
      SET prepaid_balance = GREATEST(0, prepaid_balance - v_commission),
          updated_at = now()
      WHERE id = v_venue_id
      RETURNING prepaid_balance INTO v_new_balance;

      INSERT INTO public.venue_wallet_transactions (venue_id, amount, balance_after, type, description, reference_id, created_by)
      VALUES (
        v_venue_id,
        -v_commission,
        v_new_balance,
        'commission_deduction',
        'خصم عمولة حجز مؤكد إدارياً — مرجع: ' || v_booking.booking_reference,
        p_booking_id,
        (SELECT auth.uid())
      );
    END IF;

    RETURN jsonb_build_object('success', true);

  ELSIF p_action = 'admin_cancel' THEN
    IF v_booking.status = 'cancelled' THEN
      RETURN jsonb_build_object('success', false, 'error', 'الحجز ملغى بالفعل');
    END IF;

    UPDATE public.bookings
    SET status = 'cancelled',
        locked_until = NULL,
        locked_by_session = NULL,
        cancellation_reason = COALESCE(NULLIF(TRIM(p_reason), ''), 'إلغاء إداري من المشرف العام'),
        updated_at = now()
    WHERE id = p_booking_id;

    UPDATE public.receipts
    SET status = 'rejected',
        rejection_reason = COALESCE(NULLIF(TRIM(p_reason), ''), 'تم إلغاء الحجز إدارياً'),
        verified_by = (SELECT auth.uid()),
        verified_at = now()
    WHERE booking_id = p_booking_id AND status = 'submitted';

    RETURN jsonb_build_object('success', true);

  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'إجراء غير معروف');
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_get_bookings_feed(text, text, integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_resolve_booking_dispute(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_bookings_feed(text, text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_resolve_booking_dispute(uuid, text, text) TO authenticated;

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.receipts;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;
