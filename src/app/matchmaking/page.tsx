"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Users,
  MapPin,
  Plus,
  Share2,
  Phone,
  MessageCircle,
  Filter,
  RefreshCw,
  ArrowRight,
  Check,
  UserPlus,
  LogOut,
  X,
  Loader2,
  AlertCircle,
} from "lucide-react";
import {
  getMatchmakingPosts,
  getMatchmakingParticipants,
  joinMatchmakingPost,
  leaveMatchmakingPost,
  updateMatchmakingStatus,
  formatDateArabic,
  formatTimeArabic,
  type MatchmakingPost,
  type MatchmakingFilters,
  type MatchmakingParticipant,
} from "@/lib/api/matchmaking";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/auth/auth-provider";
import CreatePostModal from "@/components/matchmaking/create-post-modal";
import ShareMatchModal from "@/components/matchmaking/share-match-modal";

export default function MatchmakingPage() {
  const { user, profile, openAuthModal } = useAuth();
  const [posts, setPosts] = useState<MatchmakingPost[]>([]);
  const [participantsMap, setParticipantsMap] = useState<
    Record<string, MatchmakingParticipant[]>
  >({});
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [selectedSport, setSelectedSport] = useState<
    "all" | "football" | "padel"
  >("all");
  const [selectedPosition, setSelectedPosition] = useState<string>("all");
  const [selectedDate, setSelectedDate] = useState<string>("all");

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [sharingPost, setSharingPost] = useState<MatchmakingPost | null>(null);
  const [updatingPostId, setUpdatingPostId] = useState<string | null>(null);
  const [leavingPostId, setLeavingPostId] = useState<string | null>(null);

  // Join Modal State
  const [joiningPost, setJoiningPost] = useState<MatchmakingPost | null>(null);
  const [joinName, setJoinName] = useState("");
  const [joinPhone, setJoinPhone] = useState("");
  const [joinPosition, setJoinPosition] = useState("أي مركز");
  const [joinSubmitting, setJoinSubmitting] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  const loadPosts = useCallback(
    async (showIndicator = false) => {
      if (showIndicator) setIsRefreshing(true);
      const filters: MatchmakingFilters = {
        sport: selectedSport,
        position: selectedPosition === "all" ? undefined : selectedPosition,
        date: selectedDate === "all" ? undefined : selectedDate,
        status: "open",
      };
      const data = await getMatchmakingPosts(filters);
      setPosts(data);
      const pMap = await getMatchmakingParticipants(data.map((p) => p.id));
      setParticipantsMap(pMap);
      if (showIndicator) setIsRefreshing(false);
      setIsLoading(false);
    },
    [selectedSport, selectedPosition, selectedDate]
  );

  useEffect(() => {
    void loadPosts();
  }, [loadPosts]);

  // Realtime sync on posts and participants
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("matchmaking_feed_realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "matchmaking_posts" },
        () => {
          void loadPosts();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "matchmaking_participants" },
        () => {
          void loadPosts();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [loadPosts]);

  const handleOpenJoin = (post: MatchmakingPost) => {
    if (!user) {
      openAuthModal("signup", "/matchmaking");
      return;
    }
    setJoinName(profile?.full_name || "");
    setJoinPhone(profile?.phone || "");
    setJoinPosition(post.required_position || "أي مركز");
    setJoinError(null);
    setJoiningPost(post);
  };

  const handleSubmitJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joiningPost) return;
    setJoinError(null);

    if (!/^01[0125][0-9]{8}$/.test(joinPhone.trim().replace(/\s+/g, ""))) {
      setJoinError("يرجى إدخال رقم موبايل مصري صحيح مكون من 11 رقماً.");
      return;
    }

    setJoinSubmitting(true);
    const res = await joinMatchmakingPost({
      postId: joiningPost.id,
      playerName: joinName,
      playerPhone: joinPhone,
      position: joinPosition,
    });
    setJoinSubmitting(false);

    if (!res.success) {
      setJoinError(res.error || "تعذر الانضمام للتقسيمة");
      return;
    }

    setJoiningPost(null);
    await loadPosts();
  };

  const handleLeavePost = async (postId: string) => {
    setLeavingPostId(postId);
    const res = await leaveMatchmakingPost(postId);
    setLeavingPostId(null);
    if (!res.success) {
      alert(res.error || "تعذر الانسحاب من التقسيمة");
      return;
    }
    await loadPosts();
  };

  const handleMarkFilled = async (postId: string) => {
    try {
      setUpdatingPostId(postId);
      const res = await updateMatchmakingStatus(postId, "filled");
      if (res.success) {
        await loadPosts();
      } else {
        alert(res.error || "تعذر تحديث حالة التقسيمة");
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "حدث خطأ");
    } finally {
      setUpdatingPostId(null);
    }
  };

  const getWhatsAppJoinLink = (post: MatchmakingPost) => {
    const phone = (post.whatsapp_number || post.creator_phone).replace(
      /\D/g,
      ""
    );
    const venueName = post.court?.venue?.name || "الملعب";
    const time = formatTimeArabic(post.start_time);
    const day = formatDateArabic(post.match_date);
    const msg = `مساء الخير كابتن ${post.creator_name}، أنا شفت إعلان التقسيمة على منصة باصيلي في ${venueName} ميعاد ${day} الساعة ${time}، وعايز انزل العب معاكم.`;
    return `https://wa.me/2${phone}?text=${encodeURIComponent(msg)}`;
  };

  const todayStr = new Date().toISOString().split("T")[0];
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split("T")[0];

  return (
    <div className="min-h-screen bg-[#09090b] pb-28 text-foreground selection:bg-primary/20 selection:text-primary">
      {/* Top Hero Section */}
      <section className="relative overflow-hidden border-b border-white/[0.08] bg-gradient-to-b from-[#141418] to-[#09090b] py-10 sm:py-14">
        <div
          className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center space-y-4"
          dir="rtl"
        >
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs font-bold text-primary">
            <Users className="h-4 w-4" strokeWidth={1.5} />
            <span>نظام كمّل ماتشك • مجتمع رياضيي دمنهور والبحيرة</span>
          </div>

          <h1 className="font-display text-2xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight max-w-3xl mx-auto">
            التقسيمات المفتوحة..{" "}
            <span className="text-primary">ماتشك مش هيتلغي</span>
          </h1>

          <p className="text-xs sm:text-sm text-zinc-400 max-w-2xl mx-auto leading-relaxed">
            فرقتك ناقصة لعيبة أو حارس مرمى؟ أو بتدور على ماتش كورة خماسي أو بادل تنزل تلعب فيه النهاردة؟ انضم للتقسيمات بضغطة زر أو انشر ماتشك ليكتمل عددكم.
          </p>

          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => setIsCreateOpen(true)}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-primary px-6 text-xs sm:text-sm font-black text-black hover:bg-primary-hover active:scale-[0.98] transition-all shadow-[0_2px_14px_rgba(16,185,129,0.3)]"
            >
              <Plus className="h-4 w-4" strokeWidth={2} />
              <span>انشر تقسيمة جديدة (اطلب لاعبين)</span>
            </button>

            <Link
              href="/courts"
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-white/[0.06] hover:bg-white/10 px-5 text-xs sm:text-sm font-bold text-zinc-300 hover:text-white transition-all"
            >
              <span>حجز ملعب كامل لفرقتك</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <main
        className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-8 space-y-6"
        dir="rtl"
      >
        {/* Filters Controls Toolbar */}
        <div className="p-4 rounded-2xl bg-[#141418] border border-white/[0.08] shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-white/[0.06] pb-3">
            <div className="flex items-center gap-2 text-xs font-bold text-white">
              <Filter className="h-4 w-4 text-primary" strokeWidth={1.5} />
              <span>فلترة التقسيمات المتاحة</span>
              <span className="text-zinc-500 font-normal tabular-nums">
                ({posts.length} تقسيمة مفتوحة)
              </span>
            </div>

            <button
              type="button"
              onClick={() => void loadPosts(true)}
              disabled={isRefreshing}
              className="inline-flex min-h-[40px] items-center gap-1.5 px-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-xs font-bold text-zinc-300 hover:text-white transition-all self-end sm:self-auto"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${
                  isRefreshing ? "animate-spin text-primary" : ""
                }`}
                strokeWidth={1.5}
              />
              <span>تحديث القائمة</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <span className="text-[11px] text-zinc-400 block font-bold mb-1.5">
                نوع الرياضة
              </span>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => setSelectedSport("all")}
                  className={`min-h-[40px] rounded-xl text-xs font-bold transition-all ${
                    selectedSport === "all"
                      ? "bg-white/[0.1] text-white border border-white/20"
                      : "bg-[#1c1c1f] text-zinc-400 hover:text-white"
                  }`}
                >
                  الكل
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedSport("football")}
                  className={`min-h-[40px] rounded-xl text-xs font-bold transition-all ${
                    selectedSport === "football"
                      ? "bg-primary text-black font-black"
                      : "bg-[#1c1c1f] text-zinc-400 hover:text-white"
                  }`}
                >
                  خماسي
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedSport("padel")}
                  className={`min-h-[40px] rounded-xl text-xs font-bold transition-all ${
                    selectedSport === "padel"
                      ? "bg-primary text-black font-black"
                      : "bg-[#1c1c1f] text-zinc-400 hover:text-white"
                  }`}
                >
                  بادل
                </button>
              </div>
            </div>

            <div>
              <span className="text-[11px] text-zinc-400 block font-bold mb-1.5">
                المركز المطلوب
              </span>
              <select
                value={selectedPosition}
                onChange={(e) => setSelectedPosition(e.target.value)}
                className="w-full min-h-[40px] rounded-xl bg-[#1c1c1f] border border-white/10 px-3 text-xs font-bold text-white focus:outline-none focus:border-primary transition-all cursor-pointer"
              >
                <option value="all">جميع المراكز</option>
                <option value="حارس مرمى">حارس مرمى</option>
                <option value="مدافع">مدافع</option>
                <option value="وسط">خط وسط / صانع ألعاب</option>
                <option value="مهاجم">مهاجم</option>
              </select>
            </div>

            <div>
              <span className="text-[11px] text-zinc-400 block font-bold mb-1.5">
                تاريخ الماتش
              </span>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => setSelectedDate("all")}
                  className={`min-h-[40px] rounded-xl text-xs font-bold transition-all ${
                    selectedDate === "all"
                      ? "bg-white/[0.1] text-white border border-white/20"
                      : "bg-[#1c1c1f] text-zinc-400 hover:text-white"
                  }`}
                >
                  الكل
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedDate(todayStr)}
                  className={`min-h-[40px] rounded-xl text-xs font-bold transition-all ${
                    selectedDate === todayStr
                      ? "bg-primary text-black font-black"
                      : "bg-[#1c1c1f] text-zinc-400 hover:text-white"
                  }`}
                >
                  اليوم
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedDate(tomorrowStr)}
                  className={`min-h-[40px] rounded-xl text-xs font-bold transition-all ${
                    selectedDate === tomorrowStr
                      ? "bg-primary text-black font-black"
                      : "bg-[#1c1c1f] text-zinc-400 hover:text-white"
                  }`}
                >
                  غداً
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Posts Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="h-64 rounded-2xl bg-[#141418]/60 animate-pulse border border-white/[0.06]"
              />
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-20 p-6 rounded-2xl bg-[#141418] border border-white/[0.08] space-y-3">
            <Users
              className="h-12 w-12 text-zinc-600 mx-auto"
              strokeWidth={1.5}
            />
            <h3 className="text-base sm:text-lg font-bold text-white">
              لا توجد تقسيمات مفتوحة مطابقة للفلتر حالياً
            </h3>
            <p className="text-xs text-zinc-400 max-w-sm mx-auto">
              كن أول من ينشر تقسيمة جديدة واطلب لاعبين ليكتمل ماتشك!
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setIsCreateOpen(true)}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-primary px-5 text-xs font-black text-black hover:bg-primary-hover transition-all"
              >
                <Plus className="h-4 w-4" strokeWidth={2} />
                <span>نشر تقسيمة الآن</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {posts.map((post) => {
              const venue = post.court?.venue;
              const isUpdating = updatingPostId === post.id;
              const isCreator = Boolean(user && post.creator_id === user.id);
              const roster = participantsMap[post.id] || [];
              const hasJoined = roster.some((p) => p.is_me);

              return (
                <div
                  key={post.id}
                  className="rounded-2xl bg-[#141418] border border-white/[0.08] hover:border-primary/40 p-4 sm:p-5 space-y-4 shadow-sm transition-all flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between border-b border-white/[0.06] pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black px-2 py-0.5 rounded-full bg-white/[0.06] text-primary">
                            {post.sport === "football" ? "كورة خماسي" : "بادل"}
                          </span>
                          <span className="text-xs font-bold text-zinc-400">
                            {post.skill_level}
                          </span>
                        </div>
                        <h3 className="text-sm sm:text-base font-black text-white mt-1">
                          {venue?.name || "الملعب"} • {post.court?.name}
                        </h3>
                        <span className="text-[11px] text-zinc-400 flex items-center gap-1 mt-0.5">
                          <MapPin
                            className="h-3 w-3 text-zinc-500 shrink-0"
                            strokeWidth={1.5}
                          />
                          {venue?.address || "دمنهور"}
                        </span>
                      </div>

                      <div className="text-left shrink-0">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-black tabular-nums">
                          <Users
                            className="h-3.5 w-3.5 text-amber-400"
                            strokeWidth={2}
                          />
                          <span>ناقص {post.players_needed}</span>
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2.5 rounded-xl bg-[#1c1c1f] border border-white/[0.06] space-y-0.5">
                        <span className="text-[10px] text-zinc-400 block">
                          الميعاد:
                        </span>
                        <span className="font-bold text-white tabular-nums block">
                          {formatDateArabic(post.match_date)}
                        </span>
                      </div>

                      <div className="p-2.5 rounded-xl bg-[#1c1c1f] border border-white/[0.06] space-y-0.5">
                        <span className="text-[10px] text-zinc-400 block">
                          الساعة:
                        </span>
                        <span className="font-bold text-white tabular-nums block">
                          {formatTimeArabic(post.start_time)}
                        </span>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-[#1c1c1f] border border-white/[0.06] space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-400">المركز المطلوب:</span>
                        <strong className="text-primary font-bold">
                          {post.required_position}
                        </strong>
                      </div>

                      <div className="flex items-center justify-between border-t border-white/[0.04] pt-1.5">
                        <span className="text-zinc-400">نصيب كل لاعب كاش:</span>
                        <strong className="text-amber-400 font-black tabular-nums">
                          {post.cost_per_player} ج.م فقط
                        </strong>
                      </div>

                      <div className="flex items-center justify-between border-t border-white/[0.04] pt-1.5">
                        <span className="text-zinc-400">كابتن الفرقة:</span>
                        <span className="text-zinc-200 font-bold">
                          {post.creator_name}
                        </span>
                      </div>
                    </div>

                    {/* Squad Roster List */}
                    {roster.length > 0 && (
                      <div className="p-3 rounded-xl bg-[#0e0e11] border border-white/[0.06] space-y-2">
                        <span className="text-[11px] font-bold text-zinc-400 block">
                          المنضمون عبر باصيلي ({roster.length}):
                        </span>
                        <div className="space-y-1.5">
                          {roster.map((member) => (
                            <div
                              key={member.id}
                              className="flex items-center justify-between text-xs gap-2"
                            >
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shrink-0" />
                                <span className="font-bold text-white truncate">
                                  {member.player_name}
                                  {member.is_me && (
                                    <span className="text-[10px] text-primary mr-1">
                                      (أنت)
                                    </span>
                                  )}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <span className="text-[10px] px-2 py-0.5 rounded-md bg-white/[0.05] text-zinc-300">
                                  {member.position}
                                </span>
                                {isCreator && member.player_phone && (
                                  <a
                                    href={`tel:${member.player_phone}`}
                                    className="text-[10px] text-primary underline tabular-nums"
                                    dir="ltr"
                                  >
                                    {member.player_phone}
                                  </a>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {post.notes && (
                      <p className="text-[11px] text-zinc-400 bg-white/[0.02] p-2 rounded-lg border border-white/[0.04] leading-relaxed">
                        {post.notes}
                      </p>
                    )}
                  </div>

                  {/* Actions Footer */}
                  <div className="pt-3 border-t border-white/[0.06] space-y-2">
                    {isCreator ? (
                      <button
                        type="button"
                        disabled={isUpdating}
                        onClick={() => void handleMarkFilled(post.id)}
                        className="w-full inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 px-4 text-xs font-black text-emerald-300 transition-all disabled:opacity-50"
                      >
                        <Check className="h-4 w-4" strokeWidth={2} />
                        <span>
                          {isUpdating
                            ? "جاري الإغلاق..."
                            : "إعلان اكتمال العدد وإغلاق الإعلان"}
                        </span>
                      </button>
                    ) : hasJoined ? (
                      <button
                        type="button"
                        disabled={leavingPostId === post.id}
                        onClick={() => void handleLeavePost(post.id)}
                        className="w-full inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 px-4 text-xs font-black text-rose-300 transition-all disabled:opacity-50"
                      >
                        {leavingPostId === post.id ? (
                          <Loader2
                            className="h-4 w-4 animate-spin"
                            strokeWidth={2}
                          />
                        ) : (
                          <LogOut className="h-4 w-4" strokeWidth={1.5} />
                        )}
                        <span>انسحاب من التقسيمة وتحرير مقعدي</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleOpenJoin(post)}
                        className="w-full inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-primary hover:bg-primary-hover px-4 text-xs font-black text-black transition-all active:scale-[0.98]"
                      >
                        <UserPlus className="h-4 w-4" strokeWidth={2} />
                        <span>انضم للتقسيمة فوراً</span>
                      </button>
                    )}

                    <div className="grid grid-cols-3 gap-2">
                      <a
                        href={getWhatsAppJoinLink(post)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex min-h-[40px] items-center justify-center gap-1 rounded-xl bg-[#25D366]/15 hover:bg-[#25D366]/25 border border-[#25D366]/30 text-xs font-bold text-[#25D366] transition-all"
                        title="واتساب الكابتن"
                      >
                        <MessageCircle className="h-3.5 w-3.5" strokeWidth={1.5} />
                        <span>واتساب</span>
                      </a>

                      <a
                        href={`tel:${post.creator_phone}`}
                        className="inline-flex min-h-[40px] items-center justify-center gap-1 rounded-xl bg-white/[0.06] hover:bg-white/10 text-xs font-bold text-zinc-200 hover:text-white transition-all"
                        title="اتصال هاتفي"
                      >
                        <Phone
                          className="h-3.5 w-3.5 text-primary"
                          strokeWidth={1.5}
                        />
                        <span>اتصال</span>
                      </a>

                      <button
                        type="button"
                        onClick={() => setSharingPost(post)}
                        className="inline-flex min-h-[40px] items-center justify-center gap-1 rounded-xl bg-white/[0.06] hover:bg-white/10 text-xs font-bold text-zinc-200 hover:text-white transition-all"
                        title="مشاركة للجروبات"
                      >
                        <Share2
                          className="h-3.5 w-3.5 text-zinc-400"
                          strokeWidth={1.5}
                        />
                        <span>مشاركة</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Join Matchmaking Modal */}
      {joiningPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div
            className="w-full max-w-md rounded-3xl bg-[#141418] border border-white/10 p-5 sm:p-6 shadow-2xl space-y-4"
            dir="rtl"
          >
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3.5">
              <div>
                <h3 className="font-display text-base font-black text-white">
                  تأكيد الانضمام للتقسيمة
                </h3>
                <p className="text-xs text-zinc-400">
                  {joiningPost.court?.venue?.name} —{" "}
                  {formatTimeArabic(joiningPost.start_time)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setJoiningPost(null)}
                aria-label="إغلاق"
                className="min-h-[44px] min-w-[44px] rounded-xl bg-white/[0.05] text-zinc-400 flex items-center justify-center"
              >
                <X className="h-4 w-4" strokeWidth={1.5} />
              </button>
            </div>

            {joinError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs font-bold text-rose-300 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" strokeWidth={1.5} />
                <span>{joinError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitJoin} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-zinc-300 block mb-1.5">
                  اسمك في الملعب *
                </label>
                <input
                  type="text"
                  required
                  value={joinName}
                  onChange={(e) => setJoinName(e.target.value)}
                  className="w-full min-h-[44px] rounded-xl bg-[#09090b] border border-white/10 px-3.5 text-xs text-white focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-300 block mb-1.5">
                  رقم الموبايل (يظهر للكابتن فقط) *
                </label>
                <input
                  type="tel"
                  required
                  dir="ltr"
                  value={joinPhone}
                  onChange={(e) => setJoinPhone(e.target.value)}
                  placeholder="010xxxxxxxx"
                  className="w-full min-h-[44px] rounded-xl bg-[#09090b] border border-white/10 px-3.5 text-xs text-white text-right tabular-nums focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-300 block mb-1.5">
                  مركز اللعب المفضل
                </label>
                <select
                  value={joinPosition}
                  onChange={(e) => setJoinPosition(e.target.value)}
                  className="w-full min-h-[44px] rounded-xl bg-[#09090b] border border-white/10 px-3.5 text-xs font-bold text-white focus:outline-none focus:border-primary"
                >
                  <option value="أي مركز">أي مركز</option>
                  <option value="حارس مرمى">حارس مرمى</option>
                  <option value="مدافع">مدافع</option>
                  <option value="خط وسط">خط وسط / صانع ألعاب</option>
                  <option value="مهاجم">مهاجم</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={joinSubmitting}
                className="w-full min-h-[44px] rounded-xl bg-primary hover:bg-primary-hover disabled:opacity-50 text-black font-black text-xs inline-flex items-center justify-center gap-2 transition-all"
              >
                {joinSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
                ) : (
                  <UserPlus className="h-4 w-4" strokeWidth={2} />
                )}
                <span>
                  {joinSubmitting ? "جاري الحجز..." : "تأكيد مقعدي في التقسيمة"}
                </span>
              </button>
            </form>
          </div>
        </div>
      )}

      <CreatePostModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={() => {
          void loadPosts();
        }}
      />

      <ShareMatchModal
        isOpen={Boolean(sharingPost)}
        onClose={() => setSharingPost(null)}
        post={sharingPost}
      />
    </div>
  );
}
