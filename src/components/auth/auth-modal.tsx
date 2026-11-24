"use client";

import { useState, useEffect } from "react";
import {
  X,
  Mail,
  Lock,
  User,
  Phone,
  AlertCircle,
  Loader2,
  CheckCircle2,
  ArrowRight,
  KeyRound,
} from "lucide-react";
import { useAuth } from "./auth-provider";
import {
  signInWithGoogle,
  signInWithPassword,
  signUpWithPassword,
  sendPasswordResetEmail,
  isValidEgyptianPhone,
} from "@/lib/api/auth";

export default function AuthModal() {
  const {
    isAuthModalOpen,
    closeAuthModal,
    authModalTab,
    authRedirectUrl,
  } = useAuth();

  const [tab, setTab] = useState<"signin" | "signup" | "forgot">(authModalTab);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthModalOpen) {
      setTab(authModalTab);
      setErrorMsg(null);
      setSuccessMsg(null);
    }
  }, [isAuthModalOpen, authModalTab]);

  if (!isAuthModalOpen) return null;

  const handleGoogleSignIn = async () => {
    try {
      setErrorMsg(null);
      setIsGoogleLoading(true);
      const res = await signInWithGoogle(authRedirectUrl);
      if (!res.success) {
        setErrorMsg(res.error || "تعذر بدء تسجيل الدخول بجوجل");
        setIsGoogleLoading(false);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "حدث خطأ غير متوقع";
      setErrorMsg(msg);
      setIsGoogleLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!email.trim()) {
      setErrorMsg("يرجى إدخال البريد الإلكتروني");
      return;
    }

    if (tab === "forgot") {
      try {
        setIsSubmitting(true);
        const res = await sendPasswordResetEmail(email.trim());
        if (!res.success) {
          setErrorMsg(res.error || "تعذر إرسال رابط استعادة كلمة المرور");
        } else {
          setSuccessMsg(
            "تم إرسال رابط استعادة كلمة المرور إلى بريدك الإلكتروني بنجاح."
          );
        }
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    if (!password.trim()) {
      setErrorMsg("يرجى إدخال كلمة المرور");
      return;
    }

    if (tab === "signup") {
      if (!fullName.trim()) {
        setErrorMsg("يرجى إدخال الاسم بالكامل");
        return;
      }
      if (phone.trim() && !isValidEgyptianPhone(phone)) {
        setErrorMsg("يرجى إدخال رقم موبايل مصري صحيح مكون من 11 رقم (مثل 010xxxxxxxx)");
        return;
      }
    }

    if (password.length < 6) {
      setErrorMsg("كلمة المرور يجب ألا تقل عن 6 أحرف");
      return;
    }

    try {
      setIsSubmitting(true);
      if (tab === "signin") {
        const res = await signInWithPassword(email.trim(), password);
        if (!res.success) {
          setErrorMsg(res.error || "فشل تسجيل الدخول");
        } else {
          closeAuthModal();
        }
      } else {
        const res = await signUpWithPassword(
          email.trim(),
          password,
          fullName.trim(),
          phone.trim()
        );
        if (!res.success) {
          setErrorMsg(res.error || "تعذر إنشاء الحساب");
        } else if (res.needsEmailConfirmation) {
          setSuccessMsg(
            "تم إنشاء الحساب بنجاح! راجع بريدك الإلكتروني لتفعيل الحساب ثم سجل الدخول."
          );
        } else {
          setSuccessMsg("تم إنشاء الحساب بنجاح! جاري الدخول...");
          setTimeout(() => {
            closeAuthModal();
          }, 900);
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "حدث خطأ غير متوقع";
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      dir="rtl"
    >
      <div className="relative w-full max-w-md bg-[#141418] border border-white/10 rounded-3xl shadow-2xl overflow-hidden max-h-[92dvh] flex flex-col">
        {/* Header Bar */}
        <div className="flex items-center justify-between p-5 border-b border-white/[0.08] bg-[#18181c] shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="font-display text-xl font-black text-white leading-none">
              باصي&zwj;<span className="text-primary">&zwj;لي</span>
            </span>
            <span className="text-[11px] text-zinc-400 font-bold px-2.5 py-0.5 rounded-full bg-white/[0.06]">
              {tab === "signin"
                ? "تسجيل الدخول"
                : tab === "signup"
                ? "حساب جديد"
                : "استعادة كلمة المرور"}
            </span>
          </div>

          <button
            type="button"
            onClick={closeAuthModal}
            aria-label="إغلاق نافذة الدخول"
            className="min-h-[44px] min-w-[44px] rounded-xl bg-white/[0.06] hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto">
          {tab !== "forgot" && (
            <>
              {/* Tab Switcher */}
              <div className="grid grid-cols-2 p-1 rounded-xl bg-[#0e0e11] border border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => {
                    setTab("signin");
                    setErrorMsg(null);
                    setSuccessMsg(null);
                  }}
                  className={`min-h-[44px] rounded-lg text-xs font-bold transition-all ${
                    tab === "signin"
                      ? "bg-primary text-black font-black shadow-sm"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  تسجيل الدخول
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTab("signup");
                    setErrorMsg(null);
                    setSuccessMsg(null);
                  }}
                  className={`min-h-[44px] rounded-lg text-xs font-bold transition-all ${
                    tab === "signup"
                      ? "bg-primary text-black font-black shadow-sm"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  إنشاء حساب جديد
                </button>
              </div>

              {/* Google Sign In CTA */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isGoogleLoading || isSubmitting}
                className="w-full min-h-[46px] rounded-xl bg-white hover:bg-zinc-100 text-zinc-900 font-bold text-xs sm:text-sm flex items-center justify-center gap-3 transition-all shadow-sm active:scale-[0.99] disabled:opacity-60"
              >
                {isGoogleLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-zinc-700" strokeWidth={1.5} />
                ) : (
                  <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                )}
                <span>المتابعة بحساب Google (Gmail)</span>
              </button>

              <p className="text-[11px] text-center text-zinc-400 leading-relaxed">
                سيتم حفظ تذاكرك وملاعبك المفضلة واستلام الفاتورة على الـ Gmail
              </p>

              <div className="relative flex items-center py-1">
                <div className="flex-grow border-t border-white/10" />
                <span className="shrink mx-3 text-[11px] font-bold text-zinc-500">
                  أو بالبريد الإلكتروني
                </span>
                <div className="flex-grow border-t border-white/10" />
              </div>
            </>
          )}

          {tab === "forgot" && (
            <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4 space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-bold text-white">
                <KeyRound className="h-4 w-4 text-primary" strokeWidth={1.5} />
                <span>إعادة تعيين كلمة المرور</span>
              </div>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                أدخل بريدك الإلكتروني المسجل وسنرسل لك رابطاً لتعيين كلمة مرور جديدة.
              </p>
            </div>
          )}

          {errorMsg && (
            <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 p-3 text-xs font-bold text-rose-400 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" strokeWidth={1.5} />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3 text-xs font-bold text-emerald-400 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0" strokeWidth={1.5} />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {tab === "signup" && (
              <>
                <div>
                  <label className="text-[11px] font-bold text-zinc-300 block mb-1.5">
                    الاسم بالكامل *
                  </label>
                  <div className="relative">
                    <User
                      className="h-4 w-4 text-zinc-500 absolute right-3.5 top-1/2 -translate-y-1/2"
                      strokeWidth={1.5}
                    />
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="مثال: أحمد محمد"
                      className="w-full h-11 rounded-xl bg-[#0e0e11] border border-white/10 pr-10 pl-3 text-xs font-bold text-white placeholder:text-zinc-600 focus:outline-none focus:border-primary transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-zinc-300 block mb-1.5">
                    رقم الموبايل (لاستلام التذكرة على الواتساب)
                  </label>
                  <div className="relative">
                    <Phone
                      className="h-4 w-4 text-zinc-500 absolute right-3.5 top-1/2 -translate-y-1/2"
                      strokeWidth={1.5}
                    />
                    <input
                      type="tel"
                      dir="ltr"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="01012345678"
                      className="w-full h-11 rounded-xl bg-[#0e0e11] border border-white/10 pr-10 pl-3 text-xs font-bold text-white text-left placeholder:text-zinc-600 focus:outline-none focus:border-primary transition-colors tabular-nums"
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="text-[11px] font-bold text-zinc-300 block mb-1.5">
                البريد الإلكتروني *
              </label>
              <div className="relative">
                <Mail
                  className="h-4 w-4 text-zinc-500 absolute right-3.5 top-1/2 -translate-y-1/2"
                  strokeWidth={1.5}
                />
                <input
                  type="email"
                  required
                  dir="ltr"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@gmail.com"
                  className="w-full h-11 rounded-xl bg-[#0e0e11] border border-white/10 pr-10 pl-3 text-xs font-bold text-white text-left placeholder:text-zinc-600 focus:outline-none focus:border-primary transition-colors"
                />
              </div>
            </div>

            {tab !== "forgot" && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-bold text-zinc-300">
                    كلمة المرور *
                  </label>
                  {tab === "signin" && (
                    <button
                      type="button"
                      onClick={() => {
                        setTab("forgot");
                        setErrorMsg(null);
                        setSuccessMsg(null);
                      }}
                      className="text-[11px] font-bold text-primary hover:underline"
                    >
                      نسيت كلمة المرور؟
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock
                    className="h-4 w-4 text-zinc-500 absolute right-3.5 top-1/2 -translate-y-1/2"
                    strokeWidth={1.5}
                  />
                  <input
                    type="password"
                    required
                    dir="ltr"
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full h-11 rounded-xl bg-[#0e0e11] border border-white/10 pr-10 pl-3 text-xs font-bold text-white text-left placeholder:text-zinc-600 focus:outline-none focus:border-primary transition-colors"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting || isGoogleLoading}
              className="w-full min-h-[46px] rounded-xl bg-primary hover:bg-primary-hover text-black font-black text-xs sm:text-sm transition-all flex items-center justify-center gap-2 shadow-[0_2px_14px_rgba(16,185,129,0.28)] active:scale-[0.98] disabled:opacity-60 mt-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} />
                  <span>جاري المعالجة...</span>
                </>
              ) : (
                <>
                  <span>
                    {tab === "signin"
                      ? "دخول لحسابي"
                      : tab === "signup"
                      ? "إنشاء الحساب الآن"
                      : "إرسال رابط الاستعادة"}
                  </span>
                  <ArrowRight className="h-4 w-4 rotate-180" strokeWidth={2} />
                </>
              )}
            </button>

            {tab === "forgot" && (
              <button
                type="button"
                onClick={() => {
                  setTab("signin");
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                className="w-full min-h-[44px] rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-xs font-bold text-zinc-300 hover:text-white transition-colors"
              >
                العودة لتسجيل الدخول
              </button>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
