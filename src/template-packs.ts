export type TemplateJob = {
  name: string;
  cron: string;
  tz?: string;
  enabledByDefault?: boolean;
  // For local-first templates we use main-session system events.
  systemEvent: string;
};

export type TemplatePack = {
  id: string;
  title: string;
  description: string;
  jobs: TemplateJob[];
};

export function getTemplatePacks(params?: { tz?: string }) {
  const tz = params?.tz || "America/Los_Angeles";

  const packs: TemplatePack[] = [
    {
      id: "daily-ops",
      title: "Daily Ops (morning / afternoon / evening)",
      description: "A simple, high-signal daily rhythm: priorities, intel, fitness.",
      jobs: [
        {
          name: "myo-template-morning-brief",
          cron: "0 8 * * *",
          tz,
          enabledByDefault: false,
          systemEvent:
            "Reminder (daily): Morning brief — review calendar + inbox, pick your top 3 outcomes, and choose the next action.",
        },
        {
          name: "myo-template-afternoon-intel",
          cron: "0 14 * * *",
          tz,
          enabledByDefault: false,
          systemEvent:
            "Reminder (daily): Afternoon intel — check new signals, drafts queue, and decide one decisive next action.",
        },
        {
          name: "myo-template-fitness-check",
          cron: "0 19 * * *",
          tz,
          enabledByDefault: false,
          systemEvent:
            "Reminder (daily): Fitness check — did you train today? If not, pick a 30–45 min session and put it on the calendar.",
        },
      ],
    },
    {
      id: "weekly-review",
      title: "Weekly Review (Sunday)",
      description: "A lightweight weekly reflection and planning ritual.",
      jobs: [
        {
          name: "myo-template-weekly-review",
          cron: "0 10 * * 0",
          tz,
          enabledByDefault: false,
          systemEvent:
            "Reminder (weekly): Weekly review — what shipped, what moved, what didn't. Pick 1–3 priorities for next week.",
        },
      ],
    },
    {
      id: "inbox-triage",
      title: "Inbox Triage (weekday mornings)",
      description: "Keep your input stream from becoming a guilt pile.",
      jobs: [
        {
          name: "myo-template-inbox-triage",
          cron: "30 8 * * 1-5",
          tz,
          enabledByDefault: false,
          systemEvent:
            "Reminder (weekdays): Inbox triage — pick top 5, convert 2 into tasks, archive/snooze the rest.",
        },
      ],
    },
  ];

  return packs;
}
