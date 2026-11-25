"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Building2,
  CheckCircle2,
  ShieldCheck,
  Wallet,
  KeyRound,
  ArrowLeft,
  Loader2,
  AlertTriangle,
  UserPlus,
  LogIn,
  Clock3,
  LayoutDashboard,
} from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";
import {
  getMyLatestPartnerApplication,
  submitPartnerApplication,
  type MyPartnerApplication,
} from "@/lib/api/dashboard";

const CITIES = [
  "دمنهور",
  "كفر الدوار",
  "إيتاي البارود",
  "رشيد",
  "المحمودية",
  "أبو المطامير",
  "كوم حمادة",
];

export default function PartnerOnboardingPage() {
  const { user, profile, role, isLoading: authLoading, openAuthModal } = useAuth();

  const [latestApp, setLatestApp] = useState<MyPartnerApplication | null>(null);
  const [loadingApp, setLoadingApp] = useState(false);
  const [allowNewForm, setAllowNewForm] = useState(false);

  const [venueName, setVenueName] = useState("");
  const [applicantName, setApplicantName] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [city, setCity] = useState("دمنهور");
  const [district, setDistrict] = useState("");
  const [address, setAddress] = useState("");
  const [sports, setSports] = useState<string[]>(["football"]);
  const [courtsCount, setCourtsCount] = useState<number>(2);
  const [morningPrice, setMorningPrice] = useState<number>(180);
  const [eveningPrice, setEveningPrice] = useState<number>(260);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submittedId, setSubmittedId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setLatestApp(null);
      return;
    }

    if (profile?.full_name) {
      setApplicantName((prev) => prev || profile.full_name);
    }
    if (profile?.phone) {
      setPhone((prev) => prev || profile.phone || "");
    }

    setLoadingApp(true);
    getMyLatestPartnerApplication(user.id)
      .then((app) => setLatestApp(app))
      .finally(() => setLoadingApp(false));
  }, [user, profile?.full_name, profile?.phone]);

  const toggleSport = (sportKey: string) => {
    setSports((prev) =>
      prev.includes(sportKey)
        ? prev.length > 1
          ? prev.filter((s) => s !== sportKey)
          : prev
        : [...prev, sportKey]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!user) {
      openAuthModal("signup", "/partner");
      return;
    }

    if (!/^01[0125][0-9]{8}$/.test(phone.trim())) {
      setErrorMsg("يرجى إدخال رقم هاتف مصري صحيح مكون من 11 رقماً.");
      return;
    }

    const wa = whatsappNumber.trim() || phone.trim();
    if (!/^01[0125][0-9]{8}$/.test(wa)) {
      setErrorMsg("يرجى إدخال رقم واتساب مصري صحيح مكون من 11 رقماً.");
      return;
    }

    setSubmitting(true);
    const res = await submitPartnerApplication({
      venueName,
      applicantName,
      phone,
      whatsappNumber: wa,
      city,
      district,
      address,
      sports,
      courtsCount,
      basePriceMorning: morningPrice,
      basePriceEvening: eveningPrice,
    });
    setSubmitting(false);

    if (!res.success || !res.id) {
      setErrorMsg(res.error || "تعذر إرسال طلب الشراكة، حاول مرة أخرى.");
      return;
    }

    setSubmittedId(res.id);
  };

  if (submittedId) {
    return (
      <main className="min-h-screen bg-[#09090b] pt-24 pb-24 px-4" dir="rtl">
        <div className="max-w-lg mx-auto rounded-3xl bg-[#141418] border border-emerald-500/30 p-8 text-center space-y-5 shadow-2xl">
          <div className="h-16 w-16 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto">
            <CheckCircle2 className="h-8 w-8" strokeWidth={1.5} />
          </div>

          <div className="space-y-2">
            <h1 className="font-display text-2xl font-black text-white">
              تم استلام طلب انضمام ملعبك بنجاح
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
              تم ربط طلب <strong>{venueName}</strong> بحسابك ({user?.email}). فور مراجعة الإدارة واعتماد الطلب، سيظهر ملعبك تلقائياً في لوحة الإدارة ويصلك إشعار على بريدك الإلكتروني.
            </p>
          </div>

          <div className="rounded-xl bg-[#09090b] border border-white/[0.08] p-3.5 text-xs">
            <span className="text-zinc-400 block mb-1">رقم مرجع الطلب</span>
            <span dir="ltr" className="font-mono font-black text-primary tabular-nums">
              {submittedId.slice(0, 8).toUpperCase()}
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link
              href="/courts"
              className="w-full sm:w-auto min-h-[44px] px-6 rounded-xl bg-primary hover:bg-primary-hover text-black font-black text-xs inline-flex items-center justify-center gap-2 transition-all"
            >
              <span>تصفح الملاعب الحالية</span>
              <ArrowLeft className="h-4 w-4" strokeWidth={2} />
            </Link>
            <Link
              href="/"
              className="w-full sm:w-auto min-h-[44px] px-6 rounded-xl bg-white/[0.05] hover:bg-white/10 border border-white/[0.08] text-white font-bold text-xs inline-flex items-center justify-center"
            >
              العودة للرئيسية
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#09090b] pt-24 pb-28 px-4 sm:px-6" dir="rtl">
      <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Value Proposition Column */}
        <section className="lg:col-span-5 space-y-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/25 text-primary text-[11px] font-bold">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              <span>برنامج شركاء باصيلي</span>
            </div>
            <h1 className="font-display text-2xl sm:text-4xl font-black text-white leading-tight">
              انضم إلى أكبر شبكة ملاعب في{" "}
              <span className="text-primary">دمنهور والبحيرة</span>
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
              تخلص من فوضى المكالمات وتضارب المواعيد، واستقبل حجوزات اللاعبين بعربون مباشر على حساباتك.
            </p>
          </div>

          <div className="space-y-3">
            <div className="rounded-2xl bg-[#141418] border border-white/[0.08] p-4 flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Wallet className="h-5 w-5" strokeWidth={1.5} />
              </div>
              <div>
                <h2 className="text-sm font-black text-white">
                  رصيد ترحيبي مجاني عند التفعيل
                </h2>
                <p className="text-xs text-zinc-400 mt-1">
                  ابدأ برصيد هدية (150 ج.م افتراضياً) لاستقبال أول 10 حجوزات أونلاين مجاناً.
                </p>
              </div>
            </div>

            <div className="rounded-2xl bg-[#141418] border border-white/[0.08] p-4 flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
                <ShieldCheck className="h-5 w-5" strokeWidth={1.5} />
              </div>
              <div>
                <h2 className="text-sm font-black text-white">
                  التحويل المباشر بدون تعليق أموال
                </h2>
                <p className="text-xs text-zinc-400 mt-1">
                  العربون يتحول مباشرة إلى حساب إنستا باي أو فودافون كاش الخاص بملعبك دون وسطاء.
                </p>
              </div>
            </div>

            <div className="rounded-2xl bg-[#141418] border border-white/[0.08] p-4 flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
                <KeyRound className="h-5 w-5" strokeWidth={1.5} />
              </div>
              <div>
                <h2 className="text-sm font-black text-white">
                  بوابة خاصة لموظف الدكة برمز PIN
                </h2>
                <p className="text-xs text-zinc-400 mt-1">
                  يتابع الموظف جدول الساعات ويقفل حجوزات الكاش بنقرة واحدة مع إخفاء إجمالي الأرباح عنه.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Form / Auth Gate Column */}
        <section className="lg:col-span-7 rounded-3xl bg-[#141418] border border-white/[0.08] p-5 sm:p-7 shadow-xl">
          {authLoading || loadingApp ? (
            <div className="space-y-4 animate-pulse py-6">
              <div className="h-10 w-56 rounded-xl bg-white/[0.06]" />
              <div className="h-24 w-full rounded-2xl bg-white/[0.05]" />
              <div className="h-12 w-full rounded-xl bg-white/[0.05]" />
            </div>
          ) : !user ? (
            /* Step 1 Mandatory Account Creation / Login Gate */
            <div className="py-6 text-center space-y-6">
              <div className="h-16 w-16 rounded-2xl bg-primary/10 border border-primary/25 text-primary flex items-center justify-center mx-auto">
                <UserPlus className="h-8 w-8" strokeWidth={1.5} />
              </div>

              <div className="space-y-2 max-w-md mx-auto">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-300 text-[11px] font-bold">
                  الخطوة الأولى — إلزامية
                </span>
                <h2 className="font-display text-xl sm:text-2xl font-black text-white">
                  أنشئ حسابك أو سجّل دخولك أولاً
                </h2>
                <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                  حتى يتم تفعيل لوحة إدارة الملعب على بريدك تلقائياً فور موافقة الإدارة دون خطوات إضافية، سجّل بحساب Google أو البريد الإلكتروني وستفتح لك الاستمارة مباشرة.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => openAuthModal("signup", "/partner")}
                  className="w-full sm:w-auto min-h-[48px] px-7 rounded-xl bg-primary hover:bg-primary-hover text-black font-black text-sm inline-flex items-center justify-center gap-2 transition-all shadow-lg shadow-primary/15"
                >
                  <UserPlus className="h-4 w-4" strokeWidth={2} />
                  <span>إنشاء حساب جديد (Google / بريد)</span>
                </button>

                <button
                  type="button"
                  onClick={() => openAuthModal("signin", "/partner")}
                  className="w-full sm:w-auto min-h-[48px] px-6 rounded-xl bg-white/[0.05] hover:bg-white/10 border border-white/[0.1] text-white font-bold text-xs inline-flex items-center justify-center gap-2 transition-all"
                >
                  <LogIn className="h-4 w-4 text-primary" strokeWidth={1.5} />
                  <span>لدي حساب بالفعل</span>
                </button>
              </div>
            </div>
          ) : !allowNewForm && latestApp && latestApp.status === "pending" ? (
            /* Existing Pending Application Status */
            <div className="py-6 text-center space-y-5">
              <div className="h-16 w-16 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-amber-400 flex items-center justify-center mx-auto">
                <Clock3 className="h-8 w-8" strokeWidth={1.5} />
              </div>
              <div className="space-y-2 max-w-md mx-auto">
                <h2 className="font-display text-xl font-black text-white">
                  طلب تسجيل «{latestApp.venue_name}» قيد المراجعة
                </h2>
                <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                  تم استلام طلبك بنجاح على حساب ({user.email}). سيتواصل معك فريق باصيلي لتفعيل الملعب وإضافة رصيدك الترحيبي.
                </p>
              </div>
              <div className="rounded-xl bg-[#09090b] border border-white/[0.08] p-3.5 text-xs text-zinc-300 inline-block px-6">
                <span>{latestApp.city} — {latestApp.district}</span>
                <span className="mx-2 text-zinc-600">|</span>
                <span className="tabular-nums">{latestApp.courts_count} ملاعب</span>
              </div>
            </div>
          ) : !allowNewForm &&
            ((latestApp && latestApp.status === "approved") ||
              role === "venue_owner") ? (
            /* Approved Owner View */
            <div className="py-6 text-center space-y-5">
              <div className="h-16 w-16 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="h-8 w-8" strokeWidth={1.5} />
              </div>
              <div className="space-y-2 max-w-md mx-auto">
                <h2 className="font-display text-xl font-black text-white">
                  حسابك مفعّل كصاحب ملعب شريك
                </h2>
                <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                  {latestApp?.venue_name
                    ? `تم اعتماد «${latestApp.venue_name}» وربطه بحسابك بنجاح.`
                    : "يمكنك الآن الدخول مباشرة إلى لوحة إدارة ملاعبك ومراجعة الحجوزات."}
                </p>
              </div>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link
                  href="/dashboard"
                  className="w-full sm:w-auto min-h-[46px] px-6 rounded-xl bg-primary hover:bg-primary-hover text-black font-black text-xs inline-flex items-center justify-center gap-2 transition-all"
                >
                  <LayoutDashboard className="h-4 w-4" strokeWidth={2} />
                  <span>فتح لوحة إدارة الملعب</span>
                </Link>
                <button
                  type="button"
                  onClick={() => setAllowNewForm(true)}
                  className="w-full sm:w-auto min-h-[46px] px-5 rounded-xl bg-white/[0.05] hover:bg-white/10 border border-white/[0.08] text-zinc-200 font-bold text-xs"
                >
                  تقديم طلب لفرع جديد
                </button>
              </div>
            </div>
          ) : (
            /* Authenticated Partner Form */
            <>
              <div className="flex items-center justify-between gap-3 border-b border-white/[0.08] pb-4 mb-5">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <Building2 className="h-5 w-5" strokeWidth={1.5} />
                  </div>
                  <div>
                    <h2 className="font-display text-base sm:text-lg font-black text-white">
                      استمارة تسجيل منشأة رياضية
                    </h2>
                    <p className="text-xs text-emerald-400 font-bold" dir="ltr">
                      الحساب المربوط: {user.email}
                    </p>
                  </div>
                </div>
              </div>

              {latestApp?.status === "rejected" && (
                <div className="mb-4 rounded-xl bg-amber-500/10 border border-amber-500/25 p-3 text-xs text-amber-200">
                  <span className="font-black block">
                    ملاحظة الإدارة على طلبك السابق ({latestApp.venue_name}):
                  </span>
                  <span>
                    {latestApp.admin_notes || "يرجى مراجعة البيانات وإعادة الإرسال."}
                  </span>
                </div>
              )}

              {errorMsg && (
                <div className="mb-4 rounded-xl bg-rose-500/10 border border-rose-500/25 p-3 text-xs text-rose-300 font-bold flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0" strokeWidth={1.5} />
                  <span>{errorMsg}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="text-xs font-bold text-zinc-300 block mb-1.5">
                      اسم الملعب / النادي *
                    </label>
                    <input
                      type="text"
                      required
                      value={venueName}
                      onChange={(e) => setVenueName(e.target.value)}
                      placeholder="مثال: ملاعب الأبطال دمنهور"
                      className="w-full min-h-[44px] rounded-xl bg-[#09090b] border border-white/[0.1] px-3.5 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-zinc-300 block mb-1.5">
                      اسم المالك / المسؤول *
                    </label>
                    <input
                      type="text"
                      required
                      value={applicantName}
                      onChange={(e) => setApplicantName(e.target.value)}
                      placeholder="الاسم الثنائي أو الثلاثي"
                      className="w-full min-h-[44px] rounded-xl bg-[#09090b] border border-white/[0.1] px-3.5 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="text-xs font-bold text-zinc-300 block mb-1.5">
                      رقم الموبايل *
                    </label>
                    <input
                      type="tel"
                      required
                      dir="ltr"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="010xxxxxxxx"
                      className="w-full min-h-[44px] rounded-xl bg-[#09090b] border border-white/[0.1] px-3.5 text-xs text-white text-right tabular-nums placeholder:text-zinc-600 focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-zinc-300 block mb-1.5">
                      رقم الواتساب (لإشعارات الحجز)
                    </label>
                    <input
                      type="tel"
                      dir="ltr"
                      value={whatsappNumber}
                      onChange={(e) => setWhatsappNumber(e.target.value)}
                      placeholder="نفس رقم الموبايل إن تُرك فارغاً"
                      className="w-full min-h-[44px] rounded-xl bg-[#09090b] border border-white/[0.1] px-3.5 text-xs text-white text-right tabular-nums placeholder:text-zinc-600 focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="text-xs font-bold text-zinc-300 block mb-1.5">
                      المدينة *
                    </label>
                    <select
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full min-h-[44px] rounded-xl bg-[#09090b] border border-white/[0.1] px-3.5 text-xs font-bold text-white focus:outline-none focus:border-primary"
                    >
                      {CITIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-zinc-300 block mb-1.5">
                      الحي / المنطقة *
                    </label>
                    <input
                      type="text"
                      required
                      value={district}
                      onChange={(e) => setDistrict(e.target.value)}
                      placeholder="مثال: أبو الريش / إفلاقة"
                      className="w-full min-h-[44px] rounded-xl bg-[#09090b] border border-white/[0.1] px-3.5 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-zinc-300 block mb-1.5">
                    العنوان التفصيلي للملعب *
                  </label>
                  <input
                    type="text"
                    required
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="الشارع وأقرب معلم مميز..."
                    className="w-full min-h-[44px] rounded-xl bg-[#09090b] border border-white/[0.1] px-3.5 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-primary"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-300 block">
                    الرياضات المتوفرة بالمنشأة
                  </label>
                  <div className="flex flex-wrap gap-2.5">
                    {[
                      { id: "football", label: "كرة قدم خماسي / سباعي" },
                      { id: "padel", label: "بادل (Padel)" },
                    ].map((sp) => {
                      const selected = sports.includes(sp.id);
                      return (
                        <button
                          key={sp.id}
                          type="button"
                          onClick={() => toggleSport(sp.id)}
                          className={`min-h-[44px] px-4 rounded-xl border text-xs font-bold inline-flex items-center gap-2 transition-all ${
                            selected
                              ? "bg-primary/15 border-primary text-primary font-black"
                              : "bg-[#09090b] border-white/[0.1] text-zinc-400 hover:text-white"
                          }`}
                        >
                          <span
                            className={`h-2 w-2 rounded-full ${
                              selected ? "bg-primary" : "bg-zinc-600"
                            }`}
                          />
                          <span>{sp.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div>
                    <label className="text-xs font-bold text-zinc-300 block mb-1.5">
                      عدد الملاعب الفرعية
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={20}
                      value={courtsCount}
                      onChange={(e) => setCourtsCount(Number(e.target.value))}
                      className="w-full min-h-[44px] rounded-xl bg-[#09090b] border border-white/[0.1] px-3.5 text-xs font-bold text-white tabular-nums focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-zinc-300 block mb-1.5">
                      سعر الساعة صباحاً (ج.م)
                    </label>
                    <input
                      type="number"
                      min={50}
                      step={10}
                      value={morningPrice}
                      onChange={(e) => setMorningPrice(Number(e.target.value))}
                      className="w-full min-h-[44px] rounded-xl bg-[#09090b] border border-white/[0.1] px-3.5 text-xs font-bold text-white tabular-nums focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-zinc-300 block mb-1.5">
                      سعر الساعة مساءً (ج.م)
                    </label>
                    <input
                      type="number"
                      min={50}
                      step={10}
                      value={eveningPrice}
                      onChange={(e) => setEveningPrice(Number(e.target.value))}
                      className="w-full min-h-[44px] rounded-xl bg-[#09090b] border border-white/[0.1] px-3.5 text-xs font-bold text-white tabular-nums focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full min-h-[48px] rounded-xl bg-primary hover:bg-primary-hover disabled:opacity-50 text-black font-black text-sm inline-flex items-center justify-center gap-2 transition-all shadow-lg shadow-primary/15"
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" strokeWidth={2} />
                  )}
                  <span>{submitting ? "جاري إرسال الطلب..." : "إرسال طلب الشراكة الآن"}</span>
                </button>
              </form>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
