export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = "player" | "venue_owner" | "receptionist" | "super_admin";
export type SportType = "football" | "padel";
export type SurfaceType = "turf_3g" | "panoramic_glass" | "covered_padel" | "natural_grass";
export type BookingStatus = "pending_payment" | "confirmed" | "completed" | "cancelled" | "expired";
export type PaymentMethod = "instapay" | "vodafone_cash" | "orange_cash" | "cash";
export type PaymentStatus = "pending" | "submitted" | "verified" | "rejected" | "paid_cash_on_pitch";
export type MatchmakingStatus = "open" | "filled" | "cancelled";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          phone: string;
          full_name: string;
          role: UserRole;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          phone: string;
          full_name: string;
          role?: UserRole;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          phone?: string;
          full_name?: string;
          role?: UserRole;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      venues: {
        Row: {
          id: string;
          owner_id: string | null;
          name: string;
          slug: string;
          city: string;
          district: string;
          address: string;
          latitude: number;
          longitude: number;
          phone: string;
          whatsapp_number: string;
          instapay_address: string | null;
          vodafone_cash_number: string | null;
          backup_wallet_number: string | null;
          deposit_amount: number;
          images: string[];
          amenities: string[];
          opening_time: string;
          closing_time: string;
          is_active: boolean;
          is_verified: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id?: string | null;
          name: string;
          slug: string;
          city?: string;
          district: string;
          address: string;
          latitude: number;
          longitude: number;
          phone: string;
          whatsapp_number: string;
          instapay_address?: string | null;
          vodafone_cash_number?: string | null;
          backup_wallet_number?: string | null;
          deposit_amount?: number;
          images?: string[];
          amenities?: string[];
          opening_time?: string;
          closing_time?: string;
          is_active?: boolean;
          is_verified?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string | null;
          name?: string;
          slug?: string;
          city?: string;
          district?: string;
          address?: string;
          latitude?: number;
          longitude?: number;
          phone?: string;
          whatsapp_number?: string;
          instapay_address?: string | null;
          vodafone_cash_number?: string | null;
          backup_wallet_number?: string | null;
          deposit_amount?: number;
          images?: string[];
          amenities?: string[];
          opening_time?: string;
          closing_time?: string;
          is_active?: boolean;
          is_verified?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      courts: {
        Row: {
          id: string;
          venue_id: string;
          name: string;
          sport: SportType;
          surface: SurfaceType;
          slot_duration_minutes: number;
          price_morning: number;
          price_evening: number;
          peak_hour_start: string;
          buffer_minutes: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          venue_id: string;
          name: string;
          sport: SportType;
          surface: SurfaceType;
          slot_duration_minutes?: number;
          price_morning: number;
          price_evening: number;
          peak_hour_start?: string;
          buffer_minutes?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          venue_id?: string;
          name?: string;
          sport?: SportType;
          surface?: SurfaceType;
          slot_duration_minutes?: number;
          price_morning?: number;
          price_evening?: number;
          peak_hour_start?: string;
          buffer_minutes?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      bookings: {
        Row: {
          id: string;
          booking_reference: string;
          court_id: string;
          booker_id: string | null;
          booker_name: string;
          booker_phone: string;
          booking_date: string;
          start_time: string;
          end_time: string;
          total_price: number;
          deposit_required: number;
          deposit_paid: number;
          cash_remaining: number;
          status: BookingStatus;
          locked_until: string | null;
          locked_by_session: string | null;
          is_walkin: boolean;
          cancellation_reason: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          booking_reference: string;
          court_id: string;
          booker_id?: string | null;
          booker_name: string;
          booker_phone: string;
          booking_date: string;
          start_time: string;
          end_time: string;
          total_price: number;
          deposit_required?: number;
          deposit_paid?: number;
          cash_remaining: number;
          status?: BookingStatus;
          locked_until?: string | null;
          locked_by_session?: string | null;
          is_walkin?: boolean;
          cancellation_reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          booking_reference?: string;
          court_id?: string;
          booker_id?: string | null;
          booker_name?: string;
          booker_phone?: string;
          booking_date?: string;
          start_time?: string;
          end_time?: string;
          total_price?: number;
          deposit_required?: number;
          deposit_paid?: number;
          cash_remaining?: number;
          status?: BookingStatus;
          locked_until?: string | null;
          locked_by_session?: string | null;
          is_walkin?: boolean;
          cancellation_reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      receipts: {
        Row: {
          id: string;
          booking_id: string;
          sender_name: string;
          sender_phone: string;
          payment_method: PaymentMethod;
          reference_number: string;
          amount_paid: number;
          image_url: string;
          status: PaymentStatus;
          rejection_reason: string | null;
          verified_by: string | null;
          verified_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          booking_id: string;
          sender_name: string;
          sender_phone: string;
          payment_method?: PaymentMethod;
          reference_number: string;
          amount_paid: number;
          image_url: string;
          status?: PaymentStatus;
          rejection_reason?: string | null;
          verified_by?: string | null;
          verified_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          booking_id?: string;
          sender_name?: string;
          sender_phone?: string;
          payment_method?: PaymentMethod;
          reference_number?: string;
          amount_paid?: number;
          image_url?: string;
          status?: PaymentStatus;
          rejection_reason?: string | null;
          verified_by?: string | null;
          verified_at?: string | null;
          created_at?: string;
        };
      };
      matchmaking_posts: {
        Row: {
          id: string;
          booking_id: string | null;
          creator_id: string;
          court_id: string;
          sport: SportType;
          match_date: string;
          start_time: string;
          players_needed: number;
          current_players: number;
          cost_per_player: number;
          required_position: string;
          skill_level: string;
          notes: string | null;
          status: MatchmakingStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          booking_id?: string | null;
          creator_id: string;
          court_id: string;
          sport: SportType;
          match_date: string;
          start_time: string;
          players_needed: number;
          current_players?: number;
          cost_per_player: number;
          required_position?: string;
          skill_level?: string;
          notes?: string | null;
          status?: MatchmakingStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          booking_id?: string | null;
          creator_id?: string;
          court_id?: string;
          sport?: SportType;
          match_date?: string;
          start_time?: string;
          players_needed?: number;
          current_players?: number;
          cost_per_player?: number;
          required_position?: string;
          skill_level?: string;
          notes?: string | null;
          status?: MatchmakingStatus;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
}
