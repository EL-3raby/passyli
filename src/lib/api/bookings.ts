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

