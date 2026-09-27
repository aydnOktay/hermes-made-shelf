"""JSON tool schemas."""

from __future__ import annotations

MADE_SHELF_LIST = {
    "name": "made_shelf_list",
    "description": (
        "List files Hermes made (wrote/patched) on the Made Shelf — cross-session "
        "gallery of agent outputs. Paths only; no file contents."
    ),
    "parameters": {
        "type": "object",
        "properties": {
            "kind": {
                "type": "string",
                "enum": ["all", "file", "patch", "image"],
                "description": "Filter by kind (default all).",
            },
            "markdown": {"type": "boolean"},
        },
        "additionalProperties": False,
    },
}

MADE_SHELF_CLEAR = {
    "name": "made_shelf_clear",
    "description": (
        "Clear Made Shelf items locally. By default keeps pinned entries. "
        "Does not delete the underlying files."
    ),
    "parameters": {
        "type": "object",
        "properties": {
            "confirm": {"type": "boolean"},
            "keep_pinned": {"type": "boolean", "default": True},
        },
        "required": ["confirm"],
        "additionalProperties": False,
    },
}
