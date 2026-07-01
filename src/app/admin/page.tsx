"use client";

/* eslint-disable react-hooks/exhaustive-deps, react-hooks/set-state-in-effect */

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CalendarClock,
  Download,
  FileArchive,
  LogOut,
  Plus,
  RefreshCw,
  ShieldCheck,
  Square,
  Trophy,
  Upload,
  Users,
  Zap,
} from "lucide-react";

import { getContestPhase, type ContestPhase } from "@/lib/contest";

type Admin = {
  id: string;
  name: string;
  email: string;
};

type ContestRow = {
  id: string;
  title: string;
  start_at: string;
  end_at: string;
  status: "draft" | "scheduled" | "running" | "ended";
  created_at: string;
  counts: {
    questions: number;
    teams: number;
  };
};

type Credential = {
  team_code: string;
  display_name: string;
  password: string;
};

type ScoreRow = {
  team_id: string;
  team_code: string;
  display_name: string;
  score: number;
  correct_count: number;
  submitted_count: number;
  total_questions: number;
  updated_at: string | null;
};

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error ?? "Request failed");
  }

  return payload;
}

function toLocalInput(date: Date) {
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60_000);

  return local.toISOString().slice(0, 16);
}

function csvEscape(value: string) {
  return /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

function downloadCredentials(credentials: Credential[]) {
  const lines = [
    "team_code,display_name,password",
    ...credentials.map((item) => [item.team_code, item.display_name, item.password].map(csvEscape).join(",")),
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "team-credentials.csv";
  link.click();
  URL.revokeObjectURL(url);
}

function PhaseBadge({ phase }: { phase: ContestPhase }) {
  const label = phase === "before" ? "scheduled" : phase;
  const color =
    phase === "running"
      ? "bg-[#e8fff4] text-[#086449]"
      : phase === "ended"
        ? "bg-[#fff1f0] text-[#b42318]"
        : phase === "before"
          ? "bg-[#fff7e6] text-[#8a5a00]"
          : "bg-[#efede7] text-[#595348]";

  return <span className={`rounded-md px-2.5 py-1 text-xs font-semibold ${color}`}>{label}</span>;
}

function LoginPanel({ onLogin }: { onLogin: (admin: Admin) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");

    try {
      const data = await requestJson<{ admin: Admin }>("/api/admin/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      onLogin(data.admin);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--background)] px-4 py-10">
      <section className="w-full max-w-md rounded-lg border border-[var(--line)] bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[#181713] text-white">
            <ShieldCheck size={20} aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[var(--muted)]">Admin access</p>
            <h1 className="text-2xl font-semibold">Sign in</h1>
          </div>
        </div>

        <form className="space-y-4" onSubmit={submit}>
          <label className="block text-sm font-semibold">
            Email
            <input
              className="mt-2 w-full rounded-md border border-[var(--line)] px-3 py-2 outline-none focus:border-[var(--accent)]"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>
          <label className="block text-sm font-semibold">
            Password
            <input
              className="mt-2 w-full rounded-md border border-[var(--line)] px-3 py-2 outline-none focus:border-[var(--accent)]"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>
          <button
            className="w-full rounded-md bg-[var(--accent)] px-4 py-3 font-semibold text-white hover:bg-[var(--accent-strong)] disabled:opacity-60"
            disabled={busy}
          >
            {busy ? "Signing in..." : "Sign in"}
          </button>
        </form>

        {message ? <p className="mt-4 rounded-md bg-[#fff1f0] p-3 text-sm text-[#b42318]">{message}</p> : null}

        <Link className="mt-5 inline-flex text-sm font-semibold text-[var(--accent-strong)]" href="/admin/setup">
          Create first admin
        </Link>
      </section>
    </main>
  );
}

export default function AdminPage() {
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [loading, setLoading] = useState(true);
  const [contests, setContests] = useState<ContestRow[]>([]);
  const [selectedContestId, setSelectedContestId] = useState("");
  const [scoreboard, setScoreboard] = useState<ScoreRow[]>([]);
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState("");

  const [title, setTitle] = useState("STEM Bee Championship");
  const [startAt, setStartAt] = useState(() => toLocalInput(new Date(Date.now() + 10 * 60_000)));
  const [endAt, setEndAt] = useState(() => toLocalInput(new Date(Date.now() + 40 * 60_000)));
  const [teamCount, setTeamCount] = useState(20);
  const [teamPrefix, setTeamPrefix] = useState("TEAM");
  const [zipFile, setZipFile] = useState<File | null>(null);

  const selectedContest = useMemo(
    () => contests.find((contest) => contest.id === selectedContestId) ?? contests[0],
    [contests, selectedContestId],
  );

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const selectedPhase: ContestPhase | null = useMemo(
    () => (selectedContest ? getContestPhase(selectedContest) : null),
    [selectedContest, now],
  );

  const hasActiveContest = useMemo(
    () => contests.some((contest) => getContestPhase(contest) !== "ended"),
    [contests, now],
  );

  async function loadMe() {
    const data = await requestJson<{ admin: Admin | null }>("/api/admin/me");
    setAdmin(data.admin);
  }

  async function loadContests() {
    const data = await requestJson<{ contests: ContestRow[] }>("/api/admin/contests");
    setContests(data.contests);
    setSelectedContestId((current) => current || data.contests[0]?.id || "");
  }

  async function loadScoreboard(contestId = selectedContest?.id) {
    if (!contestId) {
      return;
    }

    const data = await requestJson<{ rows: ScoreRow[] }>(`/api/admin/scoreboard?contestId=${contestId}`);
    setScoreboard(data.rows);
  }

  useEffect(() => {
    loadMe()
      .catch(() => setAdmin(null))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!admin) {
      return;
    }

    loadContests().catch((error) => setMessage(error instanceof Error ? error.message : "Could not load contests"));
  }, [admin]);

  useEffect(() => {
    if (!selectedContest?.id) {
      return;
    }

    loadScoreboard(selectedContest.id).catch(() => undefined);
    const interval = window.setInterval(() => {
      loadScoreboard(selectedContest.id).catch(() => undefined);
    }, 2500);

    return () => window.clearInterval(interval);
  }, [selectedContest?.id]);

  async function createContest(event: FormEvent) {
    event.preventDefault();
    setBusy("contest");
    setMessage("");

    try {
      const data = await requestJson<{ contest: ContestRow }>("/api/admin/contests", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title,
          startAt: new Date(startAt).toISOString(),
          endAt: new Date(endAt).toISOString(),
        }),
      });
      setMessage("Contest created.");
      setSelectedContestId(data.contest.id);
      await loadContests();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not create contest");
    } finally {
      setBusy("");
    }
  }

  async function uploadZip(event: FormEvent) {
    event.preventDefault();

    if (!selectedContest || !zipFile) {
      setMessage("Choose a contest and ZIP file first.");
      return;
    }

    const formData = new FormData();
    formData.append("zip", zipFile);
    setBusy("zip");
    setMessage("");

    try {
      const response = await fetch(`/api/admin/contests/${selectedContest.id}/upload`, {
        method: "POST",
        body: formData,
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload.error ?? "Upload failed");
      }

      setMessage(`Imported ${payload.imported} questions and ${payload.audioFiles?.length ?? 0} audio files.`);
      await loadContests();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setBusy("");
    }
  }

  async function generateTeams(event: FormEvent) {
    event.preventDefault();

    if (!selectedContest) {
      return;
    }

    setBusy("teams");
    setMessage("");

    try {
      const data = await requestJson<{ credentials: Credential[] }>("/api/admin/teams", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          contestId: selectedContest.id,
          count: teamCount,
          prefix: teamPrefix,
        }),
      });
      setCredentials(data.credentials);
      setMessage(`Generated ${data.credentials.length} team credentials.`);
      await loadContests();
      await loadScoreboard(selectedContest.id);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not generate teams");
    } finally {
      setBusy("");
    }
  }

  async function setStatus(action: "start" | "end") {
    if (!selectedContest) {
      return;
    }

    setBusy(action);
    setMessage("");

    try {
      await requestJson(`/api/admin/contests/${selectedContest.id}/status`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action }),
      });
      setMessage("Contest status updated.");
      await loadContests();
      await loadScoreboard(selectedContest.id);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not update status");
    } finally {
      setBusy("");
    }
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    setAdmin(null);
  }

  if (loading) {
    return <main className="grid min-h-screen place-items-center bg-[var(--background)]">Loading admin console...</main>;
  }

  if (!admin) {
    return <LoginPanel onLogin={setAdmin} />;
  }

  return (
    <main className="min-h-screen bg-[var(--background)]">
      <header className="border-b border-[var(--line)] bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[#181713] text-white">
              <Trophy size={20} aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--muted)]">Signed in as {admin.name}</p>
              <h1 className="text-2xl font-semibold">Admin console</h1>
            </div>
          </div>
          <button
            className="inline-flex items-center justify-center gap-2 rounded-md border border-[var(--line)] px-4 py-2 text-sm font-semibold hover:border-[var(--accent)]"
            onClick={logout}
          >
            <LogOut size={16} aria-hidden="true" />
            Sign out
          </button>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-5 px-5 py-6 lg:grid-cols-[330px_1fr]">
        <aside className="space-y-5">
          <section className="rounded-lg border border-[var(--line)] bg-white p-5 shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
              <Plus size={18} aria-hidden="true" />
              New contest
            </h2>
            {hasActiveContest ? (
              <p className="rounded-md border border-[#f3d8a8] bg-[#fff7e6] p-3 text-sm text-[#8a5a00]">
                A contest is still active. Wait for it to end (or press End on it) before creating a new one.
              </p>
            ) : (
              <form className="space-y-4" onSubmit={createContest}>
                <label className="block text-sm font-semibold">
                  Title
                  <input
                    className="mt-2 w-full rounded-md border border-[var(--line)] px-3 py-2 outline-none focus:border-[var(--accent)]"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    required
                  />
                </label>
                <label className="block text-sm font-semibold">
                  Start time
                  <input
                    className="mt-2 w-full rounded-md border border-[var(--line)] px-3 py-2 outline-none focus:border-[var(--accent)]"
                    type="datetime-local"
                    value={startAt}
                    onChange={(event) => setStartAt(event.target.value)}
                    required
                  />
                </label>
                <label className="block text-sm font-semibold">
                  End time
                  <input
                    className="mt-2 w-full rounded-md border border-[var(--line)] px-3 py-2 outline-none focus:border-[var(--accent)]"
                    type="datetime-local"
                    value={endAt}
                    onChange={(event) => setEndAt(event.target.value)}
                    required
                  />
                </label>
                <button
                  className="w-full rounded-md bg-[var(--accent)] px-4 py-2.5 font-semibold text-white hover:bg-[var(--accent-strong)] disabled:opacity-60"
                  disabled={busy === "contest"}
                >
                  {busy === "contest" ? "Creating..." : "Create contest"}
                </button>
              </form>
            )}
          </section>

          <section className="rounded-lg border border-[var(--line)] bg-white p-5 shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
              <CalendarClock size={18} aria-hidden="true" />
              Contests
            </h2>
            <div className="space-y-2">
              {contests.length === 0 ? (
                <p className="text-sm text-[var(--muted)]">No contests yet.</p>
              ) : (
                contests.map((contest) => (
                  <button
                    key={contest.id}
                    className={`w-full rounded-md border p-3 text-left ${
                      selectedContest?.id === contest.id
                        ? "border-[var(--accent)] bg-[#f0fff8]"
                        : "border-[var(--line)] hover:border-[var(--accent)]"
                    }`}
                    onClick={() => setSelectedContestId(contest.id)}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="font-semibold">{contest.title}</span>
                      <PhaseBadge phase={getContestPhase(contest)} />
                    </span>
                    <span className="mt-2 block text-xs text-[var(--muted)]">
                      {contest.counts.questions} questions · {contest.counts.teams} teams
                    </span>
                  </button>
                ))
              )}
            </div>
          </section>
        </aside>

        <section className="space-y-5">
          {message ? <div className="rounded-lg border border-[var(--line)] bg-white p-4 text-sm">{message}</div> : null}

          {selectedContest ? (
            <>
              <div className="rounded-lg border border-[var(--line)] bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="mb-2 flex items-center gap-2">
                      <h2 className="text-2xl font-semibold">{selectedContest.title}</h2>
                      {selectedPhase ? <PhaseBadge phase={selectedPhase} /> : null}
                    </div>
                    <p className="text-sm text-[var(--muted)]">
                      {new Date(selectedContest.start_at).toLocaleString()} to{" "}
                      {new Date(selectedContest.end_at).toLocaleString()}
                    </p>
                    <p className="mt-1 text-xs text-[var(--muted)]">
                      Auto-starts at start time. Auto-ends at end time. Use the buttons only for emergencies.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      className="inline-flex items-center gap-2 rounded-md bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-white hover:bg-[var(--accent-strong)] disabled:opacity-60 disabled:cursor-not-allowed"
                      onClick={() => setStatus("start")}
                      disabled={busy === "start" || selectedPhase !== "before"}
                      title={selectedPhase !== "before" ? "Contest has already started or ended" : "Emergency: start the contest now"}
                    >
                      <Zap size={16} aria-hidden="true" />
                      Start now
                    </button>
                    <button
                      className="inline-flex items-center gap-2 rounded-md bg-[#b42318] px-3 py-2 text-sm font-semibold text-white hover:bg-[#8d1c13] disabled:opacity-60 disabled:cursor-not-allowed"
                      onClick={() => setStatus("end")}
                      disabled={busy === "end" || selectedPhase === "ended"}
                      title={selectedPhase === "ended" ? "Contest is already ended" : "Emergency: end the contest now"}
                    >
                      <Square size={16} aria-hidden="true" />
                      End
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid gap-5 xl:grid-cols-2">
                <section className="rounded-lg border border-[var(--line)] bg-white p-5 shadow-sm">
                  <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
                    <FileArchive size={18} aria-hidden="true" />
                    Upload question ZIP
                  </h3>
                  <form className="space-y-4" onSubmit={uploadZip}>
                    <input
                      className="w-full rounded-md border border-[var(--line)] px-3 py-2 text-sm"
                      type="file"
                      accept=".zip"
                      onChange={(event) => setZipFile(event.target.files?.[0] ?? null)}
                    />
                    <button
                      className="inline-flex items-center gap-2 rounded-md bg-[var(--accent)] px-4 py-2.5 font-semibold text-white hover:bg-[var(--accent-strong)] disabled:opacity-60"
                      disabled={busy === "zip" || !zipFile}
                    >
                      <Upload size={17} aria-hidden="true" />
                      {busy === "zip" ? "Importing..." : "Import ZIP"}
                    </button>
                    <p className="text-sm leading-6 text-[var(--muted)]">
                      CSV source is imported; answer columns and hints stay server-side.
                    </p>
                  </form>
                </section>

                <section className="rounded-lg border border-[var(--line)] bg-white p-5 shadow-sm">
                  <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
                    <Users size={18} aria-hidden="true" />
                    Generate teams
                  </h3>
                  <form className="grid gap-4 sm:grid-cols-[1fr_1fr_auto]" onSubmit={generateTeams}>
                    <label className="block text-sm font-semibold">
                      Count
                      <input
                        className="mt-2 w-full rounded-md border border-[var(--line)] px-3 py-2 outline-none focus:border-[var(--accent)]"
                        type="number"
                        min={1}
                        max={20}
                        value={teamCount}
                        onChange={(event) => setTeamCount(Number(event.target.value))}
                      />
                    </label>
                    <label className="block text-sm font-semibold">
                      Prefix
                      <input
                        className="mt-2 w-full rounded-md border border-[var(--line)] px-3 py-2 uppercase outline-none focus:border-[var(--accent)]"
                        value={teamPrefix}
                        onChange={(event) => setTeamPrefix(event.target.value)}
                      />
                    </label>
                    <button
                      className="self-end rounded-md bg-[var(--accent)] px-4 py-2.5 font-semibold text-white hover:bg-[var(--accent-strong)] disabled:opacity-60"
                      disabled={busy === "teams"}
                    >
                      {busy === "teams" ? "Generating..." : "Generate"}
                    </button>
                  </form>

                  {credentials.length > 0 ? (
                    <button
                      className="mt-4 inline-flex items-center gap-2 rounded-md border border-[var(--line)] px-4 py-2.5 text-sm font-semibold hover:border-[var(--accent)]"
                      onClick={() => downloadCredentials(credentials)}
                    >
                      <Download size={17} aria-hidden="true" />
                      Download credentials CSV
                    </button>
                  ) : null}
                </section>
              </div>

              <section className="rounded-lg border border-[var(--line)] bg-white p-5 shadow-sm">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <h3 className="flex items-center gap-2 text-lg font-semibold">
                    <Trophy size={18} aria-hidden="true" />
                    Scoreboard
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    <button
                      className="inline-flex items-center gap-2 rounded-md border border-[var(--line)] px-3 py-2 text-sm font-semibold hover:border-[var(--accent)]"
                      onClick={() => loadScoreboard()}
                    >
                      <RefreshCw size={16} aria-hidden="true" />
                      Refresh
                    </button>
                    <a
                      className="inline-flex items-center gap-2 rounded-md border border-[var(--line)] px-3 py-2 text-sm font-semibold hover:border-[var(--accent)]"
                      href={`/api/admin/export?contestId=${selectedContest.id}`}
                    >
                      <Download size={16} aria-hidden="true" />
                      Export
                    </a>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px] border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-[var(--line)] text-left text-[var(--muted)]">
                        <th className="py-3 pr-3">Rank</th>
                        <th className="py-3 pr-3">Team</th>
                        <th className="py-3 pr-3">Score</th>
                        <th className="py-3 pr-3">Correct</th>
                        <th className="py-3 pr-3">Submitted</th>
                        <th className="py-3 pr-3">Updated</th>
                      </tr>
                    </thead>
                    <tbody>
                      {scoreboard.length === 0 ? (
                        <tr>
                          <td className="py-5 text-[var(--muted)]" colSpan={6}>
                            No teams or submissions yet.
                          </td>
                        </tr>
                      ) : (
                        scoreboard.map((row, index) => (
                          <tr key={row.team_id} className="border-b border-[#efede7]">
                            <td className="py-3 pr-3 font-mono">{index + 1}</td>
                            <td className="py-3 pr-3">
                              <span className="font-semibold">{row.team_code}</span>
                              <span className="block text-xs text-[var(--muted)]">{row.display_name}</span>
                            </td>
                            <td className="py-3 pr-3 text-lg font-semibold">{row.score}</td>
                            <td className="py-3 pr-3">{row.correct_count}</td>
                            <td className="py-3 pr-3">
                              {row.submitted_count}/{row.total_questions}
                            </td>
                            <td className="py-3 pr-3 text-xs text-[var(--muted)]">
                              {row.updated_at ? new Date(row.updated_at).toLocaleTimeString() : "-"}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          ) : (
            <div className="rounded-lg border border-[var(--line)] bg-white p-8 text-center shadow-sm">
              <p className="text-[var(--muted)]">Create a contest to begin.</p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
