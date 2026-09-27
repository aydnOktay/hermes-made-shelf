"""made-shelf — everything Hermes made for you, one Desktop shelf."""

from __future__ import annotations

import json
import sys
from pathlib import Path

_DIR = str(Path(__file__).resolve().parent)
if _DIR in sys.path:
    sys.path.remove(_DIR)
sys.path.insert(0, _DIR)

import shelf_context
import shelf_hooks
import shelf_schemas
import shelf_tools


def _slash_text(raw: object) -> str:
    if not isinstance(raw, str):
        return str(raw)
    text = raw.strip()
    if not text.startswith("{"):
        return text
    try:
        data = json.loads(text)
    except json.JSONDecodeError:
        return text
    if isinstance(data, dict):
        md = data.get("markdown")
        if isinstance(md, str) and md.strip():
            return md.strip()
        if data.get("ok") is False:
            return f"(error: {data.get('error') or 'failed'})"
    return text


def _handle_slash(ctx, raw_args: str) -> str:
    del ctx
    parts = (raw_args or "").strip().split()
    verb = (parts[0].lower() if parts else "list")
    if verb in {"help", "?"}:
        return (
            "Usage:\n"
            "  /made              — shelf list\n"
            "  /made list         — same\n"
            "  /made images       — images only\n"
            "  /made clear        — clear unpinned items\n"
            "Open Made Shelf in the sidebar for the full gallery."
        )
    if verb in {"clear", "reset"}:
        return _slash_text(
            shelf_tools.made_shelf_clear({"confirm": True, "keep_pinned": True})
        )
    kind = "all"
    if verb in {"images", "image"}:
        kind = "image"
    elif verb in {"files", "file"}:
        kind = "file"
    elif verb in {"patches", "patch"}:
        kind = "patch"
    elif verb not in {"list", "show", "shelf"}:
        # /made <kind>
        if verb in {"all", "file", "patch", "image"}:
            kind = verb
    return _slash_text(shelf_tools.made_shelf_list({"kind": kind, "markdown": True}))


def register(ctx) -> None:
    shelf_context.set_ctx(ctx)
    ctx.register_tool(
        name="made_shelf_list",
        toolset="made_shelf",
        schema=shelf_schemas.MADE_SHELF_LIST,
        handler=shelf_tools.made_shelf_list,
    )
    ctx.register_tool(
        name="made_shelf_clear",
        toolset="made_shelf",
        schema=shelf_schemas.MADE_SHELF_CLEAR,
        handler=shelf_tools.made_shelf_clear,
    )
    ctx.register_hook("post_tool_call", shelf_hooks.on_post_tool_call)

    try:
        ctx.register_command(
            "made",
            handler=lambda raw: _handle_slash(ctx, raw),
            description="Made Shelf — what Hermes produced",
            args_hint="list|images|files|patches|clear|help",
        )
    except TypeError:
        ctx.register_command(
            "made",
            handler=lambda raw: _handle_slash(ctx, raw),
            description="Made Shelf — what Hermes produced",
        )

    skill_md = Path(__file__).parent / "skills" / "made-shelf" / "SKILL.md"
    if skill_md.is_file():
        try:
            ctx.register_skill("made-shelf", skill_md)
        except TypeError:
            ctx.register_skill("made-shelf", str(skill_md))
