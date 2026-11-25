-- =====================================================================
-- باصيلي (Passyli) — Fix: Set default coordinates & map city lat/lng
-- in admin_approve_partner_application so partner approvals never fail
-- on venues.latitude / venues.longitude NOT NULL constraints.
-- =====================================================================

ALTER TABLE public.venues
  ALTER COLUMN latitude SET DEFAULT 31.0409000,
  ALTER COLUMN longitude SET DEFAULT 30.4735000;

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
    IF v_owner_id IS NOT NULL THEN
      UPDATE public.profiles SET role = 'venue_owner', updated_at = now() WHERE id = v_owner_id AND role = 'player';
    END IF;
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
