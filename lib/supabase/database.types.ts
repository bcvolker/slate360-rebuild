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
      ab_experiments: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          display_name: string | null
          end_date: string | null
          id: string
          name: string
          start_date: string | null
          status: string | null
          target_filters: Json | null
          target_percentage: number | null
          updated_at: string | null
          variants: Json | null
          winner_variant: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          display_name?: string | null
          end_date?: string | null
          id?: string
          name: string
          start_date?: string | null
          status?: string | null
          target_filters?: Json | null
          target_percentage?: number | null
          updated_at?: string | null
          variants?: Json | null
          winner_variant?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          display_name?: string | null
          end_date?: string | null
          id?: string
          name?: string
          start_date?: string | null
          status?: string | null
          target_filters?: Json | null
          target_percentage?: number | null
          updated_at?: string | null
          variants?: Json | null
          winner_variant?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ab_experiments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_log: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          metadata: Json | null
          org_id: string | null
          project_id: string | null
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          org_id?: string | null
          project_id?: string | null
          title: string
          type: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          org_id?: string | null
          project_id?: string | null
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      api_performance_logs: {
        Row: {
          created_at: string | null
          endpoint: string
          error_message: string | null
          id: string
          ip_address: string | null
          method: string
          org_id: string | null
          request_size_bytes: number | null
          response_size_bytes: number | null
          response_time_ms: number | null
          stack_trace: string | null
          status_code: number | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          endpoint: string
          error_message?: string | null
          id?: string
          ip_address?: string | null
          method: string
          org_id?: string | null
          request_size_bytes?: number | null
          response_size_bytes?: number | null
          response_time_ms?: number | null
          stack_trace?: string | null
          status_code?: number | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          endpoint?: string
          error_message?: string | null
          id?: string
          ip_address?: string | null
          method?: string
          org_id?: string | null
          request_size_bytes?: number | null
          response_size_bytes?: number | null
          response_time_ms?: number | null
          stack_trace?: string | null
          status_code?: number | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "api_performance_logs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "org_usage_summary"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "api_performance_logs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "api_performance_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      api_rate_limits: {
        Row: {
          created_at: string | null
          endpoint: string
          id: string
          identifier: string
          identifier_type: string
          limit_exceeded: boolean | null
          request_count: number | null
          window_end: string | null
          window_start: string | null
        }
        Insert: {
          created_at?: string | null
          endpoint: string
          id?: string
          identifier: string
          identifier_type: string
          limit_exceeded?: boolean | null
          request_count?: number | null
          window_end?: string | null
          window_start?: string | null
        }
        Update: {
          created_at?: string | null
          endpoint?: string
          id?: string
          identifier?: string
          identifier_type?: string
          limit_exceeded?: boolean | null
          request_count?: number | null
          window_end?: string | null
          window_start?: string | null
        }
        Relationships: []
      }
      assets: {
        Row: {
          asset_type: string
          checksum: string | null
          content_type: string | null
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          description: string | null
          id: string
          is_latest: boolean | null
          is_processed: boolean | null
          metadata: Json | null
          name: string
          organization_id: string | null
          parent_asset_id: string | null
          processing_job_id: string | null
          processing_status: string | null
          project_id: string | null
          s3_bucket: string | null
          s3_key: string
          shared_with: string[] | null
          size_bytes: number
          tags: string[] | null
          updated_at: string | null
          version: number | null
          visibility: string | null
        }
        Insert: {
          asset_type: string
          checksum?: string | null
          content_type?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_latest?: boolean | null
          is_processed?: boolean | null
          metadata?: Json | null
          name: string
          organization_id?: string | null
          parent_asset_id?: string | null
          processing_job_id?: string | null
          processing_status?: string | null
          project_id?: string | null
          s3_bucket?: string | null
          s3_key: string
          shared_with?: string[] | null
          size_bytes?: number
          tags?: string[] | null
          updated_at?: string | null
          version?: number | null
          visibility?: string | null
        }
        Update: {
          asset_type?: string
          checksum?: string | null
          content_type?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_latest?: boolean | null
          is_processed?: boolean | null
          metadata?: Json | null
          name?: string
          organization_id?: string | null
          parent_asset_id?: string | null
          processing_job_id?: string | null
          processing_status?: string | null
          project_id?: string | null
          s3_bucket?: string | null
          s3_key?: string
          shared_with?: string[] | null
          size_bytes?: number
          tags?: string[] | null
          updated_at?: string | null
          version?: number | null
          visibility?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assets_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "org_usage_summary"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "assets_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_parent_asset_id_fkey"
            columns: ["parent_asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      autodesk_sync_queue: {
        Row: {
          autodesk_project_id: string | null
          autodesk_resource_id: string | null
          completed_at: string | null
          created_at: string | null
          error_message: string | null
          id: string
          integration_id: string | null
          max_retries: number | null
          org_id: string | null
          priority: number | null
          project_id: string | null
          resource_id: string
          resource_type: string
          retry_count: number | null
          started_at: string | null
          status: string | null
          sync_data: Json | null
          sync_type: string
        }
        Insert: {
          autodesk_project_id?: string | null
          autodesk_resource_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          integration_id?: string | null
          max_retries?: number | null
          org_id?: string | null
          priority?: number | null
          project_id?: string | null
          resource_id: string
          resource_type: string
          retry_count?: number | null
          started_at?: string | null
          status?: string | null
          sync_data?: Json | null
          sync_type: string
        }
        Update: {
          autodesk_project_id?: string | null
          autodesk_resource_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          integration_id?: string | null
          max_retries?: number | null
          org_id?: string | null
          priority?: number | null
          project_id?: string | null
          resource_id?: string
          resource_type?: string
          retry_count?: number | null
          started_at?: string | null
          status?: string | null
          sync_data?: Json | null
          sync_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "autodesk_sync_queue_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "user_integrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "autodesk_sync_queue_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "org_usage_summary"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "autodesk_sync_queue_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "autodesk_sync_queue_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      background_jobs: {
        Row: {
          attempt_count: number | null
          completed_at: string | null
          created_at: string | null
          error_message: string | null
          id: string
          job_data: Json | null
          job_type: string
          max_attempts: number | null
          priority: number | null
          scheduled_at: string | null
          started_at: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          attempt_count?: number | null
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          job_data?: Json | null
          job_type: string
          max_attempts?: number | null
          priority?: number | null
          scheduled_at?: string | null
          started_at?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          attempt_count?: number | null
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          job_data?: Json | null
          job_type?: string
          max_attempts?: number | null
          priority?: number | null
          scheduled_at?: string | null
          started_at?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      backup_history: {
        Row: {
          backup_type: string
          completed_at: string | null
          created_at: string | null
          error_message: string | null
          file_path: string | null
          file_size: number | null
          id: string
          initiated_by: string | null
          record_count: number | null
          status: string | null
          tables_backed_up: string[] | null
        }
        Insert: {
          backup_type: string
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          file_path?: string | null
          file_size?: number | null
          id?: string
          initiated_by?: string | null
          record_count?: number | null
          status?: string | null
          tables_backed_up?: string[] | null
        }
        Update: {
          backup_type?: string
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          file_path?: string | null
          file_size?: number | null
          id?: string
          initiated_by?: string | null
          record_count?: number | null
          status?: string | null
          tables_backed_up?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "backup_history_initiated_by_fkey"
            columns: ["initiated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      beta_feedback: {
        Row: {
          admin_notes: string | null
          app_area: string | null
          console_errors: Json | null
          created_at: string
          description: string
          gh_issue_url: string | null
          id: string
          org_id: string | null
          page_url: string | null
          resolved_at: string | null
          screenshot_url: string | null
          severity: string | null
          status: string
          steps_to_reproduce: string | null
          title: string
          type: string
          updated_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          app_area?: string | null
          console_errors?: Json | null
          created_at?: string
          description: string
          gh_issue_url?: string | null
          id?: string
          org_id?: string | null
          page_url?: string | null
          resolved_at?: string | null
          screenshot_url?: string | null
          severity?: string | null
          status?: string
          steps_to_reproduce?: string | null
          title: string
          type: string
          updated_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          app_area?: string | null
          console_errors?: Json | null
          created_at?: string
          description?: string
          gh_issue_url?: string | null
          id?: string
          org_id?: string | null
          page_url?: string | null
          resolved_at?: string | null
          screenshot_url?: string | null
          severity?: string | null
          status?: string
          steps_to_reproduce?: string | null
          title?: string
          type?: string
          updated_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "beta_feedback_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "org_usage_summary"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "beta_feedback_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      beta_testers: {
        Row: {
          activated_at: string | null
          company: string | null
          created_at: string | null
          email: string
          expires_at: string | null
          full_name: string | null
          id: string
          industry: string | null
          invited_at: string | null
          notes: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          activated_at?: string | null
          company?: string | null
          created_at?: string | null
          email: string
          expires_at?: string | null
          full_name?: string | null
          id?: string
          industry?: string | null
          invited_at?: string | null
          notes?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          activated_at?: string | null
          company?: string | null
          created_at?: string | null
          email?: string
          expires_at?: string | null
          full_name?: string | null
          id?: string
          industry?: string | null
          invited_at?: string | null
          notes?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      budget_change_orders: {
        Row: {
          amount: number | null
          approved_by: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          line_item_id: string | null
          name: string
          number: string
          project_id: string | null
          status: string | null
          updated_at: string | null
          vendor: string | null
          version_id: string | null
        }
        Insert: {
          amount?: number | null
          approved_by?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          line_item_id?: string | null
          name: string
          number: string
          project_id?: string | null
          status?: string | null
          updated_at?: string | null
          vendor?: string | null
          version_id?: string | null
        }
        Update: {
          amount?: number | null
          approved_by?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          line_item_id?: string | null
          name?: string
          number?: string
          project_id?: string | null
          status?: string | null
          updated_at?: string | null
          vendor?: string | null
          version_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "budget_change_orders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_line_items: {
        Row: {
          actual_amount: number | null
          budgeted_amount: number | null
          category: string | null
          committed_amount: number | null
          cost_code: string | null
          created_at: string | null
          created_by: string | null
          csi_code: string | null
          description: string
          id: string
          is_expanded: boolean | null
          is_locked: boolean | null
          item_number: string | null
          level: number | null
          org_id: string | null
          project_id: string | null
          projected_final: number | null
          status: string | null
          subcategory: string | null
          updated_at: string | null
          variance: number | null
          version_id: string | null
        }
        Insert: {
          actual_amount?: number | null
          budgeted_amount?: number | null
          category?: string | null
          committed_amount?: number | null
          cost_code?: string | null
          created_at?: string | null
          created_by?: string | null
          csi_code?: string | null
          description: string
          id?: string
          is_expanded?: boolean | null
          is_locked?: boolean | null
          item_number?: string | null
          level?: number | null
          org_id?: string | null
          project_id?: string | null
          projected_final?: number | null
          status?: string | null
          subcategory?: string | null
          updated_at?: string | null
          variance?: number | null
          version_id?: string | null
        }
        Update: {
          actual_amount?: number | null
          budgeted_amount?: number | null
          category?: string | null
          committed_amount?: number | null
          cost_code?: string | null
          created_at?: string | null
          created_by?: string | null
          csi_code?: string | null
          description?: string
          id?: string
          is_expanded?: boolean | null
          is_locked?: boolean | null
          item_number?: string | null
          level?: number | null
          org_id?: string | null
          project_id?: string | null
          projected_final?: number | null
          status?: string | null
          subcategory?: string | null
          updated_at?: string | null
          variance?: number | null
          version_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "budget_line_items_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_line_items_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "org_usage_summary"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "budget_line_items_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_line_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_versions: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          org_id: string | null
          project_id: string | null
          status: string | null
          total_actual: number | null
          total_committed: number | null
          total_original_budget: number | null
          total_revised_budget: number | null
          updated_at: string | null
          version_number: number | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          org_id?: string | null
          project_id?: string | null
          status?: string | null
          total_actual?: number | null
          total_committed?: number | null
          total_original_budget?: number | null
          total_revised_budget?: number | null
          updated_at?: string | null
          version_number?: number | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          org_id?: string | null
          project_id?: string | null
          status?: string | null
          total_actual?: number | null
          total_committed?: number | null
          total_original_budget?: number | null
          total_revised_budget?: number | null
          updated_at?: string | null
          version_number?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "budget_versions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_events: {
        Row: {
          all_day: boolean
          color: string
          created_at: string
          created_by: string
          date: string
          description: string | null
          end_time: string | null
          id: string
          location: string | null
          org_id: string
          project_id: string | null
          start_time: string | null
          title: string
          updated_at: string
        }
        Insert: {
          all_day?: boolean
          color?: string
          created_at?: string
          created_by: string
          date: string
          description?: string | null
          end_time?: string | null
          id?: string
          location?: string | null
          org_id: string
          project_id?: string | null
          start_time?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          all_day?: boolean
          color?: string
          created_at?: string
          created_by?: string
          date?: string
          description?: string | null
          end_time?: string | null
          id?: string
          location?: string | null
          org_id?: string
          project_id?: string | null
          start_time?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "org_usage_summary"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "calendar_events_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      change_orders: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          approved_cost: number | null
          change_order_number: string
          created_at: string | null
          created_by: string | null
          description: string | null
          estimated_cost: number | null
          id: string
          metadata: Json | null
          org_id: string | null
          project_id: string | null
          reason: string | null
          schedule_impact_days: number | null
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          approved_cost?: number | null
          change_order_number: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          estimated_cost?: number | null
          id?: string
          metadata?: Json | null
          org_id?: string | null
          project_id?: string | null
          reason?: string | null
          schedule_impact_days?: number | null
          status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          approved_cost?: number | null
          change_order_number?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          estimated_cost?: number | null
          id?: string
          metadata?: Json | null
          org_id?: string | null
          project_id?: string | null
          reason?: string | null
          schedule_impact_days?: number | null
          status?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "change_orders_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_orders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_orders_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "org_usage_summary"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "change_orders_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_orders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      collaborator_addons: {
        Row: {
          count: number
          created_at: string
          current_period_end: string | null
          id: string
          org_id: string
          pack_lookup_key: string
          status: string
          stripe_price_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
        }
        Insert: {
          count: number
          created_at?: string
          current_period_end?: string | null
          id?: string
          org_id: string
          pack_lookup_key: string
          status?: string
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
        }
        Update: {
          count?: number
          created_at?: string
          current_period_end?: string | null
          id?: string
          org_id?: string
          pack_lookup_key?: string
          status?: string
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "collaborator_addons_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "org_usage_summary"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "collaborator_addons_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      completion_certificates: {
        Row: {
          certificate_number: string
          certificate_type: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          effective_date: string | null
          id: string
          issued_date: string | null
          metadata: Json | null
          org_id: string | null
          project_id: string | null
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          certificate_number: string
          certificate_type?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          effective_date?: string | null
          id?: string
          issued_date?: string | null
          metadata?: Json | null
          org_id?: string | null
          project_id?: string | null
          status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          certificate_number?: string
          certificate_type?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          effective_date?: string | null
          id?: string
          issued_date?: string | null
          metadata?: Json | null
          org_id?: string | null
          project_id?: string | null
          status?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "completion_certificates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "completion_certificates_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "org_usage_summary"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "completion_certificates_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "completion_certificates_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      connectivity_test: {
        Row: {
          created_at: string | null
          id: string
          test_name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          test_name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          test_name?: string
        }
        Relationships: []
      }
      contact_files: {
        Row: {
          contact_id: string
          created_at: string
          file_name: string
          id: string
          mime_type: string | null
          org_id: string
          s3_key: string
          size_bytes: number | null
          uploaded_by: string | null
        }
        Insert: {
          contact_id: string
          created_at?: string
          file_name: string
          id?: string
          mime_type?: string | null
          org_id: string
          s3_key: string
          size_bytes?: number | null
          uploaded_by?: string | null
        }
        Update: {
          contact_id?: string
          created_at?: string
          file_name?: string
          id?: string
          mime_type?: string | null
          org_id?: string
          s3_key?: string
          size_bytes?: number | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contact_files_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "org_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_files_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "org_usage_summary"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "contact_files_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_projects: {
        Row: {
          contact_id: string
          project_id: string
        }
        Insert: {
          contact_id: string
          project_id: string
        }
        Update: {
          contact_id?: string
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_projects_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "org_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_projects_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_balance: {
        Row: {
          balance_credits: number
          last_reset_at: string
          monthly_allowance: number
          org_id: string
          updated_at: string
        }
        Insert: {
          balance_credits?: number
          last_reset_at?: string
          monthly_allowance?: number
          org_id: string
          updated_at?: string
        }
        Update: {
          balance_credits?: number
          last_reset_at?: string
          monthly_allowance?: number
          org_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_balance_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "org_usage_summary"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "credit_balance_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_ledger: {
        Row: {
          category: string
          created_at: string | null
          created_by: string | null
          credit_source: string | null
          delta: number
          id: string
          is_finalized: boolean | null
          metadata: Json | null
          organization_id: string
          reason: string
          ref_id: string | null
          ref_type: string | null
          running_balance: number | null
        }
        Insert: {
          category: string
          created_at?: string | null
          created_by?: string | null
          credit_source?: string | null
          delta: number
          id?: string
          is_finalized?: boolean | null
          metadata?: Json | null
          organization_id: string
          reason: string
          ref_id?: string | null
          ref_type?: string | null
          running_balance?: number | null
        }
        Update: {
          category?: string
          created_at?: string | null
          created_by?: string | null
          credit_source?: string | null
          delta?: number
          id?: string
          is_finalized?: boolean | null
          metadata?: Json | null
          organization_id?: string
          reason?: string
          ref_id?: string | null
          ref_type?: string | null
          running_balance?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "credit_ledger_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_ledger_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "org_usage_summary"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "credit_ledger_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_packs: {
        Row: {
          compute_units: number | null
          created_at: string | null
          description: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          is_popular: boolean | null
          name: string
          price_cents: number
          storage_bytes: number | null
          stripe_price_id: string | null
        }
        Insert: {
          compute_units?: number | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          is_popular?: boolean | null
          name: string
          price_cents: number
          storage_bytes?: number | null
          stripe_price_id?: string | null
        }
        Update: {
          compute_units?: number | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          is_popular?: boolean | null
          name?: string
          price_cents?: number
          storage_bytes?: number | null
          stripe_price_id?: string | null
        }
        Relationships: []
      }
      credit_purchases: {
        Row: {
          amount_cents: number
          completed_at: string | null
          compute_units: number | null
          created_at: string | null
          credit_pack_id: string | null
          id: string
          org_id: string | null
          status: string | null
          storage_bytes: number | null
          stripe_checkout_session_id: string | null
          stripe_payment_intent_id: string | null
          user_id: string | null
        }
        Insert: {
          amount_cents: number
          completed_at?: string | null
          compute_units?: number | null
          created_at?: string | null
          credit_pack_id?: string | null
          id?: string
          org_id?: string | null
          status?: string | null
          storage_bytes?: number | null
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          user_id?: string | null
        }
        Update: {
          amount_cents?: number
          completed_at?: string | null
          compute_units?: number | null
          created_at?: string | null
          credit_pack_id?: string | null
          id?: string
          org_id?: string | null
          status?: string | null
          storage_bytes?: number | null
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "credit_purchases_credit_pack_id_fkey"
            columns: ["credit_pack_id"]
            isOneToOne: false
            referencedRelation: "credit_packs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_purchases_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "org_usage_summary"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "credit_purchases_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_purchases_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_transactions: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          id: string
          idempotency_key: string
          new_balance: number
          org_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          id?: string
          idempotency_key: string
          new_balance: number
          org_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          idempotency_key?: string
          new_balance?: number
          org_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_transactions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "org_usage_summary"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "credit_transactions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      credits: {
        Row: {
          balance: number | null
          created_at: string | null
          id: string
          last_reset_at: string | null
          monthly_allocation: number | null
          monthly_credits_used: number
          monthly_reset_at: string | null
          org_id: string | null
          purchased_balance: number
          updated_at: string | null
        }
        Insert: {
          balance?: number | null
          created_at?: string | null
          id?: string
          last_reset_at?: string | null
          monthly_allocation?: number | null
          monthly_credits_used?: number
          monthly_reset_at?: string | null
          org_id?: string | null
          purchased_balance?: number
          updated_at?: string | null
        }
        Update: {
          balance?: number | null
          created_at?: string | null
          id?: string
          last_reset_at?: string | null
          monthly_allocation?: number | null
          monthly_credits_used?: number
          monthly_reset_at?: string | null
          org_id?: string | null
          purchased_balance?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "credits_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "org_usage_summary"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "credits_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_logs: {
        Row: {
          activities: Json | null
          approved_at: string | null
          approved_by: string | null
          created_at: string | null
          created_by: string | null
          delays: Json | null
          equipment: Json | null
          id: string
          log_date: string
          manpower: Json | null
          materials: Json | null
          notes: string | null
          org_id: string | null
          photos: Json | null
          project_id: string
          safety_incidents: Json | null
          status: string | null
          temperature_high: number | null
          temperature_low: number | null
          updated_at: string | null
          visitors: Json | null
          weather: Json | null
          workers_count: number | null
        }
        Insert: {
          activities?: Json | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          created_by?: string | null
          delays?: Json | null
          equipment?: Json | null
          id?: string
          log_date: string
          manpower?: Json | null
          materials?: Json | null
          notes?: string | null
          org_id?: string | null
          photos?: Json | null
          project_id: string
          safety_incidents?: Json | null
          status?: string | null
          temperature_high?: number | null
          temperature_low?: number | null
          updated_at?: string | null
          visitors?: Json | null
          weather?: Json | null
          workers_count?: number | null
        }
        Update: {
          activities?: Json | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          created_by?: string | null
          delays?: Json | null
          equipment?: Json | null
          id?: string
          log_date?: string
          manpower?: Json | null
          materials?: Json | null
          notes?: string | null
          org_id?: string | null
          photos?: Json | null
          project_id?: string
          safety_incidents?: Json | null
          status?: string | null
          temperature_high?: number | null
          temperature_low?: number | null
          updated_at?: string | null
          visitors?: Json | null
          weather?: Json | null
          workers_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_logs_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_logs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_logs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "org_usage_summary"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "daily_logs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_logs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_reports: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string | null
          created_by: string | null
          delays: Json | null
          deliveries: Json | null
          equipment: Json | null
          id: string
          incidents: Json | null
          notes: string | null
          org_id: string | null
          photos: Json | null
          project_id: string
          report_date: string
          report_number: string
          safety_observations: string | null
          status: string | null
          superintendent: string | null
          updated_at: string | null
          visitors: Json | null
          weather: Json | null
          work_activities: Json | null
          work_performed: string | null
          workforce: Json | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          created_by?: string | null
          delays?: Json | null
          deliveries?: Json | null
          equipment?: Json | null
          id?: string
          incidents?: Json | null
          notes?: string | null
          org_id?: string | null
          photos?: Json | null
          project_id: string
          report_date: string
          report_number: string
          safety_observations?: string | null
          status?: string | null
          superintendent?: string | null
          updated_at?: string | null
          visitors?: Json | null
          weather?: Json | null
          work_activities?: Json | null
          work_performed?: string | null
          workforce?: Json | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          created_by?: string | null
          delays?: Json | null
          deliveries?: Json | null
          equipment?: Json | null
          id?: string
          incidents?: Json | null
          notes?: string | null
          org_id?: string | null
          photos?: Json | null
          project_id?: string
          report_date?: string
          report_number?: string
          safety_observations?: string | null
          status?: string | null
          superintendent?: string | null
          updated_at?: string | null
          visitors?: Json | null
          weather?: Json | null
          work_activities?: Json | null
          work_performed?: string | null
          workforce?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_reports_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_reports_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_reports_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "org_usage_summary"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "daily_reports_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_reports_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      data_exports: {
        Row: {
          completed_at: string | null
          created_at: string | null
          error_message: string | null
          expires_at: string | null
          export_type: string
          file_size: number | null
          file_url: string | null
          format: string | null
          id: string
          include_attachments: boolean | null
          org_id: string | null
          progress_percentage: number | null
          requested_by: string | null
          resource_id: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          expires_at?: string | null
          export_type: string
          file_size?: number | null
          file_url?: string | null
          format?: string | null
          id?: string
          include_attachments?: boolean | null
          org_id?: string | null
          progress_percentage?: number | null
          requested_by?: string | null
          resource_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          expires_at?: string | null
          export_type?: string
          file_size?: number | null
          file_url?: string | null
          format?: string | null
          id?: string
          include_attachments?: boolean | null
          org_id?: string | null
          progress_percentage?: number | null
          requested_by?: string | null
          resource_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "data_exports_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "org_usage_summary"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "data_exports_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "data_exports_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      data_retention_policies: {
        Row: {
          auto_delete: boolean | null
          created_at: string | null
          data_type: string
          deletion_method: string | null
          id: string
          is_active: boolean | null
          legal_basis: string | null
          notes: string | null
          retention_days: number
          table_name: string
          updated_at: string | null
        }
        Insert: {
          auto_delete?: boolean | null
          created_at?: string | null
          data_type: string
          deletion_method?: string | null
          id?: string
          is_active?: boolean | null
          legal_basis?: string | null
          notes?: string | null
          retention_days: number
          table_name: string
          updated_at?: string | null
        }
        Update: {
          auto_delete?: boolean | null
          created_at?: string | null
          data_type?: string
          deletion_method?: string | null
          id?: string
          is_active?: boolean | null
          legal_basis?: string | null
          notes?: string | null
          retention_days?: number
          table_name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      deficiencies: {
        Row: {
          assigned_to: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          due_date: string | null
          id: string
          location: string
          number: string | null
          org_id: string
          photos: Json | null
          priority: string
          project_id: string
          status: string
          title: string
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          location: string
          number?: string | null
          org_id: string
          photos?: Json | null
          priority?: string
          project_id: string
          status?: string
          title: string
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          location?: string
          number?: string | null
          org_id?: string
          photos?: Json | null
          priority?: string
          project_id?: string
          status?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deficiencies_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      deliverable_access_tokens: {
        Row: {
          created_at: string
          created_by: string
          deliverable_id: string
          deliverable_type: string
          expires_at: string | null
          id: string
          is_revoked: boolean
          last_viewed_at: string | null
          max_views: number | null
          metadata: Json
          org_id: string
          recipient_email: string | null
          recipient_name: string | null
          recipient_phone: string | null
          role: string
          token: string
          view_count: number
        }
        Insert: {
          created_at?: string
          created_by: string
          deliverable_id: string
          deliverable_type: string
          expires_at?: string | null
          id?: string
          is_revoked?: boolean
          last_viewed_at?: string | null
          max_views?: number | null
          metadata?: Json
          org_id: string
          recipient_email?: string | null
          recipient_name?: string | null
          recipient_phone?: string | null
          role?: string
          token: string
          view_count?: number
        }
        Update: {
          created_at?: string
          created_by?: string
          deliverable_id?: string
          deliverable_type?: string
          expires_at?: string | null
          id?: string
          is_revoked?: boolean
          last_viewed_at?: string | null
          max_views?: number | null
          metadata?: Json
          org_id?: string
          recipient_email?: string | null
          recipient_name?: string | null
          recipient_phone?: string | null
          role?: string
          token?: string
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "deliverable_access_tokens_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "org_usage_summary"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "deliverable_access_tokens_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      deliverable_cleanup_queue: {
        Row: {
          app_id: string | null
          created_at: string
          id: number
          new_tier: string | null
          old_tier: string | null
          org_id: string
          processed_at: string | null
          status: string
        }
        Insert: {
          app_id?: string | null
          created_at?: string
          id?: never
          new_tier?: string | null
          old_tier?: string | null
          org_id: string
          processed_at?: string | null
          status?: string
        }
        Update: {
          app_id?: string | null
          created_at?: string
          id?: never
          new_tier?: string | null
          old_tier?: string | null
          org_id?: string
          processed_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "deliverable_cleanup_queue_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "org_usage_summary"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "deliverable_cleanup_queue_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      design_studio_annotations: {
        Row: {
          created_at: string | null
          data: Json
          id: string
          is_visible: boolean | null
          layer: string | null
          project_id: string | null
          type: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          data: Json
          id?: string
          is_visible?: boolean | null
          layer?: string | null
          project_id?: string | null
          type: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          data?: Json
          id?: string
          is_visible?: boolean | null
          layer?: string | null
          project_id?: string | null
          type?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "design_studio_annotations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "design_studio_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "design_studio_annotations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      design_studio_assets: {
        Row: {
          asset_type: string
          created_at: string | null
          data: Json
          file_path: string | null
          id: string
          is_builtin: boolean | null
          name: string
          project_id: string | null
          tags: string[] | null
          thumbnail_url: string | null
          updated_at: string | null
        }
        Insert: {
          asset_type: string
          created_at?: string | null
          data: Json
          file_path?: string | null
          id?: string
          is_builtin?: boolean | null
          name: string
          project_id?: string | null
          tags?: string[] | null
          thumbnail_url?: string | null
          updated_at?: string | null
        }
        Update: {
          asset_type?: string
          created_at?: string | null
          data?: Json
          file_path?: string | null
          id?: string
          is_builtin?: boolean | null
          name?: string
          project_id?: string | null
          tags?: string[] | null
          thumbnail_url?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "design_studio_assets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "design_studio_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      design_studio_exports: {
        Row: {
          completed_at: string | null
          created_at: string | null
          error_message: string | null
          export_type: string
          file_path: string
          file_size: number | null
          id: string
          project_id: string | null
          settings: Json | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          export_type: string
          file_path: string
          file_size?: number | null
          id?: string
          project_id?: string | null
          settings?: Json | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          export_type?: string
          file_path?: string
          file_size?: number | null
          id?: string
          project_id?: string | null
          settings?: Json | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "design_studio_exports_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "design_studio_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "design_studio_exports_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      design_studio_projects: {
        Row: {
          annotations: Json | null
          canvas_data: Json | null
          canvas_state: Json | null
          collaborators: Json | null
          created_at: string | null
          created_by: string | null
          description: string | null
          goal: string | null
          id: string
          last_saved_at: string | null
          layers: Json | null
          location: Json | null
          mode: string
          name: string | null
          objects: Json | null
          org_id: string | null
          project_id: string | null
          project_type: string | null
          settings: Json | null
          status: string | null
          thumbnail_url: string | null
          updated_at: string | null
        }
        Insert: {
          annotations?: Json | null
          canvas_data?: Json | null
          canvas_state?: Json | null
          collaborators?: Json | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          goal?: string | null
          id?: string
          last_saved_at?: string | null
          layers?: Json | null
          location?: Json | null
          mode?: string
          name?: string | null
          objects?: Json | null
          org_id?: string | null
          project_id?: string | null
          project_type?: string | null
          settings?: Json | null
          status?: string | null
          thumbnail_url?: string | null
          updated_at?: string | null
        }
        Update: {
          annotations?: Json | null
          canvas_data?: Json | null
          canvas_state?: Json | null
          collaborators?: Json | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          goal?: string | null
          id?: string
          last_saved_at?: string | null
          layers?: Json | null
          location?: Json | null
          mode?: string
          name?: string | null
          objects?: Json | null
          org_id?: string | null
          project_id?: string | null
          project_type?: string | null
          settings?: Json | null
          status?: string | null
          thumbnail_url?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "design_studio_projects_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      design_studio_sessions: {
        Row: {
          created_at: string | null
          cursor_position: Json | null
          id: string
          is_active: boolean | null
          last_ping_at: string | null
          project_id: string | null
          selected_objects: Json | null
          session_token: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          cursor_position?: Json | null
          id?: string
          is_active?: boolean | null
          last_ping_at?: string | null
          project_id?: string | null
          selected_objects?: Json | null
          session_token: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          cursor_position?: Json | null
          id?: string
          is_active?: boolean | null
          last_ping_at?: string | null
          project_id?: string | null
          selected_objects?: Json | null
          session_token?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "design_studio_sessions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "design_studio_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "design_studio_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      design_studio_versions: {
        Row: {
          change_description: string | null
          created_at: string | null
          id: string
          project_id: string | null
          snapshot: Json
          user_id: string | null
          version_number: number
        }
        Insert: {
          change_description?: string | null
          created_at?: string | null
          id?: string
          project_id?: string | null
          snapshot: Json
          user_id?: string | null
          version_number: number
        }
        Update: {
          change_description?: string | null
          created_at?: string | null
          id?: string
          project_id?: string | null
          snapshot?: Json
          user_id?: string | null
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "design_studio_versions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "design_studio_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "design_studio_versions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      digital_twin_alignments: {
        Row: {
          created_at: string
          created_by: string
          id: string
          is_locked: boolean
          label: string
          org_id: string
          reference_model_file_id: string | null
          space_id: string
          transform_matrix: Json
          twin_model_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          is_locked?: boolean
          label: string
          org_id: string
          reference_model_file_id?: string | null
          space_id: string
          transform_matrix: Json
          twin_model_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          is_locked?: boolean
          label?: string
          org_id?: string
          reference_model_file_id?: string | null
          space_id?: string
          transform_matrix?: Json
          twin_model_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "digital_twin_alignments_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "org_usage_summary"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "digital_twin_alignments_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "digital_twin_alignments_reference_model_file_id_fkey"
            columns: ["reference_model_file_id"]
            isOneToOne: false
            referencedRelation: "model_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "digital_twin_alignments_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "digital_twin_spaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "digital_twin_alignments_twin_model_id_fkey"
            columns: ["twin_model_id"]
            isOneToOne: false
            referencedRelation: "digital_twin_models"
            referencedColumns: ["id"]
          },
        ]
      }
      digital_twin_capture_assets: {
        Row: {
          asset_kind: string
          capture_id: string
          checksum_sha256: string | null
          content_type: string | null
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          duration_secs: number | null
          error_text: string | null
          file_size_bytes: number
          geospatial_metadata: Json
          height: number | null
          id: string
          org_id: string
          pose_metadata: Json
          processing_progress: number
          sort_order: number
          space_id: string
          status: string
          storage_key: string | null
          unified_file_id: string | null
          updated_at: string
          upload_tier: string
          width: number | null
        }
        Insert: {
          asset_kind: string
          capture_id: string
          checksum_sha256?: string | null
          content_type?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          duration_secs?: number | null
          error_text?: string | null
          file_size_bytes?: number
          geospatial_metadata?: Json
          height?: number | null
          id?: string
          org_id: string
          pose_metadata?: Json
          processing_progress?: number
          sort_order?: number
          space_id: string
          status?: string
          storage_key?: string | null
          unified_file_id?: string | null
          updated_at?: string
          upload_tier?: string
          width?: number | null
        }
        Update: {
          asset_kind?: string
          capture_id?: string
          checksum_sha256?: string | null
          content_type?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          duration_secs?: number | null
          error_text?: string | null
          file_size_bytes?: number
          geospatial_metadata?: Json
          height?: number | null
          id?: string
          org_id?: string
          pose_metadata?: Json
          processing_progress?: number
          sort_order?: number
          space_id?: string
          status?: string
          storage_key?: string | null
          unified_file_id?: string | null
          updated_at?: string
          upload_tier?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "digital_twin_capture_assets_capture_id_fkey"
            columns: ["capture_id"]
            isOneToOne: false
            referencedRelation: "digital_twin_captures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "digital_twin_capture_assets_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "org_usage_summary"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "digital_twin_capture_assets_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "digital_twin_capture_assets_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "digital_twin_spaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "digital_twin_capture_assets_unified_file_id_fkey"
            columns: ["unified_file_id"]
            isOneToOne: false
            referencedRelation: "unified_files"
            referencedColumns: ["id"]
          },
        ]
      }
      digital_twin_captures: {
        Row: {
          asset_counts: Json
          capture_metadata: Json
          capture_status: string
          created_at: string
          created_by: string
          deleted_at: string | null
          deleted_by: string | null
          device_class: string
          error_text: string | null
          has_lidar: boolean
          id: string
          org_id: string
          project_id: string
          review_status: string
          reviewed_at: string | null
          reviewed_by: string | null
          space_id: string
          title: string | null
          updated_at: string
          upload_tier: string
          uploaded_at: string | null
        }
        Insert: {
          asset_counts?: Json
          capture_metadata?: Json
          capture_status?: string
          created_at?: string
          created_by: string
          deleted_at?: string | null
          deleted_by?: string | null
          device_class?: string
          error_text?: string | null
          has_lidar?: boolean
          id?: string
          org_id: string
          project_id: string
          review_status?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          space_id: string
          title?: string | null
          updated_at?: string
          upload_tier?: string
          uploaded_at?: string | null
        }
        Update: {
          asset_counts?: Json
          capture_metadata?: Json
          capture_status?: string
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          deleted_by?: string | null
          device_class?: string
          error_text?: string | null
          has_lidar?: boolean
          id?: string
          org_id?: string
          project_id?: string
          review_status?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          space_id?: string
          title?: string | null
          updated_at?: string
          upload_tier?: string
          uploaded_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "digital_twin_captures_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "org_usage_summary"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "digital_twin_captures_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "digital_twin_captures_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "digital_twin_captures_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "digital_twin_spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      digital_twin_clip_planes: {
        Row: {
          created_at: string
          created_by: string
          id: string
          is_active: boolean
          label: string | null
          model_id: string | null
          normal: Json
          org_id: string
          origin: Json
          sort_order: number
          space_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          is_active?: boolean
          label?: string | null
          model_id?: string | null
          normal: Json
          org_id: string
          origin: Json
          sort_order?: number
          space_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          is_active?: boolean
          label?: string | null
          model_id?: string | null
          normal?: Json
          org_id?: string
          origin?: Json
          sort_order?: number
          space_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "digital_twin_clip_planes_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "digital_twin_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "digital_twin_clip_planes_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "org_usage_summary"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "digital_twin_clip_planes_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "digital_twin_clip_planes_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "digital_twin_spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      digital_twin_comments: {
        Row: {
          author_display: string | null
          author_user_id: string | null
          body: string
          created_at: string
          id: string
          is_escalation: boolean
          org_id: string
          parent_id: string | null
          share_token_id: string | null
          space_id: string
          subject_id: string
          subject_type: string
          updated_at: string
        }
        Insert: {
          author_display?: string | null
          author_user_id?: string | null
          body: string
          created_at?: string
          id?: string
          is_escalation?: boolean
          org_id: string
          parent_id?: string | null
          share_token_id?: string | null
          space_id: string
          subject_id: string
          subject_type: string
          updated_at?: string
        }
        Update: {
          author_display?: string | null
          author_user_id?: string | null
          body?: string
          created_at?: string
          id?: string
          is_escalation?: boolean
          org_id?: string
          parent_id?: string | null
          share_token_id?: string | null
          space_id?: string
          subject_id?: string
          subject_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "digital_twin_comments_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "org_usage_summary"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "digital_twin_comments_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "digital_twin_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "digital_twin_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "digital_twin_comments_share_token_fk"
            columns: ["share_token_id"]
            isOneToOne: false
            referencedRelation: "digital_twin_share_tokens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "digital_twin_comments_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "digital_twin_spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      digital_twin_measurements: {
        Row: {
          created_at: string
          created_by: string
          end_point: Json
          id: string
          label: string
          measured_value: number | null
          metadata: Json
          model_id: string | null
          org_id: string
          space_id: string
          start_point: Json
          unit: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          end_point: Json
          id?: string
          label: string
          measured_value?: number | null
          metadata?: Json
          model_id?: string | null
          org_id: string
          space_id: string
          start_point: Json
          unit?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          end_point?: Json
          id?: string
          label?: string
          measured_value?: number | null
          metadata?: Json
          model_id?: string | null
          org_id?: string
          space_id?: string
          start_point?: Json
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "digital_twin_measurements_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "digital_twin_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "digital_twin_measurements_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "org_usage_summary"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "digital_twin_measurements_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "digital_twin_measurements_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "digital_twin_spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      digital_twin_models: {
        Row: {
          bounds: Json
          capture_id: string | null
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          file_size_bytes: number
          georef: Json
          id: string
          is_primary: boolean
          lidar_prior_key: string | null
          model_format: string
          org_id: string
          preview_storage_key: string | null
          processing_job_id: string | null
          quality_metrics: Json
          space_id: string
          status: string
          storage_key: string
          title: string
          updated_at: string
        }
        Insert: {
          bounds?: Json
          capture_id?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          file_size_bytes?: number
          georef?: Json
          id?: string
          is_primary?: boolean
          lidar_prior_key?: string | null
          model_format?: string
          org_id: string
          preview_storage_key?: string | null
          processing_job_id?: string | null
          quality_metrics?: Json
          space_id: string
          status?: string
          storage_key: string
          title: string
          updated_at?: string
        }
        Update: {
          bounds?: Json
          capture_id?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          file_size_bytes?: number
          georef?: Json
          id?: string
          is_primary?: boolean
          lidar_prior_key?: string | null
          model_format?: string
          org_id?: string
          preview_storage_key?: string | null
          processing_job_id?: string | null
          quality_metrics?: Json
          space_id?: string
          status?: string
          storage_key?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "digital_twin_models_capture_id_fkey"
            columns: ["capture_id"]
            isOneToOne: false
            referencedRelation: "digital_twin_captures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "digital_twin_models_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "org_usage_summary"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "digital_twin_models_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "digital_twin_models_processing_job_fk"
            columns: ["processing_job_id"]
            isOneToOne: false
            referencedRelation: "digital_twin_processing_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "digital_twin_models_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "digital_twin_spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      digital_twin_multipart_parts: {
        Row: {
          etag: string | null
          id: string
          multipart_id: string
          part_number: number
          size_bytes: number
          status: string
          uploaded_at: string | null
        }
        Insert: {
          etag?: string | null
          id?: string
          multipart_id: string
          part_number: number
          size_bytes?: number
          status?: string
          uploaded_at?: string | null
        }
        Update: {
          etag?: string | null
          id?: string
          multipart_id?: string
          part_number?: number
          size_bytes?: number
          status?: string
          uploaded_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "digital_twin_multipart_parts_multipart_id_fkey"
            columns: ["multipart_id"]
            isOneToOne: false
            referencedRelation: "digital_twin_multipart_uploads"
            referencedColumns: ["id"]
          },
        ]
      }
      digital_twin_multipart_uploads: {
        Row: {
          asset_id: string
          completed_at: string | null
          completed_parts: number
          content_type: string | null
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          error_text: string | null
          expires_at: string
          id: string
          org_id: string
          part_size_bytes: number
          s3_upload_id: string
          status: string
          storage_key: string
          total_parts: number
          updated_at: string
        }
        Insert: {
          asset_id: string
          completed_at?: string | null
          completed_parts?: number
          content_type?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          error_text?: string | null
          expires_at: string
          id?: string
          org_id: string
          part_size_bytes: number
          s3_upload_id: string
          status?: string
          storage_key: string
          total_parts: number
          updated_at?: string
        }
        Update: {
          asset_id?: string
          completed_at?: string | null
          completed_parts?: number
          content_type?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          error_text?: string | null
          expires_at?: string
          id?: string
          org_id?: string
          part_size_bytes?: number
          s3_upload_id?: string
          status?: string
          storage_key?: string
          total_parts?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "digital_twin_multipart_uploads_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "digital_twin_capture_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "digital_twin_multipart_uploads_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "org_usage_summary"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "digital_twin_multipart_uploads_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      digital_twin_pin_comments: {
        Row: {
          author_display: string | null
          author_user_id: string | null
          body: string
          created_at: string
          id: string
          is_escalation: boolean
          org_id: string
          parent_id: string | null
          pin_id: string
          share_token_id: string | null
          updated_at: string
        }
        Insert: {
          author_display?: string | null
          author_user_id?: string | null
          body: string
          created_at?: string
          id?: string
          is_escalation?: boolean
          org_id: string
          parent_id?: string | null
          pin_id: string
          share_token_id?: string | null
          updated_at?: string
        }
        Update: {
          author_display?: string | null
          author_user_id?: string | null
          body?: string
          created_at?: string
          id?: string
          is_escalation?: boolean
          org_id?: string
          parent_id?: string | null
          pin_id?: string
          share_token_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "digital_twin_pin_comments_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "org_usage_summary"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "digital_twin_pin_comments_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "digital_twin_pin_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "digital_twin_pin_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "digital_twin_pin_comments_pin_id_fkey"
            columns: ["pin_id"]
            isOneToOne: false
            referencedRelation: "digital_twin_pins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "digital_twin_pin_comments_share_token_fk"
            columns: ["share_token_id"]
            isOneToOne: false
            referencedRelation: "digital_twin_share_tokens"
            referencedColumns: ["id"]
          },
        ]
      }
      digital_twin_pins: {
        Row: {
          body: string | null
          color: string | null
          created_at: string
          created_by: string
          id: string
          model_id: string | null
          normal: Json | null
          org_id: string
          pin_number: number | null
          pin_status: string
          position: Json
          priority: string | null
          space_id: string
          title: string
          trade: string | null
          updated_at: string
        }
        Insert: {
          body?: string | null
          color?: string | null
          created_at?: string
          created_by: string
          id?: string
          model_id?: string | null
          normal?: Json | null
          org_id: string
          pin_number?: number | null
          pin_status?: string
          position: Json
          priority?: string | null
          space_id: string
          title: string
          trade?: string | null
          updated_at?: string
        }
        Update: {
          body?: string | null
          color?: string | null
          created_at?: string
          created_by?: string
          id?: string
          model_id?: string | null
          normal?: Json | null
          org_id?: string
          pin_number?: number | null
          pin_status?: string
          position?: Json
          priority?: string | null
          space_id?: string
          title?: string
          trade?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "digital_twin_pins_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "digital_twin_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "digital_twin_pins_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "org_usage_summary"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "digital_twin_pins_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "digital_twin_pins_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "digital_twin_spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      digital_twin_processing_jobs: {
        Row: {
          attempts: number
          capture_id: string | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          credits_charged: number
          deleted_at: string | null
          deleted_by: string | null
          error_text: string | null
          id: string
          input_asset_ids: string[]
          job_type: string
          lidar_prior_asset_id: string | null
          max_attempts: number
          org_id: string
          output_format: string
          output_model_id: string | null
          output_storage_key: string | null
          preview_storage_key: string | null
          priority: number
          progress_pct: number
          space_id: string
          started_at: string | null
          status: string
          updated_at: string
          worker_run_id: string | null
        }
        Insert: {
          attempts?: number
          capture_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          credits_charged?: number
          deleted_at?: string | null
          deleted_by?: string | null
          error_text?: string | null
          id?: string
          input_asset_ids?: string[]
          job_type: string
          lidar_prior_asset_id?: string | null
          max_attempts?: number
          org_id: string
          output_format?: string
          output_model_id?: string | null
          output_storage_key?: string | null
          preview_storage_key?: string | null
          priority?: number
          progress_pct?: number
          space_id: string
          started_at?: string | null
          status?: string
          updated_at?: string
          worker_run_id?: string | null
        }
        Update: {
          attempts?: number
          capture_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          credits_charged?: number
          deleted_at?: string | null
          deleted_by?: string | null
          error_text?: string | null
          id?: string
          input_asset_ids?: string[]
          job_type?: string
          lidar_prior_asset_id?: string | null
          max_attempts?: number
          org_id?: string
          output_format?: string
          output_model_id?: string | null
          output_storage_key?: string | null
          preview_storage_key?: string | null
          priority?: number
          progress_pct?: number
          space_id?: string
          started_at?: string | null
          status?: string
          updated_at?: string
          worker_run_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "digital_twin_processing_jobs_capture_id_fkey"
            columns: ["capture_id"]
            isOneToOne: false
            referencedRelation: "digital_twin_captures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "digital_twin_processing_jobs_lidar_prior_asset_id_fkey"
            columns: ["lidar_prior_asset_id"]
            isOneToOne: false
            referencedRelation: "digital_twin_capture_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "digital_twin_processing_jobs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "org_usage_summary"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "digital_twin_processing_jobs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "digital_twin_processing_jobs_output_model_id_fkey"
            columns: ["output_model_id"]
            isOneToOne: false
            referencedRelation: "digital_twin_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "digital_twin_processing_jobs_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "digital_twin_spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      digital_twin_punch_annotations: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          export_status: string
          id: string
          last_exported_at: string | null
          org_id: string
          pdf_storage_key: string | null
          pin_id: string | null
          project_punch_item_id: string | null
          space_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          export_status?: string
          id?: string
          last_exported_at?: string | null
          org_id: string
          pdf_storage_key?: string | null
          pin_id?: string | null
          project_punch_item_id?: string | null
          space_id: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          export_status?: string
          id?: string
          last_exported_at?: string | null
          org_id?: string
          pdf_storage_key?: string | null
          pin_id?: string | null
          project_punch_item_id?: string | null
          space_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "digital_twin_punch_annotations_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "org_usage_summary"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "digital_twin_punch_annotations_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "digital_twin_punch_annotations_pin_id_fkey"
            columns: ["pin_id"]
            isOneToOne: false
            referencedRelation: "digital_twin_pins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "digital_twin_punch_annotations_project_punch_item_id_fkey"
            columns: ["project_punch_item_id"]
            isOneToOne: false
            referencedRelation: "project_punch_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "digital_twin_punch_annotations_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "digital_twin_spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      digital_twin_r2_cleanup_queue: {
        Row: {
          attempts: number
          bytes_freed: number
          created_at: string
          error_text: string | null
          id: string
          org_id: string
          processed_at: string | null
          source_id: string | null
          source_table: string
          status: string
          storage_key: string
        }
        Insert: {
          attempts?: number
          bytes_freed?: number
          created_at?: string
          error_text?: string | null
          id?: string
          org_id: string
          processed_at?: string | null
          source_id?: string | null
          source_table: string
          status?: string
          storage_key: string
        }
        Update: {
          attempts?: number
          bytes_freed?: number
          created_at?: string
          error_text?: string | null
          id?: string
          org_id?: string
          processed_at?: string | null
          source_id?: string | null
          source_table?: string
          status?: string
          storage_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "digital_twin_r2_cleanup_queue_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "org_usage_summary"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "digital_twin_r2_cleanup_queue_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      digital_twin_share_tokens: {
        Row: {
          branding_snapshot: Json
          created_at: string
          created_by: string
          download_count: number
          expires_at: string | null
          id: string
          is_revoked: boolean
          label: string | null
          last_viewed_at: string | null
          max_views: number | null
          org_id: string
          password_hash: string | null
          role: string
          space_id: string
          token: string
          updated_at: string
          view_count: number
        }
        Insert: {
          branding_snapshot?: Json
          created_at?: string
          created_by: string
          download_count?: number
          expires_at?: string | null
          id?: string
          is_revoked?: boolean
          label?: string | null
          last_viewed_at?: string | null
          max_views?: number | null
          org_id: string
          password_hash?: string | null
          role?: string
          space_id: string
          token: string
          updated_at?: string
          view_count?: number
        }
        Update: {
          branding_snapshot?: Json
          created_at?: string
          created_by?: string
          download_count?: number
          expires_at?: string | null
          id?: string
          is_revoked?: boolean
          label?: string | null
          last_viewed_at?: string | null
          max_views?: number | null
          org_id?: string
          password_hash?: string | null
          role?: string
          space_id?: string
          token?: string
          updated_at?: string
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "digital_twin_share_tokens_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "org_usage_summary"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "digital_twin_share_tokens_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "digital_twin_share_tokens_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "digital_twin_spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      digital_twin_share_views: {
        Row: {
          id: string
          share_token_id: string
          viewed_at: string
          viewer_ip: string | null
          viewer_ua: string | null
        }
        Insert: {
          id?: string
          share_token_id: string
          viewed_at?: string
          viewer_ip?: string | null
          viewer_ua?: string | null
        }
        Update: {
          id?: string
          share_token_id?: string
          viewed_at?: string
          viewer_ip?: string | null
          viewer_ua?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "digital_twin_share_views_share_token_id_fkey"
            columns: ["share_token_id"]
            isOneToOne: false
            referencedRelation: "digital_twin_share_tokens"
            referencedColumns: ["id"]
          },
        ]
      }
      digital_twin_spaces: {
        Row: {
          created_at: string
          created_by: string
          deleted_at: string | null
          deleted_by: string | null
          description: string | null
          georef: Json
          id: string
          org_id: string
          project_id: string
          published_model_id: string | null
          settings: Json
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          georef?: Json
          id?: string
          org_id: string
          project_id: string
          published_model_id?: string | null
          settings?: Json
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          georef?: Json
          id?: string
          org_id?: string
          project_id?: string
          published_model_id?: string | null
          settings?: Json
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "digital_twin_spaces_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "org_usage_summary"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "digital_twin_spaces_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "digital_twin_spaces_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "digital_twin_spaces_published_model_fk"
            columns: ["published_model_id"]
            isOneToOne: false
            referencedRelation: "digital_twin_models"
            referencedColumns: ["id"]
          },
        ]
      }
      digital_twin_sun_studies: {
        Row: {
          created_at: string
          created_by: string
          id: string
          interval_minutes: number
          latitude: number
          longitude: number
          org_id: string
          shadow_config: Json
          space_id: string
          study_date: string
          time_end: string
          time_start: string
          timezone: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          interval_minutes?: number
          latitude: number
          longitude: number
          org_id: string
          shadow_config?: Json
          space_id: string
          study_date: string
          time_end: string
          time_start: string
          timezone?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          interval_minutes?: number
          latitude?: number
          longitude?: number
          org_id?: string
          shadow_config?: Json
          space_id?: string
          study_date?: string
          time_end?: string
          time_start?: string
          timezone?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "digital_twin_sun_studies_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "org_usage_summary"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "digital_twin_sun_studies_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "digital_twin_sun_studies_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "digital_twin_spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      digital_twin_usage_events: {
        Row: {
          capture_id: string | null
          created_at: string
          event_type: string
          id: string
          metadata: Json
          org_id: string
          project_id: string | null
          quantity: number
          source_id: string | null
          source_table: string | null
          space_id: string | null
          unit: string
          user_id: string | null
        }
        Insert: {
          capture_id?: string | null
          created_at?: string
          event_type: string
          id?: string
          metadata?: Json
          org_id: string
          project_id?: string | null
          quantity?: number
          source_id?: string | null
          source_table?: string | null
          space_id?: string | null
          unit?: string
          user_id?: string | null
        }
        Update: {
          capture_id?: string | null
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json
          org_id?: string
          project_id?: string | null
          quantity?: number
          source_id?: string | null
          source_table?: string | null
          space_id?: string | null
          unit?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "digital_twin_usage_events_capture_id_fkey"
            columns: ["capture_id"]
            isOneToOne: false
            referencedRelation: "digital_twin_captures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "digital_twin_usage_events_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "org_usage_summary"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "digital_twin_usage_events_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "digital_twin_usage_events_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "digital_twin_usage_events_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "digital_twin_spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      digital_twin_versions: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_current: boolean | null
          metrics: Json | null
          name: string
          organization_id: string | null
          primary_asset_id: string | null
          project_id: string | null
          published_at: string | null
          quality_score: number | null
          related_asset_ids: string[] | null
          source_asset_ids: string[] | null
          source_job_id: string | null
          status: string | null
          thumbnail_asset_id: string | null
          updated_at: string | null
          version_number: number
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_current?: boolean | null
          metrics?: Json | null
          name: string
          organization_id?: string | null
          primary_asset_id?: string | null
          project_id?: string | null
          published_at?: string | null
          quality_score?: number | null
          related_asset_ids?: string[] | null
          source_asset_ids?: string[] | null
          source_job_id?: string | null
          status?: string | null
          thumbnail_asset_id?: string | null
          updated_at?: string | null
          version_number?: number
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_current?: boolean | null
          metrics?: Json | null
          name?: string
          organization_id?: string | null
          primary_asset_id?: string | null
          project_id?: string | null
          published_at?: string | null
          quality_score?: number | null
          related_asset_ids?: string[] | null
          source_asset_ids?: string[] | null
          source_job_id?: string | null
          status?: string | null
          thumbnail_asset_id?: string | null
          updated_at?: string | null
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "digital_twin_versions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "digital_twin_versions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "org_usage_summary"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "digital_twin_versions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "digital_twin_versions_primary_asset_id_fkey"
            columns: ["primary_asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "digital_twin_versions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "digital_twin_versions_thumbnail_asset_id_fkey"
            columns: ["thumbnail_asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
        ]
      }
      digital_twin_viewer_states: {
        Row: {
          created_at: string
          created_by: string
          id: string
          is_default: boolean
          model_id: string | null
          org_id: string
          payload: Json
          sort_order: number
          space_id: string
          state_kind: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          is_default?: boolean
          model_id?: string | null
          org_id: string
          payload?: Json
          sort_order?: number
          space_id: string
          state_kind: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          is_default?: boolean
          model_id?: string | null
          org_id?: string
          payload?: Json
          sort_order?: number
          space_id?: string
          state_kind?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "digital_twin_viewer_states_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "digital_twin_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "digital_twin_viewer_states_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "org_usage_summary"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "digital_twin_viewer_states_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "digital_twin_viewer_states_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "digital_twin_spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      digital_twin_viewpoints: {
        Row: {
          book_metadata: Json
          created_at: string
          created_by: string
          id: string
          left_camera: Json
          model_id: string | null
          org_id: string
          right_camera: Json
          sort_order: number
          space_id: string
          title: string
          updated_at: string
          viewpoint_kind: string
        }
        Insert: {
          book_metadata?: Json
          created_at?: string
          created_by: string
          id?: string
          left_camera?: Json
          model_id?: string | null
          org_id: string
          right_camera?: Json
          sort_order?: number
          space_id: string
          title: string
          updated_at?: string
          viewpoint_kind?: string
        }
        Update: {
          book_metadata?: Json
          created_at?: string
          created_by?: string
          id?: string
          left_camera?: Json
          model_id?: string | null
          org_id?: string
          right_camera?: Json
          sort_order?: number
          space_id?: string
          title?: string
          updated_at?: string
          viewpoint_kind?: string
        }
        Relationships: [
          {
            foreignKeyName: "digital_twin_viewpoints_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "digital_twin_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "digital_twin_viewpoints_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "org_usage_summary"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "digital_twin_viewpoints_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "digital_twin_viewpoints_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "digital_twin_spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      document_signatures: {
        Row: {
          created_at: string | null
          document_id: string | null
          id: string
          ip_address: string | null
          is_valid: boolean | null
          legal_name: string | null
          signature_data: string | null
          signature_type: string | null
          signed_at: string | null
          signed_by: string | null
          user_agent: string | null
        }
        Insert: {
          created_at?: string | null
          document_id?: string | null
          id?: string
          ip_address?: string | null
          is_valid?: boolean | null
          legal_name?: string | null
          signature_data?: string | null
          signature_type?: string | null
          signed_at?: string | null
          signed_by?: string | null
          user_agent?: string | null
        }
        Update: {
          created_at?: string | null
          document_id?: string | null
          id?: string
          ip_address?: string | null
          is_valid?: boolean | null
          legal_name?: string | null
          signature_data?: string | null
          signature_type?: string | null
          signed_at?: string | null
          signed_by?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_signatures_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_signatures_signed_by_fkey"
            columns: ["signed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      document_workflows: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          document_id: string | null
          id: string
          name: string
          org_id: string | null
          status: string | null
          steps: Json | null
          updated_at: string | null
          workflow_type: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          document_id?: string | null
          id?: string
          name: string
          org_id?: string | null
          status?: string | null
          steps?: Json | null
          updated_at?: string | null
          workflow_type?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          document_id?: string | null
          id?: string
          name?: string
          org_id?: string | null
          status?: string | null
          steps?: Json | null
          updated_at?: string | null
          workflow_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_workflows_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_workflows_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_workflows_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "org_usage_summary"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "document_workflows_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          allowed_roles: string[] | null
          created_at: string | null
          created_by: string | null
          description: string | null
          document_type: string | null
          file_path: string | null
          file_size: number | null
          file_type: string | null
          id: string
          is_public: boolean | null
          metadata: Json | null
          mime_type: string | null
          name: string
          org_id: string | null
          project_id: string | null
          status: string | null
          tags: string[] | null
          updated_at: string | null
          version: number | null
        }
        Insert: {
          allowed_roles?: string[] | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          document_type?: string | null
          file_path?: string | null
          file_size?: number | null
          file_type?: string | null
          id?: string
          is_public?: boolean | null
          metadata?: Json | null
          mime_type?: string | null
          name: string
          org_id?: string | null
          project_id?: string | null
          status?: string | null
          tags?: string[] | null
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          allowed_roles?: string[] | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          document_type?: string | null
          file_path?: string | null
          file_size?: number | null
          file_type?: string | null
          id?: string
          is_public?: boolean | null
          metadata?: Json | null
          mime_type?: string | null
          name?: string
          org_id?: string | null
          project_id?: string | null
          status?: string | null
          tags?: string[] | null
          updated_at?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "org_usage_summary"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "documents_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      email_notifications: {
        Row: {
          body_html: string | null
          body_text: string | null
          created_at: string | null
          delivered_at: string | null
          failed_at: string | null
          from_email: string | null
          from_name: string | null
          id: string
          org_id: string | null
          provider: string | null
          provider_message_id: string | null
          provider_response: Json | null
          related_id: string | null
          related_type: string | null
          sent_at: string | null
          status: string | null
          subject: string
          template: string | null
          to_email: string
          to_name: string | null
          user_id: string | null
        }
        Insert: {
          body_html?: string | null
          body_text?: string | null
          created_at?: string | null
          delivered_at?: string | null
          failed_at?: string | null
          from_email?: string | null
          from_name?: string | null
          id?: string
          org_id?: string | null
          provider?: string | null
          provider_message_id?: string | null
          provider_response?: Json | null
          related_id?: string | null
          related_type?: string | null
          sent_at?: string | null
          status?: string | null
          subject: string
          template?: string | null
          to_email: string
          to_name?: string | null
          user_id?: string | null
        }
        Update: {
          body_html?: string | null
          body_text?: string | null
          created_at?: string | null
          delivered_at?: string | null
          failed_at?: string | null
          from_email?: string | null
          from_name?: string | null
          id?: string
          org_id?: string | null
          provider?: string | null
          provider_message_id?: string | null
          provider_response?: Json | null
          related_id?: string | null
          related_type?: string | null
          sent_at?: string | null
          status?: string | null
          subject?: string
          template?: string | null
          to_email?: string
          to_name?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_notifications_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "org_usage_summary"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "email_notifications_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          category: string | null
          created_at: string | null
          created_by: string | null
          date: string
          description: string
          id: string
          project_id: string | null
          receipt_url: string | null
          status: string | null
          updated_at: string | null
          vendor: string | null
        }
        Insert: {
          amount: number
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          date: string
          description: string
          id?: string
          project_id?: string | null
          receipt_url?: string | null
          status?: string | null
          updated_at?: string | null
          vendor?: string | null
        }
        Update: {
          amount?: number
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          date?: string
          description?: string
          id?: string
          project_id?: string | null
          receipt_url?: string | null
          status?: string | null
          updated_at?: string | null
          vendor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_flag_overrides: {
        Row: {
          created_at: string | null
          created_by: string | null
          expires_at: string | null
          feature_flag_id: string | null
          id: string
          is_enabled: boolean
          reason: string | null
          target_id: string | null
          target_type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          feature_flag_id?: string | null
          id?: string
          is_enabled: boolean
          reason?: string | null
          target_id?: string | null
          target_type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          feature_flag_id?: string | null
          id?: string
          is_enabled?: boolean
          reason?: string | null
          target_id?: string | null
          target_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feature_flag_overrides_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feature_flag_overrides_feature_flag_id_fkey"
            columns: ["feature_flag_id"]
            isOneToOne: false
            referencedRelation: "feature_flags"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_flags: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          display_name: string | null
          id: string
          is_enabled: boolean | null
          name: string
          rollout_percentage: number | null
          target_audience: Json | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          display_name?: string | null
          id?: string
          is_enabled?: boolean | null
          name: string
          rollout_percentage?: number | null
          target_audience?: Json | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          display_name?: string | null
          id?: string
          is_enabled?: boolean | null
          name?: string
          rollout_percentage?: number | null
          target_audience?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feature_flags_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_requests: {
        Row: {
          admin_notes: string | null
          attachment_url: string | null
          created_at: string | null
          description: string
          id: string
          priority: string | null
          status: string | null
          updated_at: string | null
          user_email: string | null
          user_id: string | null
          user_tier: string | null
        }
        Insert: {
          admin_notes?: string | null
          attachment_url?: string | null
          created_at?: string | null
          description: string
          id?: string
          priority?: string | null
          status?: string | null
          updated_at?: string | null
          user_email?: string | null
          user_id?: string | null
          user_tier?: string | null
        }
        Update: {
          admin_notes?: string | null
          attachment_url?: string | null
          created_at?: string | null
          description?: string
          id?: string
          priority?: string | null
          status?: string | null
          updated_at?: string | null
          user_email?: string | null
          user_id?: string | null
          user_tier?: string | null
        }
        Relationships: []
      }
      feature_suggestions: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          id: string
          org_id: string | null
          status: string | null
          title: string
          updated_at: string | null
          user_id: string | null
          votes: number | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          org_id?: string | null
          status?: string | null
          title: string
          updated_at?: string | null
          user_id?: string | null
          votes?: number | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          org_id?: string | null
          status?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string | null
          votes?: number | null
        }
        Relationships: []
      }
      file_folders: {
        Row: {
          color: string | null
          created_at: string | null
          created_by: string | null
          icon: string | null
          id: string
          is_archived: boolean | null
          is_system_folder: boolean | null
          metadata: Json | null
          name: string
          org_id: string | null
          parent_id: string | null
          path: string
          project_id: string | null
          scope: string | null
          sort_order: number | null
          tab_tag: string | null
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          icon?: string | null
          id?: string
          is_archived?: boolean | null
          is_system_folder?: boolean | null
          metadata?: Json | null
          name: string
          org_id?: string | null
          parent_id?: string | null
          path: string
          project_id?: string | null
          scope?: string | null
          sort_order?: number | null
          tab_tag?: string | null
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          icon?: string | null
          id?: string
          is_archived?: boolean | null
          is_system_folder?: boolean | null
          metadata?: Json | null
          name?: string
          org_id?: string | null
          parent_id?: string | null
          path?: string
          project_id?: string | null
          scope?: string | null
          sort_order?: number | null
          tab_tag?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "file_folders_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "org_usage_summary"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "file_folders_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "file_folders_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "file_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "file_folders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      file_links: {
        Row: {
          created_at: string | null
          created_by: string
          file_id: string
          id: string
          source_tab: string
          target_context: Json | null
          target_tab: string
        }
        Insert: {
          created_at?: string | null
          created_by: string
          file_id: string
          id?: string
          source_tab: string
          target_context?: Json | null
          target_tab: string
        }
        Update: {
          created_at?: string | null
          created_by?: string
          file_id?: string
          id?: string
          source_tab?: string
          target_context?: Json | null
          target_tab?: string
        }
        Relationships: [
          {
            foreignKeyName: "file_links_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "file_links_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "unified_files"
            referencedColumns: ["id"]
          },
        ]
      }
      file_versions: {
        Row: {
          change_description: string | null
          created_at: string | null
          document_id: string | null
          file_path: string
          file_size: number | null
          id: string
          is_current: boolean | null
          mime_type: string | null
          uploaded_by: string | null
          version_number: number
        }
        Insert: {
          change_description?: string | null
          created_at?: string | null
          document_id?: string | null
          file_path: string
          file_size?: number | null
          id?: string
          is_current?: boolean | null
          mime_type?: string | null
          uploaded_by?: string | null
          version_number: number
        }
        Update: {
          change_description?: string | null
          created_at?: string | null
          document_id?: string | null
          file_path?: string
          file_size?: number | null
          id?: string
          is_current?: boolean | null
          mime_type?: string | null
          uploaded_by?: string | null
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "file_versions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "file_versions_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      folder_permissions: {
        Row: {
          allowed_file_types: string[] | null
          can_create_subfolders: boolean | null
          can_delete: boolean | null
          can_download: boolean | null
          can_rename: boolean | null
          can_upload: boolean | null
          can_view: boolean | null
          created_at: string | null
          files_uploaded_count: number | null
          folder_id: string | null
          id: string
          max_file_size_mb: number | null
          stakeholder_id: string | null
          total_uploaded_mb: number | null
          updated_at: string | null
          upload_quota_mb: number | null
        }
        Insert: {
          allowed_file_types?: string[] | null
          can_create_subfolders?: boolean | null
          can_delete?: boolean | null
          can_download?: boolean | null
          can_rename?: boolean | null
          can_upload?: boolean | null
          can_view?: boolean | null
          created_at?: string | null
          files_uploaded_count?: number | null
          folder_id?: string | null
          id?: string
          max_file_size_mb?: number | null
          stakeholder_id?: string | null
          total_uploaded_mb?: number | null
          updated_at?: string | null
          upload_quota_mb?: number | null
        }
        Update: {
          allowed_file_types?: string[] | null
          can_create_subfolders?: boolean | null
          can_delete?: boolean | null
          can_download?: boolean | null
          can_rename?: boolean | null
          can_upload?: boolean | null
          can_view?: boolean | null
          created_at?: string | null
          files_uploaded_count?: number | null
          folder_id?: string | null
          id?: string
          max_file_size_mb?: number | null
          stakeholder_id?: string | null
          total_uploaded_mb?: number | null
          updated_at?: string | null
          upload_quota_mb?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "folder_permissions_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "project_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "folder_permissions_stakeholder_id_fkey"
            columns: ["stakeholder_id"]
            isOneToOne: false
            referencedRelation: "project_stakeholders"
            referencedColumns: ["id"]
          },
        ]
      }
      gdpr_requests: {
        Row: {
          completion_notes: string | null
          created_at: string | null
          description: string | null
          export_completed_at: string | null
          export_file_url: string | null
          id: string
          processed_at: string | null
          processed_by: string | null
          request_type: string
          status: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          completion_notes?: string | null
          created_at?: string | null
          description?: string | null
          export_completed_at?: string | null
          export_file_url?: string | null
          id?: string
          processed_at?: string | null
          processed_by?: string | null
          request_type: string
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          completion_notes?: string | null
          created_at?: string | null
          description?: string | null
          export_completed_at?: string | null
          export_file_url?: string | null
          id?: string
          processed_at?: string | null
          processed_by?: string | null
          request_type?: string
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gdpr_requests_processed_by_fkey"
            columns: ["processed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gdpr_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      inspections: {
        Row: {
          actual_date: string | null
          checklist: Json | null
          completed_date: string | null
          correction_required: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          document_ids: string[] | null
          id: string
          inspection_type: string
          inspector_agency: string | null
          inspector_id: string | null
          inspector_name: string | null
          location: string | null
          notes: string | null
          number: string | null
          org_id: string | null
          photo_ids: string[] | null
          photos: Json | null
          project_id: string
          reinspection_date: string | null
          result: string | null
          result_notes: string | null
          scheduled_date: string | null
          status: string | null
          title: string
          type: string | null
          updated_at: string | null
        }
        Insert: {
          actual_date?: string | null
          checklist?: Json | null
          completed_date?: string | null
          correction_required?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          document_ids?: string[] | null
          id?: string
          inspection_type: string
          inspector_agency?: string | null
          inspector_id?: string | null
          inspector_name?: string | null
          location?: string | null
          notes?: string | null
          number?: string | null
          org_id?: string | null
          photo_ids?: string[] | null
          photos?: Json | null
          project_id: string
          reinspection_date?: string | null
          result?: string | null
          result_notes?: string | null
          scheduled_date?: string | null
          status?: string | null
          title: string
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          actual_date?: string | null
          checklist?: Json | null
          completed_date?: string | null
          correction_required?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          document_ids?: string[] | null
          id?: string
          inspection_type?: string
          inspector_agency?: string | null
          inspector_id?: string | null
          inspector_name?: string | null
          location?: string | null
          notes?: string | null
          number?: string | null
          org_id?: string | null
          photo_ids?: string[] | null
          photos?: Json | null
          project_id?: string
          reinspection_date?: string | null
          result?: string | null
          result_notes?: string | null
          scheduled_date?: string | null
          status?: string | null
          title?: string
          type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inspections_inspector_id_fkey"
            columns: ["inspector_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspections_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "org_usage_summary"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "inspections_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspections_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_activity_log: {
        Row: {
          action: string
          created_at: string | null
          error_message: string | null
          id: string
          integration_id: string | null
          metadata: Json | null
          org_id: string | null
          resource_id: string | null
          resource_type: string | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          integration_id?: string | null
          metadata?: Json | null
          org_id?: string | null
          resource_id?: string | null
          resource_type?: string | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          integration_id?: string | null
          metadata?: Json | null
          org_id?: string | null
          resource_id?: string | null
          resource_type?: string | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "integration_activity_log_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "user_integrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integration_activity_log_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "org_usage_summary"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "integration_activity_log_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integration_activity_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_connections: {
        Row: {
          access_token: string | null
          created_at: string | null
          id: string
          last_sync_at: string | null
          org_id: string
          provider: string
          refresh_token: string | null
          settings: Json | null
          status: string | null
          sync_error: string | null
          token_expires_at: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          access_token?: string | null
          created_at?: string | null
          id?: string
          last_sync_at?: string | null
          org_id: string
          provider: string
          refresh_token?: string | null
          settings?: Json | null
          status?: string | null
          sync_error?: string | null
          token_expires_at?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          access_token?: string | null
          created_at?: string | null
          id?: string
          last_sync_at?: string | null
          org_id?: string
          provider?: string
          refresh_token?: string | null
          settings?: Json | null
          status?: string | null
          sync_error?: string | null
          token_expires_at?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_connections_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "org_usage_summary"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "integration_connections_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integration_connections_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_oauth_states: {
        Row: {
          code_verifier: string | null
          created_at: string | null
          expires_at: string
          id: string
          metadata: Json | null
          org_id: string | null
          provider: string
          redirect_uri: string | null
          state: string
          user_id: string | null
        }
        Insert: {
          code_verifier?: string | null
          created_at?: string | null
          expires_at: string
          id?: string
          metadata?: Json | null
          org_id?: string | null
          provider: string
          redirect_uri?: string | null
          state: string
          user_id?: string | null
        }
        Update: {
          code_verifier?: string | null
          created_at?: string | null
          expires_at?: string
          id?: string
          metadata?: Json | null
          org_id?: string | null
          provider?: string
          redirect_uri?: string | null
          state?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "integration_oauth_states_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "org_usage_summary"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "integration_oauth_states_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integration_oauth_states_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_sync_logs: {
        Row: {
          changes: Json | null
          completed_at: string | null
          connection_id: string
          direction: string
          entity_id: string | null
          entity_type: string
          error_message: string | null
          external_id: string | null
          id: string
          started_at: string | null
          status: string
        }
        Insert: {
          changes?: Json | null
          completed_at?: string | null
          connection_id: string
          direction: string
          entity_id?: string | null
          entity_type: string
          error_message?: string | null
          external_id?: string | null
          id?: string
          started_at?: string | null
          status: string
        }
        Update: {
          changes?: Json | null
          completed_at?: string | null
          connection_id?: string
          direction?: string
          entity_id?: string | null
          entity_type?: string
          error_message?: string | null
          external_id?: string | null
          id?: string
          started_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_sync_logs_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "integration_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_webhooks: {
        Row: {
          created_at: string | null
          events: string[] | null
          id: string
          integration_id: string | null
          is_active: boolean | null
          org_id: string | null
          provider: string
          secret: string | null
          updated_at: string | null
          webhook_id: string
          webhook_url: string
        }
        Insert: {
          created_at?: string | null
          events?: string[] | null
          id?: string
          integration_id?: string | null
          is_active?: boolean | null
          org_id?: string | null
          provider: string
          secret?: string | null
          updated_at?: string | null
          webhook_id: string
          webhook_url: string
        }
        Update: {
          created_at?: string | null
          events?: string[] | null
          id?: string
          integration_id?: string | null
          is_active?: boolean | null
          org_id?: string | null
          provider?: string
          secret?: string | null
          updated_at?: string | null
          webhook_id?: string
          webhook_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_webhooks_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "user_integrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integration_webhooks_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "org_usage_summary"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "integration_webhooks_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      invitation_tokens: {
        Row: {
          created_at: string
          created_by: string
          expires_at: string
          id: string
          invite_type: string
          max_redemptions: number
          metadata: Json
          org_id: string | null
          project_id: string | null
          redeemed_at: string | null
          redeemed_by: string | null
          redeemed_count: number
          status: string
          token: string
        }
        Insert: {
          created_at?: string
          created_by: string
          expires_at: string
          id?: string
          invite_type: string
          max_redemptions?: number
          metadata?: Json
          org_id?: string | null
          project_id?: string | null
          redeemed_at?: string | null
          redeemed_by?: string | null
          redeemed_count?: number
          status?: string
          token?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          expires_at?: string
          id?: string
          invite_type?: string
          max_redemptions?: number
          metadata?: Json
          org_id?: string | null
          project_id?: string | null
          redeemed_at?: string | null
          redeemed_by?: string | null
          redeemed_count?: number
          status?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "invitation_tokens_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "org_usage_summary"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "invitation_tokens_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitation_tokens_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount: number
          client_name: string | null
          created_at: string | null
          created_by: string | null
          due_date: string | null
          id: string
          issue_date: string
          number: string
          pdf_url: string | null
          project_id: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          client_name?: string | null
          created_at?: string | null
          created_by?: string | null
          due_date?: string | null
          id?: string
          issue_date: string
          number: string
          pdf_url?: string | null
          project_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          client_name?: string | null
          created_at?: string | null
          created_by?: string | null
          due_date?: string | null
          id?: string
          issue_date?: string
          number?: string
          pdf_url?: string | null
          project_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      media_assets: {
        Row: {
          collection_id: string | null
          content_type: string
          created_at: string
          duration_secs: number | null
          file_size_bytes: number
          height: number | null
          id: string
          media_type: string
          metadata: Json | null
          org_id: string
          s3_key: string
          tags: string[] | null
          thumbnail_path: string | null
          title: string
          updated_at: string
          uploaded_by: string
          width: number | null
        }
        Insert: {
          collection_id?: string | null
          content_type: string
          created_at?: string
          duration_secs?: number | null
          file_size_bytes?: number
          height?: number | null
          id?: string
          media_type?: string
          metadata?: Json | null
          org_id: string
          s3_key: string
          tags?: string[] | null
          thumbnail_path?: string | null
          title: string
          updated_at?: string
          uploaded_by: string
          width?: number | null
        }
        Update: {
          collection_id?: string | null
          content_type?: string
          created_at?: string
          duration_secs?: number | null
          file_size_bytes?: number
          height?: number | null
          id?: string
          media_type?: string
          metadata?: Json | null
          org_id?: string
          s3_key?: string
          tags?: string[] | null
          thumbnail_path?: string | null
          title?: string
          updated_at?: string
          uploaded_by?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "media_assets_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "media_collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_assets_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "org_usage_summary"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "media_assets_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      media_collections: {
        Row: {
          cover_path: string | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          org_id: string
          project_id: string
          title: string
          updated_at: string
        }
        Insert: {
          cover_path?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          org_id: string
          project_id: string
          title: string
          updated_at?: string
        }
        Update: {
          cover_path?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          org_id?: string
          project_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "media_collections_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "org_usage_summary"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "media_collections_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_collections_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      meetings: {
        Row: {
          action_items: Json | null
          actual_end: string | null
          actual_start: string | null
          agenda: Json | null
          attendees: Json | null
          created_at: string | null
          created_by: string | null
          description: string | null
          document_ids: string[] | null
          duration_minutes: number | null
          id: string
          location: string | null
          meeting_link: string | null
          minutes: string | null
          number: string | null
          org_id: string | null
          organizer_id: string | null
          project_id: string
          scheduled_at: string
          scheduled_end: string | null
          scheduled_start: string | null
          status: string | null
          title: string
          type: string | null
          updated_at: string | null
          virtual_link: string | null
        }
        Insert: {
          action_items?: Json | null
          actual_end?: string | null
          actual_start?: string | null
          agenda?: Json | null
          attendees?: Json | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          document_ids?: string[] | null
          duration_minutes?: number | null
          id?: string
          location?: string | null
          meeting_link?: string | null
          minutes?: string | null
          number?: string | null
          org_id?: string | null
          organizer_id?: string | null
          project_id: string
          scheduled_at: string
          scheduled_end?: string | null
          scheduled_start?: string | null
          status?: string | null
          title: string
          type?: string | null
          updated_at?: string | null
          virtual_link?: string | null
        }
        Update: {
          action_items?: Json | null
          actual_end?: string | null
          actual_start?: string | null
          agenda?: Json | null
          attendees?: Json | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          document_ids?: string[] | null
          duration_minutes?: number | null
          id?: string
          location?: string | null
          meeting_link?: string | null
          minutes?: string | null
          number?: string | null
          org_id?: string | null
          organizer_id?: string | null
          project_id?: string
          scheduled_at?: string
          scheduled_end?: string | null
          scheduled_start?: string | null
          status?: string | null
          title?: string
          type?: string | null
          updated_at?: string | null
          virtual_link?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meetings_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "org_usage_summary"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "meetings_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meetings_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meetings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      model_files: {
        Row: {
          content_type: string
          created_at: string
          file_role: string
          file_size_bytes: number
          filename: string
          id: string
          model_id: string
          s3_key: string
          sort_order: number
        }
        Insert: {
          content_type: string
          created_at?: string
          file_role?: string
          file_size_bytes?: number
          filename: string
          id?: string
          model_id: string
          s3_key: string
          sort_order?: number
        }
        Update: {
          content_type?: string
          created_at?: string
          file_role?: string
          file_size_bytes?: number
          filename?: string
          id?: string
          model_id?: string
          s3_key?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "model_files_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "project_models"
            referencedColumns: ["id"]
          },
        ]
      }
      model_processing_jobs: {
        Row: {
          analysis: Json | null
          completed_at: string | null
          created_at: string | null
          credits_used: number | null
          current_step: string | null
          error_details: Json | null
          error_message: string | null
          id: string
          options: Json | null
          org_id: string | null
          outputs: Json | null
          progress: number | null
          project_id: string | null
          queued_at: string | null
          source_file_count: number | null
          source_format: string
          source_size: number | null
          source_url: string
          started_at: string | null
          status: string | null
          thumbnail_url: string | null
          updated_at: string | null
          user_id: string | null
          worker_id: string | null
        }
        Insert: {
          analysis?: Json | null
          completed_at?: string | null
          created_at?: string | null
          credits_used?: number | null
          current_step?: string | null
          error_details?: Json | null
          error_message?: string | null
          id?: string
          options?: Json | null
          org_id?: string | null
          outputs?: Json | null
          progress?: number | null
          project_id?: string | null
          queued_at?: string | null
          source_file_count?: number | null
          source_format: string
          source_size?: number | null
          source_url: string
          started_at?: string | null
          status?: string | null
          thumbnail_url?: string | null
          updated_at?: string | null
          user_id?: string | null
          worker_id?: string | null
        }
        Update: {
          analysis?: Json | null
          completed_at?: string | null
          created_at?: string | null
          credits_used?: number | null
          current_step?: string | null
          error_details?: Json | null
          error_message?: string | null
          id?: string
          options?: Json | null
          org_id?: string | null
          outputs?: Json | null
          progress?: number | null
          project_id?: string | null
          queued_at?: string | null
          source_file_count?: number | null
          source_format?: string
          source_size?: number | null
          source_url?: string
          started_at?: string | null
          status?: string | null
          thumbnail_url?: string | null
          updated_at?: string | null
          user_id?: string | null
          worker_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "model_processing_jobs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "org_usage_summary"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "model_processing_jobs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "model_processing_jobs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "model_processing_jobs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_templates: {
        Row: {
          body_template: string | null
          created_at: string | null
          email_template: string | null
          id: string
          is_active: boolean | null
          name: string
          notification_type: string
          subject_template: string | null
          updated_at: string | null
        }
        Insert: {
          body_template?: string | null
          created_at?: string | null
          email_template?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          notification_type: string
          subject_template?: string | null
          updated_at?: string | null
        }
        Update: {
          body_template?: string | null
          created_at?: string | null
          email_template?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          notification_type?: string
          subject_template?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      observations: {
        Row: {
          assigned_to: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          location: string | null
          number: string | null
          org_id: string | null
          photos: Json | null
          priority: string | null
          project_id: string | null
          status: string | null
          title: string
          type: string | null
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          location?: string | null
          number?: string | null
          org_id?: string | null
          photos?: Json | null
          priority?: string | null
          project_id?: string | null
          status?: string | null
          title: string
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          location?: string | null
          number?: string | null
          org_id?: string | null
          photos?: Json | null
          priority?: string | null
          project_id?: string | null
          status?: string | null
          title?: string
          type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "observations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      org_app_subscriptions: {
        Row: {
          bundle: string | null
          content_studio: string
          credit_addon_balance: number
          design_studio: string
          digital_twin: string
          org_id: string
          site_walk: string
          slatedrop: string
          storage_addon_gb: number
          tours: string
          updated_at: string
        }
        Insert: {
          bundle?: string | null
          content_studio?: string
          credit_addon_balance?: number
          design_studio?: string
          digital_twin?: string
          org_id: string
          site_walk?: string
          slatedrop?: string
          storage_addon_gb?: number
          tours?: string
          updated_at?: string
        }
        Update: {
          bundle?: string | null
          content_studio?: string
          credit_addon_balance?: number
          design_studio?: string
          digital_twin?: string
          org_id?: string
          site_walk?: string
          slatedrop?: string
          storage_addon_gb?: number
          tours?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_app_subscriptions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "org_usage_summary"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "org_app_subscriptions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_contacts: {
        Row: {
          color: string
          company: string | null
          created_at: string
          created_by: string
          email: string | null
          id: string
          initials: string | null
          is_archived: boolean
          name: string
          notes: string | null
          org_id: string
          phone: string | null
          tags: string[] | null
          title: string | null
          updated_at: string
        }
        Insert: {
          color?: string
          company?: string | null
          created_at?: string
          created_by: string
          email?: string | null
          id?: string
          initials?: string | null
          is_archived?: boolean
          name: string
          notes?: string | null
          org_id: string
          phone?: string | null
          tags?: string[] | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          color?: string
          company?: string | null
          created_at?: string
          created_by?: string
          email?: string | null
          id?: string
          initials?: string | null
          is_archived?: boolean
          name?: string
          notes?: string | null
          org_id?: string
          phone?: string | null
          tags?: string[] | null
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_contacts_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "org_usage_summary"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "org_contacts_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_feature_flags: {
        Row: {
          created_at: string
          digital_twin_seat_limit: number
          digital_twin_seats_used: number
          org_id: string
          site_walk_seat_limit: number
          site_walk_seats_used: number
          standalone_content_studio: boolean
          standalone_design_studio: boolean
          standalone_digital_twin: boolean
          standalone_punchwalk: boolean
          standalone_tour_builder: boolean
          tour_builder_seat_limit: number
          tour_builder_seats_used: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          digital_twin_seat_limit?: number
          digital_twin_seats_used?: number
          org_id: string
          site_walk_seat_limit?: number
          site_walk_seats_used?: number
          standalone_content_studio?: boolean
          standalone_design_studio?: boolean
          standalone_digital_twin?: boolean
          standalone_punchwalk?: boolean
          standalone_tour_builder?: boolean
          tour_builder_seat_limit?: number
          tour_builder_seats_used?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          digital_twin_seat_limit?: number
          digital_twin_seats_used?: number
          org_id?: string
          site_walk_seat_limit?: number
          site_walk_seats_used?: number
          standalone_content_studio?: boolean
          standalone_design_studio?: boolean
          standalone_digital_twin?: boolean
          standalone_punchwalk?: boolean
          standalone_tour_builder?: boolean
          tour_builder_seat_limit?: number
          tour_builder_seats_used?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_feature_flags_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "org_usage_summary"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "org_feature_flags_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_invites: {
        Row: {
          accepted_at: string | null
          created_at: string | null
          email: string
          expires_at: string
          id: string
          invited_by: string | null
          org_id: string | null
          revoked_at: string | null
          revoked_by: string | null
          role_id: string | null
          status: string | null
          token: string
          updated_at: string | null
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string | null
          email: string
          expires_at: string
          id?: string
          invited_by?: string | null
          org_id?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          role_id?: string | null
          status?: string | null
          token: string
          updated_at?: string | null
        }
        Update: {
          accepted_at?: string | null
          created_at?: string | null
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          org_id?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          role_id?: string | null
          status?: string | null
          token?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "org_invites_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_invites_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "org_usage_summary"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "org_invites_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_invites_revoked_by_fkey"
            columns: ["revoked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_invites_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "org_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      org_member_app_access: {
        Row: {
          app_key: string
          granted_at: string
          granted_by: string | null
          org_id: string
          user_id: string
        }
        Insert: {
          app_key: string
          granted_at?: string
          granted_by?: string | null
          org_id: string
          user_id: string
        }
        Update: {
          app_key?: string
          granted_at?: string
          granted_by?: string | null
          org_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_member_app_access_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "org_usage_summary"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "org_member_app_access_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_roles: {
        Row: {
          can_manage_billing: boolean | null
          can_manage_projects: boolean | null
          can_manage_seats: boolean | null
          can_manage_sso: boolean | null
          can_manage_team: boolean | null
          can_view_analytics: boolean | null
          can_view_financials: boolean | null
          created_at: string | null
          description: string | null
          id: string
          is_default: boolean | null
          is_system_role: boolean | null
          name: string
          org_id: string | null
          permissions: Json
          updated_at: string | null
        }
        Insert: {
          can_manage_billing?: boolean | null
          can_manage_projects?: boolean | null
          can_manage_seats?: boolean | null
          can_manage_sso?: boolean | null
          can_manage_team?: boolean | null
          can_view_analytics?: boolean | null
          can_view_financials?: boolean | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_default?: boolean | null
          is_system_role?: boolean | null
          name: string
          org_id?: string | null
          permissions?: Json
          updated_at?: string | null
        }
        Update: {
          can_manage_billing?: boolean | null
          can_manage_projects?: boolean | null
          can_manage_seats?: boolean | null
          can_manage_sso?: boolean | null
          can_manage_team?: boolean | null
          can_view_analytics?: boolean | null
          can_view_financials?: boolean | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_default?: boolean | null
          is_system_role?: boolean | null
          name?: string
          org_id?: string | null
          permissions?: Json
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "org_roles_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "org_usage_summary"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "org_roles_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_subscriptions: {
        Row: {
          billing_interval: string | null
          cancel_at_period_end: boolean
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          metadata: Json
          org_id: string
          sku: Database["public"]["Enums"]["subscription_sku_kind"]
          status: string
          stripe_customer_id: string | null
          stripe_price_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
        }
        Insert: {
          billing_interval?: string | null
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          metadata?: Json
          org_id: string
          sku: Database["public"]["Enums"]["subscription_sku_kind"]
          status?: string
          stripe_customer_id?: string | null
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
        }
        Update: {
          billing_interval?: string | null
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          metadata?: Json
          org_id?: string
          sku?: Database["public"]["Enums"]["subscription_sku_kind"]
          status?: string
          stripe_customer_id?: string | null
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_subscriptions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "org_usage_summary"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "org_subscriptions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_upload_limits: {
        Row: {
          created_at: string | null
          date: string
          id: string
          org_id: string | null
          total_bytes_uploaded: number | null
          updated_at: string | null
          upload_count: number | null
        }
        Insert: {
          created_at?: string | null
          date?: string
          id?: string
          org_id?: string | null
          total_bytes_uploaded?: number | null
          updated_at?: string | null
          upload_count?: number | null
        }
        Update: {
          created_at?: string | null
          date?: string
          id?: string
          org_id?: string | null
          total_bytes_uploaded?: number | null
          updated_at?: string | null
          upload_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "org_upload_limits_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "org_usage_summary"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "org_upload_limits_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_usage: {
        Row: {
          bandwidth_bytes_limit: number | null
          bandwidth_bytes_used: number | null
          compute_units_limit: number | null
          compute_units_used: number | null
          current_period_end: string | null
          current_period_start: string | null
          id: string
          org_id: string | null
          storage_bytes_limit: number | null
          storage_bytes_used: number | null
          updated_at: string | null
        }
        Insert: {
          bandwidth_bytes_limit?: number | null
          bandwidth_bytes_used?: number | null
          compute_units_limit?: number | null
          compute_units_used?: number | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          org_id?: string | null
          storage_bytes_limit?: number | null
          storage_bytes_used?: number | null
          updated_at?: string | null
        }
        Update: {
          bandwidth_bytes_limit?: number | null
          bandwidth_bytes_used?: number | null
          compute_units_limit?: number | null
          compute_units_used?: number | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          org_id?: string | null
          storage_bytes_limit?: number | null
          storage_bytes_used?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "org_usage_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "org_usage_summary"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "org_usage_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_usage_events: {
        Row: {
          bandwidth_bytes_delta: number | null
          compute_units_delta: number | null
          created_at: string | null
          description: string | null
          event_type: string
          id: string
          metadata: Json | null
          org_id: string | null
          resource_id: string | null
          resource_name: string | null
          resource_type: string | null
          storage_bytes_delta: number | null
          user_id: string | null
        }
        Insert: {
          bandwidth_bytes_delta?: number | null
          compute_units_delta?: number | null
          created_at?: string | null
          description?: string | null
          event_type: string
          id?: string
          metadata?: Json | null
          org_id?: string | null
          resource_id?: string | null
          resource_name?: string | null
          resource_type?: string | null
          storage_bytes_delta?: number | null
          user_id?: string | null
        }
        Update: {
          bandwidth_bytes_delta?: number | null
          compute_units_delta?: number | null
          created_at?: string | null
          description?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
          org_id?: string | null
          resource_id?: string | null
          resource_name?: string | null
          resource_type?: string | null
          storage_bytes_delta?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "org_usage_events_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "org_usage_summary"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "org_usage_events_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_usage_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_integrations: {
        Row: {
          access_token: string | null
          api_key: string | null
          auto_sync: boolean | null
          created_at: string | null
          created_by: string | null
          enabled: boolean | null
          id: string
          last_sync_at: string | null
          last_sync_error: string | null
          last_sync_status: string | null
          name: string
          org_id: string | null
          provider: string
          refresh_token: string | null
          settings: Json | null
          status: string
          sync_enabled: boolean | null
          sync_interval_minutes: number | null
          token_expires_at: string | null
          updated_at: string | null
        }
        Insert: {
          access_token?: string | null
          api_key?: string | null
          auto_sync?: boolean | null
          created_at?: string | null
          created_by?: string | null
          enabled?: boolean | null
          id?: string
          last_sync_at?: string | null
          last_sync_error?: string | null
          last_sync_status?: string | null
          name: string
          org_id?: string | null
          provider: string
          refresh_token?: string | null
          settings?: Json | null
          status?: string
          sync_enabled?: boolean | null
          sync_interval_minutes?: number | null
          token_expires_at?: string | null
          updated_at?: string | null
        }
        Update: {
          access_token?: string | null
          api_key?: string | null
          auto_sync?: boolean | null
          created_at?: string | null
          created_by?: string | null
          enabled?: boolean | null
          id?: string
          last_sync_at?: string | null
          last_sync_error?: string | null
          last_sync_status?: string | null
          name?: string
          org_id?: string | null
          provider?: string
          refresh_token?: string | null
          settings?: Json | null
          status?: string
          sync_enabled?: boolean | null
          sync_interval_minutes?: number | null
          token_expires_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      organization_members: {
        Row: {
          deactivated_at: string | null
          deactivated_by: string | null
          id: string
          joined_at: string | null
          org_id: string | null
          org_role_id: string | null
          permissions: Json
          role: string | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          deactivated_at?: string | null
          deactivated_by?: string | null
          id?: string
          joined_at?: string | null
          org_id?: string | null
          org_role_id?: string | null
          permissions?: Json
          role?: string | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          deactivated_at?: string | null
          deactivated_by?: string | null
          id?: string
          joined_at?: string | null
          org_id?: string | null
          org_role_id?: string | null
          permissions?: Json
          role?: string | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_deactivated_by_fkey"
            columns: ["deactivated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_members_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "org_usage_summary"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "organization_members_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_members_org_role_id_fkey"
            columns: ["org_role_id"]
            isOneToOne: false
            referencedRelation: "org_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          address: string | null
          billing_email: string | null
          brand_colors: string[]
          brand_settings: Json
          created_at: string | null
          credits_balance: number
          deliverable_logo_s3_key: string | null
          id: string
          monthly_compute_units: number | null
          name: string
          org_storage_used_bytes: number
          owner_id: string | null
          phone: string | null
          plan_type: string | null
          projects_limit: number | null
          seats_limit: number | null
          seats_purchased: number | null
          seats_used: number | null
          settings: Json | null
          slug: string | null
          storage_limit_bytes: number | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_status: string | null
          tier: string | null
          trial_ends_at: string | null
          updated_at: string | null
          website: string | null
        }
        Insert: {
          address?: string | null
          billing_email?: string | null
          brand_colors?: string[]
          brand_settings?: Json
          created_at?: string | null
          credits_balance?: number
          deliverable_logo_s3_key?: string | null
          id?: string
          monthly_compute_units?: number | null
          name: string
          org_storage_used_bytes?: number
          owner_id?: string | null
          phone?: string | null
          plan_type?: string | null
          projects_limit?: number | null
          seats_limit?: number | null
          seats_purchased?: number | null
          seats_used?: number | null
          settings?: Json | null
          slug?: string | null
          storage_limit_bytes?: number | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string | null
          tier?: string | null
          trial_ends_at?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          address?: string | null
          billing_email?: string | null
          brand_colors?: string[]
          brand_settings?: Json
          created_at?: string | null
          credits_balance?: number
          deliverable_logo_s3_key?: string | null
          id?: string
          monthly_compute_units?: number | null
          name?: string
          org_storage_used_bytes?: number
          owner_id?: string | null
          phone?: string | null
          plan_type?: string | null
          projects_limit?: number | null
          seats_limit?: number | null
          seats_purchased?: number | null
          seats_used?: number | null
          settings?: Json | null
          slug?: string | null
          storage_limit_bytes?: number | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string | null
          tier?: string | null
          trial_ends_at?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Relationships: []
      }
      pay_applications: {
        Row: {
          application_number: string
          contract_amount: number | null
          created_at: string | null
          created_by: string | null
          id: string
          metadata: Json | null
          org_id: string | null
          period_end: string
          period_start: string
          previous_certified: number | null
          project_id: string | null
          retainage: number | null
          status: string | null
          this_period: number | null
          total_certified: number | null
          updated_at: string | null
        }
        Insert: {
          application_number: string
          contract_amount?: number | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          metadata?: Json | null
          org_id?: string | null
          period_end: string
          period_start: string
          previous_certified?: number | null
          project_id?: string | null
          retainage?: number | null
          status?: string | null
          this_period?: number | null
          total_certified?: number | null
          updated_at?: string | null
        }
        Update: {
          application_number?: string
          contract_amount?: number | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          metadata?: Json | null
          org_id?: string | null
          period_end?: string
          period_start?: string
          previous_certified?: number | null
          project_id?: string | null
          retainage?: number | null
          status?: string | null
          this_period?: number | null
          total_certified?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pay_applications_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pay_applications_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "org_usage_summary"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "pay_applications_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pay_applications_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_raster_jobs: {
        Row: {
          attempts: number
          created_at: string
          error_text: string | null
          id: string
          org_id: string
          plan_set_id: string
          status: string
          updated_at: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          error_text?: string | null
          id?: string
          org_id: string
          plan_set_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          attempts?: number
          created_at?: string
          error_text?: string | null
          id?: string
          org_id?: string
          plan_set_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_raster_jobs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "org_usage_summary"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "plan_raster_jobs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_raster_jobs_plan_set_id_fkey"
            columns: ["plan_set_id"]
            isOneToOne: false
            referencedRelation: "site_walk_plan_sets"
            referencedColumns: ["id"]
          },
        ]
      }
      print_jobs: {
        Row: {
          created_at: string | null
          created_by: string | null
          design_project_id: string | null
          dimensions: Json | null
          error_message: string | null
          estimated_cost_cents: number | null
          estimated_material_grams: number | null
          estimated_time_minutes: number | null
          file_id: string | null
          gcode_url: string | null
          id: string
          infill_percent: number | null
          layer_height_mm: number | null
          material: string | null
          org_id: string | null
          preset: string | null
          status: string | null
          support_type: string | null
          supports_enabled: boolean | null
          thumbnail_url: string | null
          updated_at: string | null
          user_id: string | null
          weight_grams: number | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          design_project_id?: string | null
          dimensions?: Json | null
          error_message?: string | null
          estimated_cost_cents?: number | null
          estimated_material_grams?: number | null
          estimated_time_minutes?: number | null
          file_id?: string | null
          gcode_url?: string | null
          id?: string
          infill_percent?: number | null
          layer_height_mm?: number | null
          material?: string | null
          org_id?: string | null
          preset?: string | null
          status?: string | null
          support_type?: string | null
          supports_enabled?: boolean | null
          thumbnail_url?: string | null
          updated_at?: string | null
          user_id?: string | null
          weight_grams?: number | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          design_project_id?: string | null
          dimensions?: Json | null
          error_message?: string | null
          estimated_cost_cents?: number | null
          estimated_material_grams?: number | null
          estimated_time_minutes?: number | null
          file_id?: string | null
          gcode_url?: string | null
          id?: string
          infill_percent?: number | null
          layer_height_mm?: number | null
          material?: string | null
          org_id?: string | null
          preset?: string | null
          status?: string | null
          support_type?: string | null
          supports_enabled?: boolean | null
          thumbnail_url?: string | null
          updated_at?: string | null
          user_id?: string | null
          weight_grams?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "print_jobs_design_project_id_fkey"
            columns: ["design_project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "print_jobs_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "unified_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "print_jobs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "org_usage_summary"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "print_jobs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      processing_jobs: {
        Row: {
          completed_at: string | null
          config: Json | null
          cpu_minutes: number | null
          created_at: string | null
          created_by: string | null
          credits_estimated: number | null
          credits_reserved: boolean | null
          credits_used: number | null
          current_step: string | null
          current_step_number: number | null
          error_code: string | null
          error_message: string | null
          estimated_completion: string | null
          estimated_seconds: number | null
          file_id: string | null
          finished_at: string | null
          gpu_minutes: number | null
          id: string
          input: Json | null
          input_asset_ids: string[] | null
          input_config: Json | null
          input_files: Json | null
          job_type: string
          max_retries: number | null
          memory_mb_peak: number | null
          metadata: Json | null
          name: string | null
          org_id: string | null
          organization_id: string | null
          output_asset_ids: string[] | null
          output_config: Json | null
          output_files: Json | null
          priority: number | null
          progress: number | null
          progress_percent: number | null
          project_id: string | null
          queued_at: string | null
          result: Json | null
          retry_count: number | null
          settings: Json | null
          started_at: string | null
          status: string
          total_steps: number | null
          type: string | null
          updated_at: string | null
          user_id: string | null
          worker_id: string | null
          worker_region: string | null
        }
        Insert: {
          completed_at?: string | null
          config?: Json | null
          cpu_minutes?: number | null
          created_at?: string | null
          created_by?: string | null
          credits_estimated?: number | null
          credits_reserved?: boolean | null
          credits_used?: number | null
          current_step?: string | null
          current_step_number?: number | null
          error_code?: string | null
          error_message?: string | null
          estimated_completion?: string | null
          estimated_seconds?: number | null
          file_id?: string | null
          finished_at?: string | null
          gpu_minutes?: number | null
          id?: string
          input?: Json | null
          input_asset_ids?: string[] | null
          input_config?: Json | null
          input_files?: Json | null
          job_type: string
          max_retries?: number | null
          memory_mb_peak?: number | null
          metadata?: Json | null
          name?: string | null
          org_id?: string | null
          organization_id?: string | null
          output_asset_ids?: string[] | null
          output_config?: Json | null
          output_files?: Json | null
          priority?: number | null
          progress?: number | null
          progress_percent?: number | null
          project_id?: string | null
          queued_at?: string | null
          result?: Json | null
          retry_count?: number | null
          settings?: Json | null
          started_at?: string | null
          status?: string
          total_steps?: number | null
          type?: string | null
          updated_at?: string | null
          user_id?: string | null
          worker_id?: string | null
          worker_region?: string | null
        }
        Update: {
          completed_at?: string | null
          config?: Json | null
          cpu_minutes?: number | null
          created_at?: string | null
          created_by?: string | null
          credits_estimated?: number | null
          credits_reserved?: boolean | null
          credits_used?: number | null
          current_step?: string | null
          current_step_number?: number | null
          error_code?: string | null
          error_message?: string | null
          estimated_completion?: string | null
          estimated_seconds?: number | null
          file_id?: string | null
          finished_at?: string | null
          gpu_minutes?: number | null
          id?: string
          input?: Json | null
          input_asset_ids?: string[] | null
          input_config?: Json | null
          input_files?: Json | null
          job_type?: string
          max_retries?: number | null
          memory_mb_peak?: number | null
          metadata?: Json | null
          name?: string | null
          org_id?: string | null
          organization_id?: string | null
          output_asset_ids?: string[] | null
          output_config?: Json | null
          output_files?: Json | null
          priority?: number | null
          progress?: number | null
          progress_percent?: number | null
          project_id?: string | null
          queued_at?: string | null
          result?: Json | null
          retry_count?: number | null
          settings?: Json | null
          started_at?: string | null
          status?: string
          total_steps?: number | null
          type?: string | null
          updated_at?: string | null
          user_id?: string | null
          worker_id?: string | null
          worker_region?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "processing_jobs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processing_jobs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "org_usage_summary"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "processing_jobs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processing_jobs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          account_status: string
          approved_at: string | null
          approved_by: string | null
          avatar_url: string | null
          beta_joined_at: string | null
          beta_tester: boolean
          company: string | null
          company_size: string | null
          created_at: string | null
          currency: string | null
          date_format: string | null
          default_org_id: string | null
          display_name: string | null
          email: string | null
          first_name: string | null
          font_size: string | null
          foundational_granted_at: string | null
          foundational_member: boolean
          high_contrast: boolean | null
          id: string
          industry: string | null
          is_app_reviewer: boolean
          is_beta_approved: boolean
          is_digital_twin_approved: boolean
          is_foundational_user: boolean
          job_title: string | null
          last_name: string | null
          locale: string | null
          onboarding_completed: boolean | null
          onboarding_completed_at: string | null
          onboarding_skipped_install: boolean
          onboarding_step: number | null
          organization_name: string | null
          phone: string | null
          preferences: Json | null
          primary_use_case: string[] | null
          profile_completed_at: string | null
          reduced_motion: boolean | null
          referral_source: string | null
          rejection_reason: string | null
          role: string | null
          show_guided_tours: boolean | null
          show_help_tooltips: boolean | null
          signup_org_request: string | null
          tier: string | null
          timezone: string | null
          unit_system: string | null
          updated_at: string | null
        }
        Insert: {
          account_status?: string
          approved_at?: string | null
          approved_by?: string | null
          avatar_url?: string | null
          beta_joined_at?: string | null
          beta_tester?: boolean
          company?: string | null
          company_size?: string | null
          created_at?: string | null
          currency?: string | null
          date_format?: string | null
          default_org_id?: string | null
          display_name?: string | null
          email?: string | null
          first_name?: string | null
          font_size?: string | null
          foundational_granted_at?: string | null
          foundational_member?: boolean
          high_contrast?: boolean | null
          id: string
          industry?: string | null
          is_app_reviewer?: boolean
          is_beta_approved?: boolean
          is_digital_twin_approved?: boolean
          is_foundational_user?: boolean
          job_title?: string | null
          last_name?: string | null
          locale?: string | null
          onboarding_completed?: boolean | null
          onboarding_completed_at?: string | null
          onboarding_skipped_install?: boolean
          onboarding_step?: number | null
          organization_name?: string | null
          phone?: string | null
          preferences?: Json | null
          primary_use_case?: string[] | null
          profile_completed_at?: string | null
          reduced_motion?: boolean | null
          referral_source?: string | null
          rejection_reason?: string | null
          role?: string | null
          show_guided_tours?: boolean | null
          show_help_tooltips?: boolean | null
          signup_org_request?: string | null
          tier?: string | null
          timezone?: string | null
          unit_system?: string | null
          updated_at?: string | null
        }
        Update: {
          account_status?: string
          approved_at?: string | null
          approved_by?: string | null
          avatar_url?: string | null
          beta_joined_at?: string | null
          beta_tester?: boolean
          company?: string | null
          company_size?: string | null
          created_at?: string | null
          currency?: string | null
          date_format?: string | null
          default_org_id?: string | null
          display_name?: string | null
          email?: string | null
          first_name?: string | null
          font_size?: string | null
          foundational_granted_at?: string | null
          foundational_member?: boolean
          high_contrast?: boolean | null
          id?: string
          industry?: string | null
          is_app_reviewer?: boolean
          is_beta_approved?: boolean
          is_digital_twin_approved?: boolean
          is_foundational_user?: boolean
          job_title?: string | null
          last_name?: string | null
          locale?: string | null
          onboarding_completed?: boolean | null
          onboarding_completed_at?: string | null
          onboarding_skipped_install?: boolean
          onboarding_step?: number | null
          organization_name?: string | null
          phone?: string | null
          preferences?: Json | null
          primary_use_case?: string[] | null
          profile_completed_at?: string | null
          reduced_motion?: boolean | null
          referral_source?: string | null
          rejection_reason?: string | null
          role?: string | null
          show_guided_tours?: boolean | null
          show_help_tooltips?: boolean | null
          signup_org_request?: string | null
          tier?: string | null
          timezone?: string | null
          unit_system?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      project_activity: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_read: boolean | null
          metadata: Json | null
          org_id: string | null
          project_id: string | null
          read_at: string | null
          severity: string | null
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_read?: boolean | null
          metadata?: Json | null
          org_id?: string | null
          project_id?: string | null
          read_at?: string | null
          severity?: string | null
          title: string
          type: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_read?: boolean | null
          metadata?: Json | null
          org_id?: string | null
          project_id?: string | null
          read_at?: string | null
          severity?: string | null
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_activity_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "org_usage_summary"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "project_activity_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_activity_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_activity_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      project_assets: {
        Row: {
          asset_reference: string
          asset_type: string
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          metadata: Json | null
          org_id: string | null
          project_id: string | null
          thumbnail_url: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          asset_reference: string
          asset_type: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          org_id?: string | null
          project_id?: string | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          asset_reference?: string
          asset_type?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          org_id?: string | null
          project_id?: string | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_assets_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_assets_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "org_usage_summary"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "project_assets_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_assets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_budgets: {
        Row: {
          budget_amount: number
          category: string | null
          change_order_amount: number | null
          cost_code: string
          created_at: string
          description: string | null
          forecast_amount: number | null
          id: string
          notes: string | null
          project_id: string
          spent_amount: number
          updated_at: string | null
        }
        Insert: {
          budget_amount?: number
          category?: string | null
          change_order_amount?: number | null
          cost_code: string
          created_at?: string
          description?: string | null
          forecast_amount?: number | null
          id?: string
          notes?: string | null
          project_id: string
          spent_amount?: number
          updated_at?: string | null
        }
        Update: {
          budget_amount?: number
          category?: string | null
          change_order_amount?: number | null
          cost_code?: string
          created_at?: string
          description?: string | null
          forecast_amount?: number | null
          id?: string
          notes?: string | null
          project_id?: string
          spent_amount?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_budgets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_collaborator_invites: {
        Row: {
          accepted_at: string | null
          channel: string
          created_at: string
          email: string | null
          id: string
          invitation_token: string | null
          invited_by: string
          last_sent_at: string | null
          message: string | null
          phone: string | null
          project_id: string
          revoked_at: string | null
          role: string
          send_count: number
          status: string
        }
        Insert: {
          accepted_at?: string | null
          channel: string
          created_at?: string
          email?: string | null
          id?: string
          invitation_token?: string | null
          invited_by: string
          last_sent_at?: string | null
          message?: string | null
          phone?: string | null
          project_id: string
          revoked_at?: string | null
          role?: string
          send_count?: number
          status?: string
        }
        Update: {
          accepted_at?: string | null
          channel?: string
          created_at?: string
          email?: string | null
          id?: string
          invitation_token?: string | null
          invited_by?: string
          last_sent_at?: string | null
          message?: string | null
          phone?: string | null
          project_id?: string
          revoked_at?: string | null
          role?: string
          send_count?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_collaborator_invites_invitation_token_fkey"
            columns: ["invitation_token"]
            isOneToOne: false
            referencedRelation: "invitation_tokens"
            referencedColumns: ["token"]
          },
          {
            foreignKeyName: "project_collaborator_invites_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_contracts: {
        Row: {
          contract_type: string | null
          contract_value: number | null
          created_at: string
          executed_date: string | null
          file_upload_id: string | null
          file_url: string | null
          id: string
          key_requirements: string | null
          notes: string | null
          parties: string | null
          project_id: string
          status: string
          summary: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          contract_type?: string | null
          contract_value?: number | null
          created_at?: string
          executed_date?: string | null
          file_upload_id?: string | null
          file_url?: string | null
          id?: string
          key_requirements?: string | null
          notes?: string | null
          parties?: string | null
          project_id: string
          status?: string
          summary?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          contract_type?: string | null
          contract_value?: number | null
          created_at?: string
          executed_date?: string | null
          file_upload_id?: string | null
          file_url?: string | null
          id?: string
          key_requirements?: string | null
          notes?: string | null
          parties?: string | null
          project_id?: string
          status?: string
          summary?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_contracts_file_upload_id_fkey"
            columns: ["file_upload_id"]
            isOneToOne: false
            referencedRelation: "slatedrop_uploads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_contracts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_daily_logs: {
        Row: {
          created_at: string
          created_by: string
          crew_counts: Json | null
          delays: string | null
          equipment: Json | null
          id: string
          log_date: string
          photos: Json | null
          project_id: string
          safety_observations: string | null
          summary: string | null
          updated_at: string
          visitors: string | null
          weather_condition: string | null
          weather_precip: string | null
          weather_temp: number | null
          weather_wind: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          crew_counts?: Json | null
          delays?: string | null
          equipment?: Json | null
          id?: string
          log_date: string
          photos?: Json | null
          project_id: string
          safety_observations?: string | null
          summary?: string | null
          updated_at?: string
          visitors?: string | null
          weather_condition?: string | null
          weather_precip?: string | null
          weather_temp?: number | null
          weather_wind?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          crew_counts?: Json | null
          delays?: string | null
          equipment?: Json | null
          id?: string
          log_date?: string
          photos?: Json | null
          project_id?: string
          safety_observations?: string | null
          summary?: string | null
          updated_at?: string
          visitors?: string | null
          weather_condition?: string | null
          weather_precip?: string | null
          weather_temp?: number | null
          weather_wind?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_daily_logs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_documents: {
        Row: {
          content: Json | null
          created_at: string | null
          created_by: string | null
          id: string
          number: string
          project_id: string | null
          status: string
          title: string | null
          type: string
          updated_at: string | null
        }
        Insert: {
          content?: Json | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          number: string
          project_id?: string | null
          status?: string
          title?: string | null
          type: string
          updated_at?: string | null
        }
        Update: {
          content?: Json | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          number?: string
          project_id?: string | null
          status?: string
          title?: string | null
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_external_links: {
        Row: {
          created_at: string
          created_by: string
          expires_at: string | null
          folder_id: string | null
          id: string
          is_active: boolean
          project_id: string
          target_id: string | null
          target_type: string | null
          token: string
        }
        Insert: {
          created_at?: string
          created_by: string
          expires_at?: string | null
          folder_id?: string | null
          id?: string
          is_active?: boolean
          project_id: string
          target_id?: string | null
          target_type?: string | null
          token: string
        }
        Update: {
          created_at?: string
          created_by?: string
          expires_at?: string | null
          folder_id?: string | null
          id?: string
          is_active?: boolean
          project_id?: string
          target_id?: string | null
          target_type?: string | null
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_external_links_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_file_links: {
        Row: {
          created_at: string | null
          created_by: string | null
          download_count: number | null
          expires_at: string | null
          file_id: string | null
          folder_path: string | null
          id: string
          is_active: boolean | null
          link_type: string | null
          max_downloads: number | null
          org_id: string | null
          password_hash: string | null
          project_id: string | null
          token: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          download_count?: number | null
          expires_at?: string | null
          file_id?: string | null
          folder_path?: string | null
          id?: string
          is_active?: boolean | null
          link_type?: string | null
          max_downloads?: number | null
          org_id?: string | null
          password_hash?: string | null
          project_id?: string | null
          token: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          download_count?: number | null
          expires_at?: string | null
          file_id?: string | null
          folder_path?: string | null
          id?: string
          is_active?: boolean | null
          link_type?: string | null
          max_downloads?: number | null
          org_id?: string | null
          password_hash?: string | null
          project_id?: string | null
          token?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_file_links_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_file_links_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "project_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_file_links_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "org_usage_summary"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "project_file_links_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_file_links_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_files: {
        Row: {
          content_type: string | null
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          file_name: string
          folder_path: string
          id: string
          is_deleted: boolean | null
          org_id: string | null
          project_id: string | null
          s3_key: string
          scope: string
          size_bytes: number
          updated_at: string | null
          visibility: string | null
        }
        Insert: {
          content_type?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          file_name: string
          folder_path?: string
          id?: string
          is_deleted?: boolean | null
          org_id?: string | null
          project_id?: string | null
          s3_key: string
          scope?: string
          size_bytes?: number
          updated_at?: string | null
          visibility?: string | null
        }
        Update: {
          content_type?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          file_name?: string
          folder_path?: string
          id?: string
          is_deleted?: boolean | null
          org_id?: string | null
          project_id?: string | null
          s3_key?: string
          scope?: string
          size_bytes?: number
          updated_at?: string | null
          visibility?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_files_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_files_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_files_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "org_usage_summary"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "project_files_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_files_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_folders: {
        Row: {
          allow_download: boolean | null
          allow_upload: boolean | null
          color: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          folder_path: string
          folder_type: string | null
          icon: string | null
          id: string
          is_public: boolean | null
          is_system: boolean | null
          metadata: Json | null
          name: string
          org_id: string | null
          parent_id: string | null
          project_id: string | null
          scope: string
          sort_order: number | null
          tab_tag: string | null
          updated_at: string | null
        }
        Insert: {
          allow_download?: boolean | null
          allow_upload?: boolean | null
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          folder_path: string
          folder_type?: string | null
          icon?: string | null
          id?: string
          is_public?: boolean | null
          is_system?: boolean | null
          metadata?: Json | null
          name: string
          org_id?: string | null
          parent_id?: string | null
          project_id?: string | null
          scope?: string
          sort_order?: number | null
          tab_tag?: string | null
          updated_at?: string | null
        }
        Update: {
          allow_download?: boolean | null
          allow_upload?: boolean | null
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          folder_path?: string
          folder_type?: string | null
          icon?: string | null
          id?: string
          is_public?: boolean | null
          is_system?: boolean | null
          metadata?: Json | null
          name?: string
          org_id?: string | null
          parent_id?: string | null
          project_id?: string | null
          scope?: string
          sort_order?: number | null
          tab_tag?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_folders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_folders_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "org_usage_summary"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "project_folders_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_folders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_history_events: {
        Row: {
          actor_user_id: string | null
          created_at: string
          details: Json
          entity_id: string | null
          entity_type: string | null
          event_type: string
          folder_path: string | null
          id: string
          org_id: string
          project_id: string | null
          title: string | null
        }
        Insert: {
          actor_user_id?: string | null
          created_at?: string
          details?: Json
          entity_id?: string | null
          entity_type?: string | null
          event_type: string
          folder_path?: string | null
          id?: string
          org_id: string
          project_id?: string | null
          title?: string | null
        }
        Update: {
          actor_user_id?: string | null
          created_at?: string
          details?: Json
          entity_id?: string | null
          entity_type?: string | null
          event_type?: string
          folder_path?: string | null
          id?: string
          org_id?: string
          project_id?: string | null
          title?: string | null
        }
        Relationships: []
      }
      project_members: {
        Row: {
          created_at: string | null
          id: string
          invited_at: string | null
          invited_by: string | null
          joined_at: string | null
          permissions: Json | null
          project_id: string
          role_id: string
          status: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          joined_at?: string | null
          permissions?: Json | null
          project_id: string
          role_id?: string
          status?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          joined_at?: string | null
          permissions?: Json | null
          project_id?: string
          role_id?: string
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_members_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      project_models: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          model_type: string
          org_id: string
          project_id: string
          status: string
          thumbnail_path: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          model_type?: string
          org_id: string
          project_id: string
          status?: string
          thumbnail_path?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          model_type?: string
          org_id?: string
          project_id?: string
          status?: string
          thumbnail_path?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_models_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "org_usage_summary"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "project_models_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_models_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          link_path: string | null
          message: string
          project_id: string
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          link_path?: string | null
          message: string
          project_id: string
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          link_path?: string | null
          message?: string
          project_id?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_notifications_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_observations: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          location: string | null
          photos: string[] | null
          project_id: string | null
          tags: string[] | null
          title: string
          type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          location?: string | null
          photos?: string[] | null
          project_id?: string | null
          tags?: string[] | null
          title: string
          type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          location?: string | null
          photos?: string[] | null
          project_id?: string | null
          tags?: string[] | null
          title?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_observations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_observations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_punch_items: {
        Row: {
          assignee: string | null
          completed_at: string | null
          created_at: string
          created_by: string
          description: string | null
          due_date: string | null
          id: string
          location_area: string | null
          number: number
          photos: Json | null
          priority: string
          project_id: string
          status: string
          title: string
          trade_category: string | null
          updated_at: string
        }
        Insert: {
          assignee?: string | null
          completed_at?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          due_date?: string | null
          id?: string
          location_area?: string | null
          number?: number
          photos?: Json | null
          priority?: string
          project_id: string
          status?: string
          title: string
          trade_category?: string | null
          updated_at?: string
        }
        Update: {
          assignee?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          due_date?: string | null
          id?: string
          location_area?: string | null
          number?: number
          photos?: Json | null
          priority?: string
          project_id?: string
          status?: string
          title?: string
          trade_category?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_punch_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_rfis: {
        Row: {
          artifact_upload_id: string | null
          assigned_to: string | null
          ball_in_court: string | null
          closed_at: string | null
          cost_impact: number | null
          created_at: string
          created_by: string
          distribution: Json | null
          due_date: string | null
          id: string
          priority: string | null
          project_id: string
          question: string
          response_text: string | null
          rfi_number: number
          schedule_impact: number | null
          status: string
          subject: string
          updated_at: string | null
        }
        Insert: {
          artifact_upload_id?: string | null
          assigned_to?: string | null
          ball_in_court?: string | null
          closed_at?: string | null
          cost_impact?: number | null
          created_at?: string
          created_by: string
          distribution?: Json | null
          due_date?: string | null
          id?: string
          priority?: string | null
          project_id: string
          question: string
          response_text?: string | null
          rfi_number?: number
          schedule_impact?: number | null
          status?: string
          subject: string
          updated_at?: string | null
        }
        Update: {
          artifact_upload_id?: string | null
          assigned_to?: string | null
          ball_in_court?: string | null
          closed_at?: string | null
          cost_impact?: number | null
          created_at?: string
          created_by?: string
          distribution?: Json | null
          due_date?: string | null
          id?: string
          priority?: string | null
          project_id?: string
          question?: string
          response_text?: string | null
          rfi_number?: number
          schedule_impact?: number | null
          status?: string
          subject?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_rfis_artifact_upload_id_fkey"
            columns: ["artifact_upload_id"]
            isOneToOne: false
            referencedRelation: "slatedrop_uploads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_rfis_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_stakeholders: {
        Row: {
          accepted_at: string | null
          access_token: string | null
          can_delete_project: boolean | null
          can_edit_project: boolean | null
          can_manage_stakeholders: boolean | null
          can_view_project: boolean | null
          company: string | null
          created_at: string | null
          display_name: string | null
          email: string
          email_notifications: boolean | null
          expires_at: string | null
          id: string
          invitation_message: string | null
          invited_at: string | null
          invited_by: string | null
          is_active: boolean | null
          last_accessed_at: string | null
          notes: string | null
          notify_on_comments: boolean | null
          notify_on_uploads: boolean | null
          org_id: string | null
          project_id: string | null
          role: string | null
          updated_at: string | null
        }
        Insert: {
          accepted_at?: string | null
          access_token?: string | null
          can_delete_project?: boolean | null
          can_edit_project?: boolean | null
          can_manage_stakeholders?: boolean | null
          can_view_project?: boolean | null
          company?: string | null
          created_at?: string | null
          display_name?: string | null
          email: string
          email_notifications?: boolean | null
          expires_at?: string | null
          id?: string
          invitation_message?: string | null
          invited_at?: string | null
          invited_by?: string | null
          is_active?: boolean | null
          last_accessed_at?: string | null
          notes?: string | null
          notify_on_comments?: boolean | null
          notify_on_uploads?: boolean | null
          org_id?: string | null
          project_id?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Update: {
          accepted_at?: string | null
          access_token?: string | null
          can_delete_project?: boolean | null
          can_edit_project?: boolean | null
          can_manage_stakeholders?: boolean | null
          can_view_project?: boolean | null
          company?: string | null
          created_at?: string | null
          display_name?: string | null
          email?: string
          email_notifications?: boolean | null
          expires_at?: string | null
          id?: string
          invitation_message?: string | null
          invited_at?: string | null
          invited_by?: string | null
          is_active?: boolean | null
          last_accessed_at?: string | null
          notes?: string | null
          notify_on_comments?: boolean | null
          notify_on_uploads?: boolean | null
          org_id?: string | null
          project_id?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_stakeholders_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_stakeholders_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "org_usage_summary"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "project_stakeholders_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_stakeholders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_submittals: {
        Row: {
          amount: number | null
          artifact_upload_id: string | null
          created_at: string
          created_by: string
          document_code: string | null
          document_type: string | null
          due_date: string | null
          id: string
          last_response_at: string | null
          lead_time_days: number | null
          project_id: string
          received_date: string | null
          required_date: string | null
          response_decision: string | null
          response_text: string | null
          responsible_contractor: string | null
          revision_number: number | null
          sent_at: string | null
          spec_section: string | null
          stakeholder_email: string | null
          status: string
          submittal_number: number
          title: string
          updated_at: string | null
          version_number: number | null
        }
        Insert: {
          amount?: number | null
          artifact_upload_id?: string | null
          created_at?: string
          created_by: string
          document_code?: string | null
          document_type?: string | null
          due_date?: string | null
          id?: string
          last_response_at?: string | null
          lead_time_days?: number | null
          project_id: string
          received_date?: string | null
          required_date?: string | null
          response_decision?: string | null
          response_text?: string | null
          responsible_contractor?: string | null
          revision_number?: number | null
          sent_at?: string | null
          spec_section?: string | null
          stakeholder_email?: string | null
          status?: string
          submittal_number?: number
          title: string
          updated_at?: string | null
          version_number?: number | null
        }
        Update: {
          amount?: number | null
          artifact_upload_id?: string | null
          created_at?: string
          created_by?: string
          document_code?: string | null
          document_type?: string | null
          due_date?: string | null
          id?: string
          last_response_at?: string | null
          lead_time_days?: number | null
          project_id?: string
          received_date?: string | null
          required_date?: string | null
          response_decision?: string | null
          response_text?: string | null
          responsible_contractor?: string | null
          revision_number?: number | null
          sent_at?: string | null
          spec_section?: string | null
          stakeholder_email?: string | null
          status?: string
          submittal_number?: number
          title?: string
          updated_at?: string | null
          version_number?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "project_submittals_artifact_upload_id_fkey"
            columns: ["artifact_upload_id"]
            isOneToOne: false
            referencedRelation: "slatedrop_uploads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_submittals_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_tasks: {
        Row: {
          assigned_to: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          due_date: string | null
          id: string
          is_milestone: boolean | null
          notes: string | null
          percent_complete: number | null
          priority: string | null
          project_id: string | null
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          is_milestone?: boolean | null
          notes?: string | null
          percent_complete?: number | null
          priority?: string | null
          project_id?: string | null
          status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          is_milestone?: boolean | null
          notes?: string | null
          percent_complete?: number | null
          priority?: string | null
          project_id?: string | null
          status?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_tours: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          logo_asset_path: string | null
          logo_opacity: number | null
          logo_position: string | null
          logo_width_percent: number | null
          org_id: string
          project_id: string
          status: string
          title: string
          updated_at: string
          viewer_slug: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          logo_asset_path?: string | null
          logo_opacity?: number | null
          logo_position?: string | null
          logo_width_percent?: number | null
          org_id: string
          project_id: string
          status?: string
          title: string
          updated_at?: string
          viewer_slug?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          logo_asset_path?: string | null
          logo_opacity?: number | null
          logo_position?: string | null
          logo_width_percent?: number | null
          org_id?: string
          project_id?: string
          status?: string
          title?: string
          updated_at?: string
          viewer_slug?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_tours_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "org_usage_summary"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "project_tours_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_tours_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          address: string | null
          budget: number | null
          budget_spent: number | null
          budget_total: number | null
          client_contact_id: string | null
          client_name: string | null
          code: string | null
          contract_type: string | null
          contract_value: number | null
          converted_at: string | null
          converted_from_id: string | null
          created_at: string | null
          created_by: string | null
          data: Json | null
          description: string | null
          end_date: string | null
          id: string
          is_archived: boolean
          latitude: number | null
          location: string | null
          longitude: number | null
          metadata: Json | null
          name: string
          org_id: string | null
          overall_progress: number | null
          project_type: string
          report_defaults: Json
          scope: string | null
          settings: Json | null
          start_date: string | null
          status: string | null
          thumbnail_url: string | null
          type: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          budget?: number | null
          budget_spent?: number | null
          budget_total?: number | null
          client_contact_id?: string | null
          client_name?: string | null
          code?: string | null
          contract_type?: string | null
          contract_value?: number | null
          converted_at?: string | null
          converted_from_id?: string | null
          created_at?: string | null
          created_by?: string | null
          data?: Json | null
          description?: string | null
          end_date?: string | null
          id?: string
          is_archived?: boolean
          latitude?: number | null
          location?: string | null
          longitude?: number | null
          metadata?: Json | null
          name: string
          org_id?: string | null
          overall_progress?: number | null
          project_type?: string
          report_defaults?: Json
          scope?: string | null
          settings?: Json | null
          start_date?: string | null
          status?: string | null
          thumbnail_url?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          budget?: number | null
          budget_spent?: number | null
          budget_total?: number | null
          client_contact_id?: string | null
          client_name?: string | null
          code?: string | null
          contract_type?: string | null
          contract_value?: number | null
          converted_at?: string | null
          converted_from_id?: string | null
          created_at?: string | null
          created_by?: string | null
          data?: Json | null
          description?: string | null
          end_date?: string | null
          id?: string
          is_archived?: boolean
          latitude?: number | null
          location?: string | null
          longitude?: number | null
          metadata?: Json | null
          name?: string
          org_id?: string | null
          overall_progress?: number | null
          project_type?: string
          report_defaults?: Json
          scope?: string | null
          settings?: Json | null
          start_date?: string | null
          status?: string | null
          thumbnail_url?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_client_contact_id_fkey"
            columns: ["client_contact_id"]
            isOneToOne: false
            referencedRelation: "org_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_converted_from_id_fkey"
            columns: ["converted_from_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "org_usage_summary"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "projects_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      punch_items: {
        Row: {
          area: string | null
          assigned_to: string | null
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          due_date: string | null
          floor: string | null
          id: string
          location: string | null
          org_id: string | null
          photos: Json | null
          priority: string | null
          project_id: string
          punch_number: string
          status: string | null
          title: string
          updated_at: string | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          area?: string | null
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          floor?: string | null
          id?: string
          location?: string | null
          org_id?: string | null
          photos?: Json | null
          priority?: string | null
          project_id: string
          punch_number: string
          status?: string | null
          title: string
          updated_at?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          area?: string | null
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          floor?: string | null
          id?: string
          location?: string | null
          org_id?: string | null
          photos?: Json | null
          priority?: string | null
          project_id?: string
          punch_number?: string
          status?: string | null
          title?: string
          updated_at?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "punch_items_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "punch_items_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "punch_items_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "org_usage_summary"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "punch_items_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "punch_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "punch_items_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      punch_lists: {
        Row: {
          area: string | null
          assigned_to: string | null
          completed_date: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          due_date: string | null
          id: string
          item_number: string
          location: Json | null
          number: string | null
          org_id: string | null
          photos: Json | null
          priority: string | null
          project_id: string
          responsible_party: string | null
          status: string | null
          title: string
          trade: string | null
          updated_at: string | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          area?: string | null
          assigned_to?: string | null
          completed_date?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          item_number: string
          location?: Json | null
          number?: string | null
          org_id?: string | null
          photos?: Json | null
          priority?: string | null
          project_id: string
          responsible_party?: string | null
          status?: string | null
          title: string
          trade?: string | null
          updated_at?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          area?: string | null
          assigned_to?: string | null
          completed_date?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          item_number?: string
          location?: Json | null
          number?: string | null
          org_id?: string | null
          photos?: Json | null
          priority?: string | null
          project_id?: string
          responsible_party?: string | null
          status?: string | null
          title?: string
          trade?: string | null
          updated_at?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "punch_lists_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "punch_lists_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "punch_lists_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "org_usage_summary"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "punch_lists_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "punch_lists_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "punch_lists_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      query_performance_logs: {
        Row: {
          created_at: string | null
          endpoint: string | null
          execution_time_ms: number | null
          id: string
          org_id: string | null
          query_plan: Json | null
          query_type: string
          row_count: number | null
          table_name: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          endpoint?: string | null
          execution_time_ms?: number | null
          id?: string
          org_id?: string | null
          query_plan?: Json | null
          query_type: string
          row_count?: number | null
          table_name?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          endpoint?: string | null
          execution_time_ms?: number | null
          id?: string
          org_id?: string | null
          query_plan?: Json | null
          query_type?: string
          row_count?: number | null
          table_name?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "query_performance_logs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "org_usage_summary"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "query_performance_logs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "query_performance_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      rfis: {
        Row: {
          assigned_to: string | null
          attachments: Json | null
          ball_in_court: string | null
          cost_impact: number | null
          created_at: string | null
          created_by: string | null
          date_answered: string | null
          date_required: string | null
          description: string | null
          drawing_number: string | null
          due_date: string | null
          id: string
          location: Json | null
          org_id: string | null
          priority: string | null
          project_id: string
          responded_at: string | null
          response: string | null
          response_at: string | null
          response_by: string | null
          rfi_number: string
          schedule_impact_days: number | null
          spec_section: string | null
          status: string | null
          subject: string
          updated_at: string | null
          workflow_status: string | null
        }
        Insert: {
          assigned_to?: string | null
          attachments?: Json | null
          ball_in_court?: string | null
          cost_impact?: number | null
          created_at?: string | null
          created_by?: string | null
          date_answered?: string | null
          date_required?: string | null
          description?: string | null
          drawing_number?: string | null
          due_date?: string | null
          id?: string
          location?: Json | null
          org_id?: string | null
          priority?: string | null
          project_id: string
          responded_at?: string | null
          response?: string | null
          response_at?: string | null
          response_by?: string | null
          rfi_number: string
          schedule_impact_days?: number | null
          spec_section?: string | null
          status?: string | null
          subject: string
          updated_at?: string | null
          workflow_status?: string | null
        }
        Update: {
          assigned_to?: string | null
          attachments?: Json | null
          ball_in_court?: string | null
          cost_impact?: number | null
          created_at?: string | null
          created_by?: string | null
          date_answered?: string | null
          date_required?: string | null
          description?: string | null
          drawing_number?: string | null
          due_date?: string | null
          id?: string
          location?: Json | null
          org_id?: string | null
          priority?: string | null
          project_id?: string
          responded_at?: string | null
          response?: string | null
          response_at?: string | null
          response_by?: string | null
          rfi_number?: string
          schedule_impact_days?: number | null
          spec_section?: string | null
          status?: string | null
          subject?: string
          updated_at?: string | null
          workflow_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rfis_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfis_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfis_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "org_usage_summary"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "rfis_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfis_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfis_response_by_fkey"
            columns: ["response_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      schedule_milestones: {
        Row: {
          actual_date: string | null
          created_at: string | null
          id: string
          name: string
          project_id: string | null
          status: string | null
          target_date: string | null
          updated_at: string | null
        }
        Insert: {
          actual_date?: string | null
          created_at?: string | null
          id?: string
          name: string
          project_id?: string | null
          status?: string | null
          target_date?: string | null
          updated_at?: string | null
        }
        Update: {
          actual_date?: string | null
          created_at?: string | null
          id?: string
          name?: string
          project_id?: string | null
          status?: string | null
          target_date?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "schedule_milestones_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      schedule_of_values: {
        Row: {
          category: string | null
          cost_code: string | null
          created_at: string | null
          created_by: string | null
          description: string
          id: string
          item_number: string
          org_id: string | null
          project_id: string | null
          quantity: number | null
          status: string | null
          subcategory: string | null
          total_amount: number | null
          unit: string | null
          unit_price: number | null
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          cost_code?: string | null
          created_at?: string | null
          created_by?: string | null
          description: string
          id?: string
          item_number: string
          org_id?: string | null
          project_id?: string | null
          quantity?: number | null
          status?: string | null
          subcategory?: string | null
          total_amount?: number | null
          unit?: string | null
          unit_price?: number | null
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          cost_code?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string
          id?: string
          item_number?: string
          org_id?: string | null
          project_id?: string | null
          quantity?: number | null
          status?: string | null
          subcategory?: string | null
          total_amount?: number | null
          unit?: string | null
          unit_price?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "schedule_of_values_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_of_values_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "org_usage_summary"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "schedule_of_values_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_of_values_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      schedule_tasks: {
        Row: {
          assigned_to: string[] | null
          created_at: string | null
          created_by: string | null
          dependencies: Json | null
          description: string | null
          duration_days: number | null
          end_date: string | null
          external_id: string | null
          id: string
          is_summary: boolean | null
          level: number | null
          metadata: Json | null
          name: string
          org_id: string | null
          parent_id: string | null
          predecessor_ids: string[] | null
          progress_percentage: number | null
          project_id: string | null
          resources: Json | null
          start_date: string | null
          status: string | null
          successor_ids: string[] | null
          task_type: string | null
          updated_at: string | null
          version_id: string | null
          wbs: string | null
        }
        Insert: {
          assigned_to?: string[] | null
          created_at?: string | null
          created_by?: string | null
          dependencies?: Json | null
          description?: string | null
          duration_days?: number | null
          end_date?: string | null
          external_id?: string | null
          id?: string
          is_summary?: boolean | null
          level?: number | null
          metadata?: Json | null
          name: string
          org_id?: string | null
          parent_id?: string | null
          predecessor_ids?: string[] | null
          progress_percentage?: number | null
          project_id?: string | null
          resources?: Json | null
          start_date?: string | null
          status?: string | null
          successor_ids?: string[] | null
          task_type?: string | null
          updated_at?: string | null
          version_id?: string | null
          wbs?: string | null
        }
        Update: {
          assigned_to?: string[] | null
          created_at?: string | null
          created_by?: string | null
          dependencies?: Json | null
          description?: string | null
          duration_days?: number | null
          end_date?: string | null
          external_id?: string | null
          id?: string
          is_summary?: boolean | null
          level?: number | null
          metadata?: Json | null
          name?: string
          org_id?: string | null
          parent_id?: string | null
          predecessor_ids?: string[] | null
          progress_percentage?: number | null
          project_id?: string | null
          resources?: Json | null
          start_date?: string | null
          status?: string | null
          successor_ids?: string[] | null
          task_type?: string | null
          updated_at?: string | null
          version_id?: string | null
          wbs?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "schedule_tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_tasks_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "org_usage_summary"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "schedule_tasks_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_tasks_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "schedule_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      schedule_versions: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          is_baseline: boolean | null
          milestones_count: number | null
          name: string
          org_id: string | null
          project_id: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_baseline?: boolean | null
          milestones_count?: number | null
          name: string
          org_id?: string | null
          project_id?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_baseline?: boolean | null
          milestones_count?: number | null
          name?: string
          org_id?: string | null
          project_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "schedule_versions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "org_usage_summary"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "schedule_versions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_versions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      shared_links: {
        Row: {
          allowed_emails: string[] | null
          created_at: string | null
          created_by: string | null
          description: string | null
          expires_at: string | null
          id: string
          link_type: string | null
          max_views: number | null
          name: string | null
          org_id: string | null
          password_hash: string | null
          project_id: string | null
          require_auth: boolean | null
          settings: Json | null
          token: string
          updated_at: string | null
          view_count: number | null
        }
        Insert: {
          allowed_emails?: string[] | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          expires_at?: string | null
          id?: string
          link_type?: string | null
          max_views?: number | null
          name?: string | null
          org_id?: string | null
          password_hash?: string | null
          project_id?: string | null
          require_auth?: boolean | null
          settings?: Json | null
          token: string
          updated_at?: string | null
          view_count?: number | null
        }
        Update: {
          allowed_emails?: string[] | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          expires_at?: string | null
          id?: string
          link_type?: string | null
          max_views?: number | null
          name?: string | null
          org_id?: string | null
          password_hash?: string | null
          project_id?: string | null
          require_auth?: boolean | null
          settings?: Json | null
          token?: string
          updated_at?: string | null
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "shared_links_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shared_links_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "org_usage_summary"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "shared_links_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shared_links_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      site_walk_activity_log: {
        Row: {
          actor_id: string | null
          after_state: Json | null
          assignment_id: string | null
          before_state: Json | null
          comment_id: string | null
          created_at: string
          deliverable_id: string | null
          event_type: string
          id: string
          item_id: string | null
          metadata: Json
          org_id: string
          project_id: string | null
          session_id: string | null
        }
        Insert: {
          actor_id?: string | null
          after_state?: Json | null
          assignment_id?: string | null
          before_state?: Json | null
          comment_id?: string | null
          created_at?: string
          deliverable_id?: string | null
          event_type: string
          id?: string
          item_id?: string | null
          metadata?: Json
          org_id: string
          project_id?: string | null
          session_id?: string | null
        }
        Update: {
          actor_id?: string | null
          after_state?: Json | null
          assignment_id?: string | null
          before_state?: Json | null
          comment_id?: string | null
          created_at?: string
          deliverable_id?: string | null
          event_type?: string
          id?: string
          item_id?: string | null
          metadata?: Json
          org_id?: string
          project_id?: string | null
          session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "site_walk_activity_log_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "site_walk_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_walk_activity_log_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "site_walk_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_walk_activity_log_deliverable_id_fkey"
            columns: ["deliverable_id"]
            isOneToOne: false
            referencedRelation: "site_walk_deliverables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_walk_activity_log_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "site_walk_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_walk_activity_log_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "org_usage_summary"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "site_walk_activity_log_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_walk_activity_log_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_walk_activity_log_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "site_walk_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      site_walk_assignments: {
        Row: {
          acknowledged_at: string | null
          assigned_by: string
          assigned_to: string
          completed_at: string | null
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          item_id: string | null
          org_id: string
          priority: string
          project_id: string | null
          session_id: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          acknowledged_at?: string | null
          assigned_by: string
          assigned_to: string
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          item_id?: string | null
          org_id: string
          priority?: string
          project_id?: string | null
          session_id: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          acknowledged_at?: string | null
          assigned_by?: string
          assigned_to?: string
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          item_id?: string | null
          org_id?: string
          priority?: string
          project_id?: string | null
          session_id?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_walk_assignments_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "site_walk_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_walk_assignments_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "org_usage_summary"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "site_walk_assignments_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_walk_assignments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_walk_assignments_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "site_walk_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      site_walk_comments: {
        Row: {
          author_id: string
          body: string
          created_at: string
          id: string
          is_escalation: boolean
          is_field: boolean
          item_id: string | null
          org_id: string
          parent_id: string | null
          project_id: string | null
          read_by: string[]
          session_id: string
          updated_at: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          id?: string
          is_escalation?: boolean
          is_field?: boolean
          item_id?: string | null
          org_id: string
          parent_id?: string | null
          project_id?: string | null
          read_by?: string[]
          session_id: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          is_escalation?: boolean
          is_field?: boolean
          item_id?: string | null
          org_id?: string
          parent_id?: string | null
          project_id?: string | null
          read_by?: string[]
          session_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_walk_comments_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "site_walk_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_walk_comments_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "org_usage_summary"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "site_walk_comments_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_walk_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "site_walk_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_walk_comments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_walk_comments_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "site_walk_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      site_walk_copilot_invites: {
        Row: {
          copilot_session_id: string
          created_at: string
          expires_at: string
          id: string
          org_id: string
          permitted_role: string
          revoked_at: string | null
          token_hash: string
          used_at: string | null
        }
        Insert: {
          copilot_session_id: string
          created_at?: string
          expires_at: string
          id?: string
          org_id: string
          permitted_role?: string
          revoked_at?: string | null
          token_hash: string
          used_at?: string | null
        }
        Update: {
          copilot_session_id?: string
          created_at?: string
          expires_at?: string
          id?: string
          org_id?: string
          permitted_role?: string
          revoked_at?: string | null
          token_hash?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "site_walk_copilot_invites_copilot_session_id_fkey"
            columns: ["copilot_session_id"]
            isOneToOne: false
            referencedRelation: "site_walk_copilot_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_walk_copilot_invites_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "org_usage_summary"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "site_walk_copilot_invites_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      site_walk_copilot_sessions: {
        Row: {
          ended_at: string | null
          id: string
          livekit_room_name: string
          org_id: string
          site_walk_session_id: string
          started_at: string
          started_by: string | null
          status: string
        }
        Insert: {
          ended_at?: string | null
          id?: string
          livekit_room_name: string
          org_id: string
          site_walk_session_id: string
          started_at?: string
          started_by?: string | null
          status?: string
        }
        Update: {
          ended_at?: string | null
          id?: string
          livekit_room_name?: string
          org_id?: string
          site_walk_session_id?: string
          started_at?: string
          started_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_walk_copilot_sessions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "org_usage_summary"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "site_walk_copilot_sessions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_walk_copilot_sessions_site_walk_session_id_fkey"
            columns: ["site_walk_session_id"]
            isOneToOne: false
            referencedRelation: "site_walk_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      site_walk_deliverable_assets: {
        Row: {
          asset_type: string
          created_at: string
          created_by: string | null
          deliverable_id: string
          description: string | null
          duration_seconds: number | null
          file_id: string | null
          file_size: number
          height: number | null
          id: string
          metadata: Json
          mime_type: string | null
          org_id: string
          project_id: string | null
          s3_key: string | null
          sort_order: number
          source_item_id: string | null
          thumbnail_s3_key: string | null
          title: string | null
          unified_file_id: string | null
          updated_at: string
          width: number | null
        }
        Insert: {
          asset_type: string
          created_at?: string
          created_by?: string | null
          deliverable_id: string
          description?: string | null
          duration_seconds?: number | null
          file_id?: string | null
          file_size?: number
          height?: number | null
          id?: string
          metadata?: Json
          mime_type?: string | null
          org_id: string
          project_id?: string | null
          s3_key?: string | null
          sort_order?: number
          source_item_id?: string | null
          thumbnail_s3_key?: string | null
          title?: string | null
          unified_file_id?: string | null
          updated_at?: string
          width?: number | null
        }
        Update: {
          asset_type?: string
          created_at?: string
          created_by?: string | null
          deliverable_id?: string
          description?: string | null
          duration_seconds?: number | null
          file_id?: string | null
          file_size?: number
          height?: number | null
          id?: string
          metadata?: Json
          mime_type?: string | null
          org_id?: string
          project_id?: string | null
          s3_key?: string | null
          sort_order?: number
          source_item_id?: string | null
          thumbnail_s3_key?: string | null
          title?: string | null
          unified_file_id?: string | null
          updated_at?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "site_walk_deliverable_assets_deliverable_id_fkey"
            columns: ["deliverable_id"]
            isOneToOne: false
            referencedRelation: "site_walk_deliverables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_walk_deliverable_assets_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "slatedrop_uploads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_walk_deliverable_assets_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "org_usage_summary"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "site_walk_deliverable_assets_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_walk_deliverable_assets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_walk_deliverable_assets_source_item_id_fkey"
            columns: ["source_item_id"]
            isOneToOne: false
            referencedRelation: "site_walk_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_walk_deliverable_assets_unified_file_id_fkey"
            columns: ["unified_file_id"]
            isOneToOne: false
            referencedRelation: "unified_files"
            referencedColumns: ["id"]
          },
        ]
      }
      site_walk_deliverable_blocks: {
        Row: {
          block_type: string
          content: Json
          created_at: string
          created_by: string | null
          deliverable_id: string
          id: string
          org_id: string
          project_id: string | null
          sort_order: number
          source_item_id: string | null
          updated_at: string
        }
        Insert: {
          block_type: string
          content?: Json
          created_at?: string
          created_by?: string | null
          deliverable_id: string
          id?: string
          org_id: string
          project_id?: string | null
          sort_order?: number
          source_item_id?: string | null
          updated_at?: string
        }
        Update: {
          block_type?: string
          content?: Json
          created_at?: string
          created_by?: string | null
          deliverable_id?: string
          id?: string
          org_id?: string
          project_id?: string | null
          sort_order?: number
          source_item_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_walk_deliverable_blocks_deliverable_id_fkey"
            columns: ["deliverable_id"]
            isOneToOne: false
            referencedRelation: "site_walk_deliverables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_walk_deliverable_blocks_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "org_usage_summary"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "site_walk_deliverable_blocks_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_walk_deliverable_blocks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_walk_deliverable_blocks_source_item_id_fkey"
            columns: ["source_item_id"]
            isOneToOne: false
            referencedRelation: "site_walk_items"
            referencedColumns: ["id"]
          },
        ]
      }
      site_walk_deliverable_hotspots: {
        Row: {
          body: string | null
          created_at: string
          created_by: string | null
          deliverable_id: string
          hotspot_type: string
          id: string
          label: string | null
          metadata: Json
          org_id: string
          pitch: number | null
          project_id: string | null
          response_enabled: boolean
          scene_id: string | null
          sort_order: number
          source_item_id: string | null
          target_scene_id: string | null
          updated_at: string
          x_pct: number | null
          y_pct: number | null
          yaw: number | null
        }
        Insert: {
          body?: string | null
          created_at?: string
          created_by?: string | null
          deliverable_id: string
          hotspot_type?: string
          id?: string
          label?: string | null
          metadata?: Json
          org_id: string
          pitch?: number | null
          project_id?: string | null
          response_enabled?: boolean
          scene_id?: string | null
          sort_order?: number
          source_item_id?: string | null
          target_scene_id?: string | null
          updated_at?: string
          x_pct?: number | null
          y_pct?: number | null
          yaw?: number | null
        }
        Update: {
          body?: string | null
          created_at?: string
          created_by?: string | null
          deliverable_id?: string
          hotspot_type?: string
          id?: string
          label?: string | null
          metadata?: Json
          org_id?: string
          pitch?: number | null
          project_id?: string | null
          response_enabled?: boolean
          scene_id?: string | null
          sort_order?: number
          source_item_id?: string | null
          target_scene_id?: string | null
          updated_at?: string
          x_pct?: number | null
          y_pct?: number | null
          yaw?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "site_walk_deliverable_hotspots_deliverable_id_fkey"
            columns: ["deliverable_id"]
            isOneToOne: false
            referencedRelation: "site_walk_deliverables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_walk_deliverable_hotspots_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "org_usage_summary"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "site_walk_deliverable_hotspots_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_walk_deliverable_hotspots_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_walk_deliverable_hotspots_scene_id_fkey"
            columns: ["scene_id"]
            isOneToOne: false
            referencedRelation: "site_walk_deliverable_scenes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_walk_deliverable_hotspots_source_item_id_fkey"
            columns: ["source_item_id"]
            isOneToOne: false
            referencedRelation: "site_walk_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_walk_deliverable_hotspots_target_scene_id_fkey"
            columns: ["target_scene_id"]
            isOneToOne: false
            referencedRelation: "site_walk_deliverable_scenes"
            referencedColumns: ["id"]
          },
        ]
      }
      site_walk_deliverable_responses: {
        Row: {
          author_email: string | null
          author_name: string
          author_user_id: string | null
          body: string
          created_at: string
          deliverable_id: string
          hotspot_id: string | null
          id: string
          metadata: Json
          org_id: string
          project_id: string | null
          response_intent: string
          scene_id: string | null
          thread_id: string | null
        }
        Insert: {
          author_email?: string | null
          author_name: string
          author_user_id?: string | null
          body: string
          created_at?: string
          deliverable_id: string
          hotspot_id?: string | null
          id?: string
          metadata?: Json
          org_id: string
          project_id?: string | null
          response_intent?: string
          scene_id?: string | null
          thread_id?: string | null
        }
        Update: {
          author_email?: string | null
          author_name?: string
          author_user_id?: string | null
          body?: string
          created_at?: string
          deliverable_id?: string
          hotspot_id?: string | null
          id?: string
          metadata?: Json
          org_id?: string
          project_id?: string | null
          response_intent?: string
          scene_id?: string | null
          thread_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "site_walk_deliverable_responses_deliverable_id_fkey"
            columns: ["deliverable_id"]
            isOneToOne: false
            referencedRelation: "site_walk_deliverables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_walk_deliverable_responses_hotspot_id_fkey"
            columns: ["hotspot_id"]
            isOneToOne: false
            referencedRelation: "site_walk_deliverable_hotspots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_walk_deliverable_responses_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "org_usage_summary"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "site_walk_deliverable_responses_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_walk_deliverable_responses_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_walk_deliverable_responses_scene_id_fkey"
            columns: ["scene_id"]
            isOneToOne: false
            referencedRelation: "site_walk_deliverable_scenes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_walk_deliverable_responses_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "site_walk_deliverable_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      site_walk_deliverable_scenes: {
        Row: {
          asset_id: string | null
          camera_config: Json
          created_at: string
          created_by: string | null
          deliverable_id: string
          description: string | null
          id: string
          initial_view: Json
          metadata: Json
          org_id: string
          overlay_config: Json
          project_id: string | null
          scene_type: string
          sort_order: number
          thumbnail_s3_key: string | null
          title: string
          updated_at: string
        }
        Insert: {
          asset_id?: string | null
          camera_config?: Json
          created_at?: string
          created_by?: string | null
          deliverable_id: string
          description?: string | null
          id?: string
          initial_view?: Json
          metadata?: Json
          org_id: string
          overlay_config?: Json
          project_id?: string | null
          scene_type: string
          sort_order?: number
          thumbnail_s3_key?: string | null
          title?: string
          updated_at?: string
        }
        Update: {
          asset_id?: string | null
          camera_config?: Json
          created_at?: string
          created_by?: string | null
          deliverable_id?: string
          description?: string | null
          id?: string
          initial_view?: Json
          metadata?: Json
          org_id?: string
          overlay_config?: Json
          project_id?: string | null
          scene_type?: string
          sort_order?: number
          thumbnail_s3_key?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_walk_deliverable_scenes_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "site_walk_deliverable_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_walk_deliverable_scenes_deliverable_id_fkey"
            columns: ["deliverable_id"]
            isOneToOne: false
            referencedRelation: "site_walk_deliverables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_walk_deliverable_scenes_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "org_usage_summary"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "site_walk_deliverable_scenes_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_walk_deliverable_scenes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      site_walk_deliverable_sends: {
        Row: {
          access_token_id: string | null
          attachment_s3_key: string | null
          created_at: string
          deliverable_id: string
          delivery_mode: string
          error_message: string | null
          failed_at: string | null
          id: string
          message: string | null
          metadata: Json
          org_id: string
          project_id: string | null
          provider_message_id: string | null
          recipient_email: string | null
          recipient_name: string | null
          recipient_phone: string | null
          sent_at: string | null
          sent_by: string | null
          snapshot_s3_key: string | null
          status: string
          subject: string | null
        }
        Insert: {
          access_token_id?: string | null
          attachment_s3_key?: string | null
          created_at?: string
          deliverable_id: string
          delivery_mode: string
          error_message?: string | null
          failed_at?: string | null
          id?: string
          message?: string | null
          metadata?: Json
          org_id: string
          project_id?: string | null
          provider_message_id?: string | null
          recipient_email?: string | null
          recipient_name?: string | null
          recipient_phone?: string | null
          sent_at?: string | null
          sent_by?: string | null
          snapshot_s3_key?: string | null
          status?: string
          subject?: string | null
        }
        Update: {
          access_token_id?: string | null
          attachment_s3_key?: string | null
          created_at?: string
          deliverable_id?: string
          delivery_mode?: string
          error_message?: string | null
          failed_at?: string | null
          id?: string
          message?: string | null
          metadata?: Json
          org_id?: string
          project_id?: string | null
          provider_message_id?: string | null
          recipient_email?: string | null
          recipient_name?: string | null
          recipient_phone?: string | null
          sent_at?: string | null
          sent_by?: string | null
          snapshot_s3_key?: string | null
          status?: string
          subject?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "site_walk_deliverable_sends_access_token_id_fkey"
            columns: ["access_token_id"]
            isOneToOne: false
            referencedRelation: "deliverable_access_tokens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_walk_deliverable_sends_deliverable_id_fkey"
            columns: ["deliverable_id"]
            isOneToOne: false
            referencedRelation: "site_walk_deliverables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_walk_deliverable_sends_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "org_usage_summary"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "site_walk_deliverable_sends_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_walk_deliverable_sends_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      site_walk_deliverable_snapshots: {
        Row: {
          created_at: string
          created_by: string
          deliverable_id: string
          id: string
          org_id: string
          project_id: string | null
          snapshot_content: Json
          snapshot_status: string
          snapshot_title: string
          snapshot_type: string
        }
        Insert: {
          created_at?: string
          created_by: string
          deliverable_id: string
          id?: string
          org_id: string
          project_id?: string | null
          snapshot_content?: Json
          snapshot_status: string
          snapshot_title: string
          snapshot_type: string
        }
        Update: {
          created_at?: string
          created_by?: string
          deliverable_id?: string
          id?: string
          org_id?: string
          project_id?: string | null
          snapshot_content?: Json
          snapshot_status?: string
          snapshot_title?: string
          snapshot_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_walk_deliverable_snapshots_deliverable_id_fkey"
            columns: ["deliverable_id"]
            isOneToOne: false
            referencedRelation: "site_walk_deliverables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_walk_deliverable_snapshots_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "org_usage_summary"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "site_walk_deliverable_snapshots_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_walk_deliverable_snapshots_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      site_walk_deliverable_threads: {
        Row: {
          created_at: string
          created_by: string | null
          deliverable_id: string
          hotspot_id: string | null
          id: string
          metadata: Json
          org_id: string
          project_id: string | null
          scene_id: string | null
          source_item_id: string | null
          status: string
          subject: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deliverable_id: string
          hotspot_id?: string | null
          id?: string
          metadata?: Json
          org_id: string
          project_id?: string | null
          scene_id?: string | null
          source_item_id?: string | null
          status?: string
          subject?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deliverable_id?: string
          hotspot_id?: string | null
          id?: string
          metadata?: Json
          org_id?: string
          project_id?: string | null
          scene_id?: string | null
          source_item_id?: string | null
          status?: string
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_walk_deliverable_threads_deliverable_id_fkey"
            columns: ["deliverable_id"]
            isOneToOne: false
            referencedRelation: "site_walk_deliverables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_walk_deliverable_threads_hotspot_id_fkey"
            columns: ["hotspot_id"]
            isOneToOne: false
            referencedRelation: "site_walk_deliverable_hotspots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_walk_deliverable_threads_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "org_usage_summary"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "site_walk_deliverable_threads_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_walk_deliverable_threads_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_walk_deliverable_threads_scene_id_fkey"
            columns: ["scene_id"]
            isOneToOne: false
            referencedRelation: "site_walk_deliverable_scenes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_walk_deliverable_threads_source_item_id_fkey"
            columns: ["source_item_id"]
            isOneToOne: false
            referencedRelation: "site_walk_items"
            referencedColumns: ["id"]
          },
        ]
      }
      site_walk_deliverable_views: {
        Row: {
          deliverable_id: string
          id: string
          viewed_at: string
          viewer_ip: string | null
          viewer_ua: string | null
        }
        Insert: {
          deliverable_id: string
          id?: string
          viewed_at?: string
          viewer_ip?: string | null
          viewer_ua?: string | null
        }
        Update: {
          deliverable_id?: string
          id?: string
          viewed_at?: string
          viewer_ip?: string | null
          viewer_ua?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "site_walk_deliverable_views_deliverable_id_fkey"
            columns: ["deliverable_id"]
            isOneToOne: false
            referencedRelation: "site_walk_deliverables"
            referencedColumns: ["id"]
          },
        ]
      }
      site_walk_deliverables: {
        Row: {
          allow_viewer_download: boolean
          allow_viewer_responses: boolean
          async_error_log: string | null
          async_job_progress: number
          async_job_status: string
          brand_snapshot: Json
          content: Json
          created_at: string
          created_by: string
          deliverable_type: string
          email_snapshot_s3_key: string | null
          export_config: Json
          export_s3_key: string | null
          id: string
          kanban_config: Json
          last_published_at: string | null
          navigation_config: Json
          org_id: string
          output_mode: string
          portal_config: Json
          presentation_config: Json
          preview_image_s3_key: string | null
          project_id: string | null
          published_by: string | null
          response_config: Json
          session_id: string
          share_expires_at: string | null
          share_max_views: number | null
          share_password_hash: string | null
          share_revoked: boolean
          share_token: string | null
          share_view_count: number
          shared_at: string | null
          status: string
          summary_stats: Json
          thumbnail_s3_key: string | null
          title: string
          updated_at: string
          viewer_config: Json
        }
        Insert: {
          allow_viewer_download?: boolean
          allow_viewer_responses?: boolean
          async_error_log?: string | null
          async_job_progress?: number
          async_job_status?: string
          brand_snapshot?: Json
          content?: Json
          created_at?: string
          created_by: string
          deliverable_type: string
          email_snapshot_s3_key?: string | null
          export_config?: Json
          export_s3_key?: string | null
          id?: string
          kanban_config?: Json
          last_published_at?: string | null
          navigation_config?: Json
          org_id: string
          output_mode?: string
          portal_config?: Json
          presentation_config?: Json
          preview_image_s3_key?: string | null
          project_id?: string | null
          published_by?: string | null
          response_config?: Json
          session_id: string
          share_expires_at?: string | null
          share_max_views?: number | null
          share_password_hash?: string | null
          share_revoked?: boolean
          share_token?: string | null
          share_view_count?: number
          shared_at?: string | null
          status?: string
          summary_stats?: Json
          thumbnail_s3_key?: string | null
          title?: string
          updated_at?: string
          viewer_config?: Json
        }
        Update: {
          allow_viewer_download?: boolean
          allow_viewer_responses?: boolean
          async_error_log?: string | null
          async_job_progress?: number
          async_job_status?: string
          brand_snapshot?: Json
          content?: Json
          created_at?: string
          created_by?: string
          deliverable_type?: string
          email_snapshot_s3_key?: string | null
          export_config?: Json
          export_s3_key?: string | null
          id?: string
          kanban_config?: Json
          last_published_at?: string | null
          navigation_config?: Json
          org_id?: string
          output_mode?: string
          portal_config?: Json
          presentation_config?: Json
          preview_image_s3_key?: string | null
          project_id?: string | null
          published_by?: string | null
          response_config?: Json
          session_id?: string
          share_expires_at?: string | null
          share_max_views?: number | null
          share_password_hash?: string | null
          share_revoked?: boolean
          share_token?: string | null
          share_view_count?: number
          shared_at?: string | null
          status?: string
          summary_stats?: Json
          thumbnail_s3_key?: string | null
          title?: string
          updated_at?: string
          viewer_config?: Json
        }
        Relationships: [
          {
            foreignKeyName: "site_walk_deliverables_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "org_usage_summary"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "site_walk_deliverables_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_walk_deliverables_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_walk_deliverables_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "site_walk_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      site_walk_items: {
        Row: {
          assigned_to: string | null
          audio_s3_key: string | null
          before_item_id: string | null
          capture_mode: string
          captured_at: string
          category: string | null
          client_item_id: string | null
          client_mutation_id: string | null
          cost_estimate: number | null
          created_at: string
          created_by: string
          deleted_at: string | null
          description: string | null
          device_id: string | null
          due_date: string | null
          file_id: string | null
          id: string
          item_relationship: string
          item_status: string
          item_type: string
          last_sync_error: string | null
          latitude: number | null
          local_created_at: string | null
          local_updated_at: string | null
          location_label: string | null
          longitude: number | null
          manpower_hours: number | null
          markup_data: Json
          markup_revision: number
          metadata: Json
          org_id: string
          priority: string
          project_id: string | null
          resolved_at: string | null
          resolved_by: string | null
          retry_count: number
          s3_key: string | null
          session_id: string
          sort_order: number
          sync_state: string
          tags: string[]
          title: string
          trade: string | null
          updated_at: string
          upload_progress: number
          upload_state: string
          vector_history: Json
          verified_at: string | null
          verified_by: string | null
          weather: Json | null
          workflow_type: string
        }
        Insert: {
          assigned_to?: string | null
          audio_s3_key?: string | null
          before_item_id?: string | null
          capture_mode?: string
          captured_at?: string
          category?: string | null
          client_item_id?: string | null
          client_mutation_id?: string | null
          cost_estimate?: number | null
          created_at?: string
          created_by: string
          deleted_at?: string | null
          description?: string | null
          device_id?: string | null
          due_date?: string | null
          file_id?: string | null
          id?: string
          item_relationship?: string
          item_status?: string
          item_type: string
          last_sync_error?: string | null
          latitude?: number | null
          local_created_at?: string | null
          local_updated_at?: string | null
          location_label?: string | null
          longitude?: number | null
          manpower_hours?: number | null
          markup_data?: Json
          markup_revision?: number
          metadata?: Json
          org_id: string
          priority?: string
          project_id?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          retry_count?: number
          s3_key?: string | null
          session_id: string
          sort_order?: number
          sync_state?: string
          tags?: string[]
          title?: string
          trade?: string | null
          updated_at?: string
          upload_progress?: number
          upload_state?: string
          vector_history?: Json
          verified_at?: string | null
          verified_by?: string | null
          weather?: Json | null
          workflow_type?: string
        }
        Update: {
          assigned_to?: string | null
          audio_s3_key?: string | null
          before_item_id?: string | null
          capture_mode?: string
          captured_at?: string
          category?: string | null
          client_item_id?: string | null
          client_mutation_id?: string | null
          cost_estimate?: number | null
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          description?: string | null
          device_id?: string | null
          due_date?: string | null
          file_id?: string | null
          id?: string
          item_relationship?: string
          item_status?: string
          item_type?: string
          last_sync_error?: string | null
          latitude?: number | null
          local_created_at?: string | null
          local_updated_at?: string | null
          location_label?: string | null
          longitude?: number | null
          manpower_hours?: number | null
          markup_data?: Json
          markup_revision?: number
          metadata?: Json
          org_id?: string
          priority?: string
          project_id?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          retry_count?: number
          s3_key?: string | null
          session_id?: string
          sort_order?: number
          sync_state?: string
          tags?: string[]
          title?: string
          trade?: string | null
          updated_at?: string
          upload_progress?: number
          upload_state?: string
          vector_history?: Json
          verified_at?: string | null
          verified_by?: string | null
          weather?: Json | null
          workflow_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_walk_items_before_item_id_fkey"
            columns: ["before_item_id"]
            isOneToOne: false
            referencedRelation: "site_walk_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_walk_items_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "slatedrop_uploads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_walk_items_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "org_usage_summary"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "site_walk_items_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_walk_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_walk_items_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "site_walk_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      site_walk_offline_mutations: {
        Row: {
          applied_at: string | null
          client_mutation_id: string
          created_at: string
          error_message: string | null
          id: string
          mutation_type: string
          org_id: string
          payload: Json
          project_id: string | null
          session_id: string | null
          status: string
          target_id: string | null
          target_table: string | null
          user_id: string
        }
        Insert: {
          applied_at?: string | null
          client_mutation_id: string
          created_at?: string
          error_message?: string | null
          id?: string
          mutation_type: string
          org_id: string
          payload?: Json
          project_id?: string | null
          session_id?: string | null
          status?: string
          target_id?: string | null
          target_table?: string | null
          user_id: string
        }
        Update: {
          applied_at?: string | null
          client_mutation_id?: string
          created_at?: string
          error_message?: string | null
          id?: string
          mutation_type?: string
          org_id?: string
          payload?: Json
          project_id?: string | null
          session_id?: string | null
          status?: string
          target_id?: string | null
          target_table?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_walk_offline_mutations_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "org_usage_summary"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "site_walk_offline_mutations_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_walk_offline_mutations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_walk_offline_mutations_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "site_walk_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      site_walk_pins: {
        Row: {
          client_pin_id: string | null
          created_at: string
          created_by: string | null
          id: string
          item_id: string | null
          label: string | null
          markup_data: Json
          org_id: string
          pin_color: string
          pin_number: number | null
          pin_status: string
          plan_id: string | null
          plan_sheet_id: string | null
          project_id: string | null
          session_id: string | null
          updated_at: string
          x_pct: number
          y_pct: number
        }
        Insert: {
          client_pin_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          item_id?: string | null
          label?: string | null
          markup_data?: Json
          org_id: string
          pin_color?: string
          pin_number?: number | null
          pin_status?: string
          plan_id?: string | null
          plan_sheet_id?: string | null
          project_id?: string | null
          session_id?: string | null
          updated_at?: string
          x_pct: number
          y_pct: number
        }
        Update: {
          client_pin_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          item_id?: string | null
          label?: string | null
          markup_data?: Json
          org_id?: string
          pin_color?: string
          pin_number?: number | null
          pin_status?: string
          plan_id?: string | null
          plan_sheet_id?: string | null
          project_id?: string | null
          session_id?: string | null
          updated_at?: string
          x_pct?: number
          y_pct?: number
        }
        Relationships: [
          {
            foreignKeyName: "site_walk_pins_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "site_walk_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_walk_pins_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "org_usage_summary"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "site_walk_pins_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_walk_pins_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "site_walk_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_walk_pins_plan_sheet_id_fkey"
            columns: ["plan_sheet_id"]
            isOneToOne: false
            referencedRelation: "site_walk_plan_sheets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_walk_pins_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_walk_pins_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "site_walk_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      site_walk_plan_sets: {
        Row: {
          created_at: string
          description: string | null
          file_size: number
          id: string
          metadata: Json
          mime_type: string | null
          org_id: string
          original_file_name: string | null
          page_count: number
          processing_error: string | null
          processing_status: string
          project_id: string
          source_file_id: string | null
          source_s3_key: string | null
          source_unified_file_id: string | null
          title: string
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          file_size?: number
          id?: string
          metadata?: Json
          mime_type?: string | null
          org_id: string
          original_file_name?: string | null
          page_count?: number
          processing_error?: string | null
          processing_status?: string
          project_id: string
          source_file_id?: string | null
          source_s3_key?: string | null
          source_unified_file_id?: string | null
          title: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          file_size?: number
          id?: string
          metadata?: Json
          mime_type?: string | null
          org_id?: string
          original_file_name?: string | null
          page_count?: number
          processing_error?: string | null
          processing_status?: string
          project_id?: string
          source_file_id?: string | null
          source_s3_key?: string | null
          source_unified_file_id?: string | null
          title?: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "site_walk_plan_sets_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "org_usage_summary"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "site_walk_plan_sets_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_walk_plan_sets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_walk_plan_sets_source_file_id_fkey"
            columns: ["source_file_id"]
            isOneToOne: false
            referencedRelation: "slatedrop_uploads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_walk_plan_sets_source_unified_file_id_fkey"
            columns: ["source_unified_file_id"]
            isOneToOne: false
            referencedRelation: "unified_files"
            referencedColumns: ["id"]
          },
        ]
      }
      site_walk_plan_sheets: {
        Row: {
          created_at: string
          height: number
          id: string
          image_s3_key: string | null
          metadata: Json
          org_id: string
          plan_set_id: string
          project_id: string
          rasterized_height: number | null
          rasterized_key: string | null
          rasterized_width: number | null
          rotation: number
          scale_label: string | null
          sheet_name: string | null
          sheet_number: number
          sort_order: number
          thumbnail_s3_key: string | null
          tile_manifest: Json
          updated_at: string
          width: number
        }
        Insert: {
          created_at?: string
          height?: number
          id?: string
          image_s3_key?: string | null
          metadata?: Json
          org_id: string
          plan_set_id: string
          project_id: string
          rasterized_height?: number | null
          rasterized_key?: string | null
          rasterized_width?: number | null
          rotation?: number
          scale_label?: string | null
          sheet_name?: string | null
          sheet_number: number
          sort_order?: number
          thumbnail_s3_key?: string | null
          tile_manifest?: Json
          updated_at?: string
          width?: number
        }
        Update: {
          created_at?: string
          height?: number
          id?: string
          image_s3_key?: string | null
          metadata?: Json
          org_id?: string
          plan_set_id?: string
          project_id?: string
          rasterized_height?: number | null
          rasterized_key?: string | null
          rasterized_width?: number | null
          rotation?: number
          scale_label?: string | null
          sheet_name?: string | null
          sheet_number?: number
          sort_order?: number
          thumbnail_s3_key?: string | null
          tile_manifest?: Json
          updated_at?: string
          width?: number
        }
        Relationships: [
          {
            foreignKeyName: "site_walk_plan_sheets_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "org_usage_summary"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "site_walk_plan_sheets_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_walk_plan_sheets_plan_set_id_fkey"
            columns: ["plan_set_id"]
            isOneToOne: false
            referencedRelation: "site_walk_plan_sets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_walk_plan_sheets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      site_walk_plans: {
        Row: {
          created_at: string
          file_id: string | null
          height: number
          id: string
          org_id: string
          plan_set_id: string | null
          plan_sheet_id: string | null
          processing_status: string
          project_id: string | null
          s3_key: string
          session_id: string
          sheet_number: number | null
          sort_order: number
          thumbnail_s3_key: string | null
          tile_manifest: Json
          title: string
          updated_at: string
          width: number
        }
        Insert: {
          created_at?: string
          file_id?: string | null
          height?: number
          id?: string
          org_id: string
          plan_set_id?: string | null
          plan_sheet_id?: string | null
          processing_status?: string
          project_id?: string | null
          s3_key: string
          session_id: string
          sheet_number?: number | null
          sort_order?: number
          thumbnail_s3_key?: string | null
          tile_manifest?: Json
          title: string
          updated_at?: string
          width?: number
        }
        Update: {
          created_at?: string
          file_id?: string | null
          height?: number
          id?: string
          org_id?: string
          plan_set_id?: string | null
          plan_sheet_id?: string | null
          processing_status?: string
          project_id?: string | null
          s3_key?: string
          session_id?: string
          sheet_number?: number | null
          sort_order?: number
          thumbnail_s3_key?: string | null
          tile_manifest?: Json
          title?: string
          updated_at?: string
          width?: number
        }
        Relationships: [
          {
            foreignKeyName: "site_walk_plans_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "slatedrop_uploads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_walk_plans_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "org_usage_summary"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "site_walk_plans_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_walk_plans_plan_set_id_fkey"
            columns: ["plan_set_id"]
            isOneToOne: false
            referencedRelation: "site_walk_plan_sets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_walk_plans_plan_sheet_id_fkey"
            columns: ["plan_sheet_id"]
            isOneToOne: false
            referencedRelation: "site_walk_plan_sheets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_walk_plans_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_walk_plans_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "site_walk_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      site_walk_portal_boards: {
        Row: {
          board_type: string
          columns: Json
          created_at: string
          created_by: string | null
          deliverable_id: string | null
          filters: Json
          id: string
          is_public: boolean
          org_id: string
          project_id: string
          title: string
          updated_at: string
        }
        Insert: {
          board_type?: string
          columns?: Json
          created_at?: string
          created_by?: string | null
          deliverable_id?: string | null
          filters?: Json
          id?: string
          is_public?: boolean
          org_id: string
          project_id: string
          title: string
          updated_at?: string
        }
        Update: {
          board_type?: string
          columns?: Json
          created_at?: string
          created_by?: string | null
          deliverable_id?: string | null
          filters?: Json
          id?: string
          is_public?: boolean
          org_id?: string
          project_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_walk_portal_boards_deliverable_id_fkey"
            columns: ["deliverable_id"]
            isOneToOne: false
            referencedRelation: "site_walk_deliverables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_walk_portal_boards_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "org_usage_summary"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "site_walk_portal_boards_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_walk_portal_boards_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      site_walk_project_capture_settings: {
        Row: {
          created_at: string
          created_by: string | null
          project_id: string
          trade_options: Json
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          project_id: string
          trade_options?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          project_id?: string
          trade_options?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "site_walk_project_capture_settings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      site_walk_read_receipts: {
        Row: {
          external_recipient: string | null
          id: string
          metadata: Json
          org_id: string
          project_id: string | null
          read_at: string
          subject_id: string
          subject_type: string
          user_id: string | null
        }
        Insert: {
          external_recipient?: string | null
          id?: string
          metadata?: Json
          org_id: string
          project_id?: string | null
          read_at?: string
          subject_id: string
          subject_type: string
          user_id?: string | null
        }
        Update: {
          external_recipient?: string | null
          id?: string
          metadata?: Json
          org_id?: string
          project_id?: string | null
          read_at?: string
          subject_id?: string
          subject_type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "site_walk_read_receipts_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "org_usage_summary"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "site_walk_read_receipts_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_walk_read_receipts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      site_walk_scene_contexts: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          label: string
          logistics_milestones: Json
          org_id: string
          polygon_boundaries: Json
          project_id: string
          session_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          label: string
          logistics_milestones?: Json
          org_id: string
          polygon_boundaries?: Json
          project_id: string
          session_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          label?: string
          logistics_milestones?: Json
          org_id?: string
          polygon_boundaries?: Json
          project_id?: string
          session_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_walk_scene_contexts_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "org_usage_summary"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "site_walk_scene_contexts_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_walk_scene_contexts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_walk_scene_contexts_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "site_walk_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      site_walk_session_plan_sheets: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_primary: boolean
          org_id: string
          plan_sheet_id: string
          project_id: string
          session_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_primary?: boolean
          org_id: string
          plan_sheet_id: string
          project_id: string
          session_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_primary?: boolean
          org_id?: string
          plan_sheet_id?: string
          project_id?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_walk_session_plan_sheets_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "org_usage_summary"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "site_walk_session_plan_sheets_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_walk_session_plan_sheets_plan_sheet_id_fkey"
            columns: ["plan_sheet_id"]
            isOneToOne: false
            referencedRelation: "site_walk_plan_sheets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_walk_session_plan_sheets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_walk_session_plan_sheets_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "site_walk_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      site_walk_sessions: {
        Row: {
          capture_v2_version: string | null
          client_session_id: string | null
          client_signature_s3_key: string | null
          completed_at: string | null
          created_at: string
          created_by: string
          created_offline_at: string | null
          id: string
          inspector_signature_s3_key: string | null
          is_ad_hoc: boolean
          last_sync_error: string | null
          last_synced_at: string | null
          metadata: Json
          org_id: string
          project_id: string | null
          session_type: string
          signed_at: string | null
          signed_by: string | null
          started_at: string | null
          status: string
          sync_state: string
          title: string
          updated_at: string
        }
        Insert: {
          capture_v2_version?: string | null
          client_session_id?: string | null
          client_signature_s3_key?: string | null
          completed_at?: string | null
          created_at?: string
          created_by: string
          created_offline_at?: string | null
          id?: string
          inspector_signature_s3_key?: string | null
          is_ad_hoc?: boolean
          last_sync_error?: string | null
          last_synced_at?: string | null
          metadata?: Json
          org_id: string
          project_id?: string | null
          session_type?: string
          signed_at?: string | null
          signed_by?: string | null
          started_at?: string | null
          status?: string
          sync_state?: string
          title?: string
          updated_at?: string
        }
        Update: {
          capture_v2_version?: string | null
          client_session_id?: string | null
          client_signature_s3_key?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string
          created_offline_at?: string | null
          id?: string
          inspector_signature_s3_key?: string | null
          is_ad_hoc?: boolean
          last_sync_error?: string | null
          last_synced_at?: string | null
          metadata?: Json
          org_id?: string
          project_id?: string | null
          session_type?: string
          signed_at?: string | null
          signed_by?: string | null
          started_at?: string | null
          status?: string
          sync_state?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_walk_sessions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "org_usage_summary"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "site_walk_sessions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_walk_sessions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      site_walk_templates: {
        Row: {
          checklist_items: Json
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_default: boolean
          org_id: string
          template_type: string
          title: string
          updated_at: string
        }
        Insert: {
          checklist_items?: Json
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_default?: boolean
          org_id: string
          template_type?: string
          title: string
          updated_at?: string
        }
        Update: {
          checklist_items?: Json
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_default?: boolean
          org_id?: string
          template_type?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_walk_templates_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "org_usage_summary"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "site_walk_templates_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      site_walk_usage_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          metadata: Json
          org_id: string
          project_id: string | null
          quantity: number
          session_id: string | null
          source_id: string | null
          source_table: string | null
          unit: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          metadata?: Json
          org_id: string
          project_id?: string | null
          quantity?: number
          session_id?: string | null
          source_id?: string | null
          source_table?: string | null
          unit?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json
          org_id?: string
          project_id?: string | null
          quantity?: number
          session_id?: string | null
          source_id?: string | null
          source_table?: string | null
          unit?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "site_walk_usage_events_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "org_usage_summary"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "site_walk_usage_events_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_walk_usage_events_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_walk_usage_events_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "site_walk_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      slate_drop_links: {
        Row: {
          created_at: string | null
          created_by: string | null
          expires_at: string | null
          file_id: string | null
          folder_id: string | null
          id: string
          org_id: string | null
          password_hash: string | null
          project_id: string | null
          role: string | null
          token: string
          updated_at: string | null
          view_count: number | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          file_id?: string | null
          folder_id?: string | null
          id?: string
          org_id?: string | null
          password_hash?: string | null
          project_id?: string | null
          role?: string | null
          token: string
          updated_at?: string | null
          view_count?: number | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          file_id?: string | null
          folder_id?: string | null
          id?: string
          org_id?: string | null
          password_hash?: string | null
          project_id?: string | null
          role?: string | null
          token?: string
          updated_at?: string | null
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "slate_drop_links_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "unified_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "slate_drop_links_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "file_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "slate_drop_links_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      slate360_staff: {
        Row: {
          access_scope: string[] | null
          display_name: string | null
          email: string
          granted_at: string
          granted_by: string
          id: string
          notes: string | null
          revoked_at: string | null
        }
        Insert: {
          access_scope?: string[] | null
          display_name?: string | null
          email: string
          granted_at?: string
          granted_by: string
          id?: string
          notes?: string | null
          revoked_at?: string | null
        }
        Update: {
          access_scope?: string[] | null
          display_name?: string | null
          email?: string
          granted_at?: string
          granted_by?: string
          id?: string
          notes?: string | null
          revoked_at?: string | null
        }
        Relationships: []
      }
      slatedrop_uploads: {
        Row: {
          created_at: string | null
          deleted_at: string | null
          file_name: string
          file_size: number | null
          file_type: string | null
          folder_id: string | null
          id: string
          org_id: string | null
          project_id: string | null
          s3_key: string | null
          status: string | null
          unified_file_id: string | null
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string | null
          deleted_at?: string | null
          file_name: string
          file_size?: number | null
          file_type?: string | null
          folder_id?: string | null
          id?: string
          org_id?: string | null
          project_id?: string | null
          s3_key?: string | null
          status?: string | null
          unified_file_id?: string | null
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string | null
          deleted_at?: string | null
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          folder_id?: string | null
          id?: string
          org_id?: string | null
          project_id?: string | null
          s3_key?: string | null
          status?: string | null
          unified_file_id?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "slatedrop_uploads_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "slatedrop_uploads_unified_file_id_fkey"
            columns: ["unified_file_id"]
            isOneToOne: false
            referencedRelation: "unified_files"
            referencedColumns: ["id"]
          },
        ]
      }
      stakeholder_activity: {
        Row: {
          action: string
          created_at: string | null
          id: string
          ip_address: unknown
          metadata: Json | null
          project_id: string | null
          resource_id: string | null
          resource_name: string | null
          resource_type: string | null
          stakeholder_id: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          project_id?: string | null
          resource_id?: string | null
          resource_name?: string | null
          resource_type?: string | null
          stakeholder_id?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          project_id?: string | null
          resource_id?: string | null
          resource_name?: string | null
          resource_type?: string | null
          stakeholder_id?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stakeholder_activity_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stakeholder_activity_stakeholder_id_fkey"
            columns: ["stakeholder_id"]
            isOneToOne: false
            referencedRelation: "project_stakeholders"
            referencedColumns: ["id"]
          },
        ]
      }
      stakeholder_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string | null
          email: string
          expires_at: string
          folder_permissions: Json | null
          id: string
          invited_by: string | null
          message: string | null
          org_id: string | null
          project_id: string | null
          revoked_at: string | null
          revoked_by: string | null
          role: string | null
          status: string | null
          token: string
          updated_at: string | null
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string | null
          email: string
          expires_at: string
          folder_permissions?: Json | null
          id?: string
          invited_by?: string | null
          message?: string | null
          org_id?: string | null
          project_id?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          role?: string | null
          status?: string | null
          token: string
          updated_at?: string | null
        }
        Update: {
          accepted_at?: string | null
          created_at?: string | null
          email?: string
          expires_at?: string
          folder_permissions?: Json | null
          id?: string
          invited_by?: string | null
          message?: string | null
          org_id?: string | null
          project_id?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          role?: string | null
          status?: string | null
          token?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stakeholder_invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stakeholder_invitations_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "org_usage_summary"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "stakeholder_invitations_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stakeholder_invitations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stakeholder_invitations_revoked_by_fkey"
            columns: ["revoked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      stripe_events: {
        Row: {
          created_at: string
          id: string
          type: string
        }
        Insert: {
          created_at?: string
          id: string
          type: string
        }
        Update: {
          created_at?: string
          id?: string
          type?: string
        }
        Relationships: []
      }
      submittals: {
        Row: {
          assigned_to: string | null
          attachments: Json | null
          created_at: string | null
          created_by: string | null
          date_required: string | null
          date_returned: string | null
          date_submitted: string | null
          description: string | null
          id: string
          lead_time_days: number | null
          org_id: string | null
          project_id: string
          related_rfis: Json | null
          review_comments: string | null
          review_status: string | null
          reviewed_at: string | null
          reviewer: string | null
          revision: string | null
          spec_section: string | null
          spec_section_name: string | null
          status: string | null
          submittal_number: string
          submitted_by: string | null
          title: string
          updated_at: string | null
          workflow_status: string | null
        }
        Insert: {
          assigned_to?: string | null
          attachments?: Json | null
          created_at?: string | null
          created_by?: string | null
          date_required?: string | null
          date_returned?: string | null
          date_submitted?: string | null
          description?: string | null
          id?: string
          lead_time_days?: number | null
          org_id?: string | null
          project_id: string
          related_rfis?: Json | null
          review_comments?: string | null
          review_status?: string | null
          reviewed_at?: string | null
          reviewer?: string | null
          revision?: string | null
          spec_section?: string | null
          spec_section_name?: string | null
          status?: string | null
          submittal_number: string
          submitted_by?: string | null
          title: string
          updated_at?: string | null
          workflow_status?: string | null
        }
        Update: {
          assigned_to?: string | null
          attachments?: Json | null
          created_at?: string | null
          created_by?: string | null
          date_required?: string | null
          date_returned?: string | null
          date_submitted?: string | null
          description?: string | null
          id?: string
          lead_time_days?: number | null
          org_id?: string | null
          project_id?: string
          related_rfis?: Json | null
          review_comments?: string | null
          review_status?: string | null
          reviewed_at?: string | null
          reviewer?: string | null
          revision?: string | null
          spec_section?: string | null
          spec_section_name?: string | null
          status?: string | null
          submittal_number?: string
          submitted_by?: string | null
          title?: string
          updated_at?: string | null
          workflow_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "submittals_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submittals_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submittals_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "org_usage_summary"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "submittals_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submittals_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submittals_reviewer_fkey"
            columns: ["reviewer"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      supported_formats: {
        Row: {
          can_export: boolean | null
          can_import: boolean | null
          category: string
          created_at: string | null
          description: string | null
          display_name: string
          extension: string
          id: string
          is_active: boolean | null
          max_file_size_mb: number | null
          metadata: Json | null
          mime_type: string | null
          processing_credit_cost: number | null
          requires_processing: boolean | null
        }
        Insert: {
          can_export?: boolean | null
          can_import?: boolean | null
          category: string
          created_at?: string | null
          description?: string | null
          display_name: string
          extension: string
          id?: string
          is_active?: boolean | null
          max_file_size_mb?: number | null
          metadata?: Json | null
          mime_type?: string | null
          processing_credit_cost?: number | null
          requires_processing?: boolean | null
        }
        Update: {
          can_export?: boolean | null
          can_import?: boolean | null
          category?: string
          created_at?: string | null
          description?: string | null
          display_name?: string
          extension?: string
          id?: string
          is_active?: boolean | null
          max_file_size_mb?: number | null
          metadata?: Json | null
          mime_type?: string | null
          processing_credit_cost?: number | null
          requires_processing?: boolean | null
        }
        Relationships: []
      }
      suspicious_activity: {
        Row: {
          action_taken: string | null
          activity_type: string
          created_at: string | null
          description: string | null
          id: string
          ip_address: string | null
          metadata: Json | null
          org_id: string | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action_taken?: string | null
          activity_type: string
          created_at?: string | null
          description?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          org_id?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action_taken?: string | null
          activity_type?: string
          created_at?: string | null
          description?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          org_id?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "suspicious_activity_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "org_usage_summary"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "suspicious_activity_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suspicious_activity_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suspicious_activity_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      system_health: {
        Row: {
          checked_at: string | null
          error_message: string | null
          id: string
          metadata: Json | null
          response_time_ms: number | null
          service_name: string
          status: string
        }
        Insert: {
          checked_at?: string | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          response_time_ms?: number | null
          service_name: string
          status: string
        }
        Update: {
          checked_at?: string | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          response_time_ms?: number | null
          service_name?: string
          status?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          assigned_to: string | null
          attachments: Json | null
          checklist: Json | null
          completed_date: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          due_date: string | null
          duration_days: number | null
          id: string
          location: Json | null
          org_id: string | null
          parent_id: string | null
          percent_complete: number | null
          predecessors: Json | null
          priority: string | null
          project_id: string
          start_date: string | null
          status: string | null
          tags: Json | null
          task_number: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          attachments?: Json | null
          checklist?: Json | null
          completed_date?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          duration_days?: number | null
          id?: string
          location?: Json | null
          org_id?: string | null
          parent_id?: string | null
          percent_complete?: number | null
          predecessors?: Json | null
          priority?: string | null
          project_id: string
          start_date?: string | null
          status?: string | null
          tags?: Json | null
          task_number?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          attachments?: Json | null
          checklist?: Json | null
          completed_date?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          duration_days?: number | null
          id?: string
          location?: Json | null
          org_id?: string | null
          parent_id?: string | null
          percent_complete?: number | null
          predecessors?: Json | null
          priority?: string | null
          project_id?: string
          start_date?: string | null
          status?: string | null
          tags?: Json | null
          task_number?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "org_usage_summary"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "tasks_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      tier_limits: {
        Row: {
          annual_price_cents: number | null
          created_at: string | null
          display_name: string
          display_order: number | null
          features: Json | null
          id: string
          is_active: boolean | null
          monthly_compute_units: number
          monthly_price_cents: number
          projects_limit: number
          seats_limit: number
          storage_limit_bytes: number
          tier_name: string
          updated_at: string | null
        }
        Insert: {
          annual_price_cents?: number | null
          created_at?: string | null
          display_name: string
          display_order?: number | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          monthly_compute_units?: number
          monthly_price_cents?: number
          projects_limit?: number
          seats_limit?: number
          storage_limit_bytes?: number
          tier_name: string
          updated_at?: string | null
        }
        Update: {
          annual_price_cents?: number | null
          created_at?: string | null
          display_name?: string
          display_order?: number | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          monthly_compute_units?: number
          monthly_price_cents?: number
          projects_limit?: number
          seats_limit?: number
          storage_limit_bytes?: number
          tier_name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      tour_analytics: {
        Row: {
          created_at: string | null
          duration_seconds: number | null
          ended_at: string | null
          hotspots_clicked: Json | null
          id: string
          referrer: string | null
          scenes_viewed: Json | null
          session_id: string | null
          started_at: string | null
          tour_id: string | null
          user_agent: string | null
          viewer_ip: unknown
        }
        Insert: {
          created_at?: string | null
          duration_seconds?: number | null
          ended_at?: string | null
          hotspots_clicked?: Json | null
          id?: string
          referrer?: string | null
          scenes_viewed?: Json | null
          session_id?: string | null
          started_at?: string | null
          tour_id?: string | null
          user_agent?: string | null
          viewer_ip?: unknown
        }
        Update: {
          created_at?: string | null
          duration_seconds?: number | null
          ended_at?: string | null
          hotspots_clicked?: Json | null
          id?: string
          referrer?: string | null
          scenes_viewed?: Json | null
          session_id?: string | null
          started_at?: string | null
          tour_id?: string | null
          user_agent?: string | null
          viewer_ip?: unknown
        }
        Relationships: [
          {
            foreignKeyName: "tour_analytics_tour_id_fkey"
            columns: ["tour_id"]
            isOneToOne: false
            referencedRelation: "tours"
            referencedColumns: ["id"]
          },
        ]
      }
      tour_scenes: {
        Row: {
          created_at: string
          file_size_bytes: number
          id: string
          initial_pitch: number | null
          initial_yaw: number | null
          panorama_path: string
          sort_order: number
          thumbnail_path: string | null
          title: string
          tour_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          file_size_bytes?: number
          id?: string
          initial_pitch?: number | null
          initial_yaw?: number | null
          panorama_path: string
          sort_order?: number
          thumbnail_path?: string | null
          title: string
          tour_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          file_size_bytes?: number
          id?: string
          initial_pitch?: number | null
          initial_yaw?: number | null
          panorama_path?: string
          sort_order?: number
          thumbnail_path?: string | null
          title?: string
          tour_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tour_scenes_tour_id_fkey"
            columns: ["tour_id"]
            isOneToOne: false
            referencedRelation: "project_tours"
            referencedColumns: ["id"]
          },
        ]
      }
      tours: {
        Row: {
          branding: Json | null
          created_at: string | null
          created_by: string | null
          description: string | null
          embed_code: string | null
          expires_at: string | null
          hotspots: Json | null
          id: string
          is_public: boolean | null
          name: string
          org_id: string | null
          password_hash: string | null
          project_id: string | null
          published_at: string | null
          published_url: string | null
          scenes: Json | null
          status: string | null
          updated_at: string | null
          vr_enabled: boolean | null
        }
        Insert: {
          branding?: Json | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          embed_code?: string | null
          expires_at?: string | null
          hotspots?: Json | null
          id?: string
          is_public?: boolean | null
          name: string
          org_id?: string | null
          password_hash?: string | null
          project_id?: string | null
          published_at?: string | null
          published_url?: string | null
          scenes?: Json | null
          status?: string | null
          updated_at?: string | null
          vr_enabled?: boolean | null
        }
        Update: {
          branding?: Json | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          embed_code?: string | null
          expires_at?: string | null
          hotspots?: Json | null
          id?: string
          is_public?: boolean | null
          name?: string
          org_id?: string | null
          password_hash?: string | null
          project_id?: string | null
          published_at?: string | null
          published_url?: string | null
          scenes?: Json | null
          status?: string | null
          updated_at?: string | null
          vr_enabled?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "tours_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tours_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "org_usage_summary"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "tours_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tours_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      unified_files: {
        Row: {
          created_at: string | null
          credits_used: number | null
          file_type: string | null
          folder_id: string | null
          folder_path: string | null
          id: string
          linked_tabs: string[] | null
          metadata: Json | null
          mime_type: string | null
          name: string
          org_id: string | null
          original_name: string | null
          parent_folder_id: string | null
          preview_key: string | null
          processing_error: string | null
          processing_job_id: string | null
          processing_progress: number | null
          project_id: string | null
          s3_bucket: string | null
          size_bytes: number | null
          source: string | null
          status: string | null
          storage_bucket: string | null
          storage_key: string
          thumbnail_key: string | null
          thumbnail_url: string | null
          type: string | null
          updated_at: string | null
          uploaded_at: string | null
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string | null
          credits_used?: number | null
          file_type?: string | null
          folder_id?: string | null
          folder_path?: string | null
          id?: string
          linked_tabs?: string[] | null
          metadata?: Json | null
          mime_type?: string | null
          name: string
          org_id?: string | null
          original_name?: string | null
          parent_folder_id?: string | null
          preview_key?: string | null
          processing_error?: string | null
          processing_job_id?: string | null
          processing_progress?: number | null
          project_id?: string | null
          s3_bucket?: string | null
          size_bytes?: number | null
          source?: string | null
          status?: string | null
          storage_bucket?: string | null
          storage_key: string
          thumbnail_key?: string | null
          thumbnail_url?: string | null
          type?: string | null
          updated_at?: string | null
          uploaded_at?: string | null
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string | null
          credits_used?: number | null
          file_type?: string | null
          folder_id?: string | null
          folder_path?: string | null
          id?: string
          linked_tabs?: string[] | null
          metadata?: Json | null
          mime_type?: string | null
          name?: string
          org_id?: string | null
          original_name?: string | null
          parent_folder_id?: string | null
          preview_key?: string | null
          processing_error?: string | null
          processing_job_id?: string | null
          processing_progress?: number | null
          project_id?: string | null
          s3_bucket?: string | null
          size_bytes?: number | null
          source?: string | null
          status?: string | null
          storage_bucket?: string | null
          storage_key?: string
          thumbnail_key?: string | null
          thumbnail_url?: string | null
          type?: string | null
          updated_at?: string | null
          uploaded_at?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "unified_files_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "org_usage_summary"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "unified_files_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unified_files_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      user_integrations: {
        Row: {
          access_token: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          org_id: string | null
          provider: string
          provider_user_id: string
          provider_username: string | null
          refresh_token: string | null
          settings: Json | null
          token_expires_at: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          access_token?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          org_id?: string | null
          provider: string
          provider_user_id: string
          provider_username?: string | null
          refresh_token?: string | null
          settings?: Json | null
          token_expires_at?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          access_token?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          org_id?: string | null
          provider?: string
          provider_user_id?: string
          provider_username?: string | null
          refresh_token?: string | null
          settings?: Json | null
          token_expires_at?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_integrations_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "org_usage_summary"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "user_integrations_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_integrations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_notifications: {
        Row: {
          action_url: string | null
          category: string | null
          created_at: string | null
          email_sent: boolean | null
          expires_at: string | null
          id: string
          in_app_read: boolean | null
          message: string
          metadata: Json | null
          notification_type: string | null
          org_id: string | null
          push_sent: boolean | null
          read_at: string | null
          sent_at: string | null
          title: string
          user_id: string | null
        }
        Insert: {
          action_url?: string | null
          category?: string | null
          created_at?: string | null
          email_sent?: boolean | null
          expires_at?: string | null
          id?: string
          in_app_read?: boolean | null
          message: string
          metadata?: Json | null
          notification_type?: string | null
          org_id?: string | null
          push_sent?: boolean | null
          read_at?: string | null
          sent_at?: string | null
          title: string
          user_id?: string | null
        }
        Update: {
          action_url?: string | null
          category?: string | null
          created_at?: string | null
          email_sent?: boolean | null
          expires_at?: string | null
          id?: string
          in_app_read?: boolean | null
          message?: string
          metadata?: Json | null
          notification_type?: string | null
          org_id?: string | null
          push_sent?: boolean | null
          read_at?: string | null
          sent_at?: string | null
          title?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_notifications_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "org_usage_summary"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "user_notifications_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_preferences_history: {
        Row: {
          changed_at: string | null
          changed_field: string
          id: string
          ip_address: unknown
          new_value: string | null
          old_value: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          changed_at?: string | null
          changed_field: string
          id?: string
          ip_address?: unknown
          new_value?: string | null
          old_value?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          changed_at?: string | null
          changed_field?: string
          id?: string
          ip_address?: unknown
          new_value?: string | null
          old_value?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          avatar_url: string | null
          full_name: string | null
          phone: string | null
          preferences: Json
          signature_url: string | null
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          full_name?: string | null
          phone?: string | null
          preferences?: Json
          signature_url?: string | null
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          full_name?: string | null
          phone?: string | null
          preferences?: Json
          signature_url?: string | null
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      viewer_comments: {
        Row: {
          author_email: string | null
          author_name: string
          author_user_id: string | null
          body: string
          comment_intent: string | null
          created_at: string
          deliverable_id: string
          id: string
          is_escalation: boolean
          is_field: boolean
          item_id: string
          parent_id: string | null
        }
        Insert: {
          author_email?: string | null
          author_name: string
          author_user_id?: string | null
          body: string
          comment_intent?: string | null
          created_at?: string
          deliverable_id: string
          id?: string
          is_escalation?: boolean
          is_field?: boolean
          item_id: string
          parent_id?: string | null
        }
        Update: {
          author_email?: string | null
          author_name?: string
          author_user_id?: string | null
          body?: string
          comment_intent?: string | null
          created_at?: string
          deliverable_id?: string
          id?: string
          is_escalation?: boolean
          is_field?: boolean
          item_id?: string
          parent_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "viewer_comments_deliverable_id_fkey"
            columns: ["deliverable_id"]
            isOneToOne: false
            referencedRelation: "site_walk_deliverables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "viewer_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "viewer_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_executions: {
        Row: {
          completed_at: string | null
          created_at: string | null
          current_step: number | null
          document_id: string | null
          id: string
          initiated_by: string | null
          started_at: string | null
          status: string | null
          step_data: Json | null
          updated_at: string | null
          workflow_id: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          current_step?: number | null
          document_id?: string | null
          id?: string
          initiated_by?: string | null
          started_at?: string | null
          status?: string | null
          step_data?: Json | null
          updated_at?: string | null
          workflow_id?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          current_step?: number | null
          document_id?: string | null
          id?: string
          initiated_by?: string | null
          started_at?: string | null
          status?: string | null
          step_data?: Json | null
          updated_at?: string | null
          workflow_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workflow_executions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_executions_initiated_by_fkey"
            columns: ["initiated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_executions_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "document_workflows"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      org_credit_summary: {
        Row: {
          last_reset_at: string | null
          monthly_allocation: number | null
          monthly_credits_used: number | null
          monthly_remaining: number | null
          monthly_reset_at: string | null
          org_id: string | null
          purchased_balance: number | null
          total_available: number | null
          updated_at: string | null
        }
        Insert: {
          last_reset_at?: string | null
          monthly_allocation?: number | null
          monthly_credits_used?: number | null
          monthly_remaining?: never
          monthly_reset_at?: string | null
          org_id?: string | null
          purchased_balance?: number | null
          total_available?: never
          updated_at?: string | null
        }
        Update: {
          last_reset_at?: string | null
          monthly_allocation?: number | null
          monthly_credits_used?: number | null
          monthly_remaining?: never
          monthly_reset_at?: string | null
          org_id?: string | null
          purchased_balance?: number | null
          total_available?: never
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "credits_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "org_usage_summary"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "credits_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_usage_summary: {
        Row: {
          completed_processing_jobs: number | null
          credits_remaining: number | null
          monthly_credits: number | null
          org_id: string | null
          org_name: string | null
          plan_type: string | null
          projects_count: number | null
          projects_limit: number | null
          seats_limit: number | null
          seats_purchased: number | null
          seats_used: number | null
          storage_limit_bytes: number | null
          storage_percent_used: number | null
          storage_used_bytes: number | null
          tier: string | null
          tier_display_name: string | null
          total_credits_used_processing: number | null
          total_processing_jobs: number | null
        }
        Relationships: []
      }
      private_org_members_view: {
        Row: {
          deactivated_at: string | null
          deactivated_by: string | null
          id: string | null
          joined_at: string | null
          org_id: string | null
          org_role_id: string | null
          role: string | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          deactivated_at?: string | null
          deactivated_by?: string | null
          id?: string | null
          joined_at?: string | null
          org_id?: string | null
          org_role_id?: string | null
          role?: string | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          deactivated_at?: string | null
          deactivated_by?: string | null
          id?: string | null
          joined_at?: string | null
          org_id?: string | null
          org_role_id?: string | null
          role?: string | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_deactivated_by_fkey"
            columns: ["deactivated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_members_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "org_usage_summary"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "organization_members_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_members_org_role_id_fkey"
            columns: ["org_role_id"]
            isOneToOne: false
            referencedRelation: "org_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      site_walk_usage_monthly: {
        Row: {
          event_count: number | null
          event_type: string | null
          month: string | null
          org_id: string | null
          project_id: string | null
          total_quantity: number | null
          unit: string | null
        }
        Relationships: [
          {
            foreignKeyName: "site_walk_usage_events_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "org_usage_summary"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "site_walk_usage_events_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_walk_usage_events_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      add_credits:
        | {
            Args: {
              p_amount: number
              p_description: string
              p_org_id: string
              p_transaction_type: string
            }
            Returns: string
          }
        | {
            Args: {
              p_amount: number
              p_category: string
              p_org_id: string
              p_reason: string
              p_ref_id: string
              p_ref_type: string
              p_user_id: string
            }
            Returns: string
          }
      add_numbers: { Args: { a: number; b: number }; Returns: number }
      add_purchased_credits:
        | { Args: { p_amount: number; p_org_id: string }; Returns: undefined }
        | {
            Args: {
              p_amount: number
              p_metadata?: Json
              p_org_id: string
              p_reason?: string
              p_ref_id?: string
              p_ref_type?: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_compute_units: number
              p_org_id: string
              p_storage_bytes: number
            }
            Returns: undefined
          }
      basic_test: { Args: { input_val: string }; Returns: string }
      check_seat_availability: { Args: { p_org_id: string }; Returns: boolean }
      check_stakeholder_folder_permission: {
        Args: {
          p_folder_id: string
          p_permission: string
          p_stakeholder_email: string
        }
        Returns: boolean
      }
      claim_deliverable_view: {
        Args: { p_token: string }
        Returns: {
          created_at: string
          created_by: string
          deliverable_id: string
          deliverable_type: string
          expires_at: string | null
          id: string
          is_revoked: boolean
          last_viewed_at: string | null
          max_views: number | null
          metadata: Json
          org_id: string
          recipient_email: string | null
          recipient_name: string | null
          recipient_phone: string | null
          role: string
          token: string
          view_count: number
        }[]
        SetofOptions: {
          from: "*"
          to: "deliverable_access_tokens"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      claim_digital_twin_processing_job: {
        Args: { p_worker_id?: string }
        Returns: {
          attempts: number
          capture_id: string | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          credits_charged: number
          deleted_at: string | null
          deleted_by: string | null
          error_text: string | null
          id: string
          input_asset_ids: string[]
          job_type: string
          lidar_prior_asset_id: string | null
          max_attempts: number
          org_id: string
          output_format: string
          output_model_id: string | null
          output_storage_key: string | null
          preview_storage_key: string | null
          priority: number
          progress_pct: number
          space_id: string
          started_at: string | null
          status: string
          updated_at: string
          worker_run_id: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "digital_twin_processing_jobs"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      claim_digital_twin_share_view: {
        Args: { p_token: string; p_viewer_ip?: string; p_viewer_ua?: string }
        Returns: {
          branding_snapshot: Json
          created_at: string
          created_by: string
          download_count: number
          expires_at: string | null
          id: string
          is_revoked: boolean
          label: string | null
          last_viewed_at: string | null
          max_views: number | null
          org_id: string
          password_hash: string | null
          role: string
          space_id: string
          token: string
          updated_at: string
          view_count: number
        }[]
        SetofOptions: {
          from: "*"
          to: "digital_twin_share_tokens"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      consume_credits: {
        Args: {
          p_amount: number
          p_category?: string
          p_metadata?: Json
          p_org_id: string
          p_reason?: string
          p_ref_id?: string
          p_ref_type?: string
        }
        Returns: Json
      }
      create_default_enterprise_roles: {
        Args: { p_org_id: string }
        Returns: undefined
      }
      current_user_org_ids: { Args: never; Returns: string[] }
      custom_access_token_hook: { Args: { event: Json }; Returns: Json }
      enqueue_digital_twin_r2_cleanup: {
        Args: {
          p_bytes_freed?: number
          p_org_id: string
          p_source_id?: string
          p_source_table?: string
          p_storage_key: string
        }
        Returns: string
      }
      generate_invitation_token: { Args: never; Returns: string }
      generate_stakeholder_token: { Args: never; Returns: string }
      get_credit_balance: { Args: { p_org_id: string }; Returns: number }
      get_credit_breakdown: { Args: { p_org_id: string }; Returns: Json }
      get_daily_upload_count: { Args: { p_org_id: string }; Returns: number }
      get_effective_limits: {
        Args: { p_org_id: string }
        Returns: {
          compute_available: number
          compute_limit: number
          compute_used: number
          storage_available: number
          storage_limit: number
          storage_used: number
        }[]
      }
      get_nearby_photos: {
        Args: {
          p_lat: number
          p_lng: number
          p_org_id: string
          p_project_id?: string
          p_radius_meters: number
          p_session_id?: string
        }
        Returns: {
          assigned_to: string | null
          audio_s3_key: string | null
          before_item_id: string | null
          capture_mode: string
          captured_at: string
          category: string | null
          client_item_id: string | null
          client_mutation_id: string | null
          cost_estimate: number | null
          created_at: string
          created_by: string
          deleted_at: string | null
          description: string | null
          device_id: string | null
          due_date: string | null
          file_id: string | null
          id: string
          item_relationship: string
          item_status: string
          item_type: string
          last_sync_error: string | null
          latitude: number | null
          local_created_at: string | null
          local_updated_at: string | null
          location_label: string | null
          longitude: number | null
          manpower_hours: number | null
          markup_data: Json
          markup_revision: number
          metadata: Json
          org_id: string
          priority: string
          project_id: string | null
          resolved_at: string | null
          resolved_by: string | null
          retry_count: number
          s3_key: string | null
          session_id: string
          sort_order: number
          sync_state: string
          tags: string[]
          title: string
          trade: string | null
          updated_at: string
          upload_progress: number
          upload_state: string
          vector_history: Json
          verified_at: string | null
          verified_by: string | null
          weather: Json | null
          workflow_type: string
        }[]
        SetofOptions: {
          from: "*"
          to: "site_walk_items"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_next_daily_report_number: {
        Args: { p_project_id: string }
        Returns: string
      }
      get_next_punch_number: { Args: { p_project_id: string }; Returns: string }
      get_next_rfi_number: { Args: { p_project_id: string }; Returns: string }
      get_next_submittal_number: {
        Args: { p_project_id: string }
        Returns: string
      }
      get_project_folder_stats: {
        Args: { p_project_id: string }
        Returns: {
          file_count: number
          folder_path: string
          total_size: number
        }[]
      }
      get_shared_folder: {
        Args: { token_input: string }
        Returns: {
          files: Json
          folder_color: string
          folder_icon: string
          folder_id: string
          folder_name: string
          subfolders: Json
        }[]
      }
      get_storage_used: { Args: { p_org_id: string }; Returns: number }
      get_user_org_ids: { Args: never; Returns: string[] }
      get_user_org_permissions: {
        Args: { p_org_id: string; p_user_id: string }
        Returns: Json
      }
      increment_app_seat: {
        Args: { p_app_id: string; p_delta?: number; p_org_id: string }
        Returns: number
      }
      increment_daily_upload_count:
        | { Args: { p_org_id: string }; Returns: undefined }
        | { Args: { p_bytes: number; p_org_id: string }; Returns: number }
      increment_org_storage: {
        Args: { bytes_delta: number; target_org_id: string }
        Returns: undefined
      }
      log_project_activity:
        | {
            Args: {
              p_description: string
              p_metadata: Json
              p_org_id: string
              p_project_id: string
              p_severity: string
              p_title: string
              p_type: string
              p_user_id: string
            }
            Returns: string
          }
        | {
            Args: {
              p_action: string
              p_details: Json
              p_project_id: string
              p_user_id: string
            }
            Returns: string
          }
      log_stakeholder_activity: {
        Args: {
          p_action: string
          p_metadata: Json
          p_project_id: string
          p_resource_id: string
          p_resource_name: string
          p_resource_type: string
          p_stakeholder_email: string
        }
        Returns: undefined
      }
      record_credit_usage: {
        Args: {
          p_amount: number
          p_category: string
          p_org_id: string
          p_reason: string
          p_ref_id?: string
          p_ref_type?: string
          p_user_id?: string
        }
        Returns: string
      }
      record_site_walk_usage: {
        Args: {
          p_event_type: string
          p_metadata?: Json
          p_org_id: string
          p_project_id: string
          p_quantity: number
          p_session_id: string
          p_source_id?: string
          p_source_table?: string
          p_unit: string
        }
        Returns: string
      }
      record_usage_event: {
        Args: {
          p_bandwidth_delta: number
          p_compute_delta: number
          p_description: string
          p_event_type: string
          p_org_id: string
          p_resource_id: string
          p_resource_type: string
          p_storage_delta: number
          p_user_id: string
        }
        Returns: string
      }
      recover_stale_digital_twin_processing_jobs: {
        Args: { p_stale_minutes?: number }
        Returns: number
      }
      reset_monthly_credits: { Args: { p_org_id: string }; Returns: undefined }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      user_can_access_org_or_project: {
        Args: { p_org_id: string; p_project_id: string; p_user_id?: string }
        Returns: boolean
      }
      user_can_access_project: {
        Args: { p_project_id: string; p_user_id?: string }
        Returns: boolean
      }
      user_can_manage_org_or_project: {
        Args: { p_org_id: string; p_project_id: string; p_user_id?: string }
        Returns: boolean
      }
      user_can_manage_project: {
        Args: { p_project_id: string; p_user_id?: string }
        Returns: boolean
      }
      user_can_respond_to_project: {
        Args: { p_project_id: string; p_user_id?: string }
        Returns: boolean
      }
      user_is_org_member: {
        Args: { p_org_id: string; p_user_id?: string }
        Returns: boolean
      }
      user_project_role: {
        Args: { p_project_id: string; p_user_id?: string }
        Returns: string
      }
      validate_shared_token: { Args: { token_input: string }; Returns: string }
      verify_share_token: {
        Args: { token_input: string }
        Returns: {
          file_id: string
          folder_id: string
          is_valid: boolean
          project_id: string
          role: string
        }[]
      }
    }
    Enums: {
      org_role: "owner" | "admin" | "member" | "viewer"
      subscription_sku_kind:
        | "site_walk_std"
        | "site_walk_pro"
        | "tours_std"
        | "tours_pro"
        | "design_studio_std"
        | "design_studio_pro"
        | "content_studio_std"
        | "content_studio_pro"
        | "project_bundle_std"
        | "project_bundle_pro"
        | "studio_bundle_std"
        | "studio_bundle_pro"
        | "total_std"
        | "total_pro"
        | "enterprise"
        | "digital_twin_std"
        | "digital_twin_pro"
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
      org_role: ["owner", "admin", "member", "viewer"],
      subscription_sku_kind: [
        "site_walk_std",
        "site_walk_pro",
        "tours_std",
        "tours_pro",
        "design_studio_std",
        "design_studio_pro",
        "content_studio_std",
        "content_studio_pro",
        "project_bundle_std",
        "project_bundle_pro",
        "studio_bundle_std",
        "studio_bundle_pro",
        "total_std",
        "total_pro",
        "enterprise",
        "digital_twin_std",
        "digital_twin_pro",
      ],
    },
  },
} as const
