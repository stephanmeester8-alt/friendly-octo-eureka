export type TaskStatus = "open" | "in_progress" | "completed" | "cancelled";

/**
 * Monetary amounts in the DB are BIGINT cents (e.g. 50 = €0.50).
 * Convert at the UI boundary with eurosToCents / centsToEuros / formatEurFromCents.
 */
export interface Profile {
  id: string;
  username: string | null;
  avatar_url: string | null;
  /** Wallet balance in cents */
  balance: number;
  created_at: string;
}

export interface Task {
  id: string;
  client_id: string;
  maker_id: string | null;
  title: string;
  description: string;
  /** Budget in cents */
  budget: number;
  status: TaskStatus;
  file_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface TaskWithClient extends Task {
  client_username?: string | null;
}

export interface CreateTaskInput {
  title: string;
  description: string;
  /** Budget in cents */
  budgetCents: number;
  file?: File | null;
}

export interface WalletTopUpInput {
  /** Top-up amount in cents (min 100 = €1.00) */
  amountCents: number;
}

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: {
          id: string;
          username?: string | null;
          avatar_url?: string | null;
          balance?: number;
          created_at?: string;
        };
        Update: {
          username?: string | null;
          avatar_url?: string | null;
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
          maker_id?: string | null;
          title: string;
          description: string;
          budget?: number;
          status?: TaskStatus;
          file_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          client_id?: string;
          maker_id?: string | null;
          title?: string;
          description?: string;
          budget?: number;
          status?: TaskStatus;
          file_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      task_status: TaskStatus;
    };
    CompositeTypes: Record<string, never>;
  };
};
