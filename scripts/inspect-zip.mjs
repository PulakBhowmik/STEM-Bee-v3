import JSZip from "jszip";
import Papa from "papaparse";
import { readFileSync, statSync } from "node:fs";

const path = process.argv[2];
const stat = statSync(path);
console.log(`File: ${path}`);
console.log(`Size: ${(stat.size / 1024 / 1024).toFixed(2)} MB (${stat.size} bytes)`);
console.log(`Vercel 4.5MB limit: ${stat.size <= 4.5 * 1024 * 1024 ? "OK (under limit)" : "EXCEEDS LIMIT"}`);

const zip = await JSZip.loadAsync(readFileSync(path));
const entries = Object.values(zip.files).filter((e) => !e.dir);
console.log(`\nTotal files in ZIP: ${entries.length}`);

// mirror importer normalization
const normalizeZipPath = (p) => p.replace(/\\/g, "/").replace(/^\.\//, "").replace(/^\/+/, "");
const baseName = (p) => normalizeZipPath(p).split("/").filter(Boolean).at(-1) ?? p;

const csvEntry = entries.find((e) => e.name.toLowerCase().endsWith(".csv"));
console.log(`\nCSV file: ${csvEntry ? csvEntry.name : "!!! NONE FOUND !!!"}`);

const audioEntries = entries.filter((e) => /\.(wav|mp3)$/i.test(e.name));
console.log(`Audio files: ${audioEntries.length}`);
let audioBytes = 0;
for (const a of audioEntries) audioBytes += (await a.async("nodebuffer")).length;
console.log(`Audio total size (uncompressed): ${(audioBytes / 1024 / 1024).toFixed(2)} MB`);

if (!csvEntry) process.exit(1);

const csv = await csvEntry.async("string");
const parsed = Papa.parse(csv, { skipEmptyLines: true });
const [headers, ...rows] = parsed.data;
console.log(`\nCSV headers: ${JSON.stringify(headers)}`);

const findIdx = (label) => headers.findIndex((h) => String(h).trim().toLowerCase() === label.toLowerCase());
const serialIndex = findIdx("Serial");
const wordIndex = findIdx("Word");
const answerIndexes = [findIdx("Answer1"), findIdx("Answer2"), findIdx("Answer3")];
const audioIndex = findIdx("Audio Link");
const hintIndex = findIdx("Hint");
console.log(`Column indexes -> Serial:${serialIndex} Word:${wordIndex} Answer1/2/3:${answerIndexes} AudioLink:${audioIndex} Hint:${hintIndex}`);

const missingCols = [];
if (serialIndex < 0) missingCols.push("Serial");
if (audioIndex < 0) missingCols.push("Audio Link");
answerIndexes.forEach((i, n) => { if (i < 0) missingCols.push(`Answer${n + 1}`); });
console.log(missingCols.length ? `!!! MISSING REQUIRED COLUMNS: ${missingCols.join(", ")}` : "Required columns: all present OK");

// build audio lookup
const byNorm = new Map();
const byBase = new Map();
for (const e of entries) {
  byNorm.set(normalizeZipPath(e.name).toLowerCase(), e);
  byBase.set(baseName(e.name).toLowerCase(), e);
}

console.log(`\nData rows: ${rows.length}`);
let valid = 0, badAudio = 0, noAnswer = 0;
const problems = [];
for (const row of rows) {
  const serial = Number(String(row[serialIndex] ?? "").trim());
  const audioLink = String(row[audioIndex] ?? "").trim();
  if (!Number.isInteger(serial) || serial <= 0 || !audioLink) continue;
  const answers = answerIndexes.map((i) => String(row[i] ?? "").trim()).filter((a) => a.length > 0);
  if (answers.length === 0) { noAnswer++; problems.push(`  #${serial}: NO ANSWERS`); continue; }
  const norm = normalizeZipPath(audioLink);
  const hit = byNorm.get(norm.toLowerCase()) ?? byBase.get(baseName(norm).toLowerCase());
  if (!hit) { badAudio++; problems.push(`  #${serial}: audio not found -> "${audioLink}"`); continue; }
  valid++;
}
console.log(`Valid importable questions: ${valid}`);
console.log(`Rows with missing answers: ${noAnswer}`);
console.log(`Rows with unresolved audio: ${badAudio}`);
if (problems.length) { console.log("\nProblems:"); console.log(problems.slice(0, 30).join("\n")); }

// show first 3 sample rows
console.log("\nFirst 3 data rows:");
for (const row of rows.slice(0, 3)) {
  console.log(`  serial=${row[serialIndex]} word=${JSON.stringify(row[wordIndex])} ans1=${JSON.stringify(row[answerIndexes[0]])} audio=${JSON.stringify(row[audioIndex])}`);
}
