export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      bookings: {
        Row: {
          booker_id: string | null
          booker_name: string
          booker_phone: string
          booking_date: string
          booking_reference: string
          cancellation_reason: string | null
          cash_remaining: number
          court_id: string
          created_at: string
          deposit_paid: number
          deposit_required: number
          end_time: string
          id: string
          is_walkin: boolean
          locked_by_session: string | null
          locked_until: string | null
          start_time: string
          status: Database["public"]["Enums"]["booking_status"]
          total_price: number
          updated_at: string
        }
        Insert: {
          booker_id?: string | null
          booker_name: string
          booker_phone: string
          booking_date: string
          booking_reference: string
          cancellation_reason?: string | null
          cash_remaining: number
          court_id: string
          created_at?: string
          deposit_paid?: number
          deposit_required?: number
          end_time: string
          id?: string
          is_walkin?: boolean
          locked_by_session?: string | null
          locked_until?: string | null
          start_time: string
          status?: Database["public"]["Enums"]["booking_status"]
          total_price: number
          updated_at?: string
        }
        Update: {
          booker_id?: string | null
          booker_name?: string
          booker_phone?: string
          booking_date?: string
          booking_reference?: string
          cancellation_reason?: string | null
          cash_remaining?: number
          court_id?: string
          created_at?: string
          deposit_paid?: number
          deposit_required?: number
          end_time?: string
          id?: string
          is_walkin?: boolean
          locked_by_session?: string | null
          locked_until?: string | null
          start_time?: string
          status?: Database["public"]["Enums"]["booking_status"]
          total_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_booker_id_fkey"
            columns: ["booker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_court_id_fkey"
            columns: ["court_id"]
            isOneToOne: false
            referencedRelation: "courts"
            referencedColumns: ["id"]
          },
        ]
      }
      courts: {
        Row: {
          buffer_minutes: number
          created_at: string
          id: string
          is_active: boolean
          name: string
          peak_hour_start: string
          price_evening: number
          price_morning: number
          slot_duration_minutes: number
          sport: Database["public"]["Enums"]["sport_type"]
          surface: Database["public"]["Enums"]["surface_type"]
          updated_at: string
          venue_id: string
        }
        Insert: {
          buffer_minutes?: number
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          peak_hour_start?: string
          price_evening: number
          price_morning: number
          slot_duration_minutes?: number
          sport: Database["public"]["Enums"]["sport_type"]
          surface: Database["public"]["Enums"]["surface_type"]
          updated_at?: string
          venue_id: string
        }
        Update: {
          buffer_minutes?: number
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          peak_hour_start?: string
          price_evening?: number
          price_morning?: number
          slot_duration_minutes?: number
          sport?: Database["public"]["Enums"]["sport_type"]
          surface?: Database["public"]["Enums"]["surface_type"]
          updated_at?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "courts_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      matchmaking_posts: {
        Row: {
          booking_id: string | null
          cost_per_player: number
          court_id: string
          created_at: string
          creator_id: string | null
          creator_name: string
          creator_phone: string
          whatsapp_number: string | null
          current_players: number
          id: string
          match_date: string
          notes: string | null
          players_needed: number
          required_position: string
          skill_level: string
          sport: Database["public"]["Enums"]["sport_type"]
          start_time: string
          status: Database["public"]["Enums"]["matchmaking_status"]
          updated_at: string
        }
        Insert: {
          booking_id?: string | null
          cost_per_player: number
          court_id: string
          created_at?: string
          creator_id?: string | null
          creator_name?: string
          creator_phone?: string
          whatsapp_number?: string | null
          current_players?: number
          id?: string
          match_date: string
          notes?: string | null
          players_needed: number
          required_position?: string
          skill_level?: string
          sport: Database["public"]["Enums"]["sport_type"]
          start_time: string
          status?: Database["public"]["Enums"]["matchmaking_status"]
          updated_at?: string
        }
        Update: {
          booking_id?: string | null
          cost_per_player?: number
          court_id?: string
          created_at?: string
          creator_id?: string | null
          creator_name?: string
          creator_phone?: string
          whatsapp_number?: string | null
          current_players?: number
          id?: string
          match_date?: string
          notes?: string | null
          players_needed?: number
          required_position?: string
          skill_level?: string
          sport?: Database["public"]["Enums"]["sport_type"]
          start_time?: string
          status?: Database["public"]["Enums"]["matchmaking_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "matchmaking_posts_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matchmaking_posts_court_id_fkey"
            columns: ["court_id"]
            isOneToOne: false
            referencedRelation: "courts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matchmaking_posts_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_applications: {
        Row: {
          id: string
          applicant_user_id: string | null
          applicant_email: string | null
          venue_name: string
          applicant_name: string
          phone: string
          whatsapp_number: string
          city: string
          district: string
          address: string
          sports: string[]
          courts_count: number
          base_price_morning: number
          base_price_evening: number
          status: string
          welcome_credit: number
          admin_notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          applicant_user_id?: string | null
          applicant_email?: string | null
          venue_name: string
          applicant_name: string
          phone: string
          whatsapp_number: string
          city?: string
          district: string
          address: string
          sports?: string[]
          courts_count?: number
          base_price_morning?: number
          base_price_evening?: number
          status?: string
          welcome_credit?: number
          admin_notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          applicant_user_id?: string | null
          applicant_email?: string | null
          venue_name?: string
          applicant_name?: string
          phone?: string
          whatsapp_number?: string
          city?: string
          district?: string
          address?: string
          sports?: string[]
          courts_count?: number
          base_price_morning?: number
          base_price_evening?: number
          status?: string
          welcome_credit?: number
          admin_notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          phone: string | null
          preferred_position: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name: string
          id: string
          phone?: string | null
          preferred_position?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          phone?: string | null
          preferred_position?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: []
      }
      favorite_venues: {
        Row: {
          created_at: string
          id: string
          user_id: string
          venue_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          user_id: string
          venue_id: string
        }
        Update: {
          created_at?: string
          id?: string
          user_id?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorite_venues_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorite_venues_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      receipts: {
        Row: {
          amount_paid: number
          booking_id: string
          created_at: string
          id: string
          image_url: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          reference_number: string
          rejection_reason: string | null
          sender_name: string
          sender_phone: string
          status: Database["public"]["Enums"]["payment_status"]
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          amount_paid: number
          booking_id: string
          created_at?: string
          id?: string
          image_url: string
          payment_method?: Database["public"]["Enums"]["payment_method"]
          reference_number: string
          rejection_reason?: string | null
          sender_name: string
          sender_phone: string
          status?: Database["public"]["Enums"]["payment_status"]
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          amount_paid?: number
          booking_id?: string
          created_at?: string
          id?: string
          image_url?: string
          payment_method?: Database["public"]["Enums"]["payment_method"]
          reference_number?: string
          rejection_reason?: string | null
          sender_name?: string
          sender_phone?: string
          status?: Database["public"]["Enums"]["payment_status"]
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "receipts_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipts_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      venues: {
        Row: {
          address: string
          amenities: string[]
          backup_wallet_number: string | null
          city: string
          closing_time: string
          commission_per_slot: number
          created_at: string
          deposit_amount: number
          district: string
          id: string
          images: string[]
          instapay_address: string | null
          is_active: boolean
          is_verified: boolean
          latitude: number
          longitude: number
          name: string
          opening_time: string
          owner_id: string | null
          phone: string
          prepaid_balance: number
          slug: string
          staff_pin: string
          updated_at: string
          vodafone_cash_number: string | null
          whatsapp_number: string
        }
        Insert: {
          address: string
          amenities?: string[]
          backup_wallet_number?: string | null
          city?: string
          closing_time?: string
          created_at?: string
          deposit_amount?: number
          district: string
          id?: string
          images?: string[]
          instapay_address?: string | null
          is_active?: boolean
          is_verified?: boolean
          latitude: number
          longitude: number
          name: string
          opening_time?: string
          owner_id?: string | null
          phone: string
          slug: string
          updated_at?: string
          vodafone_cash_number?: string | null
          whatsapp_number: string
        }
        Update: {
          address?: string
          amenities?: string[]
          backup_wallet_number?: string | null
          city?: string
          closing_time?: string
          created_at?: string
          deposit_amount?: number
          district?: string
          id?: string
          images?: string[]
          instapay_address?: string | null
          is_active?: boolean
          is_verified?: boolean
          latitude?: number
          longitude?: number
          name?: string
          opening_time?: string
          owner_id?: string | null
          phone?: string
          slug?: string
          updated_at?: string
          vodafone_cash_number?: string | null
          whatsapp_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "venues_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_distance_km: {
        Args: { lat1: number; lat2: number; lon1: number; lon2: number }
        Returns: number
      }
      cancel_booking_lock: {
        Args: { p_booking_id: string; p_session_id?: string }
        Returns: Json
      }
      lock_court_slot: {
        Args: {
          p_booker_name: string
          p_booker_phone: string
          p_booking_date: string
          p_cash_remaining: number
          p_court_id: string
          p_deposit_required: number
          p_end_time: string
          p_session_id: string
          p_start_time: string
          p_total_price: number
        }
        Returns: Json
      }
      release_expired_booking_locks: { Args: never; Returns: number }
      submit_booking_receipt: {
        Args: {
          p_amount_paid: number
          p_booking_id: string
          p_image_url: string
          p_payment_method: Database["public"]["Enums"]["payment_method"]
          p_reference_number: string
          p_sender_name: string
          p_sender_phone: string
        }
        Returns: Json
      }
      create_walkin_booking: {
        Args: {
          p_court_id: string
          p_booking_date: string
          p_start_time: string
          p_end_time: string
          p_booker_name: string
          p_booker_phone: string
          p_total_price: number
          p_amount_paid?: number
        }
        Returns: Json
      }
      review_booking_receipt: {
        Args: {
          p_receipt_id: string
          p_action: string
          p_adjusted_amount?: number | null
          p_rejection_reason?: string | null
        }
        Returns: Json
      }
      complete_booking_attendance: {
        Args: {
          p_booking_id: string
        }
        Returns: Json
      }
      toggle_court_maintenance: {
        Args: {
          p_court_id: string
          p_is_active: boolean
        }
        Returns: Json
      }
      cancel_venue_booking: {
        Args: {
          p_booking_id: string
          p_cancellation_reason?: string | null
        }
        Returns: Json
      }
      update_venue_wallets: {
        Args: {
          p_venue_id: string
          p_instapay_address?: string | null
          p_vodafone_cash_number?: string | null
          p_backup_wallet_number?: string | null
          p_deposit_amount?: number | null
        }
        Returns: Json
      }
      create_matchmaking_post: {
        Args: {
          p_court_id: string
          p_sport: Database["public"]["Enums"]["sport_type"]
          p_match_date: string
          p_start_time: string
          p_players_needed: number
          p_cost_per_player: number
          p_creator_name: string
          p_creator_phone: string
          p_whatsapp_number?: string | null
          p_required_position?: string
          p_skill_level?: string
          p_notes?: string | null
          p_booking_id?: string | null
        }
        Returns: Json
      }
      update_matchmaking_status: {
        Args: {
          p_post_id: string
          p_status: Database["public"]["Enums"]["matchmaking_status"]
        }
        Returns: Json
      }
      get_player_bookings: {
        Args: {
          p_phone?: string | null
          p_user_id?: string | null
        }
        Returns: Json
      }
      get_player_matchmaking_posts: {
        Args: Record<string, never>
        Returns: Json
      }
      admin_get_dashboard_overview: {
        Args: Record<string, never>
        Returns: Json
      }
      admin_approve_partner_application: {
        Args: {
          p_app_id: string
          p_welcome_credit?: number
          p_commission_per_slot?: number
          p_owner_email?: string | null
        }
        Returns: Json
      }
      admin_reject_partner_application: {
        Args: {
          p_app_id: string
          p_admin_notes?: string | null
        }
        Returns: Json
      }
      admin_update_venue_settings: {
        Args: {
          p_venue_id: string
          p_is_active?: boolean | null
          p_is_verified?: boolean | null
          p_commission_per_slot?: number | null
          p_owner_id?: string | null
        }
        Returns: Json
      }
      admin_adjust_venue_balance: {
        Args: {
          p_venue_id: string
          p_delta: number
          p_reason: string
        }
        Returns: Json
      }
      admin_review_recharge_request: {
        Args: {
          p_request_id: string
          p_action: string
          p_admin_notes?: string | null
        }
        Returns: Json
      }
      admin_update_user_role: {
        Args: {
          p_user_id: string
          p_role: Database["public"]["Enums"]["user_role"]
        }
        Returns: Json
      }
      admin_manage_blacklist: {
        Args: {
          p_action: string
          p_phone: string
          p_reason?: string | null
        }
        Returns: Json
      }
      admin_get_bookings_feed: {
        Args: {
          p_search?: string | null
          p_status?: string | null
          p_limit?: number
        }
        Returns: Json
      }
      admin_resolve_booking_dispute: {
        Args: {
          p_booking_id: string
          p_action: string
          p_reason?: string | null
        }
        Returns: Json
      }
      owner_get_venue_wallet_details: {
        Args: {
          p_venue_id: string
        }
        Returns: Json
      }
      owner_set_staff_pin: {
        Args: {
          p_venue_id: string
          p_pin?: string | null
        }
        Returns: Json
      }
      staff_list_active_venues: {
        Args: Record<string, never>
        Returns: Json
      }
      staff_verify_pin: {
        Args: {
          p_venue_id: string
          p_pin: string
        }
        Returns: Json
      }
      staff_get_schedule: {
        Args: {
          p_venue_id: string
          p_secret: string
          p_date: string
        }
        Returns: Json
      }
      staff_create_walkin: {
        Args: {
          p_venue_id: string
          p_secret: string
          p_court_id: string
          p_booking_date: string
          p_start_time: string
          p_end_time: string
          p_booker_name: string
          p_booker_phone: string
          p_amount_paid?: number
        }
        Returns: Json
      }
      staff_complete_attendance: {
        Args: {
          p_venue_id: string
          p_secret: string
          p_booking_id: string
        }
        Returns: Json
      }
      staff_cancel_booking: {
        Args: {
          p_venue_id: string
          p_secret: string
          p_booking_id: string
          p_reason?: string | null
        }
        Returns: Json
      }
      submit_venue_recharge: {
        Args: {
          p_venue_id: string
          p_amount: number
          p_receipt_url: string
          p_ref_number?: string | null
        }
        Returns: Json
      }
      is_signup_phone_taken: {
        Args: {
          p_phone: string
        }
        Returns: boolean
      }
      submit_partner_application: {
        Args: {
          p_venue_name: string
          p_applicant_name: string
          p_phone: string
          p_whatsapp_number: string
          p_city: string
          p_district: string
          p_address: string
          p_sports: string[]
          p_courts_count: number
          p_base_price_morning: number
          p_base_price_evening: number
        }
        Returns: Json
      }
      owner_update_court_settings: {
        Args: {
          p_court_id: string
          p_name: string
          p_price_morning: number
          p_price_evening: number
          p_peak_hour_start: string
          p_slot_duration_minutes: number
          p_is_active: boolean
        }
        Returns: Json
      }
      owner_add_court: {
        Args: {
          p_venue_id: string
          p_name: string
          p_sport: Database["public"]["Enums"]["sport_type"]
          p_surface: Database["public"]["Enums"]["surface_type"]
          p_price_morning: number
          p_price_evening: number
          p_peak_hour_start?: string
          p_slot_duration_minutes?: number
        }
        Returns: Json
      }
      owner_create_recurring_walkin: {
        Args: {
          p_court_id: string
          p_start_date: string
          p_weeks_count: number
          p_start_time: string
          p_end_time: string
          p_booker_name: string
          p_booker_phone: string
          p_total_price: number
          p_amount_paid_per_slot?: number
        }
        Returns: Json
      }
    }
    Enums: {
      booking_status:
        | "pending_payment"
        | "confirmed"
        | "completed"
        | "cancelled"
        | "expired"
      matchmaking_status: "open" | "filled" | "cancelled"
      payment_method: "instapay" | "vodafone_cash" | "orange_cash" | "cash"
      payment_status:
        | "pending"
        | "submitted"
        | "verified"
        | "rejected"
        | "paid_cash_on_pitch"
      sport_type: "football" | "padel"
      surface_type:
        | "turf_3g"
        | "panoramic_glass"
        | "covered_padel"
        | "natural_grass"
      user_role: "player" | "venue_owner" | "receptionist" | "super_admin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      booking_status: [
        "pending_payment",
        "confirmed",
        "completed",
        "cancelled",
        "expired",
      ],
      matchmaking_status: ["open", "filled", "cancelled"],
      payment_method: ["instapay", "vodafone_cash", "orange_cash", "cash"],
      payment_status: [
        "pending",
        "submitted",
        "verified",
        "rejected",
        "paid_cash_on_pitch",
      ],
      sport_type: ["football", "padel"],
      surface_type: [
        "turf_3g",
        "panoramic_glass",
        "covered_padel",
        "natural_grass",
      ],
      user_role: ["player", "venue_owner", "receptionist", "super_admin"],
    },
  },
} as const

export type SportType = Database["public"]["Enums"]["sport_type"];
export type SurfaceType = Database["public"]["Enums"]["surface_type"];
export type BookingStatus = Database["public"]["Enums"]["booking_status"];
export type PaymentMethod = Database["public"]["Enums"]["payment_method"];
export type PaymentStatus = Database["public"]["Enums"]["payment_status"];
export type UserRole = Database["public"]["Enums"]["user_role"];
export type MatchmakingStatus = Database["public"]["Enums"]["matchmaking_status"];

export type Venue = Database["public"]["Tables"]["venues"]["Row"];
export type Court = Database["public"]["Tables"]["courts"]["Row"];
export type Booking = Database["public"]["Tables"]["bookings"]["Row"];
export type Receipt = Database["public"]["Tables"]["receipts"]["Row"];
