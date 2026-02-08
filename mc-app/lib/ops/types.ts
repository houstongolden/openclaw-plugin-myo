export type OpsStatus = "pending" | "approved" | "rejected" | "running" | "succeeded" | "failed";

export type OpsProposal = {
  id: string;
  ts: number;
  source: "manual" | "trigger" | "reaction" | "api";
  title: string;
  description?: string;
  project?: string;
  taskKey?: string;
  status: "pending" | "approved" | "rejected";
  approvedAt?: number;
  rejectedAt?: number;
  rejectReason?: string;
  gate?: { ok: boolean; reason?: string };
};

export type OpsMission = {
  id: string;
  ts: number;
  proposalId: string;
  title: string;
  project?: string;
  taskKey?: string;
  status: "running" | "succeeded" | "failed";
  finalizedAt?: number;
};

export type OpsStep = {
  id: string;
  ts: number;
  missionId: string;
  kind: string; // e.g. write_content, post_tweet
  title: string;
  status: "queued" | "running" | "succeeded" | "failed";
  claimedBy?: string; // agent/session key
  reservedAt?: number;
  completedAt?: number;
  lastError?: string;
};

export type OpsEvent = {
  id: string;
  ts: number;
  kind:
    | "proposal.created"
    | "proposal.approved"
    | "proposal.rejected"
    | "mission.created"
    | "step.queued"
    | "step.claimed"
    | "step.succeeded"
    | "step.failed"
    | "note";
  title: string;
  details?: string;
  proposalId?: string;
  missionId?: string;
  stepId?: string;
  project?: string;
  taskKey?: string;
  actor?: string;
};

export type OpsPolicies = {
  x_autopost?: { enabled?: boolean };
  x_daily_quota?: { limit?: number };
  reaction_matrix?: {
    patterns: Array<{
      source: string;
      tags: string[];
      target: string;
      type: string;
      probability: number;
      cooldownSeconds: number;
    }>;
  };
};
