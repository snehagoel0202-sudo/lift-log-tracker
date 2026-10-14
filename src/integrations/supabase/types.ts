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
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      checkins: {
        Row: {
          created_at: string
          date: string
          deleted_at: string | null
          energy: number | null
          id: string
          notes: string | null
          pain: boolean
          pain_area: string | null
          sleep: number | null
          soreness: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date: string
          deleted_at?: string | null
          energy?: number | null
          id?: string
          notes?: string | null
          pain?: boolean
          pain_area?: string | null
          sleep?: number | null
          soreness?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          deleted_at?: string | null
          energy?: number | null
          id?: string
          notes?: string | null
          pain?: boolean
          pain_area?: string | null
          sleep?: number | null
          soreness?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      exercises: {
        Row: {
          aliases: string[]
          created_at: string
          equipment: Database["public"]["Enums"]["exercise_equipment"]
          id: string
          impact_level: Database["public"]["Enums"]["impact_level"]
          is_compound: boolean
          movement_pattern: Database["public"]["Enums"]["movement_pattern"]
          muscle_group: string
          name: string
          postpartum_safe: boolean
          variation_of: string | null
          video_channel: string | null
          video_channel_url: string | null
          video_id: string | null
          video_title: string | null
          weight_step: number
        }
        Insert: {
          aliases?: string[]
          created_at?: string
          equipment: Database["public"]["Enums"]["exercise_equipment"]
          id?: string
          impact_level?: Database["public"]["Enums"]["impact_level"]
          is_compound?: boolean
          movement_pattern: Database["public"]["Enums"]["movement_pattern"]
          muscle_group: string
          name: string
          postpartum_safe?: boolean
          variation_of?: string | null
          video_channel?: string | null
          video_channel_url?: string | null
          video_id?: string | null
          video_title?: string | null
          weight_step?: number
        }
        Update: {
          aliases?: string[]
          created_at?: string
          equipment?: Database["public"]["Enums"]["exercise_equipment"]
          id?: string
          impact_level?: Database["public"]["Enums"]["impact_level"]
          is_compound?: boolean
          movement_pattern?: Database["public"]["Enums"]["movement_pattern"]
          muscle_group?: string
          name?: string
          postpartum_safe?: boolean
          variation_of?: string | null
          video_channel?: string | null
          video_channel_url?: string | null
          video_id?: string | null
          video_title?: string | null
          weight_step?: number
        }
        Relationships: [
          {
            foreignKeyName: "exercises_variation_of_fkey"
            columns: ["variation_of"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_items: {
        Row: {
          created_at: string
          day_number: number
          deleted_at: string | null
          exercise_id: string
          id: string
          plan_id: string
          position: number
          rationale: string | null
          rep_max: number
          rep_min: number
          sets: number
          target_weight: number | null
          unit: Database["public"]["Enums"]["weight_unit"]
          user_id: string
        }
        Insert: {
          created_at?: string
          day_number: number
          deleted_at?: string | null
          exercise_id: string
          id?: string
          plan_id: string
          position?: number
          rationale?: string | null
          rep_max: number
          rep_min: number
          sets: number
          target_weight?: number | null
          unit?: Database["public"]["Enums"]["weight_unit"]
          user_id: string
        }
        Update: {
          created_at?: string
          day_number?: number
          deleted_at?: string | null
          exercise_id?: string
          id?: string
          plan_id?: string
          position?: number
          rationale?: string | null
          rep_max?: number
          rep_min?: number
          sets?: number
          target_weight?: number | null
          unit?: Database["public"]["Enums"]["weight_unit"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_items_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_items_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          status: Database["public"]["Enums"]["plan_status"]
          summary: string | null
          user_id: string
          week_start: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          status?: Database["public"]["Enums"]["plan_status"]
          summary?: string | null
          user_id: string
          week_start: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          status?: Database["public"]["Enums"]["plan_status"]
          summary?: string | null
          user_id?: string
          week_start?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          accepted_terms_at: string | null
          created_at: string
          days_per_week: number | null
          display_name: string | null
          equipment: Database["public"]["Enums"]["equipment_access"] | null
          experience: Database["public"]["Enums"]["experience_level"] | null
          goal: Database["public"]["Enums"]["training_goal"] | null
          id: string
          onboarded_at: string | null
          postpartum: boolean
          postpartum_birth_type:
            | Database["public"]["Enums"]["birth_type"]
            | null
          postpartum_cleared: boolean | null
          postpartum_cleared_on: string | null
          postpartum_weeks_recorded_on: string | null
          postpartum_weeks_since_birth: number | null
          session_minutes: number | null
          updated_at: string
          weight_unit: Database["public"]["Enums"]["weight_unit"]
        }
        Insert: {
          accepted_terms_at?: string | null
          created_at?: string
          days_per_week?: number | null
          display_name?: string | null
          equipment?: Database["public"]["Enums"]["equipment_access"] | null
          experience?: Database["public"]["Enums"]["experience_level"] | null
          goal?: Database["public"]["Enums"]["training_goal"] | null
          id: string
          onboarded_at?: string | null
          postpartum?: boolean
          postpartum_birth_type?:
            | Database["public"]["Enums"]["birth_type"]
            | null
          postpartum_cleared?: boolean | null
          postpartum_cleared_on?: string | null
          postpartum_weeks_recorded_on?: string | null
          postpartum_weeks_since_birth?: number | null
          session_minutes?: number | null
          updated_at?: string
          weight_unit?: Database["public"]["Enums"]["weight_unit"]
        }
        Update: {
          accepted_terms_at?: string | null
          created_at?: string
          days_per_week?: number | null
          display_name?: string | null
          equipment?: Database["public"]["Enums"]["equipment_access"] | null
          experience?: Database["public"]["Enums"]["experience_level"] | null
          goal?: Database["public"]["Enums"]["training_goal"] | null
          id?: string
          onboarded_at?: string | null
          postpartum?: boolean
          postpartum_birth_type?:
            | Database["public"]["Enums"]["birth_type"]
            | null
          postpartum_cleared?: boolean | null
          postpartum_cleared_on?: string | null
          postpartum_weeks_recorded_on?: string | null
          postpartum_weeks_since_birth?: number | null
          session_minutes?: number | null
          updated_at?: string
          weight_unit?: Database["public"]["Enums"]["weight_unit"]
        }
        Relationships: []
      }
      workout_sessions: {
        Row: {
          created_at: string
          date: string
          deleted_at: string | null
          id: string
          notes: string | null
          plan_id: string | null
          source: Database["public"]["Enums"]["workout_source"]
          user_id: string
        }
        Insert: {
          created_at?: string
          date: string
          deleted_at?: string | null
          id?: string
          notes?: string | null
          plan_id?: string | null
          source?: Database["public"]["Enums"]["workout_source"]
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          deleted_at?: string | null
          id?: string
          notes?: string | null
          plan_id?: string | null
          source?: Database["public"]["Enums"]["workout_source"]
          user_id?: string
        }
        Relationships: []
      }
      workout_sets: {
        Row: {
          completed: boolean
          created_at: string
          deleted_at: string | null
          exercise_id: string
          id: string
          reps: number | null
          rpe: number | null
          session_id: string
          set_number: number
          unit: Database["public"]["Enums"]["weight_unit"]
          user_id: string
          weight: number | null
        }
        Insert: {
          completed?: boolean
          created_at?: string
          deleted_at?: string | null
          exercise_id: string
          id?: string
          reps?: number | null
          rpe?: number | null
          session_id: string
          set_number: number
          unit?: Database["public"]["Enums"]["weight_unit"]
          user_id: string
          weight?: number | null
        }
        Update: {
          completed?: boolean
          created_at?: string
          deleted_at?: string | null
          exercise_id?: string
          id?: string
          reps?: number | null
          rpe?: number | null
          session_id?: string
          set_number?: number
          unit?: Database["public"]["Enums"]["weight_unit"]
          user_id?: string
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "workout_sets_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_sets_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "workout_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      birth_type: "vaginal" | "c_section" | "prefer_not_to_say"
      equipment_access: "full_gym" | "dumbbells_only" | "bodyweight_only"
      exercise_equipment:
        | "barbell"
        | "dumbbell"
        | "machine"
        | "cable"
        | "bodyweight"
      experience_level: "beginner" | "intermediate" | "advanced"
      impact_level: "low" | "moderate" | "high"
      movement_pattern:
        | "squat"
        | "hinge"
        | "push"
        | "pull"
        | "lunge"
        | "carry"
        | "core"
      plan_status: "draft" | "approved" | "archived"
      training_goal:
        | "strength"
        | "build_muscle"
        | "lose_fat"
        | "general_fitness"
      weight_unit: "kg" | "lb"
      workout_source: "plan" | "checklist" | "chat"
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
      birth_type: ["vaginal", "c_section", "prefer_not_to_say"],
      equipment_access: ["full_gym", "dumbbells_only", "bodyweight_only"],
      exercise_equipment: [
        "barbell",
        "dumbbell",
        "machine",
        "cable",
        "bodyweight",
      ],
      experience_level: ["beginner", "intermediate", "advanced"],
      impact_level: ["low", "moderate", "high"],
      movement_pattern: [
        "squat",
        "hinge",
        "push",
        "pull",
        "lunge",
        "carry",
        "core",
      ],
      plan_status: ["draft", "approved", "archived"],
      training_goal: [
        "strength",
        "build_muscle",
        "lose_fat",
        "general_fitness",
      ],
      weight_unit: ["kg", "lb"],
      workout_source: ["plan", "checklist", "chat"],
    },
  },
} as const
