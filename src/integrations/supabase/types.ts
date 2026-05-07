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
      admin_audit_log: {
        Row: {
          action: string
          admin_email: string | null
          admin_user_id: string | null
          created_at: string
          details: Json | null
          id: string
          ip_address: string | null
          target_id: string | null
          target_type: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          admin_email?: string | null
          admin_user_id?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          target_id?: string | null
          target_type?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          admin_email?: string | null
          admin_user_id?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          target_id?: string | null
          target_type?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      ai_audit_queue: {
        Row: {
          ai_response: string
          attempts: number
          audit_completed_at: string | null
          audit_model: string | null
          audit_notes: string | null
          audit_started_at: string | null
          created_at: string
          id: string
          message_id: string | null
          pilot_context: Json | null
          primary_model: string
          session_id: string | null
          status: string
          task_type: string
          user_id: string | null
          user_prompt: string
        }
        Insert: {
          ai_response: string
          attempts?: number
          audit_completed_at?: string | null
          audit_model?: string | null
          audit_notes?: string | null
          audit_started_at?: string | null
          created_at?: string
          id?: string
          message_id?: string | null
          pilot_context?: Json | null
          primary_model: string
          session_id?: string | null
          status?: string
          task_type: string
          user_id?: string | null
          user_prompt: string
        }
        Update: {
          ai_response?: string
          attempts?: number
          audit_completed_at?: string | null
          audit_model?: string | null
          audit_notes?: string | null
          audit_started_at?: string | null
          created_at?: string
          id?: string
          message_id?: string | null
          pilot_context?: Json | null
          primary_model?: string
          session_id?: string | null
          status?: string
          task_type?: string
          user_id?: string | null
          user_prompt?: string
        }
        Relationships: []
      }
      ai_safety_flags: {
        Row: {
          audit_queue_id: string | null
          auditor_model: string
          category: string
          contradiction: string
          created_at: string
          id: string
          message_id: string | null
          poh_reference: string | null
          session_id: string | null
          severity: number
          user_id: string | null
        }
        Insert: {
          audit_queue_id?: string | null
          auditor_model: string
          category: string
          contradiction: string
          created_at?: string
          id?: string
          message_id?: string | null
          poh_reference?: string | null
          session_id?: string | null
          severity?: number
          user_id?: string | null
        }
        Update: {
          audit_queue_id?: string | null
          auditor_model?: string
          category?: string
          contradiction?: string
          created_at?: string
          id?: string
          message_id?: string | null
          poh_reference?: string | null
          session_id?: string | null
          severity?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_safety_flags_audit_queue_id_fkey"
            columns: ["audit_queue_id"]
            isOneToOne: false
            referencedRelation: "ai_audit_queue"
            referencedColumns: ["id"]
          },
        ]
      }
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
      email_otp_challenges: {
        Row: {
          attempts: number
          code_hash: string
          created_at: string
          expires_at: string
          id: string
          purpose: string
          used: boolean
          user_id: string
        }
        Insert: {
          attempts?: number
          code_hash: string
          created_at?: string
          expires_at: string
          id?: string
          purpose?: string
          used?: boolean
          user_id: string
        }
        Update: {
          attempts?: number
          code_hash?: string
          created_at?: string
          expires_at?: string
          id?: string
          purpose?: string
          used?: boolean
          user_id?: string
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
      error_events: {
        Row: {
          browser: string | null
          component_stack: string | null
          created_at: string
          endpoint: string | null
          environment: string
          fingerprint: string | null
          id: string
          level: string
          message: string
          metadata: Json | null
          os: string | null
          release: string | null
          route: string | null
          session_id: string | null
          source: string
          stack: string | null
          status_code: number | null
          url: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          browser?: string | null
          component_stack?: string | null
          created_at?: string
          endpoint?: string | null
          environment?: string
          fingerprint?: string | null
          id?: string
          level?: string
          message: string
          metadata?: Json | null
          os?: string | null
          release?: string | null
          route?: string | null
          session_id?: string | null
          source: string
          stack?: string | null
          status_code?: number | null
          url?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          browser?: string | null
          component_stack?: string | null
          created_at?: string
          endpoint?: string | null
          environment?: string
          fingerprint?: string | null
          id?: string
          level?: string
          message?: string
          metadata?: Json | null
          os?: string | null
          release?: string | null
          route?: string | null
          session_id?: string | null
          source?: string
          stack?: string | null
          status_code?: number | null
          url?: string | null
          user_agent?: string | null
          user_id?: string | null
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
          day_time: number
          departure: string | null
          destination: string | null
          dual_given_time: number
          dual_received_time: number
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
          solo_time: number
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
          day_time?: number
          departure?: string | null
          destination?: string | null
          dual_given_time?: number
          dual_received_time?: number
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
          solo_time?: number
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
          day_time?: number
          departure?: string | null
          destination?: string | null
          dual_given_time?: number
          dual_received_time?: number
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
          solo_time?: number
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
      intakes: {
        Row: {
          aircraft_type: string | null
          audience: string
          certificate_type: string | null
          contact_email: string
          contact_name: string
          created_at: string
          estimated_seats: number | null
          extras: Json
          flight_hours: number | null
          id: string
          phone: string | null
          preferred_start_date: string | null
          proficiency: string | null
          rating_focus: string | null
          region: string | null
          school_name: string | null
          status: string
          timeline: string | null
          training_goals: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          aircraft_type?: string | null
          audience: string
          certificate_type?: string | null
          contact_email: string
          contact_name: string
          created_at?: string
          estimated_seats?: number | null
          extras?: Json
          flight_hours?: number | null
          id?: string
          phone?: string | null
          preferred_start_date?: string | null
          proficiency?: string | null
          rating_focus?: string | null
          region?: string | null
          school_name?: string | null
          status?: string
          timeline?: string | null
          training_goals?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          aircraft_type?: string | null
          audience?: string
          certificate_type?: string | null
          contact_email?: string
          contact_name?: string
          created_at?: string
          estimated_seats?: number | null
          extras?: Json
          flight_hours?: number | null
          id?: string
          phone?: string | null
          preferred_start_date?: string | null
          proficiency?: string | null
          rating_focus?: string | null
          region?: string | null
          school_name?: string | null
          status?: string
          timeline?: string | null
          training_goals?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      kb_chunks: {
        Row: {
          chunk_index: number
          content: string
          created_at: string
          document_id: string
          embedding: string | null
          id: string
          page: number | null
          section: string | null
          source_label: string
        }
        Insert: {
          chunk_index: number
          content: string
          created_at?: string
          document_id: string
          embedding?: string | null
          id?: string
          page?: number | null
          section?: string | null
          source_label: string
        }
        Update: {
          chunk_index?: number
          content?: string
          created_at?: string
          document_id?: string
          embedding?: string | null
          id?: string
          page?: number | null
          section?: string | null
          source_label?: string
        }
        Relationships: [
          {
            foreignKeyName: "kb_chunks_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "kb_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      kb_documents: {
        Row: {
          chunk_count: number
          created_at: string
          error_message: string | null
          file_path: string
          id: string
          pages: number
          source_label: string
          status: string
          title: string
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          chunk_count?: number
          created_at?: string
          error_message?: string | null
          file_path: string
          id?: string
          pages?: number
          source_label: string
          status?: string
          title: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          chunk_count?: number
          created_at?: string
          error_message?: string | null
          file_path?: string
          id?: string
          pages?: number
          source_label?: string
          status?: string
          title?: string
          updated_at?: string
          uploaded_by?: string | null
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
      mock_oral_sessions: {
        Row: {
          created_at: string
          exam_type: string
          focus_area: string | null
          id: string
          notes: string | null
          scheduled_at: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          exam_type?: string
          focus_area?: string | null
          id?: string
          notes?: string | null
          scheduled_at: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          exam_type?: string
          focus_area?: string | null
          id?: string
          notes?: string | null
          scheduled_at?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      model_settings: {
        Row: {
          auditor_model: string
          guardrails_enabled: boolean
          id: number
          operational_model: string
          primary_model: string
          reviewer_enabled: boolean
          reviewer_model: string
          reviewer_scope: string
          shadow_audit_enabled: boolean
          technical_model: string
          updated_at: string
          vision_model: string
        }
        Insert: {
          auditor_model?: string
          guardrails_enabled?: boolean
          id?: number
          operational_model?: string
          primary_model?: string
          reviewer_enabled?: boolean
          reviewer_model?: string
          reviewer_scope?: string
          shadow_audit_enabled?: boolean
          technical_model?: string
          updated_at?: string
          vision_model?: string
        }
        Update: {
          auditor_model?: string
          guardrails_enabled?: boolean
          id?: number
          operational_model?: string
          primary_model?: string
          reviewer_enabled?: boolean
          reviewer_model?: string
          reviewer_scope?: string
          shadow_audit_enabled?: boolean
          technical_model?: string
          updated_at?: string
          vision_model?: string
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
          license_level: string | null
          profile_public: boolean
          quiz_history_limit: number
          rating_focus: string | null
          region: string | null
          school_seat_code_id: string | null
          subscription_expires_at: string | null
          subscription_source: string | null
          tail_number: string | null
          terms_agreed_at: string | null
          training_progress: Json
          trial_ends_at: string | null
          trial_started_at: string | null
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
          license_level?: string | null
          profile_public?: boolean
          quiz_history_limit?: number
          rating_focus?: string | null
          region?: string | null
          school_seat_code_id?: string | null
          subscription_expires_at?: string | null
          subscription_source?: string | null
          tail_number?: string | null
          terms_agreed_at?: string | null
          training_progress?: Json
          trial_ends_at?: string | null
          trial_started_at?: string | null
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
          license_level?: string | null
          profile_public?: boolean
          quiz_history_limit?: number
          rating_focus?: string | null
          region?: string | null
          school_seat_code_id?: string | null
          subscription_expires_at?: string | null
          subscription_source?: string | null
          tail_number?: string | null
          terms_agreed_at?: string | null
          training_progress?: Json
          trial_ends_at?: string | null
          trial_started_at?: string | null
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
      school_inquiries: {
        Row: {
          contact_email: string
          contact_name: string
          created_at: string
          estimated_seats: number | null
          id: string
          message: string | null
          phone: string | null
          preferred_start_date: string | null
          school_name: string
          status: string
          updated_at: string
        }
        Insert: {
          contact_email: string
          contact_name: string
          created_at?: string
          estimated_seats?: number | null
          id?: string
          message?: string | null
          phone?: string | null
          preferred_start_date?: string | null
          school_name: string
          status?: string
          updated_at?: string
        }
        Update: {
          contact_email?: string
          contact_name?: string
          created_at?: string
          estimated_seats?: number | null
          id?: string
          message?: string | null
          phone?: string | null
          preferred_start_date?: string | null
          school_name?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
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
          atc_guided_scenarios_enabled: boolean
          atc_live_frequency_enabled: boolean
          bing_site_verification: string
          bridge_direct_download_enabled: boolean
          chat_enabled: boolean
          google_search_console_property_url: string
          google_site_verification: string
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
          atc_guided_scenarios_enabled?: boolean
          atc_live_frequency_enabled?: boolean
          bing_site_verification?: string
          bridge_direct_download_enabled?: boolean
          chat_enabled?: boolean
          google_search_console_property_url?: string
          google_site_verification?: string
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
          atc_guided_scenarios_enabled?: boolean
          atc_live_frequency_enabled?: boolean
          bing_site_verification?: string
          bridge_direct_download_enabled?: boolean
          chat_enabled?: boolean
          google_search_console_property_url?: string
          google_site_verification?: string
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
      topic_quiz_attempts: {
        Row: {
          archived_at: string | null
          certificate_level: string | null
          created_at: string
          id: string
          passed: boolean
          questions: Json
          score: number
          session_id: string | null
          topic_id: string
          total: number
          user_id: string
        }
        Insert: {
          archived_at?: string | null
          certificate_level?: string | null
          created_at?: string
          id?: string
          passed: boolean
          questions?: Json
          score: number
          session_id?: string | null
          topic_id: string
          total: number
          user_id: string
        }
        Update: {
          archived_at?: string | null
          certificate_level?: string | null
          created_at?: string
          id?: string
          passed?: boolean
          questions?: Json
          score?: number
          session_id?: string | null
          topic_id?: string
          total?: number
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
      user_comp_grants: {
        Row: {
          created_at: string
          expires_at: string | null
          granted_by: string | null
          granted_by_email: string | null
          id: string
          plan_tier: string
          reason: string | null
          revoked_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          granted_by?: string | null
          granted_by_email?: string | null
          id?: string
          plan_tier: string
          reason?: string | null
          revoked_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          granted_by?: string | null
          granted_by_email?: string | null
          id?: string
          plan_tier?: string
          reason?: string | null
          revoked_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_mfa_settings: {
        Row: {
          created_at: string
          email_otp_enabled: boolean
          preferred_method: string
          recovery_codes_generated_at: string | null
          recovery_codes_hashed: string[]
          totp_enrolled: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email_otp_enabled?: boolean
          preferred_method?: string
          recovery_codes_generated_at?: string | null
          recovery_codes_hashed?: string[]
          totp_enrolled?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email_otp_enabled?: boolean
          preferred_method?: string
          recovery_codes_generated_at?: string | null
          recovery_codes_hashed?: string[]
          totp_enrolled?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      match_kb_chunks: {
        Args: {
          match_count?: number
          query_embedding: string
          similarity_threshold?: number
        }
        Returns: {
          content: string
          document_id: string
          id: string
          page: number
          section: string
          similarity: number
          source_label: string
        }[]
      }
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
      user_requires_mfa: { Args: { _user_id: string }; Returns: boolean }
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
