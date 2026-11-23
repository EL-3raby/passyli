"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import Image from "next/image";
import {
  X,
  Clock,
  ShieldCheck,
  Check,
  Copy,
  AlertCircle,
  UploadCloud,
  MessageSquare,
  RotateCcw,
  Sparkles,
  ChevronLeft,
  Calendar,
  Building2,
  FileCheck2,
  Trash2,
} from "lucide-react";
import {
  lockCourtSlot,
  cancelBookingLock,
  compressImageClient,
  uploadReceiptScreenshot,
  submitBookingReceipt,
  getOrCreateBookingSessionId,
  type LockSlotResult,
} from "@/lib/api/bookings";
import type { VenueWithCourts, VenueCourt } from "@/lib/api/venues";

export interface BookingModalData {
  venue: VenueWithCourts;
  court: VenueCourt;
  bookingDate: string; // YYYY-MM-DD
  displayDate: string; // e.g. الثلاثاء 24 نوفمبر
  dayLabel: string;    // e.g. النهاردة
  slotTime: string;    // e.g. 09:00 م or 21:00
}

interface BookingModalProps {
  isOpen: boolean;
  data: BookingModalData | null;
  onClose: () => void;
  onBookingSuccess?: (bookingReference: string) => void;
}

type BookingStep = "details" | "payment" | "pass";

export default function BookingModal({
  isOpen,
  data,
  onClose,
  onBookingSuccess,
}: BookingModalProps) {
  const [step, setStep] = useState<BookingStep>("details");
  const [isPending, startTransition] = useTransition();

  // Step 1: Booker details
  const [bookerName, setBookerName] = useState("");
  const [bookerPhone, setBookerPhone] = useState("");
  const [phoneError, setPhoneError] = useState("");

  // Step 2: Lock & Countdown state
  const [lockData, setLockData] = useState<LockSlotResult | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(8 * 60); // 8 minutes default
  const [isExpired, setIsExpired] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"instapay" | "vodafone_cash">("instapay");
  const [isCopied, setIsCopied] = useState<string | null>(null);

  // Step 2: Receipt Upload & Reference
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [compressedBlob, setCompressedBlob] = useState<Blob | null>(null);
  const [compressionInfo, setCompressionInfo] = useState<{ originalKB: number; compressedKB: number } | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [referenceNumber, setReferenceNumber] = useState("");
  const [receiptError, setReceiptError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Step 3: Digital Pass
  const [confirmedRef, setConfirmedRef] = useState<string>("");

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const sessionIdRef = useRef<string>("");

  // Initialize session ID
  useEffect(() => {
    sessionIdRef.current = getOrCreateBookingSessionId();
  }, []);

  // Reset state when modal opens or closes
  useEffect(() => {
    if (isOpen) {
      setStep("details");
      setBookerName("");
      setBookerPhone("");
      setPhoneError("");
      setLockData(null);
      setSecondsRemaining(8 * 60);
      setIsExpired(false);
      setReceiptFile(null);
      setReceiptPreview(null);
      setCompressedBlob(null);
      setCompressionInfo(null);
      setReferenceNumber("");
      setReceiptError("");
      setIsSubmitting(false);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }, [isOpen]);

  // Handle unload / sendBeacon to release lock on tab close
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (lockData?.bookingId && step === "payment" && !isExpired) {
        // Send async beacon or fetch to release lock
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        if (supabaseUrl && supabaseAnonKey) {
          const payload = JSON.stringify({
            p_booking_id: lockData.bookingId,
            p_session_id: sessionIdRef.current,
          });
          const headers = {
            type: "application/json",
          };
          const blob = new Blob([payload], headers);
          navigator.sendBeacon?.(
            `${supabaseUrl}/rest/v1/rpc/cancel_booking_lock`,
            blob
          );
        }
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [lockData, step, isExpired]);

  // Active 8-Minute Countdown Timer
  useEffect(() => {
    if (step === "payment" && lockData?.lockedUntil) {
      const targetTime = new Date(lockData.lockedUntil).getTime();

      const tick = () => {
        const now = Date.now();
        const diffSeconds = Math.max(0, Math.floor((targetTime - now) / 1000));
        setSecondsRemaining(diffSeconds);

        if (diffSeconds <= 0) {
          setIsExpired(true);
          if (timerRef.current) clearInterval(timerRef.current);
        }
      };

      tick();
      timerRef.current = setInterval(tick, 1000);

      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
      };
    }
  }, [step, lockData]);

  if (!isOpen || !data) return null;

  const { venue, court, bookingDate, displayDate, dayLabel, slotTime } = data;

  // Calculate pricing breakdown
  const isEvening = true; // Most booking slots are evening
  const totalPrice = isEvening ? court.price_evening : court.price_morning;
  const depositRequired = venue.deposit_amount || 100;
  const cashRemaining = Math.max(totalPrice - depositRequired, 0);

  // Convert slot to 24-hour start/end times
  const parseSlotTimes = (slot: string, durationMinutes: number) => {
    // slot could be "09:00 م" or "08:30"
    let hours = 20;
    let minutes = 0;
    const clean = slot.replace(/[^0-9:]/g, "");
    if (clean.includes(":")) {
      const parts = clean.split(":");
      hours = parseInt(parts[0], 10);
      minutes = parseInt(parts[1], 10);
      if (slot.includes("م") && hours < 12) hours += 12;
      if (slot.includes("ص") && hours === 12) hours = 0;
    }

    const startH = String(hours).padStart(2, "0");
    const startM = String(minutes).padStart(2, "0");
    const startTime = `${startH}:${startM}:00`;

    // Compute end time
    const endTotalMinutes = hours * 60 + minutes + durationMinutes;
    const endH = String(Math.floor(endTotalMinutes / 60) % 24).padStart(2, "0");
    const endM = String(endTotalMinutes % 60).padStart(2, "0");
    const endTime = `${endH}:${endM}:00`;

    return { startTime, endTime };
  };

  const { startTime, endTime } = parseSlotTimes(slotTime, court.slot_duration_minutes || 60);

  // Validate Egyptian Phone (010, 011, 012, 015 - 11 digits)
  const validatePhone = (phone: string): boolean => {
    const clean = phone.trim().replace(/\s+/g, "");
    const regex = /^01[0125][0-9]{8}$/;
    return regex.test(clean);
  };

  // Step 1: Initiate 8-Minute Hold
  const handleStartHold = async (e: React.FormEvent) => {
    e.preventDefault();
    setPhoneError("");

    if (!bookerName.trim()) {
      setPhoneError("يرجى إدخال اسمك بالكامل");
      return;
    }

    const cleanPhone = bookerPhone.trim().replace(/\s+/g, "");
    if (!validatePhone(cleanPhone)) {
      setPhoneError("يرجى إدخال رقم هاتف مصري صحيح مكون من 11 رقم (مثل 010xxxxxxxx)");
      return;
    }

    startTransition(async () => {
      const result = await lockCourtSlot({
        courtId: court.id,
        bookingDate,
        startTime,
        endTime,
        bookerName: bookerName.trim(),
        bookerPhone: cleanPhone,
        totalPrice,
        depositRequired,
        cashRemaining,
        sessionId: sessionIdRef.current,
      });

      if (!result.success || !result.bookingId) {
        setPhoneError(result.error || "الميعاد غير متاح حالياً، ربما حجزه لاعب آخر للتو");
        return;
      }

      setLockData(result);
      setStep("payment");
    });
  };

  // Step 2: Handle Cancel / Unlock
  const handleCancelHold = async () => {
    if (lockData?.bookingId) {
      await cancelBookingLock(lockData.bookingId, sessionIdRef.current);
    }
    onClose();
  };

  // Step 2: Image Compression & Selection
  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setReceiptError("");
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setReceiptError("يرجى اختيار ملف صورة صالح (JPEG أو PNG)");
      return;
    }

    setIsCompressing(true);
    try {
      const previewUrl = URL.createObjectURL(file);
      setReceiptPreview(previewUrl);
      setReceiptFile(file);

      // Client-side compression (< 200KB)
      const compressed = await compressImageClient(file, 195 * 1024);
      setCompressedBlob(compressed.blob);
      setCompressionInfo({
        originalKB: Math.round(compressed.originalSize / 1024),
        compressedKB: Math.round(compressed.compressedSize / 1024),
      });
    } catch {
      setReceiptError("تعذر ضغط الصورة، يرجى المحاولة بصورة أخرى");
    } finally {
      setIsCompressing(false);
    }
  };

  // Step 2: Submit Receipt & Finalize
  const handleSubmitReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    setReceiptError("");

    if (!lockData?.bookingId) {
      setReceiptError("فقدت بيانات الحجز، يرجى إعادة المحاولة");
      return;
    }

    if (!compressedBlob) {
      setReceiptError("يرجى إرفاق سكرين شوت أو صورة إيصال التحويل");
      return;
    }

    if (!referenceNumber.trim()) {
      setReceiptError("يرجى إدخال الرقم المرجعي للتحويل (رقم العملية)");
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Upload compressed image to receipts-storage
      const uploadRes = await uploadReceiptScreenshot(lockData.bookingId, compressedBlob);
      if (!uploadRes.url) {
        setReceiptError(uploadRes.error || "فشل رفع صورة الإيصال للسحابة، تحقق من اتصالك بالإنترنت");
        setIsSubmitting(false);
        return;
      }

      // 2. Submit receipt record & confirm booking
      const submitRes = await submitBookingReceipt({
        bookingId: lockData.bookingId,
        senderName: bookerName.trim(),
        senderPhone: bookerPhone.trim(),
        paymentMethod,
        referenceNumber: referenceNumber.trim(),
        amountPaid: depositRequired,
        imageUrl: uploadRes.url,
      });

      if (!submitRes.success) {
        setReceiptError(submitRes.error || "تعذر تأكيد الحجز، يرجى مراجعة البيانات");
        setIsSubmitting(false);
        return;
      }

      // 3. Move to digital pass
      const ref = submitRes.bookingReference || lockData.bookingReference || "PAS-CONFIRMED";
      setConfirmedRef(ref);
      setStep("pass");
      if (onBookingSuccess) onBookingSuccess(ref);
    } catch {
      setReceiptError("حدث خطأ غير متوقع أثناء إرسال الإيصال");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Copy to clipboard helper
  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setIsCopied(key);
    setTimeout(() => setIsCopied(null), 2500);
  };

  // Format seconds to mm:ss
  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  // WhatsApp Share URL for Confirmed Pass
  const generateWhatsAppUrl = () => {
    const phone = venue.whatsapp_number.replace(/[^0-9]/g, "");
    const formattedPhone = phone.startsWith("0") ? `2${phone}` : phone;
    const msg = `مرحباً إدارة ${venue.name}، تم حجز ${court.name} عبر منصة باصيلي.\nكود الحجز: ${confirmedRef}\nالاسم: ${bookerName}\nالميعاد: ${dayLabel} (${displayDate}) - الساعة ${slotTime}\nالعربون المحول: ${depositRequired} ج.م (${paymentMethod === "instapay" ? "إنستاباي" : "فودافون كاش"})\nالرقم المرجعي: ${referenceNumber}\nالمتبقي كاش في الملعب: ${cashRemaining} ج.م`;
    return `https://wa.me/${formattedPhone}?text=${encodeURIComponent(msg)}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-xl rounded-2xl border border-white/10 bg-[#1e1e22] text-foreground shadow-2xl overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header Bar */}
        <div className="flex items-center justify-between border-b border-white/[0.08] px-5 py-4 bg-[#18181b]">
          <div className="flex items-center gap-2.5">
            <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            <h2 className="font-display font-black text-base sm:text-lg text-white">
              {step === "details" && "تأكيد ميعاد الحجز وقفل الساعة"}
              {step === "payment" && "مهلة قفل الحجز 8 دقائق • تحويل العربون"}
              {step === "pass" && "التذكرة الرقمية المعتمدة"}
            </h2>
          </div>

          <button
            type="button"
            onClick={step === "payment" ? handleCancelHold : onClose}
            className="h-9 w-9 rounded-xl bg-white/[0.05] hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 max-h-[80vh] overflow-y-auto scrollbar-none space-y-5">
          
          {/* STEP 1: Details & Start 8-Min Hold */}
          {step === "details" && (
            <form onSubmit={handleStartHold} className="space-y-5">
              
              {/* Match Snapshot Card */}
              <div className="rounded-xl bg-[#242427] border border-white/[0.06] p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-[11px] font-bold text-primary block mb-0.5">
                      {court.sport === "football" ? "خماسي ترتان" : "بادل معتمد"}
                    </span>
                    <h3 className="font-display text-base font-bold text-white">
                      {venue.name} — {court.name}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {venue.district} • {venue.address}
                    </p>
                  </div>
                  <span className="rounded-lg bg-primary/10 border border-primary/20 px-2.5 py-1 text-xs font-black text-primary tabular-nums shrink-0">
                    {court.slot_duration_minutes || 60} دقيقة
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/[0.06] text-xs">
                  <div className="flex items-center gap-2 text-zinc-300">
                    <Calendar className="h-3.5 w-3.5 text-primary" strokeWidth={1.5} />
                    <span>{dayLabel} ({displayDate})</span>
                  </div>
                  <div className="flex items-center gap-2 text-zinc-300">
                    <Clock className="h-3.5 w-3.5 text-primary" strokeWidth={1.5} />
                    <span className="font-bold text-white tabular-nums">{slotTime}</span>
                  </div>
                </div>
              </div>

              {/* Financial Breakdown (Transparent & Explicit) */}
              <div className="grid grid-cols-3 gap-2.5 text-center">
                <div className="rounded-xl bg-[#242427] border border-white/[0.06] p-3">
                  <span className="text-[10px] text-muted-foreground block mb-1">سعر الماتش</span>
                  <span className="font-display font-black text-base text-white tabular-nums">
                    {totalPrice} <span className="text-[10px] font-normal text-muted-foreground">ج.م</span>
                  </span>
                </div>

                <div className="rounded-xl bg-primary/10 border border-primary/30 p-3">
                  <span className="text-[10px] text-primary font-bold block mb-1">العربون لتثبيت الحجز</span>
                  <span className="font-display font-black text-base text-primary tabular-nums">
                    {depositRequired} <span className="text-[10px] font-normal">ج.م</span>
                  </span>
                </div>

                <div className="rounded-xl bg-[#242427] border border-white/[0.06] p-3">
                  <span className="text-[10px] text-muted-foreground block mb-1">المتبقي كاش في الملعب</span>
                  <span className="font-display font-black text-base text-zinc-200 tabular-nums">
                    {cashRemaining} <span className="text-[10px] font-normal text-muted-foreground">ج.م</span>
                  </span>
                </div>
              </div>

              {/* Booker Inputs */}
              <div className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                    اسم الكابتن / الحاجز <span className="text-primary">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={bookerName}
                    onChange={(e) => setBookerName(e.target.value)}
                    placeholder="مثال: أحمد عبد الرحمن"
                    className="w-full min-h-[46px] rounded-xl bg-[#242427] border border-white/[0.08] px-4 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-primary transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                    رقم الموبايل والواتساب <span className="text-primary">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    dir="ltr"
                    value={bookerPhone}
                    onChange={(e) => setBookerPhone(e.target.value)}
                    placeholder="01012345678"
                    className="w-full min-h-[46px] rounded-xl bg-[#242427] border border-white/[0.08] px-4 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-primary transition-all text-right"
                  />
                  <span className="text-[11px] text-muted-foreground mt-1 block">
                    هنبعتلك التذكرة وتأكيد الحجز على رقم الواتساب ده مباشرة.
                  </span>
                </div>

                {phoneError && (
                  <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-3 flex items-center gap-2 text-xs text-red-400">
                    <AlertCircle className="h-4 w-4 shrink-0" strokeWidth={1.5} />
                    <span>{phoneError}</span>
                  </div>
                )}
              </div>

              {/* Anti-Double-Booking Notice */}
              <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-3.5 flex items-start gap-2.5">
                <ShieldCheck className="h-4 w-4 text-primary shrink-0 mt-0.5" strokeWidth={1.5} />
                <p className="text-[11px] text-zinc-300 leading-relaxed">
                  <strong>نظام القفل الذكي:</strong> بمجرد الضغط هنقفل الميعاد حصرياً باسمك لمدة <strong>8 دقائق</strong>، ومحدش هيقدر يحجزه عشان تلحق تحول العربون بهدوء.
                </p>
              </div>

              {/* Submit CTA */}
              <button
                type="submit"
                disabled={isPending}
                className="w-full min-h-[48px] rounded-xl bg-primary text-black font-black text-sm hover:bg-primary-hover active:scale-[0.99] transition-all flex items-center justify-center gap-2 shadow-[0_2px_15px_rgba(16,185,129,0.3)] disabled:opacity-50"
              >
                {isPending ? (
                  <>
                    <span className="h-4 w-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    <span>بنقفل الميعاد باسمك في السيستم...</span>
                  </>
                ) : (
                  <>
                    <span>احجز الميعاد وابدأ مهلة الـ 8 دقائق</span>
                    <ChevronLeft className="h-4 w-4" strokeWidth={2.5} />
                  </>
                )}
              </button>

            </form>
          )}

          {/* STEP 2: 8-Minute Hold & Deposit Payment Flow */}
          {step === "payment" && (
            <div className="space-y-5">
              
              {/* Active Countdown Header */}
              <div className={`rounded-xl border p-4 text-center transition-all ${
                isExpired
                  ? "bg-red-500/10 border-red-500/30 text-red-400"
                  : secondsRemaining < 120
                  ? "bg-amber-500/10 border-amber-500/30 text-amber-300 animate-pulse"
                  : "bg-primary/10 border-primary/20 text-white"
              }`}>
                <div className="flex items-center justify-center gap-2 text-xs font-bold mb-1">
                  <Clock className={`h-4 w-4 ${isExpired ? "text-red-400" : "text-primary"}`} strokeWidth={1.5} />
                  <span>
                    {isExpired
                      ? "انتهت مهلة الـ 8 دقائق وتحرر الميعاد"
                      : "الميعاد محجوز ومقفول باسمك حالياً — متبقي في المهلة:"}
                  </span>
                </div>

                <div className="font-display font-black text-3xl sm:text-4xl tabular-nums tracking-wider text-primary">
                  {formatTimer(secondsRemaining)}
                </div>

                <p className="text-[11px] text-zinc-400 mt-1">
                  كود الحجز المؤقت: <strong className="text-white font-mono">{lockData?.bookingReference}</strong>
                </p>
              </div>

              {isExpired ? (
                /* Expired Alert & Retry */
                <div className="space-y-4 text-center py-4">
                  <p className="text-xs text-muted-foreground leading-relaxed max-w-sm mx-auto">
                    نظراً لانتهاء المهلة دون إرفاق إيصال التحويل، تم تحرير الميعاد تلقائياً ليكون متاحاً لجميع اللاعبين منعاً لتعليق الملاعب.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setStep("details");
                      setIsExpired(false);
                      setSecondsRemaining(8 * 60);
                    }}
                    className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-primary px-6 text-xs font-bold text-black hover:bg-primary-hover transition-all"
                  >
                    <RotateCcw className="h-4 w-4" strokeWidth={1.5} />
                    <span>محاولة الحجز مرة أخرى</span>
                  </button>
                </div>
              ) : (
                /* Payment Instructions Form */
                <form onSubmit={handleSubmitReceipt} className="space-y-5">
                  
                  {/* Amount to transfer banner */}
                  <div className="flex items-center justify-between rounded-xl bg-[#242427] border border-white/[0.06] p-3.5">
                    <div>
                      <span className="text-xs text-muted-foreground block">مبلغ العربون المطلوب تحويله</span>
                      <span className="font-display font-black text-xl text-primary tabular-nums">
                        {depositRequired} <span className="text-xs font-normal">ج.م</span>
                      </span>
                    </div>
                    <div className="text-left">
                      <span className="text-xs text-muted-foreground block">المتبقي كاش في الملعب</span>
                      <span className="font-bold text-white text-sm tabular-nums">
                        {cashRemaining} ج.م
                      </span>
                    </div>
                  </div>

                  {/* Payment Method Switcher Tabs */}
                  <div>
                    <label className="block text-xs font-bold text-zinc-300 mb-2">
                      اختر وسيلة تحويل العربون للملعب:
                    </label>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setPaymentMethod("instapay")}
                        className={`min-h-[44px] rounded-xl px-3 text-xs font-bold transition-all border flex items-center justify-center gap-2 ${
                          paymentMethod === "instapay"
                            ? "bg-white text-black border-white font-black"
                            : "bg-[#242427] text-zinc-300 border-white/[0.06] hover:bg-[#2a2a2e]"
                        }`}
                      >
                        <span className="h-2 w-2 rounded-full bg-purple-500" />
                        <span>إنستاباي (InstaPay)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPaymentMethod("vodafone_cash")}
                        className={`min-h-[44px] rounded-xl px-3 text-xs font-bold transition-all border flex items-center justify-center gap-2 ${
                          paymentMethod === "vodafone_cash"
                            ? "bg-white text-black border-white font-black"
                            : "bg-[#242427] text-zinc-300 border-white/[0.06] hover:bg-[#2a2a2e]"
                        }`}
                      >
                        <span className="h-2 w-2 rounded-full bg-red-500" />
                        <span>فودافون كاش ومحافظ</span>
                      </button>
                    </div>
                  </div>

                  {/* Account / Handle Copy Box */}
                  <div className="rounded-xl bg-[#18181b] border border-white/[0.08] p-4 space-y-2">
                    <span className="text-[11px] text-muted-foreground block">
                      {paymentMethod === "instapay"
                        ? "عنوان InstaPay المباشر لإدارة الملعب:"
                        : "رقم محفظة فودافون كاش لإدارة الملعب:"}
                    </span>

                    <div className="flex items-center justify-between gap-2 bg-[#242427] rounded-xl p-2.5 border border-white/[0.06]">
                      <span className="font-mono text-sm font-bold text-white tabular-nums tracking-wide select-all" dir="ltr">
                        {paymentMethod === "instapay"
                          ? venue.instapay_address || "damanhourpadel@instapay"
                          : venue.vodafone_cash_number || "01099887766"}
                      </span>

                      <button
                        type="button"
                        onClick={() =>
                          copyToClipboard(
                            paymentMethod === "instapay"
                              ? venue.instapay_address || "damanhourpadel@instapay"
                              : venue.vodafone_cash_number || "01099887766",
                            "handle"
                          )
                        }
                        className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary px-3 text-xs font-bold transition-colors shrink-0"
                      >
                        {isCopied === "handle" ? (
                          <>
                            <Check className="h-3.5 w-3.5 text-primary" strokeWidth={2} />
                            <span>تم النسخ</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5" strokeWidth={1.5} />
                            <span>نسخ</span>
                          </>
                        )}
                      </button>
                    </div>

                    <p className="text-[11px] text-zinc-400">
                      افتح تطبيق {paymentMethod === "instapay" ? "InstaPay" : "أنا فودافون / المحفظة"} وحوّل {depositRequired} ج.م، ثم خذ سكرين شوت للإيصال.
                    </p>
                  </div>

                  {/* Receipt Screenshot Upload Zone with In-Browser Compression */}
                  <div>
                    <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                      إرفاق سكرين شوت أو صورة إيصال التحويل <span className="text-primary">*</span>
                    </label>

                    {!receiptPreview ? (
                      <label className="border-2 border-dashed border-white/10 hover:border-primary/50 bg-[#242427] hover:bg-[#28282c] rounded-xl p-5 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all">
                        <UploadCloud className="h-7 w-7 text-primary" strokeWidth={1.5} />
                        <span className="text-xs font-bold text-white">اضغط لاختيار صورة الإيصال أو السكرين شوت</span>
                        <span className="text-[10px] text-muted-foreground">
                          ضغط فوري للصور في المتصفح لأقل من 200KB لسرعة الرفع على شبكات الموبايل
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageSelect}
                          className="hidden"
                        />
                      </label>
                    ) : (
                      <div className="rounded-xl bg-[#242427] border border-white/[0.06] p-3 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="relative h-14 w-14 rounded-lg bg-black/40 overflow-hidden border border-white/10 shrink-0">
                            <Image
                              src={receiptPreview}
                              alt="معاينة الإيصال"
                              fill
                              className="object-cover"
                            />
                          </div>
                          <div>
                            <span className="text-xs font-bold text-white block">
                              {receiptFile?.name || "إيصال التحويل"}
                            </span>
                            {compressionInfo && (
                              <span className="text-[10px] text-emerald-400 flex items-center gap-1 mt-0.5">
                                <FileCheck2 className="h-3 w-3" />
                                <span>
                                  تم ضغط الصورة من {compressionInfo.originalKB}KB إلى {compressionInfo.compressedKB}KB
                                </span>
                              </span>
                            )}
                            {isCompressing && (
                              <span className="text-[10px] text-zinc-400">جاري ضغط الصورة...</span>
                            )}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setReceiptPreview(null);
                            setReceiptFile(null);
                            setCompressedBlob(null);
                            setCompressionInfo(null);
                          }}
                          className="h-8 w-8 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 flex items-center justify-center transition-colors"
                        >
                          <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Reference Number Input */}
                  <div>
                    <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                      الرقم المرجعي للتحويل (Ref Number) <span className="text-primary">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      dir="ltr"
                      value={referenceNumber}
                      onChange={(e) => setReferenceNumber(e.target.value)}
                      placeholder="مثال: 94827103598"
                      className="w-full min-h-[46px] rounded-xl bg-[#242427] border border-white/[0.08] px-4 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-primary transition-all text-right font-mono"
                    />
                    <span className="text-[11px] text-muted-foreground mt-1 block">
                      رقم العملية أو المرجع المطبوع في إيصال إنستاباي أو رسالة فودافون كاش لمنع تكرار الإيصال.
                    </span>
                  </div>

                  {receiptError && (
                    <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-3 flex items-center gap-2 text-xs text-red-400">
                      <AlertCircle className="h-4 w-4 shrink-0" strokeWidth={1.5} />
                      <span>{receiptError}</span>
                    </div>
                  )}

                  {/* Actions Bar */}
                  <div className="space-y-2 pt-2">
                    <button
                      type="submit"
                      disabled={isSubmitting || isCompressing || !compressedBlob || !referenceNumber.trim()}
                      className="w-full min-h-[48px] rounded-xl bg-primary text-black font-black text-sm hover:bg-primary-hover active:scale-[0.99] transition-all flex items-center justify-center gap-2 shadow-[0_2px_15px_rgba(16,185,129,0.3)] disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <>
                          <span className="h-4 w-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                          <span>بنرفع الإيصال ونؤكد الحجز...</span>
                        </>
                      ) : (
                        <>
                          <Check className="h-4 w-4" strokeWidth={2.5} />
                          <span>أرسل الإيصال وأكّد الحجز</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={handleCancelHold}
                      className="w-full min-h-[42px] rounded-xl bg-white/[0.03] hover:bg-white/[0.06] text-zinc-400 hover:text-white text-xs font-bold transition-colors"
                    >
                      إلغاء الحجز وتحرير الميعاد فوراً
                    </button>
                  </div>

                </form>
              )}

            </div>
          )}

          {/* STEP 3: The Digital Booking Pass */}
          {step === "pass" && (
            <div className="space-y-5 py-2">
              
              {/* Success Badge */}
              <div className="text-center space-y-1">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-3.5 py-1 text-xs font-bold text-emerald-400">
                  <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                  <span>تم استلام الإيصال وحجز الميعاد بنجاح</span>
                </span>
                <h3 className="font-display font-black text-xl sm:text-2xl text-white">
                  تذكرتك الرقمية جاهزة للماتش
                </h3>
                <p className="text-xs text-muted-foreground">
                  احفظ كود التذكرة أو ابعتها لإدارة الملعب على واتساب بضغطة واحدة.
                </p>
              </div>

              {/* Boarding Pass Container */}
              <div className="rounded-2xl bg-gradient-to-b from-[#242427] to-[#1c1c1f] border border-white/10 p-5 space-y-4 shadow-xl relative overflow-hidden">
                
                {/* Pass Header */}
                <div className="flex items-center justify-between border-b border-white/[0.08] pb-3.5">
                  <div>
                    <span className="font-display font-black text-lg text-white">
                      باصـ<span className="text-primary">يلي</span>
                    </span>
                    <span className="text-[10px] text-muted-foreground block">
                      Passyli Digital Match Pass
                    </span>
                  </div>

                  <div className="text-left">
                    <span className="text-[10px] text-muted-foreground block">حالة التذكرة</span>
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-primary">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                      <span>مؤكد • بانتظار الاعتماد</span>
                    </span>
                  </div>
                </div>

                {/* Booking Code */}
                <div className="rounded-xl bg-[#141416] border border-white/[0.06] p-3 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-muted-foreground block">كود الحجز المعتمد</span>
                    <span className="font-mono font-black text-base sm:text-lg text-primary tracking-wider select-all" dir="ltr">
                      {confirmedRef}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => copyToClipboard(confirmedRef, "pass_code")}
                    className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary px-3 text-xs font-bold transition-colors"
                  >
                    {isCopied === "pass_code" ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-primary" strokeWidth={2} />
                        <span>تم النسخ</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" strokeWidth={1.5} />
                        <span>نسخ الكود</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Match Details Grid */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] text-muted-foreground block mb-0.5">الملعب</span>
                    <span className="font-bold text-white block">{venue.name}</span>
                    <span className="text-[11px] text-zinc-400">{court.name}</span>
                  </div>

                  <div>
                    <span className="text-[10px] text-muted-foreground block mb-0.5">اسم الكابتن</span>
                    <span className="font-bold text-white block">{bookerName}</span>
                    <span className="text-[11px] text-zinc-400 font-mono" dir="ltr">{bookerPhone}</span>
                  </div>

                  <div>
                    <span className="text-[10px] text-muted-foreground block mb-0.5">اليوم والتاريخ</span>
                    <span className="font-bold text-white block">{dayLabel}</span>
                    <span className="text-[11px] text-zinc-400">{displayDate}</span>
                  </div>

                  <div>
                    <span className="text-[10px] text-muted-foreground block mb-0.5">ميعاد الماتش</span>
                    <span className="font-bold text-primary text-sm tabular-nums block">{slotTime}</span>
                    <span className="text-[11px] text-zinc-400">المدة {court.slot_duration_minutes || 60} دقيقة</span>
                  </div>
                </div>

                {/* Explicit Financial Settlement Box */}
                <div className="pt-3 border-t border-dashed border-white/10 flex items-center justify-between text-xs bg-white/[0.02] -mx-5 px-5 py-3">
                  <div>
                    <span className="text-[10px] text-muted-foreground block">العربون المدفوع إلكترونياً</span>
                    <span className="font-bold text-emerald-400 text-sm tabular-nums">
                      {depositRequired} ج.م (تم التحويل)
                    </span>
                  </div>

                  <div className="text-left">
                    <span className="text-[10px] text-muted-foreground block">المتبقي كاش في الملعب</span>
                    <span className="font-display font-black text-base text-white tabular-nums">
                      {cashRemaining} ج.م
                    </span>
                  </div>
                </div>

                {/* Barcode visual indicator */}
                <div className="pt-2 text-center">
                  <div className="h-6 w-full max-w-xs mx-auto bg-white/10 rounded flex items-center justify-around px-2 opacity-50">
                    {Array.from({ length: 32 }).map((_, i) => (
                      <span
                        key={i}
                        className={`h-4 ${i % 3 === 0 ? "w-1 bg-white" : i % 2 === 0 ? "w-0.5 bg-white" : "w-1.5 bg-white"}`}
                      />
                    ))}
                  </div>
                  <span className="text-[9px] text-zinc-500 font-mono mt-1 block">
                    VERIFIED SECURE BOOKING HASH • PASSYLI PROTOCOL
                  </span>
                </div>

              </div>

              {/* Action Buttons */}
              <div className="space-y-2.5">
                <a
                  href={generateWhatsAppUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full min-h-[48px] rounded-xl bg-emerald-500 hover:bg-emerald-600 text-black font-black text-sm transition-all flex items-center justify-center gap-2 shadow-[0_2px_15px_rgba(16,185,129,0.3)]"
                >
                  <MessageSquare className="h-4 w-4" strokeWidth={2} />
                  <span>إرسال بيانات التذكرة لإدارة الملعب على واتساب</span>
                </a>

                <button
                  type="button"
                  onClick={onClose}
                  className="w-full min-h-[44px] rounded-xl bg-white/[0.05] hover:bg-white/10 text-white font-bold text-xs transition-colors"
                >
                  إغلاق وتصفح ملاعب أخرى
                </button>
              </div>

            </div>
          )}

        </div>

      </div>
    </div>
  );
}
