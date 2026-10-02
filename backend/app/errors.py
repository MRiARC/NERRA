"""Shared API error helpers."""

from fastapi import HTTPException


def not_implemented(task_doc: str) -> HTTPException:
    """The standard response for a feature that hasn't been implemented yet.

    Every `# YOUR CODE HERE` stub raises this, so the API always answers
    something useful instead of crashing. `task_doc` is the task file the
    implementer should read, e.g.:

        raise not_implemented("01-projects-crud")
    """
    return HTTPException(
        status_code=501,
        detail=f"Not implemented yet — this is part of Task {task_doc}. "
        f"See docs/tasks/{task_doc}.md",
    )
