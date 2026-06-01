import type { AuthResponse, Task, TaskPayload } from './types';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

async function request<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!response.ok) {
    let message = 'Something went wrong. Please try again.';
    try {
      const body = (await response.json()) as { detail?: string | Array<{ msg: string }> };
      if (typeof body.detail === 'string') {
        message = body.detail;
      } else if (Array.isArray(body.detail) && body.detail.length > 0) {
        message = body.detail.map((error) => error.msg).join(', ');
      }
    } catch {
      // Keep default message if the server returned non-JSON error content.
    }
    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export function register(email: string, password: string): Promise<AuthResponse> {
  return request<AuthResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export function login(email: string, password: string): Promise<AuthResponse> {
  return request<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export function fetchTasks(token: string): Promise<Task[]> {
  return request<Task[]>('/tasks', {}, token);
}

export function createTask(payload: TaskPayload, token: string): Promise<Task> {
  return request<Task>('/tasks', {
    method: 'POST',
    body: JSON.stringify(payload),
  }, token);
}

export function updateTask(id: string, payload: Partial<TaskPayload>, token: string): Promise<Task> {
  return request<Task>(`/tasks/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  }, token);
}

export function toggleTask(id: string, token: string): Promise<Task> {
  return request<Task>(`/tasks/${id}/toggle`, { method: 'PATCH' }, token);
}

export function deleteTask(id: string, token: string): Promise<void> {
  return request<void>(`/tasks/${id}`, { method: 'DELETE' }, token);
}
