export type Database = {
  public: {
    Tables: {
      games: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          image_url: string | null;
          published_year: number | null;
          year: number | null;
          min_players: number;
          max_players: number;
          duration: number | null;
          min_age: number;
          category: string | null;
          average_rating: number | null;
          ratings_count: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          image_url?: string | null;
          published_year?: number | null;
          year?: number | null;
          min_players?: number;
          max_players?: number;
          duration?: number | null;
          min_age?: number;
          category?: string | null;
          average_rating?: number | null;
          ratings_count?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          image_url?: string | null;
          published_year?: number | null;
          year?: number | null;
          min_players?: number;
          max_players?: number;
          duration?: number | null;
          min_age?: number;
          category?: string | null;
          average_rating?: number | null;
          ratings_count?: number | null;
          created_at?: string;
        };
        Relationships: [];
      };
      game_copies: {
        Row: {
          id: string;
          game_id: string;
          owner_id: string;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          game_id: string;
          owner_id: string;
          status?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          game_id?: string;
          owner_id?: string;
          status?: string;
          created_at?: string;
        };
        Relationships: [
          {
            table: "games";
            onDelete: "CASCADE";
            columns: ["game_id"];
          },
          {
            table: "users"; // Actually auth.users
            onDelete: "CASCADE";
            columns: ["owner_id"];
          }
        ];
      };
      loan_requests: {
        Row: {
          id: string;
          game_copy_id: string;
          requester_id: string;
          owner_id: string;
          requested_return_date: string;
          message: string | null;
          status: string;
          created_at: string;
          responded_at: string | null;
        };
        Insert: {
          id?: string;
          game_copy_id: string;
          requester_id: string;
          owner_id: string;
          requested_return_date: string;
          message?: string | null;
          status?: string;
          created_at?: string;
          responded_at?: string | null;
        };
        Update: {
          id?: string;
          game_copy_id?: string;
          requester_id?: string;
          owner_id?: string;
          requested_return_date?: string;
          message?: string | null;
          status?: string;
          created_at?: string;
          responded_at?: string | null;
        };
        Relationships: [
          {
            table: "game_copies";
            onDelete: "CASCADE";
            columns: ["game_copy_id"];
          },
          {
            table: "users"; // auth.users
            onDelete: "CASCADE";
            columns: ["requester_id"];
          },
          {
            table: "users"; // auth.users
            onDelete: "CASCADE";
            columns: ["owner_id"];
          }
        ];
      };
      loans: {
        Row: {
          id: string;
          game_copy_id: string;
          owner_id: string;
          borrower_id: string;
          start_date: string;
          expected_return_date: string;
          actual_return_date: string | null;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          game_copy_id: string;
          owner_id: string;
          borrower_id: string;
          start_date?: string;
          expected_return_date?: string;
          actual_return_date?: string | null;
          status?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          game_copy_id?: string;
          owner_id?: string;
          borrower_id?: string;
          start_date?: string;
          expected_return_date?: string;
          actual_return_date?: string | null;
          status?: string;
          created_at?: string;
        };
        Relationships: [
          {
            table: "game_copies";
            onDelete: "CASCADE";
            columns: ["game_copy_id"];
          },
          {
            table: "users"; // auth.users
            onDelete: "CASCADE";
            columns: ["owner_id"];
          },
          {
            table: "users"; // auth.users
            onDelete: "CASCADE";
            columns: ["borrower_id"];
          }
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};