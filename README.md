# STEM Bee Contest

Fast spelling bee contest platform built with Next.js, React, Tailwind CSS, and Supabase.

## What It Does

- Admin creates contests with start/end times.
- Admin uploads ZIP files shaped like the sample `stem_BEE_TEST.zip`.
- Admin generates up to 20 team credentials and downloads them as CSV.
- Teams log in with one active session per team.
- Contestants can enter only during the contest window.
- Each question shows an audio play button, spelling input, and confirm button.
- Answers are scored exactly against `Answer1`, `Answer2`, or `Answer3` after trimming.
- Correct answers and scores are saved immediately in Supabase.
- Correct spellings, words, and hints are never sent to contestants.

## Supabase Setup

1. Create a Supabase project.
2. Open the Supabase SQL editor.
3. Run `supabase/schema.sql`.
4. Copy `.env.example` to `.env.local`.
5. Fill in:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
SUPABASE_AUDIO_BUCKET=contest-audio
SESSION_SECRET=use-a-long-random-secret
ADMIN_SETUP_TOKEN=choose-a-temporary-setup-token
```

Use the service role key only on the server. Do not expose it publicly.

## Run Locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

Routes:

- `/` public entry screen
- `/admin/setup` one-time first admin setup
- `/admin` admin console
- `/arena` team contest arena

## Upload ZIP Format

The ZIP importer supports your sample structure:

```text
stem_BEE_TEST/
  AUDIO/
    1.wav
    2.wav
  STEM_bee_TEST_FILES.csv
  STEM_bee_TEST_FILES.sql
  STEM_bee_TEST_FILES.xlsx
```

The CSV is the source of truth. Required columns:

```text
Serial,Word,Answer1,Answer2,Answer3,,Audio Link,Hint
```

The blank column between `Answer3` and `Audio Link` is tolerated. SQL/XLSX files are ignored.

## Deploy on Vercel

1. Push this project to GitHub.
2. Import it into Vercel.
3. Add the same environment variables in Vercel Project Settings.
4. Deploy.
5. Visit `/admin/setup` once, create the admin, then remove or rotate `ADMIN_SETUP_TOKEN`.

## Verification

These checks passed locally:

```bash
npm run typecheck
npm run lint
npm run build
```

Rendered page verification also passed for `/`, `/admin`, and `/arena` in Chrome with no framework overlays or console warnings.
