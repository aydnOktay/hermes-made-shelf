"""post_tool_call observer — record write_file / patch paths. Never raise."""

from __future__ import annotations

import shelf_store

WATCH = {"write_file", "patch"}


def on_post_tool_call(
    tool_name: str = "",
    args: dict | None = None,
    result: str = "",
    session_id: str = "",
    status: str = "",
    **kwargs,
) -> None:
    del kwargs
    try:
        name = str(tool_name or "")
        if name not in WATCH:
            return
        # Skip hard failures when status is explicit
        if status and str(status).lower() in {"error", "failed", "blocked"}:
            return
        paths = shelf_store.extract_paths(name, args if isinstance(args, dict) else {})
        summary = ""
        if isinstance(result, str) and result.strip():
            summary = result.strip().replace("\n", " ")[:240]
        for path in paths:
            shelf_store.record_made(
                path=path,
                tool_name=name,
                session_id=str(session_id or ""),
                summary=summary,
            )
    except Exception:
        return
