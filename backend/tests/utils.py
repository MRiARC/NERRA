"""Helpers that turn unimplemented features into instructive test failures."""

import pytest


def fail_task(task: str, message: str):
    """Fail with a clear, beginner-friendly message (no scary tracebacks)."""
    pytest.fail(f"[Task {task}] {message}", pytrace=False)


def expect_status(response, expected: int, task: str, action: str):
    """Assert an HTTP status, with special treatment for 501 stubs."""
    if response.status_code == 501:
        fail_task(
            task,
            f"'{action}' returned 501 Not Implemented — that part is still a stub. "
            f"Open docs/tasks/{task}.md and fill in the YOUR CODE blocks.",
        )
    assert response.status_code == expected, (
        f"[Task {task}] '{action}': expected {expected}, got {response.status_code}: {response.text[:300]}"
    )


def run_or_hint(task: str, fn):
    """Run fn(); NotImplementedError becomes a friendly failure."""
    try:
        return fn()
    except NotImplementedError as exc:
        fail_task(task, f"not implemented yet — {exc}")
