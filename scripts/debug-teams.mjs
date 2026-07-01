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

const { data: contests } = await supabase
  .from("contests")
  .select("id,title,status,start_at,end_at")
  .order("created_at", { ascending: false });
console.log("Contests:");
for (const c of contests ?? []) {
  console.log(` - ${c.title}  [${c.status}]  start=${c.start_at}  end=${c.end_at}`);
}

const { data: teams } = await supabase.from("teams").select("team_code,display_name,contest_id,created_at").order("created_at");
console.log("\nTeams in DB:");
for (const t of teams ?? []) {
  console.log(` - code='${t.team_code}'  name='${t.display_name}'`);
}
