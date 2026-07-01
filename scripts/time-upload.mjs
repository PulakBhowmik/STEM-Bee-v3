import JSZip from "jszip";
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
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});
const bucket = env.SUPABASE_AUDIO_BUCKET || "contest-audio";

const zip = await JSZip.loadAsync(readFileSync(process.argv[2]));
const audio = Object.values(zip.files).filter((e) => !e.dir && /\.(wav|mp3)$/i.test(e.name));
console.log(`Audio files: ${audio.length}`);

const tmp = `__timing_test__`;
const base = (p) => p.replace(/\\/g, "/").split("/").filter(Boolean).at(-1);

// Parallel batches of 10 (mirrors the new importer)
const CONCURRENCY = 10;
const t0 = Date.now();
let done = 0;
for (let s = 0; s < audio.length; s += CONCURRENCY) {
  const batch = audio.slice(s, s + CONCURRENCY);
  await Promise.all(
    batch.map(async (e) => {
      const buf = await e.async("nodebuffer");
      const { error } = await sb.storage.from(bucket).upload(`${tmp}/${base(e.name)}`, buf, {
        upsert: true,
        contentType: "audio/wav",
      });
      if (error) throw new Error(`${base(e.name)}: ${error.message}`);
      done++;
    }),
  );
}
const secs = ((Date.now() - t0) / 1000).toFixed(1);
console.log(`Parallel (batches of ${CONCURRENCY}): uploaded ${done}/${audio.length} in ${secs}s`);

// cleanup
const { data: files } = await sb.storage.from(bucket).list(tmp, { limit: 1000 });
await sb.storage.from(bucket).remove((files ?? []).map((f) => `${tmp}/${f.name}`));
console.log(`Cleaned up ${files?.length ?? 0} test files.`);
console.log(secs < 30 ? "\nVERDICT: well within Vercel's 60s limit." : "\nVERDICT: still slow, needs more work.");
