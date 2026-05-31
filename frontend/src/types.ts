export type Priority = 'low' | 'medium' | 'high';
export type TaskStatus = 'active' | 'completed';
export type Filter = 'all' | 'active' | 'completed' | 'overdue';
export type SortMode = 'created' | 'dueDate' | 'priority';

export interface User {
  id: string;
  email: string;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: Priority;
  due_date: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface TaskPayload {
  title: string;
  description?: string | null;
  priority: Priority;
  due_date?: string | null;
}

export interface AuthResponse {
  token: {
    access_token: string;
    token_type: string;
  };
  user: User;
}
