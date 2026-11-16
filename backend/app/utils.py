"""Shared Utility Functions across NERRA Backend Services."""

import uuid
from typing import Any


def as_uuid(value: Any) -> uuid.UUID:
    """Normalize a UUID, string, or stringifiable object into a canonical uuid.UUID."""
    if isinstance(value, uuid.UUID):
        return value
    return uuid.UUID(str(value))


# Backward compatibility alias
_as_uuid = as_uuid
