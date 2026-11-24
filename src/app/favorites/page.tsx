"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Heart,
  MapPin,
  ArrowRight,
  AlertCircle,
  RefreshCw,
  LogIn,
  Clock,
} from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";
import { getVenues, type VenueWithCourts } from "@/lib/api/venues";
import FavoriteVenueButton from "@/components/favorite-venue-button";

export default function FavoritesPage() {
  const { user, favoriteVenueIds, isLoading: authLoading, openAuthModal } = useAuth();
  const [venues, setVenues] = useState<VenueWithCourts[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const loadVenues = useCallback(async () => {
    setIsLoading(true);
    setHasError(false);
    try {
      const data = await getVenues();
      setVenues(data);
    } catch {
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading) {
      if (user) {
        loadVenues();
      } else {
        setIsLoading(false);
      }
    }
  }, [authLoading, user, loadVenues]);

  const favoriteVenues = venues.filter((v) => favoriteVenueIds.includes(v.id));

  return (
    <div className="min-h-screen bg-[#09090b] text-foreground pb-28" dir="rtl">
      {/* Header Banner */}
      <section className="relative overflow-hidden border-b border-white/[0.08] bg-gradient-to-b from-[#141418] to-[#09090b] py-8 sm:py-12">
        <div className="container mx-auto max-w-5xl px-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-xs font-bold text-rose-400 mb-3">
              <Heart className="h-3.5 w-3.5 fill-rose-400" strokeWidth={1.5} />
              <span>قائمة الحجز السريع</span>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-black text-white">
              ملاعبي المفضلة
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1">
              الملاعب التي تحب اللعب فيها باستمرار في دمنهور للوصول السريع في ثوانٍ.
            </p>
          </div>

          {user && (
            <button
              type="button"
              onClick={loadVenues}
              disabled={isLoading}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-white/[0.05] hover:bg-white/10 border border-white/10 px-4 text-xs font-bold text-white transition-all self-start sm:self-auto"
            >
              <RefreshCw
                className={`h-4 w-4 text-primary ${isLoading ? "animate-spin" : ""}`}
                strokeWidth={1.5}
              />
              <span>تحديث القائمة</span>
            </button>
          )}
        </div>
      </section>

      <main className="container mx-auto max-w-5xl px-4 sm:px-6 pt-8">
        {/* Shimmer Skeletons */}
        {(authLoading || isLoading) && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-72 rounded-2xl bg-[#141418] border border-white/[0.06] animate-pulse"
              />
            ))}
          </div>
        )}

        {/* Unauthenticated State */}
        {!authLoading && !isLoading && !user && (
          <div className="rounded-2xl bg-[#141418] border border-white/[0.08] p-8 text-center max-w-lg mx-auto space-y-5">
            <div className="h-12 w-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mx-auto">
              <Heart className="h-6 w-6" strokeWidth={1.5} />
            </div>
            <div>
              <h2 className="font-display text-xl font-black text-white">
                سجّل دخولك لحفظ ملاعبك المفضلة
              </h2>
              <p className="text-xs sm:text-sm text-zinc-400 mt-2 leading-relaxed">
                ادخل بحساب Google أو الإيميل لحفظ الملاعب التي تفضلها في مكان واحد والوصول لمواعيدها بسرعة.
              </p>
            </div>
            <button
              type="button"
              onClick={() => openAuthModal("signin", "/favorites")}
              className="inline-flex min-h-[46px] items-center gap-2 rounded-xl bg-primary hover:bg-primary-hover text-black font-black text-xs sm:text-sm px-6 transition-all"
            >
              <LogIn className="h-4 w-4" strokeWidth={2} />
              <span>تسجيل الدخول الآن</span>
            </button>
          </div>
        )}

        {/* Error State */}
        {!authLoading && !isLoading && user && hasError && (
          <div className="rounded-2xl bg-rose-500/10 border border-rose-500/20 p-8 text-center max-w-md mx-auto space-y-3">
            <AlertCircle className="h-8 w-8 text-rose-400 mx-auto" strokeWidth={1.5} />
            <p className="text-sm font-bold text-rose-300">
              تعذر تحميل الملاعب المفضلة حالياً
            </p>
            <button
              type="button"
              onClick={loadVenues}
              className="min-h-[44px] px-5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 text-xs font-bold transition-all"
            >
              إعادة المحاولة
            </button>
          </div>
        )}

        {/* Empty State */}
        {!authLoading && !isLoading && user && !hasError && favoriteVenues.length === 0 && (
          <div className="rounded-2xl bg-[#141418] border border-white/[0.08] p-10 text-center max-w-lg mx-auto space-y-4">
            <div className="h-12 w-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mx-auto">
              <Heart className="h-6 w-6" strokeWidth={1.5} />
            </div>
            <div>
              <h2 className="font-display text-lg font-bold text-white">
                لم تحفظ أي ملعب في المفضلة بعد
              </h2>
              <p className="text-xs sm:text-sm text-zinc-400 mt-1.5 leading-relaxed">
                اضغط على أيقونة القلب الموجودة على كارت أي ملعب في دليل الملاعب ليظهر هنا فوراً.
              </p>
            </div>
            <Link
              href="/courts"
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-primary hover:bg-primary-hover text-black font-black text-xs px-6 transition-all"
            >
              <span>تصفح ملاعب دمنهور</span>
              <ArrowRight className="h-4 w-4 rotate-180" strokeWidth={2} />
            </Link>
          </div>
        )}

        {/* Loaded State */}
        {!authLoading && !isLoading && user && !hasError && favoriteVenues.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {favoriteVenues.map((venue) => {
              const primaryCourt = venue.courts[0];
              return (
                <div
                  key={venue.id}
                  className="rounded-2xl bg-[#141418] border border-white/[0.08] hover:border-white/15 overflow-hidden flex flex-col justify-between transition-all"
                >
                  <div>
                    <div className="relative h-44 bg-[#1c1c1f]">
                      <Image
                        src={venue.images[0] || "/images/hero-court.jpg"}
                        alt={venue.name}
                        fill
                        className="object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#141418] via-transparent to-transparent" />
                      <div className="absolute top-3 left-3 z-10">
                        <FavoriteVenueButton venueId={venue.id} />
                      </div>
                      {primaryCourt && (
                        <div className="absolute top-3 right-3 z-10 rounded-full bg-primary px-3 py-1 text-[11px] font-black text-black">
                          {primaryCourt.sport === "football" ? "خماسي ترتان" : "بادل معتمد"}
                        </div>
                      )}
                    </div>

                    <div className="p-5 space-y-2.5">
                      <h3 className="font-display text-lg font-black text-white">
                        {venue.name}
                      </h3>
                      <p className="text-xs text-zinc-400 flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-primary shrink-0" strokeWidth={1.5} />
                        <span>
                          {venue.district} • {venue.address}
                        </span>
                      </p>

                      {primaryCourt && (
                        <div className="flex items-center justify-between text-xs bg-[#0e0e11] rounded-xl px-3 py-2.5 border border-white/[0.05] mt-2">
                          <span className="text-zinc-400 flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5 text-primary" strokeWidth={1.5} />
                            <span>سعر الساعة</span>
                          </span>
                          <span className="font-black text-primary tabular-nums">
                            {primaryCourt.price_evening} ج.م
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="px-5 pb-5">
                    <Link
                      href="/courts"
                      className="w-full min-h-[44px] rounded-xl bg-primary hover:bg-primary-hover text-black font-black text-xs flex items-center justify-center gap-2 transition-all"
                    >
                      <span>عرض المواعيد والحجز</span>
                      <ArrowRight className="h-3.5 w-3.5 rotate-180" strokeWidth={2} />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
