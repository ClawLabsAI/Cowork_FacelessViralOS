const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const VIDEO_API = process.env.NEXT_PUBLIC_VIDEO_ENGINE_URL ?? 'http://localhost:8000';

// ── Video Engine ─────────────────────────────────────────────────────────────

export async function generateVideo(params: {
  topic: string; language: string; duration_seconds: number;
  format: string; tone: string; niche: string;
}) {
  const res = await fetch(`${VIDEO_API}/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  return res.json();
}

export async function getJobStatus(jobId: string) {
  const res = await fetch(`${VIDEO_API}/jobs/${jobId}`);
  return res.json();
}

export async function listJobs() {
  const res = await fetch(`${VIDEO_API}/jobs`);
  return res.json();
}

export function getDownloadUrl(jobId: string) {
  return `${VIDEO_API}/jobs/${jobId}/download`;
}

export async function getVideoEngineHealth() {
  try {
    const res = await fetch(`${VIDEO_API}/health`);
    return res.json();
  } catch {
    return { status: 'offline' };
  }
}

// ── Main API ─────────────────────────────────────────────────────────────────

export async function getApiHealth() {
  try {
    const res = await fetch(`${API}/health`);
    return res.json();
  } catch {
    return { status: 'offline' };
  }
}
