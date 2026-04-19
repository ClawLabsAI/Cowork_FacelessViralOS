"""
Faceless Viral OS — Video Engine API
FastAPI service that exposes the video generation pipeline over HTTP.

Endpoints:
  POST /generate          → start a video generation job
  GET  /jobs/{job_id}     → poll job status + progress
  GET  /jobs/{job_id}/download → stream the finished video
  GET  /health            → health check
"""
import os
import uuid
import asyncio
from concurrent.futures import ThreadPoolExecutor
from typing import Optional

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel, Field

from pipeline import VideoJob, run_pipeline, WORK_DIR

# ── App ──────────────────────────────────────────────────────────────────────

app = FastAPI(
    title="FVOS Video Engine",
    description="Faceless Viral OS — Video Generation API",
    version="1.0.0",
)

# In-memory job store (persists for lifetime of process)
jobs: dict[str, VideoJob] = {}

# Thread pool for blocking video generation
executor = ThreadPoolExecutor(max_workers=2)

os.makedirs(WORK_DIR, exist_ok=True)


# ── Schemas ──────────────────────────────────────────────────────────────────

class GenerateRequest(BaseModel):
    topic: str = Field(..., min_length=3, max_length=500)
    language: str = Field(default="English")
    duration_seconds: int = Field(default=60, ge=30, le=300)
    format: str = Field(default="listicle")
    tone: str = Field(default="informative")
    niche: str = Field(default="general")


class JobStatusResponse(BaseModel):
    job_id: str
    status: str
    progress: int
    error: Optional[str]
    metadata: dict
    download_url: Optional[str]


# ── Routes ───────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "video-engine",
        "active_jobs": sum(1 for j in jobs.values() if j.status not in ("completed", "failed")),
    }


@app.post("/generate", status_code=202)
async def generate_video(req: GenerateRequest):
    """Start a video generation job. Returns job_id for polling."""
    job_id = str(uuid.uuid4())
    job = VideoJob(
        job_id=job_id,
        topic=req.topic,
        language=req.language,
        duration_seconds=req.duration_seconds,
        format=req.format,
        tone=req.tone,
        niche=req.niche,
    )
    jobs[job_id] = job

    # Run pipeline in thread pool (non-blocking)
    loop = asyncio.get_event_loop()
    loop.run_in_executor(executor, run_pipeline, job)

    return {"job_id": job_id, "status": "accepted"}


@app.get("/jobs/{job_id}", response_model=JobStatusResponse)
def get_job_status(job_id: str):
    """Poll job status and progress."""
    job = jobs.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    download_url = None
    if job.status == "completed" and job.output_path:
        download_url = f"/jobs/{job_id}/download"

    return JobStatusResponse(
        job_id=job.job_id,
        status=job.status,
        progress=job.progress,
        error=job.error,
        metadata=job.metadata,
        download_url=download_url,
    )


@app.get("/jobs/{job_id}/download")
def download_video(job_id: str):
    """Download the completed video file."""
    job = jobs.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.status != "completed":
        raise HTTPException(status_code=409, detail=f"Job not ready (status: {job.status})")
    if not job.output_path or not os.path.exists(job.output_path):
        raise HTTPException(status_code=404, detail="Video file not found")

    filename = f"fvos_{job_id[:8]}.mp4"
    return FileResponse(
        job.output_path,
        media_type="video/mp4",
        filename=filename,
    )


@app.get("/jobs")
def list_jobs():
    """List all jobs (newest first)."""
    return [
        {
            "job_id": j.job_id,
            "topic": j.topic,
            "status": j.status,
            "progress": j.progress,
        }
        for j in reversed(list(jobs.values()))
    ]


# ── Entrypoint ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)
