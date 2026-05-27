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
    PostgrestVersion: "14.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      challenge_opens: {
        Row: {
          challenge_id: string
          opened_at: string
          user_id: string
        }
        Insert: {
          challenge_id: string
          opened_at?: string
          user_id: string
        }
        Update: {
          challenge_id?: string
          opened_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenge_opens_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "active_challenge_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenge_opens_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenge_opens_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "closed_challenge_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenge_opens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenge_opens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      challenges: {
        Row: {
          created_at: string
          created_by: string | null
          difficulty: string
          id: string
          image_prefix: string
          lat: number
          lng: number
          location_label: string | null
          published_at: string | null
          region: string
          scheduled_for: string
          window_closes_at: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          difficulty: string
          id?: string
          image_prefix: string
          lat: number
          lng: number
          location_label?: string | null
          published_at?: string | null
          region: string
          scheduled_for: string
          window_closes_at?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          difficulty?: string
          id?: string
          image_prefix?: string
          lat?: number
          lng?: number
          location_label?: string | null
          published_at?: string | null
          region?: string
          scheduled_for?: string
          window_closes_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "challenges_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenges_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      leaderboard_entries: {
        Row: {
          best_play_id: string | null
          period_start: string
          period_type: string
          plays_count: number
          total_score: number
          updated_at: string
          user_id: string
        }
        Insert: {
          best_play_id?: string | null
          period_start: string
          period_type: string
          plays_count?: number
          total_score?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          best_play_id?: string | null
          period_start?: string
          period_type?: string
          plays_count?: number
          total_score?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "leaderboard_entries_best_play_id_fkey"
            columns: ["best_play_id"]
            isOneToOne: false
            referencedRelation: "plays"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leaderboard_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leaderboard_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_log: {
        Row: {
          challenge_id: string
          channel: string
          error: string | null
          id: number
          kind: string
          sent_at: string
          status: string
          user_id: string
        }
        Insert: {
          challenge_id: string
          channel: string
          error?: string | null
          id?: number
          kind: string
          sent_at?: string
          status: string
          user_id: string
        }
        Update: {
          challenge_id?: string
          channel?: string
          error?: string | null
          id?: number
          kind?: string
          sent_at?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_log_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "active_challenge_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_log_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_log_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "closed_challenge_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          last_seen_at: string | null
          p256dh: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          last_seen_at?: string | null
          p256dh: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          last_seen_at?: string | null
          p256dh?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      plays: {
        Row: {
          accuracy_multiplier: number
          base_score: number
          challenge_id: string
          distance_km: number
          guess_lat: number
          guess_lng: number
          id: string
          opened_at: string
          speed_bonus: number
          submitted_at: string
          time_to_submit_seconds: number
          total_score: number
          user_id: string
        }
        Insert: {
          accuracy_multiplier: number
          base_score: number
          challenge_id: string
          distance_km: number
          guess_lat: number
          guess_lng: number
          id?: string
          opened_at: string
          speed_bonus: number
          submitted_at?: string
          time_to_submit_seconds: number
          total_score: number
          user_id: string
        }
        Update: {
          accuracy_multiplier?: number
          base_score?: number
          challenge_id?: string
          distance_km?: number
          guess_lat?: number
          guess_lng?: number
          id?: string
          opened_at?: string
          speed_bonus?: number
          submitted_at?: string
          time_to_submit_seconds?: number
          total_score?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plays_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "active_challenge_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plays_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plays_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "closed_challenge_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plays_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plays_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          is_admin: boolean
          is_pro: boolean
          last_played_on: string | null
          last_seen_at: string | null
          locale: string
          longest_streak: number
          notification_channel: string
          pro_until: string | null
          streak_count: number
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          is_admin?: boolean
          is_pro?: boolean
          last_played_on?: string | null
          last_seen_at?: string | null
          locale?: string
          longest_streak?: number
          notification_channel?: string
          pro_until?: string | null
          streak_count?: number
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          is_admin?: boolean
          is_pro?: boolean
          last_played_on?: string | null
          last_seen_at?: string | null
          locale?: string
          longest_streak?: number
          notification_channel?: string
          pro_until?: string | null
          streak_count?: number
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      active_challenge_public: {
        Row: {
          difficulty: string | null
          id: string | null
          image_prefix: string | null
          published_at: string | null
          region: string | null
          scheduled_for: string | null
          window_closes_at: string | null
        }
        Insert: {
          difficulty?: string | null
          id?: string | null
          image_prefix?: string | null
          published_at?: string | null
          region?: string | null
          scheduled_for?: string | null
          window_closes_at?: string | null
        }
        Update: {
          difficulty?: string | null
          id?: string | null
          image_prefix?: string | null
          published_at?: string | null
          region?: string | null
          scheduled_for?: string | null
          window_closes_at?: string | null
        }
        Relationships: []
      }
      closed_challenge_public: {
        Row: {
          difficulty: string | null
          id: string | null
          image_prefix: string | null
          lat: number | null
          lng: number | null
          location_label: string | null
          published_at: string | null
          region: string | null
          scheduled_for: string | null
          window_closes_at: string | null
        }
        Insert: {
          difficulty?: string | null
          id?: string | null
          image_prefix?: string | null
          lat?: number | null
          lng?: number | null
          location_label?: string | null
          published_at?: string | null
          region?: string | null
          scheduled_for?: string | null
          window_closes_at?: string | null
        }
        Update: {
          difficulty?: string | null
          id?: string | null
          image_prefix?: string | null
          lat?: number | null
          lng?: number | null
          location_label?: string | null
          published_at?: string | null
          region?: string | null
          scheduled_for?: string | null
          window_closes_at?: string | null
        }
        Relationships: []
      }
      leaderboard_view: {
        Row: {
          avatar_url: string | null
          best_play_id: string | null
          display_name: string | null
          is_pro: boolean | null
          period_start: string | null
          period_type: string | null
          plays_count: number | null
          rank: number | null
          total_score: number | null
          updated_at: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leaderboard_entries_best_play_id_fkey"
            columns: ["best_play_id"]
            isOneToOne: false
            referencedRelation: "plays"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leaderboard_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leaderboard_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles_public: {
        Row: {
          avatar_url: string | null
          display_name: string | null
          id: string | null
          is_pro: boolean | null
        }
        Insert: {
          avatar_url?: string | null
          display_name?: string | null
          id?: string | null
          is_pro?: boolean | null
        }
        Update: {
          avatar_url?: string | null
          display_name?: string | null
          id?: string | null
          is_pro?: boolean | null
        }
        Relationships: []
      }
    }
    Functions: {
      submit_guess: {
        Args: {
          p_challenge_id: string
          p_guess_lat: number
          p_guess_lng: number
        }
        Returns: {
          accuracy_multiplier: number
          base_score: number
          distance_km: number
          play_id: string
          speed_bonus: number
          total_score: number
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
