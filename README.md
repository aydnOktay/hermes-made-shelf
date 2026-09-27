# Made Shelf

**Everything Hermes made for you — one shelf.**

A Hermes Desktop plugin: cross-session gallery of paths the agent **wrote** or
**patched** (images included). Pin keepers, insert into chat, reveal on disk.
Not a session tray — a lasting product shelf.

Repo: https://github.com/aydnOktay/hermes-made-shelf

POWERED BY HERMES AGENT · COMMUNITY PLUGIN · v0.1.0

Disclosure — stores **local path metadata** under `$HERMES_HOME/plugin-data/made-shelf/`.
Does not upload file contents. No API keys.

## What you get

| | |
| --- | --- |
| **Full page** Sidebar **Made Shelf** at `/made-shelf`. | **Status chip** `made N`. |
| **Live capture** `post_tool_call` on `write_file` / `patch`. | **Pin / insert / reveal** from the page. |
| **Filters** all · file · patch · image | **Slash** `/made` |

## Install

```powershell
hermes plugins install https://github.com/aydnOktay/hermes-made-shelf.git
hermes plugins enable made-shelf
```

Copy the Desktop package (Hermes 0.21 may skip it):

```powershell
New-Item -ItemType Directory -Force -Path "$env:LOCALAPPDATA\hermes\desktop-plugins\made-shelf" | Out-Null
Copy-Item "$env:LOCALAPPDATA\hermes\plugins\made-shelf\desktop\plugin.js" "$env:LOCALAPPDATA\hermes\desktop-plugins\made-shelf\plugin.js" -Force
```

Restart Hermes. Open **Made Shelf** in the sidebar.

## Use

1. Ask Hermes to write or patch a file.
2. Path appears on Made Shelf + chip count.
3. **Insert path** / **Reveal** / **Pin**.

```
/made
/made images
/made clear
```

Tools: `made_shelf_list`, `made_shelf_clear` (does **not** delete real files).

## vs file-tray

| | file-tray | Made Shelf |
| --- | --- | --- |
| Scope | Current session | Cross-session |
| Surface | Side pane | Full page product |
| Job | Quick tray of touched paths | Lasting “what Hermes made” gallery |

## License

MIT
