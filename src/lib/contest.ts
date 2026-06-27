import type { Contest, ContestStatus } from "@/lib/types";

export type ContestPhase = "draft" | "before" | "running" | "ended";

export function getContestPhase(contest: Pick<Contest, "status" | "start_at" | "end_at">) {
  const now = Date.now();
  const start = new Date(contest.start_at).getTime();
  const end = new Date(contest.end_at).getTime();

  if (contest.status === "ended" || now >= end) {
    return "ended";
  }

  if (contest.status === "draft") {
    return "draft";
  }

  if (contest.status === "running" || (contest.status === "scheduled" && now >= start)) {
    return "running";
  }

  return "before";
}

export function statusFromAction(action: string): ContestStatus {
  if (action === "schedule") {
    return "scheduled";
  }

  if (action === "start") {
    return "running";
  }

  if (action === "end") {
    return "ended";
  }

  if (action === "draft") {
    return "draft";
  }

  throw new Error("Unknown contest status action");
}
