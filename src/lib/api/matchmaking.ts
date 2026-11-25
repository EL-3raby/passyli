import { createClient } from "@/lib/supabase/client";

export interface MatchmakingPost {
  id: string;
  court_id: string;
  creator_id?: string | null;
  sport: "football" | "padel";
  match_date: string;
  start_time: string;
  players_needed: number;
  current_players: number;
  cost_per_player: number;
  creator_name: string;
  creator_phone: string;
  whatsapp_number: string | null;
  required_position: string;
  skill_level: string;
  notes: string | null;
  booking_id: string | null;
  status: "open" | "filled" | "cancelled";
  created_at: string;
  court?: {
    id: string;
    name: string;
    sport: "football" | "padel";
    surface: string;
    slot_duration_minutes: number;
    venue?: {
      id: string;
      name: string;
      address: string;
      district: string;
      phone: string;
      latitude: number;
      longitude: number;
    };
  };
}

export interface CreateMatchmakingParams {
  courtId: string;
  sport: "football" | "padel";
  matchDate: string; // YYYY-MM-DD
  startTime: string; // HH:MM:SS
  playersNeeded: number;
  costPerPlayer: number;
  creatorName: string;
  creatorPhone: string;
  whatsappNumber?: string;
  requiredPosition?: string;
  skillLevel?: string;
  notes?: string;
  bookingId?: string;
}

export interface MatchmakingFilters {
  sport?: "football" | "padel" | "all";
  position?: string;
  date?: string;
  status?: "open" | "all";
}

/**
 * Fetch open matchmaking posts with court and venue details
 */
export async function getMatchmakingPosts(
  filters?: MatchmakingFilters
): Promise<MatchmakingPost[]> {
  const supabase = createClient();

  let query = supabase
    .from("matchmaking_posts")
    .select(`
      id,
      court_id,
      creator_id,
      sport,
      match_date,
      start_time,
      players_needed,
      current_players,
      cost_per_player,
      creator_name,
      creator_phone,
      whatsapp_number,
      required_position,
      skill_level,
      notes,
      booking_id,
      status,
      created_at,
      court:courts (
        id,
        name,
        sport,
        surface,
        slot_duration_minutes,
        venue:venues (
          id,
          name,
          address,
          district,
          phone,
          latitude,
          longitude
        )
      )
    `)
    .order("match_date", { ascending: true })
    .order("start_time", { ascending: true });

  if (!filters?.status || filters.status === "open") {
    query = query.eq("status", "open");
  }

  if (filters?.sport && filters.sport !== "all") {
    query = query.eq("sport", filters.sport);
  }

  if (filters?.date) {
    query = query.eq("match_date", filters.date);
  }

  if (filters?.position && filters.position !== "all") {
    query = query.ilike("required_position", `%${filters.position}%`);
  }

  const { data, error } = await query;

  if (error) {
    console.error("getMatchmakingPosts error:", error);
    return [];
  }

  return (data as unknown as MatchmakingPost[]) || [];
}

/**
 * Create a new matchmaking post (نشر تقسيمة مفتوحة)
 */
export async function createMatchmakingPost(
  params: CreateMatchmakingParams
): Promise<{ success: boolean; postId?: string; error?: string }> {
  const supabase = createClient();

  const { data, error } = await supabase.rpc("create_matchmaking_post", {
    p_court_id: params.courtId,
    p_sport: params.sport,
    p_match_date: params.matchDate,
    p_start_time: params.startTime,
    p_players_needed: params.playersNeeded,
    p_cost_per_player: params.costPerPlayer,
    p_creator_name: params.creatorName,
    p_creator_phone: params.creatorPhone,
    p_whatsapp_number: params.whatsappNumber || params.creatorPhone,
    p_required_position: params.requiredPosition || "أي مركز",
    p_skill_level: params.skillLevel || "متوسط",
    p_notes: params.notes || null,
    p_booking_id: params.bookingId || null,
  });

  if (error) {
    console.error("createMatchmakingPost error:", error);
    return { success: false, error: error.message || "تعذر نشر التقسيمة، يرجى إعادة المحاولة" };
  }

  return data as { success: boolean; postId?: string; error?: string };
}

/**
 * Update matchmaking status (mark filled or cancelled)
 */
export async function updateMatchmakingStatus(
  postId: string,
  status: "open" | "filled" | "cancelled"
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();

  const { data, error } = await supabase.rpc("update_matchmaking_status", {
    p_post_id: postId,
    p_status: status,
  });

  if (error) {
    console.error("updateMatchmakingStatus error:", error);
    return { success: false, error: error.message || "تعذر تحديث حالة التقسيمة" };
  }

  return data as { success: boolean; error?: string };
}

export interface MatchmakingParticipant {
  id: string;
  post_id: string;
  user_id: string;
  player_name: string;
  position: string;
  joined_at: string;
  is_me: boolean;
  player_phone: string | null;
}

export async function getMatchmakingParticipants(
  postIds: string[]
): Promise<Record<string, MatchmakingParticipant[]>> {
  if (postIds.length === 0) return {};
  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_matchmaking_participants", {
    p_post_ids: postIds,
  });

  if (error || !Array.isArray(data)) {
    return {};
  }

  const grouped: Record<string, MatchmakingParticipant[]> = {};
  for (const row of data as unknown as MatchmakingParticipant[]) {
    if (!grouped[row.post_id]) {
      grouped[row.post_id] = [];
    }
    grouped[row.post_id].push(row);
  }
  return grouped;
}

export async function joinMatchmakingPost(params: {
  postId: string;
  playerName: string;
  playerPhone: string;
  position?: string;
}): Promise<{
  success: boolean;
  players_needed?: number;
  status?: string;
  error?: string;
}> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("join_matchmaking_post", {
    p_post_id: params.postId,
    p_player_name: params.playerName.trim(),
    p_player_phone: params.playerPhone.trim().replace(/\s+/g, ""),
    p_position: params.position || "أي مركز",
  });

  if (error) {
    return {
      success: false,
      error: error.message || "تعذر الانضمام للتقسيمة",
    };
  }
  return (data as {
    success: boolean;
    players_needed?: number;
    status?: string;
    error?: string;
  }) ?? { success: false, error: "تعذر الانضمام للتقسيمة" };
}

export async function leaveMatchmakingPost(postId: string): Promise<{
  success: boolean;
  players_needed?: number;
  status?: string;
  error?: string;
}> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("leave_matchmaking_post", {
    p_post_id: postId,
  });

  if (error) {
    return {
      success: false,
      error: error.message || "تعذر الانسحاب من التقسيمة",
    };
  }
  return (data as {
    success: boolean;
    players_needed?: number;
    status?: string;
    error?: string;
  }) ?? { success: false, error: "تعذر الانسحاب من التقسيمة" };
}

/**
 * Format Arabic time display (e.g. 18:00:00 -> 06:00 م)
 */
export function formatTimeArabic(timeStr?: string): string {
  if (!timeStr) return "";
  const [hStr, mStr] = timeStr.split(":");
  let h = parseInt(hStr, 10);
  const m = mStr || "00";
  const period = h >= 12 ? "م" : "ص";
  if (h > 12) h -= 12;
  if (h === 0) h = 12;
  return `${String(h).padStart(2, "0")}:${m} ${period}`;
}

/**
 * Format Arabic date display
 */
export function formatDateArabic(dateStr?: string): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr + "T00:00:00");
    return new Intl.DateTimeFormat("ar-EG", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(d);
  } catch {
    return dateStr;
  }
}

/**
 * Generate viral WhatsApp squad roster message
 */
export function generateSquadWhatsAppMessage(post: MatchmakingPost): string {
  const venueName = post.court?.venue?.name || "الملعب";
  const courtName = post.court?.name || "";
  const day = formatDateArabic(post.match_date);
  const time = formatTimeArabic(post.start_time);
  const sportLabel = post.sport === "football" ? "ماتش كورة خماسي" : "ماتش بادل";

  const lines = [
    `تقسيمة باصيلي: ${sportLabel} ناقصة لعيبة!`,
    `الملعب: ${venueName} (${courtName})`,
    `الميعاد: ${day} — الساعة ${time}`,
    `المطلوب: ${post.players_needed} لاعبين (المركز: ${post.required_position})`,
    `مستوى اللعب: ${post.skill_level}`,
    `نصيب كل لاعب: ${post.cost_per_player} ج.م فقط كاش بالملعب`,
  ];

  if (post.notes) {
    lines.push(`ملاحظات: ${post.notes}`);
  }

  lines.push(`للتأكيد كلم الكابتن ${post.creator_name}: ${post.creator_phone}`);
  lines.push(`احجز مكانك في التقسيمة: https://passyli.com/matchmaking?post=${post.id}`);

  return lines.join("\n");
}
