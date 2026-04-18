const API_BASE = 'http://localhost:3001';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('fvos_token');
}
export function setToken(token: string): void {
  localStorage.setItem('fvos_token', token);
}
export function clearToken(): void {
  localStorage.removeItem('fvos_token');
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (res.status === 401) { clearToken(); window.location.href = '/login'; throw new Error('Unauthorized'); }
  const data = await res.json() as Record<string, unknown>;
  if (!res.ok) throw new Error((data['message'] as string) ?? 'Request failed');
  return data as T;
}

export async function login(email: string, password: string) {
  return request<{ accessToken: string; user: { id: string; email: string; name: string; role: string } }>(
    '/api/v1/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }
  );
}

export async function generateScript(payload: {
  channelId: string; topic: string; format: string; tone: string;
  targetDurationSeconds: number; tier: string; language?: string;
}) {
  return request<{ scriptId: string; jobId: string; status: string; estimatedCostUsd: number }>(
    '/api/v1/scripts/generate', { method: 'POST', body: JSON.stringify(payload) }
  );
}

export async function listScripts() {
  return request<{ scripts: Array<{
    id: string; topic: string; status: string; content: string | null;
    wordCount: number | null; estimatedCostUsd: number | null; actualCostUsd: number | null;
    modelUsed: string | null; format: string; tone: string; language: string; createdAt: string;
  }> }>('/api/v1/scripts');
}

export async function getScript(id: string) {
  return request<{
    id: string; topic: string; status: string; content: string | null;
    wordCount: number | null; actualCostUsd: number | null; modelUsed: string | null; createdAt: string;
  }>(`/api/v1/scripts/${id}`);
}
