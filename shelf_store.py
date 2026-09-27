"""Cross-session shelf of agent-produced paths under plugin-data."""

from __future__ import annotations

import json
import os
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

PLUGIN_ID = "made-shelf"
MAX_ITEMS = 80

IMAGE_EXT = {".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".bmp"}


def data_dir() -> Path:
    try:
        from plugins.plugin_storage import plugin_data_dir  # type: ignore

        return plugin_data_dir(PLUGIN_ID)
    except Exception:
        home = Path(os.environ.get("HERMES_HOME") or (Path.home() / ".hermes"))
        path = home / "plugin-data" / PLUGIN_ID
        path.mkdir(parents=True, exist_ok=True)
        return path


def state_path() -> Path:
    return data_dir() / "shelf.json"


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _empty() -> dict[str, Any]:
    return {"items": []}


def load_state() -> dict[str, Any]:
    path = state_path()
    if not path.is_file():
        return _empty()
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return _empty()
    if not isinstance(raw, dict):
        return _empty()
    if not isinstance(raw.get("items"), list):
        raw["items"] = []
    return raw


def save_state(state: dict[str, Any]) -> None:
    path = state_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(".json.tmp")
    tmp.write_text(json.dumps(state, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    os.replace(tmp, path)


def classify_path(path: str, tool_name: str) -> str:
    ext = Path(path).suffix.lower()
    if ext in IMAGE_EXT:
        return "image"
    if tool_name == "patch":
        return "patch"
    return "file"


def _normalize_path(raw: object) -> str | None:
    if not isinstance(raw, str):
        return None
    text = raw.strip().strip('"').strip("'")
    if not text or len(text) > 500:
        return None
    if "://" in text and not text.lower().startswith("file:"):
        return None
    return text


def extract_paths(tool_name: str, args: dict | None) -> list[str]:
    payload = args if isinstance(args, dict) else {}
    found: list[str] = []
    keys = ("path", "file", "filepath", "file_path", "target", "filename")
    for key in keys:
        p = _normalize_path(payload.get(key))
        if p:
            found.append(p)
    # patch sometimes uses paths list
    paths = payload.get("paths")
    if isinstance(paths, list):
        for item in paths:
            p = _normalize_path(item)
            if p:
                found.append(p)
    # dedupe preserve order
    out: list[str] = []
    seen: set[str] = set()
    for p in found:
        key = p.lower()
        if key in seen:
            continue
        seen.add(key)
        out.append(p)
    return out


def record_made(
    *,
    path: str,
    tool_name: str,
    session_id: str = "",
    summary: str = "",
) -> dict[str, Any] | None:
    clean = _normalize_path(path)
    if not clean:
        return None
    kind = classify_path(clean, tool_name)
    name = Path(clean).name or clean
    entry = {
        "id": str(uuid.uuid4()),
        "at": now_iso(),
        "kind": kind,
        "tool": str(tool_name or "")[:64],
        "path": clean[:500],
        "name": name[:214],
        "session_id": str(session_id or "")[:200],
        "summary": (summary or "")[:240],
        "pinned": False,
    }
    state = load_state()
    items: list[dict[str, Any]] = [it for it in state.get("items", []) if isinstance(it, dict)]
    # bump existing same path to top (keep pin)
    rest: list[dict[str, Any]] = []
    pinned = False
    for it in items:
        if str(it.get("path") or "").lower() == clean.lower():
            pinned = bool(it.get("pinned"))
            continue
        rest.append(it)
    entry["pinned"] = pinned
    rest.append(entry)
    if len(rest) > MAX_ITEMS:
        # drop oldest unpinned first
        pinned_items = [it for it in rest if it.get("pinned")]
        plain = [it for it in rest if not it.get("pinned")]
        plain = plain[-(MAX_ITEMS - len(pinned_items)) :]
        rest = pinned_items + plain
        rest.sort(key=lambda it: str(it.get("at") or ""))
    state["items"] = rest
    save_state(state)
    return entry


def list_items(*, kind: str | None = None, pinned_only: bool = False) -> list[dict[str, Any]]:
    items = [it for it in load_state().get("items", []) if isinstance(it, dict) and it.get("path")]
    if kind and kind != "all":
        items = [it for it in items if it.get("kind") == kind]
    if pinned_only:
        items = [it for it in items if it.get("pinned")]
    return items


def set_pinned(item_id: str, pinned: bool) -> bool:
    state = load_state()
    items = [it for it in state.get("items", []) if isinstance(it, dict)]
    found = False
    for it in items:
        if it.get("id") == item_id:
            it["pinned"] = bool(pinned)
            found = True
            break
    if not found:
        return False
    state["items"] = items
    save_state(state)
    return True


def remove_item(item_id: str) -> bool:
    state = load_state()
    items = [it for it in state.get("items", []) if isinstance(it, dict)]
    next_items = [it for it in items if it.get("id") != item_id]
    if len(next_items) == len(items):
        return False
    state["items"] = next_items
    save_state(state)
    return True


def clear_items(*, keep_pinned: bool = True) -> int:
    state = load_state()
    items = [it for it in state.get("items", []) if isinstance(it, dict)]
    if keep_pinned:
        kept = [it for it in items if it.get("pinned")]
        n = len(items) - len(kept)
        state["items"] = kept
    else:
        n = len(items)
        state["items"] = []
    save_state(state)
    return n


def snapshot(kind: str | None = None) -> dict[str, Any]:
    items = list_items(kind=kind)
    pinned = [it for it in items if it.get("pinned")]
    return {
        "ok": True,
        "count": len(items),
        "pinned_count": len(pinned),
        "items": items,
    }


def to_markdown(items: list[dict[str, Any]] | None = None) -> str:
    rows = items if items is not None else list_items()
    if not rows:
        return "(Made Shelf is empty)"
    lines = [f"Made Shelf — {len(rows)} items"]
    for i, it in enumerate(reversed(rows), 1):
        pin = "★ " if it.get("pinned") else ""
        lines.append(
            f"{i}. {pin}`{it.get('name')}` ({it.get('kind')}) — {it.get('path')}"
        )
    return "\n".join(lines)
