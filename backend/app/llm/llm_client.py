import re

import httpx

from app.core.config import settings

MAX_QUESTION_LENGTH = 2000

# plan/SECURITY_CONTROLS.md "Output filtering": scan for shell/code-exec
# patterns before a response ever reaches the analyst.
SHELL_PATTERNS = [
    re.compile(r"rm\s+-rf", re.IGNORECASE),
    re.compile(r"eval\(", re.IGNORECASE),
    re.compile(r"exec\(", re.IGNORECASE),
    re.compile(r"os\.system", re.IGNORECASE),
]
REDACTION_MARKER = "[REDACTED: potentially unsafe content removed]"


def cap_question_length(question: str) -> str:
    return question[:MAX_QUESTION_LENGTH]


def filter_output(text: str) -> str:
    filtered = text
    for pattern in SHELL_PATTERNS:
        filtered = pattern.sub(REDACTION_MARKER, filtered)
    return filtered


def _offline_response() -> str:
    return (
        "[OFFLINE MODE] No LLM API key is configured for this deployment "
        "(set LLM_PROVIDER + NVIDIA_API_KEY or GEMINI_API_KEY). Structure shown below is a placeholder:\n\n"
        "1. Threat Assessment: Unable to analyze without a configured LLM provider.\n"
        "2. Evidence Summary: Review the raw context fields returned alongside this response.\n"
        "3. Investigation Steps: Manually review the event, alert, and detection data.\n"
        "4. Recommended Response Actions: NEEDS-APPROVAL - configure an LLM provider for live analysis.\n"
        "5. Confidence Level: LOW (offline mode, no model was consulted)"
    )


async def _call_nvidia(prompt: str) -> str:
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            "https://integrate.api.nvidia.com/v1/chat/completions",
            headers={"Authorization": f"Bearer {settings.NVIDIA_API_KEY}"},
            json={
                "model": settings.NVIDIA_MODEL,
                "messages": [{"role": "user", "content": prompt}],
            },
        )
        response.raise_for_status()
        return response.json()["choices"][0]["message"]["content"]


async def _call_gemini(prompt: str) -> str:
    url = (
        f"https://generativelanguage.googleapis.com/v1beta/models/"
        f"{settings.GEMINI_MODEL}:generateContent?key={settings.GEMINI_API_KEY}"
    )
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(url, json={"contents": [{"parts": [{"text": prompt}]}]})
        response.raise_for_status()
        return response.json()["candidates"][0]["content"]["parts"][0]["text"]


async def complete(prompt: str) -> str:
    """Fetch raw provider text (or the offline fallback). Callers apply
    filter_output() themselves -- kept separate so output filtering covers
    every text that reaches an analyst, regardless of where it originated."""
    try:
        if settings.LLM_PROVIDER == "nvidia" and settings.NVIDIA_API_KEY:
            return await _call_nvidia(prompt)
        if settings.LLM_PROVIDER == "gemini" and settings.GEMINI_API_KEY:
            return await _call_gemini(prompt)
        return _offline_response()
    except (httpx.HTTPError, KeyError, IndexError):
        return _offline_response()
