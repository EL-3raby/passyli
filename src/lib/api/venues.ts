import { createClient } from "@/lib/supabase/client";
import type { SportType, SurfaceType } from "@/lib/supabase/types";

export type VenueCourt = {
  id: string;
  name: string;
  sport: SportType;
  surface: SurfaceType;
  slot_duration_minutes: number;
  price_morning: number;
  price_evening: number;
  peak_hour_start: string;
  available_slots: string[];
};

export interface VenueWithCourts {
  id: string;
  name: string;
  slug: string;
  city: string;
  district: string;
  address: string;
  latitude: number;
  longitude: number;
  phone: string;
  whatsapp_number: string;
  instapay_address: string | null;
  vodafone_cash_number: string | null;
  deposit_amount: number;
  images: string[];
  amenities: string[];
  distance_km?: number;
  courts: VenueCourt[];
}

// Fallback Seed Data for Damanhour (Used when offline or during initial Supabase configuration)
export const DAMANHOUR_SEED_VENUES: VenueWithCourts[] = [
  {
    id: "11111111-1111-1111-1111-111111111111",
    name: "نادي دمنهور للبادل (Padel Club)",
    slug: "damanhour-padel-club",
    city: "دمنهور",
    district: "شارع عبد السلام الشاذلي",
    address: "شارع عبد السلام الشاذلي، بجوار النادي الاجتماعي، دمنهور، البحيرة",
    latitude: 31.03845,
    longitude: 30.4682,
    phone: "01099887766",
    whatsapp_number: "01099887766",
    instapay_address: "damanhourpadel@instapay",
    vodafone_cash_number: "01099887766",
    deposit_amount: 100,
    images: ["/images/hero-court.jpg"],
    amenities: ["كشافات LED احترافية", "زجاج بانوراما دولي", "غرف تبديل ملابس", "موقف سيارات", "كافيتريا"],
    distance_km: 1.4,
    courts: [
      {
        id: "aaaa1111-1111-1111-1111-111111111111",
        name: "كورت 1 — بانوراما خارجي",
        sport: "padel",
        surface: "panoramic_glass",
        slot_duration_minutes: 90,
        price_morning: 200,
        price_evening: 280,
        peak_hour_start: "18:00:00",
        available_slots: ["08:00 م", "09:30 م", "11:00 م"],
      },
    ],
  },
  {
    id: "22222222-2222-2222-2222-222222222222",
    name: "ملعب الأبطال الخماسي",
    slug: "champions-football-court",
    city: "دمنهور",
    district: "طريق شبرا",
    address: "طريق شبرا الرئيسي، أمام المستشفى العسكري، دمنهور، البحيرة",
    latitude: 31.0421,
    longitude: 30.4815,
    phone: "01122334455",
    whatsapp_number: "01122334455",
    instapay_address: "championscourt@instapay",
    vodafone_cash_number: "01122334455",
    deposit_amount: 100,
    images: ["/images/hero-complex.jpg"],
    amenities: ["نجيل ترتان تركي جيل ثالث", "إضاءة ملاعب عالية الجودة", "مدرج صغير", "غرف استحمام"],
    distance_km: 2.1,
    courts: [
      {
        id: "bbbb1111-1111-1111-1111-111111111111",
        name: "الملعب الرئيسي (خماسي ترتان)",
        sport: "football",
        surface: "turf_3g",
        slot_duration_minutes: 60,
        price_morning: 150,
        price_evening: 200,
        peak_hour_start: "18:00:00",
        available_slots: ["07:00 م", "08:00 م", "09:00 م"],
      },
    ],
  },
  {
    id: "33333333-3333-3333-3333-333333333333",
    name: "أكاديمية النصر للبادل",
    slug: "alnasr-padel-academy",
    city: "دمنهور",
    district: "شارع المعهد الديني",
    address: "شارع المعهد الديني، خلف كلية الشريعة، دمنهور، البحيرة",
    latitude: 31.0328,
    longitude: 30.4619,
    phone: "01233445566",
    whatsapp_number: "01233445566",
    instapay_address: "alnasrpadel@instapay",
    vodafone_cash_number: "01233445566",
    deposit_amount: 100,
    images: ["/images/hero-court.jpg"],
    amenities: ["ملاعب بادل مغطاة", "أرضيات معتمدة دولياً WPT", "مدربين محترفين", "مواقف سيارات"],
    distance_km: 3.2,
    courts: [
      {
        id: "cccc1111-1111-1111-1111-111111111111",
        name: "كورت النصر المغطى A",
        sport: "padel",
        surface: "covered_padel",
        slot_duration_minutes: 90,
        price_morning: 220,
        price_evening: 250,
        peak_hour_start: "18:00:00",
        available_slots: ["06:30 م", "10:00 م", "11:30 م"],
      },
    ],
  },
];

// Haversine formula to compute GPS distance in km
export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

// Fetch all venues with optional user coordinates
export async function getVenues(userLat?: number, userLon?: number): Promise<VenueWithCourts[]> {
  try {
    const supabase = createClient();
    const { data: venues, error } = await supabase
      .from("venues")
      .select("*, courts(*)")
      .eq("is_active", true);

    if (error || !venues || venues.length === 0) {
      return sortAndEnrichVenues(DAMANHOUR_SEED_VENUES, userLat, userLon);
    }

    const defaultPadelSlots = ["06:00 م", "07:30 م", "09:00 م", "10:30 م"];
    const defaultFootballSlots = ["07:00 م", "08:00 م", "09:00 م", "10:00 م", "11:00 م"];

    const enriched = venues.map((v: any) => ({
      ...v,
      images: Array.isArray(v.images) && v.images.length > 0 ? v.images : ["/images/hero-court.jpg"],
      courts: (v.courts || []).map((c: any) => ({
        ...c,
        available_slots:
          Array.isArray(c.available_slots) && c.available_slots.length > 0
            ? c.available_slots
            : c.sport === "padel"
            ? defaultPadelSlots
            : defaultFootballSlots,
      })),
      distance_km:
        userLat && userLon
          ? calculateDistanceKm(userLat, userLon, Number(v.latitude), Number(v.longitude))
          : undefined,
    }));

    return enriched;
  } catch {
    return sortAndEnrichVenues(DAMANHOUR_SEED_VENUES, userLat, userLon);
  }
}

function sortAndEnrichVenues(
  venues: VenueWithCourts[],
  userLat?: number,
  userLon?: number
): VenueWithCourts[] {
  if (!userLat || !userLon) return venues;

  return venues
    .map((v) => ({
      ...v,
      distance_km: calculateDistanceKm(userLat, userLon, v.latitude, v.longitude),
    }))
    .sort((a, b) => (a.distance_km || 0) - (b.distance_km || 0));
}
