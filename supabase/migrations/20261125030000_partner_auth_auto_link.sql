-- =====================================================================
-- باصيلي (Passyli) — Partner Auth-First & Auto-Owner-Binding
-- =====================================================================

ALTER TABLE public.partner_applications
  ADD COLUMN IF NOT EXISTS applicant_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS applicant_email text;

CREATE INDEX IF NOT EXISTS idx_partner_apps_user_id
  ON public.partner_applications(applicant_user_id, created_at DESC);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'partner_applications' AND policyname = 'partner_apps_select_own'
  ) THEN
    CREATE POLICY "partner_apps_select_own"
      ON public.partner_applications FOR SELECT TO authenticated
      USING (applicant_user_id = (SELECT auth.uid()));
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.submit_partner_application(
  p_venue_name text,
  p_applicant_name text,
  p_phone text,
  p_whatsapp_number text,
  p_city text,
  p_district text,
  p_address text,
  p_sports text[],
  p_courts_count integer,
  p_base_price_morning integer,
  p_base_price_evening integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := (SELECT auth.uid());
  v_email text;
  v_existing_id uuid;
  v_new_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'يرجى تسجيل الدخول بحسابك أولاً لتقديم طلب الشراكة');
  END IF;

  SELECT email INTO v_email FROM public.profiles WHERE id = v_uid;

  SELECT id INTO v_existing_id
  FROM public.partner_applications
  WHERE applicant_user_id = v_uid AND status = 'pending'
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'لديك طلب شراكة قيد المراجعة بالفعل. سيتم الرد عليك قريباً.'
    );
  END IF;

  INSERT INTO public.partner_applications (
    applicant_user_id,
    applicant_email,
    venue_name,
    applicant_name,
    phone,
    whatsapp_number,
    city,
    district,
    address,
    sports,
    courts_count,
    base_price_morning,
    base_price_evening,
    status
  ) VALUES (
    v_uid,
    v_email,
    TRIM(p_venue_name),
    TRIM(p_applicant_name),
    TRIM(p_phone),
    COALESCE(NULLIF(TRIM(p_whatsapp_number), ''), TRIM(p_phone)),
    COALESCE(NULLIF(TRIM(p_city), ''), 'دمنهور'),
    TRIM(p_district),
    TRIM(p_address),
    p_sports,
    p_courts_count,
    p_base_price_morning,
    p_base_price_evening,
    'pending'
  )
  RETURNING id INTO v_new_id;

  RETURN jsonb_build_object('success', true, 'id', v_new_id);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.submit_partner_application(text, text, text, text, text, text, text, text[], integer, integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_partner_application(text, text, text, text, text, text, text, text[], integer, integer, integer) TO authenticated;

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
  v_lat numeric(10,7);
  v_lng numeric(10,7);
  v_has_football boolean;
  v_has_padel boolean;
  v_court_sport public.sport_type;
  v_court_surface public.surface_type;
  v_court_duration integer;
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
  END IF;

  IF v_owner_id IS NULL AND v_app.applicant_user_id IS NOT NULL THEN
    v_owner_id := v_app.applicant_user_id;
  END IF;

  IF v_owner_id IS NULL AND v_app.applicant_email IS NOT NULL AND TRIM(v_app.applicant_email) <> '' THEN
    SELECT id INTO v_owner_id FROM public.profiles WHERE LOWER(email) = LOWER(TRIM(v_app.applicant_email)) LIMIT 1;
  END IF;

  IF v_owner_id IS NOT NULL THEN
    UPDATE public.profiles SET role = 'venue_owner', updated_at = now()
    WHERE id = v_owner_id AND role = 'player';
  END IF;

  CASE TRIM(COALESCE(v_app.city, 'دمنهور'))
    WHEN 'كفر الدوار' THEN v_lat := 31.1339000; v_lng := 30.1297000;
    WHEN 'إيتاي البارود' THEN v_lat := 30.8856000; v_lng := 30.6631000;
    WHEN 'رشيد' THEN v_lat := 31.4044000; v_lng := 30.4164000;
    WHEN 'المحمودية' THEN v_lat := 31.1842000; v_lng := 30.5256000;
    WHEN 'أبو المطامير' THEN v_lat := 30.9102000; v_lng := 30.1744000;
    WHEN 'كوم حمادة' THEN v_lat := 30.7611000; v_lng := 30.6997000;
    ELSE v_lat := 31.0409000; v_lng := 30.4735000;
  END CASE;

  v_slug := 'venue-' || floor(random() * 89999 + 10000)::text;

  INSERT INTO public.venues (
    owner_id, name, slug, city, district, address,
    latitude, longitude, phone, whatsapp_number,
    deposit_amount, prepaid_balance, commission_per_slot, is_active, is_verified
  ) VALUES (
    v_owner_id,
    v_app.venue_name,
    v_slug,
    COALESCE(NULLIF(TRIM(v_app.city), ''), 'دمنهور'),
    v_app.district,
    v_app.address,
    v_lat,
    v_lng,
    v_app.phone,
    COALESCE(NULLIF(TRIM(v_app.whatsapp_number), ''), v_app.phone),
    100,
    v_credit,
    v_comm,
    true,
    true
  ) RETURNING id INTO v_new_venue_id;

  v_has_football := 'football' = ANY(COALESCE(v_app.sports, ARRAY['football']));
  v_has_padel := 'padel' = ANY(COALESCE(v_app.sports, ARRAY['football']));

  FOR i IN 1..GREATEST(v_app.courts_count, 1) LOOP
    IF v_has_football AND v_has_padel THEN
      IF i % 2 = 0 THEN
        v_court_sport := 'padel'::sport_type;
        v_court_surface := 'panoramic_glass'::surface_type;
        v_court_duration := 90;
      ELSE
        v_court_sport := 'football'::sport_type;
        v_court_surface := 'turf_3g'::surface_type;
        v_court_duration := 60;
      END IF;
    ELSIF v_has_padel THEN
      v_court_sport := 'padel'::sport_type;
      v_court_surface := 'panoramic_glass'::surface_type;
      v_court_duration := 90;
    ELSE
      v_court_sport := 'football'::sport_type;
      v_court_surface := 'turf_3g'::surface_type;
      v_court_duration := 60;
    END IF;

    INSERT INTO public.courts (
      venue_id, name, sport, surface, price_morning, price_evening, slot_duration_minutes, is_active
    ) VALUES (
      v_new_venue_id,
      'ملعب ' || i,
      v_court_sport,
      v_court_surface,
      v_app.base_price_morning,
      v_app.base_price_evening,
      v_court_duration,
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

  RETURN jsonb_build_object(
    'success', true,
    'venue_id', v_new_venue_id,
    'owner_linked', v_owner_id IS NOT NULL
  );
END;
$$;
