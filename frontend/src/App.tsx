import { FormEvent, useEffect, useMemo, useState } from 'react';
import * as api from './api';
import type { AuthResponse, Filter, Priority, SortMode, Task, TaskPayload, User } from './types';

const priorityWeight: Record<Priority, number> = { high: 3, medium: 2, low: 1 };
const filters: Array<{ value: Filter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
  { value: 'overdue', label: 'Overdue' },
];

function isOverdue(task: Task): boolean {
  if (task.status === 'completed' || !task.due_date) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(`${task.due_date}T00:00:00`) < today;
}

function formatDate(value: string | null): string {
  if (!value) return 'No due date';
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(`${value}T00:00:00`));
}

const emptyTaskForm: TaskPayload = { title: '', description: '', priority: 'medium', due_date: '' };

function App() {
  const [token, setToken] = useState(() => localStorage.getItem('todo-token') ?? '');
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('todo-user');
    return saved ? (JSON.parse(saved) as User) : null;
  });
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskForm, setTaskForm] = useState<TaskPayload>(emptyTaskForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [sortMode, setSortMode] = useState<SortMode>('created');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [error, setError] = useState('');
  const [validation, setValidation] = useState('');

  const activeCount = tasks.filter((task) => task.status === 'active').length;
  const completedCount = tasks.filter((task) => task.status === 'completed').length;
  const overdueCount = tasks.filter(isOverdue).length;

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    api.fetchTasks(token)
      .then(setTasks)
      .catch((err: Error) => {
        setError(err.message);
        if (err.message.toLowerCase().includes('token')) {
          signOut();
        }
      })
      .finally(() => setLoading(false));
  }, [token]);

  const visibleTasks = useMemo(() => {
    const term = search.trim().toLowerCase();
    return tasks
      .filter((task) => {
        if (filter === 'active') return task.status === 'active';
        if (filter === 'completed') return task.status === 'completed';
        if (filter === 'overdue') return isOverdue(task);
        return true;
      })
      .filter((task) => {
        if (!term) return true;
        return `${task.title} ${task.description ?? ''}`.toLowerCase().includes(term);
      })
      .sort((a, b) => {
        if (sortMode === 'priority') return priorityWeight[b.priority] - priorityWeight[a.priority];
        if (sortMode === 'dueDate') {
          const aDate = a.due_date ? new Date(a.due_date).getTime() : Number.MAX_SAFE_INTEGER;
          const bDate = b.due_date ? new Date(b.due_date).getTime() : Number.MAX_SAFE_INTEGER;
          return aDate - bDate;
        }
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
  }, [filter, search, sortMode, tasks]);

  function persistAuth(response: AuthResponse) {
    setToken(response.token.access_token);
    setUser(response.user);
    localStorage.setItem('todo-token', response.token.access_token);
    localStorage.setItem('todo-user', JSON.stringify(response.user));
  }

  function signOut() {
    setToken('');
    setUser(null);
    setTasks([]);
    localStorage.removeItem('todo-token');
    localStorage.removeItem('todo-user');
  }

  async function handleAuth(event: FormEvent) {
    event.preventDefault();
    setError('');
    setAuthLoading(true);
    try {
      const action = authMode === 'login' ? api.login : api.register;
      persistAuth(await action(email, password));
      setEmail('');
      setPassword('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleTaskSubmit(event: FormEvent) {
    event.preventDefault();
    const title = taskForm.title.trim();
    if (!title) {
      setValidation('Please enter a task title.');
      return;
    }
    setValidation('');
    setError('');
    const payload = {
      ...taskForm,
      title,
      description: taskForm.description?.trim() || null,
      due_date: taskForm.due_date || null,
    };
    try {
      if (editingId) {
        const updated = await api.updateTask(editingId, payload, token);
        setTasks((current) => current.map((task) => (task.id === updated.id ? updated : task)));
        setEditingId(null);
      } else {
        const created = await api.createTask(payload, token);
        setTasks((current) => [created, ...current]);
      }
      setTaskForm(emptyTaskForm);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save task');
    }
  }

  async function handleToggle(taskId: string) {
    setError('');
    try {
      const updated = await api.toggleTask(taskId, token);
      setTasks((current) => current.map((task) => (task.id === updated.id ? updated : task)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update task');
    }
  }

  async function handleDelete(task: Task) {
    if (!window.confirm(`Delete “${task.title}”? This cannot be undone.`)) return;
    setError('');
    try {
      await api.deleteTask(task.id, token);
      setTasks((current) => current.filter((item) => item.id !== task.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to delete task');
    }
  }

  function startEditing(task: Task) {
    setEditingId(task.id);
    setTaskForm({
      title: task.title,
      description: task.description ?? '',
      priority: task.priority,
      due_date: task.due_date ?? '',
    });
    setValidation('');
  }

  if (!token || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4 py-10">
        <section className="w-full max-w-md rounded-3xl bg-white p-8 shadow-soft" aria-labelledby="auth-title">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-blue-700">Focused ToDo</p>
          <h1 id="auth-title" className="mt-3 text-3xl font-bold text-slate-950">
            {authMode === 'login' ? 'Welcome back' : 'Create your account'}
          </h1>
          <p className="mt-2 text-slate-600">Securely manage your priorities, due dates, and daily progress.</p>
          <form className="mt-8 space-y-4" onSubmit={handleAuth}>
            <label className="block text-sm font-medium text-slate-700">
              Email
              <input className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Password
              <input className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3" type="password" minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} required />
            </label>
            {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{error}</p>}
            <button className="w-full rounded-xl bg-blue-700 px-5 py-3 font-semibold text-white hover:bg-blue-800" disabled={authLoading} type="submit">
              {authLoading ? 'Please wait…' : authMode === 'login' ? 'Sign in' : 'Register'}
            </button>
          </form>
          <button className="mt-5 w-full text-sm font-semibold text-blue-700" onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')} type="button">
            {authMode === 'login' ? 'Need an account? Register' : 'Already registered? Sign in'}
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-4 rounded-3xl bg-slate-950 p-6 text-white shadow-soft sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-cyan-300">Focused ToDo</p>
          <h1 className="mt-2 text-3xl font-bold">Today’s task command center</h1>
          <p className="mt-2 text-slate-300">{activeCount} active · {completedCount} completed · {overdueCount} overdue</p>
        </div>
        <div className="flex flex-col gap-2 text-sm sm:items-end">
          <span>{user.email}</span>
          <button className="rounded-full border border-white/30 px-4 py-2 font-semibold hover:bg-white/10" onClick={signOut} type="button">Sign out</button>
        </div>
      </header>

      {error && <p className="mt-6 rounded-2xl bg-red-50 px-4 py-3 text-red-700" role="alert">{error}</p>}

      <section className="mt-6 grid gap-6 lg:grid-cols-[380px_1fr]">
        <form className="h-fit rounded-3xl bg-white p-6 shadow-soft" onSubmit={handleTaskSubmit} aria-label={editingId ? 'Edit task' : 'Create task'}>
          <h2 className="text-xl font-bold text-slate-950">{editingId ? 'Edit task' : 'Quick add task'}</h2>
          <label className="mt-5 block text-sm font-medium text-slate-700">
            Title
            <input className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3" value={taskForm.title} onChange={(event) => setTaskForm({ ...taskForm, title: event.target.value })} placeholder="e.g. Submit project brief" />
          </label>
          {validation && <p className="mt-2 text-sm text-red-700" role="alert">{validation}</p>}
          <label className="mt-4 block text-sm font-medium text-slate-700">
            Details
            <textarea className="mt-1 min-h-24 w-full rounded-xl border border-slate-300 px-4 py-3" value={taskForm.description ?? ''} onChange={(event) => setTaskForm({ ...taskForm, description: event.target.value })} placeholder="Optional context" />
          </label>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            <label className="block text-sm font-medium text-slate-700">
              Priority
              <select className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3" value={taskForm.priority} onChange={(event) => setTaskForm({ ...taskForm, priority: event.target.value as Priority })}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Due date
              <input className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3" type="date" value={taskForm.due_date ?? ''} onChange={(event) => setTaskForm({ ...taskForm, due_date: event.target.value })} />
            </label>
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <button className="rounded-xl bg-blue-700 px-5 py-3 font-semibold text-white hover:bg-blue-800" type="submit">{editingId ? 'Save changes' : 'Add task'}</button>
            {editingId && <button className="rounded-xl border border-slate-300 px-5 py-3 font-semibold" onClick={() => { setEditingId(null); setTaskForm(emptyTaskForm); }} type="button">Cancel</button>}
          </div>
        </form>

        <section className="rounded-3xl bg-white p-6 shadow-soft" aria-labelledby="task-list-title">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <h2 id="task-list-title" className="text-xl font-bold text-slate-950">Tasks</h2>
              <p className="text-sm text-slate-600">Search, filter, and sort your saved tasks.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:min-w-[420px]">
              <label className="text-sm font-medium text-slate-700">
                Search
                <input className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Title or details" />
              </label>
              <label className="text-sm font-medium text-slate-700">
                Sort
                <select className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3" value={sortMode} onChange={(event) => setSortMode(event.target.value as SortMode)}>
                  <option value="created">Newest first</option>
                  <option value="dueDate">Due date</option>
                  <option value="priority">Priority</option>
                </select>
              </label>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2" role="tablist" aria-label="Task filters">
            {filters.map((item) => (
              <button key={item.value} className={`rounded-full px-4 py-2 text-sm font-semibold ${filter === item.value ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`} onClick={() => setFilter(item.value)} type="button">
                {item.label}
              </button>
            ))}
          </div>

          {loading ? <p className="mt-8 text-slate-600">Loading tasks…</p> : null}
          {!loading && tasks.length === 0 ? <EmptyState title="Your task list is ready." description="Add your first task to start tracking priorities and due dates." /> : null}
          {!loading && tasks.length > 0 && visibleTasks.length === 0 ? <EmptyState title="No matching tasks." description="Try a different search, filter, or sort combination." /> : null}

          <ul className="mt-6 space-y-3">
            {visibleTasks.map((task) => {
              const overdue = isOverdue(task);
              const completed = task.status === 'completed';
              return (
                <li key={task.id} className={`rounded-2xl border p-4 ${overdue ? 'border-red-300 bg-red-50' : 'border-slate-200 bg-white'} ${completed ? 'opacity-75' : ''}`}>
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <label className="flex flex-1 items-start gap-3">
                      <input className="mt-1 h-5 w-5" type="checkbox" checked={completed} onChange={() => handleToggle(task.id)} aria-label={completed ? `Reopen ${task.title}` : `Complete ${task.title}`} />
                      <span>
                        <span className={`block text-lg font-semibold ${completed ? 'text-slate-500 line-through' : 'text-slate-950'}`}>{task.title}</span>
                        {task.description && <span className="mt-1 block text-sm text-slate-600">{task.description}</span>}
                        <span className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
                          <span className="rounded-full bg-slate-100 px-3 py-1 capitalize text-slate-700">{task.status}</span>
                          <span className="rounded-full bg-blue-100 px-3 py-1 capitalize text-blue-800">{task.priority} priority</span>
                          <span className={`rounded-full px-3 py-1 ${overdue ? 'bg-red-200 text-red-900' : 'bg-slate-100 text-slate-700'}`}>{overdue ? 'Overdue · ' : 'Due · '}{formatDate(task.due_date)}</span>
                        </span>
                      </span>
                    </label>
                    <div className="flex gap-2 sm:flex-col">
                      <button className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold hover:bg-slate-50" onClick={() => startEditing(task)} type="button">Edit</button>
                      <button className="rounded-xl border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50" onClick={() => handleDelete(task)} type="button">Delete</button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      </section>
    </main>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
      <h3 className="text-lg font-bold text-slate-900">{title}</h3>
      <p className="mt-2 text-slate-600">{description}</p>
    </div>
  );
}

export default App;
