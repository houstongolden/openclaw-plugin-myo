# Myo OpenClaw Plugin (myo)

This plugin adds `openclaw myo ...` commands to connect OpenClaw to **myo.ai** *and* to bootstrap a local-first “Mission Control” folder (no account required).

## Install (local dev)
```bash
openclaw plugins install --link ~/.openclaw/extensions/myo
openclaw gateway restart
openclaw myo status
```

## Local-first quick start (no Myo.ai account)
```bash
openclaw myo init
openclaw myo starter-pack
open -a Finder ~/.myo
```

## Install local cron templates (no account)
```bash
# browse packs
openclaw myo templates:list

# preview install
openclaw myo templates:install --pack daily-ops

# install disabled (safe default)
openclaw myo templates:install --pack daily-ops --yes

# install enabled
openclaw myo templates:install --pack daily-ops --yes --enable

# other packs
openclaw myo templates:install --pack weekly-review
openclaw myo templates:install --pack inbox-triage
```

## Mission Control scaffold (no account)
```bash
openclaw myo mc:init
open -a Finder ~/.myo
```

## One-command onboarding (no account)
```bash
# preview (no cron install)
openclaw myo onboarding

# install daily-ops cron templates (disabled by default)
openclaw myo onboarding --yes

# install enabled
openclaw myo onboarding --yes --enable
```

## Template status
```bash
openclaw myo templates:status
```

## Uninstall templates
```bash
# preview
openclaw myo templates:uninstall

# remove all myo-template-* cron jobs
openclaw myo templates:uninstall --yes

# or remove just one pack
openclaw myo templates:uninstall --pack weekly-review --yes
```

## Diagnostics
```bash
openclaw myo doctor
```

## Fresh install proof (smoke test)
See: `docs/VANILLA_OPENCLAW_SETUP.md`

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
