-- =====================================================================
-- باصيلي (Passyli) — Phase 8 Enhancements:
-- Player Position, Avatar Storage, Favorite Venues, Blacklist & Lock Management
-- =====================================================================

-- 1. Preferred position on profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS preferred_position text NOT NULL DEFAULT 'أي مركز';

-- 2. Favorite venues table
CREATE TABLE IF NOT EXISTS public.favorite_venues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  venue_id uuid NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, venue_id)
);

ALTER TABLE public.favorite_venues ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='favorite_venues' AND policyname='fav_venues_select_own') THEN
    CREATE POLICY "fav_venues_select_own" ON public.favorite_venues FOR SELECT TO authenticated
      USING ((SELECT auth.uid()) = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='favorite_venues' AND policyname='fav_venues_insert_own') THEN
    CREATE POLICY "fav_venues_insert_own" ON public.favorite_venues FOR INSERT TO authenticated
      WITH CHECK ((SELECT auth.uid()) = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='favorite_venues' AND policyname='fav_venues_delete_own') THEN
    CREATE POLICY "fav_venues_delete_own" ON public.favorite_venues FOR DELETE TO authenticated
      USING ((SELECT auth.uid()) = user_id);
  END IF;
END $$;

-- 3. Public avatars storage bucket with per-user folder RLS
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('avatars-storage', 'avatars-storage', true, 2097152, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 2097152,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='avatars_public_read') THEN
    CREATE POLICY "avatars_public_read" ON storage.objects FOR SELECT TO public
      USING (bucket_id = 'avatars-storage');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='avatars_auth_insert') THEN
    CREATE POLICY "avatars_auth_insert" ON storage.objects FOR INSERT TO authenticated
      WITH CHECK (bucket_id = 'avatars-storage' AND (storage.foldername(name))[1] = (SELECT auth.uid()::text));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='avatars_auth_update') THEN
    CREATE POLICY "avatars_auth_update" ON storage.objects FOR UPDATE TO authenticated
      USING (bucket_id = 'avatars-storage' AND (storage.foldername(name))[1] = (SELECT auth.uid()::text))
      WITH CHECK (bucket_id = 'avatars-storage' AND (storage.foldername(name))[1] = (SELECT auth.uid()::text));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='avatars_auth_delete') THEN
    CREATE POLICY "avatars_auth_delete" ON storage.objects FOR DELETE TO authenticated
      USING (bucket_id = 'avatars-storage' AND (storage.foldername(name))[1] = (SELECT auth.uid()::text));
  END IF;
END $$;

-- 4. Update lock_court_slot with fraud_blacklist check
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
BEGIN
  IF EXISTS (SELECT 1 FROM public.fraud_blacklist WHERE phone = p_booker_phone) THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'تم إيقاف هذا الرقم مؤقتاً لمخالفة سياسة الحجز. يرجى التواصل مع الدعم الفني.'
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
    booking_reference,
    court_id,
    booker_id,
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
    (SELECT auth.uid()),
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
$$;

-- 5. Allow authenticated owner or matching session to cancel pending lock
CREATE OR REPLACE FUNCTION public.cancel_booking_lock(p_booking_id uuid, p_session_id text DEFAULT NULL::text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated INTEGER;
  v_uid UUID := (SELECT auth.uid());
BEGIN
  UPDATE public.bookings
  SET status = 'cancelled',
      locked_until = NULL
  WHERE id = p_booking_id
    AND status = 'pending_payment'
    AND (
      (p_session_id IS NOT NULL AND locked_by_session = p_session_id)
      OR (v_uid IS NOT NULL AND booker_id = v_uid)
    );

  GET DIAGNOSTICS v_updated = ROW_COUNT;

  IF v_updated > 0 THEN
    RETURN jsonb_build_object('success', TRUE);
  ELSE
    RETURN jsonb_build_object('success', FALSE, 'error', 'لم يتم العثور على حجز مؤقت نشط للإلغاء');
  END IF;
END;
$$;

-- 6. Include locked_until in get_player_bookings for live lock countdown
CREATE OR REPLACE FUNCTION public.get_player_bookings(p_phone text DEFAULT NULL::text, p_user_id uuid DEFAULT NULL::uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := (SELECT auth.uid());
  v_user_phone text;
  v_result jsonb;
BEGIN
  IF v_uid IS NULL THEN
    RETURN '[]'::jsonb;
  END IF;

  SELECT phone INTO v_user_phone FROM public.profiles WHERE id = v_uid;

  SELECT COALESCE(
    jsonb_agg(to_jsonb(b_data) ORDER BY b_data.booking_date DESC, b_data.start_time DESC),
    '[]'::jsonb
  )
  INTO v_result
  FROM (
    SELECT
      b.id,
      b.booking_reference,
      b.booking_date,
      b.start_time,
      b.end_time,
      b.total_price,
      b.deposit_required,
      b.deposit_paid,
      b.cash_remaining,
      b.status,
      b.locked_until,
      b.payment_type,
      b.booker_name,
      b.booker_phone,
      b.created_at,
      jsonb_build_object(
        'id', c.id,
        'name', c.name,
        'sport', c.sport,
        'slot_duration_minutes', c.slot_duration_minutes,
        'venue', jsonb_build_object(
          'id', v.id,
          'name', v.name,
          'city', v.city,
          'district', v.district,
          'address', v.address,
          'phone', v.phone,
          'whatsapp_number', v.whatsapp_number
        )
      ) as court
    FROM public.bookings b
    JOIN public.courts c ON c.id = b.court_id
    JOIN public.venues v ON v.id = c.venue_id
    WHERE
      b.booker_id = v_uid
      OR (v_user_phone IS NOT NULL AND v_user_phone <> '' AND b.booker_phone = v_user_phone)
  ) b_data;

  RETURN v_result;
END;
$$;
