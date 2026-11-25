"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  KeyRound,
  LogOut,
  RefreshCw,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Search,
  CheckCircle2,
  XCircle,
  Lock,
  Phone,
  ShieldCheck,
  Loader2,
  AlertTriangle,
  Building2,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface StaffVenueOption {
  id: string;
  name: string;
  district: string;
}

interface StaffVenueInfo {
  id: string;
  name: string;
  district: string;
  opening_time: string;
  closing_time: string;
}

interface StaffCourt {
  id: string;
  name: string;
  sport: "football" | "padel";
  surface: string;
  slot_duration_minutes: number;
  price_morning: number;
  price_evening: number;
  peak_hour_start: string;
  is_active: boolean;
}

interface StaffBooking {
  id: string;
  booking_reference: string;
  court_id: string;
  booker_name: string;
  booker_phone: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  cash_remaining: number;
  status: "pending_payment" | "confirmed" | "completed" | "cancelled" | "expired";
  is_walkin: boolean;
  locked_until: string | null;
}

function generateCourtSlots(court: StaffCourt) {
  const slots: Array<{ startTime: string; endTime: string; hour: number }> = [];
  const duration = court.slot_duration_minutes || 60;
  for (let m = 9 * 60; m < 26 * 60; m += duration) {
    const h = Math.floor(m / 60) % 24;
    const min = m % 60;
    const endTotal = m + duration;
    const endH = Math.floor(endTotal / 60) % 24;
    const endMin = endTotal % 60;
    slots.push({
      startTime: `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}:00`,
      endTime: `${String(endH).padStart(2, "0")}:${String(endMin).padStart(2, "0")}:00`,
      hour: h,
    });
  }
  return slots;
}

function formatTimeArabic(timeStr: string) {
  const [hStr, mStr] = timeStr.split(":");
  let h = parseInt(hStr, 10);
  const period = h >= 12 ? "م" : "ص";
  if (h > 12) h -= 12;
  if (h === 0) h = 12;
  return `${String(h).padStart(2, "0")}:${mStr || "00"} ${period}`;
}

export default function StaffPortalPage() {
  const [checkingSession, setCheckingSession] = useState(true);
  const [authenticatedVenue, setAuthenticatedVenue] = useState<{
    venueId: string;
    venueName: string;
  } | null>(null);

  // Login screen state
  const [venueOptions, setVenueOptions] = useState<StaffVenueOption[]>([]);
  const [selectedVenueId, setSelectedVenueId] = useState("");
  const [pin, setPin] = useState("");
  const [loginBusy, setLoginBusy] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Schedule state (zero financials)
  const [selectedDate, setSelectedDate] = useState(
    () => new Date().toISOString().split("T")[0]
  );
  const [venueInfo, setVenueInfo] = useState<StaffVenueInfo | null>(null);
  const [courts, setCourts] = useState<StaffCourt[]>([]);
  const [bookings, setBookings] = useState<StaffBooking[]>([]);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [busyBookingId, setBusyBookingId] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<{
    text: string;
    isError: boolean;
  } | null>(null);

  // Walkin cash modal state
  const [walkinTarget, setWalkinTarget] = useState<{
    court: StaffCourt;
    startTime: string;
    endTime: string;
  } | null>(null);
  const [walkinName, setWalkinName] = useState("");
  const [walkinPhone, setWalkinPhone] = useState("");
  const [walkinPaid, setWalkinPaid] = useState<number>(0);
  const [walkinBusy, setWalkinBusy] = useState(false);

  const showToast = useCallback((text: string, isError = false) => {
    setFeedbackMsg({ text, isError });
    window.setTimeout(() => {
      setFeedbackMsg((prev) => (prev?.text === text ? null : prev));
    }, 4500);
  }, []);

  // Load initial session & staff-enabled venues
  useEffect(() => {
    async function init() {
      try {
        const sessionRes = await fetch("/api/staff/session");
        const sessionData = (await sessionRes.json()) as {
          authenticated: boolean;
          venueId?: string;
          venueName?: string;
        };
        if (
          sessionData.authenticated &&
          sessionData.venueId &&
          sessionData.venueName
        ) {
          setAuthenticatedVenue({
            venueId: sessionData.venueId,
            venueName: sessionData.venueName,
          });
        } else {
          const supabase = createClient();
          const { data } = await supabase.rpc("staff_list_active_venues");
          const list = (data as unknown as StaffVenueOption[]) || [];
          setVenueOptions(list);
          if (list.length > 0) {
            setSelectedVenueId(list[0].id);
          }
        }
      } finally {
        setCheckingSession(false);
      }
    }
    void init();
  }, []);

  const loadSchedule = useCallback(async () => {
    if (!authenticatedVenue) return;
    setScheduleLoading(true);
    setScheduleError(null);

    try {
      const res = await fetch(
        `/api/staff/schedule?date=${encodeURIComponent(selectedDate)}`
      );
      if (res.status === 401) {
        setAuthenticatedVenue(null);
        return;
      }
      const data = (await res.json()) as {
        success: boolean;
        error?: string;
        venue?: StaffVenueInfo;
        courts?: StaffCourt[];
        bookings?: StaffBooking[];
      };

      if (!data.success) {
        setScheduleError(data.error || "تعذر تحميل جدول المواعيد");
      } else {
        setVenueInfo(data.venue ?? null);
        setCourts(data.courts ?? []);
        setBookings(data.bookings ?? []);
      }
    } catch {
      setScheduleError("حدث خطأ في الاتصال بالخادم");
    } finally {
      setScheduleLoading(false);
    }
  }, [authenticatedVenue, selectedDate]);

  useEffect(() => {
    if (authenticatedVenue) {
      void loadSchedule();
    }
  }, [authenticatedVenue, loadSchedule]);

  // Realtime updates when bookings change
  useEffect(() => {
    if (!authenticatedVenue) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`staff_${authenticatedVenue.venueId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookings" },
        () => {
          void loadSchedule();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [authenticatedVenue, loadSchedule]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    if (!selectedVenueId || pin.length < 4) {
      setLoginError("يرجى اختيار الملعب وإدخال رمز الـ PIN المكون من 4-6 أرقام.");
      return;
    }

    setLoginBusy(true);
    try {
      const res = await fetch("/api/staff/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ venueId: selectedVenueId, pin }),
      });
      const data = (await res.json()) as {
        success: boolean;
        venueId?: string;
        venueName?: string;
        error?: string;
      };

      if (!res.ok || !data.success || !data.venueId || !data.venueName) {
        setLoginError(data.error || "رمز الدخول غير صحيح");
        return;
      }

      setPin("");
      setAuthenticatedVenue({
        venueId: data.venueId,
        venueName: data.venueName,
      });
    } catch {
      setLoginError("تعذر الاتصال بالسيرفر، حاول مرة أخرى");
    } finally {
      setLoginBusy(false);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/staff/session", { method: "DELETE" });
    setAuthenticatedVenue(null);
    setCourts([]);
    setBookings([]);
    const supabase = createClient();
    const { data } = await supabase.rpc("staff_list_active_venues");
    const list = (data as unknown as StaffVenueOption[]) || [];
    setVenueOptions(list);
    if (list.length > 0 && !selectedVenueId) {
      setSelectedVenueId(list[0].id);
    }
  };

  const handleWalkinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walkinTarget) return;
    if (!/^01[0125][0-9]{8}$/.test(walkinPhone.trim())) {
      showToast("يرجى إدخال رقم موبايل مصري صحيح", true);
      return;
    }

    setWalkinBusy(true);
    try {
      const res = await fetch("/api/staff/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "walkin",
          courtId: walkinTarget.court.id,
          bookingDate: selectedDate,
          startTime: walkinTarget.startTime,
          endTime: walkinTarget.endTime,
          bookerName: walkinName.trim() || "حجز كاش",
          bookerPhone: walkinPhone.trim(),
          amountPaid: walkinPaid,
        }),
      });
      const data = (await res.json()) as {
        success: boolean;
        booking_reference?: string;
        error?: string;
      };
      if (!data.success) {
        showToast(data.error || "تعذر قفل الساعة كاش", true);
        return;
      }

      setWalkinTarget(null);
      setWalkinName("");
      setWalkinPhone("");
      setWalkinPaid(0);
      showToast(`تم قفل الساعة كاش بنجاح (${data.booking_reference})`);
      await loadSchedule();
    } finally {
      setWalkinBusy(false);
    }
  };

  const handleCompleteBooking = async (bookingId: string) => {
    setBusyBookingId(bookingId);
    const res = await fetch("/api/staff/schedule", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "complete", bookingId }),
    });
    const data = (await res.json()) as { success: boolean; error?: string };
    setBusyBookingId(null);

    if (!data.success) {
      showToast(data.error || "تعذر تسجيل الحضور", true);
      return;
    }
    showToast("تم تسجيل حضور الفريق وتحصيل الكاش.");
    await loadSchedule();
  };

  const handleCancelBooking = async (bookingId: string) => {
    setBusyBookingId(bookingId);
    const res = await fetch("/api/staff/schedule", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "cancel",
        bookingId,
        reason: "إلغاء من بوابة موظف الاستقبال",
      }),
    });
    const data = (await res.json()) as { success: boolean; error?: string };
    setBusyBookingId(null);

    if (!data.success) {
      showToast(data.error || "تعذر إلغاء الحجز", true);
      return;
    }
    showToast("تم إلغاء الحجز وتحرير الموعد.");
    await loadSchedule();
  };

  const filteredBookings = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return bookings;
    return bookings.filter(
      (b) =>
        b.booking_reference.toLowerCase().includes(q) ||
        b.booker_name.toLowerCase().includes(q) ||
        b.booker_phone.toLowerCase().includes(q)
    );
  }, [bookings, searchQuery]);

  if (checkingSession) {
    return (
      <main className="min-h-screen bg-[#09090b] pt-24 pb-24 px-4" dir="rtl">
        <div className="max-w-md mx-auto rounded-3xl bg-[#141418] border border-white/[0.08] p-8 space-y-4 animate-pulse">
          <div className="h-12 w-12 rounded-2xl bg-white/[0.06] mx-auto" />
          <div className="h-6 w-48 rounded-lg bg-white/[0.08] mx-auto" />
          <div className="h-11 w-full rounded-xl bg-white/[0.05]" />
          <div className="h-11 w-full rounded-xl bg-white/[0.05]" />
        </div>
      </main>
    );
  }

  // PIN Login Screen
  if (!authenticatedVenue) {
    return (
      <main className="min-h-screen bg-[#09090b] pt-20 pb-24 px-4" dir="rtl">
        <div className="max-w-md mx-auto rounded-3xl bg-[#141418] border border-white/[0.08] p-6 sm:p-8 shadow-2xl space-y-6">
          <div className="text-center space-y-2.5">
            <div className="h-14 w-14 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-amber-400 flex items-center justify-center mx-auto">
              <KeyRound className="h-7 w-7" strokeWidth={1.5} />
            </div>
            <h1 className="font-display text-xl sm:text-2xl font-black text-white">
              بوابة موظف الدكة — باصي&zwj;<span className="text-primary">&zwj;لي</span>
            </h1>
            <p className="text-xs text-zinc-400 leading-relaxed">
              دخول سريع ومباشر لجدول ساعات اليوم وقفل المواعيد كاش برمز الـ PIN الخاص بملعبك فقط.
            </p>
          </div>

          {venueOptions.length === 0 ? (
            <div className="rounded-2xl bg-[#0e0e11] border border-white/[0.08] p-6 text-center space-y-3">
              <Building2 className="h-8 w-8 text-zinc-500 mx-auto" strokeWidth={1.5} />
              <p className="text-sm font-bold text-white">
                لا توجد ملاعب مفعّلة لبوابة الموظفين حالياً
              </p>
              <p className="text-xs text-zinc-400">
                يجب على صاحب الملعب تعيين رمز PIN أولاً من لوحة إدارة الملعب.
              </p>
              <Link
                href="/"
                className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-white/[0.06] hover:bg-white/10 text-white text-xs font-bold px-5"
              >
                العودة للرئيسية
              </Link>
            </div>
          ) : (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-zinc-300 block mb-1.5">
                  اختر النادي / الملعب
                </label>
                <select
                  value={selectedVenueId}
                  onChange={(e) => setSelectedVenueId(e.target.value)}
                  className="w-full min-h-[44px] rounded-xl bg-[#09090b] border border-white/[0.12] px-3.5 text-xs sm:text-sm font-bold text-white focus:outline-none focus:border-primary"
                >
                  {venueOptions.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name} — {v.district}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-300 block mb-1.5">
                  رمز الدخول (PIN)
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  dir="ltr"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                  placeholder="••••"
                  className="w-full min-h-[48px] rounded-xl bg-[#09090b] border border-white/[0.12] px-4 text-center text-xl font-black tracking-[0.4em] text-white tabular-nums focus:outline-none focus:border-primary"
                />
              </div>

              {loginError && (
                <div className="rounded-xl bg-rose-500/10 border border-rose-500/25 p-3 text-xs text-rose-300 font-bold flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0" strokeWidth={1.5} />
                  <span>{loginError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loginBusy}
                className="w-full min-h-[46px] rounded-xl bg-primary hover:bg-primary-hover disabled:opacity-50 text-black font-black text-sm inline-flex items-center justify-center gap-2 transition-all"
              >
                {loginBusy ? (
                  <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
                ) : (
                  <ShieldCheck className="h-4 w-4" strokeWidth={2} />
                )}
                <span>{loginBusy ? "جاري التحقق..." : "دخول لجدول الاستقبال"}</span>
              </button>
            </form>
          )}
        </div>
      </main>
    );
  }

  const shiftDate = (days: number) => {
    const d = new Date(selectedDate + "T00:00:00");
    d.setDate(d.getDate() + days);
    setSelectedDate(d.toISOString().split("T")[0]);
  };

  return (
    <main className="min-h-screen bg-[#09090b] pt-6 pb-28 px-4 sm:px-6" dir="rtl">
      <div className="max-w-6xl mx-auto space-y-5">
        {/* Staff Portal Top Header */}
        <header className="rounded-2xl bg-[#141418] border border-white/[0.08] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-300 text-[11px] font-bold">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
              <span>بوابة الموظف — معزولة بدون أرباح</span>
            </div>
            <h1 className="font-display text-lg sm:text-xl font-black text-white">
              {venueInfo?.name || authenticatedVenue.venueName}
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => shiftDate(-1)}
              className="min-h-[44px] min-w-[44px] rounded-xl bg-white/[0.05] hover:bg-white/10 text-zinc-200 flex items-center justify-center"
              aria-label="اليوم السابق"
            >
              <ChevronRight className="h-4 w-4" strokeWidth={1.5} />
            </button>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="min-h-[44px] rounded-xl bg-[#09090b] border border-white/[0.1] px-3 text-xs font-bold text-white tabular-nums"
            />
            <button
              type="button"
              onClick={() => shiftDate(1)}
              className="min-h-[44px] min-w-[44px] rounded-xl bg-white/[0.05] hover:bg-white/10 text-zinc-200 flex items-center justify-center"
              aria-label="اليوم التالي"
            >
              <ChevronLeft className="h-4 w-4" strokeWidth={1.5} />
            </button>
            <button
              type="button"
              onClick={() => void loadSchedule()}
              className="min-h-[44px] min-w-[44px] rounded-xl bg-white/[0.05] hover:bg-white/10 text-primary flex items-center justify-center"
              aria-label="تحديث الجدول"
            >
              <RefreshCw
                className={`h-4 w-4 ${scheduleLoading ? "animate-spin" : ""}`}
                strokeWidth={1.5}
              />
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="min-h-[44px] px-3.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 text-rose-300 text-xs font-bold inline-flex items-center gap-1.5"
            >
              <LogOut className="h-4 w-4" strokeWidth={1.5} />
              <span>خروج</span>
            </button>
          </div>
        </header>

        {/* Gatekeeper Search */}
        <div className="relative">
          <Search
            className="h-4 w-4 text-zinc-500 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
            strokeWidth={1.5}
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث سريع عند وصول الفريق بكود التذكرة (PASS-)، الاسم، أو الموبايل..."
            className="w-full min-h-[44px] rounded-xl bg-[#141418] border border-white/[0.08] pr-10 pl-3.5 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-primary/60"
          />
        </div>

        {feedbackMsg && (
          <div
            role="status"
            className={`rounded-2xl border px-4 py-3 text-xs font-bold flex items-center gap-2 ${
              feedbackMsg.isError
                ? "bg-rose-500/10 border-rose-500/30 text-rose-300"
                : "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
            }`}
          >
            {feedbackMsg.isError ? (
              <XCircle className="h-4 w-4 shrink-0" strokeWidth={1.5} />
            ) : (
              <CheckCircle2 className="h-4 w-4 shrink-0" strokeWidth={1.5} />
            )}
            <span>{feedbackMsg.text}</span>
          </div>
        )}

        {/* Courts Schedule Grid */}
        {scheduleLoading && courts.length === 0 ? (
          <div className="space-y-4 animate-pulse">
            <div className="h-56 rounded-2xl bg-[#141418] border border-white/[0.06]" />
            <div className="h-56 rounded-2xl bg-[#141418] border border-white/[0.06]" />
          </div>
        ) : scheduleError ? (
          <div className="rounded-2xl bg-[#141418] border border-rose-500/25 p-8 text-center space-y-3">
            <AlertTriangle className="h-8 w-8 text-rose-400 mx-auto" strokeWidth={1.5} />
            <p className="text-sm font-bold text-white">{scheduleError}</p>
            <button
              type="button"
              onClick={() => void loadSchedule()}
              className="min-h-[44px] px-5 rounded-xl bg-primary text-black font-black text-xs"
            >
              إعادة المحاولة
            </button>
          </div>
        ) : courts.length === 0 ? (
          <div className="rounded-2xl bg-[#141418] border border-white/[0.08] p-8 text-center text-xs text-zinc-400">
            لا توجد ملاعب فرعية مسجلة لهذا النادي.
          </div>
        ) : (
          <div className="space-y-6">
            {courts.map((court) => {
              const slots = generateCourtSlots(court);
              return (
                <section
                  key={court.id}
                  className="rounded-2xl bg-[#141418] border border-white/[0.08] p-4 sm:p-5 space-y-4"
                >
                  <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
                    <div className="flex items-center gap-2.5">
                      <Calendar className="h-4 w-4 text-primary" strokeWidth={1.5} />
                      <h2 className="font-display text-base font-black text-white">
                        {court.name}
                      </h2>
                      <span className="text-[11px] text-zinc-400">
                        ({court.sport === "football" ? "كرة قدم" : "بادل"})
                      </span>
                    </div>
                    {!court.is_active && (
                      <span className="px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[11px] font-bold">
                        مغلق للصيانة
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {slots.map((slot) => {
                      const booking = filteredBookings.find(
                        (b) =>
                          b.court_id === court.id &&
                          b.start_time.slice(0, 5) === slot.startTime.slice(0, 5) &&
                          b.status !== "expired"
                      );

                      // If user typed a search query, skip unbooked slots so matched tickets stand out
                      if (searchQuery.trim() && !booking) return null;

                      if (!booking) {
                        return (
                          <div
                            key={slot.startTime}
                            className="rounded-xl bg-[#0e0e11] border border-white/[0.06] p-3.5 flex items-center justify-between gap-3"
                          >
                            <div>
                              <span className="font-display text-sm font-black text-white tabular-nums block">
                                {formatTimeArabic(slot.startTime)}
                              </span>
                              <span className="text-[11px] text-emerald-400 font-bold">
                                ساعة متاحة
                              </span>
                            </div>

                            <button
                              type="button"
                              disabled={!court.is_active}
                              onClick={() => {
                                setWalkinTarget({
                                  court,
                                  startTime: slot.startTime,
                                  endTime: slot.endTime,
                                });
                                setWalkinPaid(0);
                              }}
                              className="min-h-[44px] px-3.5 rounded-xl bg-primary hover:bg-primary-hover disabled:opacity-40 text-black font-black text-xs inline-flex items-center gap-1.5 transition-all"
                            >
                              <Lock className="h-3.5 w-3.5" strokeWidth={2} />
                              <span>قفل كاش</span>
                            </button>
                          </div>
                        );
                      }

                      const isBusy = busyBookingId === booking.id;
                      const isDone = booking.status === "completed";
                      const isPending = booking.status === "pending_payment";

                      return (
                        <div
                          key={slot.startTime}
                          className={`rounded-xl border p-3.5 space-y-3 ${
                            isDone
                              ? "bg-white/[0.02] border-white/[0.06]"
                              : isPending
                              ? "bg-amber-500/5 border-amber-500/25"
                              : "bg-emerald-500/5 border-emerald-500/25"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <span className="font-display text-sm font-black text-white tabular-nums block">
                                {formatTimeArabic(slot.startTime)}
                              </span>
                              <span className="text-xs font-bold text-zinc-200 block mt-0.5">
                                {booking.booker_name}
                              </span>
                              <a
                                href={`tel:${booking.booker_phone}`}
                                dir="ltr"
                                className="text-[11px] text-zinc-400 hover:text-primary inline-flex items-center gap-1 tabular-nums"
                              >
                                <Phone className="h-3 w-3" strokeWidth={1.5} />
                                {booking.booker_phone}
                              </a>
                            </div>

                            <span
                              dir="ltr"
                              className="font-mono text-[10px] font-bold px-2 py-1 rounded-lg bg-white/[0.05] text-zinc-300 tabular-nums"
                            >
                              {booking.booking_reference}
                            </span>
                          </div>

                          <div className="rounded-lg bg-[#09090b] border border-white/[0.06] px-3 py-2 flex items-center justify-between text-xs">
                            <span className="text-zinc-400">المطلوب تحصيله كاش:</span>
                            <span className="font-black text-amber-400 tabular-nums">
                              {booking.cash_remaining} ج.م
                            </span>
                          </div>

                          {!isDone && booking.status === "confirmed" && (
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => handleCompleteBooking(booking.id)}
                                className="flex-1 min-h-[44px] px-3 rounded-xl bg-primary/15 hover:bg-primary hover:text-black border border-primary/30 text-primary font-black text-xs inline-flex items-center justify-center gap-1.5 transition-all"
                              >
                                <CheckCircle2 className="h-4 w-4" strokeWidth={1.5} />
                                <span>حضر واستلم</span>
                              </button>
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => handleCancelBooking(booking.id)}
                                aria-label="إلغاء الحجز"
                                className="min-h-[44px] min-w-[44px] rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 text-rose-300 inline-flex items-center justify-center"
                              >
                                <XCircle className="h-4 w-4" strokeWidth={1.5} />
                              </button>
                            </div>
                          )}

                          {isDone && (
                            <p className="text-[11px] font-bold text-emerald-400 text-center">
                              مكتمل — تم تسجيل الحضور
                            </p>
                          )}

                          {isPending && (
                            <p className="text-[11px] font-bold text-amber-300 text-center">
                              بانتظار اعتماد المالك لإيصال التحويل
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>

      {/* Fast Cash Walk-in Modal */}
      {walkinTarget && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setWalkinTarget(null)}
        >
          <div
            className="w-full max-w-md rounded-3xl bg-[#141418] border border-white/10 p-5 sm:p-6 space-y-4 shadow-2xl"
            dir="rtl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <div>
                <h3 className="font-display text-base font-black text-white">
                  قفل ساعة كاش فوري
                </h3>
                <p className="text-xs text-zinc-400 tabular-nums">
                  {walkinTarget.court.name} • {formatTimeArabic(walkinTarget.startTime)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setWalkinTarget(null)}
                className="min-h-[44px] min-w-[44px] rounded-xl bg-white/[0.05] text-zinc-300 flex items-center justify-center"
              >
                <X className="h-5 w-5" strokeWidth={1.5} />
              </button>
            </div>

            <form onSubmit={handleWalkinSubmit} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-zinc-300 block mb-1">
                  اسم الكابتن / الفرقة
                </label>
                <input
                  type="text"
                  required
                  value={walkinName}
                  onChange={(e) => setWalkinName(e.target.value)}
                  placeholder="مثال: فريق النصر"
                  className="w-full min-h-[44px] rounded-xl bg-[#09090b] border border-white/[0.1] px-3.5 text-xs text-white focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-300 block mb-1">
                  رقم الموبايل
                </label>
                <input
                  type="tel"
                  required
                  dir="ltr"
                  value={walkinPhone}
                  onChange={(e) => setWalkinPhone(e.target.value)}
                  placeholder="010xxxxxxxx"
                  className="w-full min-h-[44px] rounded-xl bg-[#09090b] border border-white/[0.1] px-3.5 text-xs text-white text-right tabular-nums focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-300 block mb-1">
                  العربون المستلم كاش الآن (اختياري)
                </label>
                <input
                  type="number"
                  min={0}
                  value={walkinPaid}
                  onChange={(e) => setWalkinPaid(Number(e.target.value))}
                  className="w-full min-h-[44px] rounded-xl bg-[#09090b] border border-white/[0.1] px-3.5 text-xs font-bold text-white tabular-nums focus:outline-none focus:border-primary"
                />
              </div>

              <button
                type="submit"
                disabled={walkinBusy}
                className="w-full min-h-[46px] rounded-xl bg-primary hover:bg-primary-hover disabled:opacity-50 text-black font-black text-xs inline-flex items-center justify-center gap-2 transition-all"
              >
                {walkinBusy ? (
                  <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
                ) : (
                  <Lock className="h-4 w-4" strokeWidth={2} />
                )}
                <span>{walkinBusy ? "جاري القفل..." : "تأكيد وقفل الساعة"}</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
