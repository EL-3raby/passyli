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
} from "lucide-react";
import {
  getVenues,
  calculateDistanceKm,
  DAMANHOUR_SEED_VENUES,
  type VenueWithCourts,
} from "@/lib/api/venues";
import type { SportType } from "@/lib/supabase/types";
import BookingModal, { type BookingModalData } from "@/components/booking-modal";

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

export default function CourtsSection() {
  const [venues, setVenues] = useState<VenueWithCourts[]>(DAMANHOUR_SEED_VENUES);
  const [selectedSport, setSelectedSport] = useState<"all" | SportType>("all");
  const [availableDays] = useState<DayOption[]>(getEgyptianDays());
  const [selectedDayKey, setSelectedDayKey] = useState<string>("today");
  const [userLocation, setUserLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locationStatus, setLocationStatus] = useState<"idle" | "located" | "denied">("idle");
  const [selectedSlots, setSelectedSlots] = useState<{ [courtId: string]: string }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [, startTransition] = useTransition();

  // Booking Modal State
  const [bookingModalData, setBookingModalData] = useState<BookingModalData | null>(null);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);

  const selectedDay = availableDays.find((d) => d.key === selectedDayKey) || availableDays[0];

  // Load venues on mount
  useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true);
        const data = await getVenues();
        setVenues(data);
      } catch {
        setHasError(true);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

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

  // Slot Selection Handler
  const handleSlotSelect = (courtId: string, slot: string) => {
    setSelectedSlots((prev) => ({
      ...prev,
      [courtId]: prev[courtId] === slot ? "" : slot,
    }));
  };

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
            <div>
              <h3 className="font-display text-base font-bold text-white mb-1">
                مفيش ملاعب بالتصنيف ده دلوقتي
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                جرّب تختار رياضة تانية أو اتفرج على كل ملاعب دمنهور.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSelectedSport("all")}
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-primary px-6 text-xs font-bold text-black hover:bg-primary-hover transition-all"
            >
              عرض كل الملاعب
            </button>
          </div>
        )}

        {/* 4. Loaded State: Mobile Horizontal Snap Rail & Desktop 3-Col Grid */}
        {!isLoading && !hasError && filteredVenues.length > 0 && (
          <div>
            <div className="flex md:grid md:grid-cols-2 lg:grid-cols-3 overflow-x-auto md:overflow-visible pb-4 md:pb-0 snap-x snap-mandatory md:snap-none scrollbar-none gap-4 md:gap-6 -mx-4 px-4 sm:mx-0 sm:px-0">
              {filteredVenues.map((venue) => {
                const primaryCourt = venue.courts[0];
                const selectedSlot = primaryCourt ? selectedSlots[primaryCourt.id] : "";

                return (
                  <div
                    key={venue.id}
                    className="w-[85vw] max-w-[340px] md:w-auto md:max-w-none shrink-0 md:shrink snap-center group rounded-[18px] border border-white/[0.06] bg-[#242427] hover:bg-[#28282c] overflow-hidden transition-all flex flex-col justify-between shadow-sm"
                  >
                  <div>
                    {/* Visual Media Header */}
                    <div className="relative h-48 w-full bg-[#1c1c1f] flex items-center justify-center overflow-hidden">
                      {venue.images && venue.images[0] ? (
                        <Image
                          src={venue.images[0]}
                          alt={venue.name}
                          fill
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                          className="object-cover object-center group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="text-muted-foreground text-xs font-medium flex flex-col items-center gap-1">
                          <span className="h-2 w-2 rounded-full bg-primary/60" />
                          <span>معاينة حية للملعب</span>
                        </div>
                      )}

                      {/* Top Badges */}
                      <div className="absolute top-3 right-3 z-10 inline-flex items-center gap-1 rounded-full bg-[#1c1c1f]/90 backdrop-blur-md border border-white/10 px-3 py-1 text-xs font-bold text-white">
                        <MapPin className="h-3 w-3 text-primary" strokeWidth={1.5} />
                        <span>
                          {venue.distance_km
                            ? `يبعد ${venue.distance_km} كم عنك`
                            : venue.district}
                        </span>
                      </div>

                      <div className="absolute top-3 left-3 z-10 inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-black text-black">
                        {primaryCourt?.sport === "football"
                          ? "خماسي ترتان"
                          : primaryCourt?.surface === "covered_padel"
                          ? "بادل مغطى"
                          : "بادل بانوراما"}
                      </div>
                    </div>

                    {/* Card Content Details */}
                    <div className="p-5">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-display text-lg font-bold text-white group-hover:text-primary transition-colors">
                          {venue.name}
                        </h3>
                      </div>

                      <p className="text-xs text-muted-foreground mb-4">
                        {venue.address}
                      </p>

                      {/* Interactive Available Slots Box */}
                      {primaryCourt && (
                        <div className="rounded-xl bg-[#1c1c1f] border border-white/[0.04] p-3 mb-2">
                          <div className="flex items-center justify-between text-xs mb-2">
                            <span className="text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5 text-primary" strokeWidth={1.5} />
                              <span>مواعيدك {selectedDay.label}:</span>
                            </span>
                            <span className="font-bold text-primary flex items-center gap-1">
                              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                              {(primaryCourt.available_slots || []).length} فترات
                            </span>
                          </div>

                          {/* Time Slots Button Grid */}
                          <div className="flex flex-wrap gap-2">
                            {(primaryCourt.available_slots || []).map((slot, index) => {
                              const isSelected = selectedSlot === slot;
                              return (
                                <button
                                  key={index}
                                  type="button"
                                  onClick={() => handleSlotSelect(primaryCourt.id, slot)}
                                  className={`min-h-[38px] rounded-lg px-2.5 py-1 text-xs font-bold tabular-nums transition-all ${
                                    isSelected
                                      ? "bg-primary text-black font-extrabold shadow-[0_2px_10px_rgba(16,185,129,0.35)] scale-105"
                                      : "bg-[#2e2e33] text-primary hover:bg-[#383840]"
                                  }`}
                                >
                                  {slot}
                                </button>
                              );
                            })}
                          </div>

                          {selectedSlot && (
                            <div className="mt-2.5 pt-2 border-t border-white/[0.06] flex flex-col gap-1 text-[11px]">
                              <div className="flex items-center justify-between text-primary font-bold">
                                <span>الميعاد: {selectedSlot} ({selectedDay.label})</span>
                                <span className="text-white/70 font-normal">عربون {venue.deposit_amount || 100} ج.م</span>
                              </div>
                              <span className="text-zinc-400 text-[10px]">
                                قفل 8 دقايق عشان تلحق تحول العربون ومحدش يسبقك
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card Footer: Pricing & Action Button */}
                  <div className="px-5 py-4 flex items-center justify-between border-t border-white/[0.06] mt-auto bg-[#1e1e21]">
                    <div>
                      <span className="text-xs text-muted-foreground block mb-0.5">
                        سعر الساعة
                      </span>
                      <span className="font-extrabold text-white text-lg tabular-nums">
                        {primaryCourt?.price_evening || 200}{" "}
                        <span className="text-xs font-medium text-muted-foreground">ج.م</span>
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const slotToBook = selectedSlot || (primaryCourt?.available_slots?.[0] || "08:00 م");
                        if (primaryCourt) {
                          setBookingModalData({
                            venue,
                            court: primaryCourt,
                            bookingDate: selectedDay.dateStr,
                            displayDate: selectedDay.displayDate,
                            dayLabel: selectedDay.label,
                            slotTime: slotToBook,
                          });
                          setIsBookingModalOpen(true);
                        }
                      }}
                      className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-black hover:bg-primary-hover active:scale-[0.98] transition-all shadow-[0_2px_10px_rgba(16,185,129,0.2)]"
                    >
                      <span>{selectedSlot ? `أكّد ${selectedSlot}` : "احجز ميعادك"}</span>
                      <ChevronLeft className="h-4 w-4" strokeWidth={2.5} />
                    </button>
                  </div>
                </div>
              );
            })}
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
