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
  SlidersHorizontal,
  ArrowDownWideNarrow,
  Building2,
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

const DAMANHOUR_DISTRICTS = [
  { key: "all", label: "كل دمنهور" },
  { key: "عبد السلام الشاذلي", label: "شارع عبد السلام الشاذلي" },
  { key: "شبرا", label: "طريق شبرا" },
  { key: "المعهد الديني", label: "شارع المعهد الديني" },
];

export default function CourtsCatalogPage() {
  const [venues, setVenues] = useState<VenueWithCourts[]>(DAMANHOUR_SEED_VENUES);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSport, setSelectedSport] = useState<"all" | SportType>("all");
  const [availableDays] = useState<DayOption[]>(getEgyptianDays());
  const [selectedDayKey, setSelectedDayKey] = useState<string>("today");
  const [selectedDistrict, setSelectedDistrict] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"default" | "distance" | "price_asc">("default");
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);

  // Smart Auto-Hiding Scroll Effect (Hides on scroll-down, reveals on scroll-up)
  useEffect(() => {
    let lastScrollY = window.scrollY;
    let ticking = false;
    const threshold = 10; // minimum scroll delta to prevent jitter

    const updateScrollDirection = () => {
      const currentScrollY = window.scrollY;

      // Always visible near top of page
      if (currentScrollY < 90) {
        setIsHeaderVisible(true);
        lastScrollY = currentScrollY;
        ticking = false;
        return;
      }

      const diff = currentScrollY - lastScrollY;

      if (Math.abs(diff) >= threshold) {
        if (diff > 0) {
          // Scrolling down -> hide
          setIsHeaderVisible(false);
        } else {
          // Scrolling up -> reveal
          setIsHeaderVisible(true);
        }
        lastScrollY = currentScrollY;
      }

      ticking = false;
    };

    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(updateScrollDirection);
        ticking = true;
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

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
        setSortBy("distance");
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

  // Filter & Sort venues
  const filteredVenues = venues
    .filter((venue) => {
      // Sport filter
      if (selectedSport !== "all") {
        const matchSport = venue.courts.some((c) => c.sport === selectedSport);
        if (!matchSport) return false;
      }

      // District filter
      if (selectedDistrict !== "all") {
        const matchDistrict =
          venue.district.includes(selectedDistrict) ||
          venue.address.includes(selectedDistrict);
        if (!matchDistrict) return false;
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
    })
    .sort((a, b) => {
      if (sortBy === "distance" && a.distance_km && b.distance_km) {
        return a.distance_km - b.distance_km;
      }
      if (sortBy === "price_asc") {
        const priceA = a.courts[0]?.price_evening || 200;
        const priceB = b.courts[0]?.price_evening || 200;
        return priceA - priceB;
      }
      return 0;
    });

  // Count active filters (for badge)
  const activeFiltersCount =
    (selectedSport !== "all" ? 1 : 0) +
    (selectedDistrict !== "all" ? 1 : 0) +
    (selectedDayKey !== "today" ? 1 : 0) +
    (sortBy !== "default" ? 1 : 0);

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
    setSelectedDistrict("all");
    setSortBy("default");
  };

  return (
    <div className="w-full min-h-screen bg-background text-foreground py-6 md:py-10">
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* Breadcrumb Navigation */}
        <nav aria-label="مسار التنقل" className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
          <Link href="/" className="hover:text-primary transition-colors">
            الرئيسية
          </Link>
          <ChevronLeft className="h-3 w-3 text-muted-foreground/60" />
          <span className="text-white font-bold">دليل ملاعب دمنهور والبحيرة</span>
        </nav>

        {/* Page Title & Intro */}
        <div className="mb-6">
          <h1 className="font-display text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight">
            دليل ملاعب دمنهور والبحيرة
          </h1>
          <p className="text-muted-foreground text-xs sm:text-sm mt-1">
            قارن بين ملاعب البادل والخماسي في دمنهور، اعرف المسافة، واحجز ميعادك فوراً.
          </p>
        </div>

        {/* Modern Frameless Search & Filter Suite with Smart Auto-Hiding Scroll */}
        <div
          className={`sticky top-16 z-30 bg-background/95 backdrop-blur-xl py-2 mb-6 space-y-3 transition-all duration-300 ease-in-out ${
            isHeaderVisible
              ? "translate-y-0 opacity-100 pointer-events-auto"
              : "-translate-y-28 opacity-0 pointer-events-none"
          }`}
        >
          
          {/* Top Row: Search Input + Filter Drawer Button */}
          <div className="flex items-center gap-2">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" strokeWidth={1.5} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث باسم الملعب أو المنطقة (الشاذلي، شبرا...)"
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

            {/* Filter Drawer Trigger Button */}
            <button
              type="button"
              onClick={() => setIsFilterDrawerOpen(true)}
              className={`inline-flex min-h-[46px] items-center justify-center gap-2 rounded-xl px-4 text-xs font-bold transition-all border shrink-0 ${
                activeFiltersCount > 0
                  ? "bg-primary text-black border-primary shadow-[0_2px_12px_rgba(16,185,129,0.3)] font-black"
                  : "bg-[#242427] border-white/[0.08] text-white hover:bg-[#2c2c30]"
              }`}
            >
              <SlidersHorizontal className={`h-4 w-4 ${activeFiltersCount > 0 ? "text-black" : "text-primary"}`} strokeWidth={1.5} />
              <span>فلاتر</span>
              {activeFiltersCount > 0 && (
                <span className="h-5 w-5 rounded-full bg-black text-white text-[10px] font-black flex items-center justify-center">
                  {activeFiltersCount}
                </span>
              )}
            </button>
          </div>

          {/* Quick-Filter Horizontal Scrollable Chip Rail */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none text-xs">
            {/* Quick Sport Pills */}
            <button
              type="button"
              onClick={() => setSelectedSport("all")}
              className={`inline-flex min-h-[36px] items-center justify-center rounded-lg px-3.5 font-bold transition-all whitespace-nowrap shrink-0 border ${
                selectedSport === "all"
                  ? "bg-primary text-black border-primary font-black"
                  : "bg-[#242427] border-white/[0.06] text-zinc-300 hover:text-white"
              }`}
            >
              كل الرياضات
            </button>

            <button
              type="button"
              onClick={() => setSelectedSport("padel")}
              className={`inline-flex min-h-[36px] items-center justify-center rounded-lg px-3.5 font-bold transition-all whitespace-nowrap shrink-0 border ${
                selectedSport === "padel"
                  ? "bg-primary text-black border-primary font-black"
                  : "bg-[#242427] border-white/[0.06] text-zinc-300 hover:text-white"
              }`}
            >
              بادل
            </button>

            <button
              type="button"
              onClick={() => setSelectedSport("football")}
              className={`inline-flex min-h-[36px] items-center justify-center rounded-lg px-3.5 font-bold transition-all whitespace-nowrap shrink-0 border ${
                selectedSport === "football"
                  ? "bg-primary text-black border-primary font-black"
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
                  className={`inline-flex min-h-[36px] items-center gap-1.5 rounded-lg px-3 font-bold transition-all whitespace-nowrap shrink-0 border ${
                    isSelected
                      ? "bg-white text-black border-white font-black"
                      : "bg-[#242427] text-zinc-300 border-white/[0.06] hover:text-white"
                  }`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${isSelected ? "bg-black" : "bg-primary"}`} />
                  <span>{day.label}</span>
                </button>
              );
            })}

            <span className="h-4 w-px bg-white/10 shrink-0" />

            {/* Quick GPS Locator Chip */}
            <button
              type="button"
              onClick={requestLocation}
              disabled={isLocating}
              className={`inline-flex min-h-[36px] items-center gap-1.5 rounded-lg px-3 font-bold transition-all whitespace-nowrap shrink-0 border ${
                locationStatus === "located"
                  ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400"
                  : "bg-[#242427] border-white/[0.06] text-zinc-300 hover:text-white"
              }`}
            >
              <Navigation className={`h-3.5 w-3.5 text-primary ${isLocating ? "animate-spin" : ""}`} strokeWidth={1.5} />
              <span>{isLocating ? "بنحدد موقعك..." : locationStatus === "located" ? "الأقرب إليك" : "الأقرب بالـ GPS"}</span>
            </button>
          </div>

        </div>

        {/* Results Banner & Active Filter Reset */}
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-6 px-1">
          <span>
            يتم عرض <strong className="text-white font-bold tabular-nums">{filteredVenues.length}</strong> ملاعب في دمنهور
            {searchQuery && ` مطابقة لـ "${searchQuery}"`}
          </span>

          {activeFiltersCount > 0 && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="text-primary hover:underline font-bold flex items-center gap-1"
            >
              <RotateCcw className="h-3 w-3" strokeWidth={1.5} />
              <span>إعادة ضبط ({activeFiltersCount})</span>
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

      {/* Modern Mobile Filter Bottom Sheet Drawer (Airbnb / Yalla Hagz style) */}
      {isFilterDrawerOpen && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
            onClick={() => setIsFilterDrawerOpen(false)}
          />

          {/* Bottom Sheet Drawer Container */}
          <div className="relative w-full sm:max-w-md bg-[#18181c] border-t sm:border border-white/10 rounded-t-[28px] sm:rounded-2xl max-h-[88vh] flex flex-col z-10 shadow-2xl animate-in slide-in-from-bottom duration-300">
            
            {/* Drawer Header */}
            <div className="flex items-center justify-between p-5 border-b border-white/[0.08]">
              <div>
                <h3 className="font-display text-lg font-black text-white">
                  فلاتر البحث والملاعب
                </h3>
                <p className="text-xs text-muted-foreground">
                  خصص بحثك في دمنهور عشان تلاقي أنسب ملعب لفرقتك
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsFilterDrawerOpen(false)}
                className="h-10 w-10 rounded-xl bg-[#242427] hover:bg-[#2e2e33] flex items-center justify-center text-zinc-300 transition-colors"
              >
                <X className="h-5 w-5" strokeWidth={1.5} />
              </button>
            </div>

            {/* Scrollable Drawer Body */}
            <div className="p-5 space-y-6 overflow-y-auto max-h-[60vh] scrollbar-none">
              
              {/* Section 1: نوع الرياضة */}
              <div>
                <span className="text-xs font-bold text-white block mb-2.5">
                  نوع الرياضة:
                </span>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedSport("all")}
                    className={`min-h-[44px] rounded-xl text-xs font-bold transition-all border ${
                      selectedSport === "all"
                        ? "bg-primary text-black border-primary font-black shadow-sm"
                        : "bg-[#242427] text-zinc-300 border-white/[0.06] hover:bg-[#2c2c30]"
                    }`}
                  >
                    كل الرياضات
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedSport("padel")}
                    className={`min-h-[44px] rounded-xl text-xs font-bold transition-all border ${
                      selectedSport === "padel"
                        ? "bg-primary text-black border-primary font-black shadow-sm"
                        : "bg-[#242427] text-zinc-300 border-white/[0.06] hover:bg-[#2c2c30]"
                    }`}
                  >
                    بادل
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedSport("football")}
                    className={`min-h-[44px] rounded-xl text-xs font-bold transition-all border ${
                      selectedSport === "football"
                        ? "bg-primary text-black border-primary font-black shadow-sm"
                        : "bg-[#242427] text-zinc-300 border-white/[0.06] hover:bg-[#2c2c30]"
                    }`}
                  >
                    كرة قدم
                  </button>
                </div>
              </div>

              {/* Section 2: يوم الماتش */}
              <div>
                <span className="text-xs font-bold text-white block mb-2.5">
                  يوم الحجز:
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {availableDays.map((day) => {
                    const isSelected = selectedDayKey === day.key;
                    return (
                      <button
                        key={day.key}
                        type="button"
                        onClick={() => setSelectedDayKey(day.key)}
                        className={`min-h-[44px] flex flex-col items-center justify-center py-1.5 rounded-xl text-xs font-bold transition-all border ${
                          isSelected
                            ? "bg-white text-black border-white font-black shadow-sm"
                            : "bg-[#242427] text-zinc-300 border-white/[0.06] hover:bg-[#2c2c30]"
                        }`}
                      >
                        <span>{day.label}</span>
                        <span className={`text-[10px] ${isSelected ? "text-black/80" : "text-zinc-500"}`}>
                          {day.displayDate.split(" ")[0]}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Section 3: المنطقة داخل دمنهور */}
              <div>
                <span className="text-xs font-bold text-white block mb-2.5">
                  المنطقة في دمنهور:
                </span>
                <div className="flex flex-col gap-2">
                  {DAMANHOUR_DISTRICTS.map((district) => {
                    const isSelected = selectedDistrict === district.key;
                    return (
                      <button
                        key={district.key}
                        type="button"
                        onClick={() => setSelectedDistrict(district.key)}
                        className={`min-h-[44px] flex items-center justify-between px-4 rounded-xl text-xs font-bold transition-all border ${
                          isSelected
                            ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400 font-black"
                            : "bg-[#242427] text-zinc-300 border-white/[0.06] hover:bg-[#2c2c30]"
                        }`}
                      >
                        <span>{district.label}</span>
                        {isSelected && <Check className="h-4 w-4 text-primary" strokeWidth={2.5} />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Section 4: الترتيب */}
              <div>
                <span className="text-xs font-bold text-white block mb-2.5">
                  ترتيب النتائج:
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSortBy("default");
                      setLocationStatus("idle");
                    }}
                    className={`min-h-[44px] rounded-xl text-xs font-bold transition-all border ${
                      sortBy === "default"
                        ? "bg-primary text-black border-primary font-black"
                        : "bg-[#242427] text-zinc-300 border-white/[0.06] hover:bg-[#2c2c30]"
                    }`}
                  >
                    الافتراضي (الأعلى تقييماً)
                  </button>

                  <button
                    type="button"
                    onClick={requestLocation}
                    className={`min-h-[44px] rounded-xl text-xs font-bold transition-all border ${
                      sortBy === "distance"
                        ? "bg-primary text-black border-primary font-black"
                        : "bg-[#242427] text-zinc-300 border-white/[0.06] hover:bg-[#2c2c30]"
                    }`}
                  >
                    الأقرب جغرافياً (GPS)
                  </button>
                </div>
              </div>

            </div>

            {/* Fixed Drawer Footer */}
            <div className="p-4 pb-8 sm:pb-4 border-t border-white/[0.08] bg-[#141418] flex items-center gap-3">
              <button
                type="button"
                onClick={handleClearFilters}
                className="min-h-[48px] px-5 rounded-xl border border-white/[0.08] text-xs font-bold text-zinc-300 hover:text-white hover:bg-white/[0.04] transition-all"
              >
                مسح الكل
              </button>

              <button
                type="button"
                onClick={() => setIsFilterDrawerOpen(false)}
                className="flex-1 min-h-[48px] rounded-xl bg-primary hover:bg-primary-hover px-5 text-xs font-black text-black transition-all shadow-[0_2px_12px_rgba(16,185,129,0.3)] active:scale-98"
              >
                عرض ({filteredVenues.length}) ملاعب
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
