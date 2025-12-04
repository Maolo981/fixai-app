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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      billing_info: {
        Row: {
          address: string
          city: string
          company_name: string | null
          country: string | null
          created_at: string | null
          id: string
          pec_email: string | null
          postal_code: string
          sdi_code: string | null
          tax_code: string
          updated_at: string | null
          user_id: string
          vat_number: string | null
        }
        Insert: {
          address: string
          city: string
          company_name?: string | null
          country?: string | null
          created_at?: string | null
          id?: string
          pec_email?: string | null
          postal_code: string
          sdi_code?: string | null
          tax_code: string
          updated_at?: string | null
          user_id: string
          vat_number?: string | null
        }
        Update: {
          address?: string
          city?: string
          company_name?: string | null
          country?: string | null
          created_at?: string | null
          id?: string
          pec_email?: string | null
          postal_code?: string
          sdi_code?: string | null
          tax_code?: string
          updated_at?: string | null
          user_id?: string
          vat_number?: string | null
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          created_at: string
          id: string
          image_url: string | null
          job_id: string
          message: string
          read: boolean
          sender_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url?: string | null
          job_id: string
          message: string
          read?: boolean
          sender_id: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string | null
          job_id?: string
          message?: string
          read?: boolean
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      diagnoses: {
        Row: {
          ai_analysis: string
          created_at: string | null
          estimated_cost_max: number | null
          estimated_cost_min: number | null
          estimated_time_hours: number | null
          id: string
          image_url: string
          possible_cause: string | null
          problem_type: string
          recommended_specialty: string
          urgency_level: string
          user_id: string
        }
        Insert: {
          ai_analysis: string
          created_at?: string | null
          estimated_cost_max?: number | null
          estimated_cost_min?: number | null
          estimated_time_hours?: number | null
          id?: string
          image_url: string
          possible_cause?: string | null
          problem_type: string
          recommended_specialty: string
          urgency_level: string
          user_id: string
        }
        Update: {
          ai_analysis?: string
          created_at?: string | null
          estimated_cost_max?: number | null
          estimated_cost_min?: number | null
          estimated_time_hours?: number | null
          id?: string
          image_url?: string
          possible_cause?: string | null
          problem_type?: string
          recommended_specialty?: string
          urgency_level?: string
          user_id?: string
        }
        Relationships: []
      }
      invoices: {
        Row: {
          created_at: string | null
          id: string
          invoice_date: string
          invoice_number: string
          job_id: string
          pdf_url: string | null
          sent_at: string | null
          status: string | null
          total_amount: number
          user_id: string
          vat_amount: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          invoice_date: string
          invoice_number: string
          job_id: string
          pdf_url?: string | null
          sent_at?: string | null
          status?: string | null
          total_amount: number
          user_id: string
          vat_amount: number
        }
        Update: {
          created_at?: string | null
          id?: string
          invoice_date?: string
          invoice_number?: string
          job_id?: string
          pdf_url?: string | null
          sent_at?: string | null
          status?: string | null
          total_amount?: number
          user_id?: string
          vat_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoices_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: true
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          cancellation_reason: string | null
          completion_date: string | null
          created_at: string | null
          diagnosis_id: string | null
          final_cost: number | null
          id: string
          payment_status: string | null
          quote_id: string | null
          scheduled_date: string | null
          status: string | null
          technician_id: string | null
          updated_at: string | null
          user_id: string
          user_rating: number | null
          user_review: string | null
        }
        Insert: {
          cancellation_reason?: string | null
          completion_date?: string | null
          created_at?: string | null
          diagnosis_id?: string | null
          final_cost?: number | null
          id?: string
          payment_status?: string | null
          quote_id?: string | null
          scheduled_date?: string | null
          status?: string | null
          technician_id?: string | null
          updated_at?: string | null
          user_id: string
          user_rating?: number | null
          user_review?: string | null
        }
        Update: {
          cancellation_reason?: string | null
          completion_date?: string | null
          created_at?: string | null
          diagnosis_id?: string | null
          final_cost?: number | null
          id?: string
          payment_status?: string | null
          quote_id?: string | null
          scheduled_date?: string | null
          status?: string | null
          technician_id?: string | null
          updated_at?: string | null
          user_id?: string
          user_rating?: number | null
          user_review?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "jobs_diagnosis_id_fkey"
            columns: ["diagnosis_id"]
            isOneToOne: false
            referencedRelation: "diagnoses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_technician_id_fkey"
            columns: ["technician_id"]
            isOneToOne: false
            referencedRelation: "technicians"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_logs: {
        Row: {
          id: string
          notification_type: string
          read_at: string | null
          reference_id: string | null
          sent_at: string | null
          user_id: string
        }
        Insert: {
          id?: string
          notification_type: string
          read_at?: string | null
          reference_id?: string | null
          sent_at?: string | null
          user_id: string
        }
        Update: {
          id?: string
          notification_type?: string
          read_at?: string | null
          reference_id?: string | null
          sent_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      payment_methods: {
        Row: {
          card_brand: string
          card_last4: string
          created_at: string | null
          exp_month: number
          exp_year: number
          id: string
          is_default: boolean | null
          stripe_payment_method_id: string
          user_id: string
        }
        Insert: {
          card_brand: string
          card_last4: string
          created_at?: string | null
          exp_month: number
          exp_year: number
          id?: string
          is_default?: boolean | null
          stripe_payment_method_id: string
          user_id: string
        }
        Update: {
          card_brand?: string
          card_last4?: string
          created_at?: string | null
          exp_month?: number
          exp_year?: number
          id?: string
          is_default?: boolean | null
          stripe_payment_method_id?: string
          user_id?: string
        }
        Relationships: []
      }
      payment_settings: {
        Row: {
          deposit_percentage: number | null
          id: string
          invoice_prefix: string | null
          refund_24h_percentage: number | null
          refund_48h_percentage: number | null
          refund_72h_percentage: number | null
          updated_at: string | null
          vat_rate: number | null
        }
        Insert: {
          deposit_percentage?: number | null
          id?: string
          invoice_prefix?: string | null
          refund_24h_percentage?: number | null
          refund_48h_percentage?: number | null
          refund_72h_percentage?: number | null
          updated_at?: string | null
          vat_rate?: number | null
        }
        Update: {
          deposit_percentage?: number | null
          id?: string
          invoice_prefix?: string | null
          refund_24h_percentage?: number | null
          refund_48h_percentage?: number | null
          refund_72h_percentage?: number | null
          updated_at?: string | null
          vat_rate?: number | null
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          completed_at: string | null
          created_at: string | null
          id: string
          job_id: string
          metadata: Json | null
          payment_method_id: string | null
          payment_type: string
          status: string | null
          stripe_payment_intent_id: string | null
          user_id: string
        }
        Insert: {
          amount: number
          completed_at?: string | null
          created_at?: string | null
          id?: string
          job_id: string
          metadata?: Json | null
          payment_method_id?: string | null
          payment_type: string
          status?: string | null
          stripe_payment_intent_id?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          completed_at?: string | null
          created_at?: string | null
          id?: string
          job_id?: string
          metadata?: Json | null
          payment_method_id?: string | null
          payment_type?: string
          status?: string | null
          stripe_payment_intent_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_payment_method_id_fkey"
            columns: ["payment_method_id"]
            isOneToOne: false
            referencedRelation: "payment_methods"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address: string | null
          address_document_url: string | null
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          is_technician: boolean | null
          latitude: number | null
          location_updated_at: string | null
          longitude: number | null
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          address_document_url?: string | null
          created_at?: string | null
          email: string
          full_name?: string | null
          id: string
          is_technician?: boolean | null
          latitude?: number | null
          location_updated_at?: string | null
          longitude?: number | null
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          address_document_url?: string | null
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          is_technician?: boolean | null
          latitude?: number | null
          location_updated_at?: string | null
          longitude?: number | null
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      quotes: {
        Row: {
          created_at: string | null
          description: string
          estimated_hours: number
          expires_at: string
          hourly_rate: number
          id: string
          job_id: string
          notes: string | null
          parts_cost: number | null
          status: string
          technician_id: string
          total_cost: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          description: string
          estimated_hours: number
          expires_at?: string
          hourly_rate: number
          id?: string
          job_id: string
          notes?: string | null
          parts_cost?: number | null
          status?: string
          technician_id: string
          total_cost: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          description?: string
          estimated_hours?: number
          expires_at?: string
          hourly_rate?: number
          id?: string
          job_id?: string
          notes?: string | null
          parts_cost?: number | null
          status?: string
          technician_id?: string
          total_cost?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quotes_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_technician_id_fkey"
            columns: ["technician_id"]
            isOneToOne: false
            referencedRelation: "technicians"
            referencedColumns: ["id"]
          },
        ]
      }
      refunds: {
        Row: {
          amount: number
          completed_at: string | null
          created_at: string | null
          id: string
          job_id: string
          payment_id: string
          reason: string
          refund_type: string
          status: string | null
          stripe_refund_id: string | null
        }
        Insert: {
          amount: number
          completed_at?: string | null
          created_at?: string | null
          id?: string
          job_id: string
          payment_id: string
          reason: string
          refund_type: string
          status?: string | null
          stripe_refund_id?: string | null
        }
        Update: {
          amount?: number
          completed_at?: string | null
          created_at?: string | null
          id?: string
          job_id?: string
          payment_id?: string
          reason?: string
          refund_type?: string
          status?: string | null
          stripe_refund_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "refunds_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refunds_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      special_offers: {
        Row: {
          active: boolean | null
          created_at: string | null
          description: string
          discount_amount: number | null
          discount_percentage: number | null
          id: string
          target_inactive_days: number | null
          title: string
          valid_from: string | null
          valid_until: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          description: string
          discount_amount?: number | null
          discount_percentage?: number | null
          id?: string
          target_inactive_days?: number | null
          title: string
          valid_from?: string | null
          valid_until: string
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          description?: string
          discount_amount?: number | null
          discount_percentage?: number | null
          id?: string
          target_inactive_days?: number | null
          title?: string
          valid_from?: string | null
          valid_until?: string
        }
        Relationships: []
      }
      technician_locations: {
        Row: {
          accuracy: number | null
          heading: number | null
          id: string
          job_id: string | null
          latitude: number
          longitude: number
          speed: number | null
          technician_id: string
          updated_at: string | null
        }
        Insert: {
          accuracy?: number | null
          heading?: number | null
          id?: string
          job_id?: string | null
          latitude: number
          longitude: number
          speed?: number | null
          technician_id: string
          updated_at?: string | null
        }
        Update: {
          accuracy?: number | null
          heading?: number | null
          id?: string
          job_id?: string | null
          latitude?: number
          longitude?: number
          speed?: number | null
          technician_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "technician_locations_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "technician_locations_technician_id_fkey"
            columns: ["technician_id"]
            isOneToOne: false
            referencedRelation: "technicians"
            referencedColumns: ["id"]
          },
        ]
      }
      technician_notifications: {
        Row: {
          created_at: string
          id: string
          job_id: string | null
          message: string
          read: boolean
          technician_id: string
          title: string
          type: string
        }
        Insert: {
          created_at?: string
          id?: string
          job_id?: string | null
          message: string
          read?: boolean
          technician_id: string
          title: string
          type: string
        }
        Update: {
          created_at?: string
          id?: string
          job_id?: string | null
          message?: string
          read?: boolean
          technician_id?: string
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "technician_notifications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "technician_notifications_technician_id_fkey"
            columns: ["technician_id"]
            isOneToOne: false
            referencedRelation: "technicians"
            referencedColumns: ["id"]
          },
        ]
      }
      technician_schedules: {
        Row: {
          created_at: string
          end_time: string
          id: string
          job_id: string | null
          start_time: string
          status: string
          technician_id: string
        }
        Insert: {
          created_at?: string
          end_time: string
          id?: string
          job_id?: string | null
          start_time: string
          status?: string
          technician_id: string
        }
        Update: {
          created_at?: string
          end_time?: string
          id?: string
          job_id?: string | null
          start_time?: string
          status?: string
          technician_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "technician_schedules_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "technician_schedules_technician_id_fkey"
            columns: ["technician_id"]
            isOneToOne: false
            referencedRelation: "technicians"
            referencedColumns: ["id"]
          },
        ]
      }
      technicians: {
        Row: {
          availability_status: string | null
          avatar_url: string | null
          bio: string | null
          certifications: Json | null
          created_at: string | null
          full_name: string
          hourly_rate: number | null
          id: string
          latitude: number | null
          longitude: number | null
          portfolio_images: string[] | null
          profile_id: string | null
          rating: number | null
          service_prices: Json | null
          service_radius_km: number | null
          specialties: string[]
          total_jobs: number | null
          verified: boolean | null
        }
        Insert: {
          availability_status?: string | null
          avatar_url?: string | null
          bio?: string | null
          certifications?: Json | null
          created_at?: string | null
          full_name: string
          hourly_rate?: number | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          portfolio_images?: string[] | null
          profile_id?: string | null
          rating?: number | null
          service_prices?: Json | null
          service_radius_km?: number | null
          specialties: string[]
          total_jobs?: number | null
          verified?: boolean | null
        }
        Update: {
          availability_status?: string | null
          avatar_url?: string | null
          bio?: string | null
          certifications?: Json | null
          created_at?: string | null
          full_name?: string
          hourly_rate?: number | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          portfolio_images?: string[] | null
          profile_id?: string | null
          rating?: number | null
          service_prices?: Json | null
          service_radius_km?: number | null
          specialties?: string[]
          total_jobs?: number | null
          verified?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "technicians_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_offers: {
        Row: {
          clicked: boolean | null
          id: string
          offer_id: string
          sent_at: string | null
          used: boolean | null
          user_id: string
        }
        Insert: {
          clicked?: boolean | null
          id?: string
          offer_id: string
          sent_at?: string | null
          used?: boolean | null
          user_id: string
        }
        Update: {
          clicked?: boolean | null
          id?: string
          offer_id?: string
          sent_at?: string | null
          used?: boolean | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_offers_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "special_offers"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_distance: {
        Args: { lat1: number; lat2: number; lon1: number; lon2: number }
        Returns: number
      }
      calculate_distance_meters: {
        Args: { lat1: number; lat2: number; lon1: number; lon2: number }
        Returns: number
      }
      generate_invoice_number: { Args: never; Returns: string }
      get_nearby_technicians: {
        Args: {
          limit_count?: number
          max_distance_km?: number
          user_lat: number
          user_lon: number
        }
        Returns: {
          availability_status: string
          avatar_url: string
          distance_km: number
          full_name: string
          hourly_rate: number
          id: string
          rating: number
          specialties: string[]
          total_jobs: number
        }[]
      }
      get_technician_reviews: {
        Args: { p_technician_id: string }
        Returns: {
          completion_date: string
          created_at: string
          id: string
          problem_type: string
          user_name: string
          user_rating: number
          user_review: string
        }[]
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
