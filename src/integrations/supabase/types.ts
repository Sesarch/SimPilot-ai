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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          role: string
          session_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          role: string
          session_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          role?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_sessions: {
        Row: {
          created_at: string
          id: string
          mode: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          mode?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          mode?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      contact_submissions: {
        Row: {
          created_at: string
          email: string
          id: string
          message: string
          name: string
          subject: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
          subject: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          subject?: string
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      exam_scores: {
        Row: {
          acs_codes: Json | null
          created_at: string
          exam_type: string
          id: string
          report: Json | null
          result: string
          score: number
          session_id: string | null
          stress_mode: boolean
          total_questions: number
          user_id: string
        }
        Insert: {
          acs_codes?: Json | null
          created_at?: string
          exam_type: string
          id?: string
          report?: Json | null
          result?: string
          score: number
          session_id?: string | null
          stress_mode?: boolean
          total_questions: number
          user_id: string
        }
        Update: {
          acs_codes?: Json | null
          created_at?: string
          exam_type?: string
          id?: string
          report?: Json | null
          result?: string
          score?: number
          session_id?: string | null
          stress_mode?: boolean
          total_questions?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exam_scores_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      flight_logs: {
        Row: {
          aircraft_type: string | null
          approaches: number
          created_at: string
          cross_country_time: number
          day_landings: number
          departure: string | null
          destination: string | null
          flight_date: string
          id: string
          instrument_time: number
          night_landings: number
          night_time: number
          pic_time: number
          pmdg_debrief: Json | null
          remarks: string | null
          route: string | null
          sic_time: number
          simulated_instrument_time: number
          source: string
          source_session_id: string | null
          status: string
          tail_number: string | null
          total_time: number
          updated_at: string
          user_id: string
        }
        Insert: {
          aircraft_type?: string | null
          approaches?: number
          created_at?: string
          cross_country_time?: number
          day_landings?: number
          departure?: string | null
          destination?: string | null
          flight_date?: string
          id?: string
          instrument_time?: number
          night_landings?: number
          night_time?: number
          pic_time?: number
          pmdg_debrief?: Json | null
          remarks?: string | null
          route?: string | null
          sic_time?: number
          simulated_instrument_time?: number
          source?: string
          source_session_id?: string | null
          status?: string
          tail_number?: string | null
          total_time?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          aircraft_type?: string | null
          approaches?: number
          created_at?: string
          cross_country_time?: number
          day_landings?: number
          departure?: string | null
          destination?: string | null
          flight_date?: string
          id?: string
          instrument_time?: number
          night_landings?: number
          night_time?: number
          pic_time?: number
          pmdg_debrief?: Json | null
          remarks?: string | null
          route?: string | null
          sic_time?: number
          simulated_instrument_time?: number
          source?: string
          source_session_id?: string | null
          status?: string
          tail_number?: string | null
          total_time?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      lead_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          pilot_context: Json | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          pilot_context?: Json | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          pilot_context?: Json | null
        }
        Relationships: []
      }
      message_usage: {
        Row: {
          created_at: string
          id: string
          message_count: number
          updated_at: string
          usage_date: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message_count?: number
          updated_at?: string
          usage_date?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message_count?: number
          updated_at?: string
          usage_date?: string
          user_id?: string
        }
        Relationships: []
      }
      missing_acs_codes: {
        Row: {
          code: string
          first_seen_at: string
          hit_count: number
          id: string
          last_seen_at: string
        }
        Insert: {
          code: string
          first_seen_at?: string
          hit_count?: number
          id?: string
          last_seen_at?: string
        }
        Update: {
          code?: string
          first_seen_at?: string
          hit_count?: number
          id?: string
          last_seen_at?: string
        }
        Relationships: []
      }
      newsletter_subscribers: {
        Row: {
          email: string
          id: string
          subscribed_at: string
        }
        Insert: {
          email: string
          id?: string
          subscribed_at?: string
        }
        Update: {
          email?: string
          id?: string
          subscribed_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          aircraft_type: string | null
          avatar_url: string | null
          bio: string | null
          certificate_type: string | null
          created_at: string
          display_name: string | null
          flight_hours: number | null
          id: string
          profile_public: boolean
          rating_focus: string | null
          region: string | null
          school_seat_code_id: string | null
          subscription_expires_at: string | null
          subscription_source: string | null
          terms_agreed_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          aircraft_type?: string | null
          avatar_url?: string | null
          bio?: string | null
          certificate_type?: string | null
          created_at?: string
          display_name?: string | null
          flight_hours?: number | null
          id?: string
          profile_public?: boolean
          rating_focus?: string | null
          region?: string | null
          school_seat_code_id?: string | null
          subscription_expires_at?: string | null
          subscription_source?: string | null
          terms_agreed_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          aircraft_type?: string | null
          avatar_url?: string | null
          bio?: string | null
          certificate_type?: string | null
          created_at?: string
          display_name?: string | null
          flight_hours?: number | null
          id?: string
          profile_public?: boolean
          rating_focus?: string | null
          region?: string | null
          school_seat_code_id?: string | null
          subscription_expires_at?: string | null
          subscription_source?: string | null
          terms_agreed_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_school_seat_code_id_fkey"
            columns: ["school_seat_code_id"]
            isOneToOne: false
            referencedRelation: "school_seat_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      school_purchases: {
        Row: {
          amount_paid_cents: number
          contact_email: string
          contact_name: string | null
          created_at: string
          currency: string
          discount_percent: number
          expires_at: string
          id: string
          school_name: string
          seats_purchased: number
          status: string
          stripe_payment_intent_id: string | null
          stripe_session_id: string | null
          updated_at: string
        }
        Insert: {
          amount_paid_cents: number
          contact_email: string
          contact_name?: string | null
          created_at?: string
          currency?: string
          discount_percent?: number
          expires_at: string
          id?: string
          school_name: string
          seats_purchased: number
          status?: string
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          updated_at?: string
        }
        Update: {
          amount_paid_cents?: number
          contact_email?: string
          contact_name?: string | null
          created_at?: string
          currency?: string
          discount_percent?: number
          expires_at?: string
          id?: string
          school_name?: string
          seats_purchased?: number
          status?: string
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      school_seat_codes: {
        Row: {
          code: string
          created_at: string
          id: string
          purchase_id: string
          redeemed_at: string | null
          redeemed_by_user_id: string | null
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          purchase_id: string
          redeemed_at?: string | null
          redeemed_by_user_id?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          purchase_id?: string
          redeemed_at?: string | null
          redeemed_by_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "school_seat_codes_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "school_purchases"
            referencedColumns: ["id"]
          },
        ]
      }
      site_settings: {
        Row: {
          announcement: string
          bridge_direct_download_enabled: boolean
          chat_enabled: boolean
          ground_school_enabled: boolean
          id: number
          live_tools_enabled: boolean
          maintenance_mode: boolean
          signup_enabled: boolean
          updated_at: string
          weather_enabled: boolean
        }
        Insert: {
          announcement?: string
          bridge_direct_download_enabled?: boolean
          chat_enabled?: boolean
          ground_school_enabled?: boolean
          id?: number
          live_tools_enabled?: boolean
          maintenance_mode?: boolean
          signup_enabled?: boolean
          updated_at?: string
          weather_enabled?: boolean
        }
        Update: {
          announcement?: string
          bridge_direct_download_enabled?: boolean
          chat_enabled?: boolean
          ground_school_enabled?: boolean
          id?: number
          live_tools_enabled?: boolean
          maintenance_mode?: boolean
          signup_enabled?: boolean
          updated_at?: string
          weather_enabled?: boolean
        }
        Relationships: []
      }
      support_chat_messages: {
        Row: {
          chat_id: string
          content: string
          created_at: string
          id: string
          role: string
        }
        Insert: {
          chat_id: string
          content: string
          created_at?: string
          id?: string
          role: string
        }
        Update: {
          chat_id?: string
          content?: string
          created_at?: string
          id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_chat_messages_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "support_chats"
            referencedColumns: ["id"]
          },
        ]
      }
      support_chats: {
        Row: {
          created_at: string
          email: string
          escalated: boolean
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          escalated?: boolean
          id?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          escalated?: boolean
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      topic_progress: {
        Row: {
          completed: boolean
          completed_at: string | null
          created_at: string
          id: string
          topic_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          id?: string
          topic_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          id?: string
          topic_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_achievements: {
        Row: {
          earned_at: string
          exam_score_id: string | null
          exam_type: string | null
          id: string
          percentile: number | null
          tier: string
          user_id: string
        }
        Insert: {
          earned_at?: string
          exam_score_id?: string | null
          exam_type?: string | null
          id?: string
          percentile?: number | null
          tier: string
          user_id: string
        }
        Update: {
          earned_at?: string
          exam_score_id?: string | null
          exam_type?: string | null
          id?: string
          percentile?: number | null
          tier?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_exam_score_id_fkey"
            columns: ["exam_score_id"]
            isOneToOne: false
            referencedRelation: "exam_scores"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      profiles_public: {
        Row: {
          aircraft_type: string | null
          avatar_url: string | null
          bio: string | null
          certificate_type: string | null
          created_at: string | null
          display_name: string | null
          flight_hours: number | null
          profile_public: boolean | null
          rating_focus: string | null
          region: string | null
          user_id: string | null
        }
        Insert: {
          aircraft_type?: string | null
          avatar_url?: string | null
          bio?: string | null
          certificate_type?: string | null
          created_at?: string | null
          display_name?: string | null
          flight_hours?: number | null
          profile_public?: boolean | null
          rating_focus?: string | null
          region?: string | null
          user_id?: string | null
        }
        Update: {
          aircraft_type?: string | null
          avatar_url?: string | null
          bio?: string | null
          certificate_type?: string | null
          created_at?: string | null
          display_name?: string | null
          flight_hours?: number | null
          profile_public?: boolean | null
          rating_focus?: string | null
          region?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      get_exam_percentile: {
        Args: {
          _exam_type: string
          _score: number
          _stress_mode?: boolean
          _total: number
        }
        Returns: {
          at_or_below: number
          percentile: number
          sample_size: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      log_missing_acs_code: { Args: { _code: string }; Returns: undefined }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      validate_seat_code: {
        Args: { _code: string }
        Returns: {
          expires_at: string
          reason: string
          school_name: string
          valid: boolean
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
