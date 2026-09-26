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
  public: {
    Tables: {
      account_deletion_requests: {
        Row: {
          cancelled_at: string | null
          completed_at: string | null
          created_at: string
          id: string
          reason: string | null
          requested_at: string
          scheduled_for: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cancelled_at?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          reason?: string | null
          requested_at?: string
          scheduled_for?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cancelled_at?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          reason?: string | null
          requested_at?: string
          scheduled_for?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      accounting_account_guides: {
        Row: {
          code: string
          commentaires: string | null
          contenu: string | null
          controle: string | null
          created_at: string
          exclusions: string | null
          fonctionnement: string | null
          subdivisions: string | null
          title: string
        }
        Insert: {
          code: string
          commentaires?: string | null
          contenu?: string | null
          controle?: string | null
          created_at?: string
          exclusions?: string | null
          fonctionnement?: string | null
          subdivisions?: string | null
          title: string
        }
        Update: {
          code?: string
          commentaires?: string | null
          contenu?: string | null
          controle?: string | null
          created_at?: string
          exclusions?: string | null
          fonctionnement?: string | null
          subdivisions?: string | null
          title?: string
        }
        Relationships: []
      }
      accounting_accounts: {
        Row: {
          account_class: number
          code: string
          created_at: string
          id: string
          is_active: boolean
          is_detail: boolean
          label: string
          level: number
          nature: string
          parent_code: string | null
          updated_at: string
        }
        Insert: {
          account_class: number
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_detail?: boolean
          label: string
          level?: number
          nature?: string
          parent_code?: string | null
          updated_at?: string
        }
        Update: {
          account_class?: number
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_detail?: boolean
          label?: string
          level?: number
          nature?: string
          parent_code?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      accounting_entries: {
        Row: {
          created_at: string
          created_by: string | null
          currency: string
          entry_date: string
          fiscal_year_id: string | null
          grant_id: string | null
          id: string
          is_opening: boolean
          journal_id: string | null
          label: string
          notes: string | null
          piece_ref: string | null
          project_id: string | null
          source_id: string | null
          source_type: string | null
          status: string
          total_credit: number
          total_debit: number
          updated_at: string
          validated_at: string | null
          validated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          currency?: string
          entry_date?: string
          fiscal_year_id?: string | null
          grant_id?: string | null
          id?: string
          is_opening?: boolean
          journal_id?: string | null
          label: string
          notes?: string | null
          piece_ref?: string | null
          project_id?: string | null
          source_id?: string | null
          source_type?: string | null
          status?: string
          total_credit?: number
          total_debit?: number
          updated_at?: string
          validated_at?: string | null
          validated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          currency?: string
          entry_date?: string
          fiscal_year_id?: string | null
          grant_id?: string | null
          id?: string
          is_opening?: boolean
          journal_id?: string | null
          label?: string
          notes?: string | null
          piece_ref?: string | null
          project_id?: string | null
          source_id?: string | null
          source_type?: string | null
          status?: string
          total_credit?: number
          total_debit?: number
          updated_at?: string
          validated_at?: string | null
          validated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accounting_entries_fiscal_year_id_fkey"
            columns: ["fiscal_year_id"]
            isOneToOne: false
            referencedRelation: "accounting_fiscal_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_entries_grant_id_fkey"
            columns: ["grant_id"]
            isOneToOne: false
            referencedRelation: "grants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_entries_journal_id_fkey"
            columns: ["journal_id"]
            isOneToOne: false
            referencedRelation: "accounting_journals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_entries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      accounting_entry_lines: {
        Row: {
          account_code: string
          analytic_code: string | null
          created_at: string
          credit: number
          debit: number
          entry_id: string
          id: string
          label: string | null
          lettered_at: string | null
          lettrage: string | null
          line_no: number
          project_id: string | null
          third_party_id: string | null
        }
        Insert: {
          account_code: string
          analytic_code?: string | null
          created_at?: string
          credit?: number
          debit?: number
          entry_id: string
          id?: string
          label?: string | null
          lettered_at?: string | null
          lettrage?: string | null
          line_no?: number
          project_id?: string | null
          third_party_id?: string | null
        }
        Update: {
          account_code?: string
          analytic_code?: string | null
          created_at?: string
          credit?: number
          debit?: number
          entry_id?: string
          id?: string
          label?: string | null
          lettered_at?: string | null
          lettrage?: string | null
          line_no?: number
          project_id?: string | null
          third_party_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accounting_entry_lines_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "accounting_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_entry_lines_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_entry_lines_third_party_id_fkey"
            columns: ["third_party_id"]
            isOneToOne: false
            referencedRelation: "crm_contreparties"
            referencedColumns: ["id"]
          },
        ]
      }
      accounting_fiscal_years: {
        Row: {
          closed_at: string | null
          closed_by: string | null
          created_at: string
          created_by: string | null
          end_date: string
          id: string
          label: string
          start_date: string
          status: string
          updated_at: string
        }
        Insert: {
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string
          created_by?: string | null
          end_date: string
          id?: string
          label: string
          start_date: string
          status?: string
          updated_at?: string
        }
        Update: {
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string
          created_by?: string | null
          end_date?: string
          id?: string
          label?: string
          start_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      accounting_journals: {
        Row: {
          allowed_prefixes: string[] | null
          code: string
          counterpart_account: string | null
          created_at: string
          id: string
          is_active: boolean
          journal_type: string
          label: string
          updated_at: string
        }
        Insert: {
          allowed_prefixes?: string[] | null
          code: string
          counterpart_account?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          journal_type?: string
          label: string
          updated_at?: string
        }
        Update: {
          allowed_prefixes?: string[] | null
          code?: string
          counterpart_account?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          journal_type?: string
          label?: string
          updated_at?: string
        }
        Relationships: []
      }
      activity_log: {
        Row: {
          action: string
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          metadata: Json | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      alumni_kpis: {
        Row: {
          alumni_id: string
          created_at: string
          created_by: string | null
          customers_count: number | null
          exports_xof: number | null
          funding_raised_xof: number | null
          id: string
          jobs_total: number | null
          jobs_women: number | null
          jobs_youth: number | null
          notes: string | null
          recorded_at: string
          revenue_xof: number | null
        }
        Insert: {
          alumni_id: string
          created_at?: string
          created_by?: string | null
          customers_count?: number | null
          exports_xof?: number | null
          funding_raised_xof?: number | null
          id?: string
          jobs_total?: number | null
          jobs_women?: number | null
          jobs_youth?: number | null
          notes?: string | null
          recorded_at?: string
          revenue_xof?: number | null
        }
        Update: {
          alumni_id?: string
          created_at?: string
          created_by?: string | null
          customers_count?: number | null
          exports_xof?: number | null
          funding_raised_xof?: number | null
          id?: string
          jobs_total?: number | null
          jobs_women?: number | null
          jobs_youth?: number | null
          notes?: string | null
          recorded_at?: string
          revenue_xof?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "alumni_kpis_alumni_id_fkey"
            columns: ["alumni_id"]
            isOneToOne: false
            referencedRelation: "alumni_records"
            referencedColumns: ["id"]
          },
        ]
      }
      alumni_records: {
        Row: {
          cohort_id: string | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          created_by: string | null
          graduation_date: string
          id: string
          impact_summary: string | null
          notes: string | null
          program_id: string | null
          startup_id: string | null
          status: string
          updated_at: string
          website_url: string | null
        }
        Insert: {
          cohort_id?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          created_by?: string | null
          graduation_date?: string
          id?: string
          impact_summary?: string | null
          notes?: string | null
          program_id?: string | null
          startup_id?: string | null
          status?: string
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          cohort_id?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          created_by?: string | null
          graduation_date?: string
          id?: string
          impact_summary?: string | null
          notes?: string | null
          program_id?: string | null
          startup_id?: string | null
          status?: string
          updated_at?: string
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "alumni_records_cohort_id_fkey"
            columns: ["cohort_id"]
            isOneToOne: false
            referencedRelation: "cohorts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alumni_records_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alumni_records_startup_id_fkey"
            columns: ["startup_id"]
            isOneToOne: false
            referencedRelation: "startups"
            referencedColumns: ["id"]
          },
        ]
      }
      api_keys: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          key_hash: string
          key_prefix: string
          last_used_at: string | null
          name: string
          revoked_at: string | null
          scopes: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          key_hash: string
          key_prefix: string
          last_used_at?: string | null
          name: string
          revoked_at?: string | null
          scopes?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          key_hash?: string
          key_prefix?: string
          last_used_at?: string | null
          name?: string
          revoked_at?: string | null
          scopes?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      application_evaluations: {
        Row: {
          application_id: string
          created_at: string | null
          evaluator_id: string
          id: string
          is_demo: boolean
          notes: string | null
          recommendation: string | null
          round_id: string
          scores: Json | null
          submitted_at: string | null
          total_score: number | null
          updated_at: string | null
        }
        Insert: {
          application_id: string
          created_at?: string | null
          evaluator_id: string
          id?: string
          is_demo?: boolean
          notes?: string | null
          recommendation?: string | null
          round_id: string
          scores?: Json | null
          submitted_at?: string | null
          total_score?: number | null
          updated_at?: string | null
        }
        Update: {
          application_id?: string
          created_at?: string | null
          evaluator_id?: string
          id?: string
          is_demo?: boolean
          notes?: string | null
          recommendation?: string | null
          round_id?: string
          scores?: Json | null
          submitted_at?: string | null
          total_score?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "application_evaluations_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "application_evaluations_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "application_rounds"
            referencedColumns: ["id"]
          },
        ]
      }
      application_rounds: {
        Row: {
          created_at: string | null
          description: string | null
          ends_at: string | null
          id: string
          is_active: boolean | null
          is_demo: boolean
          name: string
          program_id: string | null
          project_id: string | null
          round_number: number
          round_type: string
          starts_at: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          ends_at?: string | null
          id?: string
          is_active?: boolean | null
          is_demo?: boolean
          name: string
          program_id?: string | null
          project_id?: string | null
          round_number?: number
          round_type?: string
          starts_at?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          ends_at?: string | null
          id?: string
          is_active?: boolean | null
          is_demo?: boolean
          name?: string
          program_id?: string | null
          project_id?: string | null
          round_number?: number
          round_type?: string
          starts_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "application_rounds_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "application_rounds_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      applications: {
        Row: {
          applicant_id: string
          cohort_id: string | null
          created_at: string
          current_round_id: string | null
          evaluation_notes: string | null
          evaluator_id: string | null
          id: string
          is_demo: boolean
          motivation: string | null
          program_id: string | null
          project_id: string | null
          reviewed_at: string | null
          score: number | null
          startup_id: string | null
          status: Database["public"]["Enums"]["application_status"]
          submitted_at: string
          updated_at: string
        }
        Insert: {
          applicant_id: string
          cohort_id?: string | null
          created_at?: string
          current_round_id?: string | null
          evaluation_notes?: string | null
          evaluator_id?: string | null
          id?: string
          is_demo?: boolean
          motivation?: string | null
          program_id?: string | null
          project_id?: string | null
          reviewed_at?: string | null
          score?: number | null
          startup_id?: string | null
          status?: Database["public"]["Enums"]["application_status"]
          submitted_at?: string
          updated_at?: string
        }
        Update: {
          applicant_id?: string
          cohort_id?: string | null
          created_at?: string
          current_round_id?: string | null
          evaluation_notes?: string | null
          evaluator_id?: string | null
          id?: string
          is_demo?: boolean
          motivation?: string | null
          program_id?: string | null
          project_id?: string | null
          reviewed_at?: string | null
          score?: number | null
          startup_id?: string | null
          status?: Database["public"]["Enums"]["application_status"]
          submitted_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "applications_cohort_id_fkey"
            columns: ["cohort_id"]
            isOneToOne: false
            referencedRelation: "cohorts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_current_round_id_fkey"
            columns: ["current_round_id"]
            isOneToOne: false
            referencedRelation: "application_rounds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_startup_id_fkey"
            columns: ["startup_id"]
            isOneToOne: false
            referencedRelation: "startups"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_nomenclature: {
        Row: {
          code: string
          created_at: string
          is_active: boolean
          label: string
          level: number
          parent_code: string | null
          sort_order: number
        }
        Insert: {
          code: string
          created_at?: string
          is_active?: boolean
          label: string
          level?: number
          parent_code?: string | null
          sort_order?: number
        }
        Update: {
          code?: string
          created_at?: string
          is_active?: boolean
          label?: string
          level?: number
          parent_code?: string | null
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "budget_nomenclature_parent_code_fkey"
            columns: ["parent_code"]
            isOneToOne: false
            referencedRelation: "budget_nomenclature"
            referencedColumns: ["code"]
          },
        ]
      }
      budgets: {
        Row: {
          amount_planned: number | null
          amount_spent: number | null
          category: string
          created_at: string
          currency: string | null
          grant_id: string | null
          id: string
          is_demo: boolean
          label: string
          nomenclature_code: string | null
          project_id: string | null
          updated_at: string
        }
        Insert: {
          amount_planned?: number | null
          amount_spent?: number | null
          category: string
          created_at?: string
          currency?: string | null
          grant_id?: string | null
          id?: string
          is_demo?: boolean
          label: string
          nomenclature_code?: string | null
          project_id?: string | null
          updated_at?: string
        }
        Update: {
          amount_planned?: number | null
          amount_spent?: number | null
          category?: string
          created_at?: string
          currency?: string | null
          grant_id?: string | null
          id?: string
          is_demo?: boolean
          label?: string
          nomenclature_code?: string | null
          project_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "budgets_grant_id_fkey"
            columns: ["grant_id"]
            isOneToOne: false
            referencedRelation: "grants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budgets_nomenclature_code_fkey"
            columns: ["nomenclature_code"]
            isOneToOne: false
            referencedRelation: "budget_nomenclature"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "budgets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      cap_table_entries: {
        Row: {
          cliff_months: number | null
          created_at: string
          holder_email: string | null
          holder_name: string
          holder_type: string
          id: string
          investment_id: string | null
          notes: string | null
          ownership_pct: number | null
          share_class: string
          shares: number
          startup_id: string
          updated_at: string
          vesting_months: number | null
          vesting_start: string | null
        }
        Insert: {
          cliff_months?: number | null
          created_at?: string
          holder_email?: string | null
          holder_name: string
          holder_type: string
          id?: string
          investment_id?: string | null
          notes?: string | null
          ownership_pct?: number | null
          share_class?: string
          shares?: number
          startup_id: string
          updated_at?: string
          vesting_months?: number | null
          vesting_start?: string | null
        }
        Update: {
          cliff_months?: number | null
          created_at?: string
          holder_email?: string | null
          holder_name?: string
          holder_type?: string
          id?: string
          investment_id?: string | null
          notes?: string | null
          ownership_pct?: number | null
          share_class?: string
          shares?: number
          startup_id?: string
          updated_at?: string
          vesting_months?: number | null
          vesting_start?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cap_table_entries_investment_id_fkey"
            columns: ["investment_id"]
            isOneToOne: false
            referencedRelation: "startup_investments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cap_table_entries_startup_id_fkey"
            columns: ["startup_id"]
            isOneToOne: false
            referencedRelation: "startups"
            referencedColumns: ["id"]
          },
        ]
      }
      channel_members: {
        Row: {
          channel_id: string
          id: string
          joined_at: string
          last_read_at: string | null
          muted: boolean
          role: string
          user_id: string
        }
        Insert: {
          channel_id: string
          id?: string
          joined_at?: string
          last_read_at?: string | null
          muted?: boolean
          role?: string
          user_id: string
        }
        Update: {
          channel_id?: string
          id?: string
          joined_at?: string
          last_read_at?: string | null
          muted?: boolean
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "channel_members_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
        ]
      }
      channel_messages: {
        Row: {
          channel_id: string
          content: string
          created_at: string
          edited_at: string | null
          id: string
          is_deleted: boolean
          is_edited: boolean
          is_pinned: boolean
          is_thread_reply: boolean
          last_reply_at: string | null
          metadata: Json | null
          reply_count: number
          sender_id: string
          thread_id: string | null
          updated_at: string
        }
        Insert: {
          channel_id: string
          content?: string
          created_at?: string
          edited_at?: string | null
          id?: string
          is_deleted?: boolean
          is_edited?: boolean
          is_pinned?: boolean
          is_thread_reply?: boolean
          last_reply_at?: string | null
          metadata?: Json | null
          reply_count?: number
          sender_id: string
          thread_id?: string | null
          updated_at?: string
        }
        Update: {
          channel_id?: string
          content?: string
          created_at?: string
          edited_at?: string | null
          id?: string
          is_deleted?: boolean
          is_edited?: boolean
          is_pinned?: boolean
          is_thread_reply?: boolean
          last_reply_at?: string | null
          metadata?: Json | null
          reply_count?: number
          sender_id?: string
          thread_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "channel_messages_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "channel_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "channel_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      channels: {
        Row: {
          channel_type: string
          cohort_id: string | null
          created_at: string
          created_by: string
          description: string | null
          icon: string | null
          id: string
          is_archived: boolean
          name: string
          program_id: string | null
          topic: string | null
          updated_at: string
        }
        Insert: {
          channel_type?: string
          cohort_id?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          icon?: string | null
          id?: string
          is_archived?: boolean
          name: string
          program_id?: string | null
          topic?: string | null
          updated_at?: string
        }
        Update: {
          channel_type?: string
          cohort_id?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_archived?: boolean
          name?: string
          program_id?: string | null
          topic?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "channels_cohort_id_fkey"
            columns: ["cohort_id"]
            isOneToOne: false
            referencedRelation: "cohorts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "channels_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      client_error_log: {
        Row: {
          context: Json | null
          created_at: string
          id: string
          message: string
          route: string | null
          severity: string
          stack: string | null
          url: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          context?: Json | null
          created_at?: string
          id?: string
          message: string
          route?: string | null
          severity?: string
          stack?: string | null
          url?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          context?: Json | null
          created_at?: string
          id?: string
          message?: string
          route?: string | null
          severity?: string
          stack?: string | null
          url?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      coaching_notes: {
        Row: {
          author_id: string
          content: string
          created_at: string | null
          id: string
          is_demo: boolean
          is_private: boolean | null
          session_id: string
          updated_at: string | null
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string | null
          id?: string
          is_demo?: boolean
          is_private?: boolean | null
          session_id: string
          updated_at?: string | null
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string | null
          id?: string
          is_demo?: boolean
          is_private?: boolean | null
          session_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coaching_notes_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "coaching_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      coaching_sessions: {
        Row: {
          created_at: string
          description: string | null
          duration_minutes: number | null
          feedback: string | null
          id: string
          is_demo: boolean
          meeting_url: string | null
          mentor_id: string
          notes: string | null
          rating: number | null
          scheduled_at: string
          startup_id: string
          status: Database["public"]["Enums"]["session_status"]
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          feedback?: string | null
          id?: string
          is_demo?: boolean
          meeting_url?: string | null
          mentor_id: string
          notes?: string | null
          rating?: number | null
          scheduled_at: string
          startup_id: string
          status?: Database["public"]["Enums"]["session_status"]
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          feedback?: string | null
          id?: string
          is_demo?: boolean
          meeting_url?: string | null
          mentor_id?: string
          notes?: string | null
          rating?: number | null
          scheduled_at?: string
          startup_id?: string
          status?: Database["public"]["Enums"]["session_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "coaching_sessions_startup_id_fkey"
            columns: ["startup_id"]
            isOneToOne: false
            referencedRelation: "startups"
            referencedColumns: ["id"]
          },
        ]
      }
      coaching_tasks: {
        Row: {
          assignee_id: string | null
          completed_at: string | null
          created_at: string | null
          created_by: string
          description: string | null
          due_date: string | null
          id: string
          is_completed: boolean | null
          session_id: string
          title: string
          updated_at: string | null
        }
        Insert: {
          assignee_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          created_by: string
          description?: string | null
          due_date?: string | null
          id?: string
          is_completed?: boolean | null
          session_id: string
          title: string
          updated_at?: string | null
        }
        Update: {
          assignee_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string
          description?: string | null
          due_date?: string | null
          id?: string
          is_completed?: boolean | null
          session_id?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coaching_tasks_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "coaching_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      cohorts: {
        Row: {
          created_at: string
          current_startups: number | null
          description: string | null
          end_date: string | null
          id: string
          is_demo: boolean
          max_startups: number | null
          name: string
          project_id: string | null
          start_date: string | null
          status: Database["public"]["Enums"]["project_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_startups?: number | null
          description?: string | null
          end_date?: string | null
          id?: string
          is_demo?: boolean
          max_startups?: number | null
          name: string
          project_id?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_startups?: number | null
          description?: string | null
          end_date?: string | null
          id?: string
          is_demo?: boolean
          max_startups?: number | null
          name?: string
          project_id?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cohorts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_participants: {
        Row: {
          conversation_id: string
          id: string
          joined_at: string
          user_id: string
        }
        Insert: {
          conversation_id: string
          id?: string
          joined_at?: string
          user_id: string
        }
        Update: {
          conversation_id?: string
          id?: string
          joined_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_participants_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          is_group: boolean | null
          title: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_group?: boolean | null
          title?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_group?: boolean | null
          title?: string | null
        }
        Relationships: []
      }
      cookie_consents: {
        Row: {
          analytics: boolean
          created_at: string
          given_at: string
          id: string
          ip_hash: string | null
          marketing: boolean
          necessary: boolean
          revoked_at: string | null
          session_token: string | null
          updated_at: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          analytics?: boolean
          created_at?: string
          given_at?: string
          id?: string
          ip_hash?: string | null
          marketing?: boolean
          necessary?: boolean
          revoked_at?: string | null
          session_token?: string | null
          updated_at?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          analytics?: boolean
          created_at?: string
          given_at?: string
          id?: string
          ip_hash?: string | null
          marketing?: boolean
          necessary?: boolean
          revoked_at?: string | null
          session_token?: string | null
          updated_at?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      course_enrollments: {
        Row: {
          completed_at: string | null
          course_id: string
          enrolled_at: string
          id: string
          is_demo: boolean
          progress: number | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          course_id: string
          enrolled_at?: string
          id?: string
          is_demo?: boolean
          progress?: number | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          course_id?: string
          enrolled_at?: string
          id?: string
          is_demo?: boolean
          progress?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_modules: {
        Row: {
          content: string | null
          course_id: string
          created_at: string
          duration_minutes: number | null
          id: string
          is_demo: boolean
          max_attempts: number
          module_order: number
          module_type: string
          passing_score: number
          quiz_questions: Json | null
          resources: Json | null
          shuffle_questions: boolean
          time_limit_minutes: number | null
          title: string
          updated_at: string
        }
        Insert: {
          content?: string | null
          course_id: string
          created_at?: string
          duration_minutes?: number | null
          id?: string
          is_demo?: boolean
          max_attempts?: number
          module_order?: number
          module_type?: string
          passing_score?: number
          quiz_questions?: Json | null
          resources?: Json | null
          shuffle_questions?: boolean
          time_limit_minutes?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          content?: string | null
          course_id?: string
          created_at?: string
          duration_minutes?: number | null
          id?: string
          is_demo?: boolean
          max_attempts?: number
          module_order?: number
          module_type?: string
          passing_score?: number
          quiz_questions?: Json | null
          resources?: Json | null
          shuffle_questions?: boolean
          time_limit_minutes?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_modules_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          created_at: string
          description: string | null
          duration_hours: number | null
          id: string
          instructor_id: string | null
          is_demo: boolean
          is_published: boolean | null
          level: string | null
          modules_count: number | null
          program_id: string | null
          thumbnail_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          duration_hours?: number | null
          id?: string
          instructor_id?: string | null
          is_demo?: boolean
          is_published?: boolean | null
          level?: string | null
          modules_count?: number | null
          program_id?: string | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          duration_hours?: number | null
          id?: string
          instructor_id?: string | null
          is_demo?: boolean
          is_published?: boolean | null
          level?: string | null
          modules_count?: number | null
          program_id?: string | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "courses_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_contreparties: {
        Row: {
          address: string | null
          city: string | null
          contact_email: string | null
          contact_person: string | null
          contact_phone: string | null
          country: string | null
          created_at: string
          created_by: string | null
          email: string | null
          id: string
          is_active: boolean | null
          is_client: boolean | null
          is_demo: boolean
          is_funder: boolean | null
          is_supplier: boolean | null
          name: string
          ninea: string | null
          notes: string | null
          party_type: Database["public"]["Enums"]["crm_party_type"]
          phone: string | null
          startup_id: string | null
          tax_id: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          contact_email?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          is_client?: boolean | null
          is_demo?: boolean
          is_funder?: boolean | null
          is_supplier?: boolean | null
          name: string
          ninea?: string | null
          notes?: string | null
          party_type: Database["public"]["Enums"]["crm_party_type"]
          phone?: string | null
          startup_id?: string | null
          tax_id?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          contact_email?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          is_client?: boolean | null
          is_demo?: boolean
          is_funder?: boolean | null
          is_supplier?: boolean | null
          name?: string
          ninea?: string | null
          notes?: string | null
          party_type?: Database["public"]["Enums"]["crm_party_type"]
          phone?: string | null
          startup_id?: string | null
          tax_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_contreparties_startup_id_fkey"
            columns: ["startup_id"]
            isOneToOne: false
            referencedRelation: "startups"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_invoice_lines: {
        Row: {
          created_at: string
          description: string
          id: string
          invoice_id: string
          line_total: number | null
          quantity: number
          sort_order: number | null
          tax_rate: number | null
          unit_price: number
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          invoice_id: string
          line_total?: number | null
          quantity?: number
          sort_order?: number | null
          tax_rate?: number | null
          unit_price?: number
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          invoice_id?: string
          line_total?: number | null
          quantity?: number
          sort_order?: number | null
          tax_rate?: number | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "crm_invoice_lines_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "crm_invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_invoices: {
        Row: {
          amount_paid: number | null
          contrepartie_id: string
          created_at: string
          created_by: string | null
          credit_note_for: string | null
          currency: string
          direction: Database["public"]["Enums"]["crm_invoice_direction"]
          due_date: string | null
          exchange_rate: number | null
          grant_id: string | null
          id: string
          invoice_number: string
          is_credit_note: boolean | null
          is_demo: boolean
          issue_date: string
          last_reminder_at: string | null
          last_reminder_sent_at: string | null
          notes: string | null
          paid_at: string | null
          payment_terms: string | null
          pdf_url: string | null
          project_id: string | null
          reference: string | null
          reminder_count: number
          sent_at: string | null
          sent_to_email: string | null
          status: Database["public"]["Enums"]["crm_invoice_status"]
          subscription_id: string | null
          subtotal: number | null
          tax_amount: number | null
          tax_rate: number | null
          total: number | null
          updated_at: string
        }
        Insert: {
          amount_paid?: number | null
          contrepartie_id: string
          created_at?: string
          created_by?: string | null
          credit_note_for?: string | null
          currency?: string
          direction?: Database["public"]["Enums"]["crm_invoice_direction"]
          due_date?: string | null
          exchange_rate?: number | null
          grant_id?: string | null
          id?: string
          invoice_number: string
          is_credit_note?: boolean | null
          is_demo?: boolean
          issue_date?: string
          last_reminder_at?: string | null
          last_reminder_sent_at?: string | null
          notes?: string | null
          paid_at?: string | null
          payment_terms?: string | null
          pdf_url?: string | null
          project_id?: string | null
          reference?: string | null
          reminder_count?: number
          sent_at?: string | null
          sent_to_email?: string | null
          status?: Database["public"]["Enums"]["crm_invoice_status"]
          subscription_id?: string | null
          subtotal?: number | null
          tax_amount?: number | null
          tax_rate?: number | null
          total?: number | null
          updated_at?: string
        }
        Update: {
          amount_paid?: number | null
          contrepartie_id?: string
          created_at?: string
          created_by?: string | null
          credit_note_for?: string | null
          currency?: string
          direction?: Database["public"]["Enums"]["crm_invoice_direction"]
          due_date?: string | null
          exchange_rate?: number | null
          grant_id?: string | null
          id?: string
          invoice_number?: string
          is_credit_note?: boolean | null
          is_demo?: boolean
          issue_date?: string
          last_reminder_at?: string | null
          last_reminder_sent_at?: string | null
          notes?: string | null
          paid_at?: string | null
          payment_terms?: string | null
          pdf_url?: string | null
          project_id?: string | null
          reference?: string | null
          reminder_count?: number
          sent_at?: string | null
          sent_to_email?: string | null
          status?: Database["public"]["Enums"]["crm_invoice_status"]
          subscription_id?: string | null
          subtotal?: number | null
          tax_amount?: number | null
          tax_rate?: number | null
          total?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_invoices_contrepartie_id_fkey"
            columns: ["contrepartie_id"]
            isOneToOne: false
            referencedRelation: "crm_contreparties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_invoices_credit_note_for_fkey"
            columns: ["credit_note_for"]
            isOneToOne: false
            referencedRelation: "crm_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_invoices_grant_id_fkey"
            columns: ["grant_id"]
            isOneToOne: false
            referencedRelation: "grants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_invoices_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_invoices_subscription_fk"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "crm_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_payments: {
        Row: {
          amount: number
          created_at: string
          currency: string
          id: string
          invoice_id: string
          is_demo: boolean
          notes: string | null
          payment_date: string
          payment_method: string | null
          recorded_by: string | null
          reference: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          id?: string
          invoice_id: string
          is_demo?: boolean
          notes?: string | null
          payment_date?: string
          payment_method?: string | null
          recorded_by?: string | null
          reference?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          invoice_id?: string
          is_demo?: boolean
          notes?: string | null
          payment_date?: string
          payment_method?: string | null
          recorded_by?: string | null
          reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "crm_invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_quote_lines: {
        Row: {
          created_at: string
          description: string
          id: string
          line_total: number | null
          quantity: number
          quote_id: string
          sort_order: number | null
          tax_rate: number | null
          unit_price: number
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          line_total?: number | null
          quantity?: number
          quote_id: string
          sort_order?: number | null
          tax_rate?: number | null
          unit_price?: number
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          line_total?: number | null
          quantity?: number
          quote_id?: string
          sort_order?: number | null
          tax_rate?: number | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "crm_quote_lines_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "crm_quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_quotes: {
        Row: {
          accepted_at: string | null
          contrepartie_id: string
          converted_at: string | null
          converted_invoice_id: string | null
          created_at: string
          created_by: string | null
          currency: string
          grant_id: string | null
          id: string
          is_demo: boolean
          issue_date: string
          notes: string | null
          payment_terms: string | null
          project_id: string | null
          quote_number: string
          reference: string | null
          sent_at: string | null
          status: Database["public"]["Enums"]["crm_quote_status"]
          subtotal: number | null
          tax_amount: number | null
          tax_rate: number | null
          total: number | null
          updated_at: string
          valid_until: string | null
        }
        Insert: {
          accepted_at?: string | null
          contrepartie_id: string
          converted_at?: string | null
          converted_invoice_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          grant_id?: string | null
          id?: string
          is_demo?: boolean
          issue_date?: string
          notes?: string | null
          payment_terms?: string | null
          project_id?: string | null
          quote_number: string
          reference?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["crm_quote_status"]
          subtotal?: number | null
          tax_amount?: number | null
          tax_rate?: number | null
          total?: number | null
          updated_at?: string
          valid_until?: string | null
        }
        Update: {
          accepted_at?: string | null
          contrepartie_id?: string
          converted_at?: string | null
          converted_invoice_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          grant_id?: string | null
          id?: string
          is_demo?: boolean
          issue_date?: string
          notes?: string | null
          payment_terms?: string | null
          project_id?: string | null
          quote_number?: string
          reference?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["crm_quote_status"]
          subtotal?: number | null
          tax_amount?: number | null
          tax_rate?: number | null
          total?: number | null
          updated_at?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_quotes_contrepartie_id_fkey"
            columns: ["contrepartie_id"]
            isOneToOne: false
            referencedRelation: "crm_contreparties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_quotes_converted_invoice_id_fkey"
            columns: ["converted_invoice_id"]
            isOneToOne: false
            referencedRelation: "crm_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_quotes_grant_id_fkey"
            columns: ["grant_id"]
            isOneToOne: false
            referencedRelation: "grants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_quotes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_subscription_occurrences: {
        Row: {
          amount: number
          created_at: string
          currency: string
          due_date: string
          id: string
          invoice_id: string | null
          is_paid: boolean | null
          notes: string | null
          paid_at: string | null
          subscription_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          due_date: string
          id?: string
          invoice_id?: string | null
          is_paid?: boolean | null
          notes?: string | null
          paid_at?: string | null
          subscription_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          due_date?: string
          id?: string
          invoice_id?: string | null
          is_paid?: boolean | null
          notes?: string | null
          paid_at?: string | null
          subscription_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_subscription_occurrences_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "crm_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_subscription_occurrences_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "crm_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_subscriptions: {
        Row: {
          amount: number
          auto_invoice: boolean | null
          category: string | null
          contrepartie_id: string
          created_at: string
          created_by: string | null
          currency: string
          description: string | null
          end_date: string | null
          frequency: Database["public"]["Enums"]["crm_subscription_frequency"]
          id: string
          is_demo: boolean
          name: string
          next_due_date: string
          notes: string | null
          start_date: string
          status: Database["public"]["Enums"]["crm_subscription_status"]
          updated_at: string
        }
        Insert: {
          amount: number
          auto_invoice?: boolean | null
          category?: string | null
          contrepartie_id: string
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string | null
          end_date?: string | null
          frequency?: Database["public"]["Enums"]["crm_subscription_frequency"]
          id?: string
          is_demo?: boolean
          name: string
          next_due_date?: string
          notes?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["crm_subscription_status"]
          updated_at?: string
        }
        Update: {
          amount?: number
          auto_invoice?: boolean | null
          category?: string | null
          contrepartie_id?: string
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string | null
          end_date?: string | null
          frequency?: Database["public"]["Enums"]["crm_subscription_frequency"]
          id?: string
          is_demo?: boolean
          name?: string
          next_due_date?: string
          notes?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["crm_subscription_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_subscriptions_contrepartie_id_fkey"
            columns: ["contrepartie_id"]
            isOneToOne: false
            referencedRelation: "crm_contreparties"
            referencedColumns: ["id"]
          },
        ]
      }
      data_collection_forms: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          fields: Json
          frequency: string | null
          id: string
          is_active: boolean | null
          is_demo: boolean
          program_id: string | null
          target_stages: string[] | null
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          fields?: Json
          frequency?: string | null
          id?: string
          is_active?: boolean | null
          is_demo?: boolean
          program_id?: string | null
          target_stages?: string[] | null
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          fields?: Json
          frequency?: string | null
          id?: string
          is_active?: boolean | null
          is_demo?: boolean
          program_id?: string | null
          target_stages?: string[] | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "data_collection_forms_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      data_collection_responses: {
        Row: {
          created_at: string | null
          form_id: string
          id: string
          is_demo: boolean
          period: string | null
          respondent_id: string
          responses: Json
          startup_id: string
          status: string | null
          submitted_at: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          form_id: string
          id?: string
          is_demo?: boolean
          period?: string | null
          respondent_id: string
          responses?: Json
          startup_id: string
          status?: string | null
          submitted_at?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          form_id?: string
          id?: string
          is_demo?: boolean
          period?: string | null
          respondent_id?: string
          responses?: Json
          startup_id?: string
          status?: string | null
          submitted_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "data_collection_responses_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "data_collection_forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "data_collection_responses_startup_id_fkey"
            columns: ["startup_id"]
            isOneToOne: false
            referencedRelation: "startups"
            referencedColumns: ["id"]
          },
        ]
      }
      data_export_requests: {
        Row: {
          completed_at: string | null
          created_at: string
          error_message: string | null
          expires_at: string | null
          file_path: string | null
          id: string
          requested_at: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          expires_at?: string | null
          file_path?: string | null
          id?: string
          requested_at?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          expires_at?: string | null
          file_path?: string | null
          id?: string
          requested_at?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      data_processing_register: {
        Row: {
          created_at: string
          cross_border_transfer: boolean
          data_categories: string[]
          data_controller: string | null
          dpo_contact: string | null
          id: string
          is_active: boolean
          legal_basis: string
          purpose: string
          recipients: string[]
          retention_period_days: number | null
          security_measures: string | null
          transfer_countries: string[] | null
          treatment_name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          cross_border_transfer?: boolean
          data_categories?: string[]
          data_controller?: string | null
          dpo_contact?: string | null
          id?: string
          is_active?: boolean
          legal_basis: string
          purpose: string
          recipients?: string[]
          retention_period_days?: number | null
          security_measures?: string | null
          transfer_countries?: string[] | null
          treatment_name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          cross_border_transfer?: boolean
          data_categories?: string[]
          data_controller?: string | null
          dpo_contact?: string | null
          id?: string
          is_active?: boolean
          legal_basis?: string
          purpose?: string
          recipients?: string[]
          retention_period_days?: number | null
          security_measures?: string | null
          transfer_countries?: string[] | null
          treatment_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      dataroom_checklist: {
        Row: {
          created_at: string
          document_id: string | null
          due_date: string | null
          folder_code: string
          id: string
          is_required: boolean
          item: string
          notes: string | null
          project_id: string
          sort_order: number
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          document_id?: string | null
          due_date?: string | null
          folder_code: string
          id?: string
          is_required?: boolean
          item: string
          notes?: string | null
          project_id: string
          sort_order?: number
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          document_id?: string | null
          due_date?: string | null
          folder_code?: string
          id?: string
          is_required?: boolean
          item?: string
          notes?: string | null
          project_id?: string
          sort_order?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dataroom_checklist_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      dataroom_folders: {
        Row: {
          code: string
          created_at: string
          description: string | null
          id: string
          name: string
          parent_code: string | null
          project_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          parent_code?: string | null
          project_id: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          parent_code?: string | null
          project_id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dataroom_folders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      digest_email_log: {
        Row: {
          id: string
          notifications_count: number
          period_end: string
          period_start: string
          sent_at: string
          status: string
          user_id: string
        }
        Insert: {
          id?: string
          notifications_count?: number
          period_end: string
          period_start: string
          sent_at?: string
          status?: string
          user_id: string
        }
        Update: {
          id?: string
          notifications_count?: number
          period_end?: string
          period_start?: string
          sent_at?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      domain_events: {
        Row: {
          actor_user_id: string | null
          aggregate_id: string | null
          aggregate_type: string
          dispatch_attempts: number
          event_name: string
          id: string
          last_dispatch_error: string | null
          occurred_at: string
          payload: Json
          processed_at: string | null
          webhook_dispatched_at: string | null
        }
        Insert: {
          actor_user_id?: string | null
          aggregate_id?: string | null
          aggregate_type: string
          dispatch_attempts?: number
          event_name: string
          id?: string
          last_dispatch_error?: string | null
          occurred_at?: string
          payload?: Json
          processed_at?: string | null
          webhook_dispatched_at?: string | null
        }
        Update: {
          actor_user_id?: string | null
          aggregate_id?: string | null
          aggregate_type?: string
          dispatch_attempts?: number
          event_name?: string
          id?: string
          last_dispatch_error?: string | null
          occurred_at?: string
          payload?: Json
          processed_at?: string | null
          webhook_dispatched_at?: string | null
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
      entity_comments: {
        Row: {
          author_id: string
          content: string
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          is_edited: boolean
          parent_id: string | null
          updated_at: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          is_edited?: boolean
          parent_id?: string | null
          updated_at?: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          is_edited?: boolean
          parent_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "entity_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "entity_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      entity_documents: {
        Row: {
          category: string
          created_at: string
          description: string | null
          entity_id: string
          entity_type: string
          file_name: string | null
          file_size: number | null
          file_url: string | null
          id: string
          title: string
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          entity_id: string
          entity_type: string
          file_name?: string | null
          file_size?: number | null
          file_url?: string | null
          id?: string
          title: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          entity_id?: string
          entity_type?: string
          file_name?: string | null
          file_size?: number | null
          file_url?: string | null
          id?: string
          title?: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: []
      }
      evaluation_criteria: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_demo: boolean
          max_score: number
          name: string
          round_id: string
          sort_order: number | null
          weight: number | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_demo?: boolean
          max_score?: number
          name: string
          round_id: string
          sort_order?: number | null
          weight?: number | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_demo?: boolean
          max_score?: number
          name?: string
          round_id?: string
          sort_order?: number | null
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "evaluation_criteria_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "application_rounds"
            referencedColumns: ["id"]
          },
        ]
      }
      event_registrations: {
        Row: {
          attended: boolean | null
          checked_in_at: string | null
          event_id: string
          id: string
          is_demo: boolean
          registered_at: string
          user_id: string
        }
        Insert: {
          attended?: boolean | null
          checked_in_at?: string | null
          event_id: string
          id?: string
          is_demo?: boolean
          registered_at?: string
          user_id: string
        }
        Update: {
          attended?: boolean | null
          checked_in_at?: string | null
          event_id?: string
          id?: string
          is_demo?: boolean
          registered_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_registrations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          created_at: string
          description: string | null
          end_at: string | null
          event_type: Database["public"]["Enums"]["event_type"]
          id: string
          is_demo: boolean
          is_online: boolean | null
          location: string | null
          max_attendees: number | null
          meeting_url: string | null
          organizer_id: string | null
          program_id: string | null
          start_at: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          end_at?: string | null
          event_type?: Database["public"]["Enums"]["event_type"]
          id?: string
          is_demo?: boolean
          is_online?: boolean | null
          location?: string | null
          max_attendees?: number | null
          meeting_url?: string | null
          organizer_id?: string | null
          program_id?: string | null
          start_at: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          end_at?: string | null
          event_type?: Database["public"]["Enums"]["event_type"]
          id?: string
          is_demo?: boolean
          is_online?: boolean | null
          location?: string | null
          max_attendees?: number | null
          meeting_url?: string | null
          organizer_id?: string | null
          program_id?: string | null
          start_at?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      grant_activities: {
        Row: {
          created_at: string
          deliverables: string | null
          description: string | null
          end_date: string | null
          grant_id: string
          id: string
          is_demo: boolean
          priority: string | null
          progress: number | null
          responsible: string | null
          start_date: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deliverables?: string | null
          description?: string | null
          end_date?: string | null
          grant_id: string
          id?: string
          is_demo?: boolean
          priority?: string | null
          progress?: number | null
          responsible?: string | null
          start_date?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deliverables?: string | null
          description?: string | null
          end_date?: string | null
          grant_id?: string
          id?: string
          is_demo?: boolean
          priority?: string | null
          progress?: number | null
          responsible?: string | null
          start_date?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "grant_activities_grant_id_fkey"
            columns: ["grant_id"]
            isOneToOne: false
            referencedRelation: "grants"
            referencedColumns: ["id"]
          },
        ]
      }
      grant_addendum_lines: {
        Row: {
          addendum_id: string
          budget_line_code: string
          created_at: string
          delta_amount: number
          id: string
        }
        Insert: {
          addendum_id: string
          budget_line_code: string
          created_at?: string
          delta_amount?: number
          id?: string
        }
        Update: {
          addendum_id?: string
          budget_line_code?: string
          created_at?: string
          delta_amount?: number
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "grant_addendum_lines_addendum_id_fkey"
            columns: ["addendum_id"]
            isOneToOne: false
            referencedRelation: "grant_addendums"
            referencedColumns: ["id"]
          },
        ]
      }
      grant_addendums: {
        Row: {
          created_at: string
          created_by: string | null
          date: string | null
          grant_id: string
          id: string
          justification: string | null
          motif: string | null
          num: number
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          date?: string | null
          grant_id: string
          id?: string
          justification?: string | null
          motif?: string | null
          num?: number
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          date?: string | null
          grant_id?: string
          id?: string
          justification?: string | null
          motif?: string | null
          num?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "grant_addendums_grant_id_fkey"
            columns: ["grant_id"]
            isOneToOne: false
            referencedRelation: "grants"
            referencedColumns: ["id"]
          },
        ]
      }
      grant_changes: {
        Row: {
          action: string
          changes: Json
          created_at: string
          grant_id: string
          id: string
          user_id: string | null
        }
        Insert: {
          action?: string
          changes?: Json
          created_at?: string
          grant_id: string
          id?: string
          user_id?: string | null
        }
        Update: {
          action?: string
          changes?: Json
          created_at?: string
          grant_id?: string
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "grant_changes_grant_id_fkey"
            columns: ["grant_id"]
            isOneToOne: false
            referencedRelation: "grants"
            referencedColumns: ["id"]
          },
        ]
      }
      grant_disbursements: {
        Row: {
          amount_approved: number | null
          amount_received: number | null
          amount_requested: number
          approved_at: string | null
          approved_by: string | null
          created_at: string
          grant_id: string
          id: string
          is_demo: boolean
          justification: string | null
          label: string
          notes: string | null
          received_at: string | null
          requested_at: string | null
          requested_by: string | null
          status: string
          tranche_number: number
          updated_at: string
        }
        Insert: {
          amount_approved?: number | null
          amount_received?: number | null
          amount_requested?: number
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          grant_id: string
          id?: string
          is_demo?: boolean
          justification?: string | null
          label: string
          notes?: string | null
          received_at?: string | null
          requested_at?: string | null
          requested_by?: string | null
          status?: string
          tranche_number?: number
          updated_at?: string
        }
        Update: {
          amount_approved?: number | null
          amount_received?: number | null
          amount_requested?: number
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          grant_id?: string
          id?: string
          is_demo?: boolean
          justification?: string | null
          label?: string
          notes?: string | null
          received_at?: string | null
          requested_at?: string | null
          requested_by?: string | null
          status?: string
          tranche_number?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "grant_disbursements_grant_id_fkey"
            columns: ["grant_id"]
            isOneToOne: false
            referencedRelation: "grants"
            referencedColumns: ["id"]
          },
        ]
      }
      grant_documents: {
        Row: {
          category: string
          created_at: string
          description: string | null
          file_name: string | null
          file_size: number | null
          file_url: string | null
          grant_id: string
          id: string
          title: string
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          file_name?: string | null
          file_size?: number | null
          file_url?: string | null
          grant_id: string
          id?: string
          title: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          file_name?: string | null
          file_size?: number | null
          file_url?: string | null
          grant_id?: string
          id?: string
          title?: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "grant_documents_grant_id_fkey"
            columns: ["grant_id"]
            isOneToOne: false
            referencedRelation: "grants"
            referencedColumns: ["id"]
          },
        ]
      }
      grant_indicators: {
        Row: {
          baseline_value: number | null
          category: string | null
          created_at: string
          current_value: number | null
          data_source: string | null
          frequency: string | null
          grant_id: string
          id: string
          is_demo: boolean
          name: string
          notes: string | null
          responsible: string | null
          target_value: number | null
          unit: string | null
          updated_at: string
        }
        Insert: {
          baseline_value?: number | null
          category?: string | null
          created_at?: string
          current_value?: number | null
          data_source?: string | null
          frequency?: string | null
          grant_id: string
          id?: string
          is_demo?: boolean
          name: string
          notes?: string | null
          responsible?: string | null
          target_value?: number | null
          unit?: string | null
          updated_at?: string
        }
        Update: {
          baseline_value?: number | null
          category?: string | null
          created_at?: string
          current_value?: number | null
          data_source?: string | null
          frequency?: string | null
          grant_id?: string
          id?: string
          is_demo?: boolean
          name?: string
          notes?: string | null
          responsible?: string | null
          target_value?: number | null
          unit?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "grant_indicators_grant_id_fkey"
            columns: ["grant_id"]
            isOneToOne: false
            referencedRelation: "grants"
            referencedColumns: ["id"]
          },
        ]
      }
      grant_reports: {
        Row: {
          amount_declared: number | null
          amount_received: number | null
          amount_validated: number | null
          created_at: string
          end_date: string | null
          forecast_q1: number | null
          forecast_q2: number | null
          forecast_q3: number | null
          forecast_year1: number | null
          forecast_year2: number | null
          forecast_year3: number | null
          grant_id: string
          id: string
          notes: string | null
          period_label: string
          period_type: string
          start_date: string | null
          status: string
          submitted_at: string | null
          submitted_by: string | null
          updated_at: string
          validated_at: string | null
          validated_by: string | null
        }
        Insert: {
          amount_declared?: number | null
          amount_received?: number | null
          amount_validated?: number | null
          created_at?: string
          end_date?: string | null
          forecast_q1?: number | null
          forecast_q2?: number | null
          forecast_q3?: number | null
          forecast_year1?: number | null
          forecast_year2?: number | null
          forecast_year3?: number | null
          grant_id: string
          id?: string
          notes?: string | null
          period_label: string
          period_type?: string
          start_date?: string | null
          status?: string
          submitted_at?: string | null
          submitted_by?: string | null
          updated_at?: string
          validated_at?: string | null
          validated_by?: string | null
        }
        Update: {
          amount_declared?: number | null
          amount_received?: number | null
          amount_validated?: number | null
          created_at?: string
          end_date?: string | null
          forecast_q1?: number | null
          forecast_q2?: number | null
          forecast_q3?: number | null
          forecast_year1?: number | null
          forecast_year2?: number | null
          forecast_year3?: number | null
          grant_id?: string
          id?: string
          notes?: string | null
          period_label?: string
          period_type?: string
          start_date?: string | null
          status?: string
          submitted_at?: string | null
          submitted_by?: string | null
          updated_at?: string
          validated_at?: string | null
          validated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "grant_reports_grant_id_fkey"
            columns: ["grant_id"]
            isOneToOne: false
            referencedRelation: "grants"
            referencedColumns: ["id"]
          },
        ]
      }
      grant_transactions: {
        Row: {
          amount: number
          amount_local: number | null
          approval_status: string
          approved_at: string | null
          approved_by: string | null
          budget_code: string | null
          category: string | null
          created_at: string
          created_by: string | null
          description: string | null
          exchange_rate: number | null
          grant_id: string
          id: string
          is_demo: boolean
          label: string
          nomenclature_code: string | null
          receipt_url: string | null
          reference: string | null
          report_id: string | null
          transaction_date: string
          updated_at: string
          vendor: string | null
        }
        Insert: {
          amount?: number
          amount_local?: number | null
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          budget_code?: string | null
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          exchange_rate?: number | null
          grant_id: string
          id?: string
          is_demo?: boolean
          label: string
          nomenclature_code?: string | null
          receipt_url?: string | null
          reference?: string | null
          report_id?: string | null
          transaction_date?: string
          updated_at?: string
          vendor?: string | null
        }
        Update: {
          amount?: number
          amount_local?: number | null
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          budget_code?: string | null
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          exchange_rate?: number | null
          grant_id?: string
          id?: string
          is_demo?: boolean
          label?: string
          nomenclature_code?: string | null
          receipt_url?: string | null
          reference?: string | null
          report_id?: string | null
          transaction_date?: string
          updated_at?: string
          vendor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "grant_transactions_grant_id_fkey"
            columns: ["grant_id"]
            isOneToOne: false
            referencedRelation: "grants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grant_transactions_nomenclature_code_fkey"
            columns: ["nomenclature_code"]
            isOneToOne: false
            referencedRelation: "budget_nomenclature"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "grant_transactions_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "grant_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      grants: {
        Row: {
          amount_disbursed: number | null
          amount_total: number
          code: string
          contribution_propre: number | null
          convention: string | null
          created_at: string
          currency: string | null
          description: string | null
          end_date: string | null
          frais_structure_pct: number | null
          id: string
          is_demo: boolean
          name: string
          org_type: string | null
          organization: string | null
          pays: string | null
          periodicite: string | null
          politique_change: string | null
          prepared_by: string | null
          program_id: string | null
          project_id: string | null
          risk_score: number | null
          start_date: string | null
          status: Database["public"]["Enums"]["grant_status"]
          submit_date: string | null
          taux_change: number | null
          updated_at: string
          version: string | null
        }
        Insert: {
          amount_disbursed?: number | null
          amount_total?: number
          code: string
          contribution_propre?: number | null
          convention?: string | null
          created_at?: string
          currency?: string | null
          description?: string | null
          end_date?: string | null
          frais_structure_pct?: number | null
          id?: string
          is_demo?: boolean
          name: string
          org_type?: string | null
          organization?: string | null
          pays?: string | null
          periodicite?: string | null
          politique_change?: string | null
          prepared_by?: string | null
          program_id?: string | null
          project_id?: string | null
          risk_score?: number | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["grant_status"]
          submit_date?: string | null
          taux_change?: number | null
          updated_at?: string
          version?: string | null
        }
        Update: {
          amount_disbursed?: number | null
          amount_total?: number
          code?: string
          contribution_propre?: number | null
          convention?: string | null
          created_at?: string
          currency?: string | null
          description?: string | null
          end_date?: string | null
          frais_structure_pct?: number | null
          id?: string
          is_demo?: boolean
          name?: string
          org_type?: string | null
          organization?: string | null
          pays?: string | null
          periodicite?: string | null
          politique_change?: string | null
          prepared_by?: string | null
          program_id?: string | null
          project_id?: string | null
          risk_score?: number | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["grant_status"]
          submit_date?: string | null
          taux_change?: number | null
          updated_at?: string
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "grants_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grants_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_collective_agreements: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          name: string
          sector: string | null
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          sector?: string | null
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          sector?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      hr_contracts: {
        Row: {
          contract_type: Database["public"]["Enums"]["hr_contract_type"]
          created_at: string
          document_url: string | null
          employee_id: string
          end_date: string | null
          fonction: string | null
          id: string
          is_active: boolean
          is_demo: boolean
          notes: string | null
          reference: string | null
          renewal_of: string | null
          salaire_base: number
          signed_at: string | null
          start_date: string
          sursalaire: number
          trial_end_date: string | null
          updated_at: string
        }
        Insert: {
          contract_type?: Database["public"]["Enums"]["hr_contract_type"]
          created_at?: string
          document_url?: string | null
          employee_id: string
          end_date?: string | null
          fonction?: string | null
          id?: string
          is_active?: boolean
          is_demo?: boolean
          notes?: string | null
          reference?: string | null
          renewal_of?: string | null
          salaire_base?: number
          signed_at?: string | null
          start_date: string
          sursalaire?: number
          trial_end_date?: string | null
          updated_at?: string
        }
        Update: {
          contract_type?: Database["public"]["Enums"]["hr_contract_type"]
          created_at?: string
          document_url?: string | null
          employee_id?: string
          end_date?: string | null
          fonction?: string | null
          id?: string
          is_active?: boolean
          is_demo?: boolean
          notes?: string | null
          reference?: string | null
          renewal_of?: string | null
          salaire_base?: number
          signed_at?: string | null
          start_date?: string
          sursalaire?: number
          trial_end_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hr_contracts_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "hr_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_contracts_renewal_of_fkey"
            columns: ["renewal_of"]
            isOneToOne: false
            referencedRelation: "hr_contract_alerts"
            referencedColumns: ["contract_id"]
          },
          {
            foreignKeyName: "hr_contracts_renewal_of_fkey"
            columns: ["renewal_of"]
            isOneToOne: false
            referencedRelation: "hr_contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_employees: {
        Row: {
          adresse: string | null
          archived_at: string | null
          avance_caisse: number | null
          avance_financiere: number | null
          avance_tabaski: number | null
          categorie: string | null
          contrat: string | null
          convention: string | null
          created_at: string
          created_by: string | null
          date_entree: string | null
          date_naissance: string | null
          default_project_id: string | null
          email: string | null
          enfants: number | null
          femmes: number | null
          fonction: string | null
          frais_medicaux: number | null
          heures_abs_maladie: number | null
          heures_absence: number | null
          hs_115: number | null
          hs_140: number | null
          hs_160: number | null
          hs_200: number | null
          id: string
          ind_kilometrique: number | null
          is_active: boolean | null
          is_anonymized: boolean
          is_demo: boolean
          lieu_naissance: string | null
          matricule: string
          nationalite: string | null
          nb_paniers: number | null
          nom: string
          prenom: string
          ret_cooperative: number | null
          salaire_base: number
          sexe: string
          situation_famille: string | null
          statut: string | null
          sursalaire: number | null
          taux_maladie: number | null
          telephone: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          adresse?: string | null
          archived_at?: string | null
          avance_caisse?: number | null
          avance_financiere?: number | null
          avance_tabaski?: number | null
          categorie?: string | null
          contrat?: string | null
          convention?: string | null
          created_at?: string
          created_by?: string | null
          date_entree?: string | null
          date_naissance?: string | null
          default_project_id?: string | null
          email?: string | null
          enfants?: number | null
          femmes?: number | null
          fonction?: string | null
          frais_medicaux?: number | null
          heures_abs_maladie?: number | null
          heures_absence?: number | null
          hs_115?: number | null
          hs_140?: number | null
          hs_160?: number | null
          hs_200?: number | null
          id?: string
          ind_kilometrique?: number | null
          is_active?: boolean | null
          is_anonymized?: boolean
          is_demo?: boolean
          lieu_naissance?: string | null
          matricule: string
          nationalite?: string | null
          nb_paniers?: number | null
          nom: string
          prenom: string
          ret_cooperative?: number | null
          salaire_base?: number
          sexe?: string
          situation_famille?: string | null
          statut?: string | null
          sursalaire?: number | null
          taux_maladie?: number | null
          telephone?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          adresse?: string | null
          archived_at?: string | null
          avance_caisse?: number | null
          avance_financiere?: number | null
          avance_tabaski?: number | null
          categorie?: string | null
          contrat?: string | null
          convention?: string | null
          created_at?: string
          created_by?: string | null
          date_entree?: string | null
          date_naissance?: string | null
          default_project_id?: string | null
          email?: string | null
          enfants?: number | null
          femmes?: number | null
          fonction?: string | null
          frais_medicaux?: number | null
          heures_abs_maladie?: number | null
          heures_absence?: number | null
          hs_115?: number | null
          hs_140?: number | null
          hs_160?: number | null
          hs_200?: number | null
          id?: string
          ind_kilometrique?: number | null
          is_active?: boolean | null
          is_anonymized?: boolean
          is_demo?: boolean
          lieu_naissance?: string | null
          matricule?: string
          nationalite?: string | null
          nb_paniers?: number | null
          nom?: string
          prenom?: string
          ret_cooperative?: number | null
          salaire_base?: number
          sexe?: string
          situation_famille?: string | null
          statut?: string | null
          sursalaire?: number | null
          taux_maladie?: number | null
          telephone?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hr_employees_default_project_id_fkey"
            columns: ["default_project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_expense_lines: {
        Row: {
          amount: number
          category: string
          created_at: string
          currency: string
          description: string
          expense_date: string
          id: string
          project_id: string | null
          receipt_url: string | null
          report_id: string
          sort_order: number | null
          tax_rate: number | null
        }
        Insert: {
          amount: number
          category: string
          created_at?: string
          currency?: string
          description: string
          expense_date: string
          id?: string
          project_id?: string | null
          receipt_url?: string | null
          report_id: string
          sort_order?: number | null
          tax_rate?: number | null
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          currency?: string
          description?: string
          expense_date?: string
          id?: string
          project_id?: string | null
          receipt_url?: string | null
          report_id?: string
          sort_order?: number | null
          tax_rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "hr_expense_lines_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_expense_lines_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "hr_expense_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_expense_reports: {
        Row: {
          created_at: string
          created_by: string | null
          currency: string
          employee_id: string
          id: string
          is_demo: boolean
          notes: string | null
          period_end: string
          period_start: string
          reference: string | null
          reimbursed_at: string | null
          reimbursement_annee: number | null
          reimbursement_mois: number | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          second_approval_requested_at: string | null
          second_approval_required: boolean
          second_reviewed_at: string | null
          second_reviewed_by: string | null
          status: Database["public"]["Enums"]["hr_expense_status"]
          submitted_at: string | null
          title: string
          total_amount: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          currency?: string
          employee_id: string
          id?: string
          is_demo?: boolean
          notes?: string | null
          period_end: string
          period_start: string
          reference?: string | null
          reimbursed_at?: string | null
          reimbursement_annee?: number | null
          reimbursement_mois?: number | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          second_approval_requested_at?: string | null
          second_approval_required?: boolean
          second_reviewed_at?: string | null
          second_reviewed_by?: string | null
          status?: Database["public"]["Enums"]["hr_expense_status"]
          submitted_at?: string | null
          title: string
          total_amount?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          currency?: string
          employee_id?: string
          id?: string
          is_demo?: boolean
          notes?: string | null
          period_end?: string
          period_start?: string
          reference?: string | null
          reimbursed_at?: string | null
          reimbursement_annee?: number | null
          reimbursement_mois?: number | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          second_approval_requested_at?: string | null
          second_approval_required?: boolean
          second_reviewed_at?: string | null
          second_reviewed_by?: string | null
          status?: Database["public"]["Enums"]["hr_expense_status"]
          submitted_at?: string | null
          title?: string
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hr_expense_reports_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "hr_employees"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_leave_balances: {
        Row: {
          annee: number
          carried_over: number
          created_at: string
          employee_id: string
          id: string
          initial_days: number
          leave_type: Database["public"]["Enums"]["hr_leave_type"]
          notes: string | null
          updated_at: string
          used_days: number
        }
        Insert: {
          annee: number
          carried_over?: number
          created_at?: string
          employee_id: string
          id?: string
          initial_days?: number
          leave_type?: Database["public"]["Enums"]["hr_leave_type"]
          notes?: string | null
          updated_at?: string
          used_days?: number
        }
        Update: {
          annee?: number
          carried_over?: number
          created_at?: string
          employee_id?: string
          id?: string
          initial_days?: number
          leave_type?: Database["public"]["Enums"]["hr_leave_type"]
          notes?: string | null
          updated_at?: string
          used_days?: number
        }
        Relationships: [
          {
            foreignKeyName: "hr_leave_balances_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "hr_employees"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_leave_requests: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          attachment_url: string | null
          created_at: string
          days_count: number
          employee_id: string
          end_date: string
          id: string
          is_demo: boolean
          leave_type: Database["public"]["Enums"]["hr_leave_type"]
          reason: string | null
          rejection_reason: string | null
          requested_by: string | null
          start_date: string
          status: Database["public"]["Enums"]["hr_leave_status"]
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          attachment_url?: string | null
          created_at?: string
          days_count?: number
          employee_id: string
          end_date: string
          id?: string
          is_demo?: boolean
          leave_type?: Database["public"]["Enums"]["hr_leave_type"]
          reason?: string | null
          rejection_reason?: string | null
          requested_by?: string | null
          start_date: string
          status?: Database["public"]["Enums"]["hr_leave_status"]
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          attachment_url?: string | null
          created_at?: string
          days_count?: number
          employee_id?: string
          end_date?: string
          id?: string
          is_demo?: boolean
          leave_type?: Database["public"]["Enums"]["hr_leave_type"]
          reason?: string | null
          rejection_reason?: string | null
          requested_by?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["hr_leave_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hr_leave_requests_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "hr_employees"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_payroll_history: {
        Row: {
          annee: number
          closed_by: string | null
          created_at: string
          id: string
          mois: number
          nb_employes: number | null
          total_brut: number | null
          total_charges: number | null
          total_masse: number | null
          total_net: number | null
        }
        Insert: {
          annee: number
          closed_by?: string | null
          created_at?: string
          id?: string
          mois: number
          nb_employes?: number | null
          total_brut?: number | null
          total_charges?: number | null
          total_masse?: number | null
          total_net?: number | null
        }
        Update: {
          annee?: number
          closed_by?: string | null
          created_at?: string
          id?: string
          mois?: number
          nb_employes?: number | null
          total_brut?: number | null
          total_charges?: number | null
          total_masse?: number | null
          total_net?: number | null
        }
        Relationships: []
      }
      hr_payroll_runs: {
        Row: {
          annee: number
          calculated_at: string | null
          closed_at: string | null
          closed_by: string | null
          created_at: string
          created_by: string | null
          id: string
          mois: number
          nb_employes: number
          settings_snapshot: Json
          status: Database["public"]["Enums"]["hr_payroll_run_status"]
          total_brut: number
          total_charges: number
          total_masse: number
          total_net: number
          updated_at: string
          validated_at: string | null
          validated_by: string | null
        }
        Insert: {
          annee: number
          calculated_at?: string | null
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          mois: number
          nb_employes?: number
          settings_snapshot?: Json
          status?: Database["public"]["Enums"]["hr_payroll_run_status"]
          total_brut?: number
          total_charges?: number
          total_masse?: number
          total_net?: number
          updated_at?: string
          validated_at?: string | null
          validated_by?: string | null
        }
        Update: {
          annee?: number
          calculated_at?: string | null
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          mois?: number
          nb_employes?: number
          settings_snapshot?: Json
          status?: Database["public"]["Enums"]["hr_payroll_run_status"]
          total_brut?: number
          total_charges?: number
          total_masse?: number
          total_net?: number
          updated_at?: string
          validated_at?: string | null
          validated_by?: string | null
        }
        Relationships: []
      }
      hr_payroll_settings: {
        Row: {
          created_at: string
          created_by: string | null
          effective_from: string
          effective_to: string | null
          id: string
          is_active: boolean
          name: string
          settings: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          effective_from?: string
          effective_to?: string | null
          id?: string
          is_active?: boolean
          name?: string
          settings?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          effective_from?: string
          effective_to?: string | null
          id?: string
          is_active?: boolean
          name?: string
          settings?: Json
          updated_at?: string
        }
        Relationships: []
      }
      hr_payroll_variables: {
        Row: {
          annee: number
          avance_caisse: number
          avance_financiere: number
          avance_tabaski: number
          created_at: string
          created_by: string | null
          employee_id: string
          frais_medicaux: number
          heures_abs_maladie: number
          heures_absence: number
          hs_115: number
          hs_140: number
          hs_160: number
          hs_200: number
          id: string
          ind_kilometrique: number
          mois: number
          nb_paniers: number
          notes: string | null
          primes_exceptionnelles: number
          ret_cooperative: number
          taux_maladie: number
          updated_at: string
          validated_at: string | null
          validated_by: string | null
        }
        Insert: {
          annee: number
          avance_caisse?: number
          avance_financiere?: number
          avance_tabaski?: number
          created_at?: string
          created_by?: string | null
          employee_id: string
          frais_medicaux?: number
          heures_abs_maladie?: number
          heures_absence?: number
          hs_115?: number
          hs_140?: number
          hs_160?: number
          hs_200?: number
          id?: string
          ind_kilometrique?: number
          mois: number
          nb_paniers?: number
          notes?: string | null
          primes_exceptionnelles?: number
          ret_cooperative?: number
          taux_maladie?: number
          updated_at?: string
          validated_at?: string | null
          validated_by?: string | null
        }
        Update: {
          annee?: number
          avance_caisse?: number
          avance_financiere?: number
          avance_tabaski?: number
          created_at?: string
          created_by?: string | null
          employee_id?: string
          frais_medicaux?: number
          heures_abs_maladie?: number
          heures_absence?: number
          hs_115?: number
          hs_140?: number
          hs_160?: number
          hs_200?: number
          id?: string
          ind_kilometrique?: number
          mois?: number
          nb_paniers?: number
          notes?: string | null
          primes_exceptionnelles?: number
          ret_cooperative?: number
          taux_maladie?: number
          updated_at?: string
          validated_at?: string | null
          validated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hr_payroll_variables_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "hr_employees"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_payslips: {
        Row: {
          annee: number
          calculation_snapshot: Json
          created_at: string
          created_by: string | null
          employee_id: string
          employee_snapshot: Json
          employer_charges: number
          gross_total: number
          id: string
          is_demo: boolean
          issued_at: string
          mois: number
          net_total: number
          payroll_run_id: string
          pdf_url: string | null
          project_id: string | null
          reference: string
          updated_at: string
          variables_snapshot: Json
        }
        Insert: {
          annee: number
          calculation_snapshot?: Json
          created_at?: string
          created_by?: string | null
          employee_id: string
          employee_snapshot?: Json
          employer_charges?: number
          gross_total?: number
          id?: string
          is_demo?: boolean
          issued_at?: string
          mois: number
          net_total?: number
          payroll_run_id: string
          pdf_url?: string | null
          project_id?: string | null
          reference: string
          updated_at?: string
          variables_snapshot?: Json
        }
        Update: {
          annee?: number
          calculation_snapshot?: Json
          created_at?: string
          created_by?: string | null
          employee_id?: string
          employee_snapshot?: Json
          employer_charges?: number
          gross_total?: number
          id?: string
          is_demo?: boolean
          issued_at?: string
          mois?: number
          net_total?: number
          payroll_run_id?: string
          pdf_url?: string | null
          project_id?: string | null
          reference?: string
          updated_at?: string
          variables_snapshot?: Json
        }
        Relationships: [
          {
            foreignKeyName: "hr_payslips_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "hr_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_payslips_payroll_run_id_fkey"
            columns: ["payroll_run_id"]
            isOneToOne: false
            referencedRelation: "hr_payroll_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_payslips_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_reminder_log: {
        Row: {
          employee_id: string
          id: string
          metadata: Json | null
          reference_date: string
          reminder_type: string
          sent_at: string
        }
        Insert: {
          employee_id: string
          id?: string
          metadata?: Json | null
          reference_date: string
          reminder_type: string
          sent_at?: string
        }
        Update: {
          employee_id?: string
          id?: string
          metadata?: Json | null
          reference_date?: string
          reminder_type?: string
          sent_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hr_reminder_log_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "hr_employees"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_salary_categories: {
        Row: {
          agreement_id: string | null
          code: string
          created_at: string
          created_by: string | null
          currency: string
          id: string
          is_active: boolean
          label: string
          minimum_salary: number
          updated_at: string
        }
        Insert: {
          agreement_id?: string | null
          code: string
          created_at?: string
          created_by?: string | null
          currency?: string
          id?: string
          is_active?: boolean
          label: string
          minimum_salary?: number
          updated_at?: string
        }
        Update: {
          agreement_id?: string | null
          code?: string
          created_at?: string
          created_by?: string | null
          currency?: string
          id?: string
          is_active?: boolean
          label?: string
          minimum_salary?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hr_salary_categories_agreement_id_fkey"
            columns: ["agreement_id"]
            isOneToOne: false
            referencedRelation: "hr_collective_agreements"
            referencedColumns: ["id"]
          },
        ]
      }
      impact_indicators: {
        Row: {
          actual_value: number | null
          created_at: string
          created_by: string | null
          id: string
          indicator_name: string
          notes: string | null
          period_end: string | null
          period_start: string | null
          program_id: string | null
          project_id: string | null
          sdg_number: number
          target_value: number | null
          unit: string | null
          updated_at: string
        }
        Insert: {
          actual_value?: number | null
          created_at?: string
          created_by?: string | null
          id?: string
          indicator_name: string
          notes?: string | null
          period_end?: string | null
          period_start?: string | null
          program_id?: string | null
          project_id?: string | null
          sdg_number: number
          target_value?: number | null
          unit?: string | null
          updated_at?: string
        }
        Update: {
          actual_value?: number | null
          created_at?: string
          created_by?: string | null
          id?: string
          indicator_name?: string
          notes?: string | null
          period_end?: string | null
          period_start?: string | null
          program_id?: string | null
          project_id?: string | null
          sdg_number?: number
          target_value?: number | null
          unit?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "impact_indicators_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "impact_indicators_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      import_logs: {
        Row: {
          created_at: string
          error_rows: number
          errors: Json | null
          file_name: string
          id: string
          import_type: string
          imported_by: string | null
          mapping: Json | null
          status: string
          success_rows: number
          total_rows: number
        }
        Insert: {
          created_at?: string
          error_rows?: number
          errors?: Json | null
          file_name: string
          id?: string
          import_type: string
          imported_by?: string | null
          mapping?: Json | null
          status?: string
          success_rows?: number
          total_rows?: number
        }
        Update: {
          created_at?: string
          error_rows?: number
          errors?: Json | null
          file_name?: string
          id?: string
          import_type?: string
          imported_by?: string | null
          mapping?: Json | null
          status?: string
          success_rows?: number
          total_rows?: number
        }
        Relationships: []
      }
      invitation_reminders: {
        Row: {
          id: string
          invitation_id: string
          reminder_type: string
          sent_at: string
          sent_by: string
        }
        Insert: {
          id?: string
          invitation_id: string
          reminder_type?: string
          sent_at?: string
          sent_by: string
        }
        Update: {
          id?: string
          invitation_id?: string
          reminder_type?: string
          sent_at?: string
          sent_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "invitation_reminders_invitation_id_fkey"
            columns: ["invitation_id"]
            isOneToOne: false
            referencedRelation: "invitations"
            referencedColumns: ["id"]
          },
        ]
      }
      invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          role: Database["public"]["Enums"]["app_role"]
          status: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by: string
          role?: Database["public"]["Enums"]["app_role"]
          status?: string
          token?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          role?: Database["public"]["Enums"]["app_role"]
          status?: string
          token?: string
        }
        Relationships: []
      }
      invoice_reminders: {
        Row: {
          channel: string
          created_at: string
          id: string
          invoice_id: string
          message: string | null
          metadata: Json | null
          recipient_email: string | null
          reminder_type: string
          sent_at: string
          sent_by: string | null
          subject: string | null
        }
        Insert: {
          channel?: string
          created_at?: string
          id?: string
          invoice_id: string
          message?: string | null
          metadata?: Json | null
          recipient_email?: string | null
          reminder_type?: string
          sent_at?: string
          sent_by?: string | null
          subject?: string | null
        }
        Update: {
          channel?: string
          created_at?: string
          id?: string
          invoice_id?: string
          message?: string | null
          metadata?: Json | null
          recipient_email?: string | null
          reminder_type?: string
          sent_at?: string
          sent_by?: string | null
          subject?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoice_reminders_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "crm_invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      logical_frameworks: {
        Row: {
          activities: Json | null
          assumptions: string | null
          created_at: string
          expected_results: Json | null
          id: string
          is_demo: boolean
          overall_objective: string | null
          pre_conditions: string | null
          project_id: string
          specific_objectives: Json | null
          updated_at: string
        }
        Insert: {
          activities?: Json | null
          assumptions?: string | null
          created_at?: string
          expected_results?: Json | null
          id?: string
          is_demo?: boolean
          overall_objective?: string | null
          pre_conditions?: string | null
          project_id: string
          specific_objectives?: Json | null
          updated_at?: string
        }
        Update: {
          activities?: Json | null
          assumptions?: string | null
          created_at?: string
          expected_results?: Json | null
          id?: string
          is_demo?: boolean
          overall_objective?: string | null
          pre_conditions?: string | null
          project_id?: string
          specific_objectives?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "logical_frameworks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      me_measurements: {
        Row: {
          created_at: string
          created_by: string | null
          evidence_doc_url: string | null
          grant_id: string | null
          grant_indicator_id: string | null
          id: string
          measured_at: string
          measured_value: number
          methodology: string | null
          notes: string | null
          phase: Database["public"]["Enums"]["me_phase"]
          project_id: string | null
          project_indicator_id: string | null
          sample_size: number | null
          updated_at: string
          validated_at: string | null
          validated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          evidence_doc_url?: string | null
          grant_id?: string | null
          grant_indicator_id?: string | null
          id?: string
          measured_at?: string
          measured_value: number
          methodology?: string | null
          notes?: string | null
          phase?: Database["public"]["Enums"]["me_phase"]
          project_id?: string | null
          project_indicator_id?: string | null
          sample_size?: number | null
          updated_at?: string
          validated_at?: string | null
          validated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          evidence_doc_url?: string | null
          grant_id?: string | null
          grant_indicator_id?: string | null
          id?: string
          measured_at?: string
          measured_value?: number
          methodology?: string | null
          notes?: string | null
          phase?: Database["public"]["Enums"]["me_phase"]
          project_id?: string | null
          project_indicator_id?: string | null
          sample_size?: number | null
          updated_at?: string
          validated_at?: string | null
          validated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "me_measurements_grant_id_fkey"
            columns: ["grant_id"]
            isOneToOne: false
            referencedRelation: "grants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "me_measurements_grant_indicator_id_fkey"
            columns: ["grant_indicator_id"]
            isOneToOne: false
            referencedRelation: "grant_indicators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "me_measurements_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "me_measurements_project_indicator_id_fkey"
            columns: ["project_indicator_id"]
            isOneToOne: false
            referencedRelation: "project_indicators"
            referencedColumns: ["id"]
          },
        ]
      }
      me_monitoring_plans: {
        Row: {
          collection_frequency: string
          collection_method: string | null
          created_at: string
          created_by: string | null
          data_source: string
          disaggregation: Json | null
          grant_id: string | null
          grant_indicator_id: string | null
          id: string
          next_measurement_due: string | null
          notes: string | null
          project_id: string | null
          project_indicator_id: string | null
          quality_assurance: string | null
          responsible_user_id: string | null
          target_phases: Json
          updated_at: string
        }
        Insert: {
          collection_frequency?: string
          collection_method?: string | null
          created_at?: string
          created_by?: string | null
          data_source: string
          disaggregation?: Json | null
          grant_id?: string | null
          grant_indicator_id?: string | null
          id?: string
          next_measurement_due?: string | null
          notes?: string | null
          project_id?: string | null
          project_indicator_id?: string | null
          quality_assurance?: string | null
          responsible_user_id?: string | null
          target_phases?: Json
          updated_at?: string
        }
        Update: {
          collection_frequency?: string
          collection_method?: string | null
          created_at?: string
          created_by?: string | null
          data_source?: string
          disaggregation?: Json | null
          grant_id?: string | null
          grant_indicator_id?: string | null
          id?: string
          next_measurement_due?: string | null
          notes?: string | null
          project_id?: string | null
          project_indicator_id?: string | null
          quality_assurance?: string | null
          responsible_user_id?: string | null
          target_phases?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "me_monitoring_plans_grant_id_fkey"
            columns: ["grant_id"]
            isOneToOne: false
            referencedRelation: "grants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "me_monitoring_plans_grant_indicator_id_fkey"
            columns: ["grant_indicator_id"]
            isOneToOne: false
            referencedRelation: "grant_indicators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "me_monitoring_plans_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "me_monitoring_plans_project_indicator_id_fkey"
            columns: ["project_indicator_id"]
            isOneToOne: false
            referencedRelation: "project_indicators"
            referencedColumns: ["id"]
          },
        ]
      }
      mentor_availability_slots: {
        Row: {
          booked_at: string | null
          booked_by: string | null
          created_at: string
          end_at: string
          id: string
          is_booked: boolean
          mentor_id: string
          notes: string | null
          recurrence: string | null
          session_id: string | null
          start_at: string
          updated_at: string
        }
        Insert: {
          booked_at?: string | null
          booked_by?: string | null
          created_at?: string
          end_at: string
          id?: string
          is_booked?: boolean
          mentor_id: string
          notes?: string | null
          recurrence?: string | null
          session_id?: string | null
          start_at: string
          updated_at?: string
        }
        Update: {
          booked_at?: string | null
          booked_by?: string | null
          created_at?: string
          end_at?: string
          id?: string
          is_booked?: boolean
          mentor_id?: string
          notes?: string | null
          recurrence?: string | null
          session_id?: string | null
          start_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mentor_availability_slots_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "coaching_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      mentor_blacklists: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          mentor_id: string
          reason: string | null
          startup_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          mentor_id: string
          reason?: string | null
          startup_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          mentor_id?: string
          reason?: string | null
          startup_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mentor_blacklists_mentor_id_fkey"
            columns: ["mentor_id"]
            isOneToOne: false
            referencedRelation: "mentor_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentor_blacklists_startup_id_fkey"
            columns: ["startup_id"]
            isOneToOne: false
            referencedRelation: "startups"
            referencedColumns: ["id"]
          },
        ]
      }
      mentor_matches: {
        Row: {
          id: string
          match_score: number | null
          matched_at: string
          mentor_id: string
          rejected_at: string | null
          rejection_reason: string | null
          startup_id: string
          status: string | null
        }
        Insert: {
          id?: string
          match_score?: number | null
          matched_at?: string
          mentor_id: string
          rejected_at?: string | null
          rejection_reason?: string | null
          startup_id: string
          status?: string | null
        }
        Update: {
          id?: string
          match_score?: number | null
          matched_at?: string
          mentor_id?: string
          rejected_at?: string | null
          rejection_reason?: string | null
          startup_id?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mentor_matches_startup_id_fkey"
            columns: ["startup_id"]
            isOneToOne: false
            referencedRelation: "startups"
            referencedColumns: ["id"]
          },
        ]
      }
      mentor_profiles: {
        Row: {
          availability: string | null
          average_rating: number | null
          bio: string | null
          created_at: string
          expertise_areas: string[] | null
          hourly_rate: number | null
          id: string
          is_demo: boolean
          linkedin_url: string | null
          max_startups: number | null
          total_sessions: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          availability?: string | null
          average_rating?: number | null
          bio?: string | null
          created_at?: string
          expertise_areas?: string[] | null
          hourly_rate?: number | null
          id?: string
          is_demo?: boolean
          linkedin_url?: string | null
          max_startups?: number | null
          total_sessions?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          availability?: string | null
          average_rating?: number | null
          bio?: string | null
          created_at?: string
          expertise_areas?: string[] | null
          hourly_rate?: number | null
          id?: string
          is_demo?: boolean
          linkedin_url?: string | null
          max_startups?: number | null
          total_sessions?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      message_attachments: {
        Row: {
          created_at: string
          file_name: string
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
          message_id: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          message_id: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          message_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_attachments_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "channel_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      message_mentions: {
        Row: {
          created_at: string
          id: string
          message_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_mentions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "channel_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      message_reactions: {
        Row: {
          created_at: string
          emoji: string
          id: string
          message_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji: string
          id?: string
          message_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          message_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "channel_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          read_at: string | null
          sender_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      milestones: {
        Row: {
          completed_at: string | null
          created_at: string
          depends_on: string | null
          description: string | null
          due_date: string | null
          id: string
          is_demo: boolean
          project_id: string
          status: string | null
          title: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          depends_on?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          is_demo?: boolean
          project_id: string
          status?: string | null
          title: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          depends_on?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          is_demo?: boolean
          project_id?: string
          status?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "milestones_depends_on_fkey"
            columns: ["depends_on"]
            isOneToOne: false
            referencedRelation: "milestones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "milestones_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          created_at: string
          id: string
          preferences: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          preferences?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          preferences?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          content: string | null
          created_at: string
          id: string
          is_read: boolean | null
          link: string | null
          title: string
          type: string | null
          user_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          id?: string
          is_read?: boolean | null
          link?: string | null
          title: string
          type?: string | null
          user_id: string
        }
        Update: {
          content?: string | null
          created_at?: string
          id?: string
          is_read?: boolean | null
          link?: string | null
          title?: string
          type?: string | null
          user_id?: string
        }
        Relationships: []
      }
      org_settings: {
        Row: {
          address: string | null
          approval_threshold_xof: number | null
          bank_details: string | null
          brand_accent_hex: string | null
          brand_primary_hex: string | null
          city: string | null
          company_name: string
          country: string | null
          created_at: string
          default_currency: string | null
          default_payment_terms: string | null
          default_po_terms: string | null
          default_quote_terms: string | null
          default_tax_rate: number | null
          email: string | null
          id: string
          is_active: boolean | null
          legal_form: string | null
          legal_mentions: string | null
          logo_url: string | null
          ninea: string | null
          pdf_footer: string | null
          phone: string | null
          postal_box: string | null
          rccm: string | null
          signatory_city: string | null
          signatory_name: string | null
          signatory_role: string | null
          stamp_url: string | null
          tax_id: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          address?: string | null
          approval_threshold_xof?: number | null
          bank_details?: string | null
          brand_accent_hex?: string | null
          brand_primary_hex?: string | null
          city?: string | null
          company_name?: string
          country?: string | null
          created_at?: string
          default_currency?: string | null
          default_payment_terms?: string | null
          default_po_terms?: string | null
          default_quote_terms?: string | null
          default_tax_rate?: number | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          legal_form?: string | null
          legal_mentions?: string | null
          logo_url?: string | null
          ninea?: string | null
          pdf_footer?: string | null
          phone?: string | null
          postal_box?: string | null
          rccm?: string | null
          signatory_city?: string | null
          signatory_name?: string | null
          signatory_role?: string | null
          stamp_url?: string | null
          tax_id?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          approval_threshold_xof?: number | null
          bank_details?: string | null
          brand_accent_hex?: string | null
          brand_primary_hex?: string | null
          city?: string | null
          company_name?: string
          country?: string | null
          created_at?: string
          default_currency?: string | null
          default_payment_terms?: string | null
          default_po_terms?: string | null
          default_quote_terms?: string | null
          default_tax_rate?: number | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          legal_form?: string | null
          legal_mentions?: string | null
          logo_url?: string | null
          ninea?: string | null
          pdf_footer?: string | null
          phone?: string | null
          postal_box?: string | null
          rccm?: string | null
          signatory_city?: string | null
          signatory_name?: string | null
          signatory_role?: string | null
          stamp_url?: string | null
          tax_id?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      partner_outreach: {
        Row: {
          category: string | null
          channel: string | null
          contact_info: string | null
          contact_person: string | null
          created_at: string
          documents: string | null
          followup_date: string | null
          id: string
          institution: string
          letter_ref: string | null
          next_step: string | null
          num: number | null
          partnership_type: string | null
          priority: string | null
          project_id: string
          response_date: string | null
          sent_date: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          channel?: string | null
          contact_info?: string | null
          contact_person?: string | null
          created_at?: string
          documents?: string | null
          followup_date?: string | null
          id?: string
          institution: string
          letter_ref?: string | null
          next_step?: string | null
          num?: number | null
          partnership_type?: string | null
          priority?: string | null
          project_id: string
          response_date?: string | null
          sent_date?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          channel?: string | null
          contact_info?: string | null
          contact_person?: string | null
          created_at?: string
          documents?: string | null
          followup_date?: string | null
          id?: string
          institution?: string
          letter_ref?: string | null
          next_step?: string | null
          num?: number | null
          partnership_type?: string | null
          priority?: string | null
          project_id?: string
          response_date?: string | null
          sent_date?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_outreach_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      partners: {
        Row: {
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          country: string | null
          created_at: string
          description: string | null
          id: string
          is_demo: boolean
          name: string
          program_id: string | null
          sector: string | null
          status: string
          type: string
          updated_at: string
          website: string | null
        }
        Insert: {
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_demo?: boolean
          name: string
          program_id?: string | null
          sector?: string | null
          status?: string
          type?: string
          updated_at?: string
          website?: string | null
        }
        Update: {
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_demo?: boolean
          name?: string
          program_id?: string | null
          sector?: string | null
          status?: string
          type?: string
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partners_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      pii_access_log: {
        Row: {
          accessed_at: string
          accessed_entity_id: string | null
          accessed_entity_type: string
          accessed_fields: string[]
          id: string
          ip_address: string | null
          purpose: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          accessed_at?: string
          accessed_entity_id?: string | null
          accessed_entity_type: string
          accessed_fields?: string[]
          id?: string
          ip_address?: string | null
          purpose?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          accessed_at?: string
          accessed_entity_id?: string | null
          accessed_entity_type?: string
          accessed_fields?: string[]
          id?: string
          ip_address?: string | null
          purpose?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      pinned_messages: {
        Row: {
          channel_id: string
          created_at: string
          id: string
          message_id: string
          pinned_by: string
        }
        Insert: {
          channel_id: string
          created_at?: string
          id?: string
          message_id: string
          pinned_by: string
        }
        Update: {
          channel_id?: string
          created_at?: string
          id?: string
          message_id?: string
          pinned_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "pinned_messages_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pinned_messages_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: true
            referencedRelation: "channel_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      pmo_decisions: {
        Row: {
          created_at: string
          created_by: string | null
          decision: string | null
          decision_date: string
          follow_up: string | null
          id: string
          impact: string | null
          project_id: string
          reference: string | null
          status: string
          subject: string
          taken_by: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          decision?: string | null
          decision_date?: string
          follow_up?: string | null
          id?: string
          impact?: string | null
          project_id: string
          reference?: string | null
          status?: string
          subject: string
          taken_by?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          decision?: string | null
          decision_date?: string
          follow_up?: string | null
          id?: string
          impact?: string | null
          project_id?: string
          reference?: string | null
          status?: string
          subject?: string
          taken_by?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pmo_decisions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      pmo_meetings: {
        Row: {
          agenda: string | null
          attendees: string | null
          created_at: string
          frequency: string | null
          id: string
          location: string | null
          meeting_type: string
          minutes: string | null
          project_id: string
          scheduled_at: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          agenda?: string | null
          attendees?: string | null
          created_at?: string
          frequency?: string | null
          id?: string
          location?: string | null
          meeting_type?: string
          minutes?: string | null
          project_id: string
          scheduled_at?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          agenda?: string | null
          attendees?: string | null
          created_at?: string
          frequency?: string | null
          id?: string
          location?: string | null
          meeting_type?: string
          minutes?: string | null
          project_id?: string
          scheduled_at?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pmo_meetings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      pmo_members: {
        Row: {
          created_at: string
          email: string | null
          full_name: string
          id: string
          is_steering_committee: boolean
          organization: string | null
          phone: string | null
          project_id: string
          reports_to: string | null
          responsibilities: string | null
          role_title: string
          sort_order: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          is_steering_committee?: boolean
          organization?: string | null
          phone?: string | null
          project_id: string
          reports_to?: string | null
          responsibilities?: string | null
          role_title: string
          sort_order?: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          is_steering_committee?: boolean
          organization?: string | null
          phone?: string | null
          project_id?: string
          reports_to?: string | null
          responsibilities?: string | null
          role_title?: string
          sort_order?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pmo_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      pmo_raci: {
        Row: {
          activity: string
          created_at: string
          id: string
          project_id: string
          raci: string
          role_title: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          activity: string
          created_at?: string
          id?: string
          project_id: string
          raci?: string
          role_title: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          activity?: string
          created_at?: string
          id?: string
          project_id?: string
          raci?: string
          role_title?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pmo_raci_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      pmo_report_schedule: {
        Row: {
          created_at: string
          due_date: string | null
          id: string
          owner_role: string | null
          period_label: string | null
          project_id: string
          report_type: string
          sort_order: number
          status: string
          submitted_at: string | null
          template_key: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          due_date?: string | null
          id?: string
          owner_role?: string | null
          period_label?: string | null
          project_id: string
          report_type?: string
          sort_order?: number
          status?: string
          submitted_at?: string | null
          template_key?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          due_date?: string | null
          id?: string
          owner_role?: string | null
          period_label?: string | null
          project_id?: string
          report_type?: string
          sort_order?: number
          status?: string
          submitted_at?: string | null
          template_key?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pmo_report_schedule_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      pmo_stakeholders: {
        Row: {
          category: string
          contact: string | null
          created_at: string
          engagement_strategy: string | null
          id: string
          influence: string
          interest: string
          name: string
          organization: string | null
          project_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          category?: string
          contact?: string | null
          created_at?: string
          engagement_strategy?: string | null
          id?: string
          influence?: string
          interest?: string
          name: string
          organization?: string | null
          project_id: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          category?: string
          contact?: string | null
          created_at?: string
          engagement_strategy?: string | null
          id?: string
          influence?: string
          interest?: string
          name?: string
          organization?: string | null
          project_id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pmo_stakeholders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolios: {
        Row: {
          code: string
          created_at: string
          description: string | null
          end_date: string | null
          id: string
          is_demo: boolean
          name: string
          objectives: string | null
          owner_id: string | null
          start_date: string | null
          status: Database["public"]["Enums"]["project_status"]
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          is_demo?: boolean
          name: string
          objectives?: string | null
          owner_id?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          is_demo?: boolean
          name?: string
          objectives?: string | null
          owner_id?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          department: string | null
          email: string | null
          full_name: string
          id: string
          is_anonymized: boolean
          is_approved: boolean
          is_suspended: boolean
          job_title: string | null
          language_pref: string | null
          last_active_at: string | null
          linkedin_url: string | null
          onboarding_completed_at: string | null
          onboarding_persona: string | null
          onboarding_steps_done: Json
          organization: string | null
          phone: string | null
          position: string | null
          reports_to_id: string | null
          suspended_at: string | null
          suspension_reason: string | null
          timezone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          department?: string | null
          email?: string | null
          full_name?: string
          id?: string
          is_anonymized?: boolean
          is_approved?: boolean
          is_suspended?: boolean
          job_title?: string | null
          language_pref?: string | null
          last_active_at?: string | null
          linkedin_url?: string | null
          onboarding_completed_at?: string | null
          onboarding_persona?: string | null
          onboarding_steps_done?: Json
          organization?: string | null
          phone?: string | null
          position?: string | null
          reports_to_id?: string | null
          suspended_at?: string | null
          suspension_reason?: string | null
          timezone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          department?: string | null
          email?: string | null
          full_name?: string
          id?: string
          is_anonymized?: boolean
          is_approved?: boolean
          is_suspended?: boolean
          job_title?: string | null
          language_pref?: string | null
          last_active_at?: string | null
          linkedin_url?: string | null
          onboarding_completed_at?: string | null
          onboarding_persona?: string | null
          onboarding_steps_done?: Json
          organization?: string | null
          phone?: string | null
          position?: string | null
          reports_to_id?: string | null
          suspended_at?: string | null
          suspension_reason?: string | null
          timezone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_reports_to_id_fkey"
            columns: ["reports_to_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "profiles_reports_to_id_fkey"
            columns: ["reports_to_id"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["user_id"]
          },
        ]
      }
      programs: {
        Row: {
          budget_total: number | null
          code: string
          coordinator_id: string | null
          created_at: string
          currency: string | null
          description: string | null
          end_date: string | null
          funder: string | null
          id: string
          is_demo: boolean
          name: string
          portfolio_id: string | null
          project_count: number | null
          start_date: string | null
          status: Database["public"]["Enums"]["project_status"]
          total_budget: number | null
          updated_at: string
        }
        Insert: {
          budget_total?: number | null
          code: string
          coordinator_id?: string | null
          created_at?: string
          currency?: string | null
          description?: string | null
          end_date?: string | null
          funder?: string | null
          id?: string
          is_demo?: boolean
          name: string
          portfolio_id?: string | null
          project_count?: number | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          total_budget?: number | null
          updated_at?: string
        }
        Update: {
          budget_total?: number | null
          code?: string
          coordinator_id?: string | null
          created_at?: string
          currency?: string | null
          description?: string | null
          end_date?: string | null
          funder?: string | null
          id?: string
          is_demo?: boolean
          name?: string
          portfolio_id?: string | null
          project_count?: number | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          total_budget?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "programs_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: false
            referencedRelation: "portfolios"
            referencedColumns: ["id"]
          },
        ]
      }
      project_activities: {
        Row: {
          code: string | null
          created_at: string
          end_date: string | null
          end_period: string | null
          id: string
          objective: string | null
          project_id: string
          start_date: string | null
          start_period: string | null
          title: string
          updated_at: string
          work_package: string | null
        }
        Insert: {
          code?: string | null
          created_at?: string
          end_date?: string | null
          end_period?: string | null
          id?: string
          objective?: string | null
          project_id: string
          start_date?: string | null
          start_period?: string | null
          title: string
          updated_at?: string
          work_package?: string | null
        }
        Update: {
          code?: string | null
          created_at?: string
          end_date?: string | null
          end_period?: string | null
          id?: string
          objective?: string | null
          project_id?: string
          start_date?: string | null
          start_period?: string | null
          title?: string
          updated_at?: string
          work_package?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_activities_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_budget_assumptions: {
        Row: {
          created_at: string
          detail: string | null
          id: string
          label: string
          note: string | null
          numeric_value: number | null
          project_id: string
          section: string
          sort_order: number | null
          updated_at: string
          value: string | null
        }
        Insert: {
          created_at?: string
          detail?: string | null
          id?: string
          label: string
          note?: string | null
          numeric_value?: number | null
          project_id: string
          section?: string
          sort_order?: number | null
          updated_at?: string
          value?: string | null
        }
        Update: {
          created_at?: string
          detail?: string | null
          id?: string
          label?: string
          note?: string | null
          numeric_value?: number | null
          project_id?: string
          section?: string
          sort_order?: number | null
          updated_at?: string
          value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_budget_assumptions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_budget_details: {
        Row: {
          activity: string
          category: string | null
          code: string
          created_at: string
          id: string
          is_demo: boolean
          nomenclature_code: string | null
          project_id: string
          quantity: number | null
          sort_order: number | null
          total: number | null
          unit: string | null
          unit_cost: number | null
          updated_at: string
          work_package: string
          year_1: number | null
          year_2: number | null
          year_3: number | null
          year_4: number | null
          year_5: number | null
        }
        Insert: {
          activity: string
          category?: string | null
          code: string
          created_at?: string
          id?: string
          is_demo?: boolean
          nomenclature_code?: string | null
          project_id: string
          quantity?: number | null
          sort_order?: number | null
          total?: number | null
          unit?: string | null
          unit_cost?: number | null
          updated_at?: string
          work_package: string
          year_1?: number | null
          year_2?: number | null
          year_3?: number | null
          year_4?: number | null
          year_5?: number | null
        }
        Update: {
          activity?: string
          category?: string | null
          code?: string
          created_at?: string
          id?: string
          is_demo?: boolean
          nomenclature_code?: string | null
          project_id?: string
          quantity?: number | null
          sort_order?: number | null
          total?: number | null
          unit?: string | null
          unit_cost?: number | null
          updated_at?: string
          work_package?: string
          year_1?: number | null
          year_2?: number | null
          year_3?: number | null
          year_4?: number | null
          year_5?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "project_budget_details_nomenclature_code_fkey"
            columns: ["nomenclature_code"]
            isOneToOne: false
            referencedRelation: "budget_nomenclature"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "project_budget_details_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_budget_lines: {
        Row: {
          allocation_pct: number | null
          budget_category: string | null
          category: string
          code: string | null
          created_at: string
          description: string | null
          funding_source: string | null
          id: string
          is_demo: boolean
          label: string
          marker_climate: string | null
          marker_gender: string | null
          notes: string | null
          project_id: string
          quantity: number | null
          section: string | null
          total_cost: number | null
          unit: string | null
          unit_cost: number | null
          updated_at: string
          year1: number | null
          year2: number | null
          year3: number | null
          year4: number | null
          year5: number | null
        }
        Insert: {
          allocation_pct?: number | null
          budget_category?: string | null
          category: string
          code?: string | null
          created_at?: string
          description?: string | null
          funding_source?: string | null
          id?: string
          is_demo?: boolean
          label: string
          marker_climate?: string | null
          marker_gender?: string | null
          notes?: string | null
          project_id: string
          quantity?: number | null
          section?: string | null
          total_cost?: number | null
          unit?: string | null
          unit_cost?: number | null
          updated_at?: string
          year1?: number | null
          year2?: number | null
          year3?: number | null
          year4?: number | null
          year5?: number | null
        }
        Update: {
          allocation_pct?: number | null
          budget_category?: string | null
          category?: string
          code?: string | null
          created_at?: string
          description?: string | null
          funding_source?: string | null
          id?: string
          is_demo?: boolean
          label?: string
          marker_climate?: string | null
          marker_gender?: string | null
          notes?: string | null
          project_id?: string
          quantity?: number | null
          section?: string | null
          total_cost?: number | null
          unit?: string | null
          unit_cost?: number | null
          updated_at?: string
          year1?: number | null
          year2?: number | null
          year3?: number | null
          year4?: number | null
          year5?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "project_budget_lines_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_indicators: {
        Row: {
          baseline_value: number | null
          category: string | null
          created_at: string
          current_value: number | null
          data_source: string | null
          frequency: string | null
          id: string
          is_demo: boolean
          metadata: Json | null
          name: string
          project_id: string
          responsible: string | null
          target_value: number | null
          unit: string | null
          updated_at: string
        }
        Insert: {
          baseline_value?: number | null
          category?: string | null
          created_at?: string
          current_value?: number | null
          data_source?: string | null
          frequency?: string | null
          id?: string
          is_demo?: boolean
          metadata?: Json | null
          name: string
          project_id: string
          responsible?: string | null
          target_value?: number | null
          unit?: string | null
          updated_at?: string
        }
        Update: {
          baseline_value?: number | null
          category?: string | null
          created_at?: string
          current_value?: number | null
          data_source?: string | null
          frequency?: string | null
          id?: string
          is_demo?: boolean
          metadata?: Json | null
          name?: string
          project_id?: string
          responsible?: string | null
          target_value?: number | null
          unit?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_indicators_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_plan_milestones: {
        Row: {
          created_at: string
          id: string
          lot: string | null
          owner: string | null
          project_id: string
          target_date: string | null
          task_ref: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          lot?: string | null
          owner?: string | null
          project_id: string
          target_date?: string | null
          task_ref?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          lot?: string | null
          owner?: string | null
          project_id?: string
          target_date?: string | null
          task_ref?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_plan_milestones_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_plan_tasks: {
        Row: {
          comment: string | null
          created_at: string
          deliverable: string | null
          description: string | null
          duration_days: number | null
          end_date: string | null
          id: string
          is_milestone: boolean
          level: number
          owner: string | null
          predecessors: string | null
          priority: string | null
          progress: number
          project_id: string
          start_date: string | null
          status: string
          task_ref: string | null
          title: string
          updated_at: string
          wbs: string | null
        }
        Insert: {
          comment?: string | null
          created_at?: string
          deliverable?: string | null
          description?: string | null
          duration_days?: number | null
          end_date?: string | null
          id?: string
          is_milestone?: boolean
          level?: number
          owner?: string | null
          predecessors?: string | null
          priority?: string | null
          progress?: number
          project_id: string
          start_date?: string | null
          status?: string
          task_ref?: string | null
          title: string
          updated_at?: string
          wbs?: string | null
        }
        Update: {
          comment?: string | null
          created_at?: string
          deliverable?: string | null
          description?: string | null
          duration_days?: number | null
          end_date?: string | null
          id?: string
          is_milestone?: boolean
          level?: number
          owner?: string | null
          predecessors?: string | null
          priority?: string | null
          progress?: number
          project_id?: string
          start_date?: string | null
          status?: string
          task_ref?: string | null
          title?: string
          updated_at?: string
          wbs?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_plan_tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_pmo: {
        Row: {
          charter_mission: string | null
          charter_objectives: string | null
          charter_out_of_scope: string | null
          charter_scope: string | null
          created_at: string
          deliverable_validation_procedure: string | null
          doc_management_procedure: string | null
          governance_manual: string | null
          id: string
          meeting_cadence: string | null
          project_id: string
          status: string
          updated_at: string
        }
        Insert: {
          charter_mission?: string | null
          charter_objectives?: string | null
          charter_out_of_scope?: string | null
          charter_scope?: string | null
          created_at?: string
          deliverable_validation_procedure?: string | null
          doc_management_procedure?: string | null
          governance_manual?: string | null
          id?: string
          meeting_cadence?: string | null
          project_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          charter_mission?: string | null
          charter_objectives?: string | null
          charter_out_of_scope?: string | null
          charter_scope?: string | null
          created_at?: string
          deliverable_validation_procedure?: string | null
          doc_management_procedure?: string | null
          governance_manual?: string | null
          id?: string
          meeting_cadence?: string | null
          project_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_pmo_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_template_assumptions: {
        Row: {
          category: string
          created_at: string
          id: string
          label: string
          notes: string | null
          sort_order: number | null
          template_id: string
          unit: string | null
          value: string | null
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          label: string
          notes?: string | null
          sort_order?: number | null
          template_id: string
          unit?: string | null
          value?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          label?: string
          notes?: string | null
          sort_order?: number | null
          template_id?: string
          unit?: string | null
          value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_template_assumptions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "project_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      project_template_budget_details: {
        Row: {
          activity: string
          category: string | null
          code: string
          created_at: string
          id: string
          nomenclature_code: string | null
          quantity: number | null
          sort_order: number | null
          template_id: string
          total: number | null
          unit: string | null
          unit_cost: number | null
          work_package: string
          year_1: number | null
          year_2: number | null
          year_3: number | null
          year_4: number | null
          year_5: number | null
        }
        Insert: {
          activity: string
          category?: string | null
          code: string
          created_at?: string
          id?: string
          nomenclature_code?: string | null
          quantity?: number | null
          sort_order?: number | null
          template_id: string
          total?: number | null
          unit?: string | null
          unit_cost?: number | null
          work_package: string
          year_1?: number | null
          year_2?: number | null
          year_3?: number | null
          year_4?: number | null
          year_5?: number | null
        }
        Update: {
          activity?: string
          category?: string | null
          code?: string
          created_at?: string
          id?: string
          nomenclature_code?: string | null
          quantity?: number | null
          sort_order?: number | null
          template_id?: string
          total?: number | null
          unit?: string | null
          unit_cost?: number | null
          work_package?: string
          year_1?: number | null
          year_2?: number | null
          year_3?: number | null
          year_4?: number | null
          year_5?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "project_template_budget_details_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "project_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      project_template_budget_lines: {
        Row: {
          category: string | null
          code: string
          created_at: string
          id: string
          label: string
          marqueur_climat: string | null
          marqueur_genre: string | null
          notes: string | null
          parent_code: string | null
          sort_order: number | null
          template_id: string
          total_cost: number | null
          year1: number | null
          year2: number | null
          year3: number | null
          year4: number | null
          year5: number | null
        }
        Insert: {
          category?: string | null
          code: string
          created_at?: string
          id?: string
          label: string
          marqueur_climat?: string | null
          marqueur_genre?: string | null
          notes?: string | null
          parent_code?: string | null
          sort_order?: number | null
          template_id: string
          total_cost?: number | null
          year1?: number | null
          year2?: number | null
          year3?: number | null
          year4?: number | null
          year5?: number | null
        }
        Update: {
          category?: string | null
          code?: string
          created_at?: string
          id?: string
          label?: string
          marqueur_climat?: string | null
          marqueur_genre?: string | null
          notes?: string | null
          parent_code?: string | null
          sort_order?: number | null
          template_id?: string
          total_cost?: number | null
          year1?: number | null
          year2?: number | null
          year3?: number | null
          year4?: number | null
          year5?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "project_template_budget_lines_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "project_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      project_template_sections: {
        Row: {
          created_at: string
          default_content: Json | null
          description: string | null
          id: string
          is_required: boolean
          section_number: string
          section_type: string
          sort_order: number
          subtitle: string | null
          template_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_content?: Json | null
          description?: string | null
          id?: string
          is_required?: boolean
          section_number: string
          section_type?: string
          sort_order?: number
          subtitle?: string | null
          template_id: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_content?: Json | null
          description?: string | null
          id?: string
          is_required?: boolean
          section_number?: string
          section_type?: string
          sort_order?: number
          subtitle?: string | null
          template_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_template_sections_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "project_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      project_templates: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          is_default: boolean
          name: string
          section_count: number | null
          source_document: string | null
          updated_at: string
          version: string | null
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          name: string
          section_count?: number | null
          source_document?: string | null
          updated_at?: string
          version?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          name?: string
          section_count?: number | null
          source_document?: string | null
          updated_at?: string
          version?: string | null
        }
        Relationships: []
      }
      projects: {
        Row: {
          applications_end_date: string | null
          applications_open: boolean | null
          applications_start_date: string | null
          archived_at: string | null
          budget: number | null
          closure_notes: string | null
          code: string | null
          country: string | null
          created_at: string
          description: string | null
          duration_months: number | null
          end_date: string | null
          id: string
          is_archived: boolean
          is_demo: boolean
          lessons_learned: string | null
          locations: string[] | null
          metadata: Json | null
          name: string
          owner_id: string | null
          program_id: string | null
          progress: number | null
          start_date: string | null
          startup_id: string | null
          status: Database["public"]["Enums"]["project_status"]
          updated_at: string
          validated_at: string | null
          validated_by: string | null
          validation_status: string | null
        }
        Insert: {
          applications_end_date?: string | null
          applications_open?: boolean | null
          applications_start_date?: string | null
          archived_at?: string | null
          budget?: number | null
          closure_notes?: string | null
          code?: string | null
          country?: string | null
          created_at?: string
          description?: string | null
          duration_months?: number | null
          end_date?: string | null
          id?: string
          is_archived?: boolean
          is_demo?: boolean
          lessons_learned?: string | null
          locations?: string[] | null
          metadata?: Json | null
          name: string
          owner_id?: string | null
          program_id?: string | null
          progress?: number | null
          start_date?: string | null
          startup_id?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          updated_at?: string
          validated_at?: string | null
          validated_by?: string | null
          validation_status?: string | null
        }
        Update: {
          applications_end_date?: string | null
          applications_open?: boolean | null
          applications_start_date?: string | null
          archived_at?: string | null
          budget?: number | null
          closure_notes?: string | null
          code?: string | null
          country?: string | null
          created_at?: string
          description?: string | null
          duration_months?: number | null
          end_date?: string | null
          id?: string
          is_archived?: boolean
          is_demo?: boolean
          lessons_learned?: string | null
          locations?: string[] | null
          metadata?: Json | null
          name?: string
          owner_id?: string | null
          program_id?: string | null
          progress?: number | null
          start_date?: string | null
          startup_id?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          updated_at?: string
          validated_at?: string | null
          validated_by?: string | null
          validation_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_startup_id_fkey"
            columns: ["startup_id"]
            isOneToOne: false
            referencedRelation: "startups"
            referencedColumns: ["id"]
          },
        ]
      }
      public_applications: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          motivation: string | null
          phone: string | null
          pitch: string | null
          program_id: string | null
          project_id: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          sector: string | null
          stage: string | null
          startup_name: string
          status: string
          updated_at: string
          website: string | null
        }
        Insert: {
          created_at?: string
          email: string
          full_name: string
          id?: string
          motivation?: string | null
          phone?: string | null
          pitch?: string | null
          program_id?: string | null
          project_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          sector?: string | null
          stage?: string | null
          startup_name: string
          status?: string
          updated_at?: string
          website?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          motivation?: string | null
          phone?: string | null
          pitch?: string | null
          program_id?: string | null
          project_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          sector?: string | null
          stage?: string | null
          startup_name?: string
          status?: string
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "public_applications_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "public_applications_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_order_lines: {
        Row: {
          created_at: string
          description: string
          id: string
          line_total: number | null
          purchase_order_id: string
          quantity: number
          sort_order: number | null
          tax_rate: number | null
          unit: string | null
          unit_price: number
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          line_total?: number | null
          purchase_order_id: string
          quantity?: number
          sort_order?: number | null
          tax_rate?: number | null
          unit?: string | null
          unit_price?: number
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          line_total?: number | null
          purchase_order_id?: string
          quantity?: number
          sort_order?: number | null
          tax_rate?: number | null
          unit?: string | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_lines_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          confirmed_at: string | null
          created_at: string
          created_by: string | null
          currency: string
          delivery_address: string | null
          delivery_contact: string | null
          expected_delivery_date: string | null
          grant_id: string | null
          id: string
          invoice_id: string | null
          is_demo: boolean
          issue_date: string
          notes: string | null
          payment_terms: string | null
          po_number: string
          project_id: string | null
          received_at: string | null
          reference: string | null
          sent_at: string | null
          status: Database["public"]["Enums"]["purchase_order_status"]
          subtotal: number | null
          supplier_id: string
          tax_amount: number | null
          tax_rate: number | null
          total: number | null
          updated_at: string
        }
        Insert: {
          confirmed_at?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          delivery_address?: string | null
          delivery_contact?: string | null
          expected_delivery_date?: string | null
          grant_id?: string | null
          id?: string
          invoice_id?: string | null
          is_demo?: boolean
          issue_date?: string
          notes?: string | null
          payment_terms?: string | null
          po_number: string
          project_id?: string | null
          received_at?: string | null
          reference?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["purchase_order_status"]
          subtotal?: number | null
          supplier_id: string
          tax_amount?: number | null
          tax_rate?: number | null
          total?: number | null
          updated_at?: string
        }
        Update: {
          confirmed_at?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          delivery_address?: string | null
          delivery_contact?: string | null
          expected_delivery_date?: string | null
          grant_id?: string | null
          id?: string
          invoice_id?: string | null
          is_demo?: boolean
          issue_date?: string
          notes?: string | null
          payment_terms?: string | null
          po_number?: string
          project_id?: string | null
          received_at?: string | null
          reference?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["purchase_order_status"]
          subtotal?: number | null
          supplier_id?: string
          tax_amount?: number | null
          tax_rate?: number | null
          total?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_grant_id_fkey"
            columns: ["grant_id"]
            isOneToOne: false
            referencedRelation: "grants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "crm_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "crm_contreparties"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth_key: string
          created_at: string
          endpoint: string
          id: string
          last_used_at: string | null
          p256dh: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth_key: string
          created_at?: string
          endpoint: string
          id?: string
          last_used_at?: string | null
          p256dh: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth_key?: string
          created_at?: string
          endpoint?: string
          id?: string
          last_used_at?: string | null
          p256dh?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      quiz_attempts: {
        Row: {
          answers: Json
          created_at: string
          duration_seconds: number | null
          id: string
          module_id: string
          passed: boolean
          percentage: number
          score: number
          total_questions: number
          user_id: string
        }
        Insert: {
          answers?: Json
          created_at?: string
          duration_seconds?: number | null
          id?: string
          module_id: string
          passed?: boolean
          percentage?: number
          score?: number
          total_questions?: number
          user_id: string
        }
        Update: {
          answers?: Json
          created_at?: string
          duration_seconds?: number | null
          id?: string
          module_id?: string
          passed?: boolean
          percentage?: number
          score?: number
          total_questions?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_attempts_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "course_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      resources: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          file_url: string | null
          id: string
          is_demo: boolean
          is_public: boolean | null
          program_id: string | null
          tags: string[] | null
          title: string
          type: string | null
          uploaded_by: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          file_url?: string | null
          id?: string
          is_demo?: boolean
          is_public?: boolean | null
          program_id?: string | null
          tags?: string[] | null
          title: string
          type?: string | null
          uploaded_by?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          file_url?: string | null
          id?: string
          is_demo?: boolean
          is_public?: boolean | null
          program_id?: string | null
          tags?: string[] | null
          title?: string
          type?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "resources_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      risks: {
        Row: {
          created_at: string
          description: string | null
          id: string
          impact: number | null
          is_demo: boolean
          level: Database["public"]["Enums"]["risk_level"]
          mitigation: string | null
          owner_id: string | null
          probability: number | null
          project_id: string | null
          status: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          impact?: number | null
          is_demo?: boolean
          level?: Database["public"]["Enums"]["risk_level"]
          mitigation?: string | null
          owner_id?: string | null
          probability?: number | null
          project_id?: string | null
          status?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          impact?: number | null
          is_demo?: boolean
          level?: Database["public"]["Enums"]["risk_level"]
          mitigation?: string | null
          owner_id?: string | null
          probability?: number | null
          project_id?: string | null
          status?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "risks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      role_assignments: {
        Row: {
          created_at: string
          expires_at: string | null
          granted_at: string
          granted_by: string | null
          id: string
          notes: string | null
          role: Database["public"]["Enums"]["app_role"]
          scope_id: string | null
          scope_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          granted_at?: string
          granted_by?: string | null
          id?: string
          notes?: string | null
          role: Database["public"]["Enums"]["app_role"]
          scope_id?: string | null
          scope_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          granted_at?: string
          granted_by?: string | null
          id?: string
          notes?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          scope_id?: string | null
          scope_type?: string
          user_id?: string
        }
        Relationships: []
      }
      round_judges: {
        Row: {
          assigned_at: string | null
          id: string
          round_id: string
          user_id: string
        }
        Insert: {
          assigned_at?: string | null
          id?: string
          round_id: string
          user_id: string
        }
        Update: {
          assigned_at?: string | null
          id?: string
          round_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "round_judges_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "application_rounds"
            referencedColumns: ["id"]
          },
        ]
      }
      startup_investments: {
        Row: {
          amount_currency: string
          amount_xof: number
          closed_at: string
          created_at: string
          created_by: string | null
          document_url: string | null
          id: string
          investors: Json
          lead_investor: string | null
          notes: string | null
          post_money_valuation_xof: number | null
          pre_money_valuation_xof: number | null
          round_name: string | null
          round_type: string
          startup_id: string
          status: string
          updated_at: string
        }
        Insert: {
          amount_currency?: string
          amount_xof?: number
          closed_at?: string
          created_at?: string
          created_by?: string | null
          document_url?: string | null
          id?: string
          investors?: Json
          lead_investor?: string | null
          notes?: string | null
          post_money_valuation_xof?: number | null
          pre_money_valuation_xof?: number | null
          round_name?: string | null
          round_type: string
          startup_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          amount_currency?: string
          amount_xof?: number
          closed_at?: string
          created_at?: string
          created_by?: string | null
          document_url?: string | null
          id?: string
          investors?: Json
          lead_investor?: string | null
          notes?: string | null
          post_money_valuation_xof?: number | null
          pre_money_valuation_xof?: number | null
          round_name?: string | null
          round_type?: string
          startup_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "startup_investments_startup_id_fkey"
            columns: ["startup_id"]
            isOneToOne: false
            referencedRelation: "startups"
            referencedColumns: ["id"]
          },
        ]
      }
      startup_kpis: {
        Row: {
          created_at: string
          id: string
          is_demo: boolean
          metric_name: string
          metric_value: number
          notes: string | null
          period: string
          recorded_at: string
          startup_id: string
          unit: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_demo?: boolean
          metric_name: string
          metric_value?: number
          notes?: string | null
          period?: string
          recorded_at?: string
          startup_id: string
          unit?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_demo?: boolean
          metric_name?: string
          metric_value?: number
          notes?: string | null
          period?: string
          recorded_at?: string
          startup_id?: string
          unit?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "startup_kpis_startup_id_fkey"
            columns: ["startup_id"]
            isOneToOne: false
            referencedRelation: "startups"
            referencedColumns: ["id"]
          },
        ]
      }
      startup_members: {
        Row: {
          created_at: string
          email: string | null
          full_name: string
          id: string
          is_demo: boolean
          role: string | null
          startup_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          is_demo?: boolean
          role?: string | null
          startup_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          is_demo?: boolean
          role?: string | null
          startup_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "startup_members_startup_id_fkey"
            columns: ["startup_id"]
            isOneToOne: false
            referencedRelation: "startups"
            referencedColumns: ["id"]
          },
        ]
      }
      startups: {
        Row: {
          address: string | null
          alumni_date: string | null
          alumni_notes: string | null
          city: string | null
          cohort_id: string | null
          contact_person: string | null
          country: string | null
          created_at: string
          description: string | null
          email: string | null
          founded_date: string | null
          founder_id: string | null
          id: string
          is_alumni: boolean | null
          is_demo: boolean
          logo_url: string | null
          name: string
          ninea: string | null
          phone: string | null
          pitch_deck_url: string | null
          revenue_monthly: number | null
          score: number | null
          sector: string | null
          stage: string | null
          tax_id: string | null
          team_size: number | null
          updated_at: string
          website: string | null
        }
        Insert: {
          address?: string | null
          alumni_date?: string | null
          alumni_notes?: string | null
          city?: string | null
          cohort_id?: string | null
          contact_person?: string | null
          country?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          founded_date?: string | null
          founder_id?: string | null
          id?: string
          is_alumni?: boolean | null
          is_demo?: boolean
          logo_url?: string | null
          name: string
          ninea?: string | null
          phone?: string | null
          pitch_deck_url?: string | null
          revenue_monthly?: number | null
          score?: number | null
          sector?: string | null
          stage?: string | null
          tax_id?: string | null
          team_size?: number | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          alumni_date?: string | null
          alumni_notes?: string | null
          city?: string | null
          cohort_id?: string | null
          contact_person?: string | null
          country?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          founded_date?: string | null
          founder_id?: string | null
          id?: string
          is_alumni?: boolean | null
          is_demo?: boolean
          logo_url?: string | null
          name?: string
          ninea?: string | null
          phone?: string | null
          pitch_deck_url?: string | null
          revenue_monthly?: number | null
          score?: number | null
          sector?: string | null
          stage?: string | null
          tax_id?: string | null
          team_size?: number | null
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "startups_cohort_id_fkey"
            columns: ["cohort_id"]
            isOneToOne: false
            referencedRelation: "cohorts"
            referencedColumns: ["id"]
          },
        ]
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
      survey_responses: {
        Row: {
          answers: Json | null
          created_at: string
          feedback: string | null
          id: string
          is_demo: boolean
          rating: number | null
          respondent_id: string
          submitted_at: string
          survey_id: string
        }
        Insert: {
          answers?: Json | null
          created_at?: string
          feedback?: string | null
          id?: string
          is_demo?: boolean
          rating?: number | null
          respondent_id: string
          submitted_at?: string
          survey_id: string
        }
        Update: {
          answers?: Json | null
          created_at?: string
          feedback?: string | null
          id?: string
          is_demo?: boolean
          rating?: number | null
          respondent_id?: string
          submitted_at?: string
          survey_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "survey_responses_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "surveys"
            referencedColumns: ["id"]
          },
        ]
      }
      surveys: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          is_demo: boolean
          program_id: string | null
          survey_type: string
          target_type: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          is_demo?: boolean
          program_id?: string | null
          survey_type?: string
          target_type?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          is_demo?: boolean
          program_id?: string | null
          survey_type?: string
          target_type?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "surveys_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      system_health_snapshots: {
        Row: {
          active_users_24h: number | null
          avg_query_ms: number | null
          captured_at: string
          domain_events_24h: number | null
          emails_sent_24h: number | null
          errors_24h: number | null
          extra: Json | null
          id: string
          webhook_failures_24h: number | null
        }
        Insert: {
          active_users_24h?: number | null
          avg_query_ms?: number | null
          captured_at?: string
          domain_events_24h?: number | null
          emails_sent_24h?: number | null
          errors_24h?: number | null
          extra?: Json | null
          id?: string
          webhook_failures_24h?: number | null
        }
        Update: {
          active_users_24h?: number | null
          avg_query_ms?: number | null
          captured_at?: string
          domain_events_24h?: number | null
          emails_sent_24h?: number | null
          errors_24h?: number | null
          extra?: Json | null
          id?: string
          webhook_failures_24h?: number | null
        }
        Relationships: []
      }
      tasks: {
        Row: {
          assignee_id: string | null
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          is_demo: boolean
          priority: Database["public"]["Enums"]["task_priority"]
          project_id: string | null
          status: Database["public"]["Enums"]["task_status"]
          tags: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          assignee_id?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          is_demo?: boolean
          priority?: Database["public"]["Enums"]["task_priority"]
          project_id?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          tags?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          assignee_id?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          is_demo?: boolean
          priority?: Database["public"]["Enums"]["task_priority"]
          project_id?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          tags?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      term_sheets: {
        Row: {
          amount_xof: number
          created_at: string
          created_by: string | null
          document_url: string | null
          expires_at: string | null
          id: string
          investor_name: string
          notes: string | null
          sent_at: string | null
          signed_at: string | null
          startup_id: string
          status: string
          terms: Json
          updated_at: string
          valuation_xof: number | null
        }
        Insert: {
          amount_xof?: number
          created_at?: string
          created_by?: string | null
          document_url?: string | null
          expires_at?: string | null
          id?: string
          investor_name: string
          notes?: string | null
          sent_at?: string | null
          signed_at?: string | null
          startup_id: string
          status?: string
          terms?: Json
          updated_at?: string
          valuation_xof?: number | null
        }
        Update: {
          amount_xof?: number
          created_at?: string
          created_by?: string | null
          document_url?: string | null
          expires_at?: string | null
          id?: string
          investor_name?: string
          notes?: string | null
          sent_at?: string | null
          signed_at?: string | null
          startup_id?: string
          status?: string
          terms?: Json
          updated_at?: string
          valuation_xof?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "term_sheets_startup_id_fkey"
            columns: ["startup_id"]
            isOneToOne: false
            referencedRelation: "startups"
            referencedColumns: ["id"]
          },
        ]
      }
      theory_of_change: {
        Row: {
          activities: Json | null
          assumptions: Json | null
          created_at: string
          id: string
          impact: string | null
          inputs: Json | null
          is_demo: boolean
          outcomes: Json | null
          outputs: Json | null
          project_id: string
          risks: Json | null
          updated_at: string
        }
        Insert: {
          activities?: Json | null
          assumptions?: Json | null
          created_at?: string
          id?: string
          impact?: string | null
          inputs?: Json | null
          is_demo?: boolean
          outcomes?: Json | null
          outputs?: Json | null
          project_id: string
          risks?: Json | null
          updated_at?: string
        }
        Update: {
          activities?: Json | null
          assumptions?: Json | null
          created_at?: string
          id?: string
          impact?: string | null
          inputs?: Json | null
          is_demo?: boolean
          outcomes?: Json | null
          outputs?: Json | null
          project_id?: string
          risks?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "theory_of_change_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      user_notification_prefs: {
        Row: {
          application_notifications: boolean
          coaching_notifications: boolean
          created_at: string
          email_digest_enabled: boolean
          email_digest_frequency: string
          message_notifications: boolean
          milestone_notifications: boolean
          push_enabled: boolean
          risk_notifications: boolean
          task_notifications: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          application_notifications?: boolean
          coaching_notifications?: boolean
          created_at?: string
          email_digest_enabled?: boolean
          email_digest_frequency?: string
          message_notifications?: boolean
          milestone_notifications?: boolean
          push_enabled?: boolean
          risk_notifications?: boolean
          task_notifications?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          application_notifications?: boolean
          coaching_notifications?: boolean
          created_at?: string
          email_digest_enabled?: boolean
          email_digest_frequency?: string
          message_notifications?: boolean
          milestone_notifications?: boolean
          push_enabled?: boolean
          risk_notifications?: boolean
          task_notifications?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_presence: {
        Row: {
          custom_emoji: string | null
          custom_status: string | null
          last_seen_at: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          custom_emoji?: string | null
          custom_status?: string | null
          last_seen_at?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          custom_emoji?: string | null
          custom_status?: string | null
          last_seen_at?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      webhook_configs: {
        Row: {
          created_at: string | null
          created_by: string
          disabled_reason: string | null
          event_type: string
          id: string
          is_active: boolean | null
          is_demo: boolean
          last_dispatch_at: string | null
          last_dispatch_status: string | null
          last_error_body: string | null
          last_success_at: string | null
          name: string
          next_retry_at: string | null
          retry_count: number
          secret: string | null
          updated_at: string | null
          url: string
        }
        Insert: {
          created_at?: string | null
          created_by: string
          disabled_reason?: string | null
          event_type: string
          id?: string
          is_active?: boolean | null
          is_demo?: boolean
          last_dispatch_at?: string | null
          last_dispatch_status?: string | null
          last_error_body?: string | null
          last_success_at?: string | null
          name: string
          next_retry_at?: string | null
          retry_count?: number
          secret?: string | null
          updated_at?: string | null
          url: string
        }
        Update: {
          created_at?: string | null
          created_by?: string
          disabled_reason?: string | null
          event_type?: string
          id?: string
          is_active?: boolean | null
          is_demo?: boolean
          last_dispatch_at?: string | null
          last_dispatch_status?: string | null
          last_error_body?: string | null
          last_success_at?: string | null
          name?: string
          next_retry_at?: string | null
          retry_count?: number
          secret?: string | null
          updated_at?: string | null
          url?: string
        }
        Relationships: []
      }
      webhook_deliveries: {
        Row: {
          attempt: number
          delivered_at: string
          duration_ms: number | null
          error: string | null
          event_id: string | null
          event_name: string
          http_status: number | null
          id: string
          response_body: string | null
          status: string
          webhook_config_id: string | null
        }
        Insert: {
          attempt?: number
          delivered_at?: string
          duration_ms?: number | null
          error?: string | null
          event_id?: string | null
          event_name: string
          http_status?: number | null
          id?: string
          response_body?: string | null
          status: string
          webhook_config_id?: string | null
        }
        Update: {
          attempt?: number
          delivered_at?: string
          duration_ms?: number | null
          error?: string | null
          event_id?: string | null
          event_name?: string
          http_status?: number | null
          id?: string
          response_body?: string | null
          status?: string
          webhook_config_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "webhook_deliveries_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "domain_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "webhook_deliveries_webhook_config_id_fkey"
            columns: ["webhook_config_id"]
            isOneToOne: false
            referencedRelation: "webhook_configs"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      accounting_balance: {
        Row: {
          account_class: number | null
          account_code: string | null
          account_label: string | null
          fiscal_year_id: string | null
          solde: number | null
          total_credit: number | null
          total_debit: number | null
        }
        Relationships: [
          {
            foreignKeyName: "accounting_entries_fiscal_year_id_fkey"
            columns: ["fiscal_year_id"]
            isOneToOne: false
            referencedRelation: "accounting_fiscal_years"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_vs_actual: {
        Row: {
          execution_rate: number | null
          nomenclature_code: string | null
          nomenclature_label: string | null
          planned_amount: number | null
          project_id: string | null
          remaining: number | null
          spent_amount: number | null
          work_package: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_budget_details_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      cost_imputation_consolidated: {
        Row: {
          amount: number | null
          currency: string | null
          month: number | null
          occurred_on: string | null
          project_id: string | null
          source: string | null
          source_id: string | null
          subject_id: string | null
          year: number | null
        }
        Relationships: []
      }
      hr_contract_alerts: {
        Row: {
          alert_level: string | null
          contract_id: string | null
          contract_type: Database["public"]["Enums"]["hr_contract_type"] | null
          days_remaining: number | null
          employee_id: string | null
          end_date: string | null
          matricule: string | null
          nom: string | null
          prenom: string | null
          trial_end_date: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hr_contracts_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "hr_employees"
            referencedColumns: ["id"]
          },
        ]
      }
      me_indicator_progress: {
        Row: {
          achievement_pct: number | null
          baseline_measured: number | null
          baseline_value: number | null
          current_value: number | null
          endline_date: string | null
          endline_measured: number | null
          grant_id: string | null
          indicator_id: string | null
          measurement_count: number | null
          midline_measured: number | null
          name: string | null
          project_id: string | null
          source: string | null
          target_value: number | null
          unit: string | null
          variation_vs_baseline_pct: number | null
        }
        Relationships: []
      }
      profiles_safe: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string | null
          is_approved: boolean | null
          linkedin_url: string | null
          organization: string | null
          phone: string | null
          position: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          email?: never
          full_name?: string | null
          id?: string | null
          is_approved?: boolean | null
          linkedin_url?: string | null
          organization?: string | null
          phone?: never
          position?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          email?: never
          full_name?: string | null
          id?: string | null
          is_approved?: boolean | null
          linkedin_url?: string | null
          organization?: string | null
          phone?: never
          position?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      startup_members_safe: {
        Row: {
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string | null
          role: string | null
          startup_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          email?: never
          full_name?: string | null
          id?: string | null
          role?: string | null
          startup_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          email?: never
          full_name?: string | null
          id?: string | null
          role?: string | null
          startup_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "startup_members_startup_id_fkey"
            columns: ["startup_id"]
            isOneToOne: false
            referencedRelation: "startups"
            referencedColumns: ["id"]
          },
        ]
      }
      system_health_overview: {
        Row: {
          active_users_24h: number | null
          activity_24h: number | null
          critical_errors_24h: number | null
          domain_events_1h: number | null
          domain_events_24h: number | null
          emails_sent_24h: number | null
          errors_24h: number | null
          generated_at: string | null
          total_projects: number | null
          total_users: number | null
        }
        Relationships: []
      }
      treasury_consolidated: {
        Row: {
          amount_xof: number | null
          direction: string | null
          label: string | null
          occurred_on: string | null
          program_id: string | null
          project_id: string | null
          source: string | null
          source_id: string | null
          status: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      anonymize_user_data: { Args: { _user_id: string }; Returns: undefined }
      can_access_grant: {
        Args: { _grant_id: string; _user_id: string }
        Returns: boolean
      }
      can_access_project: {
        Args: { _project_id: string; _user_id: string }
        Returns: boolean
      }
      can_view_accounting: { Args: { _user_id: string }; Returns: boolean }
      compute_startup_health_score: {
        Args: { p_startup_id: string }
        Returns: number
      }
      create_notification: {
        Args: {
          p_content?: string
          p_link?: string
          p_title: string
          p_type?: string
          p_user_id: string
        }
        Returns: undefined
      }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      emit_domain_event: {
        Args: {
          _aggregate_id: string
          _aggregate_type: string
          _event_name: string
          _payload?: Json
        }
        Returns: string
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      get_cashflow_summary: {
        Args: { _from?: string; _to?: string }
        Returns: {
          cumulative_xof: number
          inflow_xof: number
          month_start: string
          net_xof: number
          outflow_xof: number
        }[]
      }
      get_project_cost_breakdown: {
        Args: { _from?: string; _project_id: string; _to?: string }
        Returns: {
          line_count: number
          source: string
          total_amount: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_scoped_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _scope_id?: string
          _scope_type?: string
          _user_id: string
        }
        Returns: boolean
      }
      is_admin_or_coordinator: { Args: { _user_id: string }; Returns: boolean }
      is_conversation_member: {
        Args: { _conversation_id: string; _user_id: string }
        Returns: boolean
      }
      is_demo_user: { Args: { _user_id?: string }; Returns: boolean }
      is_startup_founder: {
        Args: { _startup_id: string; _user_id: string }
        Returns: boolean
      }
      is_startup_member: {
        Args: { _startup_id: string; _user_id: string }
        Returns: boolean
      }
      log_api_key_usage: { Args: { _id: string }; Returns: undefined }
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
      recalc_cap_table_pct: {
        Args: { _startup_id: string }
        Returns: undefined
      }
      search_messages: {
        Args: { _channel_id?: string; _query: string }
        Returns: {
          channel_id: string
          channel_name: string
          content: string
          created_at: string
          id: string
          rank: number
          sender_id: string
        }[]
      }
      seed_project_pmo: { Args: { _project_id: string }; Returns: undefined }
      should_notify: {
        Args: { _category: string; _user_id: string }
        Returns: boolean
      }
      start_conversation: {
        Args: { _other_user_id: string; _title?: string }
        Returns: string
      }
      user_accessible_portfolios: {
        Args: { _user_id: string }
        Returns: string[]
      }
      user_accessible_programs: {
        Args: { _user_id: string }
        Returns: string[]
      }
      user_accessible_projects: {
        Args: { _user_id: string }
        Returns: string[]
      }
      verify_api_key: {
        Args: { _hash: string; _prefix: string }
        Returns: {
          api_key_id: string
          scopes: string[]
          user_id: string
        }[]
      }
      verify_invitation_token: {
        Args: { _token: string }
        Returns: {
          email: string
          role: Database["public"]["Enums"]["app_role"]
          status: string
        }[]
      }
    }
    Enums: {
      app_role:
        | "super_admin"
        | "coordinator"
        | "mentor"
        | "entrepreneur"
        | "evaluator"
        | "investor"
        | "funder"
        | "project_manager"
        | "demo_user"
        | "staff"
        | "consultant_expert"
        | "consultant_coach"
      application_status:
        | "submitted"
        | "screening"
        | "interview"
        | "due_diligence"
        | "accepted"
        | "rejected"
      crm_invoice_direction: "emise" | "recue"
      crm_invoice_status:
        | "brouillon"
        | "envoyee"
        | "payee_partiel"
        | "payee"
        | "en_retard"
        | "annulee"
      crm_party_type: "client" | "bailleur" | "fournisseur" | "partenaire"
      crm_quote_status:
        | "brouillon"
        | "envoye"
        | "accepte"
        | "refuse"
        | "expire"
        | "converti"
      crm_subscription_frequency:
        | "mensuel"
        | "trimestriel"
        | "semestriel"
        | "annuel"
      crm_subscription_status: "actif" | "suspendu" | "termine"
      event_type:
        | "demo_day"
        | "workshop"
        | "networking"
        | "hackathon"
        | "committee"
        | "webinar"
        | "other"
      grant_status: "draft" | "active" | "disbursing" | "closing" | "closed"
      hr_contract_type:
        | "CDI"
        | "CDD"
        | "stage"
        | "consultance"
        | "apprentissage"
        | "autre"
      hr_expense_status:
        | "draft"
        | "submitted"
        | "approved_l1"
        | "approved"
        | "rejected"
        | "reimbursed"
      hr_leave_status:
        | "draft"
        | "pending"
        | "approved"
        | "rejected"
        | "cancelled"
      hr_leave_type:
        | "annuel"
        | "maladie"
        | "maternite"
        | "paternite"
        | "permission"
        | "sans_solde"
        | "autre"
      hr_payroll_run_status:
        | "draft"
        | "calculated"
        | "validated"
        | "closed"
        | "cancelled"
      me_phase: "baseline" | "midline" | "endline" | "adhoc"
      project_status: "draft" | "active" | "paused" | "completed" | "cancelled"
      purchase_order_status:
        | "brouillon"
        | "envoye"
        | "confirme"
        | "recu_partiel"
        | "recu"
        | "annule"
      risk_level: "low" | "medium" | "high" | "critical"
      session_status:
        | "planned"
        | "confirmed"
        | "in_progress"
        | "completed"
        | "cancelled"
      task_priority: "low" | "medium" | "high" | "critical"
      task_status: "todo" | "in_progress" | "in_review" | "done"
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
      app_role: [
        "super_admin",
        "coordinator",
        "mentor",
        "entrepreneur",
        "evaluator",
        "investor",
        "funder",
        "project_manager",
        "demo_user",
        "staff",
        "consultant_expert",
        "consultant_coach",
      ],
      application_status: [
        "submitted",
        "screening",
        "interview",
        "due_diligence",
        "accepted",
        "rejected",
      ],
      crm_invoice_direction: ["emise", "recue"],
      crm_invoice_status: [
        "brouillon",
        "envoyee",
        "payee_partiel",
        "payee",
        "en_retard",
        "annulee",
      ],
      crm_party_type: ["client", "bailleur", "fournisseur", "partenaire"],
      crm_quote_status: [
        "brouillon",
        "envoye",
        "accepte",
        "refuse",
        "expire",
        "converti",
      ],
      crm_subscription_frequency: [
        "mensuel",
        "trimestriel",
        "semestriel",
        "annuel",
      ],
      crm_subscription_status: ["actif", "suspendu", "termine"],
      event_type: [
        "demo_day",
        "workshop",
        "networking",
        "hackathon",
        "committee",
        "webinar",
        "other",
      ],
      grant_status: ["draft", "active", "disbursing", "closing", "closed"],
      hr_contract_type: [
        "CDI",
        "CDD",
        "stage",
        "consultance",
        "apprentissage",
        "autre",
      ],
      hr_expense_status: [
        "draft",
        "submitted",
        "approved_l1",
        "approved",
        "rejected",
        "reimbursed",
      ],
      hr_leave_status: [
        "draft",
        "pending",
        "approved",
        "rejected",
        "cancelled",
      ],
      hr_leave_type: [
        "annuel",
        "maladie",
        "maternite",
        "paternite",
        "permission",
        "sans_solde",
        "autre",
      ],
      hr_payroll_run_status: [
        "draft",
        "calculated",
        "validated",
        "closed",
        "cancelled",
      ],
      me_phase: ["baseline", "midline", "endline", "adhoc"],
      project_status: ["draft", "active", "paused", "completed", "cancelled"],
      purchase_order_status: [
        "brouillon",
        "envoye",
        "confirme",
        "recu_partiel",
        "recu",
        "annule",
      ],
      risk_level: ["low", "medium", "high", "critical"],
      session_status: [
        "planned",
        "confirmed",
        "in_progress",
        "completed",
        "cancelled",
      ],
      task_priority: ["low", "medium", "high", "critical"],
      task_status: ["todo", "in_progress", "in_review", "done"],
    },
  },
} as const
