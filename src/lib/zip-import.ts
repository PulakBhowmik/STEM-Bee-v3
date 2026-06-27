import JSZip from "jszip";
import Papa from "papaparse";

import { getAudioBucket } from "@/lib/env";
import { getSupabaseAdmin } from "@/lib/supabase";

type ParsedQuestion = {
  serial: number;
  word: string | null;
  answer_options: string[];
  audio_storage_path: string;
  audio_file_name: string;
  hint: string | null;
  points: number;
};

function normalizeZipPath(path: string) {
  return path.replace(/\\/g, "/").replace(/^\.\//, "").replace(/^\/+/, "");
}

function baseName(path: string) {
  return normalizeZipPath(path).split("/").filter(Boolean).at(-1) ?? path;
}

function cleanCell(value: unknown) {
  return String(value ?? "").trim();
}

function findHeaderIndex(headers: string[], label: string) {
  return headers.findIndex((header) => header.trim().toLowerCase() === label.toLowerCase());
}

function contentTypeFor(fileName: string) {
  return fileName.toLowerCase().endsWith(".mp3") ? "audio/mpeg" : "audio/wav";
}

export async function importQuestionsZip(contestId: string, file: File) {
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const entries = Object.values(zip.files).filter((entry) => !entry.dir);
  const csvEntry = entries.find((entry) => entry.name.toLowerCase().endsWith(".csv"));

  if (!csvEntry) {
    throw new Error("The ZIP must contain a CSV question file.");
  }

  const csv = await csvEntry.async("string");
  const parsed = Papa.parse<string[]>(csv, { skipEmptyLines: true });

  if (parsed.errors.length > 0) {
    throw new Error(`CSV parse failed: ${parsed.errors[0]?.message ?? "unknown error"}`);
  }

  const [headers, ...rows] = parsed.data;

  if (!headers) {
    throw new Error("The CSV is empty.");
  }

  const serialIndex = findHeaderIndex(headers, "Serial");
  const wordIndex = findHeaderIndex(headers, "Word");
  const answerIndexes = [
    findHeaderIndex(headers, "Answer1"),
    findHeaderIndex(headers, "Answer2"),
    findHeaderIndex(headers, "Answer3"),
  ];
  const audioIndex = findHeaderIndex(headers, "Audio Link");
  const hintIndex = findHeaderIndex(headers, "Hint");

  if (serialIndex < 0 || audioIndex < 0 || answerIndexes.some((index) => index < 0)) {
    throw new Error("CSV must include Serial, Answer1, Answer2, Answer3, and Audio Link columns.");
  }

  const entryByNormalizedPath = new Map<string, JSZip.JSZipObject>();
  const entryByFileName = new Map<string, JSZip.JSZipObject>();

  for (const entry of entries) {
    const normalized = normalizeZipPath(entry.name).toLowerCase();
    entryByNormalizedPath.set(normalized, entry);
    entryByFileName.set(baseName(entry.name).toLowerCase(), entry);
  }

  const questions: ParsedQuestion[] = [];
  const bucket = getAudioBucket();

  for (const row of rows) {
    const serial = Number(cleanCell(row[serialIndex]));
    const audioLink = cleanCell(row[audioIndex]);

    if (!Number.isInteger(serial) || serial <= 0 || !audioLink) {
      continue;
    }

    const answers = answerIndexes
      .map((index) => cleanCell(row[index]))
      .filter((answer) => answer.length > 0);

    if (answers.length === 0) {
      throw new Error(`Question ${serial} has no accepted answers.`);
    }

    const normalizedAudioLink = normalizeZipPath(audioLink);
    const audioEntry =
      entryByNormalizedPath.get(normalizedAudioLink.toLowerCase()) ??
      entryByFileName.get(baseName(normalizedAudioLink).toLowerCase());

    if (!audioEntry) {
      throw new Error(`Question ${serial} references missing audio file: ${audioLink}`);
    }

    const audioFileName = baseName(audioEntry.name);
    const storagePath = `${contestId}/${serial}-${audioFileName}`;
    const audioBuffer = await audioEntry.async("nodebuffer");
    const { error: uploadError } = await getSupabaseAdmin().storage
      .from(bucket)
      .upload(storagePath, audioBuffer, {
        upsert: true,
        contentType: contentTypeFor(audioFileName),
      });

    if (uploadError) {
      throw new Error(`Audio upload failed for ${audioFileName}: ${uploadError.message}`);
    }

    questions.push({
      serial,
      word: wordIndex >= 0 ? cleanCell(row[wordIndex]) || null : null,
      answer_options: answers,
      audio_storage_path: storagePath,
      audio_file_name: audioFileName,
      hint: hintIndex >= 0 ? cleanCell(row[hintIndex]) || null : null,
      points: 1,
    });
  }

  if (questions.length === 0) {
    throw new Error("No valid question rows were found in the CSV.");
  }

  questions.sort((a, b) => a.serial - b.serial);

  const supabase = getSupabaseAdmin();
  const { error: deleteError } = await supabase.from("questions").delete().eq("contest_id", contestId);

  if (deleteError) {
    throw new Error(`Could not replace old questions: ${deleteError.message}`);
  }

  const { error: insertError } = await supabase
    .from("questions")
    .insert(questions.map((question) => ({ ...question, contest_id: contestId })));

  if (insertError) {
    throw new Error(`Could not save imported questions: ${insertError.message}`);
  }

  return {
    imported: questions.length,
    audioFiles: questions.map((question) => question.audio_file_name),
  };
}
