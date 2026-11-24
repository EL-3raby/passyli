import { createClient } from "@/lib/supabase/client";

export interface DashboardCourt {
  id: string;
  venue_id: string;
  name: string;
  sport: "football" | "padel";
  surface: string;
  slot_duration_minutes: number;
  price_morning: number;
  price_evening: number;
  peak_hour_start: string;
  buffer_minutes: number;
  is_active: boolean;
}

export interface DashboardVenue {
  id: string;
  name: string;
  slug: string;
  city: string;
  district: string;
  address: string;
  phone: string;
  whatsapp_number: string;
  deposit_amount: number;
  instapay_address: string | null;
  vodafone_cash_number: string | null;
  opening_time: string;
  closing_time: string;
  is_active: boolean;
  courts: DashboardCourt[];
}

export interface DashboardReceipt {
  id: string;
  booking_id: string;
  sender_name: string;
  sender_phone: string;
  payment_method: "instapay" | "vodafone_cash" | "orange_cash" | "cash";
  reference_number: string;
  amount_paid: number;
  image_url: string;
  status: "pending" | "submitted" | "verified" | "rejected" | "paid_cash_on_pitch";
  rejection_reason: string | null;
  verified_at: string | null;
  created_at: string;
  booking?: DashboardBooking;
}

export interface DashboardBooking {
  id: string;
  booking_reference: string;
  court_id: string;
  booker_name: string;
  booker_phone: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  total_price: number;
  deposit_required: number;
  deposit_paid: number;
  cash_remaining: number;
  status: "pending_payment" | "confirmed" | "completed" | "cancelled" | "expired";
  locked_until: string | null;
  is_walkin: boolean;
  cancellation_reason: string | null;
  created_at: string;
  court?: DashboardCourt & { venue?: { id: string; name: string; address: string; phone: string } };
  receipts?: DashboardReceipt[];
}

export interface CreateWalkinParams {
  courtId: string;
  bookingDate: string; // YYYY-MM-DD
  startTime: string;   // HH:MM:SS or HH:MM
  endTime: string;     // HH:MM:SS or HH:MM
  bookerName: string;
  bookerPhone: string;
  totalPrice: number;
  amountPaid: number;  // 0 or partial/full
}

/**
 * Fetch all venues with their courts for dashboard selector
 */
export async function getDashboardVenues(): Promise<DashboardVenue[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("venues")
    .select(`
      id,
      name,
      slug,
      city,
      district,
      address,
      phone,
      whatsapp_number,
      deposit_amount,
      instapay_address,
      vodafone_cash_number,
      opening_time,
      closing_time,
      is_active,
      courts (
        id,
        venue_id,
        name,
        sport,
        surface,
        slot_duration_minutes,
        price_morning,
        price_evening,
        peak_hour_start,
        buffer_minutes,
        is_active
      )
    `)
    .order("name");

  if (error) {
    console.error("Error fetching dashboard venues:", error);
    return [];
  }

  return (data as unknown as DashboardVenue[]) || [];
}

/**
 * Fetch all bookings for a given venue and date
 */
export async function getVenueDateBookings(
  venueId: string,
  date: string
): Promise<DashboardBooking[]> {
  const supabase = createClient();

  // 1. Get court IDs for this venue
  const { data: courts, error: courtErr } = await supabase
    .from("courts")
    .select("id")
    .eq("venue_id", venueId);

  if (courtErr || !courts || courts.length === 0) {
    return [];
  }

  const courtIds = courts.map((c) => c.id);

  // 2. Fetch bookings for these courts on the specified date
  const { data: bookings, error: bookingErr } = await supabase
    .from("bookings")
    .select(`
      id,
      booking_reference,
      court_id,
      booker_name,
      booker_phone,
      booking_date,
      start_time,
      end_time,
      total_price,
      deposit_required,
      deposit_paid,
      cash_remaining,
      status,
      locked_until,
      is_walkin,
      cancellation_reason,
      created_at,
      court:courts (
        id,
        venue_id,
        name,
        sport,
        surface,
        slot_duration_minutes,
        price_morning,
        price_evening,
        peak_hour_start,
        buffer_minutes,
        is_active
      ),
      receipts (
        id,
        booking_id,
        sender_name,
        sender_phone,
        payment_method,
        reference_number,
        amount_paid,
        image_url,
        status,
        rejection_reason,
        verified_at,
        created_at
      )
    `)
    .in("court_id", courtIds)
    .eq("booking_date", date)
    .neq("status", "cancelled")
    .order("start_time");

  if (bookingErr) {
    console.error("Error fetching venue date bookings:", bookingErr);
    return [];
  }

  return (bookings as unknown as DashboardBooking[]) || [];
}

/**
 * Fetch all pending receipts for audit (status = 'submitted')
 */
export async function getPendingReceipts(venueId?: string): Promise<DashboardReceipt[]> {
  const supabase = createClient();

  let query = supabase
    .from("receipts")
    .select(`
      id,
      booking_id,
      sender_name,
      sender_phone,
      payment_method,
      reference_number,
      amount_paid,
      image_url,
      status,
      rejection_reason,
      verified_at,
      created_at,
      booking:bookings (
        id,
        booking_reference,
        court_id,
        booker_name,
        booker_phone,
        booking_date,
        start_time,
        end_time,
        total_price,
        deposit_required,
        deposit_paid,
        cash_remaining,
        status,
        locked_until,
        is_walkin,
        court:courts (
          id,
          venue_id,
          name,
          sport,
          surface,
          venue:venues (
            id,
            name,
            address,
            phone
          )
        )
      )
    `)
    .eq("status", "submitted")
    .order("created_at", { ascending: false });

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching pending receipts:", error);
    return [];
  }

  let receipts = (data as unknown as DashboardReceipt[]) || [];

  if (venueId) {
    receipts = receipts.filter(
      (r) => r.booking?.court?.venue_id === venueId || (r.booking?.court as any)?.venue?.id === venueId
    );
  }

  return receipts;
}

/**
 * Create immediate Walk-in Cash Booking
 */
export async function createWalkinBooking(
  params: CreateWalkinParams
): Promise<{ success: boolean; bookingId?: string; bookingReference?: string; error?: string }> {
  const supabase = createClient();

  const { data, error } = await supabase.rpc("create_walkin_booking", {
    p_court_id: params.courtId,
    p_booking_date: params.bookingDate,
    p_start_time: params.startTime,
    p_end_time: params.endTime,
    p_booker_name: params.bookerName,
    p_booker_phone: params.bookerPhone,
    p_total_price: params.totalPrice,
    p_amount_paid: params.amountPaid || 0,
  });

  if (error) {
    console.error("create_walkin_booking error:", error);
    return { success: false, error: error.message || "تعذر قفل الحجز الكاش، يرجى إعادة المحاولة" };
  }

  return data as { success: boolean; bookingId?: string; bookingReference?: string; error?: string };
}

/**
 * Review booking receipt (Approve, Adjust Underpayment, or Reject)
 */
export async function reviewReceipt(
  receiptId: string,
  action: "approve" | "adjust" | "reject",
  adjustedAmount?: number,
  rejectionReason?: string
): Promise<{ success: boolean; error?: string; action?: string; deposit_paid?: number; cash_remaining?: number }> {
  const supabase = createClient();

  const { data, error } = await supabase.rpc("review_booking_receipt", {
    p_receipt_id: receiptId,
    p_action: action,
    p_adjusted_amount: adjustedAmount || null,
    p_rejection_reason: rejectionReason || null,
  });

  if (error) {
    console.error("review_booking_receipt error:", error);
    return { success: false, error: error.message || "فشلت عملية مراجعة الإيصال" };
  }

  return data as any;
}

/**
 * Complete booking attendance and settle remaining cash at the pitch
 */
export async function completeBookingAttendance(
  bookingId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();

  const { data, error } = await supabase.rpc("complete_booking_attendance", {
    p_booking_id: bookingId,
  });

  if (error) {
    console.error("complete_booking_attendance error:", error);
    return { success: false, error: error.message || "تعذر تسجيل حضور الفرقة" };
  }

  return data as { success: boolean; error?: string };
}

/**
 * Toggle court maintenance / active status (Force Majeure / Emergency)
 */
export async function toggleCourtMaintenance(
  courtId: string,
  isActive: boolean
): Promise<{ success: boolean; error?: string; is_active?: boolean }> {
  const supabase = createClient();

  const { data, error } = await supabase.rpc("toggle_court_maintenance", {
    p_court_id: courtId,
    p_is_active: isActive,
  });

  if (error) {
    console.error("toggle_court_maintenance error:", error);
    return { success: false, error: error.message || "تعذر تعديل حالة الصيانة للملعب" };
  }

  return data as { success: boolean; error?: string; is_active?: boolean };
}

/**
 * Cancel a booking directly from venue administration and release the slot
 */
export async function cancelVenueBooking(
  bookingId: string,
  cancellationReason?: string
): Promise<{ success: boolean; error?: string; booking_reference?: string }> {
  const supabase = createClient();

  const { data, error } = await supabase.rpc("cancel_venue_booking", {
    p_booking_id: bookingId,
    p_cancellation_reason: cancellationReason || null,
  });

  if (error) {
    console.error("cancel_venue_booking error:", error);
    return { success: false, error: error.message || "تعذر إلغاء الحجز، يرجى إعادة المحاولة" };
  }

  return data as any;
}

/**
 * Search bookings across reference code, phone number, or booker name
 */
export async function searchBookings(
  query: string,
  venueId?: string
): Promise<DashboardBooking[]> {
  const trimmed = query.trim();
  if (!trimmed || trimmed.length < 2) return [];

  const supabase = createClient();

  let req = supabase
    .from("bookings")
    .select(`
      id,
      booking_reference,
      court_id,
      booker_name,
      booker_phone,
      booking_date,
      start_time,
      end_time,
      total_price,
      deposit_required,
      deposit_paid,
      cash_remaining,
      status,
      locked_until,
      is_walkin,
      cancellation_reason,
      created_at,
      court:courts (
        id,
        venue_id,
        name,
        sport,
        surface,
        slot_duration_minutes,
        price_morning,
        price_evening,
        peak_hour_start,
        buffer_minutes,
        is_active,
        venue:venues (
          id,
          name,
          address,
          phone
        )
      )
    `)
    .or(`booking_reference.ilike.%${trimmed}%,booker_phone.ilike.%${trimmed}%,booker_name.ilike.%${trimmed}%`)
    .order("booking_date", { ascending: false })
    .limit(10);

  const { data, error } = await req;

  if (error) {
    console.error("searchBookings error:", error);
    return [];
  }

  let results = (data as unknown as DashboardBooking[]) || [];
  if (venueId && venueId !== "all") {
    results = results.filter((b) => b.court?.venue_id === venueId);
  }

  return results;
}
