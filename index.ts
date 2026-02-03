import type { OpenClawPluginApi } from "openclaw/plugin-sdk";
import path from "node:path";
import os from "node:os";
import { discoverLocalMyoApiKey } from "./src/auth.js";
import { ensureDir, writeTextFile } from "./src/fs.js";
import { collectTaskUpdatesFromRoot } from "./src/push.js";
import {
  renderGoalsMd,
  renderHeartbeatsMd,
  renderJobsMd,
  renderMemoryMd,
  renderProjectMd,
  renderTasksMd,
  renderUserMd,
  slugify,
} from "./src/templates.js";
import { fetchMyoclawSync } from "./src/myo-api.js";
import { normalizeMyoApiBaseUrl } from "./src/url.js";
import { getJobsDir, myoJobToJobFileStem, renderJobMd } from "./src/jobs.js";
import { syncMyoJobsToOpenClawCron } from "./src/cron-sync.js";
import { watchTasksMd } from "./src/watch.js";

type MyoPluginConfig = {
  enabled?: boolean;
  apiBaseUrl?: string;
  apiKey?: string;
  rootDir?: string;
};

function expandHome(p: string) {
  if (!p) return p;
  return p.startsWith("~") ? path.join(os.homedir(), p.slice(1)) : p;
}

function formatMyoError(err: any) {
  const msg = err?.message || String(err);

  if (/Missing apiKey/i.test(msg)) {
    return [
      msg,
      "\nNext steps:",
      "  - Run: openclaw myo connect --api-key <key>",
      "  - Or:  openclaw myo import-key (best-effort from local session)",
    ].join("\n");
  }

  if (/HTTP 401|HTTP 403|unauthorized|forbidden/i.test(msg)) {
    return [
      msg,
      "\nThis usually means your API key is missing/expired/revoked.",
      "Fix:",
      "  - Run: openclaw myo connect --api-key <key>",
      "  - Or:  openclaw myo import-key",
    ].join("\n");
  }

  if (/HTTP 404|not found/i.test(msg)) {
    return [
      msg,
      "\nTip: check apiBaseUrl. It should usually be https://myo.ai (openclaw myo status).",
    ].join("\n");
  }

  if (/redirect/i.test(msg)) {
    return [
      msg,
      "\nTip: use the canonical base URL (no redirects) because redirects can drop Authorization headers.",
      "Try: openclaw myo connect --api-base-url https://myo.ai --api-key <key>",
    ].join("\n");
  }

  if (/ECONNREFUSED|ENOTFOUND|fetch failed|network|ETIMEDOUT/i.test(msg)) {
    return [msg, "\nTip: check your network + apiBaseUrl (openclaw myo status)."].join("\n");
  }

  return msg;
}

async function runSeedSync(api: OpenClawPluginApi, overrides?: { rootDir?: string }) {
  const cfg = (api.pluginConfig || {}) as MyoPluginConfig;
  const root = expandHome(overrides?.rootDir || cfg.rootDir || "~/.myo");

  if (!cfg.apiKey) {
    // v0 fallback: seed minimal files even without API key.
    await writeTextFile(path.join(root, "USER.md"), renderUserMd({ name: "Houston" }));
    await writeTextFile(path.join(root, "GOALS.md"), renderGoalsMd());
    await writeTextFile(path.join(root, "MEMORY.md"), renderMemoryMd());
    await ensureDir(path.join(root, "projects"));
    api.logger.info(`[myo] seeded files in ${root} (no apiKey; v0)`);
    return;
  }

  const apiBaseUrl = normalizeMyoApiBaseUrl(cfg.apiBaseUrl || "https://myo.ai");
  const payload = await fetchMyoclawSync({ apiBaseUrl, apiKey: cfg.apiKey });

  // Root files
  await writeTextFile(
    path.join(root, "USER.md"),
    renderUserMd({ name: payload.user?.full_name || "(unknown)", timezone: payload.user?.timezone || null }),
  );
  await writeTextFile(path.join(root, "GOALS.md"), renderGoalsMd());
  await writeTextFile(path.join(root, "MEMORY.md"), renderMemoryMd({ seed: payload.memorySeed || null }));
  const jobs = (payload as any).jobs || [];
  await writeTextFile(path.join(root, "JOBS.md"), renderJobsMd({ jobs }));
  await writeTextFile(
    path.join(root, "HEARTBEATS.md"),
    renderHeartbeatsMd({ heartbeats: (payload as any).heartbeats || [] }),
  );

  // v1 parity: write one markdown file per job under ~/.myo/jobs/
  await ensureDir(getJobsDir(root));
  for (const j of jobs) {
    const stem = myoJobToJobFileStem(j);
    await writeTextFile(path.join(getJobsDir(root), `${stem}.md`), renderJobMd(j));
  }

  // Best-effort: also sync Myo jobs into OpenClaw cron scheduler.
  await syncMyoJobsToOpenClawCron({ runtime: api.runtime, logger: api.logger, jobs }).catch((err: any) => {
    api.logger.warn?.(`[myo] cron-sync skipped: ${err?.message || String(err)}`);
  });

  // Projects + tasks
  const projects = payload.projects || [];
  const tasks = payload.tasks || [];

  await ensureDir(path.join(root, "projects"));

  for (const p of projects) {
    const slug = slugify(p.name || p.id);
    const projDir = path.join(root, "projects", slug);
    await writeTextFile(path.join(projDir, "PROJECT.md"), renderProjectMd(p));

    const projectTasks = tasks.filter((t: any) => t.project_id === p.id);
    await writeTextFile(path.join(projDir, "TASKS.md"), renderTasksMd({ tasks: projectTasks }));
  }

  // Unassigned tasks bucket
  const unassigned = tasks.filter((t: any) => !t.project_id);
  if (unassigned.length) {
    const inboxDir = path.join(root, "projects", "inbox");
    await writeTextFile(path.join(inboxDir, "PROJECT.md"), "# PROJECT\n\nName: Inbox\n");
    await writeTextFile(path.join(inboxDir, "TASKS.md"), renderTasksMd({ tasks: unassigned }));
  }

  api.logger.info(`[myo] synced ${projects.length} projects, ${tasks.length} tasks → ${root}`);
}

async function runPush(api: OpenClawPluginApi, opts?: { dryRun?: boolean; checkedOnly?: boolean }) {
  const cfg = (api.pluginConfig || {}) as MyoPluginConfig;
  if (!cfg.apiKey) throw new Error("Missing apiKey. Run: openclaw myo connect --api-key ...");
  const apiBaseUrl = normalizeMyoApiBaseUrl(cfg.apiBaseUrl || "https://myo.ai");
  const root = expandHome(cfg.rootDir || "~/.myo");

  const updates = await collectTaskUpdatesFromRoot(root, { includeUnchecked: !opts?.checkedOnly });
  if (!updates.length) {
    api.logger.info("[myo] push: no task lines found in TASKS.md");
    return;
  }

  if (opts?.dryRun) {
    api.logger.info(`[myo] push --dry-run: would update ${updates.length} tasks`);
    for (const u of updates.slice(0, 50)) api.logger.info(`  - ${u.id} -> ${u.status}`);
    if (updates.length > 50) api.logger.info(`  ... (+${updates.length - 50} more)`);
    return;
  }

  const res = await fetch(`${apiBaseUrl.replace(/\/$/, "")}/api/myoclaw/tasks/update`, {
    method: "POST",
    redirect: "manual",
    headers: {
      Authorization: `Bearer ${cfg.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ updates }),
  });
  if (res.status >= 300 && res.status < 400) {
    const loc = res.headers.get("location");
    throw new Error(
      `Myo API returned a redirect (HTTP ${res.status}) to ${loc || "(no location)"}. ` +
        `This can cause clients to drop Authorization. Use the canonical apiBaseUrl (try https://myo.ai).`,
    );
  }

  const json: any = await res.json().catch(() => ({}));
  if (!res.ok || json?.success === false) {
    const msg = json?.error?.message || `HTTP ${res.status}`;
    throw new Error(msg);
  }

  api.logger.info(`[myo] push: updated ${updates.length} tasks`);
}

function registerMyoCli(api: OpenClawPluginApi, program: any) {
  const myo = program.command("myo").description("Connect OpenClaw to Myo (myo.ai)");

  myo
    .command("connect")
    .requiredOption("--api-key <key>", "Myo API key")
    .option("--api-base-url <url>", "Myo API base URL", "https://myo.ai")
    .option("--root-dir <path>", "Root directory for rendered files", "~/.myo")
    .description("Connect to myo.ai using an API key (persists into OpenClaw config)")
    .action(async (opts: any) => {
      try {
        const runtime = api.runtime;
        const cfg = runtime.config.loadConfig() as any;

        const next = {
          ...cfg,
          plugins: {
            ...cfg.plugins,
            entries: {
              ...(cfg.plugins?.entries || {}),
              myo: {
                ...(cfg.plugins?.entries?.myo || {}),
                enabled: true,
                config: {
                  ...(cfg.plugins?.entries?.myo?.config || {}),
                  apiKey: String(opts.apiKey),
                  apiBaseUrl: normalizeMyoApiBaseUrl(String(opts.apiBaseUrl || "https://myo.ai")),
                  rootDir: String(opts.rootDir || "~/.myo"),
                },
              },
            },
          },
        };

        await runtime.config.writeConfigFile(next);
        api.logger.info(`[myo] connected. saved apiKey + apiBaseUrl + rootDir to config.`);
      } catch (err: any) {
        api.logger.error(formatMyoError(err));
        throw err;
      }
    });

  myo
    .command("import-key")
    .option("--path <path>", "Optional extra path to try (json or text)")
    .option("--print", "Print the discovered key to stdout (be careful)", false)
    .description("Best-effort: discover a Myo API key from a local session/config and store it into OpenClaw config")
    .action(async (opts: any) => {
      const found = await discoverLocalMyoApiKey({ extraPaths: opts.path ? [String(opts.path)] : [] });
      if (!found) {
        api.logger.error(
          [
            "[myo] import-key: could not discover an API key from local session.",
            "Tried env:MYO_API_KEY + common paths (~/.config/myo, ~/.myo, ~/Library/Application Support/myo).",
            "You can still run: openclaw myo connect --api-key <key>",
          ].join("\n"),
        );
        return;
      }

      if (opts.print) api.logger.info(found.apiKey);

      const runtime = api.runtime;
      const cfg = runtime.config.loadConfig() as any;

      const next = {
        ...cfg,
        plugins: {
          ...cfg.plugins,
          entries: {
            ...(cfg.plugins?.entries || {}),
            myo: {
              ...(cfg.plugins?.entries?.myo || {}),
              enabled: true,
              config: {
                ...(cfg.plugins?.entries?.myo?.config || {}),
                apiKey: found.apiKey,
              },
            },
          },
        },
      };

      await runtime.config.writeConfigFile(next);
      api.logger.info(`[myo] import-key: saved apiKey from ${found.source}`);
    });

  myo
    .command("init")
    .option("--root-dir <path>", "Root directory for rendered files", "~/.myo")
    .description("Initialize the local ~/.myo file tree (creates base files + folders)")
    .action(async (opts: any) => {
      try {
        const rootDir = expandHome(String(opts.rootDir || "~/.myo"));
        await ensureDir(rootDir);
        // `runSeedSync` will do a full sync if apiKey is configured; otherwise it seeds minimal files.
        await runSeedSync(api, { rootDir });
        api.logger.info(`[myo] init complete → ${rootDir}`);
      } catch (err: any) {
        api.logger.error(formatMyoError(err));
        throw err;
      }
    });

  myo
    .command("status")
    .description("Show Myo connection + sync status")
    .action(() => {
      const cfg = (api.pluginConfig || {}) as MyoPluginConfig;
      api.logger.info(`[myo] enabled=${cfg.enabled ?? true}`);
      api.logger.info(`[myo] apiBaseUrl=${cfg.apiBaseUrl ?? "https://myo.ai"}`);
      api.logger.info(`[myo] rootDir=${cfg.rootDir ?? "~/.myo"}`);
      api.logger.info(`[myo] apiKey=${cfg.apiKey ? "set" : "(not set)"}`);
    });

  myo
    .command("sync")
    .option("--once", "Run a single sync pass", true)
    .description("Sync projects/tasks/memory/jobs/heartbeats (DB → files)")
    .action(async () => {
      try {
        await runSeedSync(api);
        api.logger.info(`[myo] sync complete`);
      } catch (err: any) {
        api.logger.error(formatMyoError(err));
        throw err;
      }
    });

  myo
    .command("push")
    .option("--dry-run", "Compute updates but do not POST to Myo", false)
    .option("--checked-only", "Only push checked tasks (legacy v0 behavior)", false)
    .description("Push local edits back to Myo (TASKS.md checkboxes → task.status)")
    .action(async (opts: any) => {
      try {
        await runPush(api, { dryRun: Boolean(opts.dryRun), checkedOnly: Boolean(opts.checkedOnly) });
      } catch (err: any) {
        api.logger.error(formatMyoError(err));
        throw err;
      }
    });

  myo
    .command("watch")
    .option("--interval-ms <ms>", "Polling interval in ms", "3000")
    .option("--dry-run", "Compute updates but do not POST to Myo", false)
    .option("--checked-only", "Only push checked tasks (legacy v0 behavior)", false)
    .description("Watch local TASKS.md for changes and push updates")
    .action(async (opts: any) => {
      const cfg = (api.pluginConfig || {}) as MyoPluginConfig;
      const root = expandHome(cfg.rootDir || "~/.myo");
      const intervalMs = Number(opts.intervalMs || 3000);

      await watchTasksMd({
        rootDir: root,
        intervalMs,
        logger: api.logger,
        onChange: async () => {
          await runPush(api, { dryRun: Boolean(opts.dryRun), checkedOnly: Boolean(opts.checkedOnly) });
        },
      });
    });

  myo
    .command("jobs:watch")
    .option("--interval-ms <ms>", "Polling interval in ms", "10000")
    .option("--dry-run", "Show intended cron edits but do not apply", false)
    .description("Watch Myo jobs and keep OpenClaw cron in sync")
    .action(async (opts: any) => {
      const cfg = (api.pluginConfig || {}) as MyoPluginConfig;
      if (!cfg.apiKey) throw new Error("Missing apiKey. Run: openclaw myo connect --api-key ...");

      const apiBaseUrl = normalizeMyoApiBaseUrl(cfg.apiBaseUrl || "https://myo.ai");
      const intervalMs = Math.max(1000, Number(opts.intervalMs || 10000));

      let lastFp = "";
      api.logger.info(`[myo] jobs:watch polling ${apiBaseUrl}/api/myoclaw/sync every ${intervalMs}ms (Ctrl+C to stop)`);

      // eslint-disable-next-line no-constant-condition
      while (true) {
        const payload = await fetchMyoclawSync({ apiBaseUrl, apiKey: cfg.apiKey });
        const jobs = (payload as any).jobs || [];
        const fp = JSON.stringify(jobs.map((j: any) => ({
          id: j.id,
          name: j.name,
          cron_expression: j.cron_expression,
          timezone: j.timezone,
          enabled: j.enabled,
          payload_kind: j.payload_kind,
          payload_text: j.payload_text,
        })));

        if (fp !== lastFp) {
          lastFp = fp;
          await syncMyoJobsToOpenClawCron({ runtime: api.runtime, logger: api.logger, jobs, dryRun: Boolean(opts.dryRun) });
        }

        await new Promise((r) => setTimeout(r, intervalMs));
      }
    });
}

export default function register(api: OpenClawPluginApi) {
  api.registerCli(({ program }) => registerMyoCli(api, program), { commands: ["myo"] });
}
