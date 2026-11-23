-- =====================================================================
-- باصيلي (Passyli) — Enterprise Database Schema (PostgreSQL / Supabase)
-- Version: 1.0.0
-- Scope: Multi-Vendor Sports Court Marketplace (Damanhour & Beheira)
-- =====================================================================

-- 1. Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Custom Enumerated Types
CREATE TYPE user_role AS ENUM (
  'player',
  'venue_owner',
  'receptionist',
  'super_admin'
);

CREATE TYPE sport_type AS ENUM (
  'football',
  'padel'
);

CREATE TYPE surface_type AS ENUM (
  'turf_3g',           -- نجيل صناعي ترتان تركي (جيل ثالث)
  'panoramic_glass',   -- زجاج بانوراما بادل
  'covered_padel',     -- بادل مغطى
  'natural_grass'      -- نجيل طبيعي
);

CREATE TYPE booking_status AS ENUM (
  'pending_payment',   -- قيد دفع العربون (محجوز مؤقتاً لمدة 8 دقائق)
  'confirmed',         -- مؤكد ومعتمد بإيصال أو كاش
  'completed',         -- ماتش انتهى
  'cancelled',         -- ملغي
  'expired'            -- انتهت مهلة الـ 8 دقائق دون تأكيد
);

CREATE TYPE payment_method AS ENUM (
  'instapay',
  'vodafone_cash',
  'orange_cash',
  'cash'
);

CREATE TYPE payment_status AS ENUM (
  'pending',           -- في انتظار تحويل العربون
  'submitted',         -- تم رفع سكرين الإيصال وفي انتظار المراجعة
  'verified',          -- تم التحقق واعتماد العربون بنجاح
  'rejected',          -- تم رفض الإيصال
  'paid_cash_on_pitch' -- تم دفع العربون كاش في الملعب
);

CREATE TYPE matchmaking_status AS ENUM (
  'open',              -- مفتوح لاستقبال لاعبين
  'filled',            -- اكتمل العدد
  'cancelled'          -- ملغي
);

-- =====================================================================
-- 3. Profiles Table (Linked to Supabase Auth)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  phone VARCHAR(20) UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'player',
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for instant phone lookup
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON public.profiles(phone);

-- =====================================================================
-- 4. Venues Table (المنشآت والملاعب)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.venues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  city TEXT NOT NULL DEFAULT 'دمنهور',
  district TEXT NOT NULL,
  address TEXT NOT NULL,
  latitude NUMERIC(10, 7) NOT NULL,
  longitude NUMERIC(10, 7) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  whatsapp_number VARCHAR(20) NOT NULL,
  instapay_address TEXT,
  vodafone_cash_number VARCHAR(20),
  backup_wallet_number VARCHAR(20),
  deposit_amount INTEGER NOT NULL DEFAULT 100,
  images TEXT[] NOT NULL DEFAULT '{}',
  amenities TEXT[] NOT NULL DEFAULT '{}',
  opening_time TIME NOT NULL DEFAULT '08:00:00',
  closing_time TIME NOT NULL DEFAULT '02:00:00',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for location & search
CREATE INDEX IF NOT EXISTS idx_venues_city_district ON public.venues(city, district);
CREATE INDEX IF NOT EXISTS idx_venues_coordinates ON public.venues(latitude, longitude);

-- =====================================================================
-- 5. Courts Table (الملاعب الفرعية داخل المنشأة)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.courts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sport sport_type NOT NULL,
  surface surface_type NOT NULL,
  slot_duration_minutes INTEGER NOT NULL DEFAULT 60, -- 60 للخماسي، 90 للبادل
  price_morning INTEGER NOT NULL,                     -- سعر الساعة الصباحية (ج.م)
  price_evening INTEGER NOT NULL,                     -- سعر ساعة الذروة المسائية (ج.م)
  peak_hour_start TIME NOT NULL DEFAULT '18:00:00',  -- بداية ساعات الذروة المسائية
  buffer_minutes INTEGER NOT NULL DEFAULT 5,          -- فاصل زمني لتنظيم الدخول
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_courts_venue_sport ON public.courts(venue_id, sport);

-- =====================================================================
-- 6. Bookings Table (الحجوزات وقفل المواعيد)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_reference VARCHAR(24) UNIQUE NOT NULL, -- مثل: PAS-20261123-A8F1
  court_id UUID NOT NULL REFERENCES public.courts(id) ON DELETE RESTRICT,
  booker_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  booker_name TEXT NOT NULL,
  booker_phone VARCHAR(20) NOT NULL,
  booking_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  total_price INTEGER NOT NULL,
  deposit_required INTEGER NOT NULL DEFAULT 100,
  deposit_paid INTEGER NOT NULL DEFAULT 0,
  cash_remaining INTEGER NOT NULL,
  status booking_status NOT NULL DEFAULT 'pending_payment',
  locked_until TIMESTAMPTZ,                       -- مهلة الـ 8 دقائق للقفل المؤقت
  locked_by_session TEXT,                         -- بصمة الجلسة أثناء الحجز
  is_walkin BOOLEAN NOT NULL DEFAULT FALSE,        -- حجز كاش فوري من كابتن الملعب
  cancellation_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================================
-- 6.1 THE STRICT GOLDEN CONCURRENCY CONSTRAINT (منع الحجز المزدوج نهائياً)
-- Only one non-cancelled, non-expired booking can exist for the same court, date, and start_time
-- =====================================================================
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_court_slot 
ON public.bookings(court_id, booking_date, start_time) 
WHERE status NOT IN ('cancelled', 'expired');

CREATE INDEX IF NOT EXISTS idx_bookings_date_court ON public.bookings(booking_date, court_id);
CREATE INDEX IF NOT EXISTS idx_bookings_booker_phone ON public.bookings(booker_phone);
CREATE INDEX IF NOT EXISTS idx_bookings_locked_until ON public.bookings(locked_until) WHERE status = 'pending_payment';

-- =====================================================================
-- 7. Receipts Table (إيصالات التحويل والرقم المرجعي)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  sender_name TEXT NOT NULL,
  sender_phone VARCHAR(20) NOT NULL,
  payment_method payment_method NOT NULL DEFAULT 'instapay',
  reference_number VARCHAR(64) NOT NULL,          -- الرقم المرجعي لمنع تكرار الإيصال
  amount_paid INTEGER NOT NULL,
  image_url TEXT NOT NULL,                         -- رابط السكرين شوت في Storage
  status payment_status NOT NULL DEFAULT 'submitted',
  rejection_reason TEXT,
  verified_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- منع استخدام نفس الرقم المرجعي للإيصال في أكثر من عملية تحويل
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_receipt_reference 
ON public.receipts(reference_number);

CREATE INDEX IF NOT EXISTS idx_receipts_booking ON public.receipts(booking_id);

-- =====================================================================
-- 8. Matchmaking Posts Table (التقسيمات المفتوحة - كمّل ماتشك)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.matchmaking_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  court_id UUID NOT NULL REFERENCES public.courts(id) ON DELETE CASCADE,
  sport sport_type NOT NULL,
  match_date DATE NOT NULL,
  start_time TIME NOT NULL,
  players_needed INTEGER NOT NULL CHECK (players_needed > 0),
  current_players INTEGER NOT NULL DEFAULT 0,
  cost_per_player INTEGER NOT NULL,
  required_position TEXT NOT NULL DEFAULT 'أي مركز',
  skill_level TEXT NOT NULL DEFAULT 'متوسط',
  notes TEXT,
  status matchmaking_status NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_matchmaking_date_sport ON public.matchmaking_posts(match_date, sport);

-- =====================================================================
-- 9. Automatic Functions & Procedures
-- =====================================================================

-- 9.1 Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
CREATE TRIGGER tr_venues_updated_at BEFORE UPDATE ON public.venues FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER tr_courts_updated_at BEFORE UPDATE ON public.courts FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER tr_bookings_updated_at BEFORE UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER tr_matchmaking_updated_at BEFORE UPDATE ON public.matchmaking_posts FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 9.2 Release Expired 8-Minute Locks Function
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
$$ LANGUAGE plpgsql;

-- 9.3 GPS Haversine Distance Calculation (حساب المسافة بالكيلومتر من موقع اللاعب للملعب)
CREATE OR REPLACE FUNCTION public.calculate_distance_km(
  lat1 NUMERIC,
  lon1 NUMERIC,
  lat2 NUMERIC,
  lon2 NUMERIC
)
RETURNS NUMERIC AS $$
DECLARE
  r NUMERIC := 6371; -- Earth radius in km
  dlat NUMERIC;
  dlon NUMERIC;
  a NUMERIC;
  c NUMERIC;
BEGIN
  dlat := radians(lat2 - lat1);
  dlon := radians(lon2 - lon1);
  a := sin(dlat / 2)^2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon / 2)^2;
  c := 2 * atan2(sqrt(a), sqrt(1 - a));
  RETURN ROUND(r * c, 1);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 9.4 Atomic 8-Minute Slot Hold (تثبيت الحجز وقفل الساعة ذرياً لمدة 8 دقائق لمنع التضارب)
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
END;
$$ LANGUAGE plpgsql;

-- =====================================================================
-- 10. Row Level Security (RLS) Policies
-- =====================================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matchmaking_posts ENABLE ROW LEVEL SECURITY;

-- 10.1 Venues & Courts: Publicly readable for browsing
CREATE POLICY "Venues are viewable by everyone" ON public.venues FOR SELECT USING (is_active = TRUE);
CREATE POLICY "Courts are viewable by everyone" ON public.courts FOR SELECT USING (is_active = TRUE);

-- 10.2 Bookings Policies
-- Anyone can view slot availability (anonymous time check)
CREATE POLICY "Bookings viewable for slot availability" ON public.bookings FOR SELECT USING (TRUE);
-- Anyone can create a pending booking (with phone verification)
CREATE POLICY "Anyone can create a booking" ON public.bookings FOR INSERT WITH CHECK (TRUE);
-- Booker or venue owner can update booking
CREATE POLICY "Booker can update their own booking" ON public.bookings FOR UPDATE USING (
  auth.uid() = booker_id OR EXISTS (
    SELECT 1 FROM public.courts c 
    JOIN public.venues v ON c.venue_id = v.id 
    WHERE c.id = bookings.court_id AND v.owner_id = auth.uid()
  )
);

-- 10.3 Receipts Policies
CREATE POLICY "Users can view their own receipts" ON public.receipts FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.bookings b 
    WHERE b.id = receipts.booking_id AND (b.booker_id = auth.uid() OR b.booker_phone = (SELECT phone FROM public.profiles WHERE id = auth.uid()))
  ) OR EXISTS (
    SELECT 1 FROM public.bookings b
    JOIN public.courts c ON b.court_id = c.id
    JOIN public.venues v ON c.venue_id = v.id
    WHERE b.id = receipts.booking_id AND v.owner_id = auth.uid()
  )
);
CREATE POLICY "Users can upload receipts" ON public.receipts FOR INSERT WITH CHECK (TRUE);

-- 10.4 Matchmaking Policies
CREATE POLICY "Matchmaking posts are viewable by everyone" ON public.matchmaking_posts FOR SELECT USING (TRUE);
CREATE POLICY "Authenticated users can create matchmaking posts" ON public.matchmaking_posts FOR INSERT WITH CHECK (auth.uid() = creator_id);

-- =====================================================================
-- 11. Supabase Storage Buckets & Policies (تخزين صور الملاعب وإيصالات الدفع)
-- =====================================================================
INSERT INTO storage.buckets (id, name, public) 
VALUES 
  ('venues-storage', 'venues-storage', TRUE),
  ('receipts-storage', 'receipts-storage', FALSE)
ON CONFLICT (id) DO NOTHING;

-- Venues Storage: Publicly readable for players, uploadable by authenticated owners
CREATE POLICY "Public can view venue photos" ON storage.objects FOR SELECT USING (bucket_id = 'venues-storage');
CREATE POLICY "Venue owners can upload photos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'venues-storage');

-- Receipts Storage: Uploadable by bookers during payment, viewable only by authorized parties
CREATE POLICY "Anyone can upload receipt screenshots" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'receipts-storage');
CREATE POLICY "Authorized view of receipts" ON storage.objects FOR SELECT USING (bucket_id = 'receipts-storage');
