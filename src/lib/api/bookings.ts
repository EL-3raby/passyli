import { createClient } from "@/lib/supabase/client";
import type { PaymentMethod } from "@/lib/supabase/types";

export interface LockSlotParams {
  courtId: string;
  bookingDate: string; // YYYY-MM-DD
  startTime: string;   // HH:MM:SS or HH:MM
  endTime: string;     // HH:MM:SS or HH:MM
  bookerName: string;
  bookerPhone: string;
  totalPrice: number;
  depositRequired: number;
  cashRemaining: number;
  sessionId?: string;
}

export interface LockSlotResult {
  success: boolean;
  bookingId?: string;
  bookingReference?: string;
  lockedUntil?: string;
  error?: string;
}

export interface SubmitReceiptParams {
  bookingId: string;
  senderName: string;
  senderPhone: string;
  paymentMethod: PaymentMethod;
  referenceNumber: string;
  amountPaid: number;
  imageUrl: string;
}

export interface SubmitReceiptResult {
  success: boolean;
  receiptId?: string;
  bookingReference?: string;
  error?: string;
}

/**
 * Generates or retrieves a persistent client session ID for anonymous booking holds
 */
export function getOrCreateBookingSessionId(): string {
  if (typeof window === "undefined") return "server-session";
  const KEY = "passyli_booking_session";
  let sessionId = localStorage.getItem(KEY);
  if (!sessionId) {
    sessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    localStorage.setItem(KEY, sessionId);
  }
  return sessionId;
}

/**
 * Calls the Supabase RPC lock_court_slot to hold a slot for 8 minutes
 */
export async function lockCourtSlot(params: LockSlotParams): Promise<LockSlotResult> {
  const supabase = createClient();
  const sessionId = params.sessionId || getOrCreateBookingSessionId();

  // Normalize times to HH:MM:SS
  const formatTime = (t: string) => (t.length === 5 ? `${t}:00` : t);

  try {
    const { data, error } = await supabase.rpc("lock_court_slot", {
      p_court_id: params.courtId,
      p_booking_date: params.bookingDate,
      p_start_time: formatTime(params.startTime),
      p_end_time: formatTime(params.endTime),
      p_booker_name: params.bookerName.trim(),
      p_booker_phone: params.bookerPhone.trim(),
      p_total_price: Math.round(params.totalPrice),
      p_deposit_required: Math.round(params.depositRequired),
      p_cash_remaining: Math.round(params.cashRemaining),
      p_session_id: sessionId,
    });

    if (error) {
      const errorMsg = error.message || error.details || (typeof error === "object" ? JSON.stringify(error) : String(error));
      console.error("lock_court_slot error:", errorMsg);
      const isConflict = error.code === "23505" || errorMsg.includes("idx_unique_active_court_slot");
      return {
        success: false,
        error: isConflict
          ? "الميعاد محجوز بالفعل أو قيد الدفع من لاعب آخر حالياً"
          : (error.message || "تعذر حجز الميعاد، يرجى المحاولة مرة أخرى"),
      };
    }

    const res = data as {
      success: boolean;
      booking_id?: string;
      booking_reference?: string;
      locked_until?: string;
      error?: string;
    };

    if (!res.success) {
      return { success: false, error: res.error || "الميعاد غير متاح حالياً" };
    }

    return {
      success: true,
      bookingId: res.booking_id,
      bookingReference: res.booking_reference,
      lockedUntil: res.locked_until,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "حدث خطأ غير متوقع";
    return { success: false, error: message };
  }
}

/**
 * Releases a held slot immediately when user cancels or leaves
 */
export async function cancelBookingLock(bookingId: string, sessionId?: string): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();
  const sessId = sessionId || getOrCreateBookingSessionId();

  try {
    const { data, error } = await supabase.rpc("cancel_booking_lock", {
      p_booking_id: bookingId,
      p_session_id: sessId,
    });

    if (error) {
      console.error("cancel_booking_lock error:", error.message || error.details || error);
      return { success: false, error: error.message };
    }

    const res = data as { success: boolean; error?: string };
    return res;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "تعذر إلغاء الحجز";
    return { success: false, error: message };
  }
}

/**
 * Client-Side Image Compression for Mobile Networks (Canvas API)
 * Reduces receipts / screenshots to < 200KB before uploading to Supabase Storage
 */
export async function compressImageClient(
  file: File,
  maxSizeBytes: number = 200 * 1024,
  maxDimension: number = 1400
): Promise<{ blob: Blob; originalSize: number; compressedSize: number }> {
  const originalSize = file.size;

  // If already under 120KB and is a valid image, return early
  if (originalSize <= 120 * 1024 && (file.type === "image/jpeg" || file.type === "image/png")) {
    return { blob: file, originalSize, compressedSize: originalSize };
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Resize down if larger than maxDimension
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("تعذر معالجة الصورة في المتصفح"));
          return;
        }

        // Draw on canvas with smoothing
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0, width, height);

        // Iterative compression starting at quality 0.8
        let quality = 0.8;
        const tryExport = () => {
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error("فشل تحويل الصورة"));
                return;
              }

              if (blob.size <= maxSizeBytes || quality <= 0.4) {
                resolve({
                  blob,
                  originalSize,
                  compressedSize: blob.size,
                });
              } else {
                quality -= 0.15;
                tryExport();
              }
            },
            "image/jpeg",
            quality
          );
        };

        tryExport();
      };

      img.onerror = () => reject(new Error("ملف الصورة غير صالح"));
      img.src = e.target?.result as string;
    };

    reader.onerror = () => reject(new Error("تعذر قراءة ملف الصورة"));
    reader.readAsDataURL(file);
  });
}

/**
 * Uploads a compressed receipt image to Supabase Storage receipts-storage
 */
export async function uploadReceiptScreenshot(
  bookingId: string,
  imageBlob: Blob
): Promise<{ url: string | null; error?: string }> {
  const supabase = createClient();
  const fileExt = "jpg";
  const fileName = `receipts/${bookingId}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;

  try {
    const { error: uploadError } = await supabase.storage
      .from("receipts-storage")
      .upload(fileName, imageBlob, {
        contentType: "image/jpeg",
        upsert: false,
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError.message || uploadError);
      return { url: null, error: "تعذر رفع صورة الإيصال للسحابة، تأكد من الاتصال بالإنترنت" };
    }

    const { data: publicData } = supabase.storage
      .from("receipts-storage")
      .getPublicUrl(fileName);

    return { url: publicData.publicUrl };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "فشل رفع الإيصال";
    return { url: null, error: message };
  }
}

/**
 * Submits the receipt and reference number to finalize the booking
 */
export async function submitBookingReceipt(params: SubmitReceiptParams): Promise<SubmitReceiptResult> {
  const supabase = createClient();

  try {
    const { data, error } = await supabase.rpc("submit_booking_receipt", {
      p_booking_id: params.bookingId,
      p_sender_name: params.senderName.trim(),
      p_sender_phone: params.senderPhone.trim(),
      p_payment_method: params.paymentMethod,
      p_reference_number: params.referenceNumber.trim(),
      p_amount_paid: Math.round(params.amountPaid),
      p_image_url: params.imageUrl,
    });

    if (error) {
      console.error("submit_booking_receipt error:", error.message || error.details || error);
      return { success: false, error: error.message || "تعذر تسجيل الإيصال، تأكد من صحة البيانات" };
    }

    const res = data as {
      success: boolean;
      receipt_id?: string;
      booking_reference?: string;
      error?: string;
    };

    if (!res.success) {
      return { success: false, error: res.error || "فشل تسجيل الإيصال" };
    }

    return {
      success: true,
      receiptId: res.receipt_id,
      bookingReference: res.booking_reference,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "حدث خطأ غير متوقع أثناء إرسال الإيصال";
    return { success: false, error: message };
  }
}

export interface ActiveSlotLock {
  courtId: string;
  startTime: string;
  status: "pending_payment" | "confirmed";
  lockedUntil?: string | null;
}

/**
 * Fetches actively held or booked slots for a specific date
 */
export async function getActiveBookingsForDate(dateStr: string): Promise<ActiveSlotLock[]> {
  const supabase = createClient();
  try {
    const { data, error } = await supabase
      .from("bookings")
      .select("court_id, start_time, status, locked_until")
      .eq("booking_date", dateStr)
      .not("status", "in", '("cancelled","expired")');

    if (error || !data) return [];

    const now = new Date();
    return data
      .filter((b) => {
        if (b.status === "pending_payment" && b.locked_until) {
          return new Date(b.locked_until) > now;
        }
        return b.status === "confirmed";
      })
      .map((b) => ({
        courtId: b.court_id,
        startTime: b.start_time,
        status: b.status as "pending_payment" | "confirmed",
        lockedUntil: b.locked_until,
      }));
  } catch {
    return [];
  }
}

export function slotLabelToDbTime(slotLabel: string): string {
  const clean = slotLabel.replace(/[^0-9:]/g, "");
  const [hStr, mStr] = clean.split(":");
  let h = parseInt(hStr || "18", 10);
  const m = parseInt(mStr || "0", 10);
  if (slotLabel.includes("م") && h < 12) h += 12;
  if (slotLabel.includes("ص") && h === 12) h = 0;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`;
}

/**
 * Checks whether a display slot (e.g. "06:00 م") matches a DB time (e.g. "18:00:00")
 */
export function isSlotMatchingTime(slotLabel: string, dbStartTime: string): boolean {
  if (!dbStartTime || !slotLabel) return false;
  const [hStr, mStr] = dbStartTime.split(":");
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr || "0", 10);

  const isPM = slotLabel.includes("م");
  const isAM = slotLabel.includes("ص");
  const clean = slotLabel.replace(/[^0-9:]/g, "");
  const [lhStr, lmStr] = clean.split(":");
  let lh = parseInt(lhStr, 10);
  const lm = parseInt(lmStr || "0", 10);

  if (isPM && lh < 12) lh += 12;
  if (isAM && lh === 12) lh = 0;

  return h === lh && m === lm;
}

export interface BookingDetails {
  id: string;
  booking_reference: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  total_price: number;
  deposit_required: number;
  deposit_paid: number;
  cash_remaining: number;
  payment_type?: string | null;
  reschedule_requested_at?: string | null;
  reschedule_requested_slot?: string | null;
  status: "pending_payment" | "confirmed" | "completed" | "cancelled" | "expired";
  booker_name: string;
  booker_phone: string;
  created_at: string;
  court: {
    id: string;
    name: string;
    sport: "padel" | "football";
    surface: string;
    slot_duration_minutes: number;
    price_morning?: number;
    price_evening?: number;
    peak_hour_start?: string;
  };
  venue: {
    id: string;
    name: string;
    city: string;
    district: string;
    address: string;
    latitude: number;
    longitude: number;
    phone: string;
    whatsapp_number: string;
    images: string[];
  };
}

interface JoinedVenueRow {
  id: string;
  name: string;
  city: string;
  district: string;
  address: string;
  latitude: number;
  longitude: number;
  phone: string;
  whatsapp_number: string;
  images: string[] | null;
}

interface JoinedCourtRow {
  id: string;
  name: string;
  sport: "padel" | "football";
  surface: string;
  slot_duration_minutes: number | null;
  price_morning: number;
  price_evening: number;
  peak_hour_start: string;
  venues: JoinedVenueRow | null;
}

/**
 * Fetches full booking details and relations by booking reference (e.g. PAS-20261123-5B99)
 */
export async function getBookingByReference(reference: string): Promise<BookingDetails | null> {
  const supabase = createClient();
  try {
    const { data, error } = await supabase
      .from("bookings")
      .select("*, courts(*, venues(*))")
      .eq("booking_reference", reference.trim().toUpperCase())
      .maybeSingle();

    if (error || !data || !data.courts) {
      return null;
    }

    const c = data.courts as unknown as JoinedCourtRow;
    const v = c.venues;
    if (!v) return null;

    return {
      id: data.id,
      booking_reference: data.booking_reference,
      booking_date: data.booking_date,
      start_time: data.start_time,
      end_time: data.end_time,
      total_price: data.total_price,
      deposit_required: data.deposit_required,
      deposit_paid: data.deposit_paid,
      cash_remaining: data.cash_remaining,
      payment_type: data.payment_type,
      reschedule_requested_at: data.reschedule_requested_at,
      reschedule_requested_slot: data.reschedule_requested_slot,
      status: data.status,
      booker_name: data.booker_name,
      booker_phone: data.booker_phone,
      created_at: data.created_at,
      court: {
        id: c.id,
        name: c.name,
        sport: c.sport,
        surface: c.surface,
        slot_duration_minutes: c.slot_duration_minutes || 60,
        price_morning: c.price_morning,
        price_evening: c.price_evening,
        peak_hour_start: c.peak_hour_start,
      },
      venue: {
        id: v.id,
        name: v.name,
        city: v.city,
        district: v.district,
        address: v.address,
        latitude: Number(v.latitude),
        longitude: Number(v.longitude),
        phone: v.phone,
        whatsapp_number: v.whatsapp_number,
        images: Array.isArray(v.images) && v.images.length > 0 ? v.images : ["/images/hero-court.jpg"],
      },
    };
  } catch {
    return null;
  }
}

export async function rescheduleBooking(params: {
  bookingReference: string;
  newDate: string;
  newStartTime: string;
  newEndTime: string;
}): Promise<{
  success: boolean;
  error?: string;
  booking_date?: string;
  start_time?: string;
  end_time?: string;
  total_price?: number;
  cash_remaining?: number;
}> {
  const supabase = createClient();
  const sessionId = getOrCreateBookingSessionId();
  const { data, error } = await supabase.rpc("reschedule_booking", {
    p_booking_reference: params.bookingReference,
    p_new_date: params.newDate,
    p_new_start_time: params.newStartTime,
    p_new_end_time: params.newEndTime,
    p_session_id: sessionId,
  });

  if (error) {
    return { success: false, error: error.message || "تعذر تعديل الميعاد" };
  }
  return (data as {
    success: boolean;
    error?: string;
    booking_date?: string;
    start_time?: string;
    end_time?: string;
    total_price?: number;
    cash_remaining?: number;
  }) ?? { success: false, error: "تعذر تعديل الميعاد" };
}

export async function subscribeSlotWaitlist(params: {
  courtId: string;
  bookingDate: string;
  startTime: string;
}): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();
  const sessionId = getOrCreateBookingSessionId();
  const normalizedTime = params.startTime.length === 5 ? `${params.startTime}:00` : params.startTime;

  const { data, error } = await supabase.rpc("subscribe_slot_waitlist", {
    p_court_id: params.courtId,
    p_booking_date: params.bookingDate,
    p_start_time: normalizedTime,
    p_session_id: sessionId,
  });

  if (error) {
    return { success: false, error: error.message };
  }
  return (data as { success: boolean; error?: string }) ?? { success: false };
}

export interface VenueRatingSummary {
  venue_id: string;
  avg_rating: number;
  reviews_count: number;
}

export async function getVenueRatingSummaries(): Promise<Record<string, VenueRatingSummary>> {
  const supabase = createClient();
  try {
    const { data, error } = await supabase.rpc("get_venue_rating_summaries");
    if (error || !Array.isArray(data)) return {};
    const map: Record<string, VenueRatingSummary> = {};
    for (const row of data as unknown as VenueRatingSummary[]) {
      if (row.venue_id) {
        map[row.venue_id] = {
          venue_id: row.venue_id,
          avg_rating: Number(row.avg_rating),
          reviews_count: Number(row.reviews_count),
        };
      }
    }
    return map;
  } catch {
    return {};
  }
}

export async function submitVenueReview(params: {
  bookingId: string;
  turfRating: number;
  lightingRating: number;
  serviceRating: number;
  comment?: string;
}): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("submit_venue_review", {
    p_booking_id: params.bookingId,
    p_turf_rating: params.turfRating,
    p_lighting_rating: params.lightingRating,
    p_service_rating: params.serviceRating,
    p_comment: params.comment?.trim() || null,
  });

  if (error) {
    return { success: false, error: error.message || "تعذر إرسال التقييم" };
  }
  return (data as { success: boolean; error?: string }) ?? { success: false };
}


