export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          display_name: string | null
          created_at: string
          updated_at: string
          stripe_customer_id: string | null
          email: string | null
          full_name: string | null
        }
        Insert: {
          id: string
          display_name?: string | null
          created_at?: string
          updated_at?: string
          stripe_customer_id?: string | null
          email?: string | null
          full_name?: string | null
        }
        Update: {
          id?: string
          display_name?: string | null
          created_at?: string
          updated_at?: string
          stripe_customer_id?: string | null
          email?: string | null
          full_name?: string | null
        }
      }
      projects: {
        Row: {
          id: string
          user_id: string
          name: string
          description: string | null
          image_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          description?: string | null
          image_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          description?: string | null
          image_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      project_members: {
        Row: {
          id: string
          project_id: string
          user_id: string
          role: 'read' | 'edit' | 'owner'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          user_id: string
          role?: 'read' | 'edit' | 'owner'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          user_id?: string
          role?: 'read' | 'edit' | 'owner'
          created_at?: string
          updated_at?: string
        }
      }
      subreddits: {
        Row: {
          id: string
          name: string
          subscriber_count: number
          active_users: number
          marketing_friendly_score: number
          posting_requirements: Json
          posting_frequency: Json
          allowed_content: string[]
          best_practices: string[]
          rules_summary: string | null
          title_template: string | null
          last_analyzed_at: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          subscriber_count?: number
          active_users?: number
          marketing_friendly_score?: number
          posting_requirements?: Json
          posting_frequency?: Json
          allowed_content?: string[]
          best_practices?: string[]
          rules_summary?: string | null
          title_template?: string | null
          last_analyzed_at?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          subscriber_count?: number
          active_users?: number
          marketing_friendly_score?: number
          posting_requirements?: Json
          posting_frequency?: Json
          allowed_content?: string[]
          best_practices?: string[]
          rules_summary?: string | null
          title_template?: string | null
          last_analyzed_at?: string
          created_at?: string
          updated_at?: string
        }
      }
      project_subreddits: {
        Row: {
          id: string
          project_id: string
          subreddit_id: string
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          subreddit_id: string
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          subreddit_id?: string
          created_at?: string
        }
      }
      subscription_features: {
        Row: {
          id: string
          feature_key: string
          name: string
          description: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          feature_key: string
          name: string
          description: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          feature_key?: string
          name?: string
          description?: string
          created_at?: string
          updated_at?: string
        }
      }
      stripe_products: {
        Row: {
          id: string
          stripe_product_id: string
          name: string
          description: string | null
          active: boolean
          metadata: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          stripe_product_id: string
          name: string
          description?: string | null
          active?: boolean
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          stripe_product_id?: string
          name?: string
          description?: string | null
          active?: boolean
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
      }
      stripe_prices: {
        Row: {
          id: string
          stripe_price_id: string
          stripe_product_id: string
          currency: string
          unit_amount: number
          recurring_interval: string | null
          recurring_interval_count: number | null
          active: boolean
          metadata: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          stripe_price_id: string
          stripe_product_id: string
          currency: string
          unit_amount: number
          recurring_interval?: string | null
          recurring_interval_count?: number | null
          active?: boolean
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          stripe_price_id?: string
          stripe_product_id?: string
          currency?: string
          unit_amount?: number
          recurring_interval?: string | null
          recurring_interval_count?: number | null
          active?: boolean
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
      }
      product_features: {
        Row: {
          id: string
          stripe_product_id: string
          feature_key: string
          enabled: boolean
          created_at: string
        }
        Insert: {
          id?: string
          stripe_product_id: string
          feature_key: string
          enabled?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          stripe_product_id?: string
          feature_key?: string
          enabled?: boolean
          created_at?: string
        }
      }
      customer_subscriptions: {
        Row: {
          id: string
          user_id: string
          stripe_customer_id: string
          stripe_subscription_id: string | null
          stripe_price_id: string | null
          status: string
          trial_start: string | null
          trial_end: string | null
          current_period_start: string | null
          current_period_end: string | null
          cancel_at_period_end: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          stripe_customer_id: string
          stripe_subscription_id?: string | null
          stripe_price_id?: string | null
          status: string
          trial_start?: string | null
          trial_end?: string | null
          current_period_start?: string | null
          current_period_end?: string | null
          cancel_at_period_end?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          stripe_customer_id?: string
          stripe_subscription_id?: string | null
          stripe_price_id?: string | null
          status?: string
          trial_start?: string | null
          trial_end?: string | null
          current_period_start?: string | null
          current_period_end?: string | null
          cancel_at_period_end?: boolean
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_project_role: {
        Args: {
          project_uuid: string
        }
        Returns: 'read' | 'edit' | 'owner'
      }
    }
    Enums: {
      project_role: 'read' | 'edit' | 'owner'
      subscription_status: 'trialing' | 'active' | 'canceled' | 'incomplete' | 'incomplete_expired' | 'past_due' | 'unpaid' | 'paused'
    }
  }
}