"""
Video Assembler — combines stock clips + TTS audio + subtitles.
Uses MoviePy (same as MoneyPrinterV2's combine() method).
Output: 9:16 vertical video for YouTube Shorts / TikTok / Instagram Reels.
"""
import os
import math
from typing import List, Optional

from moviepy.editor import (
    VideoFileClip,
    AudioFileClip,
    concatenate_videoclips,
    CompositeVideoClip,
    TextClip,
    ColorClip,
)
from moviepy.video.fx.all import crop, resize

# 9:16 vertical format (YouTube Shorts / TikTok)
TARGET_W = 1080
TARGET_H = 1920


def _prepare_clip(path: str, duration: float) -> VideoFileClip:
    """Load, crop to 9:16, resize to 1080x1920."""
    clip = VideoFileClip(path, audio=False)

    # Crop to 9:16
    target_ratio = TARGET_W / TARGET_H
    clip_ratio = clip.w / clip.h

    if clip_ratio > target_ratio:
        # Wider than needed — crop sides
        new_w = int(clip.h * target_ratio)
        x1 = (clip.w - new_w) // 2
        clip = crop(clip, x1=x1, width=new_w)
    else:
        # Taller than needed — crop top/bottom
        new_h = int(clip.w / target_ratio)
        y1 = (clip.h - new_h) // 2
        clip = crop(clip, y1=y1, height=new_h)

    clip = clip.resize((TARGET_W, TARGET_H))

    # Loop or trim to needed duration
    if clip.duration < duration:
        loops = math.ceil(duration / clip.duration)
        from moviepy.editor import concatenate_videoclips
        clip = concatenate_videoclips([clip] * loops)

    clip = clip.subclip(0, duration)
    return clip


def _make_subtitle_clips(script: str, audio_duration: float) -> List:
    """
    Split script into subtitle chunks and create timed TextClips.
    Simple approach: split into ~4-word chunks evenly distributed over audio.
    """
    words = script.split()
    chunk_size = 4
    chunks = [" ".join(words[i:i+chunk_size]) for i in range(0, len(words), chunk_size)]

    if not chunks:
        return []

    time_per_chunk = audio_duration / len(chunks)
    subtitle_clips = []

    for i, chunk in enumerate(chunks):
        start = i * time_per_chunk
        end = start + time_per_chunk

        # Background pill
        bg = ColorClip(
            size=(TARGET_W - 80, 90),
            color=(0, 0, 0),
        ).set_opacity(0.6).set_duration(end - start)

        # Text
        txt = TextClip(
            chunk,
            fontsize=52,
            color="white",
            font="DejaVu-Sans-Bold",
            method="caption",
            size=(TARGET_W - 120, None),
            stroke_color="black",
            stroke_width=2,
        ).set_duration(end - start)

        # Position: bottom third
        bg_pos = ("center", TARGET_H - 350)
        txt_pos = ("center", TARGET_H - 340)

        subtitle_clips.append(bg.set_start(start).set_position(bg_pos))
        subtitle_clips.append(txt.set_start(start).set_position(txt_pos))

    return subtitle_clips


def assemble_video(
    clip_paths: List[str],
    audio_path: str,
    script: str,
    output_path: str,
    add_subtitles: bool = True,
) -> str:
    """
    Assemble final video from stock clips + TTS audio + subtitles.

    Returns path to the output video file.
    """
    audio = AudioFileClip(audio_path)
    total_duration = audio.duration

    if not clip_paths:
        raise ValueError("No video clips provided")

    # Distribute clips evenly across total duration
    duration_per_clip = total_duration / len(clip_paths)
    video_clips = []

    for path in clip_paths:
        try:
            vc = _prepare_clip(path, duration_per_clip)
            video_clips.append(vc)
        except Exception as e:
            print(f"Warning: skipping clip {path}: {e}")

    if not video_clips:
        raise ValueError("All clips failed to load")

    base_video = concatenate_videoclips(video_clips, method="compose")
    base_video = base_video.subclip(0, total_duration)
    base_video = base_video.set_audio(audio)

    # Add subtitles
    if add_subtitles:
        try:
            subtitle_clips = _make_subtitle_clips(script, total_duration)
            final = CompositeVideoClip([base_video] + subtitle_clips)
        except Exception as e:
            print(f"Warning: subtitles failed ({e}), skipping")
            final = base_video
    else:
        final = base_video

    # Export
    final.write_videofile(
        output_path,
        fps=30,
        codec="libx264",
        audio_codec="aac",
        temp_audiofile=output_path + ".tmp.m4a",
        remove_temp=True,
        verbose=False,
        logger=None,
    )

    # Cleanup
    audio.close()
    for vc in video_clips:
        vc.close()

    return output_path
