"""
Script Generator — uses OpenAI to generate video scripts.
Inspired by MoneyPrinterV2's YouTube.generate_script() logic.
"""
import json
from openai import OpenAI

client = OpenAI()

SCRIPT_PROMPT = """
You are a viral faceless YouTube Shorts / TikTok script writer.

Write a compelling, engaging script for a short-form video about: {topic}

Requirements:
- Language: {language}
- Duration: approximately {duration_seconds} seconds when read aloud
- Format: {format}
- Tone: {tone}
- Hook in the first 3 seconds
- No mentions of "I" or personal references (faceless channel)
- Short punchy sentences — max {sentence_length} words per sentence
- End with a strong call to action (like, subscribe, comment)

Return ONLY a JSON object with this structure:
{{
  "title": "YouTube title (max 100 chars)",
  "description": "YouTube description (2-3 sentences)",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
  "script": "Full script text here",
  "search_keywords": ["keyword1", "keyword2", "keyword3"]
}}
"""


def generate_script(
    topic: str,
    language: str = "English",
    duration_seconds: int = 60,
    format: str = "listicle",
    tone: str = "informative",
    sentence_length: int = 8,
) -> dict:
    """Generate a complete video script with metadata."""
    prompt = SCRIPT_PROMPT.format(
        topic=topic,
        language=language,
        duration_seconds=duration_seconds,
        format=format,
        tone=tone,
        sentence_length=sentence_length,
    )

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}],
        response_format={"type": "json_object"},
        temperature=0.8,
    )

    result = json.loads(response.choices[0].message.content)
    return result
