"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Users, ChevronLeft, MapPin } from "lucide-react";
import {
  getMatchmakingPosts,
  formatDateArabic,
  formatTimeArabic,
  type MatchmakingPost,
} from "@/lib/api/matchmaking";

export default function HomeMatchmakingSection() {
  const [posts, setPosts] = useState<MatchmakingPost[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    getMatchmakingPosts({ status: "open" })
      .then((data) => {
        setPosts(data.slice(0, 2));
      })
      .finally(() => setIsLoaded(true));
  }, []);

  return (
    <section id="matchmaking" className="py-16 md:py-24 bg-[#141418]">
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Text Content */}
          <div className="lg:col-span-6 flex flex-col gap-5">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-1.5 text-xs font-medium text-zinc-200 backdrop-blur-md w-fit mb-1">
              <Users className="h-3.5 w-3.5 text-emerald-400" strokeWidth={1.5} />
              <span>خاصية كمّل ماتشك • Matchmaking</span>
            </div>

            <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white leading-[1.6] sm:leading-[1.55]">
              ناقصك لاعب لماتشك؟
              <span className="block text-primary mt-3 sm:mt-4">
                أو عايز تنزل تلعب دلوقتي؟
              </span>
            </h2>

            <p className="text-muted-foreground text-sm leading-relaxed">
              مفيش ماتش هيتلغي تاني عشان اتنين اعتذروا. انشر مركزك الناقص، كمّل فرقتك في دقايق، أو انزل تقسيمة جاهزة في دمنهور.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link
                href="/matchmaking"
                className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-extrabold text-black hover:bg-primary-hover active:scale-[0.98] transition-all"
              >
                <span>استعرض التقسيمات المفتوحة</span>
                <ChevronLeft className="h-4 w-4" strokeWidth={2.5} />
              </Link>
              <Link
                href="/matchmaking"
                className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-white/[0.08] bg-[#242427] px-5 text-sm font-bold text-white hover:bg-[#2c2c30] active:scale-[0.98] transition-all"
              >
                انشر تقسيمة جديدة
              </Link>
            </div>
          </div>

          {/* Live Open Match Cards from Supabase */}
          <div className="lg:col-span-6 flex flex-col gap-4">
            {!isLoaded && (
              <>
                <div className="h-36 rounded-[18px] bg-[#242427] border border-white/[0.06] animate-pulse" />
                <div className="h-36 rounded-[18px] bg-[#242427] border border-white/[0.06] animate-pulse" />
              </>
            )}

            {isLoaded && posts.length === 0 && (
              <div className="p-6 rounded-[18px] border border-white/[0.08] bg-[#242427] text-center space-y-3">
                <div className="h-11 w-11 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mx-auto">
                  <Users className="h-5 w-5" strokeWidth={1.5} />
                </div>
                <div>
                  <h3 className="font-display text-base font-bold text-white">
                    ابدأ أول تقسيمة مفتوحة اليوم في دمنهور
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1">
                    لو فرقتك ناقصة لاعب أو حارس مرمى، انشر طلبك مجاناً واجمع فرقتك في دقائق.
                  </p>
                </div>
                <Link
                  href="/matchmaking"
                  className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-primary hover:bg-primary-hover text-black font-black text-xs px-5 transition-all"
                >
                  <span>فتح صفحة التقسيمات</span>
                  <ChevronLeft className="h-3.5 w-3.5" strokeWidth={2} />
                </Link>
              </div>
            )}

            {isLoaded &&
              posts.map((post) => (
                <div
                  key={post.id}
                  className="p-5 rounded-[18px] border border-white/[0.06] bg-[#242427] flex flex-col gap-3 hover:bg-[#28282c] transition-all"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="inline-block h-2 w-2 rounded-full bg-primary animate-pulse" />
                      <span className="text-xs font-bold text-white">
                        {post.sport === "padel"
                          ? `بادل • مطلوب ${post.players_needed} لاعب`
                          : `خماسي • مطلوب ${post.players_needed} لاعب`}
                      </span>
                    </div>
                    <span className="text-[11px] font-bold text-primary bg-[#2e2e33] px-2.5 py-1 rounded-lg tabular-nums">
                      {formatDateArabic(post.match_date)} • {formatTimeArabic(post.start_time)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span className="text-white font-medium flex items-center gap-1.5 truncate">
                      <MapPin className="h-3.5 w-3.5 text-primary shrink-0" strokeWidth={1.5} />
                      <span className="truncate">
                        {post.court?.venue?.name || "ملعب معتمد"} —{" "}
                        {post.court?.venue?.district || "دمنهور"}
                      </span>
                    </span>
                    <span className="tabular-nums font-bold text-white bg-[#1e1e21] px-2.5 py-1 rounded-md shrink-0">
                      {post.cost_per_player} ج.م / للاعب
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-2.5 border-t border-white/[0.06] text-xs">
                    <span className="text-muted-foreground">
                      المركز المطلوب: {post.required_position} • المستوى: {post.skill_level}
                    </span>
                    <Link
                      href="/matchmaking"
                      className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl bg-[#2e2e33] hover:bg-primary hover:text-black px-3.5 text-xs font-bold text-white transition-all shrink-0"
                    >
                      <span>تفاصيل وتواصل</span>
                      <ChevronLeft className="h-3.5 w-3.5" strokeWidth={2} />
                    </Link>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>
    </section>
  );
}
