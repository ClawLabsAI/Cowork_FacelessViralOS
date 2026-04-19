"""
Text-to-Speech — uses edge-tts (free Microsoft voices).
Drop-in replacement for MoneyPrinterV2's KittenTTS.
"""
import asyncio
import edge_tts

# Available voices by language
VOICES = {
    "English": {
        "male": "en-US-AndrewNeural",
        "female": "en-US-JennyNeural",
        "default": "en-US-AndrewNeural",
    },
    "Spanish": {
        "male": "es-ES-AlvaroNeural",
        "female": "es-ES-ElviraNeural",
        "default": "es-ES-AlvaroNeural",
    },
    "EN": {
        "default": "en-US-AndrewNeural",
    },
    "ES": {
        "default": "es-ES-AlvaroNeural",
    },
}


async def _synthesize(text: str, voice: str, output_path: str) -> str:
    communicate = edge_tts.Communicate(text, voice)
    await communicate.save(output_path)
    return output_path


def synthesize_speech(
    text: str,
    output_path: str,
    language: str = "English",
    gender: str = "male",
) -> str:
    """
    Convert text to speech using edge-tts (free).

    Returns path to the generated audio file.
    """
    lang_voices = VOICES.get(language, VOICES["English"])
    voice = lang_voices.get(gender, lang_voices["default"])

    asyncio.run(_synthesize(text, voice, output_path))
    return output_path
