"""Base Pydantic models for resilient LLM tool output parsing.

Protects against proxy or model quirks where nested arrays or objects are
emitted as stringified JSON (e.g. "claims": "[...]").
"""

import json
from typing import Any
from pydantic import BaseModel, model_validator


def coerce_json_recursive(val: Any) -> Any:
    """Recursively unpack any stringified JSON dictionaries, lists, or markdown blocks."""
    if isinstance(val, str):
        stripped = val.strip()
        # Strip markdown code fences if present (e.g. ```json ... ```)
        if stripped.startswith("```"):
            lines = stripped.splitlines()
            if len(lines) >= 3 and lines[0].startswith("```"):
                stripped = "\n".join(lines[1:-1]).strip()
        if stripped.startswith(("{", "[")):
            try:
                parsed = json.loads(stripped)
                return coerce_json_recursive(parsed)
            except Exception:
                return val
        return val

    if isinstance(val, dict):
        return {k: coerce_json_recursive(v) for k, v in val.items()}

    if isinstance(val, list):
        return [coerce_json_recursive(item) for item in val]

    return val


class LenientToolModel(BaseModel):
    """Base Pydantic model for LLM tool call inputs.

    Transparently coerces nested stringified JSON (arrays, objects, or markdown blocks)
    emitted by proxies or LLMs before field validation.
    """

    @model_validator(mode="before")
    @classmethod
    def coerce_nested_json(cls, data: Any) -> Any:
        return coerce_json_recursive(data)
