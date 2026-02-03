import type { OpenClawPluginApi } from "openclaw/plugin-sdk";
import path from "node:path";
import os from "node:os";
import { writeTextFile } from "./src/fs.js";
import { renderGoalsMd, renderMemoryMd, renderUserMd } from "./src/templates.js";

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

  // v0 sync: seed core files so "fresh install" yields a coherent workspace.
  await writeTextFile(path.join(root, "USER.md"), renderUserMd({ name: "Houston" }));
  await writeTextFile(path.join(root, "GOALS.md"), renderGoalsMd());
  await writeTextFile(path.join(root, "MEMORY.md"), renderMemoryMd());

  api.logger.info(`[myo] seeded files in ${root}`);
}

function registerMyoCli(api: OpenClawPluginApi, program: any) {
  const myo = program.command("myo").description("Connect OpenClaw to Myo (myo.ai)");

  myo
    .command("connect")
    .option("--api-key <key>", "Myo API key (stores in plugin config; WIP)")
    .option("--api-base-url <url>", "Myo API base URL", "https://myo.ai")
    .description("Connect to myo.ai (v0: store api base + optional api key)")
    .action((opts: any) => {
      // NOTE: OpenClaw plugin API doesn't currently allow writing config here.
      // v0: we just verify CLI wiring and show next step.
      api.logger.info(`[myo] connect wired. apiBaseUrl=${opts.apiBaseUrl}`);
      if (opts.apiKey) api.logger.info(`[myo] apiKey provided (not persisted yet).`);
      api.logger.info(`[myo] next: persist token in plugins.entries.myo.config via config API.`);
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
    .description("Sync projects/tasks/memory/jobs (v0: seed local files)")
    .action(async () => {
      await runSeedSync(api);
      api.logger.info(`[myo] sync complete (v0 seed)`);
    });
}

export default function register(api: OpenClawPluginApi) {
  api.registerCli(({ program }) => registerMyoCli(api, program), { commands: ["myo"] });
}
