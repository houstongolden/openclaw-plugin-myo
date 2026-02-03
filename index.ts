import type { OpenClawPluginApi } from "openclaw/plugin-sdk";
import path from "node:path";
import os from "node:os";
import { discoverLocalMyoApiKey } from "./src/auth.js";
import { ensureDir, writeTextFile } from "./src/fs.js";
import { collectTaskUpdatesFromRoot } from "./src/push.js";
import { collectJobUpdatesFromRoot } from "./src/push-jobs.js";
import {
  renderGoalsMd,
  renderJobsMd,
  renderMemoryMd,
  renderProjectMd,
  renderTasksMd,
  renderUserMd,
  renderSessionsMd,
  slugify,
} from "./src/templates.js";
import { fetchMyoclawSessions, fetchMyoclawSync, importGatewayCronJobs, updateMyoclawJobs } from "./src/myo-api.js";
import { watchTasksMd } from "./src/watch.js";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

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
  if (/ECONNREFUSED|ENOTFOUND|fetch failed|network/i.test(msg)) {
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

  const apiBaseUrl = cfg.apiBaseUrl || "https://myo.ai";
  const payload = await fetchMyoclawSync({ apiBaseUrl, apiKey: cfg.apiKey });

  // Root files
  await writeTextFile(
    path.join(root, "USER.md"),
    renderUserMd({ name: payload.user?.full_name || "(unknown)", timezone: payload.user?.timezone || null }),
  );
  await writeTextFile(path.join(root, "GOALS.md"), renderGoalsMd());
  await writeTextFile(path.join(root, "MEMORY.md"), renderMemoryMd({ seed: payload.memorySeed || null }));
  await writeTextFile(path.join(root, "JOBS.md"), renderJobsMd({ jobs: payload.jobs || [] }));

  // Sessions (best-effort; requires gateway session mirror in Myo DB)
  try {
    const sessions = await fetchMyoclawSessions({ apiBaseUrl, apiKey: cfg.apiKey, limit: 50 });
    await writeTextFile(path.join(root, "SESSIONS.md"), renderSessionsMd({ sessions }));
  } catch {
    // Non-critical; don't fail sync.
  }

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
  const apiBaseUrl = cfg.apiBaseUrl || "https://myo.ai";
  const root = expandHome(cfg.rootDir || "~/.myo");

  const taskUpdates = await collectTaskUpdatesFromRoot(root, { includeUnchecked: !opts?.checkedOnly });
  const jobUpdates = await collectJobUpdatesFromRoot(root);

  if (!taskUpdates.length && !jobUpdates.length) {
    api.logger.info("[myo] push: no updates found (TASKS.md / JOBS.md)");
    return;
  }

  if (opts?.dryRun) {
    api.logger.info(`[myo] push --dry-run:`);
    api.logger.info(`  - tasks: ${taskUpdates.length}`);
    api.logger.info(`  - jobs:  ${jobUpdates.length}`);
    for (const u of taskUpdates.slice(0, 25)) api.logger.info(`  task ${u.id} -> ${u.status}`);
    for (const j of jobUpdates.slice(0, 25)) api.logger.info(`  job  ${j.id} -> enabled=${j.enabled} cron="${j.cron_expression}" tz="${j.timezone}"`);
    return;
  }

  if (taskUpdates.length) {
    const res = await fetch(`${apiBaseUrl.replace(/\/$/, "")}/api/myoclaw/tasks/update`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cfg.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ updates: taskUpdates }),
    });
    const json: any = await res.json().catch(() => ({}));
    if (!res.ok || json?.success === false) {
      const msg = json?.error?.message || `HTTP ${res.status}`;
      throw new Error(msg);
    }
  }

  if (jobUpdates.length) {
    await updateMyoclawJobs({ apiBaseUrl, apiKey: cfg.apiKey, updates: jobUpdates });
  }

  api.logger.info(`[myo] push: updated ${taskUpdates.length} tasks, ${jobUpdates.length} jobs`);
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
                  apiBaseUrl: String(opts.apiBaseUrl || "https://myo.ai"),
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
    .description("Sync projects/tasks/memory/jobs (DB → files)")
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
    .command("jobs:import")
    .description("Import local OpenClaw cron jobs into Myo cloud (gateway → DB)")
    .action(async () => {
      const cfg = (api.pluginConfig || {}) as MyoPluginConfig;
      if (!cfg.apiKey) throw new Error("Missing apiKey. Run: openclaw myo connect --api-key ...");
      const apiBaseUrl = cfg.apiBaseUrl || "https://myo.ai";

      const { stdout } = await execFileAsync("openclaw", ["cron", "list", "--json"], {
        maxBuffer: 10 * 1024 * 1024,
      });

      const parsed = JSON.parse(String(stdout || "{}")) as any;
      const jobs = Array.isArray(parsed?.jobs) ? parsed.jobs : [];
      if (!jobs.length) {
        api.logger.info("[myo] jobs:import: no local cron jobs found");
        return;
      }

      const res = await importGatewayCronJobs({ apiBaseUrl, apiKey: cfg.apiKey, jobs });
      api.logger.info(`[myo] jobs:import: upserted ${res.upserted} job(s) to cloud`);

      await runSeedSync(api);
      api.logger.info("[myo] jobs:import: sync complete");
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
}

export default function register(api: OpenClawPluginApi) {
  api.registerCli(({ program }) => registerMyoCli(api, program), { commands: ["myo"] });
}
