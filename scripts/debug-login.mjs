import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import bcrypt from "bcryptjs";

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

const teamCode = "TEAM-01";
const candidate = "58FHZTqGQh";

console.log(`Looking up team with code='${teamCode}'`);
const { data, error } = await supabase
  .from("teams")
  .select("id,contest_id,team_code,display_name,password_hash,contests(id,title,start_at,end_at,status,created_at)");

console.log(`Total teams: ${data?.length}`);
const matches = (data ?? []).filter((t) => t.team_code === teamCode);
console.log(`Teams matching '${teamCode}': ${matches.length}`);
for (const m of matches) {
  console.log("  contest_id:", m.contest_id);
  console.log("  password_hash (first 20):", m.password_hash.slice(0, 20));
  console.log("  contests join:", JSON.stringify(m.contests));
  const ok = await bcrypt.compare(candidate, m.password_hash);
  console.log(`  bcrypt.compare('${candidate}', hash) -> ${ok}`);
}

console.log("\nDirect query with .single():");
const single = await supabase
  .from("teams")
  .select("id,contest_id,team_code,display_name,password_hash,contests(id,title,start_at,end_at,status,created_at)")
  .eq("team_code", teamCode)
  .single();
console.log("  error:", single.error?.code, single.error?.message);
console.log("  data:", single.data ? "found" : "null");
