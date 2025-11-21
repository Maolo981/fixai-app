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
      jobs: {
        Row: {
          completion_date: string | null
          created_at: string | null
          diagnosis_id: string | null
          final_cost: number | null
          id: string
          payment_status: string | null
          scheduled_date: string | null
          status: string | null
          technician_id: string | null
          updated_at: string | null
          user_id: string
          user_rating: number | null
          user_review: string | null
        }
        Insert: {
          completion_date?: string | null
          created_at?: string | null
          diagnosis_id?: string | null
          final_cost?: number | null
          id?: string
          payment_status?: string | null
          scheduled_date?: string | null
          status?: string | null
          technician_id?: string | null
          updated_at?: string | null
          user_id: string
          user_rating?: number | null
          user_review?: string | null
        }
        Update: {
          completion_date?: string | null
          created_at?: string | null
          diagnosis_id?: string | null
          final_cost?: number | null
          id?: string
          payment_status?: string | null
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
            foreignKeyName: "jobs_technician_id_fkey"
            columns: ["technician_id"]
            isOneToOne: false
            referencedRelation: "technicians"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address: string | null
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
      technicians: {
        Row: {
          availability_status: string | null
          avatar_url: string | null
          created_at: string | null
          full_name: string
          hourly_rate: number | null
          id: string
          latitude: number | null
          longitude: number | null
          profile_id: string | null
          rating: number | null
          service_radius_km: number | null
          specialties: string[]
          total_jobs: number | null
          verified: boolean | null
        }
        Insert: {
          availability_status?: string | null
          avatar_url?: string | null
          created_at?: string | null
          full_name: string
          hourly_rate?: number | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          profile_id?: string | null
          rating?: number | null
          service_radius_km?: number | null
          specialties: string[]
          total_jobs?: number | null
          verified?: boolean | null
        }
        Update: {
          availability_status?: string | null
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string
          hourly_rate?: number | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          profile_id?: string | null
          rating?: number | null
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_distance: {
        Args: { lat1: number; lat2: number; lon1: number; lon2: number }
        Returns: number
      }
      get_nearby_technicians: {
        Args: {
          limit_count?: number
          max_distance_km?: number
          user_lat: number
          user_lon: number
        }
        Returns: {
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
