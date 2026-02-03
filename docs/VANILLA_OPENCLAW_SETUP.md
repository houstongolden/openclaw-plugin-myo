# Vanilla OpenClaw + Myo Plugin — Fresh Install Smoke Test

This is the **canonical proof** that Myo works with a stock OpenClaw install (no Myobot fork).

## Preconditions
- OpenClaw installed (`openclaw` on PATH)
- Myo web running locally (`http://localhost:3000`) *or* you’re using `https://myo.ai`
- You can mint an API key from the Myo app (signed in)

## 1) Install/link plugin
```bash
openclaw plugins install --link ~/Desktop/CODE_2026/openclaw-plugin-myo
openclaw gateway restart
openclaw plugins list | rg myo
```

## 2) Connect to Myo (persist config)
Get an API key:
```bash
curl -sS -X POST http://localhost:3000/api/myoclaw/api-key | jq
```

Then connect:
```bash
openclaw myo connect --api-key <PASTE_KEY> --api-base-url http://localhost:3000 --root-dir ~/.myo
openclaw myo status
```

## 3) Sync down (DB → files)
```bash
openclaw myo sync --once
ls -la ~/.myo
```

You should see:
- `USER.md`, `GOALS.md`, `MEMORY.md`, `JOBS.md`, `SESSIONS.md`
- `projects/*/PROJECT.md`
- `projects/*/TASKS.md`

## 4) Push back (files → DB)
### Tasks
- check a task in `~/.myo/projects/**/TASKS.md`
- run:
```bash
openclaw myo push
```

### Jobs
- toggle a job line in `~/.myo/JOBS.md` (switch `[ ]` ↔ `[x]`)
- run:
```bash
openclaw myo push
```

## 5) One-click smoke test script (Houston dev env)
Houston’s local convenience script lives here:
- `~/clawd/scripts/test-fresh-openclaw-myo-plugin.sh`

Run:
```bash
~/clawd/scripts/test-fresh-openclaw-myo-plugin.sh
```
