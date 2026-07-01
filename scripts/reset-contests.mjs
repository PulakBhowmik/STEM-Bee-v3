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

const { data: contests, error } = await supabase.from("contests").select("id,title");
if (error) throw error;
console.log(`Deleting ${contests?.length ?? 0} contest(s) and all associated data...`);
for (const c of contests ?? []) {
  const { error: delErr } = await supabase.from("contests").delete().eq("id", c.id);
  console.log(`  - ${c.title}: ${delErr ? "FAILED: " + delErr.message : "ok"}`);
}

const { data: bucketFiles } = await supabase.storage.from(env.SUPABASE_AUDIO_BUCKET || "contest-audio").list("", { limit: 1000 });
for (const folder of bucketFiles ?? []) {
  if (folder.id === null) {
    const { data: files } = await supabase.storage.from(env.SUPABASE_AUDIO_BUCKET || "contest-audio").list(folder.name, { limit: 1000 });
    const paths = (files ?? []).map((f) => `${folder.name}/${f.name}`);
    if (paths.length > 0) {
      const { error: rmErr } = await supabase.storage.from(env.SUPABASE_AUDIO_BUCKET || "contest-audio").remove(paths);
      console.log(`  - audio folder ${folder.name}: ${rmErr ? "FAILED" : `removed ${paths.length} file(s)`}`);
    }
  }
}

console.log("Done. You can create a fresh contest now.");
