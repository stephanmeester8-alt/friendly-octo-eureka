export type TaskStatus = "open" | "in_progress" | "completed" | "disputed";

export interface Profile {
  id: string;
  email: string;
  balance: number;
  created_at: string;
}

export interface Task {
  id: string;
  client_id: string;
  title: string;
  description: string;
  budget: number;
  status: TaskStatus;
  file_url: string | null;
  worker_id: string | null;
  result_url: string | null;
  created_at: string;
}

export interface TaskWithClient extends Task {
  client_email?: string;
}

export interface CreateTaskInput {
  title: string;
  description: string;
  budget: number;
  file?: File | null;
}

export interface WalletTopUpInput {
  amount: number;
}

/** Minimal Supabase schema typing for SnapTask tables. */
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: {
          id: string;
          email: string;
          balance?: number;
          created_at?: string;
        };
        Update: {
          email?: string;
          balance?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      tasks: {
        Row: Task;
        Insert: {
          id?: string;
          client_id: string;
          title: string;
          description: string;
          budget?: number;
          status?: TaskStatus;
          file_url?: string | null;
          worker_id?: string | null;
          result_url?: string | null;
          created_at?: string;
        };
        Update: {
          client_id?: string;
          title?: string;
          description?: string;
          budget?: number;
          status?: TaskStatus;
          file_url?: string | null;
          worker_id?: string | null;
          result_url?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
