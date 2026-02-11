# Tasks

## mc-011 — @file autocomplete + safe snippets (Project Chat)
- Status: **done**
- Date: 2026-02-11
- Notes:
  - API: `GET /api/vault/suggest?q=...&scope=clawd&max=N` → top matching safe file paths with metadata.
  - API: `GET /api/vault/snippet?file=...&scope=clawd&maxLines=40` → safe preview snippet (first N lines) with truncation.
  - UI: Project Chat shows a command-palette style chooser when typing `@`; selecting inserts `@path`.
  - Send: `@path` tokens are resolved to snippets and appended before sending to the OpenClaw session.
  - Safety: conservative top-level allowlist + extension allowlist; rejects absolute/.. paths; 2MB cap.
