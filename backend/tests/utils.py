"""Shared assertion helpers for backend integration and service tests."""


def expect_status(response, expected: int, scope: str, action: str):
    """Assert HTTP status with clear context on failure."""
    assert response.status_code == expected, (
        f"[{scope}] '{action}': expected {expected}, got {response.status_code}: {response.text[:300]}"
    )


def run_or_hint(scope: str, fn):
    """Invoke a test helper call."""
    return fn()
