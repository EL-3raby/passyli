"use client";

import { useState, useEffect, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  MapPin,
  Navigation,
  Clock,
  ChevronLeft,
  Calendar,
  RotateCcw,
  Lock,
  Star,
  BellRing,
} from "lucide-react";
import {
  getVenues,
  calculateDistanceKm,
  type VenueWithCourts,
} from "@/lib/api/venues";
import type { SportType } from "@/lib/supabase/types";
import BookingModal, { type BookingModalData } from "@/components/booking-modal";
import FavoriteVenueButton from "@/components/favorite-venue-button";
import VenueCard from "@/components/venue-card";
import {
  getActiveBookingsForDate,
  isSlotMatchingTime,
  slotLabelToDbTime,
  subscribeSlotWaitlist,
  getVenueRatingSummaries,
  type ActiveSlotLock,
  type VenueRatingSummary,
} from "@/lib/api/bookings";
import { createClient } from "@/lib/supabase/client";

interface DayOption {
  key: string;
  label: string;
  dateStr: string;
  displayDate: string;
}

function getEgyptianDays(): DayOption[] {
  const days = [
    { key: "today", label: "النهاردة" },
    { key: "tomorrow", label: "بكره" },
    { key: "after_tomorrow", label: "بعد بكره" },
  ];

  const arabicDays = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
  const arabicMonths = [
    "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
    "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"
  ];

  const now = new Date();

  return days.map((day, idx) => {
    const d = new Date(now);
    d.setDate(d.getDate() + idx);
    const dayName = arabicDays[d.getDay()];
    const dayNum = d.getDate();
    const monthName = arabicMonths[d.getMonth()];
    const isoDate = d.toISOString().split("T")[0];

    return {
      ...day,
      dateStr: isoDate,
      displayDate: `${dayName} ${dayNum} ${monthName}`,
    };
  });
}

interface CourtsSectionProps {
  externalSport?: "all" | SportType;
  onVenuesReady?: (venues: VenueWithCourts[]) => void;
}

export default function CourtsSection({
  externalSport,
  onVenuesReady,
}: CourtsSectionProps = {}) {
  const [venues, setVenues] = useState<VenueWithCourts[]>([]);
  const [selectedSport, setSelectedSport] = useState<"all" | SportType>(
    externalSport || "all"
  );
  const [availableDays] = useState<DayOption[]>(getEgyptianDays());
  const [selectedDayKey, setSelectedDayKey] = useState<string>("today");
  const [userLocation, setUserLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locationStatus, setLocationStatus] = useState<"idle" | "located" | "denied">("idle");
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [, startTransition] = useTransition();

  // Booking Modal State
  const [bookingModalData, setBookingModalData] = useState<BookingModalData | null>(null);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);

  // Active Realtime Slot Locks, Verified Ratings & Waitlist State
  const [activeBookings, setActiveBookings] = useState<ActiveSlotLock[]>([]);
  const [ratingsMap, setRatingsMap] = useState<Record<string, VenueRatingSummary>>({});
  const [watchedSlots, setWatchedSlots] = useState<
    Record<string, { venueId: string; courtId: string; dateStr: string; slotLabel: string }>
  >({});
  const [freedAlert, setFreedAlert] = useState<{
    venueId: string;
    courtId: string;
    slotLabel: string;
  } | null>(null);

  const selectedDay = availableDays.find((d) => d.key === selectedDayKey) || availableDays[0];

  // Supabase Realtime Subscription for Slot Availability Sync
  useEffect(() => {
    const supabase = createClient();
    getActiveBookingsForDate(selectedDay.dateStr).then(setActiveBookings);

    const channel = supabase
      .channel(`courts_section_bookings_${selectedDay.dateStr}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookings" },
        () => {
          getActiveBookingsForDate(selectedDay.dateStr).then((nextLocks) => {
            setActiveBookings(nextLocks);
            setWatchedSlots((prevWatched) => {
              const updated = { ...prevWatched };
              for (const [key, item] of Object.entries(prevWatched)) {
                if (item.dateStr !== selectedDay.dateStr) continue;
                const stillLocked = nextLocks.some(
                  (b) =>
                    b.courtId === item.courtId &&
                    isSlotMatchingTime(item.slotLabel, b.startTime)
                );
                if (!stillLocked) {
                  setFreedAlert({
                    venueId: item.venueId,
                    courtId: item.courtId,
                    slotLabel: item.slotLabel,
                  });
                  delete updated[key];
                }
              }
              return updated;
            });
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedDay.dateStr]);

  // Deep Linking Hash Listener (#book?venue=...&date=...&slot=...)
  useEffect(() => {
    const handleHash = () => {
      if (typeof window === "undefined") return;
      const hash = window.location.hash;
      if (!hash.startsWith("#book?")) return;

      const params = new URLSearchParams(hash.substring(6));
      const venueSlug = params.get("venue");
      const dateParam = params.get("date");
      const slotParam = params.get("slot");

      if (!venueSlug) return;
      const targetVenue = venues.find((v) => v.slug === venueSlug);
      if (!targetVenue || !targetVenue.courts[0]) return;

      const primaryCourt = targetVenue.courts[0];
      const day = availableDays.find((d) => d.dateStr === dateParam) || availableDays[0];
      const slot = slotParam || primaryCourt.available_slots[0] || "08:00 م";

      setBookingModalData({
        venue: targetVenue,
        court: primaryCourt,
        bookingDate: day.dateStr,
        displayDate: day.displayDate,
        dayLabel: day.label,
        slotTime: slot,
      });
      setIsBookingModalOpen(true);
    };

    handleHash();
    window.addEventListener("hashchange", handleHash);
    return () => window.removeEventListener("hashchange", handleHash);
  }, [venues, availableDays]);

  // Check if a slot is locked / taken
  const isSlotLocked = (courtId: string, slot: string) => {
    return activeBookings.some(
      (b) => b.courtId === courtId && isSlotMatchingTime(slot, b.startTime)
    );
  };

  // Sync external sport filter if driven from Hero buttons
  useEffect(() => {
    if (externalSport) {
      setSelectedSport(externalSport);
    }
  }, [externalSport]);

  // Load venues and verified ratings in parallel on mount
  useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true);
        const [data, ratingSummaries] = await Promise.all([
          getVenues(),
          getVenueRatingSummaries(),
        ]);
        setVenues(data);
        setRatingsMap(ratingSummaries);
        onVenuesReady?.(data);
      } catch {
        setHasError(true);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleWatchSlot = async (
    venueId: string,
    courtId: string,
    slotLabel: string
  ) => {
    const key = `${courtId}|${selectedDay.dateStr}|${slotLabel}`;
    if (watchedSlots[key]) return;
    const res = await subscribeSlotWaitlist({
      courtId,
      bookingDate: selectedDay.dateStr,
      startTime: slotLabelToDbTime(slotLabel),
    });
    if (res.success) {
      setWatchedSlots((prev) => ({
        ...prev,
        [key]: { venueId, courtId, dateStr: selectedDay.dateStr, slotLabel },
      }));
    }
  };

  // Request Browser GPS Location
  const requestLocation = () => {
    if (!navigator.geolocation) {
      setLocationStatus("denied");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ lat: latitude, lon: longitude });
        setLocationStatus("located");
        setIsLocating(false);

        // Sort venues by distance
        startTransition(() => {
          setVenues((prev) =>
            [...prev]
              .map((v) => ({
                ...v,
                distance_km: calculateDistanceKm(latitude, longitude, v.latitude, v.longitude),
              }))
              .sort((a, b) => (a.distance_km || 0) - (b.distance_km || 0))
          );
        });
      },
      () => {
        setLocationStatus("denied");
        setIsLocating(false);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // Filter venues by sport
  const filteredVenues = venues.filter((venue) => {
    if (selectedSport === "all") return true;
    return venue.courts.some((c) => c.sport === selectedSport);
  });

  return (
    <section id="courts" className="py-16 md:py-24 bg-background relative">
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-1.5 text-xs font-medium text-zinc-200 backdrop-blur-md w-fit mb-3">
              <Navigation className="h-3.5 w-3.5 text-emerald-400" strokeWidth={1.5} />
              <span>ملاعب دمنهور المميزة • واجهة باصيلي المختارة</span>
            </div>
            
            <h2 className="font-display text-2xl sm:text-4xl font-extrabold text-white">
              أقوى ملاعب دمنهور المختارة
            </h2>
            <p className="text-muted-foreground text-sm mt-1">
              الملاعب الأكثر طلباً وتقييماً في دمنهور، احجز ميعادك فوراً بالعربون
            </p>
          </div>

        </div>

        {/* Compact Horizontal Quick-Filter Rail (Airbnb / Yalla Hagz style) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-6 scrollbar-none text-xs -mx-4 px-4 sm:mx-0 sm:px-0">
          {/* Quick Sport Pills */}
          <button
            type="button"
            onClick={() => setSelectedSport("all")}
            className={`inline-flex min-h-[38px] items-center justify-center rounded-xl px-4 font-bold transition-all whitespace-nowrap shrink-0 border ${
              selectedSport === "all"
                ? "bg-primary text-black border-primary font-black shadow-sm"
                : "bg-[#242427] border-white/[0.06] text-zinc-300 hover:text-white"
            }`}
          >
            كل الملاعب
          </button>

          <button
            type="button"
            onClick={() => setSelectedSport("padel")}
            className={`inline-flex min-h-[38px] items-center justify-center rounded-xl px-4 font-bold transition-all whitespace-nowrap shrink-0 border ${
              selectedSport === "padel"
                ? "bg-primary text-black border-primary font-black shadow-sm"
                : "bg-[#242427] border-white/[0.06] text-zinc-300 hover:text-white"
            }`}
          >
            بادل
          </button>

          <button
            type="button"
            onClick={() => setSelectedSport("football")}
            className={`inline-flex min-h-[38px] items-center justify-center rounded-xl px-4 font-bold transition-all whitespace-nowrap shrink-0 border ${
              selectedSport === "football"
                ? "bg-primary text-black border-primary font-black shadow-sm"
                : "bg-[#242427] border-white/[0.06] text-zinc-300 hover:text-white"
            }`}
          >
            كرة قدم
          </button>

          <span className="h-4 w-px bg-white/10 shrink-0" />

          {/* Quick Day Selector Pills */}
          {availableDays.map((day) => {
            const isSelected = selectedDayKey === day.key;
            return (
              <button
                key={day.key}
                type="button"
                onClick={() => setSelectedDayKey(day.key)}
                className={`inline-flex min-h-[38px] items-center gap-1.5 rounded-xl px-3.5 font-bold transition-all whitespace-nowrap shrink-0 border ${
                  isSelected
                    ? "bg-white text-black border-white font-black shadow-sm"
                    : "bg-[#242427] text-zinc-300 border-white/[0.06] hover:text-white"
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${isSelected ? "bg-black" : "bg-primary"}`} />
                <span>{day.label}</span>
              </button>
            );
          })}

          <span className="h-4 w-px bg-white/10 shrink-0" />

          {/* Quick GPS Locator Pill */}
          <button
            type="button"
            onClick={requestLocation}
            disabled={isLocating}
            className={`inline-flex min-h-[38px] items-center gap-1.5 rounded-xl px-3.5 font-bold transition-all whitespace-nowrap shrink-0 border ${
              locationStatus === "located"
                ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400 font-bold"
                : "bg-[#242427] border-white/[0.06] text-zinc-300 hover:text-white"
            }`}
          >
            <Navigation className={`h-3.5 w-3.5 text-primary ${isLocating ? "animate-spin" : ""}`} strokeWidth={1.5} />
            <span>{isLocating ? "بنحدد موقعك..." : locationStatus === "located" ? "الأقرب ليك" : "الأقرب بالـ GPS"}</span>
          </button>
        </div>

        {/* Waitlist Freed Slot Live Alert */}
        {freedAlert && (
          <div
            role="status"
            className="mb-6 p-4 rounded-2xl bg-primary/15 border border-primary/35 flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm"
          >
            <div className="flex items-center gap-2.5 text-white font-bold">
              <BellRing className="h-4 w-4 text-primary shrink-0" strokeWidth={1.5} />
              <span>
                الساعة <strong className="text-primary tabular-nums">{freedAlert.slotLabel}</strong> أصبحت متاحة للحجز الآن!
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const v = venues.find((item) => item.id === freedAlert.venueId);
                  const c = v?.courts.find((item) => item.id === freedAlert.courtId);
                  if (v && c) {
                    setBookingModalData({
                      venue: v,
                      court: c,
                      bookingDate: selectedDay.dateStr,
                      displayDate: selectedDay.displayDate,
                      dayLabel: selectedDay.label,
                      slotTime: freedAlert.slotLabel,
                    });
                    setIsBookingModalOpen(true);
                  }
                  setFreedAlert(null);
                }}
                className="min-h-[40px] px-4 rounded-xl bg-primary text-black font-black text-xs"
              >
                احجز الآن
              </button>
              <button
                type="button"
                onClick={() => setFreedAlert(null)}
                className="min-h-[40px] px-3 rounded-xl bg-white/10 text-zinc-200 text-xs font-bold"
              >
                إغلاق
              </button>
            </div>
          </div>
        )}

        {/* 1. Shimmer Skeleton State */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="rounded-[18px] border border-white/[0.06] bg-[#242427] overflow-hidden p-5 flex flex-col gap-4 animate-pulse"
              >
                <div className="h-44 w-full bg-[#1c1c1f] rounded-xl" />
                <div className="h-5 w-2/3 bg-white/[0.06] rounded-md" />
                <div className="h-4 w-1/2 bg-white/[0.04] rounded-md" />
                <div className="h-16 w-full bg-[#1c1c1f] rounded-xl" />
                <div className="h-10 w-full bg-white/[0.05] rounded-xl mt-auto" />
              </div>
            ))}
          </div>
        )}

        {/* 2. Error State */}
        {hasError && !isLoading && (
          <div className="rounded-[18px] border border-white/[0.08] bg-[#242427] p-10 text-center flex flex-col items-center gap-4 max-w-md mx-auto">
            <span className="h-12 w-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
              <RotateCcw className="h-5 w-5" strokeWidth={1.5} />
            </span>
            <div>
              <h3 className="font-display text-base font-bold text-white mb-1">
                مش عارفين نحمل الملاعب دلوقتي
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                حصلت مشكلة في الاتصال بالخادم. جرب تاني وهتشتغل معاك.
              </p>
            </div>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-primary px-6 text-xs font-bold text-black hover:bg-primary-hover transition-all"
            >
              جرّب تاني
            </button>
          </div>
        )}

        {/* 3. Empty State */}
        {!isLoading && !hasError && filteredVenues.length === 0 && (
          <div className="rounded-[18px] border border-white/[0.08] bg-[#242427] p-10 text-center flex flex-col items-center gap-4 max-w-md mx-auto">
            <span className="h-12 w-12 rounded-2xl bg-[#2e2e33] flex items-center justify-center text-primary">
              <Clock className="h-5 w-5" strokeWidth={1.5} />
            </span>
            {venues.length === 0 ? (
              <>
                <div>
                  <h3 className="font-display text-base font-bold text-white mb-1">
                    لا توجد ملاعب مفعّلة حالياً
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    بانتظار اعتماد الملاعب الجديدة على المنصة. إذا كنت صاحب ملعب يمكنك الانضمام الآن.
                  </p>
                </div>
                <Link
                  href="/partner"
                  className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-primary px-6 text-xs font-bold text-black hover:bg-primary-hover transition-all"
                >
                  سجّل ملعبك كشريك
                </Link>
              </>
            ) : (
              <>
                <div>
                  <h3 className="font-display text-base font-bold text-white mb-1">
                    مفيش ملاعب بالتصنيف ده دلوقتي
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    جرّب تختار رياضة تانية أو عرض كل الملاعب المتاحة.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedSport("all")}
                  className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-primary px-6 text-xs font-bold text-black hover:bg-primary-hover transition-all"
                >
                  عرض كل الملاعب
                </button>
              </>
            )}
          </div>
        )}

        {/* 4. Loaded State: Mobile Horizontal Snap Rail & Desktop 3-Col Grid */}
        {!isLoading && !hasError && filteredVenues.length > 0 && (
          <div>
            <div className="flex md:grid md:grid-cols-2 lg:grid-cols-3 overflow-x-auto md:overflow-visible pb-4 md:pb-0 snap-x snap-mandatory md:snap-none scrollbar-none gap-4 md:gap-6 -mx-4 px-4 sm:mx-0 sm:px-0">
              {filteredVenues.map((venue) => (
                <VenueCard
                  key={venue.id}
                  venue={venue}
                  selectedSport={selectedSport}
                  selectedDay={selectedDay}
                  ratingSummary={ratingsMap[venue.id]}
                  watchedSlots={watchedSlots}
                  isSlotLocked={isSlotLocked}
                  onWatchSlot={handleWatchSlot}
                  onBook={(data) => {
                    setBookingModalData(data);
                    setIsBookingModalOpen(true);
                  }}
                  variant="rail"
                />
              ))}
            </div>

            {/* Mobile Swipe Guidance Indicator */}
            <div className="flex md:hidden items-center justify-center gap-2 pt-3 text-xs text-zinc-400 font-medium">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              <span>اسحب لتصفح باقي الملاعب</span>
              <ChevronLeft className="h-3.5 w-3.5 text-primary" strokeWidth={2} />
            </div>

            {/* Explore All Courts Marketplace CTA Button */}
            <div className="mt-10 pt-4 flex flex-col sm:flex-row items-center justify-center gap-4 text-center">
              <Link
                href="/courts"
                className="inline-flex min-h-[48px] items-center justify-center gap-3 rounded-full bg-[#242427] hover:bg-[#2c2c30] border border-white/[0.08] hover:border-primary/50 px-7 sm:px-9 text-xs sm:text-sm font-bold text-white transition-all group shadow-sm active:scale-98"
              >
                <span>استعرض كافة ملاعب دمنهور والبحيرة</span>
                <span className="rounded-full bg-primary/15 border border-primary/25 px-2.5 py-0.5 text-xs font-black text-primary tabular-nums">
                  {venues.length} ملاعب متاحة
                </span>
                <ChevronLeft className="h-4 w-4 text-primary group-hover:-translate-x-1 transition-transform" strokeWidth={2.5} />
              </Link>
            </div>
          </div>
        )}

      </div>

      {/* Interactive Booking & Hold Modal */}
      <BookingModal
        isOpen={isBookingModalOpen}
        data={bookingModalData}
        onClose={() => setIsBookingModalOpen(false)}
      />
    </section>
  );
}
