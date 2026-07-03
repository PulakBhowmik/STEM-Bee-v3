"use client";

/* eslint-disable react-hooks/exhaustive-deps, react-hooks/set-state-in-effect */

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Clock, Eye, EyeOff, Headphones, LogOut, Play, ShieldCheck, Trophy, XCircle } from "lucide-react";

type Phase = "draft" | "before" | "running" | "ended";

type ContestState = {
  phase: Phase;
  team: {
    id: string;
    team_code: string;
    display_name: string;
  };
  contest: {
    id: string;
    title: string;
    start_at: string;
    end_at: string;
    status: string;
  };
  score: {
    score: number;
    correct_count: number;
    submitted_count: number;
    updated_at: string | null;
  };
  questions: QuestionState[];
  serverTime: string;
};

type QuestionState = {
  id: string;
  serial: number;
  points: number;
  audioUrl: string | null;
  hint: string | null;
  submitted: boolean;
  submittedAnswer: string | null;
  result: "correct" | "incorrect" | null;
  pointsAwarded: number;
};

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error ?? "Request failed");
  }

  return payload;
}

function formatClock(totalSeconds: number) {
  const seconds = Math.max(0, totalSeconds);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = seconds % 60;

  return [hours, minutes, rest].map((part) => String(part).padStart(2, "0")).join(":");
}

function secondsUntil(iso: string) {
  return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 1000));
}

// Only one question's audio should be audible at a time. Tracking the
// currently playing element at module scope (rather than lifting state up
// through the question list) keeps the fix contained to this component.
let currentlyPlayingAudio: HTMLAudioElement | null = null;

function AudioButton({ url, disabled }: { url: string | null; disabled: boolean }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);

  // Warm up the connection (and let the browser buffer what it judges
  // worthwhile) as soon as the question is visible, instead of waiting for
  // the click. "metadata" avoids fully downloading every question's audio
  // up front, which matters with many teams loading the arena at once.
  //
  // The arena polls /api/team/state every few seconds, and each poll returns
  // a newly signed audio URL for the same file. Set up the audio element the
  // first time a URL arrives and then leave it alone — resetting `src` on
  // every later poll would abort and restart the fetch before it ever
  // finishes, since the signed token is guaranteed to expire well after any
  // realistic contest length.
  useEffect(() => {
    if (!url || audioRef.current) {
      return;
    }

    const audio = new Audio(url);
    audio.preload = "metadata";
    // Driving `playing` off the element's own play/pause events (rather than
    // setting it directly in the click handler) keeps every button's icon
    // correct even when a *different* button's click is what paused this one.
    audio.addEventListener("play", () => setPlaying(true));
    audio.addEventListener("pause", () => setPlaying(false));
    audioRef.current = audio;
  }, [url]);

  async function playAudio() {
    if (!url || disabled || !audioRef.current) {
      return;
    }

    if (currentlyPlayingAudio && currentlyPlayingAudio !== audioRef.current) {
      currentlyPlayingAudio.pause();
    }
    currentlyPlayingAudio = audioRef.current;

    await audioRef.current.play().catch(() => {});
  }

  return (
    <button
      className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-[var(--line)] bg-white text-[var(--accent-strong)] hover:border-[var(--accent)] disabled:bg-[#efede7] disabled:text-[var(--muted)]"
      onClick={playAudio}
      disabled={disabled || !url}
      title="Play audio"
      type="button"
    >
      {playing ? <Headphones size={20} aria-hidden="true" /> : <Play size={20} aria-hidden="true" />}
      <span className="sr-only">Play audio</span>
    </button>
  );
}

function HintButton({
  hint,
  disabled,
  revealed,
  onToggle,
}: {
  hint: string | null;
  disabled: boolean;
  revealed: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-[var(--line)] bg-white text-[var(--accent-strong)] hover:border-[var(--accent)] disabled:bg-[#efede7] disabled:text-[var(--muted)]"
      onClick={onToggle}
      disabled={disabled || !hint}
      title={hint ? (revealed ? "Hide hint" : "Show hint") : "No hint available"}
      type="button"
    >
      {revealed ? <EyeOff size={20} aria-hidden="true" /> : <Eye size={20} aria-hidden="true" />}
      <span className="sr-only">Show hint</span>
    </button>
  );
}

function LoginPanel({ onLoggedIn }: { onLoggedIn: () => void }) {
  const [teamCode, setTeamCode] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");

    try {
      await requestJson("/api/team/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ teamCode, password }),
      });
      onLoggedIn();
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
            <Headphones size={20} aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[var(--muted)]">Contest arena</p>
            <h1 className="text-2xl font-semibold">Team login</h1>
          </div>
        </div>

        <form className="space-y-4" onSubmit={submit}>
          <label className="block text-sm font-semibold">
            Team code
            <input
              className="mt-2 w-full rounded-md border border-[var(--line)] px-3 py-2 uppercase outline-none focus:border-[var(--accent)]"
              value={teamCode}
              onChange={(event) => setTeamCode(event.target.value)}
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
            {busy ? "Entering..." : "Enter arena"}
          </button>
        </form>

        {message ? <p className="mt-4 rounded-md bg-[#fff1f0] p-3 text-sm text-[#b42318]">{message}</p> : null}

        <Link className="mt-5 inline-flex text-sm font-semibold text-[var(--accent-strong)]" href="/">
          Back to home
        </Link>
      </section>
    </main>
  );
}

function SupersededPanel() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--background)] px-4 py-10">
      <section className="w-full max-w-md rounded-lg border border-[var(--line)] bg-white p-6 text-center shadow-sm">
        <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-md bg-[#181713] text-white">
          <LogOut size={22} aria-hidden="true" />
        </div>
        <h1 className="text-xl font-semibold">Opened in another tab</h1>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-[var(--muted)]">
          Your team is now active in another tab or window. Only one can be used at a time, so this tab has been paused.
        </p>
        <button
          className="mt-6 inline-flex items-center justify-center gap-2 rounded-md bg-[var(--accent)] px-5 py-3 font-semibold text-white hover:bg-[var(--accent-strong)]"
          onClick={() => window.location.reload()}
          type="button"
        >
          Use this tab instead
        </button>
      </section>
    </main>
  );
}

export default function ArenaPage() {
  const [state, setState] = useState<ContestState | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState("");
  const [clockSeconds, setClockSeconds] = useState(0);
  const [revealedHints, setRevealedHints] = useState<Record<string, boolean>>({});
  const [supersededByOtherTab, setSupersededByOtherTab] = useState(false);
  const tabIdRef = useRef<string>("");
  const channelRef = useRef<BroadcastChannel | null>(null);
  const hasClaimedRef = useRef(false);

  function toggleHint(questionId: string) {
    setRevealedHints((current) => ({ ...current, [questionId]: !current[questionId] }));
  }

  const targetTime = useMemo(() => {
    if (!state) {
      return null;
    }

    return state.phase === "before" || state.phase === "draft" ? state.contest.start_at : state.contest.end_at;
  }, [state]);
  async function loadState() {
    const data = await requestJson<ContestState | { authenticated: false }>("/api/team/state");
    if ((data as { authenticated?: boolean }).authenticated === false) {
      setState(null);
      return;
    }

    setState(data as ContestState);
    setMessage("");
  }

  useEffect(() => {
    loadState()
      .catch(() => setState(null))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const updateClock = () => setClockSeconds(targetTime ? secondsUntil(targetTime) : 0);
    updateClock();
    const interval = window.setInterval(updateClock, 1000);

    return () => window.clearInterval(interval);
  }, [targetTime]);

  useEffect(() => {
    if (!state || supersededByOtherTab) {
      return;
    }

    const interval = window.setInterval(() => {
      loadState().catch(() => undefined);
    }, state.phase === "running" ? 3000 : 8000);

    return () => window.clearInterval(interval);
  }, [state?.phase, supersededByOtherTab]);

  // Same-browser single-tab enforcement. Tabs of one browser share a login
  // cookie, so the server cannot tell them apart. Instead they coordinate over
  // a BroadcastChannel: whenever a tab starts showing the arena it announces
  // itself, and any older tab that hears a different tab's announcement steps
  // aside. The newest tab (including a duplicated one) always wins. This is
  // cosmetic isolation only — it never touches the shared server session, so it
  // cannot log the active tab out or affect the score.
  useEffect(() => {
    tabIdRef.current = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

    if (typeof BroadcastChannel === "undefined") {
      return;
    }

    const channel = new BroadcastChannel("sciblitz-arena-session");
    channelRef.current = channel;
    channel.onmessage = (event) => {
      if (event.data?.type === "claim" && event.data.tabId !== tabIdRef.current) {
        currentlyPlayingAudio?.pause();
        setSupersededByOtherTab(true);
      }
    };

    return () => {
      channel.close();
      channelRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (state && !supersededByOtherTab && !hasClaimedRef.current) {
      hasClaimedRef.current = true;
      channelRef.current?.postMessage({ type: "claim", tabId: tabIdRef.current });
    }
  }, [state, supersededByOtherTab]);

  async function submitAnswer(questionId: string) {
    const answer = answers[questionId]?.trim();

    if (!answer) {
      setMessage("Type an answer before confirming.");
      return;
    }

    setSubmitting(questionId);
    setMessage("");

    try {
      await requestJson("/api/team/submit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ questionId, answer }),
      });
      await loadState();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Submit failed");
    } finally {
      setSubmitting("");
    }
  }

  async function logout() {
    await fetch("/api/team/logout", { method: "POST" });
    setState(null);
  }

  if (loading) {
    return <main className="grid min-h-screen place-items-center bg-[var(--background)]">Loading arena...</main>;
  }

  if (supersededByOtherTab) {
    return <SupersededPanel />;
  }

  if (!state) {
    return <LoginPanel onLoggedIn={loadState} />;
  }

  const totalQuestions = state.questions.length;
  const completed = state.score.submitted_count;
  const isOpen = state.phase === "running";

  return (
    <main className="min-h-screen bg-[var(--background)]">
      <header className="sticky top-0 z-20 border-b border-[var(--line)] bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[#181713] text-white">
              <Trophy size={20} aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--muted)]">
                {state.team.team_code} · {state.team.display_name}
              </p>
              <h1 className="text-xl font-semibold">{state.contest.title}</h1>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:flex sm:items-center">
            <div className="rounded-md border border-[var(--line)] px-3 py-2 text-center">
              <span className="block text-xs font-semibold text-[var(--muted)]">Score</span>
              <span className="text-xl font-semibold">{state.score.score}</span>
            </div>
            <div className="rounded-md border border-[var(--line)] px-3 py-2 text-center">
              <span className="block text-xs font-semibold text-[var(--muted)]">Done</span>
              <span className="text-xl font-semibold">
                {completed}/{totalQuestions}
              </span>
            </div>
            <div className="rounded-md border border-[var(--line)] px-3 py-2 text-center">
              <span className="block text-xs font-semibold text-[var(--muted)]">
                {isOpen ? "Time left" : state.phase === "ended" ? "Closed" : "Starts in"}
              </span>
              <span className="font-mono text-xl font-semibold" suppressHydrationWarning>
                {state.phase === "ended" ? "00:00:00" : formatClock(clockSeconds)}
              </span>
            </div>
          </div>
          <button
            className="inline-flex items-center justify-center gap-2 rounded-md border border-[var(--line)] px-4 py-2 text-sm font-semibold hover:border-[var(--accent)]"
            onClick={logout}
          >
            <LogOut size={16} aria-hidden="true" />
            Exit
          </button>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-5 py-6">
        {message ? <div className="mb-5 rounded-lg border border-[var(--line)] bg-white p-4 text-sm">{message}</div> : null}

        {state.phase !== "running" ? (
          <div className="rounded-lg border border-[var(--line)] bg-white p-8 text-center shadow-sm">
            <Clock className="mx-auto mb-4 text-[var(--accent)]" size={34} aria-hidden="true" />
            <h2 className="text-2xl font-semibold">
              {state.phase === "ended" ? "Contest ended" : "Contest will open soon"}
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-[var(--muted)]">
              {state.phase === "ended"
                ? "Your final score is saved. The admin can export the full results."
                : "Keep this page open. The arena will refresh automatically when the contest starts."}
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {state.questions.map((question) => (
              <section key={question.id} className="rounded-lg border border-[var(--line)] bg-white p-4 shadow-sm">
                <div className="grid gap-4 md:grid-cols-[auto_1fr_auto] md:items-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-md bg-[#f7f5ef] font-mono text-lg font-semibold">
                    {question.serial}
                  </div>
                  <div className="min-w-0">
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <AudioButton url={question.audioUrl} disabled={!isOpen} />
                      <HintButton
                        hint={question.hint}
                        disabled={!isOpen}
                        revealed={Boolean(revealedHints[question.id])}
                        onToggle={() => toggleHint(question.id)}
                      />
                      <span className="rounded-md bg-[#f7f5ef] px-2.5 py-1 text-sm font-semibold text-[var(--muted)]">
                        {question.points} point{question.points === 1 ? "" : "s"}
                      </span>
                      {question.result === "correct" ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-[#e8fff4] px-2.5 py-1 text-sm font-semibold text-[#086449]">
                          <CheckCircle2 size={15} aria-hidden="true" />
                          correct
                        </span>
                      ) : question.result === "incorrect" ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-[#fff1f0] px-2.5 py-1 text-sm font-semibold text-[#b42318]">
                          <XCircle size={15} aria-hidden="true" />
                          incorrect
                        </span>
                      ) : null}
                    </div>
                    {revealedHints[question.id] && question.hint ? (
                      <p className="mb-3 rounded-md bg-[#f7f5ef] px-3 py-2 text-sm text-[var(--muted)]">
                        <span className="font-semibold text-[var(--foreground)]">Hint: </span>
                        {question.hint}
                      </p>
                    ) : null}
                    <input
                      className="w-full rounded-md border border-[var(--line)] px-3 py-3 text-lg outline-none focus:border-[var(--accent)] disabled:bg-[#efede7]"
                      placeholder="Type spelling"
                      value={question.submitted ? question.submittedAnswer ?? "" : answers[question.id] ?? ""}
                      onChange={(event) => setAnswers((current) => ({ ...current, [question.id]: event.target.value }))}
                      disabled={question.submitted || !isOpen || submitting === question.id}
                      autoComplete="off"
                    />
                  </div>
                  <button
                    className="rounded-md bg-[var(--accent)] px-4 py-3 font-semibold text-white hover:bg-[var(--accent-strong)] disabled:bg-[#9ca39c]"
                    onClick={() => submitAnswer(question.id)}
                    disabled={question.submitted || !isOpen || submitting === question.id}
                  >
                    {question.submitted ? "Submitted" : submitting === question.id ? "Saving..." : "Confirm"}
                  </button>
                </div>
              </section>
            ))}
          </div>
        )}

        <div className="mt-6 rounded-lg border border-[var(--line)] bg-white p-4 text-sm text-[var(--muted)]">
          <ShieldCheck className="mr-2 inline text-[var(--accent)]" size={16} aria-hidden="true" />
          Answers and score are saved on every confirmed submission.
        </div>
      </section>
    </main>
  );
}
