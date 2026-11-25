"use client";

import { createClient } from "@/lib/supabase/client";
import { compressImageClient } from "@/lib/api/bookings";
import type { Database } from "@/lib/supabase/types";

export type UserProfile = Database["public"]["Tables"]["profiles"]["Row"];
export type UserRole = Database["public"]["Enums"]["user_role"];

export const PLAYER_POSITIONS = [
  "أي مركز",
  "حارس مرمى",
  "مدافع",
  "خط وسط / صانع ألعاب",
  "مهاجم",
  "لاعب بادل",
] as const;

/**
 * Validates an Egyptian mobile number (010, 011, 012, 015 - 11 digits)
 */
export function isValidEgyptianPhone(phone: string): boolean {
  const clean = phone.trim().replace(/\s+/g, "");
  return /^01[0125][0-9]{8}$/.test(clean);
}

/**
 * Sign in with Google OAuth (Gmail)
 */
export async function signInWithGoogle(redirectTo?: string) {
  const supabase = createClient();
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const safeNext =
    redirectTo && redirectTo.startsWith("/") && !redirectTo.startsWith("//")
      ? redirectTo
      : "/";
  const callbackUrl = `${origin}/auth/callback?next=${encodeURIComponent(safeNext)}`;

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: callbackUrl,
      queryParams: {
        access_type: "offline",
        prompt: "select_account",
      },
    },
  });

  if (error) {
    console.error("signInWithGoogle error:", error);
    return { success: false, error: "تعذر بدء تسجيل الدخول بحساب جوجل" };
  }

  return { success: true, url: data.url };
}

/**
 * Sign in with Email and Password
 */
export async function signInWithPassword(email: string, password: string) {
  const supabase = createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });

  if (error) {
    let friendlyMsg = "تعذر تسجيل الدخول، يرجى التحقق من البيانات";
    if (error.message.includes("Invalid login credentials")) {
      friendlyMsg = "البريد الإلكتروني أو كلمة المرور غير صحيحة";
    } else if (error.message.includes("Email not confirmed")) {
      friendlyMsg = "يرجى تأكيد بريدك الإلكتروني أولاً عبر الرسالة المرسلة إليك";
    }
    return { success: false, error: friendlyMsg };
  }

  return { success: true, user: data.user, session: data.session };
}

/**
 * Sign up with Email and Password (always registers as 'player' role)
 */
export async function signUpWithPassword(
  email: string,
  password: string,
  fullName: string,
  phone?: string,
  redirectTo?: string
) {
  const supabase = createClient();
  const cleanPhone = phone?.trim().replace(/\s+/g, "") || null;

  if (cleanPhone) {
    const { data: phoneTaken, error: phoneCheckError } = await supabase.rpc(
      "is_signup_phone_taken",
      { p_phone: cleanPhone }
    );
    if (!phoneCheckError && phoneTaken) {
      return {
        success: false,
        error:
          "رقم الموبايل مسجل بالفعل لحساب آخر؛ سجل الدخول بذلك الحساب أو استخدم رقماً مختلفاً (أو اتركه فارغاً).",
      };
    }
  }

  let emailRedirectUrl: string | undefined = undefined;
  if (typeof window !== "undefined") {
    const callbackUrl = new URL("/auth/callback", window.location.origin);
    if (redirectTo && redirectTo.startsWith("/")) {
      callbackUrl.searchParams.set("next", redirectTo);
    }
    emailRedirectUrl = callbackUrl.toString();
  }

  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: {
      emailRedirectTo: emailRedirectUrl,
      data: {
        full_name: fullName.trim(),
        phone: cleanPhone,
      },
    },
  });

  if (error) {
    let friendlyMsg = error.message;
    if (error.message.includes("already registered")) {
      friendlyMsg = "هذا البريد الإلكتروني مسجل بالفعل، يرجى تسجيل الدخول";
    } else if (error.message.includes("Password should be")) {
      friendlyMsg = "كلمة المرور ضعيفة، يجب أن تكون 6 أحرف على الأقل";
    } else if (error.message.includes("Database error saving new user")) {
      friendlyMsg =
        "تعذر حفظ بيانات الحساب، تأكد من عدم ارتباط رقم الموبايل بحساب آخر ثم أعد المحاولة.";
    }
    return { success: false, error: friendlyMsg };
  }

  const needsEmailConfirmation = Boolean(data.user && !data.session);
  return {
    success: true,
    user: data.user,
    session: data.session,
    needsEmailConfirmation,
  };
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(email: string) {
  const supabase = createClient();
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: `${origin}/auth/reset-password`,
  });

  if (error) {
    return { success: false, error: "تعذر إرسال رابط استعادة كلمة المرور، تأكد من البريد الإلكتروني" };
  }

  return { success: true };
}

/**
 * Update password for authenticated user (from reset link)
 */
export async function updateUserPassword(newPassword: string) {
  const supabase = createClient();
  const { error } = await supabase.auth.updateUser({ password: newPassword });

  if (error) {
    return { success: false, error: error.message || "تعذر تحديث كلمة المرور" };
  }

  return { success: true };
}

/**
 * Sign out current user
 */
export async function signOut() {
  const supabase = createClient();
  const { error } = await supabase.auth.signOut();
  if (error) {
    return { success: false, error: error.message };
  }
  return { success: true };
}

/**
 * Fetch profile for a user
 */
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data;
}

/**
 * Update editable player profile fields (name, phone, preferred_position, avatar)
 */
export async function updateUserProfile(
  userId: string,
  updates: {
    full_name?: string;
    phone?: string | null;
    preferred_position?: string;
    avatar_url?: string;
  }
) {
  const supabase = createClient();

  if (updates.phone && !isValidEgyptianPhone(updates.phone)) {
    return {
      success: false,
      error: "يرجى إدخال رقم موبايل مصري صحيح مكون من 11 رقم (مثل 010xxxxxxxx)",
    };
  }

  const payload: {
    full_name?: string;
    phone?: string | null;
    preferred_position?: string;
    avatar_url?: string;
    updated_at: string;
  } = {
    updated_at: new Date().toISOString(),
  };

  if (updates.full_name !== undefined) payload.full_name = updates.full_name.trim();
  if (updates.phone !== undefined) {
    payload.phone = updates.phone ? updates.phone.trim().replace(/\s+/g, "") : null;
  }
  if (updates.preferred_position !== undefined) {
    payload.preferred_position = updates.preferred_position;
  }
  if (updates.avatar_url !== undefined) payload.avatar_url = updates.avatar_url;

  const { data, error } = await supabase
    .from("profiles")
    .update(payload)
    .eq("id", userId)
    .select()
    .single();

  if (error) {
    let msg = error.message;
    if (error.code === "23505" || msg.includes("phone")) {
      msg = "رقم الهاتف هذا مرتبط بحساب آخر بالفعل";
    }
    return { success: false, error: msg };
  }

  return { success: true, profile: data };
}

/**
 * Compress and upload player avatar photo to Supabase Storage
 */
export async function uploadPlayerAvatar(
  userId: string,
  file: File
): Promise<{ success: boolean; avatarUrl?: string; error?: string }> {
  const supabase = createClient();

  try {
    const { blob } = await compressImageClient(file, 140 * 1024, 600);
    const filePath = `${userId}/avatar.jpg`;

    const { error: uploadError } = await supabase.storage
      .from("avatars-storage")
      .upload(filePath, blob, {
        contentType: "image/jpeg",
        upsert: true,
      });

    if (uploadError) {
      return { success: false, error: "تعذر رفع الصورة، يرجى المحاولة مرة أخرى" };
    }

    const { data: urlData } = supabase.storage
      .from("avatars-storage")
      .getPublicUrl(filePath);

    const cacheBustedUrl = `${urlData.publicUrl}?t=${Date.now()}`;
    const updateRes = await updateUserProfile(userId, { avatar_url: cacheBustedUrl });

    if (!updateRes.success) {
      return { success: false, error: updateRes.error };
    }

    return { success: true, avatarUrl: cacheBustedUrl };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "حدث خطأ أثناء معالجة الصورة";
    return { success: false, error: msg };
  }
}

/**
 * Fetch current user's favorite venue IDs
 */
export async function getFavoriteVenueIds(userId: string): Promise<string[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("favorite_venues")
    .select("venue_id")
    .eq("user_id", userId);

  if (error || !data) return [];
  return data.map((row) => row.venue_id);
}

/**
 * Toggle favorite status for a venue
 */
export async function toggleFavoriteVenueRecord(
  userId: string,
  venueId: string,
  currentlyFavorited: boolean
): Promise<{ success: boolean; isFavorited: boolean }> {
  const supabase = createClient();

  if (currentlyFavorited) {
    const { error } = await supabase
      .from("favorite_venues")
      .delete()
      .eq("user_id", userId)
      .eq("venue_id", venueId);

    return { success: !error, isFavorited: error ? true : false };
  }

  const { error } = await supabase
    .from("favorite_venues")
    .insert({ user_id: userId, venue_id: venueId });

  return { success: !error, isFavorited: error ? false : true };
}
