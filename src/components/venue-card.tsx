"use client";

import { useState } from "react";
import Image from "next/image";
import {
  MapPin,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Lock,
  Star,
  BellRing,
} from "lucide-react";
import type { VenueWithCourts } from "@/lib/api/venues";
import type { SportType } from "@/lib/supabase/types";
import type { BookingModalData } from "@/components/booking-modal";
import type { VenueRatingSummary } from "@/lib/api/bookings";
import { slotLabelToDbTime } from "@/lib/api/bookings";
import FavoriteVenueButton from "@/components/favorite-venue-button";

export interface DayOption {
  key: string;
  label: string;
  dateStr: string;
  displayDate: string;
}

export interface VenueCardProps {
  venue: VenueWithCourts;
  selectedSport?: "all" | SportType;
  selectedDay: DayOption;
  ratingSummary?: VenueRatingSummary;
  watchedSlots: Record<
    string,
    { venueId: string; courtId: string; dateStr: string; slotLabel: string }
  >;
  isSlotLocked: (courtId: string, slotLabel: string) => boolean;
  onWatchSlot: (venueId: string, courtId: string, slotLabel: string) => Promise<void>;
  onBook: (modalData: BookingModalData) => void;
  variant?: "rail" | "grid";
  className?: string;
}

export default function VenueCard({
  venue,
  selectedSport = "all",
  selectedDay,
  ratingSummary,
  watchedSlots,
  isSlotLocked,
  onWatchSlot,
  onBook,
  variant = "grid",
  className = "",
}: VenueCardProps) {
  const filteredCourts =
    selectedSport === "all"
      ? venue.courts
      : venue.courts.filter((c) => c.sport === selectedSport);
  const selectableCourts = filteredCourts.length > 0 ? filteredCourts : venue.courts;

  const [activeCourtId, setActiveCourtId] = useState<string>(
    selectableCourts[0]?.id || ""
  );
  const [selectedSlot, setSelectedSlot] = useState<string>("");
  const [slotsPeriodFilter, setSlotsPeriodFilter] = useState<"all" | "evening" | "morning">("all");
  const [isSlotsExpanded, setIsSlotsExpanded] = useState<boolean>(false);

  const activeCourt =
    selectableCourts.find((c) => c.id === activeCourtId) || selectableCourts[0];

  const displayedPrice = (() => {
    if (!activeCourt) return 200;
    if (!selectedSlot) return activeCourt.price_evening || 200;
    const hourNum = parseInt(slotLabelToDbTime(selectedSlot).split(":")[0], 10);
    const peakHour = parseInt(
      (activeCourt.peak_hour_start || "17:00").split(":")[0],
      10
    );
    const isEvening = hourNum >= peakHour || hourNum < 6;
    return isEvening ? activeCourt.price_evening : activeCourt.price_morning;
  })();

  const allSlots = activeCourt?.available_slots || [];
  const filteredSlots = allSlots.filter((slot) => {
    if (slotsPeriodFilter === "evening") return slot.includes("م");
    if (slotsPeriodFilter === "morning") return slot.includes("ص");
    return true;
  });

  const availTotal = allSlots.filter(
    (s) => activeCourt && !isSlotLocked(activeCourt.id, s)
  ).length;
  const eveningCount = allSlots.filter((s) => s.includes("م")).length;
  const morningCount = allSlots.filter((s) => s.includes("ص")).length;

  const containerClasses =
    variant === "rail"
      ? "w-[88vw] max-w-[350px] sm:max-w-[360px] md:w-auto md:max-w-none shrink-0 md:shrink snap-center"
      : "w-full";

  const handleBooking = () => {
    if (!activeCourt) return;
    const available = allSlots.filter((s) => !isSlotLocked(activeCourt.id, s));
    const slotToBook =
      selectedSlot && !isSlotLocked(activeCourt.id, selectedSlot)
        ? selectedSlot
        : available[0] || "08:00 م";

    onBook({
      venue,
      court: activeCourt,
      bookingDate: selectedDay.dateStr,
      displayDate: selectedDay.displayDate,
      dayLabel: selectedDay.label,
      slotTime: slotToBook,
    });
  };

  return (
    <div
      className={`${containerClasses} group rounded-[24px] sm:rounded-[26px] border border-border hover:border-primary/40 bg-card hover:bg-card/90 overflow-hidden transition-all duration-300 flex flex-col justify-between shadow-[0_4px_20px_rgba(0,0,0,0.06)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.5)] hover:shadow-[0_12px_40px_rgba(16,185,129,0.12)] relative ${className}`}
    >
      <div>
        {/* Visual Media Header */}
        <div className="relative h-44 sm:h-48 w-full bg-muted/40 flex items-center justify-center overflow-hidden">
          {venue.images && venue.images[0] ? (
            <Image
              src={venue.images[0]}
              alt={venue.name}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              className="object-cover object-center group-hover:scale-105 transition-transform duration-700 ease-out"
            />
          ) : (
            <div className="text-muted-foreground text-xs font-medium flex flex-col items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-primary/60" />
              <span>معاينة حية للملعب</span>
            </div>
          )}

          {/* Subtle bottom shadow vignette */}
          <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-black/40 pointer-events-none" />

          {/* Floating Top Badges */}
          <div className="absolute top-3 right-3 z-10 inline-flex items-center gap-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 px-3 py-1 text-[11px] font-bold text-white shadow-sm">
            <MapPin className="h-3 w-3 text-primary" strokeWidth={1.5} />
            <span>
              {venue.distance_km ? `يبعد ${venue.distance_km} كم` : venue.district}
            </span>
          </div>

          {/* Floating Favorite Button at Top Left (Universal Placement) */}
          <div className="absolute top-3 left-3 z-10">
            <FavoriteVenueButton venueId={venue.id} size="md" />
          </div>

          {/* Sport Surface Badge at Bottom Right */}
          <div className="absolute bottom-3 right-3 z-10 inline-flex items-center gap-1.5 rounded-full bg-black/70 backdrop-blur-md border border-primary/30 px-3 py-1 text-[11px] font-black text-primary shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            <span>
              {activeCourt?.sport === "football"
                ? "خماسي ترتان"
                : activeCourt?.surface === "covered_padel"
                  ? "بادل مغطى"
                  : "بادل بانوراما"}
            </span>
          </div>
        </div>

        {/* Card Content Details */}
        <div className="p-3.5 sm:p-5">
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <h3 className="font-display text-lg sm:text-xl font-black text-foreground group-hover:text-primary transition-colors leading-tight">
              {venue.name}
            </h3>

            {ratingSummary && (
              <div className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-500 dark:text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full shrink-0 tabular-nums">
                <Star className="h-3 w-3 fill-amber-400 text-amber-400" strokeWidth={1.5} />
                <span>{ratingSummary.avg_rating}</span>
                <span className="text-muted-foreground font-normal">
                  ({ratingSummary.reviews_count})
                </span>
              </div>
            )}
          </div>

          <p className="text-xs text-muted-foreground mb-3 flex items-center gap-1">
            <span className="truncate">{venue.address}</span>
          </p>

          {/* Amenities Chips */}
          {venue.amenities && venue.amenities.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {venue.amenities.slice(0, 3).map((amenity, idx) => (
                <span
                  key={idx}
                  className="rounded-md bg-surface border border-border px-2 py-0.5 text-[10px] text-muted-foreground font-medium"
                >
                  {amenity}
                </span>
              ))}
            </div>
          )}

          {/* Multi-Court Switcher */}
          {selectableCourts.length > 1 && (
            <div className="mb-3">
              <div className="bg-surface p-1 rounded-xl border border-border flex flex-wrap gap-1">
                {selectableCourts.map((court) => {
                  const isCourtActive = court.id === activeCourt?.id;
                  return (
                    <button
                      key={court.id}
                      type="button"
                      onClick={() => {
                        setActiveCourtId(court.id);
                        setSelectedSlot("");
                      }}
                      className={`flex-1 min-h-[32px] px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                        isCourtActive
                          ? "bg-primary text-black font-black shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {court.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Interactive Available Slots Box (Luxury Sports Layout) */}
          {activeCourt && (
            <div className="rounded-2xl bg-surface border border-border p-3 space-y-2.5 mb-2">
              {/* Slots Header: Day + Quick Filter Pills */}
              <div className="flex items-center justify-between gap-1 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                  <span className="font-bold text-foreground text-[11px]">
                    مواعيد {selectedDay.label}:
                  </span>
                  <span className="text-primary font-bold tabular-nums text-[11px]">
                    {availTotal} فترة
                  </span>
                </div>

                {/* Quick Time-of-Day Filter Pills */}
                <div className="flex items-center gap-1 bg-card p-0.5 rounded-lg border border-border">
                  <button
                    type="button"
                    onClick={() => setSlotsPeriodFilter("all")}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all ${
                      slotsPeriodFilter === "all"
                        ? "bg-primary text-black font-black shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    الكل
                  </button>
                  {eveningCount > 0 && (
                    <button
                      type="button"
                      onClick={() => setSlotsPeriodFilter("evening")}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all ${
                        slotsPeriodFilter === "evening"
                          ? "bg-primary text-black font-black shadow-xs"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      مسائي ({eveningCount})
                    </button>
                  )}
                  {morningCount > 0 && (
                    <button
                      type="button"
                      onClick={() => setSlotsPeriodFilter("morning")}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all ${
                        slotsPeriodFilter === "morning"
                          ? "bg-primary text-black font-black shadow-xs"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      صباحي ({morningCount})
                    </button>
                  )}
                </div>
              </div>

              {/* Time Slots Button Grid */}
              {(() => {
                const displayedSlots = isSlotsExpanded
                  ? filteredSlots
                  : filteredSlots.slice(0, 6);
                return (
                  <>
                    <div className="grid grid-cols-3 gap-1.5">
                      {displayedSlots.map((slot, index) => {
                        const isSelected = selectedSlot === slot;
                        const locked = isSlotLocked(activeCourt.id, slot);
                        const hourNum = parseInt(slotLabelToDbTime(slot).split(":")[0], 10);
                        const peakHour = parseInt(
                          (activeCourt.peak_hour_start || "17:00").split(":")[0],
                          10
                        );
                        const isEvening = hourNum >= peakHour || hourNum < 6;
                        const slotPrice = isEvening
                          ? activeCourt.price_evening
                          : activeCourt.price_morning;

                        if (locked) {
                          const watchKey = `${activeCourt.id}|${selectedDay.dateStr}|${slot}`;
                          const isWatched = Boolean(watchedSlots[watchKey]);
                          return (
                            <button
                              key={index}
                              type="button"
                              onClick={() =>
                                void onWatchSlot(venue.id, activeCourt.id, slot)
                              }
                              className={`min-h-[46px] rounded-xl px-1.5 py-1 text-center transition-all border border-dashed flex flex-col items-center justify-center active:scale-[0.97] ${
                                isWatched
                                  ? "bg-amber-500/15 border-amber-500/35 text-amber-500 dark:text-amber-300"
                                  : "bg-muted/40 hover:bg-muted text-muted-foreground/60 hover:text-amber-500 border-border"
                              }`}
                              title={
                                isWatched
                                  ? "تتم مراقبة هذه الساعة — سننبهك فور توفرها"
                                  : "الميعاد محجوز أو قيد الدفع — اضغط للتنبيه عند تحرره"
                              }
                            >
                              <div className="flex items-center gap-1">
                                {isWatched ? (
                                  <BellRing
                                    className="h-3 w-3 text-amber-500 shrink-0"
                                    strokeWidth={1.5}
                                  />
                                ) : (
                                  <Lock
                                    className="h-2.5 w-2.5 text-muted-foreground/60 shrink-0"
                                    strokeWidth={1.5}
                                  />
                                )}
                                <span className="line-through text-xs font-bold tabular-nums opacity-60">
                                  {slot}
                                </span>
                              </div>
                              <span className="text-[9px] text-muted-foreground/60 font-medium">محجوز</span>
                            </button>
                          );
                        }

                        return (
                          <button
                            key={index}
                            type="button"
                            onClick={() =>
                              setSelectedSlot((prev) => (prev === slot ? "" : slot))
                            }
                            className={`min-h-[46px] rounded-xl px-1.5 py-1 text-center transition-all border flex flex-col items-center justify-center active:scale-[0.97] ${
                              isSelected
                                ? "bg-primary text-black border-primary font-black shadow-[0_4px_16px_rgba(16,185,129,0.35)] scale-[1.02]"
                                : "bg-card hover:bg-muted text-foreground border-border hover:border-primary/40"
                            }`}
                          >
                            <span
                              className={`text-xs font-bold tabular-nums block leading-tight ${
                                isSelected ? "text-black font-black" : "text-foreground"
                              }`}
                            >
                              {slot}
                            </span>
                            <span
                              className={`text-[10px] tabular-nums block mt-0.5 ${
                                isSelected
                                  ? "text-black/80 font-bold"
                                  : "text-muted-foreground font-medium"
                              }`}
                            >
                              {slotPrice} ج.م
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Expand/Collapse Toggle Button */}
                    {filteredSlots.length > 6 && (
                      <button
                        type="button"
                        onClick={() => setIsSlotsExpanded((prev) => !prev)}
                        className="w-full py-2 px-3 rounded-xl bg-card hover:bg-muted border border-border hover:border-primary/30 text-[11px] font-bold text-muted-foreground hover:text-foreground flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] mt-1"
                      >
                        <span>
                          {isSlotsExpanded
                            ? "عرض مواعيد أقل"
                            : `عرض باقي المواعيد (${filteredSlots.length - 6} فترة إضافية)`}
                        </span>
                        {isSlotsExpanded ? (
                          <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={2} />
                        ) : (
                          <ChevronDown className="h-3.5 w-3.5 text-primary" strokeWidth={2} />
                        )}
                      </button>
                    )}
                  </>
                );
              })()}

              {/* Selected Slot Confirmation Bar */}
              {selectedSlot && (
                <div className="pt-2 border-t border-border flex items-center justify-between text-[11px] text-primary font-bold">
                  <span>تم تحديد: {selectedSlot}</span>
                  <span className="text-muted-foreground font-normal">
                    عربون الحجز:{" "}
                    <strong className="text-foreground">
                      {venue.deposit_amount || 100} ج.م
                    </strong>
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Card Footer: Pricing & Action Button */}
      <div className="px-4 sm:px-5 py-3 sm:py-3.5 flex items-center justify-between border-t border-border mt-auto bg-surface">
        <div>
          <span className="text-[11px] text-muted-foreground block">
            {selectedSlot ? "سعر الساعة المحددة" : "سعر الساعة"}
          </span>
          <div className="flex items-baseline gap-1">
            <span className="font-display font-black text-2xl text-foreground tabular-nums">
              {displayedPrice}
            </span>
            <span className="text-xs font-medium text-muted-foreground">ج.م</span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleBooking}
          className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl bg-primary px-5 py-2.5 text-xs sm:text-sm font-black text-white dark:text-black hover:bg-primary-hover active:scale-[0.98] transition-all shadow-[0_2px_15px_rgba(16,185,129,0.3)]"
        >
          <span>{selectedSlot ? `احجز ${selectedSlot}` : "احجز ميعادك"}</span>
          <ChevronLeft className="h-4 w-4" strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}
