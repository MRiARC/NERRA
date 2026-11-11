"""Dynamic LLM budget, windowing, timeout, and beat-sizing helpers."""

import re
from typing import Any

# (context_window_tokens, max_output_tokens)
_MODEL_SPECS: list[tuple[str, tuple[int, int]]] = [
    ("qwen3-coder-next", (256_000, 64_000)),
    ("claude-sonnet-4.5", (200_000, 64_000)),
    ("claude-haiku-4.5", (200_000, 64_000)),
    ("claude-3.7-sonnet", (200_000, 64_000)),
    ("claude_sonnet_4", (200_000, 64_000)),
    ("claude_haiku_4_5", (200_000, 64_000)),
    ("claude_3_7_sonnet", (200_000, 64_000)),
    ("glm-5", (200_000, 64_000)),
    ("simple-task", (200_000, 4_000)),
    ("minimax-m2.5", (196_000, 64_000)),
    ("minimax-m2.1", (196_000, 64_000)),
    ("deepseek-3.2", (164_000, 64_000)),
]
_DEFAULT_SPEC = (200_000, 64_000)


def get_model_limits(model_name: str | None) -> tuple[int, int]:
    """Return `(context_window_tokens, max_output_tokens)` for a model ID."""
    low = (model_name or "").strip().lower()
    for prefix, spec in _MODEL_SPECS:
        if low.startswith(prefix) or prefix in low:
            return spec
    return _DEFAULT_SPEC


def compute_input_char_budget(
    model_name: str | None,
    max_output_tokens: int = 4096,
    overhead_tokens: int = 4000,
    chars_per_token: float = 3.2,
) -> int:
    """Compute conservative character budget for chapter/text input inside model window."""
    ctx_tokens, model_out_cap = get_model_limits(model_name)
    effective_out = min(max_output_tokens, model_out_cap)
    available_tokens = max(2_500, ctx_tokens - effective_out - overhead_tokens)
    return int(available_tokens * chars_per_token)


def compute_context_char_budget(
    model_name: str | None,
    chapter_chars: int,
    max_output_tokens: int = 16384,
    min_chars: int = 12_000,
    max_chars: int = 64_000,
) -> int:
    """Dynamically allocate Story ContextBuilder char budget based on chapter size & model window."""
    total_budget = compute_input_char_budget(
        model_name, max_output_tokens=max_output_tokens, overhead_tokens=6_000
    )
    remaining = max(0, total_budget - max(0, int(chapter_chars)))
    return max(min_chars, min(max_chars, remaining))


def split_text_windows(text: str, max_chars: int, overlap_paragraphs: int = 2) -> list[str]:
    """Split oversized text cleanly at paragraph boundaries without losing tail content."""
    clean = text or ""
    if max_chars <= 0 or len(clean) <= max_chars:
        return [clean] if clean else []

    raw_paragraphs = [p for p in re.split(r"\n{2,}", clean) if p.strip()]
    if not raw_paragraphs:
        return []

    # If any single paragraph exceeds max_chars, subdivide it into overlapping slices
    # so no paragraph tail is dropped.
    paragraphs: list[str] = []
    step_ratio = 0.85
    for p in raw_paragraphs:
        if len(p) <= max_chars:
            paragraphs.append(p)
        else:
            step = max(1, int(max_chars * step_ratio))
            for i in range(0, len(p), step):
                chunk = p[i : i + max_chars]
                if chunk.strip():
                    paragraphs.append(chunk)

    if len(paragraphs) <= 1:
        return paragraphs

    windows: list[str] = []
    idx = 0
    while idx < len(paragraphs):
        buf: list[str] = []
        buf_len = 0
        start_idx = idx
        while idx < len(paragraphs):
            p = paragraphs[idx]
            add_len = len(p) + (2 if buf else 0)
            if buf and buf_len + add_len > max_chars:
                break
            buf.append(p)
            buf_len += add_len
            idx += 1
        windows.append("\n\n".join(buf))
        if idx >= len(paragraphs):
            break
        # Step back by overlap_paragraphs while guaranteeing forward progress
        idx = max(start_idx + 1, idx - max(0, overlap_paragraphs))
    return windows


def compute_dynamic_timeout_seconds(
    input_chars: int,
    max_tokens: int,
    floor_s: float = 45.0,
    ceil_s: float = 600.0,
) -> float:
    """Scale HTTP request timeout dynamically from prompt chars and generation headroom."""
    est = 30.0 + (max(0, int(input_chars)) / 1500.0) + (max(0, int(max_tokens)) / 60.0)
    return round(max(floor_s, min(ceil_s, est)), 1)


def compute_event_beat_range(chapter_text: str) -> tuple[int, int]:
    """Scale target key narrative beat counts smoothly with chapter word count."""
    words = len((chapter_text or "").split())
    low = max(4, min(12, words // 700 if words >= 2800 else 4))
    high = max(low + 4, min(25, (words // 400) + 4))
    return low, high


def compute_intent_batch_size(
    max_output_tokens: int = 2048,
    est_tokens_per_item: int = 160,
    min_items: int = 4,
    max_items: int = 16,
) -> int:
    """Compute how many issues fit safely per batched `classify_intent_batch` call."""
    raw = max(1, (max(512, int(max_output_tokens)) - 256) // max(64, est_tokens_per_item))
    return max(min_items, min(max_items, raw))


def compute_shared_context_budget(
    model_name: str | None,
    max_output_tokens: int = 2048,
    min_chars: int = 12_000,
    max_chars: int = 48_000,
) -> int:
    """Scale shared surrounding context chars for batch intent reasoning."""
    budget = compute_input_char_budget(
        model_name, max_output_tokens=max_output_tokens, overhead_tokens=4_000
    )
    return max(min_chars, min(max_chars, budget // 4))


def parse_retry_after_seconds(exc: Any) -> float | None:
    """Extract numeric Retry-After header seconds from an Anthropic/HTTP exception if present."""
    resp = getattr(exc, "response", None)
    headers = getattr(resp, "headers", None) if resp is not None else None
    if not headers:
        return None
    val = headers.get("retry-after") or headers.get("Retry-After")
    if val is None:
        return None
    try:
        secs = float(val)
        return secs if secs > 0 else None
    except (TypeError, ValueError):
        return None
