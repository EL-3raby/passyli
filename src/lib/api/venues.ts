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
  is_active?: boolean;
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

interface DbCourtRow {
  id: string;
  name: string;
  sport: SportType;
  surface: SurfaceType;
  slot_duration_minutes: number;
  price_morning: number;
  price_evening: number;
  peak_hour_start: string;
  is_active: boolean;
  available_slots?: string[] | null;
}

interface DbVenueRow {
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
  images: string[] | null;
  amenities: string[] | null;
  courts: DbCourtRow[] | null;
}

// Haversine formula to compute GPS distance in km
export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
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

// Fetch live active venues from Supabase (never returns mock/seed fallback data)
export async function getVenues(
  userLat?: number,
  userLon?: number
): Promise<VenueWithCourts[]> {
  const supabase = createClient();
  const { data: venues, error } = await supabase
    .from("venues")
    .select("*, courts(*)")
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  if (!venues || venues.length === 0) {
    return [];
  }

  const defaultPadelSlots = ["06:00 م", "07:30 م", "09:00 م", "10:30 م"];
  const defaultFootballSlots = [
    "07:00 م",
    "08:00 م",
    "09:00 م",
    "10:00 م",
    "11:00 م",
  ];

  const rows = venues as unknown as DbVenueRow[];
  const enriched: VenueWithCourts[] = rows.map((v) => ({
    id: v.id,
    name: v.name,
    slug: v.slug,
    city: v.city,
    district: v.district,
    address: v.address,
    latitude: Number(v.latitude),
    longitude: Number(v.longitude),
    phone: v.phone,
    whatsapp_number: v.whatsapp_number,
    instapay_address: v.instapay_address,
    vodafone_cash_number: v.vodafone_cash_number,
    deposit_amount: v.deposit_amount,
    images:
      Array.isArray(v.images) && v.images.length > 0
        ? v.images
        : ["/images/hero-court.jpg"],
    amenities: Array.isArray(v.amenities) ? v.amenities : [],
    courts: (v.courts || [])
      .filter((c) => c.is_active !== false)
      .map((c) => ({
        id: c.id,
        name: c.name,
        sport: c.sport,
        surface: c.surface,
        slot_duration_minutes: c.slot_duration_minutes,
        price_morning: c.price_morning,
        price_evening: c.price_evening,
        peak_hour_start: c.peak_hour_start,
        is_active: c.is_active,
        available_slots:
          Array.isArray(c.available_slots) && c.available_slots.length > 0
            ? c.available_slots
            : c.sport === "padel"
            ? defaultPadelSlots
            : defaultFootballSlots,
      })),
    distance_km:
      userLat && userLon
        ? calculateDistanceKm(
            userLat,
            userLon,
            Number(v.latitude),
            Number(v.longitude)
          )
        : undefined,
  }));

  return sortAndEnrichVenues(enriched, userLat, userLon);
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
      distance_km: calculateDistanceKm(
        userLat,
        userLon,
        v.latitude,
        v.longitude
      ),
    }))
    .sort((a, b) => (a.distance_km || 0) - (b.distance_km || 0));
}
