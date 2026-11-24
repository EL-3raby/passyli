"use client";

import { createClient } from "@/lib/supabase/client";
import type { UserRole } from "@/lib/supabase/types";

export interface AdminStats {
  total_venues: number;
  active_venues: number;
  pending_applications: number;
  pending_recharges: number;
  total_bookings: number;
  today_bookings: number;
  confirmed_revenue: number;
  total_commission_earned: number;
  total_wallet_balances: number;
  total_players: number;
  blacklist_count: number;
}

export interface AdminPartnerApplication {
  id: string;
  venue_name: string;
  applicant_name: string;
  phone: string;
  whatsapp_number: string;
  city: string;
  district: string;
  address: string;
  sports: string[];
  courts_count: number;
  base_price_morning: number;
  base_price_evening: number;
  status: "pending" | "approved" | "rejected";
  welcome_credit: number;
  admin_notes: string | null;
  created_at: string;
}

export interface AdminVenueItem {
  id: string;
  name: string;
  slug: string;
  city: string;
  district: string;
  address: string;
  phone: string;
  whatsapp_number: string;
  deposit_amount: number;
  prepaid_balance: number;
  commission_per_slot: number;
  is_active: boolean;
  is_verified: boolean;
  owner_id: string | null;
  owner_name: string | null;
  owner_email: string | null;
  owner_phone: string | null;
  courts_count: number;
  bookings_count: number;
  created_at: string;
}

export interface AdminRechargeRequest {
  id: string;
  venue_id: string;
  venue_name: string;
  current_balance: number;
  amount: number;
  receipt_url: string;
  reference_number: string | null;
  status: "pending" | "approved" | "rejected";
  admin_notes: string | null;
  created_at: string;
}

export interface AdminWalletTransaction {
  id: string;
  venue_id: string;
  venue_name: string;
  amount: number;
  balance_after: number;
  type: "welcome_bonus" | "recharge" | "commission_deduction" | "admin_adjustment";
  description: string;
  created_at: string;
}

export interface AdminUserItem {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  role: UserRole;
  preferred_position: string;
  avatar_url: string | null;
  bookings_count: number;
  created_at: string;
}

export interface AdminBlacklistItem {
  phone: string;
  reason: string;
  created_at: string;
}

export interface AdminOverviewPayload {
  success: boolean;
  error?: string;
  stats: AdminStats;
  applications: AdminPartnerApplication[];
  venues: AdminVenueItem[];
  recharge_requests: AdminRechargeRequest[];
  wallet_transactions: AdminWalletTransaction[];
  users: AdminUserItem[];
  blacklist: AdminBlacklistItem[];
}

export async function getAdminOverview(): Promise<AdminOverviewPayload> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("admin_get_dashboard_overview");

  if (error) {
    throw new Error(error.message || "تعذر تحميل بيانات لوحة المشرف");
  }

  const res = data as unknown as AdminOverviewPayload;
  if (!res?.success) {
    throw new Error(res?.error || "غير مصرح لك بالوصول لهذه البيانات");
  }

  return res;
}

export async function approvePartnerApp(params: {
  appId: string;
  welcomeCredit: number;
  commissionPerSlot: number;
  ownerEmail?: string;
}): Promise<{ success: boolean; venue_id?: string; error?: string }> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("admin_approve_partner_application", {
    p_app_id: params.appId,
    p_welcome_credit: params.welcomeCredit,
    p_commission_per_slot: params.commissionPerSlot,
    p_owner_email: params.ownerEmail?.trim() || null,
  });

  if (error) return { success: false, error: error.message };
  return data as { success: boolean; venue_id?: string; error?: string };
}

export async function rejectPartnerApp(
  appId: string,
  adminNotes?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("admin_reject_partner_application", {
    p_app_id: appId,
    p_admin_notes: adminNotes || null,
  });

  if (error) return { success: false, error: error.message };
  return data as { success: boolean; error?: string };
}

export async function updateVenueAdminSettings(params: {
  venueId: string;
  isActive?: boolean;
  isVerified?: boolean;
  commissionPerSlot?: number;
  ownerId?: string;
}): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("admin_update_venue_settings", {
    p_venue_id: params.venueId,
    p_is_active: params.isActive ?? null,
    p_is_verified: params.isVerified ?? null,
    p_commission_per_slot: params.commissionPerSlot ?? null,
    p_owner_id: params.ownerId ?? null,
  });

  if (error) return { success: false, error: error.message };
  return data as { success: boolean; error?: string };
}

export async function adjustVenueBalance(params: {
  venueId: string;
  delta: number;
  reason: string;
}): Promise<{ success: boolean; new_balance?: number; error?: string }> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("admin_adjust_venue_balance", {
    p_venue_id: params.venueId,
    p_delta: params.delta,
    p_reason: params.reason,
  });

  if (error) return { success: false, error: error.message };
  return data as { success: boolean; new_balance?: number; error?: string };
}

export async function reviewRechargeRequest(params: {
  requestId: string;
  action: "approve" | "reject";
  adminNotes?: string;
}): Promise<{ success: boolean; new_balance?: number; error?: string }> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("admin_review_recharge_request", {
    p_request_id: params.requestId,
    p_action: params.action,
    p_admin_notes: params.adminNotes || null,
  });

  if (error) return { success: false, error: error.message };
  return data as { success: boolean; new_balance?: number; error?: string };
}

export async function updateUserRoleAdmin(
  userId: string,
  role: UserRole
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("admin_update_user_role", {
    p_user_id: userId,
    p_role: role,
  });

  if (error) return { success: false, error: error.message };
  return data as { success: boolean; error?: string };
}

export async function manageBlacklist(params: {
  action: "add" | "remove";
  phone: string;
  reason?: string;
}): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("admin_manage_blacklist", {
    p_action: params.action,
    p_phone: params.phone,
    p_reason: params.reason || null,
  });

  if (error) return { success: false, error: error.message };
  return data as { success: boolean; error?: string };
}
