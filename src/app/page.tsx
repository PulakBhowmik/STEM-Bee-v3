import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BookOpen, CheckCircle2, Clock, Headphones, Users } from "lucide-react";

const RULEBOOK_URL = "https://drive.google.com/file/d/1cxrpBt3_mzxgzDrTv_5IgWjBfxTr1uKE/view?usp=drive_link";

const INSTRUCTION_SECTIONS = [
  {
    group: "Before you begin",
    icon: Users,
    items: [
      "Only the team leader competes on behalf of the team.",
      "Join the Zoom meeting and keep your screen shared throughout the contest.",
      "Disable Grammarly and any other browser extension that checks or corrects spelling.",
    ],
  },
  {
    group: "During the contest",
    icon: Clock,
    items: [
      "Use a single device and a single tab. Signing in anywhere else immediately logs out the earlier session.",
      "Joining late does not grant extra time — the contest closes for everyone at the same moment.",
      "Press the audio button to hear the word, and the eye button to reveal its origin.",
      "Type your spelling and press the Submit button. Pressing Enter on the keyboard will not submit your answer.",
    ],
  },
  {
    group: "Scoring & fair play",
    icon: CheckCircle2,
    items: [
      "Capitalization and spaces before or after the word are ignored — but hyphens (-) and apostrophes (') are part of the spelling, so include them exactly.",
      "If a poor connection logs you out, your score is safe and resumes from your latest total.",
      "Any attempt to abuse or exploit the system will result in disqualification of the team.",
    ],
  },
];

let runningNumber = 0;
const numberedSections = INSTRUCTION_SECTIONS.map((section) => ({
  ...section,
  items: section.items.map((text) => ({ num: (runningNumber += 1), text })),
}));

export default function Home() {
  return (
    <main className="min-h-screen bg-[var(--background)]">
      <section className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-5 py-6 sm:px-8">
        <nav className="flex items-center justify-between border-b border-[var(--line)] pb-4">
          <Image
            src="/brand/sciblitz-logo.png"
            alt="SciBlitz 2.0"
            width={1600}
            height={967}
            className="h-9 w-auto sm:h-10"
            sizes="120px"
            priority
          />
          <Link
            href="/arena"
            className="inline-flex items-center justify-center gap-2 rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--accent-strong)]"
          >
            <Headphones size={16} aria-hidden="true" />
            Team arena
          </Link>
        </nav>

        <div className="flex flex-1 flex-col items-center gap-8 py-12">
          <Image
            src="/brand/sciblitz-logo.png"
            alt="SciBlitz 2.0"
            width={1600}
            height={967}
            className="h-20 w-auto sm:h-28"
            sizes="300px"
            priority
          />

          <div className="space-y-4 text-center">
            <p className="inline-flex rounded-md bg-[#e8fff4] px-3 py-1 text-sm font-semibold text-[#086449]">
              Round 2 · Live today
            </p>
            <h1 className="mx-auto max-w-2xl text-3xl font-semibold leading-[1.15] sm:text-5xl">
              STEM Bee — Round 2
            </h1>
            <p className="mx-auto max-w-xl text-lg leading-8 text-[var(--muted)]">
              Welcome to the second round of STEM Bee. Please read every instruction below carefully before you enter
              the arena.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/arena"
              className="inline-flex items-center justify-center gap-2 rounded-md bg-[var(--accent)] px-5 py-3 font-semibold text-white hover:bg-[var(--accent-strong)]"
            >
              <Headphones size={19} aria-hidden="true" />
              Enter team arena
              <ArrowRight size={18} aria-hidden="true" />
            </Link>
            <a
              href={RULEBOOK_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-md border border-[var(--line)] bg-white px-5 py-3 font-semibold hover:border-[var(--accent)]"
            >
              <BookOpen size={19} aria-hidden="true" />
              Read the rulebook
            </a>
          </div>

          <div className="w-full max-w-3xl rounded-lg border border-[var(--line)] bg-white p-6 shadow-sm sm:p-8">
            <h2 className="mb-6 text-lg font-semibold">Contest instructions</h2>
            <div className="space-y-7">
              {numberedSections.map((section) => (
                <div key={section.group}>
                  <div className="mb-3 flex items-center gap-2">
                    <section.icon size={18} className="text-[var(--accent)]" aria-hidden="true" />
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
                      {section.group}
                    </h3>
                  </div>
                  <ol className="space-y-2.5">
                    {section.items.map((item) => (
                      <li key={item.num} className="flex gap-3">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-xs font-semibold text-white">
                          {item.num}
                        </span>
                        <span className="pt-0.5 text-sm leading-6 text-[var(--foreground)]">{item.text}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              ))}
            </div>
          </div>
        </div>

        <footer className="flex flex-col items-center gap-2 border-t border-[var(--line)] py-5 text-sm text-[var(--muted)] sm:flex-row sm:justify-between">
          <p>SciBlitz 2.0</p>
          <div className="flex gap-4">
            <Link href="/admin" className="hover:text-[var(--accent-strong)]">
              Admin console
            </Link>
          </div>
        </footer>
      </section>
    </main>
  );
}
