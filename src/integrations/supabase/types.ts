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
          id: string
          site_name: string | null
          updated_at: string
        }
        Insert: {
          ad_code?: string | null
          admin_password?: string | null
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_name?: string | null
          created_at?: string
          default_ad_frequency?: number | null
          id?: string
          site_name?: string | null
          updated_at?: string
        }
        Update: {
          ad_code?: string | null
          admin_password?: string | null
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_name?: string | null
          created_at?: string
          default_ad_frequency?: number | null
          id?: string
          site_name?: string | null
          updated_at?: string
        }
        Relationships: []
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
      profiles: {
        Row: {
          avatar_url: string | null
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
          avatar_url?: string | null
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
          avatar_url?: string | null
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
          default_quality: string | null
          email_notifications: boolean | null
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
          default_quality?: string | null
          email_notifications?: boolean | null
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
          default_quality?: string | null
          email_notifications?: boolean | null
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
          is_published: boolean | null
          is_subscription_only: boolean | null
          likes_count: number | null
          poster_id: string | null
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
          is_published?: boolean | null
          is_subscription_only?: boolean | null
          likes_count?: number | null
          poster_id?: string | null
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
          is_published?: boolean | null
          is_subscription_only?: boolean | null
          likes_count?: number | null
          poster_id?: string | null
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_moderator: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "moderator" | "creator" | "user"
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
    },
  },
} as const
