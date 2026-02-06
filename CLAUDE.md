# Myo OpenClaw Plugin Context

## Overview
This plugin connects OpenClaw (local AI agent) to Myo.ai cloud platform, enabling:
- Bidirectional sync of sessions, tasks, projects, jobs
- Gateway heartbeat to maintain "connected" status in web UI
- Local file tree sync at `~/.myo/`

## Plugin Structure
```
~/.openclaw/extensions/myo/
├── index.ts          # Main plugin registration, CLI commands, heartbeat
├── src/
│   ├── myo-api.ts    # API client (heartbeat, sync, sessions)
│   ├── auth.ts       # API key discovery
│   ├── fs.ts         # File utilities
│   ├── push.ts       # Task updates collection
│   ├── push-jobs.ts  # Job updates collection
│   ├── templates.ts  # Markdown rendering for local files
│   └── watch.ts      # File watcher for TASKS.md
└── openclaw.plugin.json
```

## Configuration
Stored in `~/.openclaw/openclaw.json` under `plugins.entries.myo.config`:
```json
{
  "apiKey": "myo_gw_...",
  "apiBaseUrl": "https://www.myo.ai",
  "rootDir": "~/.myo"
}
```

## CLI Commands
- `openclaw myo connect --api-key <key>` - Save API key to config
- `openclaw myo status` - Show connection status
- `openclaw myo sync` - Bidirectional sync (pull + push + sessions)
- `openclaw myo sync --pull-only` - Only pull from cloud
- `openclaw myo sync --push-only` - Only push to cloud
- `openclaw myo sessions:sync` - Sync local sessions to cloud
- `openclaw myo push` - Push task/job changes to cloud
- `openclaw myo heartbeat --once` - Send single heartbeat

## Heartbeat Behavior
- Starts automatically when running `openclaw gateway`
- Does NOT start for regular CLI commands (prevents hanging)
- Interval: 60 seconds
- Timeout: 10 seconds per request
- Updates `gateway_connections.status` and `last_ping_at` in Supabase

## API Endpoints Used
- `POST /api/myoclaw/heartbeat` - Connection status
- `GET /api/myoclaw/sync` - Pull tasks/projects/jobs
- `POST /api/myoclaw/sessions/sync` - Push local sessions
- `POST /api/myoclaw/tasks/update` - Push task status changes
- `POST /api/myoclaw/jobs/update` - Push job config changes

## Session Sync
- Collects sessions from `~/.openclaw/agents/*/sessions/*.jsonl`
- Parses JSONL format (type: "message" entries)
- Sends last 50 messages per session
- Uses upsert to avoid duplicates (keyed by gateway_id + session_key)

## Local File Tree (`~/.myo/`)
```
~/.myo/
├── USER.md       # User info
├── GOALS.md      # Goals
├── MEMORY.md     # Memory seed
├── JOBS.md       # Scheduled jobs
├── SESSIONS.md   # Recent sessions
└── projects/
    ├── <project-slug>/
    │   ├── PROJECT.md
    │   └── TASKS.md
    └── inbox/
        └── TASKS.md
```

## Recent Fixes (Feb 2026)
1. Heartbeat only starts for gateway processes (check `process.argv` for "gateway")
2. Added timeouts to all API calls to prevent hanging
3. `myo sync` now does full bidirectional sync by default
4. Fixed session parsing for OpenClaw JSONL format
