"use client";

import { useState, useEffect, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  MapPin,
  Navigation,
  Clock,
  ChevronLeft,
  Check,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import {
  getVenues,
  calculateDistanceKm,
  DAMANHOUR_SEED_VENUES,
  type VenueWithCourts,
} from "@/lib/api/venues";
import type { SportType } from "@/lib/supabase/types";

export default function CourtsSection() {
  const [venues, setVenues] = useState<VenueWithCourts[]>(DAMANHOUR_SEED_VENUES);
  const [selectedSport, setSelectedSport] = useState<"all" | SportType>("all");
  const [userLocation, setUserLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locationStatus, setLocationStatus] = useState<"idle" | "located" | "denied">("idle");
  const [selectedSlots, setSelectedSlots] = useState<{ [courtId: string]: string }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isPending, startTransition] = useTransition();

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
        
        {/* Section Header & Interactive Controls */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-1.5 text-xs font-medium text-zinc-200 backdrop-blur-md w-fit mb-3">
              <Navigation className="h-3.5 w-3.5 text-emerald-400" strokeWidth={1.5} />
              <span>ملاعب دمنهور المتاحة • حجز فوري</span>
            </div>
            
            <h2 className="font-display text-2xl sm:text-4xl font-extrabold text-white">
              أقرب الملاعب ليك
            </h2>
            <p className="text-muted-foreground text-sm mt-1">
              مواعيد حية، أسعار مباشرة، وتأكيد حجز بالعربون بالثانية
            </p>
          </div>

          {/* Interactive Filters & GPS Locator Controls */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Filter Pills */}
            <button
              type="button"
              onClick={() => setSelectedSport("all")}
              className={`inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full px-5 text-xs sm:text-sm font-bold transition-all ${
                selectedSport === "all"
                  ? "bg-primary text-black font-black shadow-[0_2px_12px_rgba(16,185,129,0.3)]"
                  : "bg-[#242427] border border-white/[0.06] text-white hover:bg-[#2c2c30]"
              }`}
            >
              كل الملاعب
            </button>

            <button
              type="button"
              onClick={() => setSelectedSport("padel")}
              className={`inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full px-5 text-xs sm:text-sm font-bold transition-all ${
                selectedSport === "padel"
                  ? "bg-primary text-black font-black shadow-[0_2px_12px_rgba(16,185,129,0.3)]"
                  : "bg-[#242427] border border-white/[0.06] text-white hover:bg-[#2c2c30]"
              }`}
            >
              ملاعب البادل
            </button>

            <button
              type="button"
              onClick={() => setSelectedSport("football")}
              className={`inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full px-5 text-xs sm:text-sm font-bold transition-all ${
                selectedSport === "football"
                  ? "bg-primary text-black font-black shadow-[0_2px_12px_rgba(16,185,129,0.3)]"
                  : "bg-[#242427] border border-white/[0.06] text-white hover:bg-[#2c2c30]"
              }`}
            >
              كرة قدم خماسي
            </button>

            {/* GPS Geolocation Locator Button */}
            <button
              type="button"
              onClick={requestLocation}
              disabled={isLocating}
              className={`inline-flex min-h-[44px] min-w-[44px] items-center gap-2 rounded-full px-4 text-xs font-bold transition-all border ${
                locationStatus === "located"
                  ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400"
                  : "bg-[#242427] border-white/[0.06] text-zinc-300 hover:text-white hover:bg-[#2c2c30]"
              }`}
            >
              <Navigation
                className={`h-3.5 w-3.5 text-primary ${isLocating ? "animate-spin" : ""}`}
                strokeWidth={1.5}
              />
              <span>
                {isLocating
                  ? "جاري تحديد موقعك..."
                  : locationStatus === "located"
                  ? "الأقرب إليك أولاً"
                  : "رتّب حسب موقعي"}
              </span>
            </button>
          </div>
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
                تعذر تحميل الملاعب
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                حدث خطأ أثناء الاتصال بقاعدة البيانات. يمكنك المحاولة مرة أخرى.
              </p>
            </div>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-primary px-6 text-xs font-bold text-black hover:bg-primary-hover transition-all"
            >
              إعادة المحاولة
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
                لا توجد ملاعب بهذا التصنيف حالياً
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                جرب اختيار تصنيف آخر أو استعرض كل ملاعب دمنهور المعتمدة.
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

        {/* 4. Loaded State: Interactive Courts Grid */}
        {!isLoading && !hasError && filteredVenues.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredVenues.map((venue) => {
              const primaryCourt = venue.courts[0];
              const selectedSlot = primaryCourt ? selectedSlots[primaryCourt.id] : "";

              return (
                <div
                  key={venue.id}
                  className="group rounded-[18px] border border-white/[0.06] bg-[#242427] hover:bg-[#28282c] overflow-hidden transition-all flex flex-col justify-between shadow-sm"
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
                              المواعيد المتاحة اليوم:
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
                                  className={`min-h-[36px] rounded-lg px-2.5 py-1 text-xs font-bold tabular-nums transition-all ${
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
                            <div className="mt-2.5 pt-2 border-t border-white/[0.06] flex items-center justify-between text-[11px] text-primary font-bold">
                              <span>الميعاد المختار: {selectedSlot}</span>
                              <span className="text-white/60 font-normal">قفل 8 دقائق عند المتابعة</span>
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

                    <Link
                      href={`#book?venue=${venue.slug}&slot=${encodeURIComponent(selectedSlot || "")}`}
                      className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-black hover:bg-primary-hover active:scale-[0.98] transition-all shadow-[0_2px_10px_rgba(16,185,129,0.2)]"
                    >
                      <span>{selectedSlot ? `تأكيد ${selectedSlot}` : "احجز الآن"}</span>
                      <ChevronLeft className="h-4 w-4" strokeWidth={2.5} />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>
    </section>
  );
}
