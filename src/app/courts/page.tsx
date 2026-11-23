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
  Search,
  X,
  RotateCcw,
  ShieldCheck,
  Check,
  Sparkles,
} from "lucide-react";
import {
  getVenues,
  calculateDistanceKm,
  DAMANHOUR_SEED_VENUES,
  type VenueWithCourts,
} from "@/lib/api/venues";
import type { SportType } from "@/lib/supabase/types";

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

export default function CourtsCatalogPage() {
  const [venues, setVenues] = useState<VenueWithCourts[]>(DAMANHOUR_SEED_VENUES);
  const [searchQuery, setSearchQuery] = useState("");
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

  // Filter venues by search query and sport
  const filteredVenues = venues.filter((venue) => {
    // Sport filter
    if (selectedSport !== "all") {
      const matchSport = venue.courts.some((c) => c.sport === selectedSport);
      if (!matchSport) return false;
    }

    // Search query filter (name, district, address)
    if (searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase();
      const matchName = venue.name.toLowerCase().includes(query);
      const matchDistrict = venue.district.toLowerCase().includes(query);
      const matchAddress = venue.address.toLowerCase().includes(query);
      if (!matchName && !matchDistrict && !matchAddress) return false;
    }

    return true;
  });

  // Slot Selection Handler
  const handleSlotSelect = (courtId: string, slot: string) => {
    setSelectedSlots((prev) => ({
      ...prev,
      [courtId]: prev[courtId] === slot ? "" : slot,
    }));
  };

  const handleClearFilters = () => {
    setSearchQuery("");
    setSelectedSport("all");
    setSelectedDayKey("today");
  };

  return (
    <div className="w-full min-h-screen bg-background text-foreground py-8 md:py-12">
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* Breadcrumb Navigation */}
        <nav aria-label="مسار التنقل" className="flex items-center gap-2 text-xs text-muted-foreground mb-6">
          <Link href="/" className="hover:text-primary transition-colors">
            الرئيسية
          </Link>
          <ChevronLeft className="h-3 w-3 text-muted-foreground/60" />
          <span className="text-white font-bold">دليل ملاعب دمنهور والبحيرة</span>
        </nav>

        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8 border-b border-border/30 pb-8">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-1.5 text-xs font-medium text-zinc-200 backdrop-blur-md w-fit mb-3">
              <Navigation className="h-3.5 w-3.5 text-emerald-400" strokeWidth={1.5} />
              <span>دليل الملاعب المعتمدة • دمنهور</span>
            </div>

            <h1 className="font-display text-2xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight">
              كافة ملاعب دمنهور والبحيرة
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base mt-2 max-w-2xl leading-relaxed">
              ابحث عن ملعبك المفضل، قارن الأسعار، واعرف المسافة بالكيلومتر مع تأكيد حجزك الفوري بالعربون.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs text-zinc-400 bg-[#1c1c1f] border border-white/[0.06] rounded-2xl px-4 py-2.5 w-fit">
            <ShieldCheck className="h-4 w-4 text-primary" strokeWidth={1.5} />
            <span>حجز مؤمن ومحمي من التضارب</span>
          </div>
        </div>

        {/* Interactive Search & Filters Bar */}
        <div className="rounded-2xl bg-[#18181c] border border-white/[0.06] p-4 sm:p-6 mb-8 space-y-4 shadow-sm">
          {/* Row 1: Search Input & GPS Locator */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" strokeWidth={1.5} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث باسم الملعب أو المنطقة (الشاذلي، شبرا، المعهد الديني...)"
                className="w-full min-h-[46px] rounded-xl bg-[#242427] border border-white/[0.08] pr-10 pl-10 text-xs sm:text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-primary transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute left-3 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-zinc-300 transition-colors"
                >
                  <X className="h-3 w-3" strokeWidth={2} />
                </button>
              )}
            </div>

            {/* GPS Locator Button */}
            <button
              type="button"
              onClick={requestLocation}
              disabled={isLocating}
              className={`inline-flex min-h-[46px] min-w-[46px] items-center justify-center gap-2 rounded-xl px-5 text-xs sm:text-sm font-bold transition-all border shrink-0 ${
                locationStatus === "located"
                  ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400"
                  : "bg-[#242427] border-white/[0.08] text-zinc-300 hover:text-white hover:bg-[#2c2c30]"
              }`}
            >
              <Navigation
                className={`h-4 w-4 text-primary ${isLocating ? "animate-spin" : ""}`}
                strokeWidth={1.5}
              />
              <span>
                {isLocating
                  ? "بنحدد مكانك..."
                  : locationStatus === "located"
                  ? "الأقرب إليك أولاً"
                  : "رتّب حسب موقعي"}
              </span>
            </button>
          </div>

          {/* Row 2: Sport Category Filters & Day Selector */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pt-2 border-t border-white/[0.04]">
            {/* Sport Filter Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
              <button
                type="button"
                onClick={() => setSelectedSport("all")}
                className={`inline-flex min-h-[42px] items-center justify-center rounded-xl px-4 text-xs font-bold transition-all whitespace-nowrap border ${
                  selectedSport === "all"
                    ? "bg-primary text-black border-primary font-black shadow-[0_2px_10px_rgba(16,185,129,0.25)]"
                    : "bg-[#242427] border-white/[0.06] text-zinc-300 hover:text-white hover:bg-[#2c2c30]"
                }`}
              >
                كل الملاعب ({venues.length})
              </button>

              <button
                type="button"
                onClick={() => setSelectedSport("padel")}
                className={`inline-flex min-h-[42px] items-center justify-center rounded-xl px-4 text-xs font-bold transition-all whitespace-nowrap border ${
                  selectedSport === "padel"
                    ? "bg-primary text-black border-primary font-black shadow-[0_2px_10px_rgba(16,185,129,0.25)]"
                    : "bg-[#242427] border-white/[0.06] text-zinc-300 hover:text-white hover:bg-[#2c2c30]"
                }`}
              >
                ملاعب البادل
              </button>

              <button
                type="button"
                onClick={() => setSelectedSport("football")}
                className={`inline-flex min-h-[42px] items-center justify-center rounded-xl px-4 text-xs font-bold transition-all whitespace-nowrap border ${
                  selectedSport === "football"
                    ? "bg-primary text-black border-primary font-black shadow-[0_2px_10px_rgba(16,185,129,0.25)]"
                    : "bg-[#242427] border-white/[0.06] text-zinc-300 hover:text-white hover:bg-[#2c2c30]"
                }`}
              >
                كرة قدم خماسي
              </button>
            </div>

            {/* Day Selector */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
              <span className="text-xs text-zinc-400 font-bold hidden sm:inline shrink-0">
                يوم الماتش:
              </span>
              {availableDays.map((day) => {
                const isSelected = selectedDayKey === day.key;
                return (
                  <button
                    key={day.key}
                    type="button"
                    onClick={() => setSelectedDayKey(day.key)}
                    className={`inline-flex min-h-[42px] items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all whitespace-nowrap shrink-0 border ${
                      isSelected
                        ? "bg-white text-black border-white shadow-sm font-black"
                        : "bg-[#242427] text-zinc-300 border-white/[0.06] hover:bg-[#2c2c30] hover:text-white"
                    }`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${isSelected ? "bg-black" : "bg-primary"}`} />
                    <span>{day.label}</span>
                    <span className={`text-[10px] ${isSelected ? "text-black/80 font-bold" : "text-zinc-500 font-normal"}`}>
                      ({day.displayDate})
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Results Count Banner */}
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-6 px-1">
          <span>
            يتم عرض <strong className="text-white font-bold tabular-nums">{filteredVenues.length}</strong> ملاعب متاحة
            {searchQuery && ` مطابقة لبحثك: "${searchQuery}"`}
          </span>

          {(searchQuery || selectedSport !== "all") && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="text-primary hover:underline font-bold flex items-center gap-1"
            >
              <RotateCcw className="h-3 w-3" strokeWidth={1.5} />
              <span>إعادة ضبط الفلاتر</span>
            </button>
          )}
        </div>

        {/* 1. Shimmer Skeleton State */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="rounded-[18px] border border-white/[0.06] bg-[#242427] overflow-hidden p-5 flex flex-col gap-4 animate-pulse"
              >
                <div className="h-48 w-full bg-[#1c1c1f] rounded-xl" />
                <div className="h-5 w-2/3 bg-white/[0.06] rounded-md" />
                <div className="h-4 w-1/2 bg-white/[0.04] rounded-md" />
                <div className="h-20 w-full bg-[#1c1c1f] rounded-xl" />
                <div className="h-10 w-full bg-white/[0.05] rounded-xl mt-auto" />
              </div>
            ))}
          </div>
        )}

        {/* 2. Error State */}
        {hasError && !isLoading && (
          <div className="rounded-[18px] border border-white/[0.08] bg-[#242427] p-12 text-center flex flex-col items-center gap-4 max-w-md mx-auto my-12">
            <span className="h-12 w-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
              <RotateCcw className="h-5 w-5" strokeWidth={1.5} />
            </span>
            <div>
              <h3 className="font-display text-base font-bold text-white mb-1">
                تعذر تحميل قائمة الملاعب
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                حدث خطأ في الاتصال بالخادم السحابي. يرجى المحاولة مرة أخرى.
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

        {/* 3. Empty Search State */}
        {!isLoading && !hasError && filteredVenues.length === 0 && (
          <div className="rounded-[18px] border border-white/[0.08] bg-[#242427] p-12 text-center flex flex-col items-center gap-4 max-w-lg mx-auto my-12">
            <span className="h-14 w-14 rounded-2xl bg-[#2e2e33] flex items-center justify-center text-primary">
              <Search className="h-6 w-6" strokeWidth={1.5} />
            </span>
            <div>
              <h3 className="font-display text-lg font-bold text-white mb-1">
                مفيش ملاعب مطابقة لبحثك في دمنهور
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed max-w-sm mx-auto">
                جرّب البحث باسم شارع آخر مثل &quot;الشاذلي&quot; أو &quot;شبرا&quot;، أو أعد تعيين الفلاتر لعرض كل الملاعب.
              </p>
            </div>
            <button
              type="button"
              onClick={handleClearFilters}
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-primary px-6 text-xs font-bold text-black hover:bg-primary-hover transition-all"
            >
              عرض كافة ملاعب دمنهور
            </button>
          </div>
        )}

        {/* 4. Loaded State: All Venues Grid */}
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

                      <p className="text-xs text-muted-foreground mb-3 line-clamp-1">
                        {venue.address}
                      </p>

                      {/* Amenities Chips */}
                      {venue.amenities && venue.amenities.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-4">
                          {venue.amenities.slice(0, 3).map((amenity, idx) => (
                            <span
                              key={idx}
                              className="rounded-md bg-white/[0.04] border border-white/[0.04] px-2 py-0.5 text-[10px] text-zinc-300"
                            >
                              {amenity}
                            </span>
                          ))}
                        </div>
                      )}

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

                    <Link
                      href={`#book?venue=${venue.slug}&date=${selectedDay.dateStr}&slot=${encodeURIComponent(selectedSlot || "")}`}
                      className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-black hover:bg-primary-hover active:scale-[0.98] transition-all shadow-[0_2px_10px_rgba(16,185,129,0.2)]"
                    >
                      <span>{selectedSlot ? `أكّد ${selectedSlot}` : "احجز ميعادك"}</span>
                      <ChevronLeft className="h-4 w-4" strokeWidth={2.5} />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
}
