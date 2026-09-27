"""Local checks — no Hermes / network required."""

from __future__ import annotations

import json
import os
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
os.environ["HERMES_HOME"] = tempfile.mkdtemp(prefix="made-shelf-test-")

import shelf_hooks
import shelf_store
import shelf_tools


def test_extract_and_record() -> None:
    paths = shelf_store.extract_paths("write_file", {"path": "C:/tmp/hello.py"})
    assert paths == ["C:/tmp/hello.py"]
    entry = shelf_store.record_made(
        path="C:/tmp/hello.py",
        tool_name="write_file",
        session_id="s1",
        summary="ok",
    )
    assert entry and entry["kind"] == "file"
    img = shelf_store.record_made(
        path="C:/tmp/shot.png",
        tool_name="write_file",
        session_id="s1",
    )
    assert img and img["kind"] == "image"
    patch = shelf_store.record_made(
        path="C:/tmp/hello.py",
        tool_name="patch",
        session_id="s1",
    )
    assert patch and patch["kind"] == "patch"
    items = shelf_store.list_items()
    assert len(items) >= 2


def test_hooks() -> None:
    shelf_store.clear_items(keep_pinned=False)
    shelf_hooks.on_post_tool_call(
        tool_name="write_file",
        args={"path": "/workspace/app.ts"},
        result="wrote 12 lines",
        session_id="abc",
        status="ok",
    )
    assert shelf_store.list_items()
    shelf_hooks.on_post_tool_call(
        tool_name="web_search",
        args={"query": "x"},
        result="[]",
        session_id="abc",
    )
    # still only write items
    assert all(it.get("tool") != "web_search" for it in shelf_store.list_items())


def test_pin_and_tools() -> None:
    shelf_store.clear_items(keep_pinned=False)
    e = shelf_store.record_made(path="/a/b.txt", tool_name="write_file")
    assert e
    assert shelf_store.set_pinned(e["id"], True)
    data = json.loads(shelf_tools.made_shelf_list({"markdown": True}))
    assert data["ok"] is True
    assert data["count"] >= 1
    cleared = json.loads(
        shelf_tools.made_shelf_clear({"confirm": True, "keep_pinned": True})
    )
    assert cleared["ok"] is True
    assert cleared["count"] >= 1  # pinned kept


if __name__ == "__main__":
    test_extract_and_record()
    test_hooks()
    test_pin_and_tools()
    print("ok")
