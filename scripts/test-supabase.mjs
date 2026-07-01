import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i), l.slice(i + 1)];
    }),
);

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

console.log("Testing connection to", env.NEXT_PUBLIC_SUPABASE_URL);

const tables = [
  "admins",
  "contests",
  "teams",
  "team_sessions",
  "questions",
  "submissions",
  "team_scores",
  "audit_events",
];
for (const t of tables) {
  const { error, count } = await supabase.from(t).select("*", { count: "exact", head: true });
  console.log(`  ${t.padEnd(20)} ${error ? "ERROR: " + error.message : "ok (" + count + " rows)"}`);
}

const { data: buckets, error: bErr } = await supabase.storage.listBuckets();
if (bErr) {
  console.log("Storage:", "ERROR:", bErr.message);
} else {
  const want = env.SUPABASE_AUDIO_BUCKET || "contest-audio";
  const has = buckets.find((b) => b.id === want);
  console.log(`Storage bucket '${want}':`, has ? "ok" : "MISSING");
}
