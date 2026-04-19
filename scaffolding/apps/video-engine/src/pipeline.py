"""
Video Generation Pipeline — orchestrates the full flow:
topic → script → TTS → stock clips → assembled video

This is the core engine, equivalent to MoneyPrinterV2's YouTube.generate_video().
"""
import os
import uuid
import shutil
from dataclasses import dataclass, field
from typing import Optional

from script_generator import generate_script
from tts import synthesize_speech
from stock_fetcher import fetch_stock_clips
from video_assembler import assemble_video

WORK_DIR = os.environ.get("WORK_DIR", "/tmp/fvos-videos")


@dataclass
class VideoJob:
    job_id: str
    topic: str
    language: str = "English"
    duration_seconds: int = 60
    format: str = "listicle"
    tone: str = "informative"
    niche: str = "general"
    status: str = "pending"
    progress: int = 0
    error: Optional[str] = None
    output_path: Optional[str] = None
    metadata: dict = field(default_factory=dict)


def run_pipeline(job: VideoJob) -> VideoJob:
    """
    Run the full video generation pipeline synchronously.
    Called from a background thread/worker.
    """
    job_dir = os.path.join(WORK_DIR, job.job_id)
    os.makedirs(job_dir, exist_ok=True)

    try:
        # ── Step 1: Generate Script ──────────────────────────────────────
        job.status = "generating_script"
        job.progress = 10
        print(f"[{job.job_id}] Generating script for: {job.topic}")

        script_data = generate_script(
            topic=job.topic,
            language=job.language,
            duration_seconds=job.duration_seconds,
            format=job.format,
            tone=job.tone,
        )

        job.metadata = {
            "title": script_data.get("title", job.topic),
            "description": script_data.get("description", ""),
            "tags": script_data.get("tags", []),
        }
        script_text = script_data.get("script", "")
        search_keywords = script_data.get("search_keywords", [job.niche, job.topic])
        job.progress = 30
        print(f"[{job.job_id}] Script ready ({len(script_text)} chars)")

        # ── Step 2: Text-to-Speech ───────────────────────────────────────
        job.status = "generating_audio"
        job.progress = 35
        audio_path = os.path.join(job_dir, "audio.mp3")
        print(f"[{job.job_id}] Synthesizing speech...")

        synthesize_speech(
            text=script_text,
            output_path=audio_path,
            language=job.language,
            gender="male",
        )
        job.progress = 55
        print(f"[{job.job_id}] Audio ready: {audio_path}")

        # ── Step 3: Fetch Stock Clips ────────────────────────────────────
        job.status = "fetching_clips"
        job.progress = 60
        clips_dir = os.path.join(job_dir, "clips")
        os.makedirs(clips_dir, exist_ok=True)
        print(f"[{job.job_id}] Fetching stock clips for: {search_keywords}")

        clip_paths = fetch_stock_clips(
            keywords=search_keywords,
            output_dir=clips_dir,
            count=5,
            orientation="portrait",
        )

        if not clip_paths:
            raise RuntimeError("No stock clips fetched — check PEXELS_API_KEY")

        job.progress = 75
        print(f"[{job.job_id}] {len(clip_paths)} clips downloaded")

        # ── Step 4: Assemble Video ───────────────────────────────────────
        job.status = "assembling_video"
        job.progress = 80
        output_path = os.path.join(job_dir, "output.mp4")
        print(f"[{job.job_id}] Assembling video...")

        assemble_video(
            clip_paths=clip_paths,
            audio_path=audio_path,
            script=script_text,
            output_path=output_path,
            add_subtitles=True,
        )

        job.status = "completed"
        job.progress = 100
        job.output_path = output_path
        print(f"[{job.job_id}] ✓ Video ready: {output_path}")

    except Exception as e:
        job.status = "failed"
        job.error = str(e)
        print(f"[{job.job_id}] ✗ Pipeline failed: {e}")
        # Cleanup on failure
        try:
            shutil.rmtree(job_dir, ignore_errors=True)
        except Exception:
            pass

    return job
