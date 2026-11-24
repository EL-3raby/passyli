-- =====================================================================
-- باصيلي (Passyli) — Phase 9: Super Admin Dashboard & Wallet Ledger
-- =====================================================================

-- 1. Wallet Transactions Ledger
CREATE TABLE IF NOT EXISTS public.venue_wallet_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id uuid NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  amount integer NOT NULL,
  balance_after integer NOT NULL,
  type text NOT NULL CHECK (type IN ('welcome_bonus', 'recharge', 'commission_deduction', 'admin_adjustment')),
  description text NOT NULL,
  reference_id uuid,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wallet_tx_venue_created
  ON public.venue_wallet_transactions(venue_id, created_at DESC);

ALTER TABLE public.venue_wallet_transactions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='venue_wallet_transactions' AND policyname='wallet_tx_select_admin_or_owner') THEN
    CREATE POLICY "wallet_tx_select_admin_or_owner" ON public.venue_wallet_transactions FOR SELECT TO authenticated
      USING (
        public.is_super_admin()
        OR EXISTS (SELECT 1 FROM public.venues v WHERE v.id = venue_id AND v.owner_id = (SELECT auth.uid()))
      );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='venue_wallet_transactions' AND policyname='wallet_tx_insert_admin') THEN
    CREATE POLICY "wallet_tx_insert_admin" ON public.venue_wallet_transactions FOR INSERT TO authenticated
      WITH CHECK (public.is_super_admin());
  END IF;
END $$;

-- 2. Super Admin RPCs (strictly guarded by is_super_admin())
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
BEGIN
  IF NOT public.is_super_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'غير مصرح لك بالوصول للوحة المشرف');
  END IF;

  SELECT jsonb_build_object(
    'total_venues', (SELECT COUNT(*) FROM public.venues),
    'active_venues', (SELECT COUNT(*) FROM public.venues WHERE is_active = true),
    'pending_applications', (SELECT COUNT(*) FROM public.partner_applications WHERE status = 'pending'),
    'pending_recharges', (SELECT COUNT(*) FROM public.venue_recharge_requests WHERE status = 'pending'),
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
      r.amount, r.receipt_url, r.reference_number, r.status, r.admin_notes, r.created_at
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
    LIMIT 60
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

  RETURN jsonb_build_object(
    'success', true,
    'stats', v_stats,
    'applications', v_apps,
    'venues', v_venues,
    'recharge_requests', v_recharges,
    'wallet_transactions', v_transactions,
    'users', v_users,
    'blacklist', v_blacklist
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_approve_partner_application(
  p_app_id uuid,
  p_welcome_credit integer DEFAULT 150,
  p_commission_per_slot integer DEFAULT 15,
  p_owner_email text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_app RECORD;
  v_new_venue_id uuid;
  v_owner_id uuid;
  v_slug text;
  v_credit integer := GREATEST(COALESCE(p_welcome_credit, 150), 0);
  v_comm integer := GREATEST(COALESCE(p_commission_per_slot, 15), 0);
  i integer;
BEGIN
  IF NOT public.is_super_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'غير مصرح لك بتنفيذ هذا الإجراء');
  END IF;

  SELECT * INTO v_app FROM public.partner_applications WHERE id = p_app_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'الطلب غير موجود');
  END IF;
  IF v_app.status = 'approved' THEN
    RETURN jsonb_build_object('success', false, 'error', 'تم اعتماد هذا الطلب مسبقاً');
  END IF;

  IF p_owner_email IS NOT NULL AND TRIM(p_owner_email) <> '' THEN
    SELECT id INTO v_owner_id FROM public.profiles WHERE LOWER(email) = LOWER(TRIM(p_owner_email)) LIMIT 1;
    IF v_owner_id IS NOT NULL THEN
      UPDATE public.profiles SET role = 'venue_owner', updated_at = now() WHERE id = v_owner_id AND role = 'player';
    END IF;
  END IF;

  v_slug := 'venue-' || floor(random() * 89999 + 10000)::text;

  INSERT INTO public.venues (
    owner_id, name, slug, city, district, address, phone, whatsapp_number,
    deposit_amount, prepaid_balance, commission_per_slot, is_active, is_verified
  ) VALUES (
    v_owner_id, v_app.venue_name, v_slug, v_app.city, v_app.district, v_app.address,
    v_app.phone, v_app.whatsapp_number, 100, v_credit, v_comm, true, true
  ) RETURNING id INTO v_new_venue_id;

  FOR i IN 1..GREATEST(v_app.courts_count, 1) LOOP
    INSERT INTO public.courts (
      venue_id, name, sport, surface, price_morning, price_evening, slot_duration_minutes, is_active
    ) VALUES (
      v_new_venue_id,
      'ملعب ' || i,
      CASE WHEN 'padel' = ANY(v_app.sports) THEN 'padel'::sport_type ELSE 'football'::sport_type END,
      CASE WHEN 'padel' = ANY(v_app.sports) THEN 'panoramic_glass'::surface_type ELSE 'turf_3g'::surface_type END,
      v_app.base_price_morning,
      v_app.base_price_evening,
      CASE WHEN 'padel' = ANY(v_app.sports) THEN 90 ELSE 60 END,
      true
    );
  END LOOP;

  IF v_credit > 0 THEN
    INSERT INTO public.venue_wallet_transactions (venue_id, amount, balance_after, type, description, reference_id, created_by)
    VALUES (v_new_venue_id, v_credit, v_credit, 'welcome_bonus', 'رصيد ترحيبي تجريبي عند تفعيل الملعب', p_app_id, (SELECT auth.uid()));
  END IF;

  UPDATE public.partner_applications
  SET status = 'approved', welcome_credit = v_credit, updated_at = now()
  WHERE id = p_app_id;

  RETURN jsonb_build_object('success', true, 'venue_id', v_new_venue_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_reject_partner_application(p_app_id uuid, p_admin_notes text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_super_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'غير مصرح لك بتنفيذ هذا الإجراء');
  END IF;

  UPDATE public.partner_applications
  SET status = 'rejected', admin_notes = COALESCE(NULLIF(TRIM(p_admin_notes), ''), 'لم يستوفِ البيانات المطلوبة'), updated_at = now()
  WHERE id = p_app_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_update_venue_settings(
  p_venue_id uuid,
  p_is_active boolean DEFAULT NULL,
  p_is_verified boolean DEFAULT NULL,
  p_commission_per_slot integer DEFAULT NULL,
  p_owner_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_super_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'غير مصرح لك بتنفيذ هذا الإجراء');
  END IF;

  UPDATE public.venues
  SET
    is_active = COALESCE(p_is_active, is_active),
    is_verified = COALESCE(p_is_verified, is_verified),
    commission_per_slot = COALESCE(GREATEST(p_commission_per_slot, 0), commission_per_slot),
    owner_id = COALESCE(p_owner_id, owner_id),
    updated_at = now()
  WHERE id = p_venue_id;

  IF p_owner_id IS NOT NULL THEN
    UPDATE public.profiles SET role = 'venue_owner', updated_at = now()
    WHERE id = p_owner_id AND role = 'player';
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_adjust_venue_balance(p_venue_id uuid, p_delta integer, p_reason text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_balance integer;
BEGIN
  IF NOT public.is_super_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'غير مصرح لك بتنفيذ هذا الإجراء');
  END IF;

  IF p_delta = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'أدخل قيمة تعديل غير صفرية');
  END IF;

  UPDATE public.venues
  SET prepaid_balance = GREATEST(0, prepaid_balance + p_delta), updated_at = now()
  WHERE id = p_venue_id
  RETURNING prepaid_balance INTO v_new_balance;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'الملعب غير موجود');
  END IF;

  INSERT INTO public.venue_wallet_transactions (venue_id, amount, balance_after, type, description, created_by)
  VALUES (
    p_venue_id,
    p_delta,
    v_new_balance,
    'admin_adjustment',
    COALESCE(NULLIF(TRIM(p_reason), ''), 'تسوية رصيد يدوية من الإدارة'),
    (SELECT auth.uid())
  );

  RETURN jsonb_build_object('success', true, 'new_balance', v_new_balance);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_review_recharge_request(p_request_id uuid, p_action text, p_admin_notes text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_req RECORD;
  v_new_balance integer;
BEGIN
  IF NOT public.is_super_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'غير مصرح لك بتنفيذ هذا الإجراء');
  END IF;

  SELECT * INTO v_req FROM public.venue_recharge_requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'طلب الشحن غير موجود');
  END IF;
  IF v_req.status <> 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'تمت مراجعة هذا الطلب مسبقاً');
  END IF;

  IF p_action = 'approve' THEN
    UPDATE public.venues
    SET prepaid_balance = prepaid_balance + v_req.amount, updated_at = now()
    WHERE id = v_req.venue_id
    RETURNING prepaid_balance INTO v_new_balance;

    INSERT INTO public.venue_wallet_transactions (venue_id, amount, balance_after, type, description, reference_id, created_by)
    VALUES (v_req.venue_id, v_req.amount, v_new_balance, 'recharge', 'شحن رصيد معتمد — مرجع: ' || COALESCE(v_req.reference_number, '-'), p_request_id, (SELECT auth.uid()));

    UPDATE public.venue_recharge_requests
    SET status = 'approved', admin_notes = p_admin_notes, reviewed_by = (SELECT auth.uid()), updated_at = now()
    WHERE id = p_request_id;

    RETURN jsonb_build_object('success', true, 'new_balance', v_new_balance);
  ELSIF p_action = 'reject' THEN
    UPDATE public.venue_recharge_requests
    SET status = 'rejected', admin_notes = COALESCE(NULLIF(TRIM(p_admin_notes), ''), 'إيصال غير مطابق أو غير واضح'), reviewed_by = (SELECT auth.uid()), updated_at = now()
    WHERE id = p_request_id;

    RETURN jsonb_build_object('success', true);
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'إجراء غير معروف');
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_update_user_role(p_user_id uuid, p_role public.user_role)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_super_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'غير مصرح لك بتنفيذ هذا الإجراء');
  END IF;

  IF p_user_id = (SELECT auth.uid()) AND p_role <> 'super_admin' THEN
    RETURN jsonb_build_object('success', false, 'error', 'لا يمكنك إزالة صلاحية المشرف العام عن حسابك الشخصي');
  END IF;

  UPDATE public.profiles SET role = p_role, updated_at = now() WHERE id = p_user_id;
  RETURN jsonb_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_manage_blacklist(p_action text, p_phone text, p_reason text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_phone text := REGEXP_REPLACE(TRIM(COALESCE(p_phone, '')), '\s+', '', 'g');
BEGIN
  IF NOT public.is_super_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'غير مصرح لك بتنفيذ هذا الإجراء');
  END IF;

  IF v_phone = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'يرجى إدخال رقم الهاتف');
  END IF;

  IF p_action = 'add' THEN
    INSERT INTO public.fraud_blacklist (phone, reason)
    VALUES (v_phone, COALESCE(NULLIF(TRIM(p_reason), ''), 'مخالفة سياسة الحجز أو التلاعب بالإيصالات'))
    ON CONFLICT (phone) DO UPDATE SET reason = EXCLUDED.reason;
    RETURN jsonb_build_object('success', true);
  ELSIF p_action = 'remove' THEN
    DELETE FROM public.fraud_blacklist WHERE phone = v_phone;
    RETURN jsonb_build_object('success', true);
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'إجراء غير معروف');
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_get_dashboard_overview() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_approve_partner_application(uuid, integer, integer, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_reject_partner_application(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_update_venue_settings(uuid, boolean, boolean, integer, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_adjust_venue_balance(uuid, integer, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_review_recharge_request(uuid, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_update_user_role(uuid, public.user_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_manage_blacklist(text, text, text) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.admin_get_dashboard_overview() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_approve_partner_application(uuid, integer, integer, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reject_partner_application(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_venue_settings(uuid, boolean, boolean, integer, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_adjust_venue_balance(uuid, integer, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_review_recharge_request(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_user_role(uuid, public.user_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_manage_blacklist(text, text, text) TO authenticated;

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.venue_wallet_transactions;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.venues;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;
