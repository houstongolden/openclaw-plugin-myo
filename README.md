# Myo OpenClaw Plugin (myo)

This plugin adds `openclaw myo ...` commands to connect OpenClaw to **myo.ai**.

## Install (local dev)
```bash
openclaw plugins install --link ~/Desktop/CODE_2026/openclaw-plugin-myo
openclaw gateway restart
openclaw myo status
```

## Commands (WIP)
- `openclaw myo init` — create local `~/.myo` tree
- `openclaw myo connect --api-key ...` — persist API key into OpenClaw config
- `openclaw myo import-key` — best-effort import API key from local session/env
- `openclaw myo status`
- `openclaw myo sync`
- `openclaw myo push [--dry-run] [--checked-only]`
- `openclaw myo watch [--dry-run]` — poll for TASKS.md changes and push

## Status
Early scaffold. Spec lives in:
- `~/clawd/projects/myo-ai/SPEC_myoclaw_plugin_v1.md`
