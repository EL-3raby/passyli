"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Lock, CheckCircle2, AlertCircle, Loader2, ArrowRight } from "lucide-react";
import { updateUserPassword } from "@/lib/api/auth";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (password.length < 6) {
      setErrorMsg("كلمة المرور يجب ألا تقل عن 6 أحرف");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg("كلمتا المرور غير متطابقتين");
      return;
    }

    setIsSubmitting(true);
    const res = await updateUserPassword(password);
    setIsSubmitting(false);

    if (!res.success) {
      setErrorMsg(res.error || "تعذر تحديث كلمة المرور");
      return;
    }

    setSuccessMsg("تم تغيير كلمة المرور بنجاح! جاري تحويلك لحسابك...");
    setTimeout(() => {
      router.push("/my-bookings");
    }, 1400);
  };

  return (
    <div className="min-h-[80vh] bg-[#09090b] flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-md rounded-3xl bg-[#141418] border border-white/10 p-6 sm:p-8 space-y-6 shadow-2xl">
        <div className="space-y-2 text-center">
          <div className="h-12 w-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mx-auto">
            <Lock className="h-5 w-5" strokeWidth={1.5} />
          </div>
          <h1 className="font-display text-xl sm:text-2xl font-black text-white">
            تعيين كلمة مرور جديدة
          </h1>
          <p className="text-xs text-zinc-400">
            أدخل كلمة المرور الجديدة لحسابك في منصة باصيلي
          </p>
        </div>

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

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-zinc-300 block mb-1.5">
              كلمة المرور الجديدة *
            </label>
            <input
              type="password"
              required
              dir="ltr"
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full h-11 rounded-xl bg-[#0e0e11] border border-white/10 px-4 text-xs font-bold text-white text-left focus:outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-zinc-300 block mb-1.5">
              تأكيد كلمة المرور *
            </label>
            <input
              type="password"
              required
              dir="ltr"
              minLength={6}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full h-11 rounded-xl bg-[#0e0e11] border border-white/10 px-4 text-xs font-bold text-white text-left focus:outline-none focus:border-primary"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full min-h-[46px] rounded-xl bg-primary hover:bg-primary-hover text-black font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} />
            ) : (
              <>
                <span>حفظ كلمة المرور</span>
                <ArrowRight className="h-4 w-4 rotate-180" strokeWidth={2} />
              </>
            )}
          </button>
        </form>

        <div className="text-center pt-2">
          <Link href="/" className="text-xs font-bold text-zinc-400 hover:text-white">
            العودة للصفحة الرئيسية
          </Link>
        </div>
      </div>
    </div>
  );
}
