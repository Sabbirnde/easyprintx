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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      bookings: {
        Row: {
          created_at: string
          customer_email: string | null
          customer_id: string | null
          customer_name: string | null
          id: string
          notes: string | null
          print_job_id: string | null
          shop_owner_id: string
          slot_date: string
          slot_time: string
          status: string | null
          time_slot_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_email?: string | null
          customer_id?: string | null
          customer_name?: string | null
          id?: string
          notes?: string | null
          print_job_id?: string | null
          shop_owner_id: string
          slot_date: string
          slot_time: string
          status?: string | null
          time_slot_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_email?: string | null
          customer_id?: string | null
          customer_name?: string | null
          id?: string
          notes?: string | null
          print_job_id?: string | null
          shop_owner_id?: string
          slot_date?: string
          slot_time?: string
          status?: string | null
          time_slot_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_print_job_id_fkey"
            columns: ["print_job_id"]
            isOneToOne: false
            referencedRelation: "print_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_time_slot_id_fkey"
            columns: ["time_slot_id"]
            isOneToOne: false
            referencedRelation: "time_slots"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment: {
        Row: {
          brand: string | null
          capabilities: Json | null
          created_at: string
          equipment_name: string
          equipment_type: string
          id: string
          last_maintenance: string | null
          model: string | null
          next_maintenance: string | null
          shop_owner_id: string
          status: string | null
          updated_at: string
        }
        Insert: {
          brand?: string | null
          capabilities?: Json | null
          created_at?: string
          equipment_name: string
          equipment_type: string
          id?: string
          last_maintenance?: string | null
          model?: string | null
          next_maintenance?: string | null
          shop_owner_id: string
          status?: string | null
          updated_at?: string
        }
        Update: {
          brand?: string | null
          capabilities?: Json | null
          created_at?: string
          equipment_name?: string
          equipment_type?: string
          id?: string
          last_maintenance?: string | null
          model?: string | null
          next_maintenance?: string | null
          shop_owner_id?: string
          status?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      notification_settings: {
        Row: {
          created_at: string
          daily_summary_notifications: boolean | null
          email_notifications: boolean | null
          equipment_maintenance_notifications: boolean | null
          id: string
          low_supplies_notifications: boolean | null
          new_order_notifications: boolean | null
          order_completion_notifications: boolean | null
          shop_owner_id: string
          sms_notifications: boolean | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          daily_summary_notifications?: boolean | null
          email_notifications?: boolean | null
          equipment_maintenance_notifications?: boolean | null
          id?: string
          low_supplies_notifications?: boolean | null
          new_order_notifications?: boolean | null
          order_completion_notifications?: boolean | null
          shop_owner_id: string
          sms_notifications?: boolean | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          daily_summary_notifications?: boolean | null
          email_notifications?: boolean | null
          equipment_maintenance_notifications?: boolean | null
          id?: string
          low_supplies_notifications?: boolean | null
          new_order_notifications?: boolean | null
          order_completion_notifications?: boolean | null
          shop_owner_id?: string
          sms_notifications?: boolean | null
          updated_at?: string
        }
        Relationships: []
      }
      operating_hours: {
        Row: {
          close_time: string
          created_at: string
          day_of_week: Database["public"]["Enums"]["day_of_week"]
          id: string
          is_open: boolean | null
          open_time: string
          shop_owner_id: string
          updated_at: string
        }
        Insert: {
          close_time?: string
          created_at?: string
          day_of_week: Database["public"]["Enums"]["day_of_week"]
          id?: string
          is_open?: boolean | null
          open_time?: string
          shop_owner_id: string
          updated_at?: string
        }
        Update: {
          close_time?: string
          created_at?: string
          day_of_week?: Database["public"]["Enums"]["day_of_week"]
          id?: string
          is_open?: boolean | null
          open_time?: string
          shop_owner_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      pricing_rules: {
        Row: {
          bulk_discount_percentage: number | null
          bulk_discount_threshold: number | null
          color_multiplier: number | null
          created_at: string
          id: string
          minimum_charge: number | null
          price_per_page: number | null
          service_type: string
          shop_owner_id: string
          updated_at: string
        }
        Insert: {
          bulk_discount_percentage?: number | null
          bulk_discount_threshold?: number | null
          color_multiplier?: number | null
          created_at?: string
          id?: string
          minimum_charge?: number | null
          price_per_page?: number | null
          service_type: string
          shop_owner_id: string
          updated_at?: string
        }
        Update: {
          bulk_discount_percentage?: number | null
          bulk_discount_threshold?: number | null
          color_multiplier?: number | null
          created_at?: string
          id?: string
          minimum_charge?: number | null
          price_per_page?: number | null
          service_type?: string
          shop_owner_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      print_jobs: {
        Row: {
          actual_duration: number | null
          cancelled_at: string | null
          color_pages: number | null
          completed_at: string | null
          copies: number | null
          created_at: string
          customer_email: string | null
          customer_id: string | null
          customer_name: string | null
          estimated_duration: number | null
          file_name: string
          file_size: number | null
          file_url: string | null
          id: string
          notes: string | null
          pages: number | null
          print_settings: Json | null
          priority: number | null
          shop_owner_id: string
          started_at: string | null
          status: Database["public"]["Enums"]["print_job_status"]
          submitted_at: string
          total_cost: number | null
          updated_at: string
        }
        Insert: {
          actual_duration?: number | null
          cancelled_at?: string | null
          color_pages?: number | null
          completed_at?: string | null
          copies?: number | null
          created_at?: string
          customer_email?: string | null
          customer_id?: string | null
          customer_name?: string | null
          estimated_duration?: number | null
          file_name: string
          file_size?: number | null
          file_url?: string | null
          id?: string
          notes?: string | null
          pages?: number | null
          print_settings?: Json | null
          priority?: number | null
          shop_owner_id: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["print_job_status"]
          submitted_at?: string
          total_cost?: number | null
          updated_at?: string
        }
        Update: {
          actual_duration?: number | null
          cancelled_at?: string | null
          color_pages?: number | null
          completed_at?: string | null
          copies?: number | null
          created_at?: string
          customer_email?: string | null
          customer_id?: string | null
          customer_name?: string | null
          estimated_duration?: number | null
          file_name?: string
          file_size?: number | null
          file_url?: string | null
          id?: string
          notes?: string | null
          pages?: number | null
          print_settings?: Json | null
          priority?: number | null
          shop_owner_id?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["print_job_status"]
          submitted_at?: string
          total_cost?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      public_shop_directory: {
        Row: {
          address: string | null
          business_hours: Json | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          logo_url: string | null
          rating: number | null
          services_offered: string[] | null
          shop_name: string
          shop_owner_id: string
          total_reviews: number | null
          updated_at: string
          website_url: string | null
        }
        Insert: {
          address?: string | null
          business_hours?: Json | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          rating?: number | null
          services_offered?: string[] | null
          shop_name?: string
          shop_owner_id: string
          total_reviews?: number | null
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          address?: string | null
          business_hours?: Json | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          rating?: number | null
          services_offered?: string[] | null
          shop_name?: string
          shop_owner_id?: string
          total_reviews?: number | null
          updated_at?: string
          website_url?: string | null
        }
        Relationships: []
      }
      shop_info: {
        Row: {
          address: string | null
          created_at: string
          description: string | null
          email_address: string | null
          id: string
          logo_url: string | null
          phone_number: string | null
          shop_name: string
          shop_owner_id: string
          updated_at: string
          website_url: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string
          description?: string | null
          email_address?: string | null
          id?: string
          logo_url?: string | null
          phone_number?: string | null
          shop_name?: string
          shop_owner_id: string
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string
          description?: string | null
          email_address?: string | null
          id?: string
          logo_url?: string | null
          phone_number?: string | null
          shop_name?: string
          shop_owner_id?: string
          updated_at?: string
          website_url?: string | null
        }
        Relationships: []
      }
      shop_settings: {
        Row: {
          advance_booking_days: number | null
          auto_accept_bookings: boolean | null
          created_at: string
          id: string
          max_jobs_per_slot: number | null
          shop_owner_id: string
          slot_duration_minutes: number | null
          updated_at: string
        }
        Insert: {
          advance_booking_days?: number | null
          auto_accept_bookings?: boolean | null
          created_at?: string
          id?: string
          max_jobs_per_slot?: number | null
          shop_owner_id: string
          slot_duration_minutes?: number | null
          updated_at?: string
        }
        Update: {
          advance_booking_days?: number | null
          auto_accept_bookings?: boolean | null
          created_at?: string
          id?: string
          max_jobs_per_slot?: number | null
          shop_owner_id?: string
          slot_duration_minutes?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      time_slots: {
        Row: {
          created_at: string
          current_bookings: number | null
          id: string
          is_available: boolean | null
          max_capacity: number | null
          shop_owner_id: string
          slot_date: string
          slot_time: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_bookings?: number | null
          id?: string
          is_available?: boolean | null
          max_capacity?: number | null
          shop_owner_id: string
          slot_date: string
          slot_time: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_bookings?: number | null
          id?: string
          is_available?: boolean | null
          max_capacity?: number | null
          shop_owner_id?: string
          slot_date?: string
          slot_time?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      day_of_week:
        | "monday"
        | "tuesday"
        | "wednesday"
        | "thursday"
        | "friday"
        | "saturday"
        | "sunday"
      print_job_status:
        | "pending"
        | "queued"
        | "printing"
        | "completed"
        | "cancelled"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
      day_of_week: [
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday",
        "sunday",
      ],
      print_job_status: [
        "pending",
        "queued",
        "printing",
        "completed",
        "cancelled",
      ],
    },
  },
} as const
