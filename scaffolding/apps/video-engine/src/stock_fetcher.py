"""
Stock Video Fetcher — downloads clips from Pexels API.
Better than AI images: looks professional, free tier = 200 req/hour.
"""
import os
import requests
from typing import List

PEXELS_API = "https://api.pexels.com/videos/search"


def fetch_stock_clips(
    keywords: List[str],
    output_dir: str,
    count: int = 5,
    orientation: str = "portrait",  # portrait = 9:16 for Shorts/TikTok
    pexels_api_key: str = None,
) -> List[str]:
    """
    Fetch stock video clips from Pexels matching the given keywords.

    Returns list of local file paths.
    """
    api_key = pexels_api_key or os.environ.get("PEXELS_API_KEY", "")
    if not api_key:
        raise ValueError("PEXELS_API_KEY is required")

    downloaded = []

    for keyword in keywords[:3]:  # max 3 keywords to avoid rate limits
        if len(downloaded) >= count:
            break

        try:
            resp = requests.get(
                PEXELS_API,
                headers={"Authorization": api_key},
                params={
                    "query": keyword,
                    "per_page": 3,
                    "orientation": orientation,
                },
                timeout=15,
            )
            resp.raise_for_status()
            data = resp.json()

            for video in data.get("videos", []):
                if len(downloaded) >= count:
                    break

                # Pick lowest quality file that's still decent (HD)
                files = sorted(
                    video.get("video_files", []),
                    key=lambda f: f.get("width", 0),
                )
                chosen = None
                for f in files:
                    if f.get("width", 0) >= 720:
                        chosen = f
                        break

                if not chosen and files:
                    chosen = files[-1]

                if chosen and chosen.get("link"):
                    video_id = video["id"]
                    out_path = os.path.join(output_dir, f"clip_{video_id}.mp4")

                    if not os.path.exists(out_path):
                        r = requests.get(chosen["link"], timeout=60, stream=True)
                        with open(out_path, "wb") as f_out:
                            for chunk in r.iter_content(chunk_size=8192):
                                f_out.write(chunk)

                    downloaded.append(out_path)

        except Exception as e:
            print(f"Warning: Could not fetch clips for '{keyword}': {e}")
            continue

    return downloaded
