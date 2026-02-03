import type { OpenClawPluginApi } from "openclaw/plugin-sdk";
import path from "node:path";
import os from "node:os";
import { ensureDir, writeTextFile } from "./src/fs.js";
import { collectTaskUpdatesFromRoot } from "./src/push.js";
import {
  renderGoalsMd,
  renderJobsMd,
  renderMemoryMd,
  renderProjectMd,
  renderTasksMd,
  renderUserMd,
  slugify,
} from "./src/templates.js";
import { fetchMyoclawSync } from "./src/myo-api.js";

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

async function runSeedSync(api: OpenClawPluginApi) {
  const cfg = (api.pluginConfig || {}) as MyoPluginConfig;
  const root = expandHome(cfg.rootDir || "~/.myo");

  if (!cfg.apiKey) {
    // v0 fallback: seed minimal files even without API key.
    await writeTextFile(path.join(root, "USER.md"), renderUserMd({ name: "Houston" }));
    await writeTextFile(path.join(root, "GOALS.md"), renderGoalsMd());
    await writeTextFile(path.join(root, "MEMORY.md"), renderMemoryMd());
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


function registerMyoCli(api: OpenClawPluginApi, program: any) {
  const myo = program.command("myo").description("Connect OpenClaw to Myo (myo.ai)");

  myo
    .command("connect")
    .requiredOption("--api-key <key>", "Myo API key")
    .option("--api-base-url <url>", "Myo API base URL", "https://myo.ai")
    .option("--root-dir <path>", "Root directory for rendered files", "~/.myo")
    .description("Connect to myo.ai using an API key (persists into OpenClaw config)")
    .action(async (opts: any) => {
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
    .description("Sync projects/tasks/memory/jobs")
    .action(async () => {
      await runSeedSync(api);
      api.logger.info(`[myo] sync complete`);
    });

  myo
    .command("push")
    .description("Push local edits back to Myo (v0: TASKS.md checkboxes -> task.status=done)")
    .action(async () => {
      const cfg = (api.pluginConfig || {}) as MyoPluginConfig;
      if (!cfg.apiKey) throw new Error("Missing apiKey. Run: openclaw myo connect --api-key ...");
      const apiBaseUrl = cfg.apiBaseUrl || "https://myo.ai";
      const root = expandHome(cfg.rootDir || "~/.myo");

      const updates = await collectTaskUpdatesFromRoot(root);
      if (!updates.length) {
        api.logger.info("[myo] push: no checked tasks found");
        return;
      }

      const res = await fetch(`${apiBaseUrl.replace(/\/$/, "")}/api/myoclaw/tasks/update`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${cfg.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ updates }),
      });
      const json: any = await res.json().catch(() => ({}));
      if (!res.ok || json?.success === false) {
        const msg = json?.error?.message || `HTTP ${res.status}`;
        throw new Error(msg);
      }

      api.logger.info(`[myo] push: updated ${updates.length} tasks`);
    });
}

export default function register(api: OpenClawPluginApi) {
  api.registerCli(({ program }) => registerMyoCli(api, program), { commands: ["myo"] });
}
