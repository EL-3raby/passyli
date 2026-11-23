-- =====================================================================
-- باصيلي (Passyli) — Seed Data for Damanhour & Beheira Venues
-- =====================================================================

-- 1. Insert Sample Owner Profile
INSERT INTO auth.users (id, email)
VALUES ('00000000-0000-0000-0000-000000000001', 'owner@passyli.com')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.profiles (id, phone, full_name, role)
VALUES ('00000000-0000-0000-0000-000000000001', '01000000001', 'كابتن محمد سعيد', 'venue_owner')
ON CONFLICT (id) DO NOTHING;

-- 2. Insert Damanhour Venues
INSERT INTO public.venues (
  id,
  owner_id,
  name,
  slug,
  city,
  district,
  address,
  latitude,
  longitude,
  phone,
  whatsapp_number,
  instapay_address,
  vodafone_cash_number,
  deposit_amount,
  amenities,
  is_active,
  is_verified
) VALUES 
(
  '11111111-1111-1111-1111-111111111111',
  '00000000-0000-0000-0000-000000000001',
  'نادي دمنهور للبادل (Padel Club)',
  'damanhour-padel-club',
  'دمنهور',
  'شارع عبد السلام الشاذلي',
  'شارع عبد السلام الشاذلي، بجوار النادي الاجتماعي، دمنهور، البحيرة',
  31.0384500,
  30.4682000,
  '01099887766',
  '01099887766',
  'damanhourpadel@instapay',
  '01099887766',
  100,
  ARRAY['كشافات LED احترافية', 'زجاج بانوراما دولي', 'غرف تبديل ملابس', 'موقف سيارات', 'كافيتريا ومشروبات'],
  TRUE,
  TRUE
),
(
  '22222222-2222-2222-2222-222222222222',
  '00000000-0000-0000-0000-000000000001',
  'ملعب الأبطال الخماسي',
  'champions-football-court',
  'دمنهور',
  'طريق شبرا',
  'طريق شبرا الرئيسي، أمام المستشفى العسكري، دمنهور، البحيرة',
  31.0421000,
  30.4815000,
  '01122334455',
  '01122334455',
  'championscourt@instapay',
  '01122334455',
  100,
  ARRAY['نجيل صناعي تركي جيل ثالث', 'إضاءة ملاعب عالية الجودة', 'مدرج صغير', 'غرف استحمام', 'كرات ومرايل أصلية'],
  TRUE,
  TRUE
),
(
  '33333333-3333-3333-3333-333333333333',
  '00000000-0000-0000-0000-000000000001',
  'أكاديمية النصر للبادل',
  'alnasr-padel-academy',
  'دمنهور',
  'شارع المعهد الديني',
  'شارع المعهد الديني، خلف كلية الشريعة، دمنهور، البحيرة',
  31.0328000,
  30.4619000,
  '01233445566',
  '01233445566',
  'alnasrpadel@instapay',
  '01233445566',
  100,
  ARRAY['ملاعب بادل مغطاة', 'أرضيات معتمدة دولياً WPT', 'مدربين محترفين', 'متجر مضارب وكرات'],
  TRUE,
  TRUE
)
ON CONFLICT (id) DO NOTHING;

-- 3. Insert Courts for Each Venue
INSERT INTO public.courts (
  id,
  venue_id,
  name,
  sport,
  surface,
  slot_duration_minutes,
  price_morning,
  price_evening,
  peak_hour_start,
  buffer_minutes,
  is_active
) VALUES
(
  'aaaa1111-1111-1111-1111-111111111111',
  '11111111-1111-1111-1111-111111111111',
  'كورت 1 — بانوراما خارجي',
  'padel',
  'panoramic_glass',
  90,
  200,
  280,
  '18:00:00',
  5,
  TRUE
),
(
  'aaaa2222-2222-2222-2222-222222222222',
  '11111111-1111-1111-1111-111111111111',
  'كورت 2 — بانوراما رئيسي',
  'padel',
  'panoramic_glass',
  90,
  200,
  280,
  '18:00:00',
  5,
  TRUE
),
(
  'bbbb1111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  'الملعب الرئيسي (خماسي ترتان)',
  'football',
  'turf_3g',
  60,
  150,
  200,
  '18:00:00',
  5,
  TRUE
),
(
  'cccc1111-1111-1111-1111-111111111111',
  '33333333-3333-3333-3333-333333333333',
  'كورت النصر المغطى A',
  'padel',
  'covered_padel',
  90,
  220,
  250,
  '18:00:00',
  5,
  TRUE
)
ON CONFLICT (id) DO NOTHING;
