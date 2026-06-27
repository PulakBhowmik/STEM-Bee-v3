"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error ?? "Request failed");
  }

  return payload;
}

export default function AdminSetupPage() {
  const [setupToken, setSetupToken] = useState("");
  const [name, setName] = useState("Contest Admin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");

    try {
      await postJson("/api/admin/setup", { setupToken, name, email, password });
      setMessage("Admin created. You are signed in and can open the console.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Setup failed");
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
            <p className="text-sm font-semibold text-[var(--muted)]">One-time setup</p>
            <h1 className="text-2xl font-semibold">Create first admin</h1>
          </div>
        </div>

        <form className="space-y-4" onSubmit={submit}>
          <label className="block text-sm font-semibold">
            Setup token
            <input
              className="mt-2 w-full rounded-md border border-[var(--line)] px-3 py-2 outline-none focus:border-[var(--accent)]"
              value={setupToken}
              onChange={(event) => setSetupToken(event.target.value)}
              required
            />
          </label>
          <label className="block text-sm font-semibold">
            Name
            <input
              className="mt-2 w-full rounded-md border border-[var(--line)] px-3 py-2 outline-none focus:border-[var(--accent)]"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
            />
          </label>
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
              minLength={8}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>
          <button
            className="w-full rounded-md bg-[var(--accent)] px-4 py-3 font-semibold text-white hover:bg-[var(--accent-strong)] disabled:opacity-60"
            disabled={busy}
          >
            {busy ? "Creating..." : "Create admin"}
          </button>
        </form>

        {message ? <p className="mt-4 rounded-md bg-[#f7f5ef] p-3 text-sm">{message}</p> : null}

        <Link className="mt-5 inline-flex text-sm font-semibold text-[var(--accent-strong)]" href="/admin">
          Open admin console
        </Link>
      </section>
    </main>
  );
}
