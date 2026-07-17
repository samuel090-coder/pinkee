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
      ad_codes: {
        Row: {
          code: string
          created_at: string
          id: string
          is_active: boolean | null
          name: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          name?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          name?: string
        }
        Relationships: []
      }
      admin_settings: {
        Row: {
          ad_code: string | null
          admin_password: string | null
          bank_account_name: string | null
          bank_account_number: string | null
          bank_name: string | null
          created_at: string
          default_ad_frequency: number | null
          guest_browsing_enabled: boolean
          id: string
          movies_enabled: boolean
          platform_fee_percent: number | null
          site_name: string | null
          subscription_monthly_price: number | null
          subscription_yearly_price: number | null
          updated_at: string
          youtube_channel_id: string | null
          youtube_enabled: boolean
        }
        Insert: {
          ad_code?: string | null
          admin_password?: string | null
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_name?: string | null
          created_at?: string
          default_ad_frequency?: number | null
          guest_browsing_enabled?: boolean
          id?: string
          movies_enabled?: boolean
          platform_fee_percent?: number | null
          site_name?: string | null
          subscription_monthly_price?: number | null
          subscription_yearly_price?: number | null
          updated_at?: string
          youtube_channel_id?: string | null
          youtube_enabled?: boolean
        }
        Update: {
          ad_code?: string | null
          admin_password?: string | null
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_name?: string | null
          created_at?: string
          default_ad_frequency?: number | null
          guest_browsing_enabled?: boolean
          id?: string
          movies_enabled?: boolean
          platform_fee_percent?: number | null
          site_name?: string | null
          subscription_monthly_price?: number | null
          subscription_yearly_price?: number | null
          updated_at?: string
          youtube_channel_id?: string | null
          youtube_enabled?: boolean
        }
        Relationships: []
      }
      artist_earnings: {
        Row: {
          artist_id: string
          created_at: string
          id: string
          last_payout_at: string | null
          pending_withdrawal: number
          total_earned: number
          track_id: string
          updated_at: string
          usage_count: number
        }
        Insert: {
          artist_id: string
          created_at?: string
          id?: string
          last_payout_at?: string | null
          pending_withdrawal?: number
          total_earned?: number
          track_id: string
          updated_at?: string
          usage_count?: number
        }
        Update: {
          artist_id?: string
          created_at?: string
          id?: string
          last_payout_at?: string | null
          pending_withdrawal?: number
          total_earned?: number
          track_id?: string
          updated_at?: string
          usage_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "artist_earnings_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "music_tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      comment_likes: {
        Row: {
          comment_id: string
          created_at: string
          id: string
          is_like: boolean
          user_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string
          id?: string
          is_like: boolean
          user_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string
          id?: string
          is_like?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comment_likes_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          content: string
          created_at: string
          id: string
          is_edited: boolean | null
          is_hearted: boolean | null
          is_pinned: boolean | null
          likes_count: number | null
          parent_id: string | null
          updated_at: string
          user_id: string
          video_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_edited?: boolean | null
          is_hearted?: boolean | null
          is_pinned?: boolean | null
          likes_count?: number | null
          parent_id?: string | null
          updated_at?: string
          user_id: string
          video_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_edited?: boolean | null
          is_hearted?: boolean | null
          is_pinned?: boolean | null
          likes_count?: number | null
          parent_id?: string | null
          updated_at?: string
          user_id?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      content_strikes: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          issued_by: string | null
          reason: string
          severity: string | null
          user_id: string
          video_id: string | null
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          issued_by?: string | null
          reason: string
          severity?: string | null
          user_id: string
          video_id?: string | null
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          issued_by?: string | null
          reason?: string
          severity?: string | null
          user_id?: string
          video_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_strikes_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_earnings: {
        Row: {
          created_at: string
          creator_id: string
          id: string
          last_payout_at: string | null
          pending_withdrawal: number
          total_earned: number
          updated_at: string
          video_id: string
          views_counted: number
        }
        Insert: {
          created_at?: string
          creator_id: string
          id?: string
          last_payout_at?: string | null
          pending_withdrawal?: number
          total_earned?: number
          updated_at?: string
          video_id: string
          views_counted?: number
        }
        Update: {
          created_at?: string
          creator_id?: string
          id?: string
          last_payout_at?: string | null
          pending_withdrawal?: number
          total_earned?: number
          updated_at?: string
          video_id?: string
          views_counted?: number
        }
        Relationships: [
          {
            foreignKeyName: "creator_earnings_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_requests: {
        Row: {
          admin_notes: string | null
          created_at: string
          id: string
          portfolio_url: string | null
          reason: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          id?: string
          portfolio_url?: string | null
          reason: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          id?: string
          portfolio_url?: string | null
          reason?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      creator_tips: {
        Row: {
          amount: number
          color_tier: string | null
          created_at: string
          creator_amount: number
          from_user_id: string
          id: string
          is_super_chat: boolean
          message: string | null
          platform_fee: number
          to_creator_id: string
          video_id: string | null
        }
        Insert: {
          amount: number
          color_tier?: string | null
          created_at?: string
          creator_amount: number
          from_user_id: string
          id?: string
          is_super_chat?: boolean
          message?: string | null
          platform_fee?: number
          to_creator_id: string
          video_id?: string | null
        }
        Update: {
          amount?: number
          color_tier?: string | null
          created_at?: string
          creator_amount?: number
          from_user_id?: string
          id?: string
          is_super_chat?: boolean
          message?: string | null
          platform_fee?: number
          to_creator_id?: string
          video_id?: string | null
        }
        Relationships: []
      }
      creator_withdrawals: {
        Row: {
          account_name: string | null
          account_number: string | null
          admin_notes: string | null
          amount: number
          bank_name: string | null
          created_at: string
          creator_id: string
          id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          account_name?: string | null
          account_number?: string | null
          admin_notes?: string | null
          amount: number
          bank_name?: string | null
          created_at?: string
          creator_id: string
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          account_name?: string | null
          account_number?: string | null
          admin_notes?: string | null
          amount?: number
          bank_name?: string | null
          created_at?: string
          creator_id?: string
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      deposit_requests: {
        Row: {
          admin_notes: string | null
          amount: number
          created_at: string
          id: string
          reviewed_at: string | null
          reviewed_by: string | null
          screenshot_url: string | null
          status: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          amount: number
          created_at?: string
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          screenshot_url?: string | null
          status?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          amount?: number
          created_at?: string
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          screenshot_url?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      music_licenses: {
        Row: {
          buyer_id: string
          created_at: string
          id: string
          license_type: string
          price_paid: number
          track_id: string
          transaction_id: string | null
        }
        Insert: {
          buyer_id: string
          created_at?: string
          id?: string
          license_type: string
          price_paid: number
          track_id: string
          transaction_id?: string | null
        }
        Update: {
          buyer_id?: string
          created_at?: string
          id?: string
          license_type?: string
          price_paid?: number
          track_id?: string
          transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "music_licenses_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "music_tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      music_tracks: {
        Row: {
          account_name: string | null
          account_number: string | null
          artist_name: string | null
          audio_url: string
          bank_name: string | null
          bpm: number | null
          cover_url: string | null
          created_at: string
          creator_id: string
          description: string | null
          downloads_count: number | null
          duration: number | null
          genre: string | null
          id: string
          is_published: boolean | null
          key: string | null
          license_type: string
          price: number
          title: string
          updated_at: string
        }
        Insert: {
          account_name?: string | null
          account_number?: string | null
          artist_name?: string | null
          audio_url: string
          bank_name?: string | null
          bpm?: number | null
          cover_url?: string | null
          created_at?: string
          creator_id: string
          description?: string | null
          downloads_count?: number | null
          duration?: number | null
          genre?: string | null
          id?: string
          is_published?: boolean | null
          key?: string | null
          license_type?: string
          price?: number
          title: string
          updated_at?: string
        }
        Update: {
          account_name?: string | null
          account_number?: string | null
          artist_name?: string | null
          audio_url?: string
          bank_name?: string | null
          bpm?: number | null
          cover_url?: string | null
          created_at?: string
          creator_id?: string
          description?: string | null
          downloads_count?: number | null
          duration?: number | null
          genre?: string | null
          id?: string
          is_published?: boolean | null
          key?: string | null
          license_type?: string
          price?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          id: string
          image_url: string | null
          is_sent: boolean | null
          link: string | null
          sent_at: string | null
          title: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          image_url?: string | null
          is_sent?: boolean | null
          link?: string | null
          sent_at?: string | null
          title: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          image_url?: string | null
          is_sent?: boolean | null
          link?: string | null
          sent_at?: string | null
          title?: string
        }
        Relationships: []
      }
      page_views: {
        Row: {
          created_at: string
          device: string | null
          id: string
          path: string
          referrer: string | null
          session_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          device?: string | null
          id?: string
          path: string
          referrer?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          device?: string | null
          id?: string
          path?: string
          referrer?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      playlist_items: {
        Row: {
          added_at: string
          id: string
          playlist_id: string
          position: number
          video_id: string
        }
        Insert: {
          added_at?: string
          id?: string
          playlist_id: string
          position: number
          video_id: string
        }
        Update: {
          added_at?: string
          id?: string
          playlist_id?: string
          position?: number
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "playlist_items_playlist_id_fkey"
            columns: ["playlist_id"]
            isOneToOne: false
            referencedRelation: "playlists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "playlist_items_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      playlists: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_public: boolean | null
          thumbnail_url: string | null
          title: string
          updated_at: string
          user_id: string
          video_count: number | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          user_id: string
          video_count?: number | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          user_id?: string
          video_count?: number | null
        }
        Relationships: []
      }
      poster_profiles: {
        Row: {
          address: string | null
          avatar_url: string | null
          bio: string | null
          created_at: string
          email: string | null
          hobbies: string | null
          id: string
          name: string
          telegram: string | null
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          email?: string | null
          hobbies?: string | null
          id?: string
          name: string
          telegram?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          email?: string | null
          hobbies?: string | null
          id?: string
          name?: string
          telegram?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      premium_subscriptions: {
        Row: {
          amount: number
          created_at: string
          expires_at: string
          id: string
          is_active: boolean
          plan: string
          starts_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          expires_at: string
          id?: string
          is_active?: boolean
          plan?: string
          starts_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          expires_at?: string
          id?: string
          is_active?: boolean
          plan?: string
          starts_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          account_name: string | null
          account_number: string | null
          avatar_url: string | null
          bank_name: string | null
          banner_url: string | null
          bio: string | null
          channel_description: string | null
          channel_name: string | null
          created_at: string
          date_of_birth: string | null
          display_name: string | null
          id: string
          is_channel: boolean | null
          is_verified: boolean | null
          joined_at: string | null
          last_active: string | null
          location: string | null
          phone: string | null
          subscriber_count: number | null
          total_views: number | null
          updated_at: string
          user_id: string
          username: string | null
          website: string | null
        }
        Insert: {
          account_name?: string | null
          account_number?: string | null
          avatar_url?: string | null
          bank_name?: string | null
          banner_url?: string | null
          bio?: string | null
          channel_description?: string | null
          channel_name?: string | null
          created_at?: string
          date_of_birth?: string | null
          display_name?: string | null
          id?: string
          is_channel?: boolean | null
          is_verified?: boolean | null
          joined_at?: string | null
          last_active?: string | null
          location?: string | null
          phone?: string | null
          subscriber_count?: number | null
          total_views?: number | null
          updated_at?: string
          user_id: string
          username?: string | null
          website?: string | null
        }
        Update: {
          account_name?: string | null
          account_number?: string | null
          avatar_url?: string | null
          bank_name?: string | null
          banner_url?: string | null
          bio?: string | null
          channel_description?: string | null
          channel_name?: string | null
          created_at?: string
          date_of_birth?: string | null
          display_name?: string | null
          id?: string
          is_channel?: boolean | null
          is_verified?: boolean | null
          joined_at?: string | null
          last_active?: string | null
          location?: string | null
          phone?: string | null
          subscriber_count?: number | null
          total_views?: number | null
          updated_at?: string
          user_id?: string
          username?: string | null
          website?: string | null
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          code: string
          created_at: string
          id: string
          referred_id: string
          referrer_id: string
          rewarded_at: string | null
          status: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          referred_id: string
          referrer_id: string
          rewarded_at?: string | null
          status?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          referred_id?: string
          referrer_id?: string
          rewarded_at?: string | null
          status?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          channel_id: string | null
          comment_id: string | null
          created_at: string
          description: string | null
          id: string
          reason: string
          reporter_id: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
          video_id: string | null
        }
        Insert: {
          channel_id?: string | null
          comment_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          reason: string
          reporter_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          video_id?: string | null
        }
        Update: {
          channel_id?: string | null
          comment_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          reason?: string
          reporter_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          video_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reports_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      reward_activities: {
        Row: {
          category: string
          code: string
          cooldown_seconds: number
          created_at: string
          daily_cap: number | null
          description: string | null
          enabled: boolean
          icon: string | null
          id: string
          name: string
          points: number
          sort_order: number
          total_cap: number | null
          updated_at: string
        }
        Insert: {
          category?: string
          code: string
          cooldown_seconds?: number
          created_at?: string
          daily_cap?: number | null
          description?: string | null
          enabled?: boolean
          icon?: string | null
          id?: string
          name: string
          points?: number
          sort_order?: number
          total_cap?: number | null
          updated_at?: string
        }
        Update: {
          category?: string
          code?: string
          cooldown_seconds?: number
          created_at?: string
          daily_cap?: number | null
          description?: string | null
          enabled?: boolean
          icon?: string | null
          id?: string
          name?: string
          points?: number
          sort_order?: number
          total_cap?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      reward_ledger: {
        Row: {
          activity_code: string | null
          created_at: string
          description: string | null
          device_fingerprint: string | null
          id: string
          idempotency_key: string | null
          ip_address: string | null
          metadata: Json
          mission_id: string | null
          points: number
          reviewed_at: string | null
          reviewed_by: string | null
          source: string
          status: Database["public"]["Enums"]["reward_status"]
          user_id: string
        }
        Insert: {
          activity_code?: string | null
          created_at?: string
          description?: string | null
          device_fingerprint?: string | null
          id?: string
          idempotency_key?: string | null
          ip_address?: string | null
          metadata?: Json
          mission_id?: string | null
          points: number
          reviewed_at?: string | null
          reviewed_by?: string | null
          source?: string
          status?: Database["public"]["Enums"]["reward_status"]
          user_id: string
        }
        Update: {
          activity_code?: string | null
          created_at?: string
          description?: string | null
          device_fingerprint?: string | null
          id?: string
          idempotency_key?: string | null
          ip_address?: string | null
          metadata?: Json
          mission_id?: string | null
          points?: number
          reviewed_at?: string | null
          reviewed_by?: string | null
          source?: string
          status?: Database["public"]["Enums"]["reward_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reward_ledger_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "reward_missions"
            referencedColumns: ["id"]
          },
        ]
      }
      reward_missions: {
        Row: {
          activity_code: string | null
          code: string
          created_at: string
          description: string | null
          enabled: boolean
          ends_at: string | null
          icon: string | null
          id: string
          period: Database["public"]["Enums"]["mission_period"]
          reward_points: number
          sort_order: number
          starts_at: string | null
          target_count: number
          title: string
          updated_at: string
        }
        Insert: {
          activity_code?: string | null
          code: string
          created_at?: string
          description?: string | null
          enabled?: boolean
          ends_at?: string | null
          icon?: string | null
          id?: string
          period?: Database["public"]["Enums"]["mission_period"]
          reward_points?: number
          sort_order?: number
          starts_at?: string | null
          target_count?: number
          title: string
          updated_at?: string
        }
        Update: {
          activity_code?: string | null
          code?: string
          created_at?: string
          description?: string | null
          enabled?: boolean
          ends_at?: string | null
          icon?: string | null
          id?: string
          period?: Database["public"]["Enums"]["mission_period"]
          reward_points?: number
          sort_order?: number
          starts_at?: string | null
          target_count?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      reward_redemptions: {
        Row: {
          created_at: string
          id: string
          ngn_amount: number
          notes: string | null
          points: number
          processed_at: string | null
          status: Database["public"]["Enums"]["redemption_status"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          ngn_amount: number
          notes?: string | null
          points: number
          processed_at?: string | null
          status?: Database["public"]["Enums"]["redemption_status"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          ngn_amount?: number
          notes?: string | null
          points?: number
          processed_at?: string | null
          status?: Database["public"]["Enums"]["redemption_status"]
          user_id?: string
        }
        Relationships: []
      }
      reward_settings: {
        Row: {
          daily_checkin_ngn: number
          daily_checkin_points: number
          enabled: boolean
          id: boolean
          max_points_per_ip_per_day: number
          max_points_per_user_per_day: number
          min_redemption_points: number
          ngn_per_point: number
          referral_points_referred: number
          referral_points_referrer: number
          require_email_verified: boolean
          streak_bonus_every: number
          streak_bonus_ngn_100: number
          streak_bonus_ngn_30: number
          streak_bonus_ngn_7: number
          streak_bonus_points: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          daily_checkin_ngn?: number
          daily_checkin_points?: number
          enabled?: boolean
          id?: boolean
          max_points_per_ip_per_day?: number
          max_points_per_user_per_day?: number
          min_redemption_points?: number
          ngn_per_point?: number
          referral_points_referred?: number
          referral_points_referrer?: number
          require_email_verified?: boolean
          streak_bonus_every?: number
          streak_bonus_ngn_100?: number
          streak_bonus_ngn_30?: number
          streak_bonus_ngn_7?: number
          streak_bonus_points?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          daily_checkin_ngn?: number
          daily_checkin_points?: number
          enabled?: boolean
          id?: boolean
          max_points_per_ip_per_day?: number
          max_points_per_user_per_day?: number
          min_redemption_points?: number
          ngn_per_point?: number
          referral_points_referred?: number
          referral_points_referrer?: number
          require_email_verified?: boolean
          streak_bonus_every?: number
          streak_bonus_ngn_100?: number
          streak_bonus_ngn_30?: number
          streak_bonus_ngn_7?: number
          streak_bonus_points?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      seed_comments: {
        Row: {
          avatar_url: string | null
          content: string
          created_at: string
          display_name: string
          id: string
          likes_count: number
          video_id: string
        }
        Insert: {
          avatar_url?: string | null
          content: string
          created_at?: string
          display_name: string
          id?: string
          likes_count?: number
          video_id: string
        }
        Update: {
          avatar_url?: string | null
          content?: string
          created_at?: string
          display_name?: string
          id?: string
          likes_count?: number
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "seed_comments_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      sound_purchase_requests: {
        Row: {
          admin_notes: string | null
          amount: number
          buyer_id: string
          created_at: string
          id: string
          reviewed_at: string | null
          screenshot_url: string | null
          seller_id: string
          status: string
          track_id: string
        }
        Insert: {
          admin_notes?: string | null
          amount: number
          buyer_id: string
          created_at?: string
          id?: string
          reviewed_at?: string | null
          screenshot_url?: string | null
          seller_id: string
          status?: string
          track_id: string
        }
        Update: {
          admin_notes?: string | null
          amount?: number
          buyer_id?: string
          created_at?: string
          id?: string
          reviewed_at?: string | null
          screenshot_url?: string | null
          seller_id?: string
          status?: string
          track_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sound_purchase_requests_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "music_tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      sound_usages: {
        Row: {
          created_at: string
          creator_id: string
          id: string
          track_id: string
          video_id: string
        }
        Insert: {
          created_at?: string
          creator_id: string
          id?: string
          track_id: string
          video_id: string
        }
        Update: {
          created_at?: string
          creator_id?: string
          id?: string
          track_id?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sound_usages_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "music_tracks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sound_usages_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      stream_failures: {
        Row: {
          created_at: string
          embed_url: string | null
          episode: number | null
          error_reason: string | null
          id: string
          media_type: string
          season: number | null
          server_name: string
          tmdb_id: number
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          embed_url?: string | null
          episode?: number | null
          error_reason?: string | null
          id?: string
          media_type: string
          season?: number | null
          server_name: string
          tmdb_id: number
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          embed_url?: string | null
          episode?: number | null
          error_reason?: string | null
          id?: string
          media_type?: string
          season?: number | null
          server_name?: string
          tmdb_id?: number
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          channel_id: string
          created_at: string
          id: string
          notifications_enabled: boolean | null
          subscriber_id: string
        }
        Insert: {
          channel_id: string
          created_at?: string
          id?: string
          notifications_enabled?: boolean | null
          subscriber_id: string
        }
        Update: {
          channel_id?: string
          created_at?: string
          id?: string
          notifications_enabled?: boolean | null
          subscriber_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      support_conversations: {
        Row: {
          created_at: string
          id: string
          last_message_at: string
          unread_admin: number
          unread_user: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_message_at?: string
          unread_admin?: number
          unread_user?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_message_at?: string
          unread_admin?: number
          unread_user?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      support_messages: {
        Row: {
          content: string | null
          conversation_id: string
          created_at: string
          id: string
          image_url: string | null
          is_ai_generated: boolean
          sender: string
        }
        Insert: {
          content?: string | null
          conversation_id: string
          created_at?: string
          id?: string
          image_url?: string | null
          is_ai_generated?: boolean
          sender: string
        }
        Update: {
          content?: string | null
          conversation_id?: string
          created_at?: string
          id?: string
          image_url?: string | null
          is_ai_generated?: boolean
          sender?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "support_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      support_settings: {
        Row: {
          ai_enabled: boolean
          id: string
          updated_at: string
        }
        Insert: {
          ai_enabled?: boolean
          id?: string
          updated_at?: string
        }
        Update: {
          ai_enabled?: boolean
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_interests: {
        Row: {
          category: string
          created_at: string
          id: string
          user_id: string
          weight: number | null
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          user_id: string
          weight?: number | null
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          user_id?: string
          weight?: number | null
        }
        Relationships: []
      }
      user_mission_progress: {
        Row: {
          claimed_at: string | null
          completed_at: string | null
          created_at: string
          id: string
          mission_id: string
          period_key: string
          progress: number
          updated_at: string
          user_id: string
        }
        Insert: {
          claimed_at?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          mission_id: string
          period_key: string
          progress?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          claimed_at?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          mission_id?: string
          period_key?: string
          progress?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_mission_progress_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "reward_missions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_notifications: {
        Row: {
          body: string
          created_at: string
          id: string
          image_url: string | null
          is_read: boolean
          link: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          image_url?: string | null
          is_read?: boolean
          link?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          image_url?: string | null
          is_read?: boolean
          link?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      user_rewards: {
        Row: {
          created_at: string
          current_streak: number
          flag_reason: string | null
          flagged: boolean
          last_checkin_at: string | null
          lifetime_ngn: number
          lifetime_points: number
          longest_streak: number
          points_balance: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_streak?: number
          flag_reason?: string | null
          flagged?: boolean
          last_checkin_at?: string | null
          lifetime_ngn?: number
          lifetime_points?: number
          longest_streak?: number
          points_balance?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_streak?: number
          flag_reason?: string | null
          flagged?: boolean
          last_checkin_at?: string | null
          lifetime_ngn?: number
          lifetime_points?: number
          longest_streak?: number
          points_balance?: number
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
          role?: Database["public"]["Enums"]["app_role"]
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
      user_settings: {
        Row: {
          autoplay: boolean | null
          created_at: string
          currency: string
          default_quality: string | null
          email_notifications: boolean | null
          hide_weekly_digest: boolean
          id: string
          language: string | null
          playback_speed: number | null
          push_notifications: boolean | null
          restricted_mode: boolean | null
          show_liked_videos: boolean | null
          show_watch_history: boolean | null
          theme: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          autoplay?: boolean | null
          created_at?: string
          currency?: string
          default_quality?: string | null
          email_notifications?: boolean | null
          hide_weekly_digest?: boolean
          id?: string
          language?: string | null
          playback_speed?: number | null
          push_notifications?: boolean | null
          restricted_mode?: boolean | null
          show_liked_videos?: boolean | null
          show_watch_history?: boolean | null
          theme?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          autoplay?: boolean | null
          created_at?: string
          currency?: string
          default_quality?: string | null
          email_notifications?: boolean | null
          hide_weekly_digest?: boolean
          id?: string
          language?: string | null
          playback_speed?: number | null
          push_notifications?: boolean | null
          restricted_mode?: boolean | null
          show_liked_videos?: boolean | null
          show_watch_history?: boolean | null
          theme?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      video_likes: {
        Row: {
          created_at: string
          id: string
          is_like: boolean
          user_id: string
          video_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_like: boolean
          user_id: string
          video_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_like?: boolean
          user_id?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_likes_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      video_purchases: {
        Row: {
          amount: number
          created_at: string
          id: string
          user_id: string
          video_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          user_id: string
          video_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          user_id?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_purchases_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      video_watch_events: {
        Row: {
          completed: boolean
          created_at: string
          id: string
          media_type: string | null
          percent_watched: number | null
          reached_threshold: boolean
          session_id: string | null
          title: string | null
          tmdb_id: number | null
          total_seconds: number | null
          user_id: string | null
          video_id: string | null
          watched_seconds: number
        }
        Insert: {
          completed?: boolean
          created_at?: string
          id?: string
          media_type?: string | null
          percent_watched?: number | null
          reached_threshold?: boolean
          session_id?: string | null
          title?: string | null
          tmdb_id?: number | null
          total_seconds?: number | null
          user_id?: string | null
          video_id?: string | null
          watched_seconds?: number
        }
        Update: {
          completed?: boolean
          created_at?: string
          id?: string
          media_type?: string | null
          percent_watched?: number | null
          reached_threshold?: boolean
          session_id?: string | null
          title?: string | null
          tmdb_id?: number | null
          total_seconds?: number | null
          user_id?: string | null
          video_id?: string | null
          watched_seconds?: number
        }
        Relationships: []
      }
      videos: {
        Row: {
          ad_frequency: number | null
          category: string | null
          comments_count: number | null
          created_at: string
          cta_link: string | null
          cta_text: string | null
          description: string | null
          dislikes_count: number | null
          duration: number | null
          id: string
          is_premium: boolean | null
          is_published: boolean | null
          is_subscription_only: boolean | null
          likes_count: number | null
          poster_id: string | null
          premium_price: number | null
          published_at: string | null
          reactions: number | null
          status: string | null
          tags: string[] | null
          thumbnail_alt: string | null
          thumbnail_b: string | null
          thumbnail_url: string | null
          title: string
          updated_at: string
          uploader_id: string | null
          video_url: string | null
          views: number | null
          watch_time: number | null
        }
        Insert: {
          ad_frequency?: number | null
          category?: string | null
          comments_count?: number | null
          created_at?: string
          cta_link?: string | null
          cta_text?: string | null
          description?: string | null
          dislikes_count?: number | null
          duration?: number | null
          id?: string
          is_premium?: boolean | null
          is_published?: boolean | null
          is_subscription_only?: boolean | null
          likes_count?: number | null
          poster_id?: string | null
          premium_price?: number | null
          published_at?: string | null
          reactions?: number | null
          status?: string | null
          tags?: string[] | null
          thumbnail_alt?: string | null
          thumbnail_b?: string | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          uploader_id?: string | null
          video_url?: string | null
          views?: number | null
          watch_time?: number | null
        }
        Update: {
          ad_frequency?: number | null
          category?: string | null
          comments_count?: number | null
          created_at?: string
          cta_link?: string | null
          cta_text?: string | null
          description?: string | null
          dislikes_count?: number | null
          duration?: number | null
          id?: string
          is_premium?: boolean | null
          is_published?: boolean | null
          is_subscription_only?: boolean | null
          likes_count?: number | null
          poster_id?: string | null
          premium_price?: number | null
          published_at?: string | null
          reactions?: number | null
          status?: string | null
          tags?: string[] | null
          thumbnail_alt?: string | null
          thumbnail_b?: string | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          uploader_id?: string | null
          video_url?: string | null
          views?: number | null
          watch_time?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "videos_poster_id_fkey"
            columns: ["poster_id"]
            isOneToOne: false
            referencedRelation: "poster_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      wallet_transactions: {
        Row: {
          amount: number
          balance_after: number
          created_at: string
          description: string | null
          id: string
          reference_id: string | null
          status: string
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          balance_after: number
          created_at?: string
          description?: string | null
          id?: string
          reference_id?: string | null
          status?: string
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          balance_after?: number
          created_at?: string
          description?: string | null
          id?: string
          reference_id?: string | null
          status?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      wallets: {
        Row: {
          balance: number
          created_at: string
          id: string
          total_deposited: number
          total_spent: number
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string
          id?: string
          total_deposited?: number
          total_spent?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          id?: string
          total_deposited?: number
          total_spent?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      watch_history: {
        Row: {
          completed: boolean | null
          id: string
          last_position: number | null
          user_id: string
          video_id: string
          watch_duration: number | null
          watched_at: string
        }
        Insert: {
          completed?: boolean | null
          id?: string
          last_position?: number | null
          user_id: string
          video_id: string
          watch_duration?: number | null
          watched_at?: string
        }
        Update: {
          completed?: boolean | null
          id?: string
          last_position?: number | null
          user_id?: string
          video_id?: string
          watch_duration?: number | null
          watched_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "watch_history_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      watch_parties: {
        Row: {
          ai_seed_enabled: boolean
          ai_viewer_count: number
          content_poster: string | null
          content_ref: string
          content_title: string | null
          content_type: string
          created_at: string
          current_time_seconds: number
          ended_at: string | null
          expires_at: string | null
          host_id: string
          id: string
          is_active: boolean
          is_playing: boolean
          is_public: boolean
          last_ai_seed_at: string | null
          last_sync_at: string
          participant_count: number
          short_code: string | null
          title: string
          updated_at: string
        }
        Insert: {
          ai_seed_enabled?: boolean
          ai_viewer_count?: number
          content_poster?: string | null
          content_ref: string
          content_title?: string | null
          content_type: string
          created_at?: string
          current_time_seconds?: number
          ended_at?: string | null
          expires_at?: string | null
          host_id: string
          id?: string
          is_active?: boolean
          is_playing?: boolean
          is_public?: boolean
          last_ai_seed_at?: string | null
          last_sync_at?: string
          participant_count?: number
          short_code?: string | null
          title?: string
          updated_at?: string
        }
        Update: {
          ai_seed_enabled?: boolean
          ai_viewer_count?: number
          content_poster?: string | null
          content_ref?: string
          content_title?: string | null
          content_type?: string
          created_at?: string
          current_time_seconds?: number
          ended_at?: string | null
          expires_at?: string | null
          host_id?: string
          id?: string
          is_active?: boolean
          is_playing?: boolean
          is_public?: boolean
          last_ai_seed_at?: string | null
          last_sync_at?: string
          participant_count?: number
          short_code?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      watch_party_ai_comments: {
        Row: {
          avatar_seed: string
          content: string
          created_at: string
          display_name: string
          emoji: string | null
          id: string
          message_type: string
          party_id: string
        }
        Insert: {
          avatar_seed: string
          content: string
          created_at?: string
          display_name: string
          emoji?: string | null
          id?: string
          message_type?: string
          party_id: string
        }
        Update: {
          avatar_seed?: string
          content?: string
          created_at?: string
          display_name?: string
          emoji?: string | null
          id?: string
          message_type?: string
          party_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "watch_party_ai_comments_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "watch_parties"
            referencedColumns: ["id"]
          },
        ]
      }
      watch_party_messages: {
        Row: {
          content: string
          created_at: string
          emoji: string | null
          id: string
          message_type: string
          party_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          emoji?: string | null
          id?: string
          message_type?: string
          party_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          emoji?: string | null
          id?: string
          message_type?: string
          party_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "watch_party_messages_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "watch_parties"
            referencedColumns: ["id"]
          },
        ]
      }
      watch_party_participants: {
        Row: {
          id: string
          joined_at: string
          left_at: string | null
          party_id: string
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          left_at?: string | null
          party_id: string
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          left_at?: string | null
          party_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "watch_party_participants_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "watch_parties"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_digests: {
        Row: {
          content: Json
          id: string
          opened_at: string | null
          sent_at: string
          user_id: string
          week_key: string
        }
        Insert: {
          content: Json
          id?: string
          opened_at?: string | null
          sent_at?: string
          user_id: string
          week_key: string
        }
        Update: {
          content?: Json
          id?: string
          opened_at?: string | null
          sent_at?: string
          user_id?: string
          week_key?: string
        }
        Relationships: []
      }
      withdrawal_requests: {
        Row: {
          account_name: string | null
          account_number: string | null
          admin_notes: string | null
          amount: number
          artist_id: string
          bank_name: string | null
          created_at: string
          id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          account_name?: string | null
          account_number?: string | null
          admin_notes?: string | null
          amount: number
          artist_id: string
          bank_name?: string | null
          created_at?: string
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          account_name?: string | null
          account_number?: string | null
          admin_notes?: string | null
          amount?: number
          artist_id?: string
          bank_name?: string | null
          created_at?: string
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      boost_new_video_engagement: { Args: never; Returns: undefined }
      claim_activity: {
        Args: {
          _activity_code: string
          _device?: string
          _idempotency?: string
          _metadata?: Json
        }
        Returns: Json
      }
      claim_daily_checkin: { Args: { _device?: string }; Returns: Json }
      claim_daily_wallet_checkin: { Args: never; Returns: Json }
      claim_mission_reward: { Args: { _mission_id: string }; Returns: Json }
      credit_reward_points: {
        Args: {
          _activity_code: string
          _description: string
          _device: string
          _idempotency: string
          _ip: string
          _metadata: Json
          _mission_id: string
          _points: number
          _source: string
          _user: string
        }
        Returns: Json
      }
      ensure_user_rewards: { Args: { _user: string }; Returns: undefined }
      expire_watch_parties: { Args: never; Returns: number }
      generate_party_short_code: { Args: never; Returns: string }
      get_public_profile_by_email: {
        Args: { _email: string }
        Returns: {
          avatar_url: string
          display_name: string
          username: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_mission_progress: {
        Args: { _activity_code: string; _amount?: number }
        Returns: Json
      }
      is_moderator: { Args: { _user_id: string }; Returns: boolean }
      mission_period_key: {
        Args: {
          _at?: string
          _period: Database["public"]["Enums"]["mission_period"]
        }
        Returns: string
      }
      process_wallet_payment: {
        Args: {
          p_amount: number
          p_description: string
          p_reference_id?: string
          p_type: string
          p_user_id: string
        }
        Returns: boolean
      }
      redeem_points_to_wallet: { Args: { _points: number }; Returns: Json }
      register_referral: { Args: { _code: string }; Returns: Json }
      send_creator_tip: {
        Args: {
          _amount: number
          _is_super_chat?: boolean
          _message?: string
          _to_creator_id: string
          _video_id?: string
        }
        Returns: Json
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "creator" | "user"
      mission_period: "daily" | "weekly" | "monthly" | "seasonal" | "one_time"
      redemption_status: "pending" | "approved" | "rejected" | "paid"
      reward_status: "pending" | "approved" | "rejected" | "reversed"
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
      app_role: ["admin", "moderator", "creator", "user"],
      mission_period: ["daily", "weekly", "monthly", "seasonal", "one_time"],
      redemption_status: ["pending", "approved", "rejected", "paid"],
      reward_status: ["pending", "approved", "rejected", "reversed"],
    },
  },
} as const
