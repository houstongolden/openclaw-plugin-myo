import type { OpenClawPluginService } from "openclaw/plugin-sdk";

function registerMyoCli(program: any) {
  const myo = program
    .command("myo")
    .description("Connect OpenClaw to Myo (myo.ai)");

  myo
    .command("connect")
    .description("Connect to myo.ai (device-code auth; WIP)")
    .action(() => {
      // TODO: implement device-code OAuth; persist token in OpenClaw config
      // For now, just confirm the command is wired.
      console.log("Myo connect: WIP (auth not implemented yet)");
    });

  myo
    .command("status")
    .description("Show Myo connection + sync status")
    .action(() => {
      console.log("Myo status: WIP");
    });

  myo
    .command("sync")
    .option("--once", "Run a single sync pass", false)
    .description("Sync projects/tasks/memory/jobs (WIP)")
    .action(() => {
      console.log("Myo sync: WIP");
    });
}

export default function register(api: Parameters<OpenClawPluginService["init"]>[0]) {
  api.registerCli(({ program }) => registerMyoCli(program), { commands: ["myo"] });
}
