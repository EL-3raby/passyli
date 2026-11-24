"use client";

import { useState, useEffect } from "react";
import {
  X,
  Users,
  Calendar,
  Clock,
  Banknote,
  User,
  Phone,
  AlertCircle,
  CheckCircle2,
  Building2,
  Trophy,
} from "lucide-react";
import { getDashboardVenues, type DashboardVenue, type DashboardCourt } from "@/lib/api/dashboard";
import { createMatchmakingPost, type CreateMatchmakingParams } from "@/lib/api/matchmaking";

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialBookingId?: string;
  initialCourtId?: string;
  initialDate?: string;
  initialTime?: string;
  initialSport?: "football" | "padel";
  initialCaptainName?: string;
  initialCaptainPhone?: string;
  initialCostPerPlayer?: number;
}

export default function CreatePostModal({
  isOpen,
  onClose,
  onSuccess,
  initialBookingId,
  initialCourtId,
  initialDate,
  initialTime,
  initialSport,
  initialCaptainName,
  initialCaptainPhone,
  initialCostPerPlayer,
}: CreatePostModalProps) {
  const [venues, setVenues] = useState<DashboardVenue[]>([]);
  const [selectedCourtId, setSelectedCourtId] = useState(initialCourtId || "");
  const [sport, setSport] = useState<"football" | "padel">(initialSport || "football");
  const [matchDate, setMatchDate] = useState(
    initialDate || new Date().toISOString().split("T")[0]
  );
  const [startTime, setStartTime] = useState(initialTime || "19:00");
  const [playersNeeded, setPlayersNeeded] = useState<number>(2);
  const [requiredPosition, setRequiredPosition] = useState("أي مركز");
  const [skillLevel, setSkillLevel] = useState("متوسط");
  const [costPerPlayer, setCostPerPlayer] = useState<number>(initialCostPerPlayer || 35);
  const [creatorName, setCreatorName] = useState(initialCaptainName || "");
  const [creatorPhone, setCreatorPhone] = useState(initialCaptainPhone || "");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Load venues and synchronize initial state when opened
  useEffect(() => {
    if (isOpen) {
      if (initialCourtId) setSelectedCourtId(initialCourtId);
      if (initialSport) setSport(initialSport);
      if (initialDate) setMatchDate(initialDate);
      if (initialTime) setStartTime(initialTime);
      if (initialCaptainName) setCreatorName(initialCaptainName);
      if (initialCaptainPhone) setCreatorPhone(initialCaptainPhone);
      if (initialCostPerPlayer) setCostPerPlayer(initialCostPerPlayer);

      getDashboardVenues().then((vList) => {
        setVenues(vList);
        if (!initialCourtId && !selectedCourtId && vList.length > 0 && vList[0].courts.length > 0) {
          setSelectedCourtId(vList[0].courts[0].id);
        }
      });
    }
  }, [
    isOpen,
    initialCourtId,
    initialSport,
    initialDate,
    initialTime,
    initialCaptainName,
    initialCaptainPhone,
    initialCostPerPlayer,
    selectedCourtId,
  ]);

  if (!isOpen) return null;

  const allCourts: (DashboardCourt & { venueName: string })[] = venues.flatMap((v) =>
    v.courts.map((c) => ({ ...c, venueName: v.name }))
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!selectedCourtId) {
      setErrorMsg("يرجى اختيار الملعب");
      return;
    }
    if (!creatorName.trim()) {
      setErrorMsg("يرجى إدخال اسم كابتن الفرقة");
      return;
    }
    if (!creatorPhone.trim() || creatorPhone.length < 10) {
      setErrorMsg("يرجى إدخال رقم هاتف صحيح للتواصل");
      return;
    }

    try {
      setIsSubmitting(true);
      const formattedTime = startTime.length === 5 ? `${startTime}:00` : startTime;
      const res = await createMatchmakingPost({
        courtId: selectedCourtId,
        sport,
        matchDate,
        startTime: formattedTime,
        playersNeeded,
        costPerPlayer,
        creatorName: creatorName.trim(),
        creatorPhone: creatorPhone.trim(),
        requiredPosition,
        skillLevel,
        notes: notes.trim() || undefined,
        bookingId: initialBookingId || undefined,
      });

      if (!res.success) {
        setErrorMsg(res.error || "تعذر نشر التقسيمة، يرجى المحاولة مرة أخرى");
        return;
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || "حدث خطأ غير متوقع");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg rounded-2xl bg-[#141418] border border-white/10 p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
        dir="rtl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Users className="h-5 w-5" strokeWidth={1.5} />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white">
                نشر تقسيمة مفتوحة (كمّل ماتشك)
              </h3>
              <p className="text-xs text-zinc-400">
                اجمع لاعيبة حريفة في دمنهور ينزلوا يكملوا فرقتك ويدفعوا كاش
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-9 w-9 rounded-full bg-white/[0.06] hover:bg-white/10 text-zinc-400 hover:text-white flex items-center justify-center transition-all"
            aria-label="إغلاق"
          >
            <X className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" strokeWidth={1.5} />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Sport Selector */}
          <div>
            <label className="text-xs font-bold text-zinc-300 block mb-1.5">
              نوع الرياضة
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSport("football")}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border ${
                  sport === "football"
                    ? "bg-primary text-black font-black border-primary shadow-sm"
                    : "bg-[#1c1c1f] text-zinc-300 border-white/[0.06] hover:text-white"
                }`}
              >
                كرة قدم خماسي
              </button>
              <button
                type="button"
                onClick={() => setSport("padel")}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border ${
                  sport === "padel"
                    ? "bg-primary text-black font-black border-primary shadow-sm"
                    : "bg-[#1c1c1f] text-zinc-300 border-white/[0.06] hover:text-white"
                }`}
              >
                بادل تنس
              </button>
            </div>
          </div>

          {/* Court Selector */}
          <div>
            <label className="text-xs font-bold text-zinc-300 block mb-1.5">
              الملعب والمنشأة في دمنهور
            </label>
            <select
              value={selectedCourtId}
              onChange={(e) => setSelectedCourtId(e.target.value)}
              className="w-full rounded-xl bg-[#1c1c1f] border border-white/10 px-3.5 py-2.5 text-xs sm:text-sm font-bold text-white focus:outline-none focus:border-primary transition-all cursor-pointer"
            >
              {allCourts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.venueName} — {c.name} ({c.sport === "football" ? "خماسي" : "بادل"})
                </option>
              ))}
            </select>
          </div>

          {/* Date & Start Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-zinc-300 block mb-1.5">
                تاريخ الماتش
              </label>
              <input
                type="date"
                value={matchDate}
                onChange={(e) => setMatchDate(e.target.value)}
                className="w-full rounded-xl bg-[#1c1c1f] border border-white/10 px-3.5 py-2.5 text-xs sm:text-sm font-bold text-white focus:outline-none focus:border-primary transition-all tabular-nums"
                required
              />
            </div>
            <div>
              <label className="text-xs font-bold text-zinc-300 block mb-1.5">
                ساعة الماتش
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full rounded-xl bg-[#1c1c1f] border border-white/10 px-3.5 py-2.5 text-xs sm:text-sm font-bold text-white focus:outline-none focus:border-primary transition-all tabular-nums"
                required
              />
            </div>
          </div>

          {/* Players Needed & Cost per player */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-zinc-300 block mb-1.5">
                عدد اللاعبين المطلوبين
              </label>
              <select
                value={playersNeeded}
                onChange={(e) => setPlayersNeeded(parseInt(e.target.value, 10))}
                className="w-full rounded-xl bg-[#1c1c1f] border border-white/10 px-3.5 py-2.5 text-xs sm:text-sm font-bold text-primary focus:outline-none focus:border-primary transition-all cursor-pointer tabular-nums"
              >
                <option value={1}>1 لاعب</option>
                <option value={2}>2 لاعبين</option>
                <option value={3}>3 لاعبين</option>
                <option value={4}>4 لاعبين</option>
                <option value={5}>5 لاعبين (فريق كامل)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-zinc-300 block mb-1.5">
                نصيب اللاعب كاش (ج.م)
              </label>
              <input
                type="number"
                min="0"
                step="5"
                value={costPerPlayer}
                onChange={(e) => setCostPerPlayer(parseInt(e.target.value, 10) || 0)}
                className="w-full rounded-xl bg-[#1c1c1f] border border-white/10 px-3.5 py-2.5 text-xs sm:text-sm font-bold text-white focus:outline-none focus:border-primary transition-all tabular-nums text-left"
                required
              />
            </div>
          </div>

          {/* Position & Skill Level */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-zinc-300 block mb-1.5">
                المركز المطلوب
              </label>
              <select
                value={requiredPosition}
                onChange={(e) => setRequiredPosition(e.target.value)}
                className="w-full rounded-xl bg-[#1c1c1f] border border-white/10 px-3.5 py-2.5 text-xs sm:text-sm font-bold text-white focus:outline-none focus:border-primary transition-all cursor-pointer"
              >
                <option value="أي مركز">أي مركز (مفتوح للجميع)</option>
                <option value="حارس مرمى">حارس مرمى</option>
                <option value="مدافع / قلب دفاع">مدافع / قلب دفاع</option>
                <option value="صانع ألعاب / خط وسط">صانع ألعاب / خط وسط</option>
                <option value="مهاجم / رأس حربة">مهاجم / رأس حربة</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-zinc-300 block mb-1.5">
                مستوى التقسيمة
              </label>
              <select
                value={skillLevel}
                onChange={(e) => setSkillLevel(e.target.value)}
                className="w-full rounded-xl bg-[#1c1c1f] border border-white/10 px-3.5 py-2.5 text-xs sm:text-sm font-bold text-white focus:outline-none focus:border-primary transition-all cursor-pointer"
              >
                <option value="متوسط">متوسط (لعب ودي ممتع)</option>
                <option value="حريفة وتنافسي">حريفة وتنافسي (ماتش قوي)</option>
                <option value="ترفيهي">ترفيهي (خفيف)</option>
              </select>
            </div>
          </div>

          {/* Captain Contact */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-zinc-300 block mb-1.5">
                اسم كابتن الفرقة
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="مثال: كابتن أحمد"
                  value={creatorName}
                  onChange={(e) => setCreatorName(e.target.value)}
                  className="w-full rounded-xl bg-[#1c1c1f] border border-white/10 px-3.5 py-2.5 pr-9 text-xs sm:text-sm font-bold text-white placeholder:text-zinc-600 focus:outline-none focus:border-primary transition-all"
                  required
                />
                <User className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" strokeWidth={1.5} />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-zinc-300 block mb-1.5">
                رقم هاتف / واتساب للتواصل
              </label>
              <div className="relative">
                <input
                  type="tel"
                  placeholder="010XXXXXXXX"
                  value={creatorPhone}
                  onChange={(e) => setCreatorPhone(e.target.value)}
                  className="w-full rounded-xl bg-[#1c1c1f] border border-white/10 px-3.5 py-2.5 pr-9 text-xs sm:text-sm font-bold text-white placeholder:text-zinc-600 focus:outline-none focus:border-primary transition-all tabular-nums text-left"
                  dir="ltr"
                  required
                />
                <Phone className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" strokeWidth={1.5} />
              </div>
            </div>
          </div>

          {/* Optional Notes */}
          <div>
            <label className="text-xs font-bold text-zinc-300 block mb-1.5">
              ملاحظات إضافية للشباب (اختياري)
            </label>
            <input
              type="text"
              placeholder="مثال: التقسيمة محترمة وودية، الماتش هيبدأ في ميعاده بالظبط..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-xl bg-[#1c1c1f] border border-white/10 px-3.5 py-2.5 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-primary transition-all"
            />
          </div>

          {/* Submit CTA */}
          <div className="pt-2 flex items-center gap-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-primary px-5 text-xs sm:text-sm font-black text-black hover:bg-primary-hover active:scale-[0.98] transition-all disabled:opacity-50"
            >
              <CheckCircle2 className="h-4 w-4" strokeWidth={1.5} />
              <span>{isSubmitting ? "جاري النشر..." : "نشر التقسيمة في المنصة"}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex min-h-[44px] items-center justify-center px-4 rounded-xl bg-white/[0.06] hover:bg-white/10 text-xs font-bold text-zinc-300 transition-all"
            >
              إلغاء
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
