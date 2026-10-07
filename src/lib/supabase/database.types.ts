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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      academies: {
        Row: {
          allow_negative_stock: boolean
          billing_day: number | null
          cancel_policy: string
          collection_template: string
          contact: string | null
          country: string
          created_at: string
          currency: string
          expense_approval_limit: number
          grace_days: number
          id: string
          locale: string
          logo_document_id: string | null
          logo_path: string | null
          max_discount_percent: number
          name: string
          pause_policy: string
          primary_color: string
          proration_policy: string
          receipt_footer: string | null
          receipt_prefix: string
          reservation_hours: number
          timezone: string
        }
        Insert: {
          allow_negative_stock?: boolean
          billing_day?: number | null
          cancel_policy?: string
          collection_template?: string
          contact?: string | null
          country: string
          created_at?: string
          currency: string
          expense_approval_limit?: number
          grace_days?: number
          id?: string
          locale?: string
          logo_document_id?: string | null
          logo_path?: string | null
          max_discount_percent?: number
          name: string
          pause_policy?: string
          primary_color?: string
          proration_policy?: string
          receipt_footer?: string | null
          receipt_prefix?: string
          reservation_hours?: number
          timezone: string
        }
        Update: {
          allow_negative_stock?: boolean
          billing_day?: number | null
          cancel_policy?: string
          collection_template?: string
          contact?: string | null
          country?: string
          created_at?: string
          currency?: string
          expense_approval_limit?: number
          grace_days?: number
          id?: string
          locale?: string
          logo_document_id?: string | null
          logo_path?: string | null
          max_discount_percent?: number
          name?: string
          pause_policy?: string
          primary_color?: string
          proration_policy?: string
          receipt_footer?: string | null
          receipt_prefix?: string
          reservation_hours?: number
          timezone?: string
        }
        Relationships: [
          {
            foreignKeyName: "academies_id_logo_document_id_fkey"
            columns: ["id", "logo_document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["academy_id", "id"]
          },
        ]
      }
      account_movements: {
        Row: {
          academy_id: string
          account_id: string
          actor: string
          amount: number
          branch_id: string
          created_at: string
          description: string
          id: string
          kind: string
          reconciled_on: string | null
          session_id: string | null
          source_id: string
        }
        Insert: {
          academy_id: string
          account_id: string
          actor: string
          amount: number
          branch_id: string
          created_at?: string
          description: string
          id?: string
          kind: string
          reconciled_on?: string | null
          session_id?: string | null
          source_id: string
        }
        Update: {
          academy_id?: string
          account_id?: string
          actor?: string
          amount?: number
          branch_id?: string
          created_at?: string
          description?: string
          id?: string
          kind?: string
          reconciled_on?: string | null
          session_id?: string | null
          source_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_movements_academy_id_account_id_fkey"
            columns: ["academy_id", "account_id"]
            isOneToOne: false
            referencedRelation: "account_balances"
            referencedColumns: ["academy_id", "id"]
          },
          {
            foreignKeyName: "account_movements_academy_id_account_id_fkey"
            columns: ["academy_id", "account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["academy_id", "id"]
          },
          {
            foreignKeyName: "account_movements_academy_id_branch_id_fkey"
            columns: ["academy_id", "branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["academy_id", "id"]
          },
          {
            foreignKeyName: "account_movements_academy_id_fkey"
            columns: ["academy_id"]
            isOneToOne: false
            referencedRelation: "academies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_movements_academy_id_session_id_fkey"
            columns: ["academy_id", "session_id"]
            isOneToOne: false
            referencedRelation: "cash_sessions"
            referencedColumns: ["academy_id", "id"]
          },
        ]
      }
      accounts: {
        Row: {
          academy_id: string
          active: boolean
          branch_id: string
          created_at: string
          id: string
          kind: string
          name: string
        }
        Insert: {
          academy_id: string
          active?: boolean
          branch_id: string
          created_at?: string
          id?: string
          kind: string
          name: string
        }
        Update: {
          academy_id?: string
          active?: boolean
          branch_id?: string
          created_at?: string
          id?: string
          kind?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounts_academy_id_branch_id_fkey"
            columns: ["academy_id", "branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["academy_id", "id"]
          },
          {
            foreignKeyName: "accounts_academy_id_fkey"
            columns: ["academy_id"]
            isOneToOne: false
            referencedRelation: "academies"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance: {
        Row: {
          academy_id: string
          actor: string
          branch_id: string
          class_id: string
          created_at: string
          exception_reason: string | null
          id: string
          membership_id: string | null
          student_id: string
        }
        Insert: {
          academy_id: string
          actor: string
          branch_id: string
          class_id: string
          created_at?: string
          exception_reason?: string | null
          id?: string
          membership_id?: string | null
          student_id: string
        }
        Update: {
          academy_id?: string
          actor?: string
          branch_id?: string
          class_id?: string
          created_at?: string
          exception_reason?: string | null
          id?: string
          membership_id?: string | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_academy_id_branch_id_fkey"
            columns: ["academy_id", "branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["academy_id", "id"]
          },
          {
            foreignKeyName: "attendance_academy_id_class_id_fkey"
            columns: ["academy_id", "class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["academy_id", "id"]
          },
          {
            foreignKeyName: "attendance_academy_id_fkey"
            columns: ["academy_id"]
            isOneToOne: false
            referencedRelation: "academies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_academy_id_membership_id_fkey"
            columns: ["academy_id", "membership_id"]
            isOneToOne: false
            referencedRelation: "memberships"
            referencedColumns: ["academy_id", "id"]
          },
          {
            foreignKeyName: "attendance_academy_id_student_id_fkey"
            columns: ["academy_id", "student_id"]
            isOneToOne: false
            referencedRelation: "student_activity"
            referencedColumns: ["academy_id", "id"]
          },
          {
            foreignKeyName: "attendance_academy_id_student_id_fkey"
            columns: ["academy_id", "student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["academy_id", "id"]
          },
        ]
      }
      audit_log: {
        Row: {
          academy_id: string
          action: string
          actor: string | null
          branch_id: string | null
          created_at: string
          details: Json
          entity: string
          entity_id: string | null
          id: string
          reason: string | null
        }
        Insert: {
          academy_id: string
          action: string
          actor?: string | null
          branch_id?: string | null
          created_at?: string
          details?: Json
          entity: string
          entity_id?: string | null
          id?: string
          reason?: string | null
        }
        Update: {
          academy_id?: string
          action?: string
          actor?: string | null
          branch_id?: string | null
          created_at?: string
          details?: Json
          entity?: string
          entity_id?: string | null
          id?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_academy_id_branch_id_fkey"
            columns: ["academy_id", "branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["academy_id", "id"]
          },
          {
            foreignKeyName: "audit_log_academy_id_fkey"
            columns: ["academy_id"]
            isOneToOne: false
            referencedRelation: "academies"
            referencedColumns: ["id"]
          },
        ]
      }
      belts: {
        Row: {
          academy_id: string
          active: boolean
          created_at: string
          discipline_id: string
          id: string
          name: string
          rank: number
        }
        Insert: {
          academy_id: string
          active?: boolean
          created_at?: string
          discipline_id: string
          id?: string
          name: string
          rank?: number
        }
        Update: {
          academy_id?: string
          active?: boolean
          created_at?: string
          discipline_id?: string
          id?: string
          name?: string
          rank?: number
        }
        Relationships: [
          {
            foreignKeyName: "belts_academy_id_discipline_id_fkey"
            columns: ["academy_id", "discipline_id"]
            isOneToOne: false
            referencedRelation: "disciplines"
            referencedColumns: ["academy_id", "id"]
          },
          {
            foreignKeyName: "belts_academy_id_fkey"
            columns: ["academy_id"]
            isOneToOne: false
            referencedRelation: "academies"
            referencedColumns: ["id"]
          },
        ]
      }
      branches: {
        Row: {
          academy_id: string
          active: boolean
          address: string | null
          created_at: string
          id: string
          name: string
          phone: string | null
        }
        Insert: {
          academy_id: string
          active?: boolean
          address?: string | null
          created_at?: string
          id?: string
          name: string
          phone?: string | null
        }
        Update: {
          academy_id?: string
          active?: boolean
          address?: string | null
          created_at?: string
          id?: string
          name?: string
          phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "branches_academy_id_fkey"
            columns: ["academy_id"]
            isOneToOne: false
            referencedRelation: "academies"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_sessions: {
        Row: {
          academy_id: string
          account_id: string
          approved_by: string | null
          branch_id: string
          cashier: string
          closed_at: string | null
          counted: number | null
          created_at: string
          difference: number | null
          expected: number | null
          id: string
          opened_at: string
          opening_amount: number
          reason: string | null
        }
        Insert: {
          academy_id: string
          account_id: string
          approved_by?: string | null
          branch_id: string
          cashier: string
          closed_at?: string | null
          counted?: number | null
          created_at?: string
          difference?: number | null
          expected?: number | null
          id?: string
          opened_at?: string
          opening_amount: number
          reason?: string | null
        }
        Update: {
          academy_id?: string
          account_id?: string
          approved_by?: string | null
          branch_id?: string
          cashier?: string
          closed_at?: string | null
          counted?: number | null
          created_at?: string
          difference?: number | null
          expected?: number | null
          id?: string
          opened_at?: string
          opening_amount?: number
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cash_sessions_academy_id_account_id_fkey"
            columns: ["academy_id", "account_id"]
            isOneToOne: false
            referencedRelation: "account_balances"
            referencedColumns: ["academy_id", "id"]
          },
          {
            foreignKeyName: "cash_sessions_academy_id_account_id_fkey"
            columns: ["academy_id", "account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["academy_id", "id"]
          },
          {
            foreignKeyName: "cash_sessions_academy_id_branch_id_fkey"
            columns: ["academy_id", "branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["academy_id", "id"]
          },
          {
            foreignKeyName: "cash_sessions_academy_id_fkey"
            columns: ["academy_id"]
            isOneToOne: false
            referencedRelation: "academies"
            referencedColumns: ["id"]
          },
        ]
      }
      charge_adjustments: {
        Row: {
          academy_id: string
          actor: string
          amount: number
          branch_id: string
          charge_id: string
          created_at: string
          id: string
          reason: string
        }
        Insert: {
          academy_id: string
          actor: string
          amount: number
          branch_id: string
          charge_id: string
          created_at?: string
          id?: string
          reason: string
        }
        Update: {
          academy_id?: string
          actor?: string
          amount?: number
          branch_id?: string
          charge_id?: string
          created_at?: string
          id?: string
          reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "charge_adjustments_academy_id_branch_id_fkey"
            columns: ["academy_id", "branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["academy_id", "id"]
          },
          {
            foreignKeyName: "charge_adjustments_academy_id_charge_id_fkey"
            columns: ["academy_id", "charge_id"]
            isOneToOne: false
            referencedRelation: "charge_balances"
            referencedColumns: ["academy_id", "id"]
          },
          {
            foreignKeyName: "charge_adjustments_academy_id_charge_id_fkey"
            columns: ["academy_id", "charge_id"]
            isOneToOne: false
            referencedRelation: "charges"
            referencedColumns: ["academy_id", "id"]
          },
          {
            foreignKeyName: "charge_adjustments_academy_id_charge_id_fkey"
            columns: ["academy_id", "charge_id"]
            isOneToOne: false
            referencedRelation: "debt_report"
            referencedColumns: ["academy_id", "id"]
          },
          {
            foreignKeyName: "charge_adjustments_academy_id_fkey"
            columns: ["academy_id"]
            isOneToOne: false
            referencedRelation: "academies"
            referencedColumns: ["id"]
          },
        ]
      }
      charges: {
        Row: {
          academy_id: string
          amount: number
          branch_id: string
          created_at: string
          description: string
          due_on: string
          id: string
          membership_id: string | null
          period_on: string | null
          source: string
          status: string
          student_id: string | null
        }
        Insert: {
          academy_id: string
          amount: number
          branch_id: string
          created_at?: string
          description: string
          due_on: string
          id?: string
          membership_id?: string | null
          period_on?: string | null
          source?: string
          status?: string
          student_id?: string | null
        }
        Update: {
          academy_id?: string
          amount?: number
          branch_id?: string
          created_at?: string
          description?: string
          due_on?: string
          id?: string
          membership_id?: string | null
          period_on?: string | null
          source?: string
          status?: string
          student_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "charges_academy_id_branch_id_fkey"
            columns: ["academy_id", "branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["academy_id", "id"]
          },
          {
            foreignKeyName: "charges_academy_id_fkey"
            columns: ["academy_id"]
            isOneToOne: false
            referencedRelation: "academies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "charges_academy_id_membership_id_fkey"
            columns: ["academy_id", "membership_id"]
            isOneToOne: false
            referencedRelation: "memberships"
            referencedColumns: ["academy_id", "id"]
          },
          {
            foreignKeyName: "charges_academy_id_student_id_fkey"
            columns: ["academy_id", "student_id"]
            isOneToOne: false
            referencedRelation: "student_activity"
            referencedColumns: ["academy_id", "id"]
          },
          {
            foreignKeyName: "charges_academy_id_student_id_fkey"
            columns: ["academy_id", "student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["academy_id", "id"]
          },
        ]
      }
      class_templates: {
        Row: {
          academy_id: string
          active: boolean
          age_group: string | null
          branch_id: string
          capacity: number
          created_at: string
          discipline_id: string
          duration_minutes: number
          id: string
          instructor_id: string
          level: string | null
          name: string
          room_id: string
          starts_time: string
          weekday: number
        }
        Insert: {
          academy_id: string
          active?: boolean
          age_group?: string | null
          branch_id: string
          capacity: number
          created_at?: string
          discipline_id: string
          duration_minutes: number
          id?: string
          instructor_id: string
          level?: string | null
          name: string
          room_id: string
          starts_time: string
          weekday: number
        }
        Update: {
          academy_id?: string
          active?: boolean
          age_group?: string | null
          branch_id?: string
          capacity?: number
          created_at?: string
          discipline_id?: string
          duration_minutes?: number
          id?: string
          instructor_id?: string
          level?: string | null
          name?: string
          room_id?: string
          starts_time?: string
          weekday?: number
        }
        Relationships: [
          {
            foreignKeyName: "class_templates_academy_id_branch_id_fkey"
            columns: ["academy_id", "branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["academy_id", "id"]
          },
          {
            foreignKeyName: "class_templates_academy_id_discipline_id_fkey"
            columns: ["academy_id", "discipline_id"]
            isOneToOne: false
            referencedRelation: "disciplines"
            referencedColumns: ["academy_id", "id"]
          },
          {
            foreignKeyName: "class_templates_academy_id_fkey"
            columns: ["academy_id"]
            isOneToOne: false
            referencedRelation: "academies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_templates_academy_id_instructor_id_fkey"
            columns: ["academy_id", "instructor_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["academy_id", "id"]
          },
          {
            foreignKeyName: "class_templates_academy_id_room_id_fkey"
            columns: ["academy_id", "room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["academy_id", "id"]
          },
        ]
      }
      classes: {
        Row: {
          academy_id: string
          age_group: string | null
          branch_id: string
          capacity: number
          created_at: string
          discipline_id: string
          ends_at: string
          id: string
          instructor_id: string
          kind: string
          level: string | null
          name: string
          reason: string | null
          room_id: string
          starts_at: string
          status: string
          substitute_id: string | null
          template_id: string | null
        }
        Insert: {
          academy_id: string
          age_group?: string | null
          branch_id: string
          capacity: number
          created_at?: string
          discipline_id: string
          ends_at: string
          id?: string
          instructor_id: string
          kind?: string
          level?: string | null
          name: string
          reason?: string | null
          room_id: string
          starts_at: string
          status?: string
          substitute_id?: string | null
          template_id?: string | null
        }
        Update: {
          academy_id?: string
          age_group?: string | null
          branch_id?: string
          capacity?: number
          created_at?: string
          discipline_id?: string
          ends_at?: string
          id?: string
          instructor_id?: string
          kind?: string
          level?: string | null
          name?: string
          reason?: string | null
          room_id?: string
          starts_at?: string
          status?: string
          substitute_id?: string | null
          template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "classes_academy_id_branch_id_fkey"
            columns: ["academy_id", "branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["academy_id", "id"]
          },
          {
            foreignKeyName: "classes_academy_id_discipline_id_fkey"
            columns: ["academy_id", "discipline_id"]
            isOneToOne: false
            referencedRelation: "disciplines"
            referencedColumns: ["academy_id", "id"]
          },
          {
            foreignKeyName: "classes_academy_id_fkey"
            columns: ["academy_id"]
            isOneToOne: false
            referencedRelation: "academies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classes_academy_id_instructor_id_fkey"
            columns: ["academy_id", "instructor_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["academy_id", "id"]
          },
          {
            foreignKeyName: "classes_academy_id_room_id_fkey"
            columns: ["academy_id", "room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["academy_id", "id"]
          },
          {
            foreignKeyName: "classes_academy_id_substitute_id_fkey"
            columns: ["academy_id", "substitute_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["academy_id", "id"]
          },
          {
            foreignKeyName: "classes_academy_id_template_id_fkey"
            columns: ["academy_id", "template_id"]
            isOneToOne: false
            referencedRelation: "class_templates"
            referencedColumns: ["academy_id", "id"]
          },
        ]
      }
      commitments: {
        Row: {
          academy_id: string
          amount: number
          branch_id: string
          created_at: string
          due_on: string
          id: string
          notes: string
          status: string
          student_id: string
        }
        Insert: {
          academy_id: string
          amount: number
          branch_id: string
          created_at?: string
          due_on: string
          id?: string
          notes: string
          status?: string
          student_id: string
        }
        Update: {
          academy_id?: string
          amount?: number
          branch_id?: string
          created_at?: string
          due_on?: string
          id?: string
          notes?: string
          status?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "commitments_academy_id_branch_id_fkey"
            columns: ["academy_id", "branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["academy_id", "id"]
          },
          {
            foreignKeyName: "commitments_academy_id_fkey"
            columns: ["academy_id"]
            isOneToOne: false
            referencedRelation: "academies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commitments_academy_id_student_id_fkey"
            columns: ["academy_id", "student_id"]
            isOneToOne: false
            referencedRelation: "student_activity"
            referencedColumns: ["academy_id", "id"]
          },
          {
            foreignKeyName: "commitments_academy_id_student_id_fkey"
            columns: ["academy_id", "student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["academy_id", "id"]
          },
        ]
      }
      compensation_versions: {
        Row: {
          academy_id: string
          accrual: string
          class_rate: number
          created_at: string
          effective_on: string
          employee_id: string
          fixed_amount: number
          hourly_rate: number
          id: string
          private_percent: number
          sale_percent: number
        }
        Insert: {
          academy_id: string
          accrual?: string
          class_rate?: number
          created_at?: string
          effective_on: string
          employee_id: string
          fixed_amount?: number
          hourly_rate?: number
          id?: string
          private_percent?: number
          sale_percent?: number
        }
        Update: {
          academy_id?: string
          accrual?: string
          class_rate?: number
          created_at?: string
          effective_on?: string
          employee_id?: string
          fixed_amount?: number
          hourly_rate?: number
          id?: string
          private_percent?: number
          sale_percent?: number
        }
        Relationships: [
          {
            foreignKeyName: "compensation_versions_academy_id_employee_id_fkey"
            columns: ["academy_id", "employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["academy_id", "id"]
          },
          {
            foreignKeyName: "compensation_versions_academy_id_fkey"
            columns: ["academy_id"]
            isOneToOne: false
            referencedRelation: "academies"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          academy_id: string
          address: string | null
          created_at: string
          email: string | null
          id: string
          linked_user_id: string | null
          name: string
          phone: string | null
        }
        Insert: {
          academy_id: string
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          linked_user_id?: string | null
          name: string
          phone?: string | null
        }
        Update: {
          academy_id?: string
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          linked_user_id?: string | null
          name?: string
          phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contacts_academy_id_fkey"
            columns: ["academy_id"]
            isOneToOne: false
            referencedRelation: "academies"
            referencedColumns: ["id"]
          },
        ]
      }
      disciplines: {
        Row: {
          academy_id: string
          active: boolean
          created_at: string
          id: string
          name: string
        }
        Insert: {
          academy_id: string
          active?: boolean
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          academy_id?: string
          active?: boolean
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "disciplines_academy_id_fkey"
            columns: ["academy_id"]
            isOneToOne: false
            referencedRelation: "academies"
            referencedColumns: ["id"]
          },
        ]
      }
      document_counters: {
        Row: {
          academy_id: string
          created_at: string
          id: string
          kind: string
          next_number: number
          prefix: string
        }
        Insert: {
          academy_id: string
          created_at?: string
          id?: string
          kind: string
          next_number?: number
          prefix?: string
        }
        Update: {
          academy_id?: string
          created_at?: string
          id?: string
          kind?: string
          next_number?: number
          prefix?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_counters_academy_id_fkey"
            columns: ["academy_id"]
            isOneToOne: false
            referencedRelation: "academies"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          academy_id: string
          branch_id: string
          created_at: string
          id: string
          mime_type: string
          path: string
          size_bytes: number
          student_id: string | null
          title: string
        }
        Insert: {
          academy_id: string
          branch_id: string
          created_at?: string
          id?: string
          mime_type: string
          path: string
          size_bytes: number
          student_id?: string | null
          title: string
        }
        Update: {
          academy_id?: string
          branch_id?: string
          created_at?: string
          id?: string
          mime_type?: string
          path?: string
          size_bytes?: number
          student_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_academy_id_branch_id_fkey"
            columns: ["academy_id", "branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["academy_id", "id"]
          },
          {
            foreignKeyName: "documents_academy_id_fkey"
            columns: ["academy_id"]
            isOneToOne: false
            referencedRelation: "academies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_academy_id_student_id_fkey"
            columns: ["academy_id", "student_id"]
            isOneToOne: false
            referencedRelation: "student_activity"
            referencedColumns: ["academy_id", "id"]
          },
          {
            foreignKeyName: "documents_academy_id_student_id_fkey"
            columns: ["academy_id", "student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["academy_id", "id"]
          },
        ]
      }
      employees: {
        Row: {
          academy_id: string
          branch_id: string
          created_at: string
          email: string | null
          id: string
          linked_user_id: string | null
          name: string
          phone: string | null
          position: string
          status: string
        }
        Insert: {
          academy_id: string
          branch_id: string
          created_at?: string
          email?: string | null
          id?: string
          linked_user_id?: string | null
          name: string
          phone?: string | null
          position: string
          status?: string
        }
        Update: {
          academy_id?: string
          branch_id?: string
          created_at?: string
          email?: string | null
          id?: string
          linked_user_id?: string | null
          name?: string
          phone?: string | null
          position?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "employees_academy_id_branch_id_fkey"
            columns: ["academy_id", "branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["academy_id", "id"]
          },
          {
            foreignKeyName: "employees_academy_id_fkey"
            columns: ["academy_id"]
            isOneToOne: false
            referencedRelation: "academies"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment: {
        Row: {
          academy_id: string
          branch_id: string
          created_at: string
          id: string
          location: string
          maintenance_on: string | null
          name: string
          notes: string | null
          status: string
          variant_id: string | null
        }
        Insert: {
          academy_id: string
          branch_id: string
          created_at?: string
          id?: string
          location: string
          maintenance_on?: string | null
          name: string
          notes?: string | null
          status?: string
          variant_id?: string | null
        }
        Update: {
          academy_id?: string
          branch_id?: string
          created_at?: string
          id?: string
          location?: string
          maintenance_on?: string | null
          name?: string
          notes?: string | null
          status?: string
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "equipment_academy_id_branch_id_fkey"
            columns: ["academy_id", "branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["academy_id", "id"]
          },
          {
            foreignKeyName: "equipment_academy_id_fkey"
            columns: ["academy_id"]
            isOneToOne: false
            referencedRelation: "academies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_academy_id_variant_id_fkey"
            columns: ["academy_id", "variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["academy_id", "id"]
          },
        ]
      }
      expense_adjustments: {
        Row: {
          academy_id: string
          actor: string
          amount: number
          branch_id: string
          created_at: string
          expense_id: string
          id: string
          reason: string
        }
        Insert: {
          academy_id: string
          actor: string
          amount: number
          branch_id: string
          created_at?: string
          expense_id: string
          id?: string
          reason: string
        }
        Update: {
          academy_id?: string
          actor?: string
          amount?: number
          branch_id?: string
          created_at?: string
          expense_id?: string
          id?: string
          reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "expense_adjustments_academy_id_branch_id_fkey"
            columns: ["academy_id", "branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["academy_id", "id"]
          },
          {
            foreignKeyName: "expense_adjustments_academy_id_expense_id_fkey"
            columns: ["academy_id", "expense_id"]
            isOneToOne: false
            referencedRelation: "expense_balances"
            referencedColumns: ["academy_id", "id"]
          },
          {
            foreignKeyName: "expense_adjustments_academy_id_expense_id_fkey"
            columns: ["academy_id", "expense_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["academy_id", "id"]
          },
          {
            foreignKeyName: "expense_adjustments_academy_id_fkey"
            columns: ["academy_id"]
            isOneToOne: false
            referencedRelation: "academies"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_categories: {
        Row: {
          academy_id: string
          active: boolean
          created_at: string
          id: string
          name: string
        }
        Insert: {
          academy_id: string
          active?: boolean
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          academy_id?: string
          active?: boolean
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "expense_categories_academy_id_fkey"
            columns: ["academy_id"]
            isOneToOne: false
            referencedRelation: "academies"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_payments: {
        Row: {
          academy_id: string
          account_id: string
          actor: string
          amount: number
          branch_id: string
          created_at: string
          expense_id: string
          id: string
          session_id: string | null
        }
        Insert: {
          academy_id: string
          account_id: string
          actor: string
          amount: number
          branch_id: string
          created_at?: string
          expense_id: string
          id?: string
          session_id?: string | null
        }
        Update: {
          academy_id?: string
          account_id?: string
          actor?: string
          amount?: number
          branch_id?: string
          created_at?: string
          expense_id?: string
          id?: string
          session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expense_payments_academy_id_account_id_fkey"
            columns: ["academy_id", "account_id"]
            isOneToOne: false
            referencedRelation: "account_balances"
            referencedColumns: ["academy_id", "id"]
          },
          {
            foreignKeyName: "expense_payments_academy_id_account_id_fkey"
            columns: ["academy_id", "account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["academy_id", "id"]
          },
          {
            foreignKeyName: "expense_payments_academy_id_branch_id_fkey"
            columns: ["academy_id", "branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["academy_id", "id"]
          },
          {
            foreignKeyName: "expense_payments_academy_id_expense_id_fkey"
            columns: ["academy_id", "expense_id"]
            isOneToOne: false
            referencedRelation: "expense_balances"
            referencedColumns: ["academy_id", "id"]
          },
          {
            foreignKeyName: "expense_payments_academy_id_expense_id_fkey"
            columns: ["academy_id", "expense_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["academy_id", "id"]
          },
          {
            foreignKeyName: "expense_payments_academy_id_fkey"
            columns: ["academy_id"]
            isOneToOne: false
            referencedRelation: "academies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_payments_academy_id_session_id_fkey"
            columns: ["academy_id", "session_id"]
            isOneToOne: false
            referencedRelation: "cash_sessions"
            referencedColumns: ["academy_id", "id"]
          },
        ]
      }
      expense_refunds: {
        Row: {
          academy_id: string
          account_id: string
          actor: string
          amount: number
          branch_id: string
          created_at: string
          expense_id: string
          id: string
          reference: string
        }
        Insert: {
          academy_id: string
          account_id: string
          actor: string
          amount: number
          branch_id: string
          created_at?: string
          expense_id: string
          id?: string
          reference: string
        }
        Update: {
          academy_id?: string
          account_id?: string
          actor?: string
          amount?: number
          branch_id?: string
          created_at?: string
          expense_id?: string
          id?: string
          reference?: string
        }
        Relationships: [
          {
            foreignKeyName: "expense_refunds_academy_id_account_id_fkey"
            columns: ["academy_id", "account_id"]
            isOneToOne: false
            referencedRelation: "account_balances"
            referencedColumns: ["academy_id", "id"]
          },
          {
            foreignKeyName: "expense_refunds_academy_id_account_id_fkey"
            columns: ["academy_id", "account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["academy_id", "id"]
          },
          {
            foreignKeyName: "expense_refunds_academy_id_branch_id_fkey"
            columns: ["academy_id", "branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["academy_id", "id"]
          },
          {
            foreignKeyName: "expense_refunds_academy_id_expense_id_fkey"
            columns: ["academy_id", "expense_id"]
            isOneToOne: false
            referencedRelation: "expense_balances"
            referencedColumns: ["academy_id", "id"]
          },
          {
            foreignKeyName: "expense_refunds_academy_id_expense_id_fkey"
            columns: ["academy_id", "expense_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["academy_id", "id"]
          },
          {
            foreignKeyName: "expense_refunds_academy_id_fkey"
            columns: ["academy_id"]
            isOneToOne: false
            referencedRelation: "academies"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_templates: {
        Row: {
          academy_id: string
          active: boolean
          amount: number
          branch_id: string
          category: string
          created_at: string
          description: string
          id: string
          months: number
          next_due_on: string
        }
        Insert: {
          academy_id: string
          active?: boolean
          amount: number
          branch_id: string
          category: string
          created_at?: string
          description: string
          id?: string
          months?: number
          next_due_on: string
        }
        Update: {
          academy_id?: string
          active?: boolean
          amount?: number
          branch_id?: string
          category?: string
          created_at?: string
          description?: string
          id?: string
          months?: number
          next_due_on?: string
        }
        Relationships: [
          {
            foreignKeyName: "expense_templates_academy_id_branch_id_fkey"
            columns: ["academy_id", "branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["academy_id", "id"]
          },
          {
            foreignKeyName: "expense_templates_academy_id_fkey"
            columns: ["academy_id"]
            isOneToOne: false
            referencedRelation: "academies"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          academy_id: string
          amount: number
          approved_by: string | null
          branch_id: string
          category: string
          category_id: string | null
          created_at: string
          description: string
          document_path: string | null
          due_on: string
          id: string
          incurred_on: string
          source: string
          source_id: string | null
          status: string
          supplier_id: string | null
        }
        Insert: {
          academy_id: string
          amount: number
          approved_by?: string | null
          branch_id: string
          category: string
          category_id?: string | null
          created_at?: string
          description: string
          document_path?: string | null
          due_on: string
          id?: string
          incurred_on: string
          source?: string
          source_id?: string | null
          status?: string
          supplier_id?: string | null
        }
        Update: {
          academy_id?: string
          amount?: number
          approved_by?: string | null
          branch_id?: string
          category?: string
          category_id?: string | null
          created_at?: string
          description?: string
          document_path?: string | null
          due_on?: string
          id?: string
          incurred_on?: string
          source?: string
          source_id?: string | null
          status?: string
          supplier_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_academy_id_branch_id_fkey"
            columns: ["academy_id", "branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["academy_id", "id"]
          },
          {
            foreignKeyName: "expenses_academy_id_category_id_fkey"
            columns: ["academy_id", "category_id"]
            isOneToOne: false
            referencedRelation: "expense_categories"
            referencedColumns: ["academy_id", "id"]
          },
          {
            foreignKeyName: "expenses_academy_id_fkey"
            columns: ["academy_id"]
            isOneToOne: false
            referencedRelation: "academies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_academy_id_supplier_id_fkey"
            columns: ["academy_id", "supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["academy_id", "id"]
          },
        ]
      }
      holidays: {
        Row: {
          academy_id: string
          branch_id: string
          created_at: string
          day: string
          id: string
          reason: string
        }
        Insert: {
          academy_id: string
          branch_id: string
          created_at?: string
          day: string
          id?: string
          reason: string
        }
        Update: {
          academy_id?: string
          branch_id?: string
          created_at?: string
          day?: string
          id?: string
          reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "holidays_academy_id_branch_id_fkey"
            columns: ["academy_id", "branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["academy_id", "id"]
          },
          {
            foreignKeyName: "holidays_academy_id_fkey"
            columns: ["academy_id"]
            isOneToOne: false
            referencedRelation: "academies"
            referencedColumns: ["id"]
          },
        ]
      }
      internal_members: {
        Row: {
          academy_id: string
          active: boolean
          all_branches: boolean
          branch_ids: string[]
          created_at: string
          id: string
          name: string
          user_id: string
        }
        Insert: {
          academy_id: string
          active?: boolean
          all_branches?: boolean
          branch_ids?: string[]
          created_at?: string
          id?: string
          name: string
          user_id: string
        }
        Update: {
          academy_id?: string
          active?: boolean
          all_branches?: boolean
          branch_ids?: string[]
          created_at?: string
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "internal_members_academy_id_fkey"
            columns: ["academy_id"]
            isOneToOne: false
            referencedRelation: "academies"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_movements: {
        Row: {
          academy_id: string
          actor: string
          branch_id: string
          created_at: string
          id: string
          kind: string
          quantity: number
          reason: string
          source_id: string
          unit_cost: number
          variant_id: string
        }
        Insert: {
          academy_id: string
          actor: string
          branch_id: string
          created_at?: string
          id?: string
          kind: string
          quantity: number
          reason: string
          source_id: string
          unit_cost: number
          variant_id: string
        }
        Update: {
          academy_id?: string
          actor?: string
          branch_id?: string
          created_at?: string
          id?: string
          kind?: string
          quantity?: number
          reason?: string
          source_id?: string
          unit_cost?: number
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_movements_academy_id_branch_id_fkey"
            columns: ["academy_id", "branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["academy_id", "id"]
          },
          {
            foreignKeyName: "inventory_movements_academy_id_fkey"
            columns: ["academy_id"]
            isOneToOne: false
            referencedRelation: "academies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_academy_id_variant_id_fkey"
            columns: ["academy_id", "variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["academy_id", "id"]
          },
        ]
      }
      job_runs: {
        Row: {
          academy_id: string
          created_at: string
          error: string | null
          finished_at: string | null
          generated: number
          id: string
          remaining: boolean
          started_at: string
        }
        Insert: {
          academy_id: string
          created_at?: string
          error?: string | null
          finished_at?: string | null
          generated?: number
          id?: string
          remaining?: boolean
          started_at?: string
        }
        Update: {
          academy_id?: string
          created_at?: string
          error?: string | null
          finished_at?: string | null
          generated?: number
          id?: string
          remaining?: boolean
          started_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_runs_academy_id_fkey"
            columns: ["academy_id"]
            isOneToOne: false
            referencedRelation: "academies"
            referencedColumns: ["id"]
          },
        ]
      }
      member_roles: {
        Row: {
          academy_id: string
          created_at: string
          id: string
          member_id: string
          role_id: string
        }
        Insert: {
          academy_id: string
          created_at?: string
          id?: string
          member_id: string
          role_id: string
        }
        Update: {
          academy_id?: string
          created_at?: string
          id?: string
          member_id?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_roles_academy_id_fkey"
            columns: ["academy_id"]
            isOneToOne: false
            referencedRelation: "academies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_roles_academy_id_member_id_fkey"
            columns: ["academy_id", "member_id"]
            isOneToOne: false
            referencedRelation: "internal_members"
            referencedColumns: ["academy_id", "id"]
          },
          {
            foreignKeyName: "member_roles_academy_id_role_id_fkey"
            columns: ["academy_id", "role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["academy_id", "id"]
          },
        ]
      }
      membership_events: {
        Row: {
          academy_id: string
          action: string
          actor: string | null
          created_at: string
          effective_on: string
          id: string
          membership_id: string
          reason: string
        }
        Insert: {
          academy_id: string
          action: string
          actor?: string | null
          created_at?: string
          effective_on: string
          id?: string
          membership_id: string
          reason: string
        }
        Update: {
          academy_id?: string
          action?: string
          actor?: string | null
          created_at?: string
          effective_on?: string
          id?: string
          membership_id?: string
          reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "membership_events_academy_id_fkey"
            columns: ["academy_id"]
            isOneToOne: false
            referencedRelation: "academies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "membership_events_academy_id_membership_id_fkey"
            columns: ["academy_id", "membership_id"]
            isOneToOne: false
            referencedRelation: "memberships"
            referencedColumns: ["academy_id", "id"]
          },
        ]
      }
      memberships: {
        Row: {
          academy_id: string
          anchor_day: number
          billing_mode: string
          branch_id: string
          canceled_on: string | null
          created_at: string
          discount: number
          ends_on: string
          frozen_until: string | null
          id: string
          next_charge_on: string
          plan_version_id: string
          remaining_classes: number | null
          starts_on: string
          status: string
          student_id: string
        }
        Insert: {
          academy_id: string
          anchor_day: number
          billing_mode?: string
          branch_id: string
          canceled_on?: string | null
          created_at?: string
          discount?: number
          ends_on: string
          frozen_until?: string | null
          id?: string
          next_charge_on: string
          plan_version_id: string
          remaining_classes?: number | null
          starts_on: string
          status?: string
          student_id: string
        }
        Update: {
          academy_id?: string
          anchor_day?: number
          billing_mode?: string
          branch_id?: string
          canceled_on?: string | null
          created_at?: string
          discount?: number
          ends_on?: string
          frozen_until?: string | null
          id?: string
          next_charge_on?: string
          plan_version_id?: string
          remaining_classes?: number | null
          starts_on?: string
          status?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memberships_academy_id_branch_id_fkey"
            columns: ["academy_id", "branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["academy_id", "id"]
          },
          {
            foreignKeyName: "memberships_academy_id_fkey"
            columns: ["academy_id"]
            isOneToOne: false
            referencedRelation: "academies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memberships_academy_id_plan_version_id_fkey"
            columns: ["academy_id", "plan_version_id"]
            isOneToOne: false
            referencedRelation: "plan_versions"
            referencedColumns: ["academy_id", "id"]
          },
          {
            foreignKeyName: "memberships_academy_id_student_id_fkey"
            columns: ["academy_id", "student_id"]
            isOneToOne: false
            referencedRelation: "student_activity"
            referencedColumns: ["academy_id", "id"]
          },
          {
            foreignKeyName: "memberships_academy_id_student_id_fkey"
            columns: ["academy_id", "student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["academy_id", "id"]
          },
        ]
      }
      notifications: {
        Row: {
          academy_id: string
          branch_id: string | null
          created_at: string
          entity_id: string | null
          id: string
          kind: string
          read_at: string | null
          title: string
        }
        Insert: {
          academy_id: string
          branch_id?: string | null
          created_at?: string
          entity_id?: string | null
          id?: string
          kind: string
          read_at?: string | null
          title: string
        }
        Update: {
          academy_id?: string
          branch_id?: string | null
          created_at?: string
          entity_id?: string | null
          id?: string
          kind?: string
          read_at?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_academy_id_branch_id_fkey"
            columns: ["academy_id", "branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["academy_id", "id"]
          },
          {
            foreignKeyName: "notifications_academy_id_fkey"
            columns: ["academy_id"]
            isOneToOne: false
            referencedRelation: "academies"
            referencedColumns: ["id"]
          },
        ]
      }
      operation_keys: {
        Row: {
          academy_id: string
          action: string
          created_at: string
          id: string
          key: string
          payload: Json
          result: Json | null
        }
        Insert: {
          academy_id: string
          action: string
          created_at?: string
          id?: string
          key: string
          payload: Json
          result?: Json | null
        }
        Update: {
          academy_id?: string
          action?: string
          created_at?: string
          id?: string
          key?: string
          payload?: Json
          result?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "operation_keys_academy_id_fkey"
            columns: ["academy_id"]
            isOneToOne: false
            referencedRelation: "academies"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_applications: {
        Row: {
          academy_id: string
          amount: number
          charge_id: string
          confirmed: boolean
          created_at: string
          id: string
          payment_id: string
        }
        Insert: {
          academy_id: string
          amount: number
          charge_id: string
          confirmed?: boolean
          created_at?: string
          id?: string
          payment_id: string
        }
        Update: {
          academy_id?: string
          amount?: number
          charge_id?: string
          confirmed?: boolean
          created_at?: string
          id?: string
          payment_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_applications_academy_id_charge_id_fkey"
            columns: ["academy_id", "charge_id"]
            isOneToOne: false
            referencedRelation: "charge_balances"
            referencedColumns: ["academy_id", "id"]
          },
          {
            foreignKeyName: "payment_applications_academy_id_charge_id_fkey"
            columns: ["academy_id", "charge_id"]
            isOneToOne: false
            referencedRelation: "charges"
            referencedColumns: ["academy_id", "id"]
          },
          {
            foreignKeyName: "payment_applications_academy_id_charge_id_fkey"
            columns: ["academy_id", "charge_id"]
            isOneToOne: false
            referencedRelation: "debt_report"
            referencedColumns: ["academy_id", "id"]
          },
          {
            foreignKeyName: "payment_applications_academy_id_fkey"
            columns: ["academy_id"]
            isOneToOne: false
            referencedRelation: "academies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_applications_academy_id_payment_id_fkey"
            columns: ["academy_id", "payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["academy_id", "id"]
          },
        ]
      }
      payment_methods: {
        Row: {
          academy_id: string
          active: boolean
          created_at: string
          fee_fixed: number
          fee_percent: number
          id: string
          kind: string
          name: string
          requires_verification: boolean
        }
        Insert: {
          academy_id: string
          active?: boolean
          created_at?: string
          fee_fixed?: number
          fee_percent?: number
          id?: string
          kind: string
          name: string
          requires_verification?: boolean
        }
        Update: {
          academy_id?: string
          active?: boolean
          created_at?: string
          fee_fixed?: number
          fee_percent?: number
          id?: string
          kind?: string
          name?: string
          requires_verification?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "payment_methods_academy_id_fkey"
            columns: ["academy_id"]
            isOneToOne: false
            referencedRelation: "academies"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          academy_id: string
          account_id: string
          actor: string
          amount: number
          branch_id: string
          created_at: string
          fee: number
          id: string
          method_id: string
          payer_id: string | null
          receipt_number: number
          receipt_prefix: string
          reference: string | null
          session_id: string | null
          status: string
          student_id: string | null
          tendered: number
        }
        Insert: {
          academy_id: string
          account_id: string
          actor: string
          amount: number
          branch_id: string
          created_at?: string
          fee?: number
          id?: string
          method_id: string
          payer_id?: string | null
          receipt_number: number
          receipt_prefix?: string
          reference?: string | null
          session_id?: string | null
          status: string
          student_id?: string | null
          tendered: number
        }
        Update: {
          academy_id?: string
          account_id?: string
          actor?: string
          amount?: number
          branch_id?: string
          created_at?: string
          fee?: number
          id?: string
          method_id?: string
          payer_id?: string | null
          receipt_number?: number
          receipt_prefix?: string
          reference?: string | null
          session_id?: string | null
          status?: string
          student_id?: string | null
          tendered?: number
        }
        Relationships: [
          {
            foreignKeyName: "payments_academy_id_account_id_fkey"
            columns: ["academy_id", "account_id"]
            isOneToOne: false
            referencedRelation: "account_balances"
            referencedColumns: ["academy_id", "id"]
          },
          {
            foreignKeyName: "payments_academy_id_account_id_fkey"
            columns: ["academy_id", "account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["academy_id", "id"]
          },
          {
            foreignKeyName: "payments_academy_id_branch_id_fkey"
            columns: ["academy_id", "branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["academy_id", "id"]
          },
          {
            foreignKeyName: "payments_academy_id_fkey"
            columns: ["academy_id"]
            isOneToOne: false
            referencedRelation: "academies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_academy_id_method_id_fkey"
            columns: ["academy_id", "method_id"]
            isOneToOne: false
            referencedRelation: "payment_methods"
            referencedColumns: ["academy_id", "id"]
          },
          {
            foreignKeyName: "payments_academy_id_payer_id_fkey"
            columns: ["academy_id", "payer_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["academy_id", "id"]
          },
          {
            foreignKeyName: "payments_academy_id_session_id_fkey"
            columns: ["academy_id", "session_id"]
            isOneToOne: false
            referencedRelation: "cash_sessions"
            referencedColumns: ["academy_id", "id"]
          },
          {
            foreignKeyName: "payments_academy_id_student_id_fkey"
            columns: ["academy_id", "student_id"]
            isOneToOne: false
            referencedRelation: "student_activity"
            referencedColumns: ["academy_id", "id"]
          },
          {
            foreignKeyName: "payments_academy_id_student_id_fkey"
            columns: ["academy_id", "student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["academy_id", "id"]
          },
        ]
      }
      plan_versions: {
        Row: {
          academy_id: string
          class_count: number | null
          created_at: string
          effective_on: string
          id: string
          months: number
          plan_id: string
          price: number
          renewable: boolean
          valid_days: number
          weekly_limit: number | null
        }
        Insert: {
          academy_id: string
          class_count?: number | null
          created_at?: string
          effective_on: string
          id?: string
          months?: number
          plan_id: string
          price: number
          renewable?: boolean
          valid_days?: number
          weekly_limit?: number | null
        }
        Update: {
          academy_id?: string
          class_count?: number | null
          created_at?: string
          effective_on?: string
          id?: string
          months?: number
          plan_id?: string
          price?: number
          renewable?: boolean
          valid_days?: number
          weekly_limit?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "plan_versions_academy_id_fkey"
            columns: ["academy_id"]
            isOneToOne: false
            referencedRelation: "academies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_versions_academy_id_plan_id_fkey"
            columns: ["academy_id", "plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["academy_id", "id"]
          },
        ]
      }
      plans: {
        Row: {
          academy_id: string
          active: boolean
          branch_id: string | null
          created_at: string
          discipline_id: string | null
          id: string
          kind: string
          name: string
        }
        Insert: {
          academy_id: string
          active?: boolean
          branch_id?: string | null
          created_at?: string
          discipline_id?: string | null
          id?: string
          kind: string
          name: string
        }
        Update: {
          academy_id?: string
          active?: boolean
          branch_id?: string | null
          created_at?: string
          discipline_id?: string | null
          id?: string
          kind?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "plans_academy_id_branch_id_fkey"
            columns: ["academy_id", "branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["academy_id", "id"]
          },
          {
            foreignKeyName: "plans_academy_id_discipline_id_fkey"
            columns: ["academy_id", "discipline_id"]
            isOneToOne: false
            referencedRelation: "disciplines"
            referencedColumns: ["academy_id", "id"]
          },
          {
            foreignKeyName: "plans_academy_id_fkey"
            columns: ["academy_id"]
            isOneToOne: false
            referencedRelation: "academies"
            referencedColumns: ["id"]
          },
        ]
      }
      product_categories: {
        Row: {
          academy_id: string
          active: boolean
          created_at: string
          id: string
          name: string
        }
        Insert: {
          academy_id: string
          active?: boolean
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          academy_id?: string
          active?: boolean
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_categories_academy_id_fkey"
            columns: ["academy_id"]
            isOneToOne: false
            referencedRelation: "academies"
            referencedColumns: ["id"]
          },
        ]
      }
      product_prices: {
        Row: {
          academy_id: string
          created_at: string
          effective_on: string
          id: string
          price: number
          variant_id: string
        }
        Insert: {
          academy_id: string
          created_at?: string
          effective_on: string
          id?: string
          price: number
          variant_id: string
        }
        Update: {
          academy_id?: string
          created_at?: string
          effective_on?: string
          id?: string
          price?: number
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_prices_academy_id_fkey"
            columns: ["academy_id"]
            isOneToOne: false
            referencedRelation: "academies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_prices_academy_id_variant_id_fkey"
            columns: ["academy_id", "variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["academy_id", "id"]
          },
        ]
      }
      product_variants: {
        Row: {
          academy_id: string
          active: boolean
          code: string
          color: string | null
          created_at: string
          id: string
          min_stock: number
          name: string
          price: number
          product_id: string
          size: string | null
          unit: string
        }
        Insert: {
          academy_id: string
          active?: boolean
          code: string
          color?: string | null
          created_at?: string
          id?: string
          min_stock?: number
          name: string
          price: number
          product_id: string
          size?: string | null
          unit?: string
        }
        Update: {
          academy_id?: string
          active?: boolean
          code?: string
          color?: string | null
          created_at?: string
          id?: string
          min_stock?: number
          name?: string
          price?: number
          product_id?: string
          size?: string | null
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_academy_id_fkey"
            columns: ["academy_id"]
            isOneToOne: false
            referencedRelation: "academies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_variants_academy_id_product_id_fkey"
            columns: ["academy_id", "product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["academy_id", "id"]
          },
        ]
      }
      products: {
        Row: {
          academy_id: string
          active: boolean
          category_id: string | null
          created_at: string
          id: string
          kind: string
          name: string
        }
        Insert: {
          academy_id: string
          active?: boolean
          category_id?: string | null
          created_at?: string
          id?: string
          kind?: string
          name: string
        }
        Update: {
          academy_id?: string
          active?: boolean
          category_id?: string | null
          created_at?: string
          id?: string
          kind?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_academy_id_category_id_fkey"
            columns: ["academy_id", "category_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["academy_id", "id"]
          },
          {
            foreignKeyName: "products_academy_id_fkey"
            columns: ["academy_id"]
            isOneToOne: false
            referencedRelation: "academies"
            referencedColumns: ["id"]
          },
        ]
      }
      prospects: {
        Row: {
          academy_id: string
          branch_id: string
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          status: string
          student_id: string | null
          trial_at: string | null
        }
        Insert: {
          academy_id: string
          branch_id: string
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          status?: string
          student_id?: string | null
          trial_at?: string | null
        }
        Update: {
          academy_id?: string
          branch_id?: string
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          status?: string
          student_id?: string | null
          trial_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prospects_academy_id_branch_id_fkey"
            columns: ["academy_id", "branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["academy_id", "id"]
          },
          {
            foreignKeyName: "prospects_academy_id_fkey"
            columns: ["academy_id"]
            isOneToOne: false
            referencedRelation: "academies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prospects_academy_id_student_id_fkey"
            columns: ["academy_id", "student_id"]
            isOneToOne: false
            referencedRelation: "student_activity"
            referencedColumns: ["academy_id", "id"]
          },
          {
            foreignKeyName: "prospects_academy_id_student_id_fkey"
            columns: ["academy_id", "student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["academy_id", "id"]
          },
        ]
      }
      purchase_lines: {
        Row: {
          academy_id: string
          created_at: string
          id: string
          purchase_id: string
          quantity: number
          received: number
          returned: number
          unit_cost: number
          variant_id: string
        }
        Insert: {
          academy_id: string
          created_at?: string
          id?: string
          purchase_id: string
          quantity: number
          received?: number
          returned?: number
          unit_cost: number
          variant_id: string
        }
        Update: {
          academy_id?: string
          created_at?: string
          id?: string
          purchase_id?: string
          quantity?: number
          received?: number
          returned?: number
          unit_cost?: number
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_lines_academy_id_fkey"
            columns: ["academy_id"]
            isOneToOne: false
            referencedRelation: "academies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_lines_academy_id_purchase_id_fkey"
            columns: ["academy_id", "purchase_id"]
            isOneToOne: false
            referencedRelation: "purchases"
            referencedColumns: ["academy_id", "id"]
          },
          {
            foreignKeyName: "purchase_lines_academy_id_variant_id_fkey"
            columns: ["academy_id", "variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["academy_id", "id"]
          },
        ]
      }
      purchases: {
        Row: {
          academy_id: string
          branch_id: string
          created_at: string
          expense_id: string
          id: string
          ordered_on: string
          reference: string | null
          status: string
          supplier_id: string
        }
        Insert: {
          academy_id: string
          branch_id: string
          created_at?: string
          expense_id: string
          id?: string
          ordered_on: string
          reference?: string | null
          status?: string
          supplier_id: string
        }
        Update: {
          academy_id?: string
          branch_id?: string
          created_at?: string
          expense_id?: string
          id?: string
          ordered_on?: string
          reference?: string | null
          status?: string
          supplier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchases_academy_id_branch_id_fkey"
            columns: ["academy_id", "branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["academy_id", "id"]
          },
          {
            foreignKeyName: "purchases_academy_id_expense_id_fkey"
            columns: ["academy_id", "expense_id"]
            isOneToOne: false
            referencedRelation: "expense_balances"
            referencedColumns: ["academy_id", "id"]
          },
          {
            foreignKeyName: "purchases_academy_id_expense_id_fkey"
            columns: ["academy_id", "expense_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["academy_id", "id"]
          },
          {
            foreignKeyName: "purchases_academy_id_fkey"
            columns: ["academy_id"]
            isOneToOne: false
            referencedRelation: "academies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_academy_id_supplier_id_fkey"
            columns: ["academy_id", "supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["academy_id", "id"]
          },
        ]
      }
      refund_applications: {
        Row: {
          academy_id: string
          amount: number
          application_id: string
          created_at: string
          id: string
          refund_id: string
        }
        Insert: {
          academy_id: string
          amount: number
          application_id: string
          created_at?: string
          id?: string
          refund_id: string
        }
        Update: {
          academy_id?: string
          amount?: number
          application_id?: string
          created_at?: string
          id?: string
          refund_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "refund_applications_academy_id_application_id_fkey"
            columns: ["academy_id", "application_id"]
            isOneToOne: false
            referencedRelation: "payment_applications"
            referencedColumns: ["academy_id", "id"]
          },
          {
            foreignKeyName: "refund_applications_academy_id_fkey"
            columns: ["academy_id"]
            isOneToOne: false
            referencedRelation: "academies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refund_applications_academy_id_refund_id_fkey"
            columns: ["academy_id", "refund_id"]
            isOneToOne: false
            referencedRelation: "refunds"
            referencedColumns: ["academy_id", "id"]
          },
        ]
      }
      refunds: {
        Row: {
          academy_id: string
          actor: string
          amount: number
          branch_id: string
          created_at: string
          id: string
          payment_id: string
          reason: string
        }
        Insert: {
          academy_id: string
          actor: string
          amount: number
          branch_id: string
          created_at?: string
          id?: string
          payment_id: string
          reason: string
        }
        Update: {
          academy_id?: string
          actor?: string
          amount?: number
          branch_id?: string
          created_at?: string
          id?: string
          payment_id?: string
          reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "refunds_academy_id_branch_id_fkey"
            columns: ["academy_id", "branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["academy_id", "id"]
          },
          {
            foreignKeyName: "refunds_academy_id_fkey"
            columns: ["academy_id"]
            isOneToOne: false
            referencedRelation: "academies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refunds_academy_id_payment_id_fkey"
            columns: ["academy_id", "payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["academy_id", "id"]
          },
        ]
      }
      reservations: {
        Row: {
          academy_id: string
          branch_id: string
          class_id: string
          created_at: string
          id: string
          status: string
          student_id: string
        }
        Insert: {
          academy_id: string
          branch_id: string
          class_id: string
          created_at?: string
          id?: string
          status: string
          student_id: string
        }
        Update: {
          academy_id?: string
          branch_id?: string
          class_id?: string
          created_at?: string
          id?: string
          status?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reservations_academy_id_branch_id_fkey"
            columns: ["academy_id", "branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["academy_id", "id"]
          },
          {
            foreignKeyName: "reservations_academy_id_class_id_fkey"
            columns: ["academy_id", "class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["academy_id", "id"]
          },
          {
            foreignKeyName: "reservations_academy_id_fkey"
            columns: ["academy_id"]
            isOneToOne: false
            referencedRelation: "academies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_academy_id_student_id_fkey"
            columns: ["academy_id", "student_id"]
            isOneToOne: false
            referencedRelation: "student_activity"
            referencedColumns: ["academy_id", "id"]
          },
          {
            foreignKeyName: "reservations_academy_id_student_id_fkey"
            columns: ["academy_id", "student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["academy_id", "id"]
          },
        ]
      }
      roles: {
        Row: {
          academy_id: string
          active: boolean
          created_at: string
          id: string
          name: string
          permissions: string[]
        }
        Insert: {
          academy_id: string
          active?: boolean
          created_at?: string
          id?: string
          name: string
          permissions: string[]
        }
        Update: {
          academy_id?: string
          active?: boolean
          created_at?: string
          id?: string
          name?: string
          permissions?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "roles_academy_id_fkey"
            columns: ["academy_id"]
            isOneToOne: false
            referencedRelation: "academies"
            referencedColumns: ["id"]
          },
        ]
      }
      rooms: {
        Row: {
          academy_id: string
          active: boolean
          branch_id: string
          capacity: number
          created_at: string
          id: string
          name: string
        }
        Insert: {
          academy_id: string
          active?: boolean
          branch_id: string
          capacity: number
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          academy_id?: string
          active?: boolean
          branch_id?: string
          capacity?: number
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "rooms_academy_id_branch_id_fkey"
            columns: ["academy_id", "branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["academy_id", "id"]
          },
          {
            foreignKeyName: "rooms_academy_id_fkey"
            columns: ["academy_id"]
            isOneToOne: false
            referencedRelation: "academies"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_lines: {
        Row: {
          academy_id: string
          created_at: string
          discount: number
          id: string
          quantity: number
          returned: number
          sale_id: string
          unit_cost: number
          unit_price: number
          variant_id: string
        }
        Insert: {
          academy_id: string
          created_at?: string
          discount?: number
          id?: string
          quantity: number
          returned?: number
          sale_id: string
          unit_cost: number
          unit_price: number
          variant_id: string
        }
        Update: {
          academy_id?: string
          created_at?: string
          discount?: number
          id?: string
          quantity?: number
          returned?: number
          sale_id?: string
          unit_cost?: number
          unit_price?: number
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sale_lines_academy_id_fkey"
            columns: ["academy_id"]
            isOneToOne: false
            referencedRelation: "academies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_lines_academy_id_sale_id_fkey"
            columns: ["academy_id", "sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["academy_id", "id"]
          },
          {
            foreignKeyName: "sale_lines_academy_id_sale_id_fkey"
            columns: ["academy_id", "sale_id"]
            isOneToOne: false
            referencedRelation: "sales_report"
            referencedColumns: ["academy_id", "id"]
          },
          {
            foreignKeyName: "sale_lines_academy_id_variant_id_fkey"
            columns: ["academy_id", "variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["academy_id", "id"]
          },
        ]
      }
      sales: {
        Row: {
          academy_id: string
          branch_id: string
          charge_id: string
          created_at: string
          customer_name: string | null
          discount: number
          id: string
          seller: string
          status: string
          student_id: string | null
          total: number
        }
        Insert: {
          academy_id: string
          branch_id: string
          charge_id: string
          created_at?: string
          customer_name?: string | null
          discount?: number
          id?: string
          seller: string
          status?: string
          student_id?: string | null
          total: number
        }
        Update: {
          academy_id?: string
          branch_id?: string
          charge_id?: string
          created_at?: string
          customer_name?: string | null
          discount?: number
          id?: string
          seller?: string
          status?: string
          student_id?: string | null
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "sales_academy_id_branch_id_fkey"
            columns: ["academy_id", "branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["academy_id", "id"]
          },
          {
            foreignKeyName: "sales_academy_id_charge_id_fkey"
            columns: ["academy_id", "charge_id"]
            isOneToOne: false
            referencedRelation: "charge_balances"
            referencedColumns: ["academy_id", "id"]
          },
          {
            foreignKeyName: "sales_academy_id_charge_id_fkey"
            columns: ["academy_id", "charge_id"]
            isOneToOne: false
            referencedRelation: "charges"
            referencedColumns: ["academy_id", "id"]
          },
          {
            foreignKeyName: "sales_academy_id_charge_id_fkey"
            columns: ["academy_id", "charge_id"]
            isOneToOne: false
            referencedRelation: "debt_report"
            referencedColumns: ["academy_id", "id"]
          },
          {
            foreignKeyName: "sales_academy_id_fkey"
            columns: ["academy_id"]
            isOneToOne: false
            referencedRelation: "academies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_academy_id_student_id_fkey"
            columns: ["academy_id", "student_id"]
            isOneToOne: false
            referencedRelation: "student_activity"
            referencedColumns: ["academy_id", "id"]
          },
          {
            foreignKeyName: "sales_academy_id_student_id_fkey"
            columns: ["academy_id", "student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["academy_id", "id"]
          },
        ]
      }
      settlement_lines: {
        Row: {
          academy_id: string
          activity_id: string
          amount: number
          created_at: string
          id: string
          settlement_id: string
        }
        Insert: {
          academy_id: string
          activity_id: string
          amount: number
          created_at?: string
          id?: string
          settlement_id: string
        }
        Update: {
          academy_id?: string
          activity_id?: string
          amount?: number
          created_at?: string
          id?: string
          settlement_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "settlement_lines_academy_id_activity_id_fkey"
            columns: ["academy_id", "activity_id"]
            isOneToOne: false
            referencedRelation: "staff_activities"
            referencedColumns: ["academy_id", "id"]
          },
          {
            foreignKeyName: "settlement_lines_academy_id_fkey"
            columns: ["academy_id"]
            isOneToOne: false
            referencedRelation: "academies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "settlement_lines_academy_id_settlement_id_fkey"
            columns: ["academy_id", "settlement_id"]
            isOneToOne: false
            referencedRelation: "settlements"
            referencedColumns: ["academy_id", "id"]
          },
        ]
      }
      settlements: {
        Row: {
          academy_id: string
          branch_id: string
          created_at: string
          employee_id: string
          expense_id: string
          from_on: string
          id: string
          status: string
          to_on: string
          total: number
        }
        Insert: {
          academy_id: string
          branch_id: string
          created_at?: string
          employee_id: string
          expense_id: string
          from_on: string
          id?: string
          status?: string
          to_on: string
          total: number
        }
        Update: {
          academy_id?: string
          branch_id?: string
          created_at?: string
          employee_id?: string
          expense_id?: string
          from_on?: string
          id?: string
          status?: string
          to_on?: string
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "settlements_academy_id_branch_id_fkey"
            columns: ["academy_id", "branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["academy_id", "id"]
          },
          {
            foreignKeyName: "settlements_academy_id_employee_id_fkey"
            columns: ["academy_id", "employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["academy_id", "id"]
          },
          {
            foreignKeyName: "settlements_academy_id_expense_id_fkey"
            columns: ["academy_id", "expense_id"]
            isOneToOne: false
            referencedRelation: "expense_balances"
            referencedColumns: ["academy_id", "id"]
          },
          {
            foreignKeyName: "settlements_academy_id_expense_id_fkey"
            columns: ["academy_id", "expense_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["academy_id", "id"]
          },
          {
            foreignKeyName: "settlements_academy_id_fkey"
            columns: ["academy_id"]
            isOneToOne: false
            referencedRelation: "academies"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_activities: {
        Row: {
          academy_id: string
          activity_on: string
          approved: boolean
          base_amount: number
          branch_id: string
          compensation_version_id: string
          created_at: string
          earned: number
          employee_id: string
          id: string
          kind: string
          source_id: string | null
          units: number
        }
        Insert: {
          academy_id: string
          activity_on: string
          approved?: boolean
          base_amount?: number
          branch_id: string
          compensation_version_id: string
          created_at?: string
          earned: number
          employee_id: string
          id?: string
          kind: string
          source_id?: string | null
          units?: number
        }
        Update: {
          academy_id?: string
          activity_on?: string
          approved?: boolean
          base_amount?: number
          branch_id?: string
          compensation_version_id?: string
          created_at?: string
          earned?: number
          employee_id?: string
          id?: string
          kind?: string
          source_id?: string | null
          units?: number
        }
        Relationships: [
          {
            foreignKeyName: "staff_activities_academy_id_branch_id_fkey"
            columns: ["academy_id", "branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["academy_id", "id"]
          },
          {
            foreignKeyName: "staff_activities_academy_id_compensation_version_id_fkey"
            columns: ["academy_id", "compensation_version_id"]
            isOneToOne: false
            referencedRelation: "compensation_versions"
            referencedColumns: ["academy_id", "id"]
          },
          {
            foreignKeyName: "staff_activities_academy_id_employee_id_fkey"
            columns: ["academy_id", "employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["academy_id", "id"]
          },
          {
            foreignKeyName: "staff_activities_academy_id_fkey"
            columns: ["academy_id"]
            isOneToOne: false
            referencedRelation: "academies"
            referencedColumns: ["id"]
          },
        ]
      }
      stock: {
        Row: {
          academy_id: string
          average_cost: number
          branch_id: string
          created_at: string
          id: string
          quantity: number
          variant_id: string
        }
        Insert: {
          academy_id: string
          average_cost?: number
          branch_id: string
          created_at?: string
          id?: string
          quantity?: number
          variant_id: string
        }
        Update: {
          academy_id?: string
          average_cost?: number
          branch_id?: string
          created_at?: string
          id?: string
          quantity?: number
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_academy_id_branch_id_fkey"
            columns: ["academy_id", "branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["academy_id", "id"]
          },
          {
            foreignKeyName: "stock_academy_id_fkey"
            columns: ["academy_id"]
            isOneToOne: false
            referencedRelation: "academies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_academy_id_variant_id_fkey"
            columns: ["academy_id", "variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["academy_id", "id"]
          },
        ]
      }
      stock_transfers: {
        Row: {
          academy_id: string
          branch_id: string
          created_at: string
          id: string
          quantity: number
          reason: string
          status: string
          to_branch_id: string
          unit_cost: number
          variant_id: string
        }
        Insert: {
          academy_id: string
          branch_id: string
          created_at?: string
          id?: string
          quantity: number
          reason: string
          status?: string
          to_branch_id: string
          unit_cost: number
          variant_id: string
        }
        Update: {
          academy_id?: string
          branch_id?: string
          created_at?: string
          id?: string
          quantity?: number
          reason?: string
          status?: string
          to_branch_id?: string
          unit_cost?: number
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_transfers_academy_id_branch_id_fkey"
            columns: ["academy_id", "branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["academy_id", "id"]
          },
          {
            foreignKeyName: "stock_transfers_academy_id_fkey"
            columns: ["academy_id"]
            isOneToOne: false
            referencedRelation: "academies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_transfers_academy_id_to_branch_id_fkey"
            columns: ["academy_id", "to_branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["academy_id", "id"]
          },
          {
            foreignKeyName: "stock_transfers_academy_id_variant_id_fkey"
            columns: ["academy_id", "variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["academy_id", "id"]
          },
        ]
      }
      student_groups: {
        Row: {
          academy_id: string
          active: boolean
          branch_id: string
          created_at: string
          id: string
          max_age: number | null
          min_age: number | null
          name: string
        }
        Insert: {
          academy_id: string
          active?: boolean
          branch_id: string
          created_at?: string
          id?: string
          max_age?: number | null
          min_age?: number | null
          name: string
        }
        Update: {
          academy_id?: string
          active?: boolean
          branch_id?: string
          created_at?: string
          id?: string
          max_age?: number | null
          min_age?: number | null
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_groups_academy_id_branch_id_fkey"
            columns: ["academy_id", "branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["academy_id", "id"]
          },
          {
            foreignKeyName: "student_groups_academy_id_fkey"
            columns: ["academy_id"]
            isOneToOne: false
            referencedRelation: "academies"
            referencedColumns: ["id"]
          },
        ]
      }
      student_guardians: {
        Row: {
          academy_id: string
          contact_id: string
          created_at: string
          id: string
          is_payer: boolean
          relationship: string
          student_id: string
        }
        Insert: {
          academy_id: string
          contact_id: string
          created_at?: string
          id?: string
          is_payer?: boolean
          relationship: string
          student_id: string
        }
        Update: {
          academy_id?: string
          contact_id?: string
          created_at?: string
          id?: string
          is_payer?: boolean
          relationship?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_guardians_academy_id_contact_id_fkey"
            columns: ["academy_id", "contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["academy_id", "id"]
          },
          {
            foreignKeyName: "student_guardians_academy_id_fkey"
            columns: ["academy_id"]
            isOneToOne: false
            referencedRelation: "academies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_guardians_academy_id_student_id_fkey"
            columns: ["academy_id", "student_id"]
            isOneToOne: false
            referencedRelation: "student_activity"
            referencedColumns: ["academy_id", "id"]
          },
          {
            foreignKeyName: "student_guardians_academy_id_student_id_fkey"
            columns: ["academy_id", "student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["academy_id", "id"]
          },
        ]
      }
      student_notes: {
        Row: {
          academy_id: string
          body: string
          created_at: string
          id: string
          student_id: string
        }
        Insert: {
          academy_id: string
          body: string
          created_at?: string
          id?: string
          student_id: string
        }
        Update: {
          academy_id?: string
          body?: string
          created_at?: string
          id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_notes_academy_id_fkey"
            columns: ["academy_id"]
            isOneToOne: false
            referencedRelation: "academies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_notes_academy_id_student_id_fkey"
            columns: ["academy_id", "student_id"]
            isOneToOne: false
            referencedRelation: "student_activity"
            referencedColumns: ["academy_id", "id"]
          },
          {
            foreignKeyName: "student_notes_academy_id_student_id_fkey"
            columns: ["academy_id", "student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["academy_id", "id"]
          },
        ]
      }
      student_progress: {
        Row: {
          academy_id: string
          belt_id: string
          created_at: string
          degree: number
          id: string
          notes: string | null
          promoted_on: string
          student_id: string
        }
        Insert: {
          academy_id: string
          belt_id: string
          created_at?: string
          degree?: number
          id?: string
          notes?: string | null
          promoted_on: string
          student_id: string
        }
        Update: {
          academy_id?: string
          belt_id?: string
          created_at?: string
          degree?: number
          id?: string
          notes?: string | null
          promoted_on?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_progress_academy_id_belt_id_fkey"
            columns: ["academy_id", "belt_id"]
            isOneToOne: false
            referencedRelation: "belts"
            referencedColumns: ["academy_id", "id"]
          },
          {
            foreignKeyName: "student_progress_academy_id_fkey"
            columns: ["academy_id"]
            isOneToOne: false
            referencedRelation: "academies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_progress_academy_id_student_id_fkey"
            columns: ["academy_id", "student_id"]
            isOneToOne: false
            referencedRelation: "student_activity"
            referencedColumns: ["academy_id", "id"]
          },
          {
            foreignKeyName: "student_progress_academy_id_student_id_fkey"
            columns: ["academy_id", "student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["academy_id", "id"]
          },
        ]
      }
      students: {
        Row: {
          academy_id: string
          birth_date: string | null
          branch_id: string
          created_at: string
          discipline_id: string | null
          email: string | null
          emergency_name: string | null
          emergency_phone: string | null
          group_id: string | null
          id: string
          joined_on: string
          linked_user_id: string | null
          name: string
          payer_id: string | null
          phone: string | null
          photo_path: string | null
          status: string
          status_reason: string | null
        }
        Insert: {
          academy_id: string
          birth_date?: string | null
          branch_id: string
          created_at?: string
          discipline_id?: string | null
          email?: string | null
          emergency_name?: string | null
          emergency_phone?: string | null
          group_id?: string | null
          id?: string
          joined_on?: string
          linked_user_id?: string | null
          name: string
          payer_id?: string | null
          phone?: string | null
          photo_path?: string | null
          status?: string
          status_reason?: string | null
        }
        Update: {
          academy_id?: string
          birth_date?: string | null
          branch_id?: string
          created_at?: string
          discipline_id?: string | null
          email?: string | null
          emergency_name?: string | null
          emergency_phone?: string | null
          group_id?: string | null
          id?: string
          joined_on?: string
          linked_user_id?: string | null
          name?: string
          payer_id?: string | null
          phone?: string | null
          photo_path?: string | null
          status?: string
          status_reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "students_academy_id_branch_id_fkey"
            columns: ["academy_id", "branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["academy_id", "id"]
          },
          {
            foreignKeyName: "students_academy_id_discipline_id_fkey"
            columns: ["academy_id", "discipline_id"]
            isOneToOne: false
            referencedRelation: "disciplines"
            referencedColumns: ["academy_id", "id"]
          },
          {
            foreignKeyName: "students_academy_id_fkey"
            columns: ["academy_id"]
            isOneToOne: false
            referencedRelation: "academies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_academy_id_group_id_fkey"
            columns: ["academy_id", "group_id"]
            isOneToOne: false
            referencedRelation: "student_groups"
            referencedColumns: ["academy_id", "id"]
          },
          {
            foreignKeyName: "students_academy_id_payer_id_fkey"
            columns: ["academy_id", "payer_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["academy_id", "id"]
          },
        ]
      }
      suppliers: {
        Row: {
          academy_id: string
          active: boolean
          created_at: string
          email: string | null
          id: string
          name: string
          phone: string | null
          tax_id: string | null
        }
        Insert: {
          academy_id: string
          active?: boolean
          created_at?: string
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          tax_id?: string | null
        }
        Update: {
          academy_id?: string
          active?: boolean
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          tax_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_academy_id_fkey"
            columns: ["academy_id"]
            isOneToOne: false
            referencedRelation: "academies"
            referencedColumns: ["id"]
          },
        ]
      }
      transfers: {
        Row: {
          academy_id: string
          amount: number
          branch_id: string
          created_at: string
          from_account_id: string
          id: string
          reason: string
          to_account_id: string
        }
        Insert: {
          academy_id: string
          amount: number
          branch_id: string
          created_at?: string
          from_account_id: string
          id?: string
          reason: string
          to_account_id: string
        }
        Update: {
          academy_id?: string
          amount?: number
          branch_id?: string
          created_at?: string
          from_account_id?: string
          id?: string
          reason?: string
          to_account_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transfers_academy_id_branch_id_fkey"
            columns: ["academy_id", "branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["academy_id", "id"]
          },
          {
            foreignKeyName: "transfers_academy_id_fkey"
            columns: ["academy_id"]
            isOneToOne: false
            referencedRelation: "academies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfers_academy_id_from_account_id_fkey"
            columns: ["academy_id", "from_account_id"]
            isOneToOne: false
            referencedRelation: "account_balances"
            referencedColumns: ["academy_id", "id"]
          },
          {
            foreignKeyName: "transfers_academy_id_from_account_id_fkey"
            columns: ["academy_id", "from_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["academy_id", "id"]
          },
          {
            foreignKeyName: "transfers_academy_id_to_account_id_fkey"
            columns: ["academy_id", "to_account_id"]
            isOneToOne: false
            referencedRelation: "account_balances"
            referencedColumns: ["academy_id", "id"]
          },
          {
            foreignKeyName: "transfers_academy_id_to_account_id_fkey"
            columns: ["academy_id", "to_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["academy_id", "id"]
          },
        ]
      }
    }
    Views: {
      account_balances: {
        Row: {
          academy_id: string | null
          active: boolean | null
          balance: number | null
          branch_id: string | null
          created_at: string | null
          id: string | null
          kind: string | null
          name: string | null
        }
        Insert: {
          academy_id?: string | null
          active?: boolean | null
          balance?: never
          branch_id?: string | null
          created_at?: string | null
          id?: string | null
          kind?: string | null
          name?: string | null
        }
        Update: {
          academy_id?: string | null
          active?: boolean | null
          balance?: never
          branch_id?: string | null
          created_at?: string | null
          id?: string | null
          kind?: string | null
          name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accounts_academy_id_branch_id_fkey"
            columns: ["academy_id", "branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["academy_id", "id"]
          },
          {
            foreignKeyName: "accounts_academy_id_fkey"
            columns: ["academy_id"]
            isOneToOne: false
            referencedRelation: "academies"
            referencedColumns: ["id"]
          },
        ]
      }
      charge_balances: {
        Row: {
          academy_id: string | null
          amount: number | null
          balance: number | null
          branch_id: string | null
          created_at: string | null
          description: string | null
          due_on: string | null
          id: string | null
          membership_id: string | null
          period_on: string | null
          source: string | null
          status: string | null
          student_id: string | null
        }
        Insert: {
          academy_id?: string | null
          amount?: number | null
          balance?: never
          branch_id?: string | null
          created_at?: string | null
          description?: string | null
          due_on?: string | null
          id?: string | null
          membership_id?: string | null
          period_on?: string | null
          source?: string | null
          status?: string | null
          student_id?: string | null
        }
        Update: {
          academy_id?: string | null
          amount?: number | null
          balance?: never
          branch_id?: string | null
          created_at?: string | null
          description?: string | null
          due_on?: string | null
          id?: string | null
          membership_id?: string | null
          period_on?: string | null
          source?: string | null
          status?: string | null
          student_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "charges_academy_id_branch_id_fkey"
            columns: ["academy_id", "branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["academy_id", "id"]
          },
          {
            foreignKeyName: "charges_academy_id_fkey"
            columns: ["academy_id"]
            isOneToOne: false
            referencedRelation: "academies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "charges_academy_id_membership_id_fkey"
            columns: ["academy_id", "membership_id"]
            isOneToOne: false
            referencedRelation: "memberships"
            referencedColumns: ["academy_id", "id"]
          },
          {
            foreignKeyName: "charges_academy_id_student_id_fkey"
            columns: ["academy_id", "student_id"]
            isOneToOne: false
            referencedRelation: "student_activity"
            referencedColumns: ["academy_id", "id"]
          },
          {
            foreignKeyName: "charges_academy_id_student_id_fkey"
            columns: ["academy_id", "student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["academy_id", "id"]
          },
        ]
      }
      debt_report: {
        Row: {
          academy_id: string | null
          aging_bucket: string | null
          amount: number | null
          balance: number | null
          branch_id: string | null
          created_at: string | null
          description: string | null
          due_on: string | null
          id: string | null
          membership_id: string | null
          overdue_days: number | null
          period_on: string | null
          source: string | null
          status: string | null
          student_id: string | null
        }
        Insert: {
          academy_id?: string | null
          aging_bucket?: never
          amount?: number | null
          balance?: never
          branch_id?: string | null
          created_at?: string | null
          description?: string | null
          due_on?: string | null
          id?: string | null
          membership_id?: string | null
          overdue_days?: never
          period_on?: string | null
          source?: string | null
          status?: string | null
          student_id?: string | null
        }
        Update: {
          academy_id?: string | null
          aging_bucket?: never
          amount?: number | null
          balance?: never
          branch_id?: string | null
          created_at?: string | null
          description?: string | null
          due_on?: string | null
          id?: string | null
          membership_id?: string | null
          overdue_days?: never
          period_on?: string | null
          source?: string | null
          status?: string | null
          student_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "charges_academy_id_branch_id_fkey"
            columns: ["academy_id", "branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["academy_id", "id"]
          },
          {
            foreignKeyName: "charges_academy_id_fkey"
            columns: ["academy_id"]
            isOneToOne: false
            referencedRelation: "academies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "charges_academy_id_membership_id_fkey"
            columns: ["academy_id", "membership_id"]
            isOneToOne: false
            referencedRelation: "memberships"
            referencedColumns: ["academy_id", "id"]
          },
          {
            foreignKeyName: "charges_academy_id_student_id_fkey"
            columns: ["academy_id", "student_id"]
            isOneToOne: false
            referencedRelation: "student_activity"
            referencedColumns: ["academy_id", "id"]
          },
          {
            foreignKeyName: "charges_academy_id_student_id_fkey"
            columns: ["academy_id", "student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["academy_id", "id"]
          },
        ]
      }
      expense_balances: {
        Row: {
          academy_id: string | null
          amount: number | null
          approved_by: string | null
          balance: number | null
          branch_id: string | null
          category: string | null
          category_id: string | null
          created_at: string | null
          description: string | null
          document_path: string | null
          due_on: string | null
          id: string | null
          incurred_on: string | null
          payment_status: string | null
          source: string | null
          source_id: string | null
          status: string | null
          supplier_id: string | null
        }
        Insert: {
          academy_id?: string | null
          amount?: number | null
          approved_by?: string | null
          balance?: never
          branch_id?: string | null
          category?: string | null
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          document_path?: string | null
          due_on?: string | null
          id?: string | null
          incurred_on?: string | null
          payment_status?: never
          source?: string | null
          source_id?: string | null
          status?: string | null
          supplier_id?: string | null
        }
        Update: {
          academy_id?: string | null
          amount?: number | null
          approved_by?: string | null
          balance?: never
          branch_id?: string | null
          category?: string | null
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          document_path?: string | null
          due_on?: string | null
          id?: string | null
          incurred_on?: string | null
          payment_status?: never
          source?: string | null
          source_id?: string | null
          status?: string | null
          supplier_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_academy_id_branch_id_fkey"
            columns: ["academy_id", "branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["academy_id", "id"]
          },
          {
            foreignKeyName: "expenses_academy_id_category_id_fkey"
            columns: ["academy_id", "category_id"]
            isOneToOne: false
            referencedRelation: "expense_categories"
            referencedColumns: ["academy_id", "id"]
          },
          {
            foreignKeyName: "expenses_academy_id_fkey"
            columns: ["academy_id"]
            isOneToOne: false
            referencedRelation: "academies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_academy_id_supplier_id_fkey"
            columns: ["academy_id", "supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["academy_id", "id"]
          },
        ]
      }
      sales_report: {
        Row: {
          academy_id: string | null
          branch_id: string | null
          charge_id: string | null
          cost: number | null
          created_at: string | null
          customer_name: string | null
          discount: number | null
          id: string | null
          margin: number | null
          net_sales: number | null
          seller: string | null
          status: string | null
          student_id: string | null
          total: number | null
        }
        Insert: {
          academy_id?: string | null
          branch_id?: string | null
          charge_id?: string | null
          cost?: never
          created_at?: string | null
          customer_name?: string | null
          discount?: number | null
          id?: string | null
          margin?: never
          net_sales?: never
          seller?: string | null
          status?: string | null
          student_id?: string | null
          total?: number | null
        }
        Update: {
          academy_id?: string | null
          branch_id?: string | null
          charge_id?: string | null
          cost?: never
          created_at?: string | null
          customer_name?: string | null
          discount?: number | null
          id?: string | null
          margin?: never
          net_sales?: never
          seller?: string | null
          status?: string | null
          student_id?: string | null
          total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_academy_id_branch_id_fkey"
            columns: ["academy_id", "branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["academy_id", "id"]
          },
          {
            foreignKeyName: "sales_academy_id_charge_id_fkey"
            columns: ["academy_id", "charge_id"]
            isOneToOne: false
            referencedRelation: "charge_balances"
            referencedColumns: ["academy_id", "id"]
          },
          {
            foreignKeyName: "sales_academy_id_charge_id_fkey"
            columns: ["academy_id", "charge_id"]
            isOneToOne: false
            referencedRelation: "charges"
            referencedColumns: ["academy_id", "id"]
          },
          {
            foreignKeyName: "sales_academy_id_charge_id_fkey"
            columns: ["academy_id", "charge_id"]
            isOneToOne: false
            referencedRelation: "debt_report"
            referencedColumns: ["academy_id", "id"]
          },
          {
            foreignKeyName: "sales_academy_id_fkey"
            columns: ["academy_id"]
            isOneToOne: false
            referencedRelation: "academies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_academy_id_student_id_fkey"
            columns: ["academy_id", "student_id"]
            isOneToOne: false
            referencedRelation: "student_activity"
            referencedColumns: ["academy_id", "id"]
          },
          {
            foreignKeyName: "sales_academy_id_student_id_fkey"
            columns: ["academy_id", "student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["academy_id", "id"]
          },
        ]
      }
      student_activity: {
        Row: {
          academy_id: string | null
          birth_date: string | null
          branch_id: string | null
          created_at: string | null
          discipline_id: string | null
          email: string | null
          emergency_name: string | null
          emergency_phone: string | null
          group_id: string | null
          id: string | null
          inactive_days: number | null
          joined_on: string | null
          last_attended_at: string | null
          linked_user_id: string | null
          name: string | null
          payer_id: string | null
          phone: string | null
          photo_path: string | null
          status: string | null
          status_reason: string | null
        }
        Insert: {
          academy_id?: string | null
          birth_date?: string | null
          branch_id?: string | null
          created_at?: string | null
          discipline_id?: string | null
          email?: string | null
          emergency_name?: string | null
          emergency_phone?: string | null
          group_id?: string | null
          id?: string | null
          inactive_days?: never
          joined_on?: string | null
          last_attended_at?: never
          linked_user_id?: string | null
          name?: string | null
          payer_id?: string | null
          phone?: string | null
          photo_path?: string | null
          status?: string | null
          status_reason?: string | null
        }
        Update: {
          academy_id?: string | null
          birth_date?: string | null
          branch_id?: string | null
          created_at?: string | null
          discipline_id?: string | null
          email?: string | null
          emergency_name?: string | null
          emergency_phone?: string | null
          group_id?: string | null
          id?: string | null
          inactive_days?: never
          joined_on?: string | null
          last_attended_at?: never
          linked_user_id?: string | null
          name?: string | null
          payer_id?: string | null
          phone?: string | null
          photo_path?: string | null
          status?: string | null
          status_reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "students_academy_id_branch_id_fkey"
            columns: ["academy_id", "branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["academy_id", "id"]
          },
          {
            foreignKeyName: "students_academy_id_discipline_id_fkey"
            columns: ["academy_id", "discipline_id"]
            isOneToOne: false
            referencedRelation: "disciplines"
            referencedColumns: ["academy_id", "id"]
          },
          {
            foreignKeyName: "students_academy_id_fkey"
            columns: ["academy_id"]
            isOneToOne: false
            referencedRelation: "academies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_academy_id_group_id_fkey"
            columns: ["academy_id", "group_id"]
            isOneToOne: false
            referencedRelation: "student_groups"
            referencedColumns: ["academy_id", "id"]
          },
          {
            foreignKeyName: "students_academy_id_payer_id_fkey"
            columns: ["academy_id", "payer_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["academy_id", "id"]
          },
        ]
      }
    }
    Functions: {
      bootstrap_academy: {
        Args: {
          p_country: string
          p_currency: string
          p_name: string
          p_owner: string
          p_timezone: string
        }
        Returns: string
      }
      collection_breakdown: {
        Args: {
          p_academy: string
          p_branch: string
          p_from: string
          p_to: string
        }
        Returns: {
          amount: number
          concept: string
        }[]
      }
      dashboard: {
        Args: {
          p_academy: string
          p_branch: string
          p_from: string
          p_to: string
        }
        Returns: Json
      }
      instructor_directory: {
        Args: { p_academy: string; p_branch: string; p_search?: string }
        Returns: {
          branch_id: string
          id: string
          name: string
        }[]
      }
      logo_path: { Args: { p_academy: string }; Returns: string }
      my_permissions: { Args: { p_academy: string }; Returns: string[] }
      operate: {
        Args: {
          p_academy: string
          p_action: string
          p_branch: string
          p_data: Json
          p_key: string
        }
        Returns: Json
      }
      scheduled_billing: { Args: { p_limit?: number }; Returns: Json }
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
    Enums: {},
  },
} as const
